from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from backend import models
from backend.schemas.finanzas import PagoCreate, CerrarTurnoResponse


def crear_pago(db: Session, pago: PagoCreate):
    # ── Determinar DNI del paciente ──
    dni = pago.dni_paciente
    if not dni and pago.id_turno:
        turno = db.query(models.Turno).filter(models.Turno.id == pago.id_turno).first()
        if turno:
            dni = turno.dni_paciente

    if not dni:
        # Si por alguna razón no hay DNI, registramos de forma simple
        db_pago = models.Pago(
            monto=pago.monto,
            metodo_pago=pago.metodo_pago,
            id_turno=pago.id_turno,
            moneda=pago.moneda,
            dni_paciente=None,
        )
        db.add(db_pago)
        db.commit()
        db.refresh(db_pago)
        return db_pago

    # ── Caso 1: Se especificó un Turno concreto ──
    if pago.id_turno:
        db_pago = models.Pago(
            monto=pago.monto,
            metodo_pago=pago.metodo_pago,
            id_turno=pago.id_turno,
            moneda=pago.moneda,
            dni_paciente=dni,
        )
        db.add(db_pago)
        
        # Actualizar cuenta corriente del paciente
        from backend.crud.pacientes import registrar_movimiento
        registrar_movimiento(
            db,
            dni=dni,
            tipo="pago",
            monto=Decimal(str(pago.monto)),
            moneda=pago.moneda,
            descripcion=pago.notas or f"Pago {pago.metodo_pago} (Turno #{pago.id_turno})",
        )
        db.commit()
        db.refresh(db_pago)
        return db_pago

    # ── Caso 2: Pago General / Sin Turno específico (Amortización automática) ──
    # Buscamos todos los turnos Realizados del paciente
    turnos = db.query(models.Turno).options(
        joinedload(models.Turno.tratamientos),
        joinedload(models.Turno.pagos)
    ).filter(
        models.Turno.dni_paciente == dni,
        models.Turno.estado == "Realizado"
    ).all()

    # Los ordenamos cronológicamente (más antiguo primero) para amortizar en orden
    turnos.sort(key=lambda t: t.fecha_hora)

    monto_restante = Decimal(str(pago.monto))
    pagos_creados = []
    
    for t in turnos:
        if monto_restante <= 0:
            break
            
        # Calcular deuda de este turno en la moneda seleccionada
        if pago.moneda == "ARS":
            total_turno = sum(Decimal(str(tr.precio_ars)) * tr.cantidad for tr in t.tratamientos if tr.precio_ars)
            pagado_turno = sum(Decimal(str(p.monto)) for p in t.pagos if p.moneda == "ARS")
        else:
            total_turno = sum(Decimal(str(tr.precio_usd)) * tr.cantidad for tr in t.tratamientos if tr.precio_usd)
            pagado_turno = sum(Decimal(str(p.monto)) for p in t.pagos if p.moneda == "USD")
            
        deuda_turno = max(Decimal("0.00"), total_turno - pagado_turno)
        
        if deuda_turno > 0:
            # Cuánto podemos pagar de este turno
            pago_a_turno = min(monto_restante, deuda_turno)
            monto_restante -= pago_a_turno
            
            db_pago = models.Pago(
                monto=float(pago_a_turno),
                metodo_pago=pago.metodo_pago,
                id_turno=t.id,
                moneda=pago.moneda,
                dni_paciente=dni,
                fecha_pago=datetime.now(),
            )
            db.add(db_pago)
            pagos_creados.append(db_pago)

    # Si sobra dinero o no había turnos con deuda, el sobrante se registra como pago general sin id_turno
    if monto_restante > 0 or not pagos_creados:
        db_pago = models.Pago(
            monto=float(monto_restante),
            metodo_pago=pago.metodo_pago,
            id_turno=None,
            moneda=pago.moneda,
            dni_paciente=dni,
            fecha_pago=datetime.now(),
        )
        db.add(db_pago)
        pagos_creados.append(db_pago)

    # Actualizar cuenta corriente por el monto total pagado
    from backend.crud.pacientes import registrar_movimiento
    registrar_movimiento(
        db,
        dni=dni,
        tipo="pago",
        monto=Decimal(str(pago.monto)),
        moneda=pago.moneda,
        descripcion=pago.notas or f"Pago {pago.metodo_pago} (Amortización General)",
    )
    
    db.commit()
    
    # Refrescar y retornar el primer pago creado (o el pago general si corresponde)
    for p in pagos_creados:
        db.refresh(p)
        
    return pagos_creados[0]


