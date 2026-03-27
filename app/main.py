from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .database import get_db
from . import models

app = FastAPI(title="OdontoGest API", version="0.1.0")

@app.get("/")
def home():
    return {
        "mensaje": "¡Bienvenido a OdontoGest!",
        "estado": "Servidor corriendo perfectamente",
        "doctor_principal": "Fulano / Merenguito"
    }

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    # Intentamos contar cuántos pacientes hay (debería ser 0 ahora)
    cantidad = db.query(models.Paciente).count()
    return {"mensaje": "Conexión con Postgres exitosa", "pacientes_en_db": cantidad}