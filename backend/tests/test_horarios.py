"""
Integration tests for C-12 correccion-horarios-doctores-pagos.
Uses SQLite in-memory database (real DB, no mocks).
"""
from datetime import datetime, date, time

import pytest
from fastapi.testclient import TestClient

from backend.core.horarios import (
    es_dia_laboral,
    es_hora_valida,
    validar_granularidad,
    generar_slots,
    obtener_horarios_publicos,
)


# =============================================================================
# A. core/horarios.py — Unit tests (no DB needed)
# =============================================================================

class TestHorariosUnit:
    """Tests for centralized schedule module (no DB)."""

    def test_dias_laborales(self):
        """lun/mar/mie/vie/sab son laborales; jue/dom no."""
        assert es_dia_laboral(date(2026, 7, 6)) is True   # lunes
        assert es_dia_laboral(date(2026, 7, 7)) is True   # martes
        assert es_dia_laboral(date(2026, 7, 8)) is True   # miercoles
        assert es_dia_laboral(date(2026, 7, 9)) is False  # jueves
        assert es_dia_laboral(date(2026, 7, 10)) is True  # viernes
        assert es_dia_laboral(date(2026, 7, 11)) is True  # sabado
        assert es_dia_laboral(date(2026, 7, 12)) is False # domingo

    def test_slots_lunes(self):
        """lunes genera 8 manana + 8 tarde = 16 slots"""
        slots = generar_slots(date(2026, 7, 6))
        assert len(slots) == 16, f"Expected 16, got {len(slots)}"
        assert slots[0] == time(9, 0)
        assert slots[-1] == time(19, 30)

    def test_slots_sabado(self):
        """sabado genera 8 slots manana (09:00-12:30), 0 tarde"""
        slots = generar_slots(date(2026, 7, 11))
        assert len(slots) == 8, f"Expected 8, got {len(slots)}"
        assert slots[0] == time(9, 0)
        assert slots[-1] == time(12, 30)

    def test_slots_jueves(self):
        """jueves genera 0 slots"""
        assert len(generar_slots(date(2026, 7, 9))) == 0

    def test_slots_domingo(self):
        """domingo genera 0 slots"""
        assert len(generar_slots(date(2026, 7, 12))) == 0

    def test_slot_1230_valido(self):
        """12:30 + 30min <= 13:00 -> valido"""
        assert es_hora_valida(datetime(2026, 7, 6, 12, 30), 30) is True

    def test_slot_1300_invalido(self):
        """13:00 + 30min > 13:00 -> invalido"""
        assert es_hora_valida(datetime(2026, 7, 6, 13, 0), 30) is False

    def test_slot_1930_valido(self):
        """19:30 + 30min = 20:00 -> valido"""
        assert es_hora_valida(datetime(2026, 7, 6, 19, 30), 30) is True

    def test_slot_2000_invalido(self):
        """20:00 + 30min > 20:00 -> invalido"""
        assert es_hora_valida(datetime(2026, 7, 6, 20, 0), 30) is False

    def test_granularidad_0915(self):
        """09:15 -> invalido"""
        assert es_hora_valida(datetime(2026, 7, 6, 9, 15), 30) is False

    def test_granularidad_0930(self):
        """09:30 -> valido"""
        assert es_hora_valida(datetime(2026, 7, 6, 9, 30), 30) is True

    def test_sabado_1230_valido(self):
        """sab 12:30 + 30min = 13:00 -> valido"""
        assert es_hora_valida(datetime(2026, 7, 11, 12, 30), 30) is True

    def test_sabado_1300_invalido(self):
        """sab 13:00 + 30min > 13:00 -> invalido"""
        assert es_hora_valida(datetime(2026, 7, 11, 13, 0), 30) is False

    def test_config_horarios_publicos(self):
        """obtener_horarios_publicos returns correct structure."""
        h = obtener_horarios_publicos()
        assert h["granularidad_minutos"] == 30
        assert h["zona_horaria"] == "America/Argentina/Buenos_Aires"
        assert len(h["dias"]) == 7


# =============================================================================
# B. Slots bloqueados — Integration tests
# =============================================================================

