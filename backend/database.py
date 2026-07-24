from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import unicodedata
from dotenv import load_dotenv

# Cargamos las variables del archivo .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# El engine es el que se encarga de hablar con la DB
engine = create_engine(DATABASE_URL) # type: ignore

# La sesión es lo que usamos para hacer consultas
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base es la clase de la que heredarán nuestros modelos
Base = declarative_base()


def py_unaccent(text: str | None) -> str | None:
    """Remueve acentos y diacríticos manteniendo los caracteres base en minúscula."""
    if text is None:
        return None
    normalized = unicodedata.normalize("NFD", text)
    return "".join(c for c in normalized if unicodedata.category(c) != "Mn")


@event.listens_for(Engine, "connect")
def set_sqlite_functions(dbapi_connection, connection_record):
    """Listener único de conexión DB para registrar funciones sqlite y pragmas."""
    if hasattr(dbapi_connection, "create_function"):
        dbapi_connection.create_function("unaccent", 1, py_unaccent)


# Esta función la usaremos en FastAPI para abrir/cerrar la conexión
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()