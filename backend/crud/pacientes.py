import unicodedata
from decimal import Decimal
from typing import Optional
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload
from backend import models
from backend.schemas.pacientes import PacienteCreate


def normalizar_texto(texto: str) -> str:
    """Aplica lower() y remueve acentos/diacríticos simétricamente."""
    if not texto:
        return ""
    texto = texto.strip().lower()
    normalized = unicodedata.normalize("NFD", texto)
    return "".join(c for c in normalized if unicodedata.category(c) != "Mn")


def crear_paciente(db: Session, paciente: PacienteCreate):
    db_paciente = models.Paciente(
        dni=paciente.dni,
        nombre=paciente.nombre,
        apellido=paciente.apellido,
        fecha_nacimiento=paciente.fecha_nacimiento,
        telefono=paciente.telefono,
        email=paciente.email,
        obra_social=paciente.obra_social,
        genero=paciente.genero,
    )
    db.add(db_paciente)
    db.commit()
    db.refresh(db_paciente)
    return db_paciente


def obtener_pacientes(db: Session, buscar: Optional[str] = None, limit: Optional[int] = None):
    query = db.query(models.Paciente)
    if buscar and buscar.strip():
        term_norm = f"%{normalizar_texto(buscar)}%"
        term_raw = f"%{buscar.strip()}%"
        query = query.filter(
            or_(
                func.unaccent(func.lower(models.Paciente.nombre)).like(term_norm),
                func.unaccent(func.lower(models.Paciente.apellido)).like(term_norm),
                models.Paciente.dni.like(term_raw),
            )
        )
        if limit is not None:
            query = query.limit(limit)
    return query.all()



def obtener_paciente_por_dni(db: Session, dni: str):
    return db.query(models.Paciente).filter(models.Paciente.dni == dni).first()


# ─── Cuenta Corriente ─────────────────────────────────────────────


def obtener_o_crear_cuenta(db: Session, dni: str):
    """Obtiene la cuenta corriente del paciente o la crea si no existe."""
    cuenta = db.query(models.CuentaCorriente).options(
        joinedload(models.CuentaCorriente.movimientos)
    ).filter(models.CuentaCorriente.dni_paciente == dni).first()
    if not cuenta:
        cuenta = models.CuentaCorriente(dni_paciente=dni)
        db.add(cuenta)
        db.commit()
        db.refresh(cuenta)
    return cuenta


def registrar_movimiento(db: Session, dni: str, tipo: str, monto: Decimal, moneda: str, descripcion: str = ""):
    """Registra un movimiento en la cuenta corriente del paciente y actualiza saldos."""
    cuenta = obtener_o_crear_cuenta(db, dni)
    movimiento = models.MovimientoCuenta(
        id_cuenta=cuenta.id,
        tipo=tipo,
        monto=monto,
        moneda=moneda,
        descripcion=descripcion,
    )
    db.add(movimiento)

    if tipo == "cargo":
        if moneda == "ARS":
            cuenta.saldo_ars = (cuenta.saldo_ars or Decimal("0.00")) + monto
        else:
            cuenta.saldo_usd = (cuenta.saldo_usd or Decimal("0.00")) + monto
    elif tipo == "pago":
        if moneda == "ARS":
            cuenta.saldo_ars = (cuenta.saldo_ars or Decimal("0.00")) - monto
        else:
            cuenta.saldo_usd = (cuenta.saldo_usd or Decimal("0.00")) - monto

    db.commit()
    db.refresh(cuenta)
    return cuenta