def cerrar_turno_con_pago(
    db: Session,
    turno_id: int,
    tratamientos_input: list,
    pagos_input: list,
    comentarios: Optional[str] = None,
):
    """
    Cierra un turno:
    1. Marca turno como Realizado
    2. Crea registros en turnos_tratamientos
    3. Crea pagos
    4. Calcula totales vs pagado → genera deuda en cuenta corriente si corresponde
    5. Devuelve CerrarTurnoResponse con totales y deudas
    """
    turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if not turno:
        return None

    turno.estado = "Realizado"
    if comentarios:
        motivo_previo = turno.motivo or "Consulta"
        turno.motivo = f"{motivo_previo} | {comentarios}"

    # ── 1. Crear tratamientos del turno ──
    for t in tratamientos_input:
        tt = models.TurnoTratamiento(
            id_turno=turno.id,
            nombre=t.nombre,
            cantidad=t.cantidad,
            precio_ars=t.precio_ars,
            precio_usd=t.precio_usd,
        )
        db.add(tt)

    db.flush()

    # ── 2. Calcular totales ──
    total_ars = Decimal("0.00")
    total_usd = Decimal("0.00")
    for t in tratamientos_input:
        if t.precio_ars:
            total_ars += t.precio_ars * t.cantidad
        if t.precio_usd:
            total_usd += t.precio_usd * t.cantidad

    # ── 3. Crear pagos ──
    pagado_ars = Decimal("0.00")
    pagado_usd = Decimal("0.00")
    for p in pagos_input:
        pago = models.Pago(
            monto=p.monto,
            metodo_pago=p.metodo_pago,
            id_turno=turno.id,
            moneda=p.moneda,
        )
        db.add(pago)
        if p.moneda == "ARS":
            pagado_ars += p.monto
        else:
            pagado_usd += p.monto

    # ── 4. Calcular deuda ──
    deuda_ars = max(Decimal("0.00"), total_ars - pagado_ars)
    deuda_usd = max(Decimal("0.00"), total_usd - pagado_usd)

    # ── 5. Registrar en cuenta corriente ──
    from backend.crud.pacientes import registrar_movimiento

    if deuda_ars > 0:
        registrar_movimiento(
            db,
            dni=turno.dni_paciente,
            tipo="cargo",
            monto=deuda_ars,
            moneda="ARS",
            descripcion=f"Turno #{turno_id} - Deuda ARS ({', '.join(t.nombre for t in tratamientos_input)})",
        )

    if deuda_usd > 0:
        registrar_movimiento(
            db,
            dni=turno.dni_paciente,
            tipo="cargo",
            monto=deuda_usd,
            moneda="USD",
            descripcion=f"Turno #{turno_id} - Deuda USD ({', '.join(t.nombre for t in tratamientos_input)})",
        )

    db.commit()
    db.refresh(turno)

    # ── 6. Si pagó de más (ej: abona deuda anterior), registrar como pago en cuenta ──
    if pagado_ars > total_ars:
        exceso_ars = pagado_ars - total_ars
        from backend.crud.pacientes import registrar_movimiento
        registrar_movimiento(
            db,
            dni=turno.dni_paciente,
            tipo="pago",
            monto=exceso_ars,
            moneda="ARS",
            descripcion=f"Turno #{turno_id} - Pago excedente ARS",
        )
        db.commit()

    if pagado_usd > total_usd:
        exceso_usd = pagado_usd - total_usd
        registrar_movimiento(
            db,
            dni=turno.dni_paciente,
            tipo="pago",
            monto=exceso_usd,
            moneda="USD",
            descripcion=f"Turno #{turno_id} - Pago excedente USD",
        )
        db.commit()

    return CerrarTurnoResponse(
        turno_id=turno.id,
        estado=turno.estado,
        total_ars=total_ars,
        total_usd=total_usd,
        pagado_ars=pagado_ars,
        pagado_usd=pagado_usd,
        deuda_ars=deuda_ars,
        deuda_usd=deuda_usd,
    )


