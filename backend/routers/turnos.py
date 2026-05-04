from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.crud.turnos import (
    crear_turno,
    cancelar_turno,
    eliminar_turno,
    obtener_turnos_por_paciente,
    obtener_todos_turnos,
    obtener_turnos_hoy,
)
from backend.crud.finanzas import cerrar_turno_con_pago
from backend.schemas.turnos import TurnoCreate, TurnoResponse
from backend.schemas.finanzas import CerrarTurnoInput, CerrarTurnoResponse

router = APIRouter(prefix="/turnos", tags=["Turnos"])


@router.get("/", response_model=list[TurnoResponse])
def listar_turnos(
    fecha: Optional[date] = Query(None, description="Filtrar por fecha (YYYY-MM-DD)"),
    id_doctor: Optional[int] = Query(None, description="Filtrar por doctor"),
    paciente_dni: Optional[str] = Query(None, description="Filtrar por DNI de paciente"),
    db: Session = Depends(get_db),
):
    return obtener_todos_turnos(db, fecha=fecha, id_doctor=id_doctor, paciente_dni=paciente_dni)


@router.get("/hoy", response_model=list[TurnoResponse])
def turnos_hoy(db: Session = Depends(get_db)):
    return obtener_turnos_hoy(db)


@router.get("/paciente/{dni}", response_model=list[TurnoResponse])
def turnos_por_paciente(dni: str, db: Session = Depends(get_db)):
    turnos = obtener_turnos_por_paciente(db, dni)
    if not turnos:
        raise HTTPException(status_code=404, detail="No se encontraron turnos para este paciente")
    return turnos


@router.post("/", response_model=TurnoResponse, status_code=201)
def post_turno(turno: TurnoCreate, db: Session = Depends(get_db)):
    # Validar horario de atención
    dt = turno.fecha_hora
    dia_semana = dt.weekday()  # 0=lun, 1=mar, 2=mie, 3=jue, 4=vie, 5=sab, 6=dom
    hora = dt.hour + dt.minute / 60

    if dia_semana == 3:  # jueves
        raise HTTPException(status_code=400, detail="Los jueves no se atiende. Elegí otro día.")
    if dia_semana == 6:  # domingo
        raise HTTPException(status_code=400, detail="Los domingos no se atiende. Elegí otro día.")
    if hora < 9 or hora >= 19:
        raise HTTPException(status_code=400, detail="El horario de atención es de 9:00 a 19:00. Elegí otro horario.")

    existe = db.query(models.Turno).filter(
        models.Turno.id_doctor == turno.id_doctor,
        models.Turno.fecha_hora == turno.fecha_hora,
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="El doctor ya tiene un turno a esa hora")
    return crear_turno(db=db, turno=turno)


@router.patch("/{turno_id}/cancelar", response_model=TurnoResponse)
def cancelar_turno_api(turno_id: int, db: Session = Depends(get_db)):
    db_turno = cancelar_turno(db, turno_id)
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return db_turno


@router.delete("/{turno_id}")
def borrar_turno(turno_id: int, db: Session = Depends(get_db)):
    exito = eliminar_turno(db, turno_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return {"mensaje": f"Turno {turno_id} eliminado correctamente"}


@router.put("/{turno_id}/cerrar", response_model=CerrarTurnoResponse)
def cerrar_turno(turno_id: int, datos: CerrarTurnoInput, db: Session = Depends(get_db)):
    """Cierra turno: registra tratamientos + pagos + calcula deuda."""
    resultado = cerrar_turno_con_pago(
        db, turno_id,
        tratamientos_input=datos.tratamientos,
        pagos_input=datos.pagos,
    )
    if not resultado:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return resultado