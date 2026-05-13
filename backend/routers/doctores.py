from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import require_role
from backend.crud.doctores import (
    crear_doctor,
    obtener_doctores,
    obtener_doctor_por_id,
    actualizar_doctor,
    desactivar_doctor,
)
from backend.schemas.doctores import DoctorCreate, DoctorUpdate, DoctorResponse

router = APIRouter(
    prefix="/doctores",
    tags=["Doctores"],
    dependencies=[Depends(require_role(["admin", "secretaria"]))],
)


@router.get("/", response_model=list[DoctorResponse])
def listar_doctores(db: Session = Depends(get_db)):
    return obtener_doctores(db)


@router.post("/", response_model=DoctorResponse, status_code=201)
def post_doctor(doctor: DoctorCreate, db: Session = Depends(get_db)):
    return crear_doctor(db=db, doctor=doctor)


@router.get("/{id}", response_model=DoctorResponse)
def obtener_doctor(id: int, db: Session = Depends(get_db)):
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor


@router.put("/{id}", response_model=DoctorResponse)
def put_doctor(id: int, data: DoctorUpdate, db: Session = Depends(get_db)):
    doctor = actualizar_doctor(db, id, data)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor


@router.delete("/{id}", response_model=DoctorResponse)
def delete_doctor(id: int, db: Session = Depends(get_db)):
    doctor = desactivar_doctor(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor
