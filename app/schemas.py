from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional

# Esto es lo que pedimos cuando creamos un paciente
class PacienteCreate(BaseModel):
    dni: str
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    obra_social: Optional[str] = None

# Esto es lo que devolvemos (incluye todo lo anterior)
class Paciente(PacienteCreate):
    class Config:
        from_attributes = True

class DoctorCreate(BaseModel):
    nombre: str
    color_agenda: Optional[str] = "#FFFFFF" # El color para la agenda

class Doctor(DoctorCreate):
    id: int
    class Config:
        from_attributes = True

class TurnoCreate(BaseModel):
    fecha_hora: datetime
    motivo: Optional[str] = None
    dni_paciente: str
    id_doctor: int

class Turno(TurnoCreate):
    id: int
    estado: str
    class Config:
        from_attributes = True