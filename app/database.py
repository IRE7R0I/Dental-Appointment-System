from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Cargamos las variables del archivo .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# El engine es el que se encarga de hablar con la DB
engine = create_engine(DATABASE_URL)

# La sesión es lo que usamos para hacer consultas
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base es la clase de la que heredarán nuestros modelos
Base = declarative_base()

# Esta función la usaremos en FastAPI para abrir/cerrar la conexión
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()