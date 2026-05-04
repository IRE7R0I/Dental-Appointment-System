from sqlalchemy.orm import Session
from backend import models
from backend.schemas.doctores import DoctorCreate


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
    return db.query(models.Doctor).all()


def obtener_doctor_por_id(db: Session, doctor_id: int):
    return db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()