def resumen_caja_hoy(db: Session):
    """Devuelve resumen del día: turnos realizados, pendientes, cancelados, ingresos ARS/USD."""
    hoy = date.today()
    inicio = datetime.combine(hoy, datetime.min.time())
    fin = datetime.combine(hoy, datetime.max.time())

    turnos_hoy = db.query(models.Turno).filter(
        models.Turno.fecha_hora >= inicio,
        models.Turno.fecha_hora <= fin,
    ).all()

    realizados = [t for t in turnos_hoy if t.estado == "Realizado"]
    pendientes = [t for t in turnos_hoy if t.estado == "Pendiente"]
    cancelados = [t for t in turnos_hoy if t.estado == "Cancelado"]

    ids_realizados = [t.id for t in realizados]
    pagos_hoy = db.query(models.Pago).filter(
        models.Pago.id_turno.in_(ids_realizados),
    ).all() if ids_realizados else []

    ingresos_ars = sum(p.monto for p in pagos_hoy if p.moneda == "ARS")
    ingresos_usd = sum(p.monto for p in pagos_hoy if p.moneda == "USD")
    total = ingresos_ars + ingresos_usd

    from backend.schemas.finanzas import ResumenCajaResponse
    return ResumenCajaResponse(
        turnos_realizados=len(realizados),
        turnos_pendientes=len(pendientes),
        turnos_cancelados=len(cancelados),
        ingresos_ars=ingresos_ars,
        ingresos_usd=ingresos_usd,
        total_ingresos=total,
    )


# ─── Listado de pagos filtrado ──────────────────────────────────────

def _float(val):
    if val is None:
        return 0.0
    return float(val)


def _normalizar_metodo(metodo: str) -> str:
    """Normaliza variaciones de método de pago a 'efectivo' o 'transferencia'."""
    if not metodo:
        return metodo
    m = metodo.lower()
    if m in ("banco", "mercadopago", "mp", "transferencia", "transfer"):
        return "transferencia"
    return "efectivo"


def listar_pagos_filtrados(
    db: Session,
    fecha_desde=None,
    fecha_hasta=None,
    metodo_pago=None,
    dni_paciente=None,
    id_doctor=None,
    solo_deudores=False,
):
    """
    Lista pagos con datos de paciente y doctor, filtrable.
    """
    from backend.schemas.finanzas import PagoContextoResponse

    # ── Subquery: DNIs de deudores ──
    deudores_dnis = set()
    if solo_deudores:
        cuentas = db.query(models.CuentaCorriente).filter(
            (models.CuentaCorriente.saldo_ars > 0) | (models.CuentaCorriente.saldo_usd > 0)
        ).all()
        deudores_dnis = {c.dni_paciente for c in cuentas}

    # ── Query base sobre Pago ──
    query = db.query(models.Pago)

    if fecha_desde:
        query = query.filter(models.Pago.fecha_pago >= datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        query = query.filter(models.Pago.fecha_pago <= datetime.combine(fecha_hasta, datetime.max.time()))
    if metodo_pago:
        metodo_norm = _normalizar_metodo(metodo_pago)
        # LIKE para cubrir variaciones en la DB (banco, mercadopago, transferencia)
        query = query.filter(models.Pago.metodo_pago.ilike(f"%{metodo_norm}%"))

    pagos = query.order_by(models.Pago.fecha_pago.desc()).all()

    resultados = []
    for pago in pagos:
        # ── Solo deudores: verificar ──
        dni = pago.dni_paciente
        if solo_deudores and dni not in deudores_dnis:
            continue

        # ── Filtro por DNI paciente ──
        if dni_paciente and dni != dni_paciente:
            continue

        # ── Obtener contexto del turno y paciente ──
        paciente_data = None
        doctor_data = None
        turno_id = pago.id_turno

        if turno_id:
            turno = db.query(models.Turno).options(
                joinedload(models.Turno.paciente),
                joinedload(models.Turno.doctor),
            ).filter(models.Turno.id == turno_id).first()
            if turno:
                if id_doctor and turno.id_doctor != id_doctor:
                    continue
                if turno.paciente:
                    paciente_data = {
                        "dni": turno.paciente.dni,
                        "nombre": turno.paciente.nombre,
                        "apellido": turno.paciente.apellido,
                    }
                if turno.doctor:
                    doctor_data = {
                        "id": turno.doctor.id,
                        "nombre": turno.doctor.nombre,
                    }

        # ── Si no hay turno, buscar paciente directo ──
        if not paciente_data and dni:
            pac = db.query(models.Paciente).filter(models.Paciente.dni == dni).first()
            if pac:
                paciente_data = {
                    "dni": pac.dni,
                    "nombre": pac.nombre,
                    "apellido": pac.apellido,
                }

        resultados.append(PagoContextoResponse(
            id=pago.id,
            fecha_pago=pago.fecha_pago,
            monto=_float(pago.monto),
            moneda=pago.moneda,
            metodo_pago=pago.metodo_pago,
            id_turno=turno_id,
            dni_paciente=dni,
            paciente=paciente_data,
            doctor=doctor_data,
        ))

    return resultados