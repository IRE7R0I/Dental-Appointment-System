from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, DECIMAL, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base
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

class Pago(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(DECIMAL(10, 2), nullable=False)
    fecha_pago = Column(DateTime, default=datetime.now)
    metodo_pago = Column(String(50)) # Efectivo, Transferencia, etc.
    
    id_turno = Column(Integer, ForeignKey("turnos.id"))
    turno = relationship("Turno", back_populates="pagos")

class HistoriaClinica(Base):
    __tablename__ = "historias_clinicas"

    id = Column(Integer, primary_key=True, index=True)
    notas = Column(Text)
    ultima_actualizacion = Column(DateTime, onupdate=datetime.now)

    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"))
    paciente = relationship("Paciente", back_populates="historia_clinica")