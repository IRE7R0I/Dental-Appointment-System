from io import BytesIO
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend import models
from backend.schemas import imagenes as schemas
from backend.services.almacenamiento import obtener_almacenamiento


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


# ── Carpetas ──────────────────────────────────────────────────


def crear_carpeta(db: Session, dni: str, nombre: str, creado_por_id: int) -> models.CarpetaPaciente:
    carpeta = models.CarpetaPaciente(
        dni_paciente=dni,
        nombre=nombre,
        creado_por_id=creado_por_id,
    )
    db.add(carpeta)
    db.commit()
    db.refresh(carpeta)
    return carpeta


def listar_carpetas(db: Session, dni: str) -> list[models.CarpetaPaciente]:
    return db.query(models.CarpetaPaciente).filter(
        models.CarpetaPaciente.dni_paciente == dni
    ).order_by(models.CarpetaPaciente.creado_en.desc()).all()


def renombrar_carpeta(db: Session, id: int, nombre: str) -> Optional[models.CarpetaPaciente]:
    carpeta = db.query(models.CarpetaPaciente).filter(models.CarpetaPaciente.id == id).first()
    if not carpeta:
        return None
    carpeta.nombre = nombre
    db.commit()
    db.refresh(carpeta)
    return carpeta


def eliminar_carpeta(db: Session, id: int) -> bool:
    """Elimina carpeta y CASCADE: borra imágenes + binarios."""
    carpeta = db.query(models.CarpetaPaciente).filter(models.CarpetaPaciente.id == id).first()
    if not carpeta:
        return False
    # Eliminar binarios primero (capa de almacenamiento)
    almacenamiento = obtener_almacenamiento(db)
    imagenes = db.query(models.Imagen).filter(models.Imagen.id_carpeta == id).all()
    for img in imagenes:
        try:
            almacenamiento.eliminar(img.id)
        except Exception:
            pass  # Si no existe binario, continuar
    # Borrar metadatos de imágenes (dispara cascade a ImagenContenido)
    db.query(models.Imagen).filter(models.Imagen.id_carpeta == id).delete()
    # Borrar carpeta
    db.delete(carpeta)
    db.commit()
    return True


# ── Imágenes ──────────────────────────────────────────────────


def guardar_imagen(
    db: Session,
    id_carpeta: int,
    archivo: UploadFile,
    es_radiografia: bool,
    creado_por_id: int,
) -> models.Imagen:
    """Valida archivo, comprime, guarda binario + metadatos."""
    # Validar tipo MIME
    if archivo.content_type not in ALLOWED_MIME_TYPES:
        raise ValueError(
            f"Tipo de archivo no permitido: {archivo.content_type}. "
            f"Permitidos: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    # Leer contenido original para validar tamaño
    data = archivo.file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError(f"El archivo excede el límite de 10 MB ({len(data)} bytes recibidos)")

    # Crear metadatos primero para obtener id_imagen
    img = models.Imagen(
        id_carpeta=id_carpeta,
        nombre_original=archivo.filename or "sin_nombre",
        tipo_mime="image/webp",  # será siempre WebP tras compresión
        tamano_bytes=0,  # se actualiza tras compresión
        es_radiografia=es_radiografia,
        creado_por_id=creado_por_id,
    )
    db.add(img)
    db.commit()
    db.refresh(img)

    # Comprimir y guardar binario vía capa de almacenamiento
    almacenamiento = obtener_almacenamiento(db)
    try:
        webp_size = almacenamiento.guardar(img.id, data, es_radiografia)
    except ValueError as e:
        # Si falla compresión, limpiar metadatos creados
        db.delete(img)
        db.commit()
        raise e

    # Actualizar tamaño final
    img.tamano_bytes = webp_size
    db.commit()
    db.refresh(img)
    return img


def listar_imagenes(db: Session, id_carpeta: int) -> list[models.Imagen]:
    """Solo metadatos. Sin binario."""
    return db.query(models.Imagen).filter(
        models.Imagen.id_carpeta == id_carpeta
    ).order_by(models.Imagen.creado_en.desc()).all()


def obtener_imagen(db: Session, id: int) -> Optional[models.Imagen]:
    return db.query(models.Imagen).filter(models.Imagen.id == id).first()


def eliminar_imagen(db: Session, id: int) -> bool:
    """Elimina metadatos + binario."""
    img = db.query(models.Imagen).filter(models.Imagen.id == id).first()
    if not img:
        return False
    # Eliminar binario
    almacenamiento = obtener_almacenamiento(db)
    try:
        almacenamiento.eliminar(img.id)
    except Exception:
        pass
    # Eliminar metadatos (el cascade de relación se encarga de ImagenContenido)
    db.delete(img)
    db.commit()
    return True


def contar_imagenes_paciente(db: Session, dni: str) -> int:
    """Cuenta imágenes en todas las carpetas del paciente."""
    return db.query(func.count(models.Imagen.id)).join(
        models.CarpetaPaciente, models.Imagen.id_carpeta == models.CarpetaPaciente.id
    ).filter(
        models.CarpetaPaciente.dni_paciente == dni
    ).scalar() or 0
