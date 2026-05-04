from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.crud.doctores import crear_doctor, obtener_doctores, obtener_doctor_por_id
from backend.schemas.doctores import DoctorCreate, DoctorResponse

router = APIRouter(prefix="/doctores", tags=["Doctores"])


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