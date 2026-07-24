"""Integration tests for C-22: busqueda-pacientes."""
import pytest
from backend import models


@pytest.fixture
def sample_pacientes_busqueda(db):
    """Crea un grupo de pacientes con acentos y variaciones para probar la búsqueda."""
    p1 = models.Paciente(
        dni="11122333",
        nombre="María",
        apellido="Pérez",
        telefono="11111111",
        obra_social="OSDE",
    )
    p2 = models.Paciente(
        dni="22233444",
        nombre="Martín",
        apellido="Gómez",
        telefono="22222222",
        obra_social="Swiss Medical",
    )
    p3 = models.Paciente(
        dni="33344555",
        nombre="Gonzalo",
        apellido="Fernández",
        telefono="33333333",
        obra_social="Galeno",
    )
    p4 = models.Paciente(
        dni="44455666",
        nombre="Ana María",
        apellido="López",
        telefono="44444444",
        obra_social="Particular",
    )
    db.add_all([p1, p2, p3, p4])
    db.commit()
    return [p1, p2, p3, p4]


class TestBusquedaPacientes:
    """GET /api/pacientes/?buscar=..."""

    def test_busqueda_sin_parametro_devuelve_todos(self, client, headers_secretaria, sample_pacientes_busqueda):
        """Sin parámetro 'buscar', devuelve la lista completa sin límites por defecto."""
        resp = client.get("/api/pacientes/", headers=headers_secretaria)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 4

    def test_busqueda_nombre_parcial_case_and_accent_insensitive(
        self, client, headers_secretaria, sample_pacientes_busqueda
    ):
        """Coincidencia parcial en nombre insensible a mayúsculas y acentos."""
        # Buscar 'mar' en minúsculas y sin acento -> debe matchear María, Martín y Ana María
        resp = client.get("/api/pacientes/?buscar=mar", headers=headers_secretaria)
        assert resp.status_code == 200
        dnis = [p["dni"] for p in resp.json()]
        assert "11122333" in dnis  # María
        assert "22233444" in dnis  # Martín
        assert "44455666" in dnis  # Ana María
        assert "33344555" not in dnis  # Gonzalo

        # Buscar 'MARÍA' con mayúscula y acento -> debe matchear María y Ana María
        resp2 = client.get("/api/pacientes/?buscar=MARÍA", headers=headers_secretaria)
        assert resp2.status_code == 200
        dnis2 = [p["dni"] for p in resp2.json()]
        assert "11122333" in dnis2
        assert "44455666" in dnis2
        assert "22233444" not in dnis2

    def test_busqueda_apellido_parcial_accent_insensitive(
        self, client, headers_secretaria, sample_pacientes_busqueda
    ):
        """Coincidencia parcial en apellido insensible a acentos y mayúsculas."""
        # Buscar 'perez' sin acento
        resp = client.get("/api/pacientes/?buscar=perez", headers=headers_secretaria)
        assert resp.status_code == 200
        dnis = [p["dni"] for p in resp.json()]
        assert len(dnis) == 1
        assert dnis[0] == "11122333"  # Pérez

        # Buscar 'FERNANDEZ' sin acento y en mayúsculas
        resp2 = client.get("/api/pacientes/?buscar=FERNANDEZ", headers=headers_secretaria)
        assert resp2.status_code == 200
        dnis2 = [p["dni"] for p in resp2.json()]
        assert len(dnis2) == 1
        assert dnis2[0] == "33344555"  # Fernández

    def test_busqueda_dni_parcial(self, client, headers_admin, sample_pacientes_busqueda):
        """Coincidencia parcial en DNI."""
        resp = client.get("/api/pacientes/?buscar=2233", headers=headers_admin)
        assert resp.status_code == 200
        dnis = [p["dni"] for p in resp.json()]
        assert "11122333" in dnis
        assert "22233444" in dnis
        assert len(dnis) == 2

    def test_busqueda_sin_resultados(self, client, headers_secretaria, sample_pacientes_busqueda):
        """Búsqueda sin coincidencias devuelve lista vacía []."""
        resp = client.get("/api/pacientes/?buscar=xyznoexiste99", headers=headers_secretaria)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_limite_resultados_custom(self, client, headers_secretaria, db):
        """Respeta el parámetro limit cuando se pasa una búsqueda."""
        # Crear 5 pacientes 'Ana 1', 'Ana 2', ...
        for i in range(1, 6):
            db.add(
                models.Paciente(
                    dni=f"9000000{i}",
                    nombre=f"Ana {i}",
                    apellido="Test",
                    telefono="1234",
                )
            )
        db.commit()

        # Con limit=3 debe devolver exactamente 3
        resp = client.get("/api/pacientes/?buscar=Ana&limit=3", headers=headers_secretaria)
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    def test_requiere_autenticacion(self, client):
        """Solicitudes sin token JWT deben responder 401 Unauthorized."""
        resp = client.get("/api/pacientes/?buscar=perez")
        assert resp.status_code == 401
