"""
Pytest fixtures for integration tests.
Uses SQLite in-memory database (real DB, no mocks).
"""
import sys
import os

# Ensure backend/ is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Force SQLite file-based for tests BEFORE importing app/database
# (in-memory creates separate DB per thread with SingletonThreadPool)
os.environ["DATABASE_URL"] = "sqlite:///./test.db?check_same_thread=False"
# NOTE: test.db file created in project root during tests. Clean up with Remove-Item test.db*

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import after setting DATABASE_URL so database.py uses SQLite
from backend.database import Base, get_db, engine as app_engine
from backend.main import app
from backend.core.security import hash_password, create_access_token
from backend import models


# SQLite in-memory engine for test sessions
TEST_ENGINE = app_engine  # Use same engine as the app
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def override_get_db():
    """Fixture dependency override for FastAPI."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables before each test, drop after."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture
def db():
    """Get a fresh DB session per test."""
    db = TestingSessionLocal()
    yield db
    db.close()


@pytest.fixture
def client():
    """FastAPI TestClient with overridden DB dependency."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db):
    """Create and return an admin user."""
    user = models.Usuario(
        username="admin",
        hashed_password=hash_password("admin123"),
        rol="admin",
        activo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def secretaria_user(db):
    """Create and return a secretaria user."""
    user = models.Usuario(
        username="secretaria",
        hashed_password=hash_password("secret123"),
        rol="secretaria",
        activo=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    """JWT token for admin user."""
    return create_access_token(
        data={"sub": admin_user.username, "rol": admin_user.rol},
    )


@pytest.fixture
def secretaria_token(secretaria_user):
    """JWT token for secretaria user."""
    return create_access_token(
        data={"sub": secretaria_user.username, "rol": secretaria_user.rol},
    )


@pytest.fixture
def headers_admin(admin_token):
    """Auth headers for admin."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def headers_secretaria(secretaria_token):
    """Auth headers for secretaria."""
    return {"Authorization": f"Bearer {secretaria_token}"}


@pytest.fixture
def sample_doctor(db):
    """Create a sample doctor."""
    doctor = models.Doctor(nombre="Dr. Perez", color_agenda="#009BFF", activo=True)
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@pytest.fixture
def sample_paciente(db):
    """Create a sample patient."""
    pac = models.Paciente(
        dni="12345678",
        nombre="Juan",
        apellido="Perez",
        telefono="1111111111",
        obra_social="Particular",
    )
    db.add(pac)
    db.commit()
    db.refresh(pac)
    return pac
