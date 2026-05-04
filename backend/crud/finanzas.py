from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.orm import Session
from backend import models
from backend.schemas.finanzas import PagoCreate, CerrarTurnoResponse


def crear_pago(db: Session, pago: PagoCreate):
    db_pago = models.Pago(
        monto=pago.monto,
        metodo_pago=pago.metodo_pago,
        id_turno=pago.id_turno,
        moneda=pago.moneda,
    )
    db.add(db_pago)
    db.commit()
    db.refresh(db_pago)
    return db_pago


def cerrar_turno_con_pago(
    db: Session,
    turno_id: int,
    tratamientos_input: list,
    pagos_input: list,
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