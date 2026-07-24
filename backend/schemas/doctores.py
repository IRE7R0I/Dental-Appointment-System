import re
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Literal


class DoctorCreate(BaseModel):
    nombre: str
    color_agenda: Optional[str] = "#FFFFFF"
    horizonte_dias: Optional[Literal[30, 60, 90, 180]] = 180

    @field_validator("color_agenda")
    @classmethod
    def validar_hex(cls, v):
        if v is not None and not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Formato hex inválido. Usar #RRGGBB")
        return v


class DoctorUpdate(BaseModel):
    nombre: Optional[str] = None
    color_agenda: Optional[str] = None
    horizonte_dias: Optional[Literal[30, 60, 90, 180]] = None

    @field_validator("color_agenda")
    @classmethod
    def validar_hex(cls, v):
        if v is not None and not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Formato hex inválido. Usar #RRGGBB")
        return v


class DoctorResponse(BaseModel):
    id: int
    nombre: str
    color_agenda: Optional[str] = None
    activo: bool = True
    horizonte_dias: Literal[30, 60, 90, 180] = 180

    model_config = ConfigDict(from_attributes=True)
