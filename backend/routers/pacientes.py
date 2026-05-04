from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.crud.pacientes import (
    crear_paciente,
    obtener_pacientes,
    obtener_paciente_por_dni,
    obtener_o_crear_cuenta,
    listar_deudores,
)
from backend.schemas.pacientes import (
    PacienteCreate,
    PacienteResponse,
    PacienteUpdate,
    DeudorResponse,
    CuentaCorrienteResponse,
)

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])


@router.get("/", response_model=list[PacienteResponse])
def listar_pacientes(db: Session = Depends(get_db)):
    return obtener_pacientes(db)


@router.get("/{dni}", response_model=PacienteResponse)
def obtener_paciente(dni: str, db: Session = Depends(get_db)):
    paciente = obtener_paciente_por_dni(db, dni)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return paciente


@router.post("/", response_model=PacienteResponse, status_code=201)
def post_paciente(paciente: PacienteCreate, db: Session = Depends(get_db)):
    existe = db.query(models.Paciente).filter(models.Paciente.dni == paciente.dni).first()
    if existe:
        raise HTTPException(status_code=400, detail="El DNI ya está registrado")
    return crear_paciente(db=db, paciente=paciente)


@router.put("/{dni}", response_model=PacienteResponse)
def actualizar_paciente(dni: str, datos: PacienteUpdate, db: Session = Depends(get_db)):
    paciente = obtener_paciente_por_dni(db, dni)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(paciente, key, value)
    db.commit()
    db.refresh(paciente)
    return paciente


@router.get("/deudores", response_model=list[DeudorResponse])
def listar_deudores_endpoint(db: Session = Depends(get_db)):
    return listar_deudores(db)


@router.get("/{dni}/cuenta", response_model=CuentaCorrienteResponse)
def obtener_cuenta_paciente(dni: str, db: Session = Depends(get_db)):
    paciente = obtener_paciente_por_dni(db, dni)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    cuenta = obtener_o_crear_cuenta(db, dni)
    return cuenta