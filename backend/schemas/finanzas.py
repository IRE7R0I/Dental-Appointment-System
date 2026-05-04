from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal


class PagoCreate(BaseModel):
    monto: Decimal
    metodo_pago: str
    id_turno: int
    moneda: str = "ARS"


class PagoResponse(PagoCreate):
    id: int
    fecha_pago: datetime

    class Config:
        from_attributes = True


# ─── Inputs para cerrar turno ─────────────────────────────────

class TratamientoInput(BaseModel):
    """Tratamiento realizado. La secretaria escribe nombre + precios."""
    nombre: str                                    # "3-extracciones", "Cirugia"
    cantidad: int = 1
    precio_ars: Optional[Decimal] = None           # null si solo USD
    precio_usd: Optional[Decimal] = None           # null si solo ARS


class PagoInput(BaseModel):
    """Pago registrado al cerrar turno. Pueden ser varios en distinta moneda."""
    monto: Decimal
    moneda: str                                    # "ARS" | "USD"
    metodo_pago: str = "Efectivo"


class CerrarTurnoInput(BaseModel):
    """Input completo para cerrar turno: tratamientos realizados + pagos recibidos."""
    tratamientos: list[TratamientoInput]
    pagos: list[PagoInput]


class CerrarTurnoResponse(BaseModel):
    """Respuesta al cerrar turno. Incluye totales y deuda calculada."""
    turno_id: int
    estado: str
    total_ars: Decimal
    total_usd: Decimal
    pagado_ars: Decimal
    pagado_usd: Decimal
    deuda_ars: Decimal
    deuda_usd: Decimal


# ─── Caja ────────────────────────────────────────────────────

class ResumenCajaResponse(BaseModel):
    """Resumen de caja del día actual."""
    turnos_realizados: int
    turnos_pendientes: int
    turnos_cancelados: int
    ingresos_ars: Decimal
    ingresos_usd: Decimal
    total_ingresos: Decimal

    class Config:
        from_attributes = True