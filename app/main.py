from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from .database import get_db
from . import models, schemas, crud
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="OdontoGest API", version="0.1.0")
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
def home():
    # Buscamos el archivo index.html dentro de tu carpeta static
    return FileResponse("app/static/dashboard.html")

# RUTA PARA CREAR PACIENTES
@app.post("/pacientes/", response_model=schemas.Paciente)
def post_paciente(paciente: schemas.PacienteCreate, db: Session = Depends(get_db)):
    # Primero chequeamos si el DNI ya existe
    db_paciente = db.query(models.Paciente).filter(models.Paciente.dni == paciente.dni).first()
    if db_paciente:
        raise HTTPException(status_code=400, detail="El DNI ya está registrado")
    return crud.crear_paciente(db=db, paciente=paciente)

#DEVUELVE LISTA PACIENTES
@app.get("/pacientes/", response_model=list[schemas.Paciente])
def get_pacientes(db: Session = Depends(get_db)):
    return crud.obtener_pacientes(db)

#CREA DOCTORES
@app.post("/doctores/", response_model=schemas.Doctor)
def post_doctor(doctor: schemas.DoctorCreate, db: Session = Depends(get_db)):
    return crud.crear_doctor(db=db, doctor=doctor)

#DEVUELVE LISTA DE DOCTORES
@app.get("/doctores/", response_model=list[schemas.Doctor])
def get_doctores(db: Session = Depends(get_db)):
    return crud.obtener_doctores(db)

#CREA TURNOS
@app.post("/turnos/", response_model=schemas.Turno)
def post_turno(turno: schemas.TurnoCreate, db: Session = Depends(get_db)):
    existe = db.query(models.Turno).filter(
        models.Turno.id_doctor == turno.id_doctor,
        models.Turno.fecha_hora == turno.fecha_hora
    ).first()

    if existe:
        raise HTTPException(status_code=400, detail="El doctor ya tiene un turno a esa hora")
    return crud.crear_turno(db=db, turno=turno)

#CANCELA TURNOS
@app.patch("/turnos/{turno_id}/cancelar", response_model=schemas.Turno)
def cancelar_turno_api(turno_id: int, db: Session = Depends(get_db)):
    db_turno = crud.cancelar_turno(db, turno_id)
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return db_turno

#ELIMINA TURNOS
@app.delete("/turnos/{turno_id}")
def borrar_turno(turno_id: int, db: Session = Depends(get_db)):
    exito = crud.eliminar_turno(db, turno_id)
    if not exito:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return {"mensaje": f"Turno {turno_id} eliminado correctamente"}

#OBTIENE LISTA DE TURNOS PARA UN DNI ESPECIFICO
@app.get("/turnos/paciente/{dni}", response_model=list[schemas.Turno])
def buscar_turnos_dni(dni: str, db: Session = Depends(get_db)):
    turnos = crud.obtener_turnos_por_paciente(db, dni)
    if not turnos:
        raise HTTPException(status_code=404, detail="No se encontraron turnos para este paciente")
    return turnos

#OBTIENE LISTA DE TODOS LOS TURNOS
@app.get("/turnos/paciente", response_model=list[schemas.Turno])
def get_all_turnos(db: Session = Depends(get_db)):
    return crud.obtener_todos_turnos(db)
