import re
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional


class DoctorCreate(BaseModel):
    nombre: str
    color_agenda: Optional[str] = "#FFFFFF"

    @field_validator("color_agenda")
    @classmethod
    def validar_hex(cls, v):
        if v is not None and not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Formato hex inválido. Usar #RRGGBB")
        return v


class DoctorUpdate(BaseModel):
    nombre: Optional[str] = None
    color_agenda: Optional[str] = None

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

    model_config = ConfigDict(from_attributes=True)
