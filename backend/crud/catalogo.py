from typing import Optional
from sqlalchemy.orm import Session
from backend import models
from backend.schemas.catalogo import (
    TratamientoCatalogoCreate,
    TratamientoCatalogoUpdate,
    ObraSocialCreate,
)


# ── Tratamientos ──────────────────────────────────────────

def listar_tratamientos(db: Session, categoria: Optional[str] = None) -> list:
    q = db.query(models.TratamientoCatalogo).filter(models.TratamientoCatalogo.activo == True)
    if categoria:
        q = q.filter(models.TratamientoCatalogo.categoria == categoria)
    return q.order_by(models.TratamientoCatalogo.nombre).all()


def obtener_tratamiento(db: Session, tratamiento_id: int) -> Optional[models.TratamientoCatalogo]:
    return db.query(models.TratamientoCatalogo).filter(models.TratamientoCatalogo.id == tratamiento_id).first()


def crear_tratamiento(db: Session, data: TratamientoCatalogoCreate) -> models.TratamientoCatalogo:
    obj = models.TratamientoCatalogo(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def actualizar_tratamiento(db: Session, tratamiento_id: int, data: TratamientoCatalogoUpdate) -> Optional[models.TratamientoCatalogo]:
    obj = obtener_tratamiento(db, tratamiento_id)
    if not obj:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_tratamiento(db: Session, tratamiento_id: int) -> Optional[models.TratamientoCatalogo]:
    obj = obtener_tratamiento(db, tratamiento_id)
    if not obj:
        return None
    obj.activo = False
    db.commit()
    db.refresh(obj)
    return obj


# ── Obras Sociales ────────────────────────────────────────

def listar_obras_sociales(db: Session) -> list:
    return db.query(models.ObraSocial).filter(models.ObraSocial.activo == True).all()


def crear_obra_social(db: Session, data: ObraSocialCreate) -> models.ObraSocial:
    obj = models.ObraSocial(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_obra_social(db: Session, os_id: int) -> Optional[models.ObraSocial]:
    obj = db.query(models.ObraSocial).filter(models.ObraSocial.id == os_id).first()
    if not obj:
        return None
    obj.activo = False
    db.commit()
    db.refresh(obj)
    return obj


def set_activo_tratamiento(db: Session, tratamiento_id: int, activo: bool) -> Optional[models.TratamientoCatalogo]:
    obj = obtener_tratamiento(db, tratamiento_id)
    if not obj:
        return None
    obj.activo = activo
    db.commit()
    db.refresh(obj)
    return obj


def set_activo_obra_social(db: Session, os_id: int, activo: bool) -> Optional[models.ObraSocial]:
    obj = db.query(models.ObraSocial).filter(models.ObraSocial.id == os_id).first()
    if not obj:
        return None
    obj.activo = activo
    db.commit()
    db.refresh(obj)
    return obj


def set_activo_tratamiento(db: Session, tratamiento_id: int, activo: bool):
    """Set tratamiento active/inactive."""
    if not activo:
        return soft_delete_tratamiento(db, tratamiento_id)
    obj = obtener_tratamiento(db, tratamiento_id)
    if not obj:
        return None
    obj.activo = True
    db.commit()
    db.refresh(obj)
    return obj


def set_activo_obra_social(db: Session, os_id: int, activo: bool):
    """Set obra social active/inactive."""
    if not activo:
        return soft_delete_obra_social(db, os_id)
    obj = db.query(models.ObraSocial).filter(models.ObraSocial.id == os_id).first()
    if not obj:
        return None
    obj.activo = True
    db.commit()
    db.refresh(obj)
    return obj