def listar_deudores(db: Session, orden: str = "antiguedad_desc"):
    """Lista pacientes con saldo > 0 en ARS o USD, ordenados por antigüedad de deuda."""
    from datetime import datetime

    cuentas = db.query(models.CuentaCorriente).filter(
        (models.CuentaCorriente.saldo_ars > 0) | (models.CuentaCorriente.saldo_usd > 0)
    ).all()

    resultado = []
    for c in cuentas:
        p = db.query(models.Paciente).filter(models.Paciente.dni == c.dni_paciente).first()
        if p:
            # Calcular antigüedad de deuda (días desde el cargo sin saldar más antiguo)
            dias_antiguedad = 0
            oldest_cargo_date = None

            for mon in ["ARS", "USD"]:
                saldo_mon = c.saldo_ars if mon == "ARS" else c.saldo_usd
                if saldo_mon and saldo_mon > 0:
                    movs = db.query(models.MovimientoCuenta).filter(
                        models.MovimientoCuenta.id_cuenta == c.id,
                        models.MovimientoCuenta.moneda == mon
                    ).order_by(models.MovimientoCuenta.fecha.asc()).all()

                    cargos = [m for m in movs if m.tipo == "cargo"]
                    pagos = [m for m in movs if m.tipo == "pago"]
                    total_pagado = sum(p.monto for p in pagos)

                    running_pagos = total_pagado
                    for cargo in cargos:
                        if running_pagos >= cargo.monto:
                            running_pagos -= cargo.monto
                        else:
                            # Encontrado cargo no saldado del todo
                            if oldest_cargo_date is None or cargo.fecha < oldest_cargo_date:
                                oldest_cargo_date = cargo.fecha
                            break

            if oldest_cargo_date:
                dias_antiguedad = max(0, (datetime.now() - oldest_cargo_date).days)

            from backend.schemas.pacientes import DeudorResponse
            resultado.append(DeudorResponse(
                dni=p.dni,
                nombre=p.nombre,
                apellido=p.apellido,
                telefono=p.telefono,
                saldo_ars=c.saldo_ars or Decimal("0.00"),
                saldo_usd=c.saldo_usd or Decimal("0.00"),
                dias_antiguedad=dias_antiguedad,
            ))

    # Ordenamiento
    if orden == "antiguedad_asc":
        resultado.sort(key=lambda x: x.dias_antiguedad)
    else:
        resultado.sort(key=lambda x: x.dias_antiguedad, reverse=True)

    return resultado


# ─── Historial de pagos por paciente ─────────────────────────────────

def _float(val):
    """Convierte Decimal a float, manejo seguro de None."""
    if val is None:
        return 0.0
    return float(val)


def obtener_historial_paciente(db: Session, dni: str, fecha_desde=None, fecha_hasta=None):
    """Devuelve historial completo de tratamientos y pagos de un paciente."""
    from backend.schemas.turnos import (
        HistorialPacienteResponse, HistorialTurnoItemResponse,
        HistorialTratamientoResponse, PagoEnHistorialResponse,
        TotalesHistorial,
    )
    from datetime import datetime

    # ── Paciente ──
    paciente = db.query(models.Paciente).filter(models.Paciente.dni == dni).first()
    if not paciente:
        return None

    # ── Saldo desde CuentaCorriente ──
    cuenta = db.query(models.CuentaCorriente).filter(
        models.CuentaCorriente.dni_paciente == dni
    ).first()
    saldo_ars = _float(cuenta.saldo_ars) if cuenta else 0.0
    saldo_usd = _float(cuenta.saldo_usd) if cuenta else 0.0

    # ── Turnos ──
    query = db.query(models.Turno).options(
        joinedload(models.Turno.doctor),
        joinedload(models.Turno.tratamientos),
        joinedload(models.Turno.pagos),
    ).filter(
        models.Turno.dni_paciente == dni,
        models.Turno.estado.in_(["Realizado", "Cancelado"]),
    )

    if fecha_desde:
        query = query.filter(models.Turno.fecha_hora >= datetime.combine(fecha_desde, datetime.min.time()))
    if fecha_hasta:
        query = query.filter(models.Turno.fecha_hora <= datetime.combine(fecha_hasta, datetime.max.time()))

    turnos_db = query.order_by(models.Turno.fecha_hora.desc()).all()

    # ── Construir respuesta ──
    turnos_response = []
    total_trat_ars = 0.0
    total_trat_usd = 0.0
    total_pag_ars = 0.0
    total_pag_usd = 0.0

    for turno in turnos_db:
        # Tratamientos
        tratamientos = [
            HistorialTratamientoResponse(
                nombre=t.nombre,
                cantidad=t.cantidad,
                precio_ars=_float(t.precio_ars) if t.precio_ars else None,
                precio_usd=_float(t.precio_usd) if t.precio_usd else None,
            )
            for t in turno.tratamientos
        ]

        # Totales del turno
        turn_total_ars = sum(_float(t.precio_ars) for t in turno.tratamientos if t.precio_ars)
        turn_total_usd = sum(_float(t.precio_usd) for t in turno.tratamientos if t.precio_usd)
        turn_pag_ars = sum(_float(p.monto) for p in turno.pagos if p.moneda == "ARS")
        turn_pag_usd = sum(_float(p.monto) for p in turno.pagos if p.moneda == "USD")

        # Pagos del turno
        pagos = [
            PagoEnHistorialResponse(
                id=p.id,
                fecha=p.fecha_pago,
                monto=_float(p.monto),
                moneda=p.moneda,
                metodo_pago=p.metodo_pago,
            )
            for p in sorted(turno.pagos, key=lambda x: x.fecha_pago)
        ]

        turnos_response.append(HistorialTurnoItemResponse(
            id=turno.id,
            fecha_hora=turno.fecha_hora,
            estado=turno.estado,
            doctor={"id": turno.doctor.id, "nombre": turno.doctor.nombre} if turno.doctor else {},
            tratamientos=tratamientos,
            total_ars=turn_total_ars,
            total_usd=turn_total_usd,
            pagos=pagos,
            total_pagado_ars=turn_pag_ars,
            total_pagado_usd=turn_pag_usd,
            saldo_ars=max(0.0, turn_total_ars - turn_pag_ars),
            saldo_usd=max(0.0, turn_total_usd - turn_pag_usd),
            motivo=turno.motivo,
        ))

        total_trat_ars += turn_total_ars
        total_trat_usd += turn_total_usd
        total_pag_ars += turn_pag_ars
        total_pag_usd += turn_pag_usd

    totales = TotalesHistorial(
        total_tratamientos_ars=total_trat_ars,
        total_tratamientos_usd=total_trat_usd,
        total_pagado_ars=total_pag_ars,
        total_pagado_usd=total_pag_usd,
        saldo_ars=saldo_ars,
        saldo_usd=saldo_usd,
    )

    return HistorialPacienteResponse(
        dni_paciente=dni,
        nombre=paciente.nombre,
        apellido=paciente.apellido,
        saldo_ars=saldo_ars,
        saldo_usd=saldo_usd,
        turnos=turnos_response,
        totales=totales,
    )


