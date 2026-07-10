from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, DECIMAL, ForeignKey, Text, Time, Index, UniqueConstraint
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
    alertas_medicas = relationship("AlertaMedica", back_populates="paciente")
    evoluciones_clinicas = relationship("EvolucionClinica", back_populates="paciente")
    plan_tratamiento = relationship("PlanTratamientoItem", back_populates="paciente")

class Doctor(Base):
    __tablename__ = "doctores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    color_agenda = Column(String(7))
    activo = Column(Boolean, default=True)  # CHANGE-009: soft-delete

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
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # CHANGE-009
    actualizado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # CHANGE-009

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


# ── CHANGE-009: Autenticación ─────────────────────────────────
class Usuario(Base):
    """Usuario interno del sistema: admin o secretaria."""
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False, default="secretaria")  # admin | secretaria
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, default=datetime.now)


# ── CHANGE-011: Catálogo ──────────────────────────────────
class TratamientoCatalogo(Base):
    """Tratamiento odontológico con precios base ARS/USD."""
    __tablename__ = "tratamientos_catalogo"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    precio_ars = Column(DECIMAL(10, 2), nullable=True)
    precio_usd = Column(DECIMAL(10, 2), nullable=True)
    duracion_minutos = Column(Integer, default=30)
    categoria = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)


class ObraSocial(Base):
    """Obra social o mutual para selector."""
    __tablename__ = "obras_sociales"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)
    activo = Column(Boolean, default=True)


# ── C-014: Historia Clínica y Plan de Tratamiento ──────────
class AlertaMedica(Base):
    """Alergia o condición médica relevante del paciente."""
    __tablename__ = "alertas_medicas"

    id = Column(Integer, primary_key=True, index=True)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), nullable=False, index=True)
    tipo = Column(String(50), nullable=False)  # "alergia" | "condicion"
    descripcion = Column(String(255), nullable=False)
    activo = Column(Boolean, default=True)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime, default=datetime.now)
    eliminado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    eliminado_en = Column(DateTime, nullable=True)

    paciente = relationship("Paciente", back_populates="alertas_medicas")
    creado_por = relationship("Usuario", foreign_keys=[creado_por_id])
    eliminado_por = relationship("Usuario", foreign_keys=[eliminado_por_id])


class EvolucionClinica(Base):
    """Evolución clínica asociada a un turno o registrada manualmente."""
    __tablename__ = "evoluciones_clinicas"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    id_turno = Column(Integer, ForeignKey("turnos.id"), nullable=True)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), nullable=False, index=True)
    pieza_dental = Column(Integer, nullable=True)
    ubicacion_lesion = Column(String(100), nullable=True)
    observaciones = Column(Text, nullable=False)
    conformidad_paciente = Column(Boolean, default=False)
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    actualizado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    creado_en = Column(DateTime, default=datetime.now)
    actualizado_en = Column(DateTime, nullable=True, onupdate=datetime.now)

    paciente = relationship("Paciente", back_populates="evoluciones_clinicas")
    turno = relationship("Turno")
    creado_por = relationship("Usuario", foreign_keys=[creado_por_id])
    actualizado_por = relationship("Usuario", foreign_keys=[actualizado_por_id])


class PlanTratamientoItem(Base):
    """Ítem del plan de tratamiento del paciente."""
    __tablename__ = "plan_tratamiento_items"

    id = Column(Integer, primary_key=True, index=True)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), nullable=False, index=True)
    id_tratamiento = Column(Integer, ForeignKey("tratamientos_catalogo.id"), nullable=True)
    descripcion = Column(String(255), nullable=False)
    fecha_objetivo = Column(Date, nullable=True)
    estado = Column(String(20), nullable=False, default="pendiente")  # pendiente | completado
    orden = Column(Integer, default=0)
    creado_en = Column(DateTime, default=datetime.now)

    paciente = relationship("Paciente", back_populates="plan_tratamiento")
    tratamiento = relationship("TratamientoCatalogo")


# ── C-012: Slots bloqueados manualmente ─────────────────────
class SlotsBloqueado(Base):
    __tablename__ = "slots_bloqueados"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    id_doctor = Column(Integer, ForeignKey("doctores.id"), nullable=False)
    motivo = Column(String(255), nullable=True)
    bloqueado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint('fecha', 'hora', 'id_doctor', name='uq_slot_bloqueado'),
    )

    doctor = relationship("Doctor")
    bloqueado_por = relationship("Usuario")