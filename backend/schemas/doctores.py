from pydantic import BaseModel
from typing import Optional


class DoctorCreate(BaseModel):
    nombre: str
    color_agenda: Optional[str] = "#FFFFFF"


class DoctorUpdate(BaseModel):
    nombre: Optional[str] = None
    color_agenda: Optional[str] = None


class DoctorResponse(BaseModel):
    id: int
    nombre: str
    color_agenda: Optional[str] = None
    activo: bool = True

    class Config:
        from_attributes = True
