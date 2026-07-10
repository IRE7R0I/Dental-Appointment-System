from typing import Optional, Literal
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, field_validator

VALID_UBICACION_CODES = {"O", "D", "G", "L", "M", "I", "V", "P"}


# ── Alertas Medicas ──────────────────────────────────────────


class AlertaMedicaCreate(BaseModel):
    tipo: str
    descripcion: str


class AlertaMedicaResponse(BaseModel):
    id: int
    tipo: str
    descripcion: str
    creado_por_id: int
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Evoluciones Clinicas ─────────────────────────────────────


class EvolucionClinicaCreate(BaseModel):
    fecha: date
    id_turno: Optional[int] = None
    pieza_dental: Optional[int] = None
    ubicacion_lesion: Optional[str] = None
    observaciones: str
    conformidad_paciente: bool = False

    @field_validator("pieza_dental", mode="before")
    @classmethod
    def validar_pieza_dental(cls, v):
        if v is None:
            return None
        val = int(v)
        if val < 11 or val > 48:
            raise ValueError("pieza_dental debe estar entre 11 y 48 (FDI)")
        return val

    @field_validator("ubicacion_lesion", mode="before")
    @classmethod
    def validar_ubicacion_lesion(cls, v):
        if v is None:
            return None
        codes = [code.strip() for code in v.split(",")]
        for code in codes:
            if code not in VALID_UBICACION_CODES:
                raise ValueError(
                    "ubicacion_lesion contiene codigos invalidos. Validos: O,D,G,L,M,I,V,P"
                )
        return ",".join(codes)


class EvolucionClinicaUpdate(BaseModel):
    fecha: Optional[date] = None
    pieza_dental: Optional[int] = None
    ubicacion_lesion: Optional[str] = None
    observaciones: Optional[str] = None
    conformidad_paciente: Optional[bool] = None

    @field_validator("pieza_dental", mode="before")
    @classmethod
    def validar_pieza_dental(cls, v):
        if v is None:
            return None
        val = int(v)
        if val < 11 or val > 48:
            raise ValueError("pieza_dental debe estar entre 11 y 48 (FDI)")
        return val

    @field_validator("ubicacion_lesion", mode="before")
    @classmethod
    def validar_ubicacion_lesion(cls, v):
        if v is None:
            return None
        codes = [code.strip() for code in v.split(",")]
        for code in codes:
            if code not in VALID_UBICACION_CODES:
                raise ValueError(
                    "ubicacion_lesion contiene codigos invalidos. Validos: O,D,G,L,M,I,V,P"
                )
        return ",".join(codes)


class EvolucionClinicaResponse(BaseModel):
    id: int
    fecha: date
    id_turno: Optional[int] = None
    dni_paciente: str
    pieza_dental: Optional[int] = None
    ubicacion_lesion: Optional[str] = None
    observaciones: str
    conformidad_paciente: bool
    creado_por_id: int
    actualizado_por_id: Optional[int] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Plan de Tratamiento ──────────────────────────────────────


class TratamientoCatalogoInfo(BaseModel):
    nombre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PlanTratamientoItemCreate(BaseModel):
    id_tratamiento: Optional[int] = None
    descripcion: Optional[str] = None
    fecha_objetivo: Optional[date] = None
    estado: Literal["pendiente", "completado"] = "pendiente"
    orden: int = 0


class PlanTratamientoItemUpdateEstado(BaseModel):
    estado: Literal["pendiente", "completado"]


class PlanTratamientoItemResponse(BaseModel):
    id: int
    dni_paciente: str
    id_tratamiento: Optional[int] = None
    descripcion: str
    fecha_objetivo: Optional[date] = None
    estado: str
    orden: int
    creado_en: datetime
    tratamiento: Optional[TratamientoCatalogoInfo] = None

    model_config = ConfigDict(from_attributes=True)


# ── Resumen Paciente ─────────────────────────────────────────


class ResumenPacienteResponse(BaseModel):
    hallazgos: Optional[int] = None
    pendientes: int
    pendientes_monto_estimado_ars: Decimal
    pendientes_monto_estimado_usd: Decimal
    evoluciones: int
    imagenes: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
