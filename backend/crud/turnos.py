from datetime import date, time, datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from backend import models
from backend.schemas.turnos import TurnoCreate, SlotBloquearInput
from backend.core.horarios import generar_slots, dt_local


def crear_turno(db: Session, turno: TurnoCreate):
    db_turno = models.Turno(
        fecha_hora=turno.fecha_hora,
        motivo=turno.motivo,
        dni_paciente=turno.dni_paciente,
        id_doctor=turno.id_doctor,
        duracion_minutos=turno.duracion_minutos,
        estado="Pendiente",
    )
    db.add(db_turno)
    db.commit()

    # Recargar con relaciones incluidas para devolver en la respuesta
    db_turno = db.query(models.Turno).options(
        joinedload(models.Turno.paciente),
        joinedload(models.Turno.doctor),
    ).filter(models.Turno.id == db_turno.id).first()

    return db_turno


def cancelar_turno(db: Session, turno_id: int):
    db_turno = db.query(models.Turno).options(
        joinedload(models.Turno.paciente),
        joinedload(models.Turno.doctor),
    ).filter(models.Turno.id == turno_id).first()
    if db_turno:
        db_turno.estado = "Cancelado"
        db.commit()
        db.refresh(db_turno)
        return db_turno
    return None


def eliminar_turno(db: Session, turno_id: int):
    db_turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if db_turno:
        db.delete(db_turno)
        db.commit()
        return True
    return False


def obtener_turnos_por_paciente(db: Session, dni: str):
    return db.query(models.Turno).filter(models.Turno.dni_paciente == dni).all()


def obtener_todos_turnos(
    db: Session,
    fecha: Optional[date] = None,
    id_doctor: Optional[int] = None,
    paciente_dni: Optional[str] = None,
):
    query = db.query(models.Turno).options(
        joinedload(models.Turno.paciente),
        joinedload(models.Turno.doctor),
    )
    if fecha:
        query = query.filter(models.Turno.fecha_hora >= datetime.combine(fecha, datetime.min.time()))
        query = query.filter(models.Turno.fecha_hora <= datetime.combine(fecha, datetime.max.time()))
    if id_doctor:
        query = query.filter(models.Turno.id_doctor == id_doctor)
    if paciente_dni:
        query = query.filter(models.Turno.dni_paciente == paciente_dni)
    return query.order_by(models.Turno.fecha_hora).all()


def obtener_turnos_hoy(db: Session):
    hoy = date.today()
    return obtener_todos_turnos(db, fecha=hoy)


# ─── C-012: Slots y bloqueos ──────────────────────────────────


def obtener_slots_con_estado(
    db: Session, fecha: date, id_doctor: int
) -> list[dict]:
    """
    Genera slots para una fecha+doctor, cruza con turnos existentes y
    bloqueos manuales, devuelve estado de cada slot.
    """
    slots = generar_slots(fecha)
    if not slots:
        return []

    turnos = db.query(models.Turno).filter(
        models.Turno.id_doctor == id_doctor,
        models.Turno.fecha_hora >= datetime.combine(fecha, time(0, 0)),
        models.Turno.fecha_hora < datetime.combine(fecha, time(23, 59)),
        models.Turno.estado.in_(["Pendiente", "Realizado"]),
    ).all()

    bloqueados = db.query(models.SlotsBloqueado).filter(
        models.SlotsBloqueado.fecha == fecha,
        models.SlotsBloqueado.id_doctor == id_doctor,
    ).all()

    slots_ocupados: dict[str, models.Turno] = {}
    for t in turnos:
        t_local = dt_local(t.fecha_hora)
        key = f"{t_local.hour:02d}:{t_local.minute:02d}"
        slots_ocupados[key] = t

    slots_bloqueados: dict[str, models.SlotsBloqueado] = {}
    for b in bloqueados:
        key = f"{b.hora.hour:02d}:{b.hora.minute:02d}"
        slots_bloqueados[key] = b

    resultado = []
    for s in slots:
        key = f"{s.hour:02d}:{s.minute:02d}"
        if key in slots_ocupados:
            t = slots_ocupados[key]
            nombre_pac = f"{t.paciente.apellido}" if t.paciente else None
            resultado.append({
                "hora": key,
                "estado": "ocupado",
                "turno_id": t.id,
                "paciente": nombre_pac,
                "motivo": None,
            })
        elif key in slots_bloqueados:
            b = slots_bloqueados[key]
            resultado.append({
                "hora": key,
                "estado": "bloqueado",
                "turno_id": None,
                "paciente": None,
                "motivo": b.motivo,
                "slot_bloqueado_id": b.id,
            })
        else:
            resultado.append({
                "hora": key,
                "estado": "libre",
                "turno_id": None,
                "paciente": None,
                "motivo": None,
            })

    return resultado


def bloquear_slot(db: Session, data: SlotBloquearInput, usuario_id: int) -> models.SlotsBloqueado:
    db_slot = models.SlotsBloqueado(
        fecha=data.fecha,
        hora=data.hora,
        id_doctor=data.id_doctor,
        motivo=data.motivo,
        bloqueado_por_id=usuario_id,
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot


def desbloquear_slot(db: Session, slot_id: int) -> Optional[models.SlotsBloqueado]:
    slot = db.query(models.SlotsBloqueado).filter(models.SlotsBloqueado.id == slot_id).first()
    if not slot:
        return None
    db.delete(slot)
    db.commit()
    return slot


def slot_esta_bloqueado(db: Session, fecha: date, hora: time, id_doctor: int) -> bool:
    return db.query(models.SlotsBloqueado).filter(
        models.SlotsBloqueado.fecha == fecha,
        models.SlotsBloqueado.hora == hora,
        models.SlotsBloqueado.id_doctor == id_doctor,
    ).first() is not None


def slot_tiene_turno(db: Session, fecha: date, hora: time, id_doctor: int) -> bool:
    from datetime import datetime as dt_mod
    fecha_hora_inicio = dt_mod.combine(fecha, hora)
    return db.query(models.Turno).filter(
        models.Turno.id_doctor == id_doctor,
        models.Turno.fecha_hora == fecha_hora_inicio,
        models.Turno.estado.in_(["Pendiente", "Realizado"]),
    ).first() is not None