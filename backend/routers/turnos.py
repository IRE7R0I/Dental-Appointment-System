from datetime import date, datetime, time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies import require_role, get_current_user
from backend import models
from backend.core.horarios import es_hora_valida, es_hora_valida_doctor, validar_granularidad, dt_local, generar_slots
from backend.crud.turnos import (
    crear_turno,
    cancelar_turno,
    eliminar_turno,
    obtener_turnos_por_paciente,
    obtener_todos_turnos,
    obtener_turnos_hoy,
    obtener_slots_con_estado,
    obtener_slots_bulk,
    bloquear_slot,
    desbloquear_slot,
    slot_esta_bloqueado,
    slot_tiene_turno,
)
from backend.crud.finanzas import cerrar_turno_con_pago
from backend.schemas.turnos import (
    TurnoCreate, TurnoResponse, SlotBloquearInput,
    SlotResponse, SlotBloqueadoResponse, SlotsBulkResponse
)
from backend.schemas.finanzas import CerrarTurnoInput, CerrarTurnoResponse

router = APIRouter(prefix="/turnos", tags=["Turnos"], dependencies=[Depends(require_role(["admin", "secretaria"]))])


def _turno_to_response(turno) -> TurnoResponse:
    """Convierte un Turno SQLAlchemy a TurnoResponse incluyendo relaciones."""
    return TurnoResponse(
        id=turno.id,
        fecha_hora=turno.fecha_hora,
        motivo=turno.motivo,
        dni_paciente=turno.dni_paciente,
        id_doctor=turno.id_doctor,
        estado=turno.estado,
        paciente={"nombre": turno.paciente.nombre, "apellido": turno.paciente.apellido, "dni": turno.paciente.dni, "obra_social": turno.paciente.obra_social} if turno.paciente else None,
        doctor={"id": turno.doctor.id, "nombre": turno.doctor.nombre} if turno.doctor else None,
    )


@router.get("/", response_model=list[TurnoResponse])
def listar_turnos(
    fecha: Optional[date] = Query(None, description="Filtrar por fecha (YYYY-MM-DD)"),
    id_doctor: Optional[int] = Query(None, description="Filtrar por doctor"),
    paciente_dni: Optional[str] = Query(None, description="Filtrar por DNI de paciente"),
    db: Session = Depends(get_db),
):
    turnos = obtener_todos_turnos(db, fecha=fecha, id_doctor=id_doctor, paciente_dni=paciente_dni)
    return [_turno_to_response(t) for t in turnos]


@router.get("/hoy", response_model=list[TurnoResponse])
def turnos_hoy(db: Session = Depends(get_db)):
    turnos = obtener_turnos_hoy(db)
    return [_turno_to_response(t) for t in turnos]


@router.get("/paciente/{dni}", response_model=list[TurnoResponse])
def turnos_por_paciente(dni: str, db: Session = Depends(get_db)):
    turnos = obtener_turnos_por_paciente(db, dni)
    if not turnos:
        raise HTTPException(status_code=404, detail="No se encontraron turnos para este paciente")
    return [_turno_to_response(t) for t in turnos]


# ─── C-012: Slots ──────────────────────────────────────────────


@router.get("/slots", response_model=list[SlotResponse])
def listar_slots(fecha: date, id_doctor: int, db: Session = Depends(get_db)):
    """Devuelve todos los slots del día con estado (libre/ocupado/bloqueado)."""
    return obtener_slots_con_estado(db, fecha, id_doctor)


@router.post("/slots/bloquear", response_model=SlotBloqueadoResponse, status_code=201)
def post_bloquear_slot(
    data: SlotBloquearInput,
    db: Session = Depends(get_db),
    usuario: models.Usuario = Depends(get_current_user),
):
    """Bloquea un slot manualmente. Admin o secretaria."""
    # Validar que sea hora válida
    dt_check = datetime.combine(data.fecha, data.hora)
    if not es_hora_valida_doctor(db, data.id_doctor, dt_check):
        raise HTTPException(status_code=400, detail="El slot no está dentro del horario de atención")

    # Validar que no tenga turno ya
    if slot_tiene_turno(db, data.fecha, data.hora, data.id_doctor):
        raise HTTPException(status_code=409, detail="El slot ya tiene un turno asignado")

    # Validar que no esté ya bloqueado
    if slot_esta_bloqueado(db, data.fecha, data.hora, data.id_doctor):
        raise HTTPException(status_code=409, detail="El slot ya está bloqueado")

    # Si pasó validación: bloquear
    try:
        return bloquear_slot(db=db, data=data, usuario_id=int(usuario.id))
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(status_code=409, detail="El slot ya está bloqueado")
        raise


