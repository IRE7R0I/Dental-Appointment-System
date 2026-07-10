from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import get_db
from backend.dependencies import require_role, get_current_user
from backend import models
from backend.schemas import imagenes as schemas
from backend.crud import imagenes as crud

router = APIRouter(
    prefix="/pacientes",
    tags=["Imágenes / Radiografías"],
    dependencies=[Depends(require_role(["admin", "secretaria"]))],
)

# Router for standalone image endpoints (outside /pacientes prefix)
imagenes_router = APIRouter(
    tags=["Imágenes / Radiografías"],
    dependencies=[Depends(require_role(["admin", "secretaria"]))],
)


def _verificar_paciente(db: Session, dni: str):
    paciente = db.query(models.Paciente).filter(models.Paciente.dni == dni).first()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")


def _verificar_carpeta(db: Session, id_carpeta: int, dni: str) -> models.CarpetaPaciente:
    carpeta = db.query(models.CarpetaPaciente).filter(
        models.CarpetaPaciente.id == id_carpeta,
        models.CarpetaPaciente.dni_paciente == dni,
    ).first()
    if not carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no encontrada")
    return carpeta


# ─── Carpetas ────────────────────────────────────────────────


@router.post("/{dni}/carpetas", response_model=schemas.CarpetaResponse, status_code=201)
def crear_carpeta(
    dni: str,
    data: schemas.CarpetaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _verificar_paciente(db, dni)
    return crud.crear_carpeta(db, dni, data.nombre, current_user.id)


@router.get("/{dni}/carpetas", response_model=list[schemas.CarpetaResponse])
def listar_carpetas(dni: str, db: Session = Depends(get_db)):
    _verificar_paciente(db, dni)
    return crud.listar_carpetas(db, dni)


@router.put("/{dni}/carpetas/{id_carpeta}", response_model=schemas.CarpetaResponse)
def renombrar_carpeta(
    dni: str,
    id_carpeta: int,
    data: schemas.CarpetaUpdate,
    db: Session = Depends(get_db),
):
    _verificar_paciente(db, dni)
    _verificar_carpeta(db, id_carpeta, dni)
    carpeta = crud.renombrar_carpeta(db, id_carpeta, data.nombre)
    if not carpeta:
        raise HTTPException(status_code=404, detail="Carpeta no encontrada")
    return carpeta


@router.delete("/{dni}/carpetas/{id_carpeta}")
def eliminar_carpeta(
    dni: str,
    id_carpeta: int,
    db: Session = Depends(get_db),
):
    _verificar_paciente(db, dni)
    _verificar_carpeta(db, id_carpeta, dni)
    if not crud.eliminar_carpeta(db, id_carpeta):
        raise HTTPException(status_code=404, detail="Carpeta no encontrada")
    return {"mensaje": "Carpeta eliminada"}


# ─── Imágenes ────────────────────────────────────────────────


@router.post("/{dni}/carpetas/{id_carpeta}/imagenes", response_model=schemas.ImagenResponse, status_code=201)
def subir_imagen(
    dni: str,
    id_carpeta: int,
    es_radiografia: bool = Form(False),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _verificar_paciente(db, dni)
    _verificar_carpeta(db, id_carpeta, dni)
    try:
        return crud.guardar_imagen(db, id_carpeta, archivo, es_radiografia, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{dni}/carpetas/{id_carpeta}/imagenes", response_model=list[schemas.ImagenResponse])
def listar_imagenes(
    dni: str,
    id_carpeta: int,
    db: Session = Depends(get_db),
):
    _verificar_paciente(db, dni)
    _verificar_carpeta(db, id_carpeta, dni)
    return crud.listar_imagenes(db, id_carpeta)


# ─── Standalone image endpoints (prefix-less, for content serving) ────


@imagenes_router.get("/imagenes/{id_imagen}/contenido")
def obtener_contenido_imagen(
    id_imagen: int,
    db: Session = Depends(get_db),
):
    img = crud.obtener_imagen(db, id_imagen)
    if not img:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    almacenamiento = crud.obtener_almacenamiento if hasattr(crud, 'obtener_almacenamiento') else None
    # Usar almacenamiento directamente
    from backend.services.almacenamiento import obtener_almacenamiento
    store = obtener_almacenamiento(db)
    try:
        binario = store.obtener(id_imagen)
    except ValueError:
        raise HTTPException(status_code=404, detail="Contenido de imagen no encontrado")

    return Response(content=binario, media_type=img.tipo_mime)


@imagenes_router.delete("/imagenes/{id_imagen}")
def eliminar_imagen(
    id_imagen: int,
    db: Session = Depends(get_db),
):
    if not crud.eliminar_imagen(db, id_imagen):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return {"mensaje": "Imagen eliminada"}
