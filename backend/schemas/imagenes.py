from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ── Carpetas ──────────────────────────────────────────────────


class CarpetaCreate(BaseModel):
    nombre: str


class CarpetaUpdate(BaseModel):
    nombre: str


class CarpetaResponse(BaseModel):
    id: int
    dni_paciente: str
    nombre: str
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Imágenes ───────────────────────────────────────────────────


class ImagenResponse(BaseModel):
    id: int
    id_carpeta: int
    nombre_original: str
    tipo_mime: str
    tamano_bytes: int
    es_radiografia: bool
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
