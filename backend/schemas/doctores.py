from pydantic import BaseModel
from typing import Optional


class DoctorCreate(BaseModel):
    nombre: str
    color_agenda: Optional[str] = "#FFFFFF"


class DoctorResponse(DoctorCreate):
    id: int

    class Config:
        from_attributes = True