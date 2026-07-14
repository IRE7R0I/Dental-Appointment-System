from datetime import date
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
from backend.crud.horarios_doctor import (
    obtener_horario_semanal, guardar_horario_semanal,
    agregar_dia_no_laborable, listar_dias_no_laborables,
    eliminar_dia_no_laborable,
)
from backend.core.horarios import obtener_horarios_doctor_publico
from backend.schemas.doctores import DoctorCreate, DoctorUpdate, DoctorResponse
from backend.schemas.horarios import (
    HorarioDoctorResponse, HorarioDoctorUpdate,
    DiaNoLaborableCreate, DiaNoLaborableResponse,
)

router = APIRouter(
    prefix="/doctores",
    tags=["Doctores"],
    dependencies=[Depends(require_role(["admin", "secretaria"]))],
)


@router.get("/", response_model=list[DoctorResponse])
def listar_doctores(db: Session = Depends(get_db)):
    return obtener_doctores(db)


@router.post("/", response_model=DoctorResponse, status_code=201)
def post_doctor(
    doctor: DoctorCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    return crear_doctor(db=db, doctor=doctor)


@router.get("/{id}", response_model=DoctorResponse)
def obtener_doctor(id: int, db: Session = Depends(get_db)):
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor


@router.put("/{id}", response_model=DoctorResponse)
def put_doctor(
    id: int,
    data: DoctorUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    doctor = actualizar_doctor(db, id, data)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor


@router.delete("/{id}", response_model=DoctorResponse)
def delete_doctor(
    id: int,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    doctor = desactivar_doctor(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return doctor


# ─── C-016: Horarios individuales por doctor ────────────────────


@router.get("/{id}/horarios", response_model=HorarioDoctorResponse)
def get_horarios_doctor(id: int, db: Session = Depends(get_db)):
    """Devuelve el patrón semanal de horario del doctor."""
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    data = obtener_horarios_doctor_publico(db, id)
    return data


@router.put("/{id}/horarios", response_model=HorarioDoctorResponse)
def put_horarios_doctor(
    id: int,
    data: HorarioDoctorUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    """Actualiza el patrón semanal completo del doctor. Solo admin."""
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    guardar_horario_semanal(db, id, data.dias)
    return obtener_horarios_doctor_publico(db, id)


@router.get("/{id}/dias-no-laborables", response_model=list[DiaNoLaborableResponse])
def get_dias_no_laborables(
    id: int,
    desde: date,
    hasta: date,
    db: Session = Depends(get_db),
):
    """Lista días no laborables del doctor en un rango."""
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    return listar_dias_no_laborables(db, id, desde, hasta)


@router.post("/{id}/dias-no-laborables", response_model=DiaNoLaborableResponse, status_code=201)
def post_dia_no_laborable(
    id: int,
    data: DiaNoLaborableCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    """Marca una fecha como no laborable para el doctor. Solo admin."""
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    from backend.crud.horarios_doctor import es_dia_no_laborable
    if es_dia_no_laborable(db, id, data.fecha):
        raise HTTPException(status_code=409, detail="La fecha ya está marcada como no laborable")
    return agregar_dia_no_laborable(db, id, data.fecha, data.motivo)


@router.delete("/{id}/dias-no-laborables/{fecha_str}")
def delete_dia_no_laborable(
    id: int,
    fecha_str: str,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    """Desmarca una fecha como no laborable. Solo admin."""
    from datetime import datetime
    doctor = obtener_doctor_por_id(db, id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado")
    try:
        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
    ok = eliminar_dia_no_laborable(db, id, fecha)
    if not ok:
        raise HTTPException(status_code=404, detail="Día no laborable no encontrado")
    return {"mensaje": "Día no laborable eliminado correctamente"}
