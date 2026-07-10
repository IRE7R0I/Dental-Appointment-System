from pydantic import BaseModel, ConfigDict
from datetime import date, time, datetime
from typing import Literal, Optional


class TurnoCreate(BaseModel):
    fecha_hora: datetime
    duracion_minutos: int = 30
    motivo: Optional[str] = None
    dni_paciente: str
    id_doctor: int


class TurnoResponse(TurnoCreate):
    id: int
    estado: str
    paciente: Optional[dict] = None
    doctor: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)


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
    motivo: Optional[str] = None


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


# ─── C-012: Slots y bloqueos ───────────────────────────────────

class SlotBloquearInput(BaseModel):
    fecha: date
    hora: time
    id_doctor: int
    motivo: Optional[str] = None


class SlotResponse(BaseModel):
    hora: str  # "09:00"
    estado: Literal["libre", "ocupado", "bloqueado"]
    turno_id: Optional[int] = None
    paciente: Optional[str] = None
    motivo: Optional[str] = None
    slot_bloqueado_id: Optional[int] = None  # solo cuando estado=="bloqueado"


class SlotBloqueadoResponse(BaseModel):
    id: int
    fecha: date
    hora: time
    id_doctor: int
    motivo: Optional[str]
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)