"""Integration tests for C-18: ajustes-integracion-frontend2."""
import pytest
from backend import models
from backend.core.security import verify_password


class TestReactivarDoctor:
    """PATCH /api/doctores/{id}/activo"""

    def test_reactivar_doctor_recupera_horario(self, client, headers_admin, db):
        """Doctor reactivado recupera horarios intactos (C-16)."""
        resp = client.post("/api/doctores/", json={"nombre": "Dr. Test", "color_agenda": "#FF0000"}, headers=headers_admin)
        assert resp.status_code == 201
        doctor_id = resp.json()["id"]

        horarios_before = client.get(f"/api/doctores/{doctor_id}/horarios", headers=headers_admin)
        assert horarios_before.status_code == 200

        resp = client.patch(f"/api/doctores/{doctor_id}/activo", json={"activo": False}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["activo"] is False

        resp = client.patch(f"/api/doctores/{doctor_id}/activo", json={"activo": True}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["activo"] is True

        horarios_after = client.get(f"/api/doctores/{doctor_id}/horarios", headers=headers_admin)
        assert horarios_after.status_code == 200
        assert horarios_after.json() == horarios_before.json()

    def test_doctor_inexistente_404(self, client, headers_admin):
        resp = client.patch("/api/doctores/99999/activo", json={"activo": True}, headers=headers_admin)
        assert resp.status_code == 404


class TestReactivarTratamiento:
    """PATCH /api/catalogo/tratamientos/{id}/activo"""

    def test_reactivar_tratamiento(self, client, headers_secretaria):
        resp = client.post("/api/catalogo/tratamientos", json={
            "nombre": "Test Tratamiento", "precio_ars": 1000
        }, headers=headers_secretaria)
        assert resp.status_code == 201
        t_id = resp.json()["id"]

        resp = client.delete(f"/api/catalogo/tratamientos/{t_id}", headers=headers_secretaria)
        assert resp.status_code == 200

        resp = client.patch(f"/api/catalogo/tratamientos/{t_id}/activo", json={"activo": True}, headers=headers_secretaria)
        assert resp.status_code == 200
        assert resp.json()["activo"] is True

        lista = client.get("/api/catalogo/tratamientos", headers=headers_secretaria)
        assert any(t["id"] == t_id and t["activo"] is True for t in lista.json())

    def test_tratamiento_inexistente_404(self, client, headers_secretaria):
        resp = client.patch("/api/catalogo/tratamientos/99999/activo", json={"activo": True}, headers=headers_secretaria)
        assert resp.status_code == 404


class TestReactivarObraSocial:
    """PATCH /api/catalogo/obras-sociales/{id}/activo"""

    def test_reactivar_obra_social(self, client, headers_secretaria):
        resp = client.post("/api/catalogo/obras-sociales", json={"nombre": "Test OS"}, headers=headers_secretaria)
        assert resp.status_code == 201
        os_id = resp.json()["id"]

        resp = client.delete(f"/api/catalogo/obras-sociales/{os_id}", headers=headers_secretaria)
        assert resp.status_code == 200

        resp = client.patch(f"/api/catalogo/obras-sociales/{os_id}/activo", json={"activo": True}, headers=headers_secretaria)
        assert resp.status_code == 200
        assert resp.json()["activo"] is True


class TestReactivarUsuario:
    """PATCH /api/admin/usuarios/{id}/activo"""

    def test_reactivar_usuario_acceso_inmediato(self, client, headers_admin, db):
        """Usuario reactivado puede loguearse con misma password."""
        resp = client.post("/api/admin/usuarios", json={
            "username": "testsecretaria",
            "password": "test123",
            "rol": "secretaria"
        }, headers=headers_admin)
        assert resp.status_code == 201
        user_id = resp.json()["id"]

        resp = client.patch(f"/api/admin/usuarios/{user_id}/activo", json={"activo": False}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["activo"] is False

        resp = client.post("/api/auth/login", json={"username": "testsecretaria", "password": "test123"})
        assert resp.status_code == 401

        resp = client.patch(f"/api/admin/usuarios/{user_id}/activo", json={"activo": True}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["activo"] is True

        resp = client.post("/api/auth/login", json={"username": "testsecretaria", "password": "test123"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_admin_no_se_desactiva(self, client, headers_admin, db):
        """Admin user can never be deactivated (PATCH)."""
        resp = client.get("/api/admin/usuarios", headers=headers_admin)
        admins = [u for u in resp.json() if u["rol"] == "admin"]
        assert len(admins) > 0
        admin_id = admins[0]["id"]

        resp = client.patch(f"/api/admin/usuarios/{admin_id}/activo", json={"activo": False}, headers=headers_admin)
        assert resp.status_code == 400
        assert "admin" in resp.json()["detail"].lower()

    def test_toggle_activo_admin_noop(self, client, headers_admin, db):
        """toggle-activo on admin should no-op (not deactivate)."""
        resp = client.get("/api/admin/usuarios", headers=headers_admin)
        admins = [u for u in resp.json() if u["rol"] == "admin"]
        admin_id = admins[0]["id"]

        resp = client.put(f"/api/admin/usuarios/{admin_id}/toggle-activo", headers=headers_admin)
        assert resp.status_code == 400

    def test_usuario_inexistente_404(self, client, headers_admin):
        resp = client.patch("/api/admin/usuarios/99999/activo", json={"activo": True}, headers=headers_admin)
        assert resp.status_code == 404


class TestGeneroPaciente:
    """Campo genero en pacientes"""

    def test_genero_acepta_valores_validos(self, client, headers_admin, sample_paciente):
        resp = client.put(f"/api/pacientes/{sample_paciente.dni}", json={"genero": "Femenino"}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["genero"] == "Femenino"

        resp = client.put(f"/api/pacientes/{sample_paciente.dni}", json={"genero": "Masculino"}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["genero"] == "Masculino"

        resp = client.put(f"/api/pacientes/{sample_paciente.dni}", json={"genero": "Otro"}, headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["genero"] == "Otro"

    def test_genero_rechaza_valor_invalido(self, client, headers_admin, sample_paciente):
        resp = client.put(f"/api/pacientes/{sample_paciente.dni}", json={"genero": "NoBinario"}, headers=headers_admin)
        assert resp.status_code == 422

    def test_genero_null_sin_backfill(self, client, headers_admin, sample_paciente, db):
        """Existing patient without genero should have null (not forced)."""
        resp = client.get(f"/api/pacientes/{sample_paciente.dni}", headers=headers_admin)
        assert "genero" in resp.json()

    def test_genero_en_creacion(self, client, headers_admin):
        resp = client.post("/api/pacientes/", json={
            "dni": "99999999",
            "nombre": "Nuevo",
            "apellido": "Paciente",
            "genero": "Masculino"
        }, headers=headers_admin)
        assert resp.status_code == 201
        assert resp.json()["genero"] == "Masculino"


class TestAlertasEnFicha:
    """GET /api/pacientes/{dni} incluye alertas activas"""

    def test_ficha_incluye_alertas_activas(self, client, headers_admin, sample_paciente, db):
        resp = client.post(f"/api/pacientes/{sample_paciente.dni}/alertas", json={
            "tipo": "alergia",
            "descripcion": "Penicilina"
        }, headers=headers_admin)
        assert resp.status_code == 201

        resp = client.get(f"/api/pacientes/{sample_paciente.dni}", headers=headers_admin)
        assert resp.status_code == 200
        data = resp.json()
        assert "alertas" in data
        assert len(data["alertas"]) >= 1
        assert any(a["descripcion"] == "Penicilina" for a in data["alertas"])

    def test_ficha_excluye_alertas_eliminadas(self, client, headers_admin, sample_paciente, db):
        resp = client.post(f"/api/pacientes/{sample_paciente.dni}/alertas", json={
            "tipo": "condicion",
            "descripcion": "Diabetes"
        }, headers=headers_admin)
        assert resp.status_code == 201
        alerta_id = resp.json()["id"]

        client.delete(f"/api/pacientes/{sample_paciente.dni}/alertas/{alerta_id}", headers=headers_admin)

        resp = client.get(f"/api/pacientes/{sample_paciente.dni}", headers=headers_admin)
        alertas = resp.json().get("alertas", [])
        assert not any(a["id"] == alerta_id for a in alertas)


class TestApiPrefix:
    """Prefijo /api global"""

    def test_rutas_con_api_responden(self, client, headers_admin):
        resp = client.get("/api/pacientes/", headers=headers_admin)
        assert resp.status_code in (200, 401)

    def test_health_sin_prefijo(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_rutas_viejas_sin_api_404(self, client, headers_admin):
        resp = client.get("/pacientes/", headers=headers_admin)
        assert resp.status_code == 404
