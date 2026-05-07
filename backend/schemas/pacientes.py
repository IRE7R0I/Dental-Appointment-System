from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional
from decimal import Decimal


class PacienteCreate(BaseModel):
    dni: str
    nombre: str
    apellido: str
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    obra_social: Optional[str] = None


class PacienteResponse(PacienteCreate):
    class Config:
        from_attributes = True


class PacienteUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    obra_social: Optional[str] = None


class MovimientoResponse(BaseModel):
    id: int
    tipo: str
    monto: Decimal
    moneda: str
    descripcion: Optional[str] = None
    fecha: datetime

    class Config:
        from_attributes = True


class CuentaCorrienteResponse(BaseModel):
    dni_paciente: str
    saldo_ars: float
    saldo_usd: float
    ultima_actualizacion: Optional[datetime] = None
    movimientos: list[MovimientoResponse] = []

    class Config:
        from_attributes = True


class DeudorResponse(BaseModel):
    dni: str
    nombre: str
    apellido: str
    telefono: Optional[str] = None
    saldo_ars: float
    saldo_usd: float

    class Config:
        from_attributes = True