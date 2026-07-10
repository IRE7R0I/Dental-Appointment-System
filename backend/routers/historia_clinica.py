from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import require_role, get_current_user
from backend import models
from backend.schemas import historia_clinica as schemas
from backend.crud import historia_clinica as crud

router = APIRouter(
    prefix="/pacientes",
    tags=["Historia Clínica"],
    dependencies=[Depends(require_role(["admin", "secretaria"]))],
)


def _verificar_paciente(db: Session, dni: str):
    paciente = db.query(models.Paciente).filter(models.Paciente.dni == dni).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")


# ─── 4.2 Alertas ────────────────────────────────────────────────


@router.get("/{dni}/alertas", response_model=list[schemas.AlertaMedicaResponse])
def listar_alertas(dni: str, db: Session = Depends(get_db)):
    _verificar_paciente(db, dni)
    return crud.listar_alertas(db, dni)


@router.post("/{dni}/alertas", response_model=schemas.AlertaMedicaResponse, status_code=201)
def crear_alerta(
    dni: str,
    data: schemas.AlertaMedicaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _verificar_paciente(db, dni)
    return crud.crear_alerta(db, dni, data, current_user.id)


@router.delete("/{dni}/alertas/{alerta_id}")
def eliminar_alerta(
    dni: str,
    alerta_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _verificar_paciente(db, dni)
    if not crud.eliminar_alerta(db, alerta_id, current_user.id):
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return {"mensaje": "Alerta eliminada"}


# ─── 4.3 Evoluciones ─────────────────────────────────────────────


@router.get("/{dni}/evoluciones", response_model=list[schemas.EvolucionClinicaResponse])
def listar_evoluciones(dni: str, db: Session = Depends(get_db)):
    _verificar_paciente(db, dni)
    return crud.listar_evoluciones(db, dni)


@router.post("/{dni}/evoluciones", response_model=schemas.EvolucionClinicaResponse, status_code=201)
def crear_evolucion(
    dni: str,
    data: schemas.EvolucionClinicaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _verificar_paciente(db, dni)
    try:
        return crud.crear_evolucion(db, dni, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{dni}/evoluciones/{evolucion_id}", response_model=schemas.EvolucionClinicaResponse)
def corregir_evolucion(
    dni: str,
    evolucion_id: int,
    data: schemas.EvolucionClinicaUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _verificar_paciente(db, dni)
    try:
        evol = crud.corregir_evolucion(db, evolucion_id, data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not evol:
        raise HTTPException(status_code=404, detail="Evolución no encontrada")
    return evol


# ─── 4.4 Resumen ──────────────────────────────────────────────────


@router.get("/{dni}/resumen", response_model=schemas.ResumenPacienteResponse)
def obtener_resumen(dni: str, db: Session = Depends(get_db)):
    _verificar_paciente(db, dni)
    return crud.obtener_resumen(db, dni)
