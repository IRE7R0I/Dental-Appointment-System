from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from backend.database import get_db
from backend.dependencies import require_role
from backend.core.horarios import dt_local
from backend.crud.finanzas import crear_pago, resumen_caja_hoy, listar_pagos_filtrados
from backend.schemas.finanzas import PagoCreate, PagoResponse, ResumenCajaResponse, PagoContextoResponse

router = APIRouter(prefix="/finanzas", tags=["Finanzas"], dependencies=[Depends(require_role(["admin", "secretaria"]))])


def _build_constancia(pago) -> Optional[str]:
    """Construye constancia_turno desde un pago con turno asociado."""
    if pago.id_turno and hasattr(pago, 'turno') and pago.turno and pago.turno.paciente:
        t = pago.turno
        p = t.paciente
        fecha_local = dt_local(t.fecha_hora)
        return f"{fecha_local.strftime('%d/%m')} - {p.apellido} ({fecha_local.strftime('%H:%M')})"
    return None


@router.post("/pagos", response_model=PagoResponse, status_code=201)
def registrar_pago(pago: PagoCreate, db: Session = Depends(get_db)):
    pago_obj = crear_pago(db=db, pago=pago)
    pago_obj.constancia_turno = _build_constancia(pago_obj)
    return pago_obj


@router.get("/pagos", response_model=list[PagoContextoResponse])
def listar_pagos(
    fecha_desde: Optional[date] = Query(None, description="Filtrar desde fecha (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Filtrar hasta fecha (YYYY-MM-DD)"),
    metodo_pago: Optional[str] = Query(None, description="Método: efectivo | transferencia"),
    dni_paciente: Optional[str] = Query(None, description="Filtrar por DNI de paciente"),
    id_doctor: Optional[int] = Query(None, description="Filtrar por ID de doctor"),
    solo_deudores: bool = Query(False, description="Solo pacientes con saldo > 0"),
    db: Session = Depends(get_db),
):
    return listar_pagos_filtrados(
        db,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        metodo_pago=metodo_pago,
        dni_paciente=dni_paciente,
        id_doctor=id_doctor,
        solo_deudores=solo_deudores,
    )


@router.get("/caja/hoy", response_model=ResumenCajaResponse)
def caja_hoy(db: Session = Depends(get_db)):
    return resumen_caja_hoy(db)