def obtener_turnos_con_deuda(db: Session, dni: str):
    """Devuelve turnos del paciente que tengan saldo deudor (pendiente)."""
    turnos = db.query(models.Turno).options(
        joinedload(models.Turno.tratamientos),
        joinedload(models.Turno.pagos),
        joinedload(models.Turno.doctor)
    ).filter(
        models.Turno.dni_paciente == dni
    ).all()

    resultado = []
    for t in turnos:
        total_facturado_ars = sum(Decimal(str(tr.precio_ars)) * tr.cantidad for tr in t.tratamientos if tr.precio_ars)
        total_facturado_usd = sum(Decimal(str(tr.precio_usd)) * tr.cantidad for tr in t.tratamientos if tr.precio_usd)

        total_pagado_ars = sum(Decimal(str(p.monto)) for p in t.pagos if p.moneda == "ARS")
        total_pagado_usd = sum(Decimal(str(p.monto)) for p in t.pagos if p.moneda == "USD")

        saldo_pendiente_ars = max(Decimal("0.00"), total_facturado_ars - total_pagado_ars)
        saldo_pendiente_usd = max(Decimal("0.00"), total_facturado_usd - total_pagado_usd)

        if saldo_pendiente_ars > 0 or saldo_pendiente_usd > 0:
            doctor_data = None
            if t.doctor:
                doctor_data = {
                    "id": t.doctor.id,
                    "nombre": t.doctor.nombre
                }
            resultado.append({
                "id_turno": t.id,
                "fecha_hora": t.fecha_hora,
                "motivo": t.motivo,
                "doctor": doctor_data,
                "total_facturado_ars": float(total_facturado_ars),
                "total_facturado_usd": float(total_facturado_usd),
                "total_pagado_ars": float(total_pagado_ars),
                "total_pagado_usd": float(total_pagado_usd),
                "saldo_pendiente_ars": float(saldo_pendiente_ars),
                "saldo_pendiente_usd": float(saldo_pendiente_usd),
            })

    # Ordenar por fecha_hora asc
    resultado.sort(key=lambda x: x["fecha_hora"])
    return resultado