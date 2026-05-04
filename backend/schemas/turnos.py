from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TurnoCreate(BaseModel):
    fecha_hora: datetime
    motivo: Optional[str] = None
    dni_paciente: str
    id_doctor: int


class TurnoResponse(TurnoCreate):
    id: int
    estado: str

    class Config:
        from_attributes = True


class TurnoUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_hora: Optional[datetime] = None