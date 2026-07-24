from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


class DiaHorarioEntry(BaseModel):
    manana: Optional[list[str]] = None  # ["09:00", "13:00"] or None
    tarde: Optional[list[str]] = None   # ["16:00", "20:00"] or None
    model_config = ConfigDict(exclude_none=True)


class HorarioDoctorResponse(BaseModel):
    id_doctor: int
    nombre_doctor: str
    granularidad_minutos: int = 30
    horizonte_dias: Literal[30, 60, 90, 180] = 180
    dias: dict[str, Optional[DiaHorarioEntry]]  # keys: "lunes"..."domingo"
    model_config = ConfigDict(from_attributes=True)


class HorarioDoctorUpdate(BaseModel):
    dias: Optional[dict[str, Optional[DiaHorarioEntry]]] = None
    horizonte_dias: Optional[Literal[30, 60, 90, 180]] = None


class DiaNoLaborableCreate(BaseModel):
    fecha: date
    motivo: Optional[str] = None


class DiaNoLaborableResponse(BaseModel):
    id: int
    fecha: date
    motivo: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