@router.delete("/slots/{slot_id}/desbloquear")
def delete_desbloquear_slot(slot_id: int, db: Session = Depends(get_db)):
    """Libera un slot bloqueado manualmente."""
    slot = desbloquear_slot(db, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot bloqueado no encontrado")
    return {"mensaje": "Slot desbloqueado correctamente"}


# ─── C-017: Slots bulk mensual ──────────────────────────────────

@router.get("/slots/bulk", response_model=SlotsBulkResponse)
def get_slots_bulk(
    fecha_desde: date = Query(..., description="Fecha inicio del rango (YYYY-MM-DD)"),
    fecha_hasta: date = Query(..., description="Fecha fin del rango (YYYY-MM-DD)"),
    id_doctor: Optional[str] = Query(
        None,
        description="IDs de doctores separados por coma (ej: 1,2,3). Si se omite, todos los activos.",
    ),
    db: Session = Depends(get_db),
):
    """
    Devuelve conteos agregados de slots por día para un rango de fechas.

    Útil para la vista mensual de agenda en frontend2.
    - 4 queries SQL → agregación Python. Evita N+1 requests.
    - Turnos con duración > 30 min ocupan múltiples slots.
    - Respuesta incluye totales combinados + desglose por doctor.
    """
    if fecha_desde > fecha_hasta:
        raise HTTPException(status_code=400, detail="fecha_desde debe ser <= fecha_hasta")

    # Resolver doctores
    if id_doctor:
        try:
            doctores_ids = [int(x.strip()) for x in id_doctor.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="id_doctor debe ser números separados por coma")
        if not doctores_ids:
            raise HTTPException(status_code=400, detail="id_doctor no puede estar vacío")
    else:
        doctores_activos = db.query(models.Doctor).filter(models.Doctor.activo == True).all()
        doctores_ids = [d.id for d in doctores_activos]
        if not doctores_ids:
            return SlotsBulkResponse(
                fecha_desde=fecha_desde,
                fecha_hasta=fecha_hasta,
                doctores=[],
                dias={},
            )

    resultado = obtener_slots_bulk(db, fecha_desde, fecha_hasta, doctores_ids)
    return SlotsBulkResponse(
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        doctores=doctores_ids,
        dias=resultado,
    )


# ─── CRUD Turnos ───────────────────────────────────────────────


@router.post("/", response_model=TurnoResponse, status_code=201)
def post_turno(turno: TurnoCreate, db: Session = Depends(get_db)):
    # Validar horario centralizado con timezone AR
    if not es_hora_valida_doctor(db, turno.id_doctor, turno.fecha_hora, turno.duracion_minutos):
        raise HTTPException(
            status_code=400,
            detail="El horario está fuera del horario de atención o la granularidad es inválida"
        )

    # Verificar que no haya conflicto con otro turno (solapamiento real)
    local = dt_local(turno.fecha_hora)
    inicio_nuevo = local.hour * 60 + local.minute
    fin_nuevo = inicio_nuevo + turno.duracion_minutos

    conflictos = db.query(models.Turno).filter(
        models.Turno.id_doctor == turno.id_doctor,
        func.date(models.Turno.fecha_hora) == local.date(),
        models.Turno.estado.in_(["Pendiente", "Realizado"]),
    ).all()

    for t in conflictos:
        t_local = dt_local(t.fecha_hora)
        t_inicio = t_local.hour * 60 + t_local.minute
        t_fin = t_inicio + int(t.duracion_minutos or 30)
        if inicio_nuevo < t_fin and fin_nuevo > t_inicio:
            raise HTTPException(
                status_code=400,
                detail="El doctor ya tiene un turno que se solapa en ese horario"
            )

    return _turno_to_response(crear_turno(db=db, turno=turno))


@router.patch("/{turno_id}/cancelar", response_model=TurnoResponse)
def cancelar_turno_api(turno_id: int, db: Session = Depends(get_db)):
    db_turno = cancelar_turno(db, turno_id)
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return _turno_to_response(db_turno)


@router.delete("/{turno_id}")
def borrar_turno(turno_id: int, db: Session = Depends(get_db)):
    exito = eliminar_turno(db, turno_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return {"mensaje": f"Turno {turno_id} eliminado correctamente"}


@router.put("/{turno_id}/cerrar", response_model=CerrarTurnoResponse)
def cerrar_turno(
    turno_id: int,
    datos: CerrarTurnoInput,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Cierra turno: registra tratamientos + pagos + calcula deuda."""
    resultado = cerrar_turno_con_pago(
        db,
        turno_id,
        tratamientos_input=datos.tratamientos,
        pagos_input=datos.pagos,
        comentarios=datos.comentarios,
        pieza_dental=datos.pieza_dental,
        ubicacion_lesion=datos.ubicacion_lesion,
        conformidad_paciente=datos.conformidad_paciente,
        creado_por_id=current_user.id,
    )
    if not resultado:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return resultado