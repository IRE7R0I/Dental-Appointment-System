from typing import Optional
from datetime import date, datetime
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
    conformidad_paciente: Optional[bool] = None
    creado_por_id: int
    actualizado_por_id: Optional[int] = None
    creado_en: datetime
    actualizado_en: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Resumen Paciente ─────────────────────────────────────────


class ResumenPacienteResponse(BaseModel):
    hallazgos: Optional[int] = None
    evoluciones: int
    imagenes: int = 0

    model_config = ConfigDict(from_attributes=True)
