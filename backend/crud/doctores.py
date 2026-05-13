from typing import Optional
from sqlalchemy.orm import Session
from backend import models
from backend.schemas.doctores import DoctorCreate, DoctorUpdate


def crear_doctor(db: Session, doctor: DoctorCreate):
    db_doctor = models.Doctor(
        nombre=doctor.nombre,
        color_agenda=doctor.color_agenda,
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
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
