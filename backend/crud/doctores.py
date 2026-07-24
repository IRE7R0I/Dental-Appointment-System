from typing import Optional
from sqlalchemy.orm import Session
from backend import models
from backend.crud.horarios_doctor import seed_horarios_doctor
from backend.schemas.doctores import DoctorCreate, DoctorUpdate


def crear_doctor(db: Session, doctor: DoctorCreate):
    db_doctor = models.Doctor(
        nombre=doctor.nombre,
        color_agenda=doctor.color_agenda,
        horizonte_dias=doctor.horizonte_dias or 180,
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    seed_horarios_doctor(db, db_doctor.id)
    return db_doctor


def obtener_doctores(db: Session):
    return db.query(models.Doctor).filter(models.Doctor.activo == True).all()


def obtener_doctor_por_id(db: Session, doctor_id: int) -> Optional[models.Doctor]:
    return db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()


def actualizar_doctor(db: Session, doctor_id: int, data: DoctorUpdate) -> Optional[models.Doctor]:
    doctor = obtener_doctor_por_id(db, doctor_id)
    if not doctor:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return doctor


def desactivar_doctor(db: Session, doctor_id: int) -> Optional[models.Doctor]:
    doctor = obtener_doctor_por_id(db, doctor_id)
    if not doctor:
        return None
    doctor.activo = False
    db.commit()
    db.refresh(doctor)
    return doctor


def set_activo_doctor(db: Session, doctor_id: int, activo: bool) -> Optional[models.Doctor]:
    doctor = obtener_doctor_por_id(db, doctor_id)
    if not doctor:
        return None
    doctor.activo = activo
    db.commit()
    db.refresh(doctor)
    return doctor


def set_activo_doctor(db: Session, doctor_id: int, activo: bool) -> Optional[models.Doctor]:
    """Set doctor active/inactive. activo=False delegates to existing soft-delete."""
    if not activo:
        return desactivar_doctor(db, doctor_id)
    doctor = obtener_doctor_por_id(db, doctor_id)
    if not doctor:
        return None
    doctor.activo = True
    db.commit()
    db.refresh(doctor)
    return doctor
