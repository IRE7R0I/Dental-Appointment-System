from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, DECIMAL, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class Paciente(Base):
    __tablename__ = "pacientes"

    dni = Column(String(20), primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date)
    telefono = Column(String(20))
    email = Column(String(100))
    obra_social = Column(String(100))

    # Relaciones
    turnos = relationship("Turno", back_populates="paciente")
    historia_clinica = relationship("HistoriaClinica", back_populates="paciente", uselist=False)

class Doctor(Base):
    __tablename__ = "doctores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    #especialidad = Column(String(100))
    color_agenda = Column(String(7)) # Guardamos el código Hexadecimal (ej: #FF5733)

    # Relaciones
    turnos = relationship("Turno", back_populates="doctor")

class Turno(Base):
    __tablename__ = "turnos"

    __table_args__ = (
        Index('ix_turno_fecha_doctor', 'fecha_hora', 'id_doctor'),
    )

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime, nullable=False)
    duracion_minutos = Column(Integer, default=30) # Lo que hablamos de flexibilidad
    motivo = Column(String(255))
    estado = Column(String(50), default="Pendiente") # Pendiente, Asistió, Canceló
    
    # Llaves Foráneas (Los cables físicos)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"))
    id_doctor = Column(Integer, ForeignKey("doctores.id"))

    # Relaciones (Los atajos de Python)
    paciente = relationship("Paciente", back_populates="turnos")
    doctor = relationship("Doctor", back_populates="turnos")
    pagos = relationship("Pago", back_populates="turno")
    tratamientos = relationship("TurnoTratamiento", back_populates="turno", cascade="all, delete-orphan")


class TurnoTratamiento(Base):
    """Tratamiento realizado en un turno. La secretaria escribe el nombre libremente."""
    __tablename__ = "turnos_tratamientos"

    id = Column(Integer, primary_key=True, index=True)
    id_turno = Column(Integer, ForeignKey("turnos.id"), nullable=False)
    nombre = Column(String(255), nullable=False)  # "3-extracciones", "Cirugia", etc.
    cantidad = Column(Integer, default=1)
    precio_ars = Column(DECIMAL(10, 2), nullable=True)  # null si es solo USD
    precio_usd = Column(DECIMAL(10, 2), nullable=True)  # null si es solo ARS

    turno = relationship("Turno", back_populates="tratamientos")

class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(DECIMAL(10, 2), nullable=False)
    fecha_pago = Column(DateTime, default=datetime.now)
    metodo_pago = Column(String(50)) # Efectivo, Transferencia, etc.

    moneda = Column(String(3), default='ARS')
    saldo_pendiente = Column(DECIMAL(10,2), nullable=True)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), nullable=True)  # null si el pago viene con id_turno

    id_turno = Column(Integer, ForeignKey("turnos.id"))
    turno = relationship("Turno", back_populates="pagos")
    paciente = relationship("Paciente", foreign_keys=[dni_paciente])

class CuentaCorriente(Base):
    __tablename__ = "cuentas_corrientes"

    id = Column(Integer, primary_key=True, index=True)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), unique=True, nullable=False)
    saldo_ars = Column(DECIMAL(10, 2), default=0.00)
    saldo_usd = Column(DECIMAL(10, 2), default=0.00)
    ultima_actualizacion = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    paciente = relationship("Paciente", backref="cuenta_corriente", uselist=False)
    movimientos = relationship("MovimientoCuenta", back_populates="cuenta", order_by="MovimientoCuenta.fecha.desc()")


class MovimientoCuenta(Base):
    __tablename__ = "movimientos_cuenta"

    id = Column(Integer, primary_key=True, index=True)
    id_cuenta = Column(Integer, ForeignKey("cuentas_corrientes.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # "cargo" (debe) o "pago" (abono)
    monto = Column(DECIMAL(10, 2), nullable=False)
    moneda = Column(String(3), nullable=False, default="ARS")
    descripcion = Column(String(255))
    fecha = Column(DateTime, default=datetime.now)

    cuenta = relationship("CuentaCorriente", back_populates="movimientos")


class HistoriaClinica(Base):
    __tablename__ = "historias_clinicas"

    id = Column(Integer, primary_key=True, index=True)
    notas = Column(Text)
    ultima_actualizacion = Column(DateTime, onupdate=datetime.now)

    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"))
    paciente = relationship("Paciente", back_populates="historia_clinica")