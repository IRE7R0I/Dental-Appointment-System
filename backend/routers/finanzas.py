from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.crud.finanzas import crear_pago, resumen_caja_hoy
from backend.schemas.finanzas import PagoCreate, PagoResponse, ResumenCajaResponse

router = APIRouter(prefix="/finanzas", tags=["Finanzas"])


@router.post("/pagos", response_model=PagoResponse, status_code=201)
def registrar_pago(pago: PagoCreate, db: Session = Depends(get_db)):
    return crear_pago(db=db, pago=pago)


@router.get("/caja/hoy", response_model=ResumenCajaResponse)
def caja_hoy(db: Session = Depends(get_db)):
    return resumen_caja_hoy(db)