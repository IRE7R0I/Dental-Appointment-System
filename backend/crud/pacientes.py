from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from backend import models
from backend.schemas.pacientes import PacienteCreate


def crear_paciente(db: Session, paciente: PacienteCreate):
    db_paciente = models.Paciente(
        dni=paciente.dni,
        nombre=paciente.nombre,
        apellido=paciente.apellido,
        fecha_nacimiento=paciente.fecha_nacimiento,
        telefono=paciente.telefono,
        email=paciente.email,
        obra_social=paciente.obra_social,
    )
    db.add(db_paciente)
    db.commit()
    db.refresh(db_paciente)
    return db_paciente


def obtener_pacientes(db: Session):
    return db.query(models.Paciente).all()


def obtener_paciente_por_dni(db: Session, dni: str):
    return db.query(models.Paciente).filter(models.Paciente.dni == dni).first()


# ─── Cuenta Corriente ─────────────────────────────────────────────


def obtener_o_crear_cuenta(db: Session, dni: str):
    """Obtiene la cuenta corriente del paciente o la crea si no existe."""
    cuenta = db.query(models.CuentaCorriente).options(
        joinedload(models.CuentaCorriente.movimientos)
    ).filter(models.CuentaCorriente.dni_paciente == dni).first()
    if not cuenta:
        cuenta = models.CuentaCorriente(dni_paciente=dni)
        db.add(cuenta)
        db.commit()
        db.refresh(cuenta)
    return cuenta


def registrar_movimiento(db: Session, dni: str, tipo: str, monto: Decimal, moneda: str, descripcion: str = ""):
    """Registra un movimiento en la cuenta corriente del paciente y actualiza saldos."""
    cuenta = obtener_o_crear_cuenta(db, dni)
    movimiento = models.MovimientoCuenta(
        id_cuenta=cuenta.id,
        tipo=tipo,
        monto=monto,
        moneda=moneda,
        descripcion=descripcion,
    )
    db.add(movimiento)

    if tipo == "cargo":
        if moneda == "ARS":
            cuenta.saldo_ars = (cuenta.saldo_ars or Decimal("0.00")) + monto
        else:
            cuenta.saldo_usd = (cuenta.saldo_usd or Decimal("0.00")) + monto
    elif tipo == "pago":
        if moneda == "ARS":
            cuenta.saldo_ars = (cuenta.saldo_ars or Decimal("0.00")) - monto
        else:
            cuenta.saldo_usd = (cuenta.saldo_usd or Decimal("0.00")) - monto

    db.commit()
    db.refresh(cuenta)
    return cuenta


def listar_deudores(db: Session):
    """Lista pacientes con saldo > 0 en ARS o USD."""
    cuentas = db.query(models.CuentaCorriente).filter(
        (models.CuentaCorriente.saldo_ars > 0) | (models.CuentaCorriente.saldo_usd > 0)
    ).all()

    resultado = []
    for c in cuentas:
        p = db.query(models.Paciente).filter(models.Paciente.dni == c.dni_paciente).first()
        if p:
            from backend.schemas.pacientes import DeudorResponse
            resultado.append(DeudorResponse(
                dni=p.dni,
                nombre=p.nombre,
                apellido=p.apellido,
                telefono=p.telefono,
                saldo_ars=c.saldo_ars or Decimal("0.00"),
                saldo_usd=c.saldo_usd or Decimal("0.00"),
            ))
    return resultado