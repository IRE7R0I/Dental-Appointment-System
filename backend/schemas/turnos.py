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
    paciente: Optional[dict] = None
    doctor: Optional[dict] = None

    class Config:
        from_attributes = True


class TurnoUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_hora: Optional[datetime] = None


# ─── Historial de pagos por paciente ──────────────────────────────

class HistorialTratamientoResponse(BaseModel):
    nombre: str
    cantidad: int
    precio_ars: Optional[float] = None
    precio_usd: Optional[float] = None


class PagoEnHistorialResponse(BaseModel):
    id: int
    fecha: datetime
    monto: float
    moneda: str
    metodo_pago: str


class HistorialTurnoItemResponse(BaseModel):
    id: int
    fecha_hora: datetime
    estado: str
    doctor: dict  # {id, nombre}
    tratamientos: list[HistorialTratamientoResponse]
    total_ars: float
    total_usd: float
    pagos: list[PagoEnHistorialResponse]
    total_pagado_ars: float
    total_pagado_usd: float
    saldo_ars: float
    saldo_usd: float


class TotalesHistorial(BaseModel):
    total_tratamientos_ars: float
    total_tratamientos_usd: float
    total_pagado_ars: float
    total_pagado_usd: float
    saldo_ars: float
    saldo_usd: float


class HistorialPacienteResponse(BaseModel):
    dni_paciente: str
    nombre: str
    apellido: str
    saldo_ars: float
    saldo_usd: float
    turnos: list[HistorialTurnoItemResponse]
    totales: TotalesHistorial