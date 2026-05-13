from typing import Optional
from decimal import Decimal

from pydantic import BaseModel, model_validator


# ── Tratamientos ──────────────────────────────────────────

class TratamientoCatalogoCreate(BaseModel):
    nombre: str
    precio_ars: Optional[Decimal] = None
    precio_usd: Optional[Decimal] = None
    duracion_minutos: int = 30
    categoria: Optional[str] = None

    @model_validator(mode="after")
    def al_menos_un_precio(self):
        if self.precio_ars is None and self.precio_usd is None:
            raise ValueError("Debe especificar al menos un precio (ARS o USD)")
        return self


class TratamientoCatalogoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio_ars: Optional[Decimal] = None
    precio_usd: Optional[Decimal] = None
    duracion_minutos: Optional[int] = None
    categoria: Optional[str] = None
    activo: Optional[bool] = None


class TratamientoCatalogoResponse(BaseModel):
    id: int
    nombre: str
    precio_ars: Optional[Decimal] = None
    precio_usd: Optional[Decimal] = None
    duracion_minutos: int
    categoria: Optional[str] = None
    activo: bool = True

    class Config:
        from_attributes = True


# ── Obras Sociales ────────────────────────────────────────

class ObraSocialCreate(BaseModel):
    nombre: str


class ObraSocialResponse(BaseModel):
    id: int
    nombre: str
    activo: bool = True

    class Config:
        from_attributes = True