class TestSlotsBloqueados:
    """Integration tests for manual slot blocking."""

    def test_bloquear_slot(self, client, headers_admin, sample_doctor):
        """POST /turnos/slots/bloquear -> 201"""
        resp = client.post(
            "/turnos/slots/bloquear",
            json={"fecha": "2026-07-06", "hora": "10:00", "id_doctor": sample_doctor.id, "motivo": "Prueba"},
            headers=headers_admin,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["fecha"] == "2026-07-06"
        assert data["hora"] == "10:00:00"
        assert data["motivo"] == "Prueba"

    def test_bloquear_duplicado(self, client, headers_admin, sample_doctor):
        """Bloquear mismo slot dos veces -> 409"""
        payload = {"fecha": "2026-07-06", "hora": "10:00", "id_doctor": sample_doctor.id}
        client.post("/turnos/slots/bloquear", json=payload, headers=headers_admin)
        resp = client.post("/turnos/slots/bloquear", json=payload, headers=headers_admin)
        assert resp.status_code == 409

    def test_desbloquear_slot(self, client, headers_admin, sample_doctor):
        """DELETE /turnos/slots/{id}/desbloquear -> 200"""
        create = client.post(
            "/turnos/slots/bloquear",
            json={"fecha": "2026-07-06", "hora": "10:00", "id_doctor": sample_doctor.id},
            headers=headers_admin,
        )
        slot_id = create.json()["id"]
        resp = client.delete(f"/turnos/slots/{slot_id}/desbloquear", headers=headers_admin)
        assert resp.status_code == 200
        assert resp.json()["mensaje"] == "Slot desbloqueado correctamente"

    def test_desbloquear_inexistente(self, client, headers_admin):
        """DELETE sobre ID inexistente -> 404"""
        resp = client.delete("/turnos/slots/9999/desbloquear", headers=headers_admin)
        assert resp.status_code == 404

    def test_slots_endpoint_muestra_bloqueado(self, client, headers_admin, sample_doctor):
        """GET /turnos/slots incluye estado bloqueado con slot_bloqueado_id"""
        create = client.post(
            "/turnos/slots/bloquear",
            json={"fecha": "2026-07-06", "hora": "10:00", "id_doctor": sample_doctor.id},
            headers=headers_admin,
        )
        bloqueado_id = create.json()["id"]
        resp = client.get(
            f"/turnos/slots?fecha=2026-07-06&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert resp.status_code == 200
        bloqueados = [s for s in resp.json() if s["estado"] == "bloqueado"]
        assert len(bloqueados) == 1
        assert bloqueados[0]["hora"] == "10:00"
        assert bloqueados[0]["slot_bloqueado_id"] == bloqueado_id

    def test_slots_endpoint_muestra_libre(self, client, headers_admin, sample_doctor):
        """GET /turnos/slots muestra slots libres."""
        resp = client.get(
            f"/turnos/slots?fecha=2026-07-06&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert resp.status_code == 200
        libres = [s for s in resp.json() if s["estado"] == "libre"]
        assert len(libres) == 16  # lunes completo sin turnos ni bloqueos

    def test_bloquear_fuera_horario(self, client, headers_admin, sample_doctor):
        """Bloquear slot en horario de siesta -> 400"""
        resp = client.post(
            "/turnos/slots/bloquear",
            json={"fecha": "2026-07-06", "hora": "14:00", "id_doctor": sample_doctor.id},
            headers=headers_admin,
        )
        assert resp.status_code == 400

    def test_bloquear_jueves(self, client, headers_admin, sample_doctor):
        """Bloquear slot jueves -> 400"""
        resp = client.post(
            "/turnos/slots/bloquear",
            json={"fecha": "2026-07-09", "hora": "10:00", "id_doctor": sample_doctor.id},
            headers=headers_admin,
        )
        assert resp.status_code == 400


# =============================================================================
# C. Doctores — Role restrictions
# =============================================================================

class TestDoctoresRoles:
    """Admin-only restrictions on doctor CRUD."""

    def test_admin_crear_doctor(self, client, headers_admin):
        """POST /doctores con admin -> 201"""
        resp = client.post("/doctores/", json={"nombre": "Dr. Test", "color_agenda": "#FF0000"}, headers=headers_admin)
        assert resp.status_code == 201

    def test_secretaria_no_puede_crear_doctor(self, client, headers_secretaria):
        """POST /doctores con secretaria -> 403"""
        resp = client.post("/doctores/", json={"nombre": "Dr. Test"}, headers=headers_secretaria)
        assert resp.status_code == 403

    def test_secretaria_puede_listar_doctores(self, client, headers_secretaria, sample_doctor):
        """GET /doctores con secretaria -> 200"""
        resp = client.get("/doctores/", headers=headers_secretaria)
        assert resp.status_code == 200

    def test_secretaria_no_puede_editar(self, client, headers_secretaria, sample_doctor):
        """PUT /doctores/{id} con secretaria -> 403"""
        resp = client.put(f"/doctores/{sample_doctor.id}", json={"nombre": "Nuevo"}, headers=headers_secretaria)
        assert resp.status_code == 403

    def test_secretaria_no_puede_eliminar(self, client, headers_secretaria, sample_doctor):
        """DELETE /doctores/{id} con secretaria -> 403"""
        resp = client.delete(f"/doctores/{sample_doctor.id}", headers=headers_secretaria)
        assert resp.status_code == 403

    def test_color_hex_invalido(self, client, headers_admin):
        """POST con color='rojo' -> 422"""
        resp = client.post("/doctores/", json={"nombre": "Dr. Test", "color_agenda": "rojo"}, headers=headers_admin)
        assert resp.status_code == 422

    def test_color_hex_valido(self, client, headers_admin):
        """POST con color='#FF0000' -> 201"""
        resp = client.post("/doctores/", json={"nombre": "Dr. Test", "color_agenda": "#FF0000"}, headers=headers_admin)
        assert resp.status_code == 201


# =============================================================================
# D. Constancia de pago
# =============================================================================

class TestConstanciaPago:
    """Tests for constancia_turno in payment responses."""

    def test_constancia_con_turno(self, client, headers_secretaria, sample_doctor, sample_paciente):
        """Pago con turno -> constancia_turno formato 'DD/MM - Apellido (HH:MM)'."""
        # Crear turno
        turno_resp = client.post(
            "/turnos/",
            json={
                "fecha_hora": "2026-07-06T16:00:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert turno_resp.status_code == 201
        turno_id = turno_resp.json()["id"]

        # Cerrar turno con pago
        cerrar = client.put(
            f"/turnos/{turno_id}/cerrar",
            json={
                "tratamientos": [{"nombre": "Consulta", "cantidad": 1, "precio_ars": 5000, "precio_usd": 0}],
                "pagos": [{"monto": 5000, "moneda": "ARS", "metodo_pago": "efectivo"}],
            },
            headers=headers_secretaria,
        )
        assert cerrar.status_code == 200

        # Verificar constancia en GET /finanzas/pagos
        pagos = client.get("/finanzas/pagos", headers=headers_secretaria)
        assert pagos.status_code == 200
        pago = next((p for p in pagos.json() if p.get("id_turno") == turno_id), None)
        assert pago is not None, "Pago should be linked to turno"
        assert pago.get("constancia_turno") is not None
        assert "Perez" in pago["constancia_turno"]
        assert "16:00" in pago["constancia_turno"]

    def test_constancia_sin_turno(self, client, headers_secretaria, sample_paciente):
        """Pago sin id_turno -> constancia_turno is None."""
        resp = client.post(
            "/finanzas/pagos",
            json={
                "monto": 10000,
                "moneda": "ARS",
                "metodo_pago": "efectivo",
                "dni_paciente": sample_paciente.dni,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 201
        assert resp.json().get("constancia_turno") is None


# =============================================================================
# E. Validacion de turnos
# =============================================================================

class TestTurnosCreacion:
    """Tests for enhanced turno creation validation."""

    def test_crear_turno_valido_lunes_1030(self, client, headers_secretaria, sample_doctor, sample_paciente):
        """Crear turno lunes 10:30 -> 201"""
        resp = client.post(
            "/turnos/",
            json={
                "fecha_hora": "2026-07-06T10:30:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 201

    def test_crear_turno_fuera_horario(self, client, headers_secretaria, sample_doctor, sample_paciente):
        """Crear turno 13:30 (siesta) -> 400"""
        resp = client.post(
            "/turnos/",
            json={
                "fecha_hora": "2026-07-06T13:30:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 400

    def test_crear_turno_jueves(self, client, headers_secretaria, sample_doctor, sample_paciente):
        """Crear turno jueves -> 400"""
        resp = client.post(
            "/turnos/",
            json={
                "fecha_hora": "2026-07-09T10:00:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 400

    def test_crear_turno_sabado_tarde(self, client, headers_secretaria, sample_doctor, sample_paciente):
        """Crear turno sabado 16:00 -> 400 (solo manana)"""
        resp = client.post(
            "/turnos/",
            json={
                "fecha_hora": "2026-07-11T16:00:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 400
