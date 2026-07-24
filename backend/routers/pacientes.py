from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from backend.database import get_db
from backend.dependencies import require_role
from backend import models
from backend.crud.pacientes import (
    crear_paciente,
    obtener_pacientes,
    obtener_paciente_por_dni,
    obtener_o_crear_cuenta,
    listar_deudores,
    obtener_historial_paciente,
    obtener_turnos_con_deuda,
)
from backend.schemas.pacientes import (
    PacienteCreate,
    PacienteResponse,
    PacienteFichaResponse,
    PacienteUpdate,
    DeudorResponse,
    CuentaCorrienteResponse,
    TurnoConDeudaResponse,
)
from backend.schemas.turnos import HistorialPacienteResponse
from backend.crud import historia_clinica as crud_historia

router = APIRouter(prefix="/pacientes", tags=["Pacientes"], dependencies=[Depends(require_role(["admin", "secretaria"]))])


@router.get("/", response_model=list[PacienteResponse])
def listar_pacientes(
    buscar: Optional[str] = Query(None, description="Búsqueda parcial por nombre, apellido o DNI"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="Límite de resultados (solo aplica cuando hay búsqueda)"),
    db: Session = Depends(get_db)
):
    limit_aplicar = limit if (buscar and buscar.strip()) else None
    return obtener_pacientes(db, buscar=buscar, limit=limit_aplicar)


@router.get("/deudores", response_model=list[DeudorResponse])
def listar_deudores_endpoint(
    orden: str = Query("antiguedad_desc", description="Orden: 'antiguedad_desc' o 'antiguedad_asc'"),
    db: Session = Depends(get_db)
):
    return listar_deudores(db, orden=orden)


@router.get("/historial", response_model=HistorialPacienteResponse)
def historial_paciente(
    dni: str = Query(..., description="DNI del paciente"),
    fecha_desde: Optional[date] = Query(None, description="Filtrar desde fecha (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Filtrar hasta fecha (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    resultado = obtener_historial_paciente(db, dni, fecha_desde, fecha_hasta)
    if not resultado:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return resultado


@router.get("/{dni}", response_model=PacienteFichaResponse)
def obtener_paciente(dni: str, db: Session = Depends(get_db)):
    paciente = obtener_paciente_por_dni(db, dni)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    alertas = crud_historia.listar_alertas(db, dni)
    base = PacienteResponse.model_validate(paciente)
    return PacienteFichaResponse(**base.model_dump(), alertas=alertas)


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


@router.get("/{dni}/cuenta", response_model=CuentaCorrienteResponse)
def obtener_cuenta_paciente(dni: str, db: Session = Depends(get_db)):
    paciente = obtener_paciente_por_dni(db, dni)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    cuenta = obtener_o_crear_cuenta(db, dni)
    return cuenta


@router.get("/{dni}/turnos-con-deuda", response_model=list[TurnoConDeudaResponse])
def obtener_turnos_con_deuda_endpoint(dni: str, db: Session = Depends(get_db)):
    paciente = obtener_paciente_por_dni(db, dni)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return obtener_turnos_con_deuda(db, dni)