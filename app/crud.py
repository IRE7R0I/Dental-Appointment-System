from sqlalchemy.orm import Session
from . import models, schemas

def crear_paciente(db: Session, paciente: schemas.PacienteCreate):
    db_paciente = models.Paciente(
        dni=paciente.dni,
        nombre=paciente.nombre,
        apellido=paciente.apellido,
        fecha_nacimiento=paciente.fecha_nacimiento,
        telefono=paciente.telefono,
        email=paciente.email,
        obra_social=paciente.obra_social
    )
    db.add(db_paciente) # Lo preparamos
    db.commit()         # Lo guardamos físicamente
    db.refresh(db_paciente) # Recuperamos los datos finales
    return db_paciente

def obtener_pacientes(db: Session):
    return db.query(models.Paciente).all()

def crear_doctor(db: Session, doctor: schemas.DoctorCreate):
    db_doctor = models.Doctor(
        nombre=doctor.nombre,
        color_agenda=doctor.color_agenda
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

def obtener_doctores(db: Session):
    return db.query(models.Doctor).all()

def crear_turno(db: Session, turno: schemas.TurnoCreate):
    db_turno = models.Turno(
        fecha_hora=turno.fecha_hora,
        motivo=turno.motivo,
        dni_paciente=turno.dni_paciente,
        id_doctor=turno.id_doctor,
        estado="Pendiente" # Todos arrancan así
    )
    db.add(db_turno)
    db.commit()
    db.refresh(db_turno)
    return db_turno

def cancelar_turno(db: Session, turno_id: int):
    # Buscamos el turno
    db_turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    
    if db_turno:
        db_turno.estado = "Cancelado" # type: ignore - Cambiamos el estado
        db.commit()                   # Guardamos el cambio
        db.refresh(db_turno)          # Refrescamos para devolver el objeto nuevo
        return db_turno
    return None

def eliminar_turno(db: Session, turno_id: int):
    db_turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if db_turno:
        db.delete(db_turno)
        db.commit()
        return True
    return False

def obtener_turnos_por_paciente(db: Session, dni: str):
    return db.query(models.Turno).filter(models.Turno.dni_paciente == dni).all()

def obtener_todos_turnos(db:Session):
    return db.query(models.Turno).all()

