from datetime import date, datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from backend import models
from backend.schemas.turnos import TurnoCreate


def crear_turno(db: Session, turno: TurnoCreate):
    db_turno = models.Turno(
        fecha_hora=turno.fecha_hora,
        motivo=turno.motivo,
        dni_paciente=turno.dni_paciente,
        id_doctor=turno.id_doctor,
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