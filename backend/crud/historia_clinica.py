from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from backend import models
from backend.schemas import historia_clinica as schemas


def crear_alerta(db: Session, dni: str, data: schemas.AlertaMedicaCreate, usuario_id: int) -> models.AlertaMedica:
    db_alerta = models.AlertaMedica(
        dni_paciente=dni,
        tipo=data.tipo,
        descripcion=data.descripcion,
        creado_por_id=usuario_id,
    )
    db.add(db_alerta)
    db.commit()
    db.refresh(db_alerta)
    return db_alerta


def listar_alertas(db: Session, dni: str) -> list[models.AlertaMedica]:
    return db.query(models.AlertaMedica).filter(
        models.AlertaMedica.dni_paciente == dni,
        models.AlertaMedica.activo == True,
    ).order_by(models.AlertaMedica.creado_en.desc()).all()


def eliminar_alerta(db: Session, id: int, usuario_id: int) -> bool:
    alerta = db.query(models.AlertaMedica).filter(models.AlertaMedica.id == id).first()
    if not alerta:
        return False
    alerta.activo = False
    alerta.eliminado_por_id = usuario_id
    alerta.eliminado_en = datetime.now()
    db.commit()
    return True


def crear_evolucion(db: Session, dni: str, data: schemas.EvolucionClinicaCreate, usuario_id: int) -> models.EvolucionClinica:
    if data.id_turno is not None:
        turno = db.query(models.Turno).filter(models.Turno.id == data.id_turno).first()
        if not turno:
            raise ValueError("Turno no encontrado")
        if turno.estado != "Asistió":
            raise ValueError("El turno debe estar en estado 'Asistió' para registrar una evolución")
        if turno.dni_paciente != dni:
            raise ValueError("El turno no pertenece a este paciente")
        fecha = turno.fecha_hora.date()
    else:
        fecha = data.fecha

    db_evol = models.EvolucionClinica(
        dni_paciente=dni,
        fecha=fecha,
        id_turno=data.id_turno,
        pieza_dental=data.pieza_dental,
        ubicacion_lesion=data.ubicacion_lesion,
        observaciones=data.observaciones,
        conformidad_paciente=data.conformidad_paciente,
        creado_por_id=usuario_id,
    )
    db.add(db_evol)
    db.commit()
    db.refresh(db_evol)
    return db_evol


def listar_evoluciones(db: Session, dni: str) -> list[models.EvolucionClinica]:
    return db.query(models.EvolucionClinica).options(
        joinedload(models.EvolucionClinica.turno)
    ).filter(
        models.EvolucionClinica.dni_paciente == dni
    ).order_by(models.EvolucionClinica.fecha.desc()).all()


def corregir_evolucion(db: Session, id: int, data: schemas.EvolucionClinicaUpdate, usuario_id: int) -> Optional[models.EvolucionClinica]:
    evol = db.query(models.EvolucionClinica).filter(models.EvolucionClinica.id == id).first()
    if not evol:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(evol, key, value)
    evol.actualizado_por_id = usuario_id
    evol.actualizado_en = datetime.now()
    db.commit()
    db.refresh(evol)
    return evol


def crear_item_plan(db: Session, dni: str, data: schemas.PlanTratamientoItemCreate) -> models.PlanTratamientoItem:
    descripcion = data.descripcion
    if data.id_tratamiento is not None and not descripcion:
        tratamiento = db.query(models.TratamientoCatalogo).filter(
            models.TratamientoCatalogo.id == data.id_tratamiento
        ).first()
        if tratamiento:
            descripcion = tratamiento.nombre
    if not descripcion:
        raise ValueError("Debe proporcionar una descripcion o un id_tratamiento valido")

    db_item = models.PlanTratamientoItem(
        dni_paciente=dni,
        id_tratamiento=data.id_tratamiento,
        descripcion=descripcion,
        fecha_objetivo=data.fecha_objetivo,
        estado=data.estado,
        orden=data.orden,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def listar_plan(db: Session, dni: str) -> list[models.PlanTratamientoItem]:
    return db.query(models.PlanTratamientoItem).options(
        joinedload(models.PlanTratamientoItem.tratamiento)
    ).filter(
        models.PlanTratamientoItem.dni_paciente == dni
    ).order_by(models.PlanTratamientoItem.orden.asc()).all()


def cambiar_estado_plan(db: Session, id: int, data: schemas.PlanTratamientoItemUpdateEstado) -> Optional[models.PlanTratamientoItem]:
    item = db.query(models.PlanTratamientoItem).filter(models.PlanTratamientoItem.id == id).first()
    if not item:
        return None
    item.estado = data.estado
    db.commit()
    db.refresh(item)
    return item


def eliminar_item_plan(db: Session, id: int) -> bool:
    item = db.query(models.PlanTratamientoItem).filter(models.PlanTratamientoItem.id == id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True


def obtener_resumen(db: Session, dni: str) -> dict:
    count_evoluciones = db.query(func.count(models.EvolucionClinica.id)).filter(
        models.EvolucionClinica.dni_paciente == dni
    ).scalar() or 0

    items = db.query(models.PlanTratamientoItem).options(
        joinedload(models.PlanTratamientoItem.tratamiento)
    ).filter(
        models.PlanTratamientoItem.dni_paciente == dni,
        models.PlanTratamientoItem.estado == "pendiente",
    ).all()

    pendientes = len(items)
    total_ars = sum(
        (item.tratamiento.precio_ars for item in items
         if item.tratamiento and item.tratamiento.precio_ars is not None),
        Decimal('0'),
    )
    total_usd = sum(
        (item.tratamiento.precio_usd for item in items
         if item.tratamiento and item.tratamiento.precio_usd is not None),
        Decimal('0'),
    )

    return {
        "hallazgos": None,
        "pendientes": pendientes,
        "pendientes_monto_estimado_ars": total_ars,
        "pendientes_monto_estimado_usd": total_usd,
        "evoluciones": count_evoluciones,
        "imagenes": None,
    }
