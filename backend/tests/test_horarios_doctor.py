"""
Integration tests for C-16 horarios-individuales-por-doctor.
Uses SQLite file-based database (real DB, no mocks).
"""
from datetime import date, datetime

import pytest

from backend.crud.horarios_doctor import (
    seed_horarios_doctor,
    obtener_horario_semanal,
    guardar_horario_semanal,
    agregar_dia_no_laborable,
    listar_dias_no_laborables,
    eliminar_dia_no_laborable,
    es_dia_no_laborable,
)
from backend.core.horarios import HORARIOS_DEFAULT


# =============================================================================
# A. Model CRUD — Direct DB tests (no HTTP)
# =============================================================================

class TestHorariosDoctorModel:
    """Tests for HorarioDoctor CRUD functions (db fixture, not client)."""

    def test_seed_horarios(self, db, sample_doctor):
        """seed_horarios_doctor creates 7 rows for the doctor."""
        seed_horarios_doctor(db, sample_doctor.id)
        rows = obtener_horario_semanal(db, sample_doctor.id)
        assert len(rows) == 7
        assert all(r.id_doctor == sample_doctor.id for r in rows)
        assert [r.dia_semana for r in rows] == [0, 1, 2, 3, 4, 5, 6]

    def test_seed_idempotent(self, db, sample_doctor):
        """Calling seed_horarios_doctor twice does not duplicate rows."""
        seed_horarios_doctor(db, sample_doctor.id)
        seed_horarios_doctor(db, sample_doctor.id)
        rows = obtener_horario_semanal(db, sample_doctor.id)
        assert len(rows) == 7

    def test_obtener_horario_semanal(self, db, sample_doctor):
        """Returns correct 7 rows ordered by dia_semana."""
        seed_horarios_doctor(db, sample_doctor.id)
        rows = obtener_horario_semanal(db, sample_doctor.id)
        assert len(rows) == 7
        for i, r in enumerate(rows):
            assert r.dia_semana == i

    def test_guardar_horario_semanal(self, db, sample_doctor):
        """Replacing the weekly pattern works."""
        seed_horarios_doctor(db, sample_doctor.id)
        dias_data = {
            "lunes": {"manana": ["08:00", "12:00"], "tarde": ["14:00", "18:00"]},
            "martes": None,
            "miercoles": {"manana": ["09:00", "13:00"]},
            "jueves": None,
            "viernes": None,
            "sabado": None,
            "domingo": None,
        }
        rows = guardar_horario_semanal(db, sample_doctor.id, dias_data)
        day_map = {r.dia_semana: r for r in rows}
        assert 0 in day_map  # lunes
        assert day_map[0].manana_inicio.hour == 8
        assert day_map[0].manana_fin.hour == 12
        assert day_map[0].tarde_inicio.hour == 14
        assert day_map[0].tarde_fin.hour == 18
        assert 1 not in day_map  # martes was None → no row
        assert 2 in day_map  # miercoles
        assert day_map[2].manana_inicio.hour == 9
        assert day_map[2].manana_fin.hour == 13
        assert day_map[2].tarde_inicio is None

    def test_dia_no_laborable_crud(self, db, sample_doctor):
        """Add / list / delete cycle for non-working days."""
        desde = date(2026, 7, 1)
        hasta = date(2026, 7, 31)

        entry = agregar_dia_no_laborable(db, sample_doctor.id, date(2026, 7, 6), motivo="Feriado")
        assert entry.fecha == date(2026, 7, 6)
        assert entry.motivo == "Feriado"

        lista = listar_dias_no_laborables(db, sample_doctor.id, desde, hasta)
        assert len(lista) == 1
        assert lista[0].fecha == date(2026, 7, 6)

        ok = eliminar_dia_no_laborable(db, sample_doctor.id, date(2026, 7, 6))
        assert ok is True

        lista = listar_dias_no_laborables(db, sample_doctor.id, desde, hasta)
        assert len(lista) == 0


# =============================================================================
# B. Horarios API — GET / PUT /doctores/{id}/horarios
# =============================================================================

class TestHorariosDoctorAPI:
    """Integration tests for doctor schedule API endpoints."""

    def test_get_horarios_doctor(self, client, headers_admin, sample_doctor):
        """GET /doctores/{id}/horarios returns 7 days with correct structure."""
        resp = client.get(f"/api/doctores/{sample_doctor.id}/horarios", headers=headers_admin)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id_doctor"] == sample_doctor.id
        assert data["nombre_doctor"] == "Dr. Perez"
        assert data["granularidad_minutos"] == 30
        dias = data["dias"]
        assert len(dias) == 7
        assert dias["lunes"]["manana"] == ["09:00", "13:00"]
        assert dias["lunes"]["tarde"] == ["16:00", "20:00"]
        assert dias["jueves"] is None
        assert dias["domingo"] is None

    def test_put_horarios_doctor(self, client, headers_admin, sample_doctor):
        """PUT updates the pattern, GET shows the new pattern."""
        payload = {
            "dias": {
                "lunes": {"manana": ["08:00", "12:00"], "tarde": ["14:00", "18:00"]},
                "martes": None,
                "miercoles": {"manana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
                "jueves": None,
                "viernes": None,
                "sabado": None,
                "domingo": None,
            }
        }
        put_resp = client.put(
            f"/api/doctores/{sample_doctor.id}/horarios",
            json=payload,
            headers=headers_admin,
        )
        assert put_resp.status_code == 200
        dias_resp = put_resp.json()["dias"]
        assert dias_resp["lunes"]["manana"] == ["08:00", "12:00"]
        assert dias_resp["lunes"]["tarde"] == ["14:00", "18:00"]
        assert dias_resp["martes"] is None
        assert dias_resp["miercoles"]["manana"] == ["09:00", "13:00"]

        get_resp = client.get(f"/api/doctores/{sample_doctor.id}/horarios", headers=headers_admin)
        assert get_resp.json()["dias"]["lunes"]["manana"] == ["08:00", "12:00"]

    def test_put_horarios_doctor_partial(self, client, headers_admin, sample_doctor):
        """Doctor with only morning hours, no afternoon blocks."""
        payload = {
            "dias": {
                "lunes": {"manana": ["09:00", "13:00"]},
                "martes": {"manana": ["09:00", "13:00"]},
                "miercoles": {"manana": ["09:00", "13:00"]},
                "jueves": None,
                "viernes": {"manana": ["09:00", "13:00"]},
                "sabado": {"manana": ["09:00", "13:00"]},
                "domingo": None,
            }
        }
        resp = client.put(
            f"/api/doctores/{sample_doctor.id}/horarios",
            json=payload,
            headers=headers_admin,
        )
        assert resp.status_code == 200
        dias = resp.json()["dias"]
        assert dias["lunes"]["manana"] == ["09:00", "13:00"]
        assert dias["lunes"].get("tarde") is None
        assert dias["jueves"] is None
        assert dias["domingo"] is None


# =============================================================================
# F. Regresión — Permisos secretaria (C-19)
# =============================================================================

class TestPermisosSecretaria:
    """Regression tests for secretaria permissions expanded in C-19."""

    def test_put_tratamiento_catalogo_secretaria_allowed(self, client, headers_secretaria):
        """Secretaria can PUT /catalogo/tratamientos/{id} (already allowed since C-18)."""
        resp = client.post("/api/catalogo/tratamientos", json={
            "nombre": "Test Precio",
            "categoria": "Test",
            "precio_ars": 5000,
            "precio_usd": 10,
        }, headers=headers_secretaria)
        assert resp.status_code == 201
        t_id = resp.json()["id"]

        resp = client.put(f"/api/catalogo/tratamientos/{t_id}", json={
            "nombre": "Test Precio",
            "precio_ars": 6000,
            "precio_usd": 12,
        }, headers=headers_secretaria)
        assert resp.status_code == 200
        # Decimal fields serialize as strings ("6000.00")
        assert resp.json()["precio_ars"] == "6000.00"
        assert resp.json()["precio_usd"] == "12.00"

    def test_put_horarios_doctor_secretaria_allowed(self, client, headers_secretaria, sample_doctor):
        """Secretaria can now PUT doctor schedule (200)."""
        payload = {
            "dias": {
                "lunes": {"manana": ["08:00", "12:00"], "tarde": ["14:00", "18:00"]},
                "martes": None,
                "miercoles": {"manana": ["09:00", "13:00"]},
                "jueves": None,
                "viernes": None,
                "sabado": None,
                "domingo": None,
            }
        }
        resp = client.put(
            f"/api/doctores/{sample_doctor.id}/horarios",
            json=payload,
            headers=headers_secretaria,
        )
        assert resp.status_code == 200
        dias = resp.json()["dias"]
        assert dias["lunes"]["manana"] == ["08:00", "12:00"]
        assert dias["lunes"]["tarde"] == ["14:00", "18:00"]
        assert dias["martes"] is None

    def test_get_horarios_doctor_secretaria_allowed(self, client, headers_secretaria, sample_doctor):
        """Secretaria can GET doctor schedule."""
        resp = client.get(f"/api/doctores/{sample_doctor.id}/horarios", headers=headers_secretaria)
        assert resp.status_code == 200
        assert "dias" in resp.json()

    def test_put_doctor_ficha_secretaria_forbidden(self, client, headers_secretaria, sample_doctor):
        """Secretaria gets 403 on PUT /doctores/{id} (full ficha: nombre, matricula, especialidad, color_agenda)."""
        resp = client.put(
            f"/api/doctores/{sample_doctor.id}",
            json={
                "nombre": "Dr. Modificado",
                "matricula": "ABC-123",
                "especialidad": "Odontología General",
                "color_agenda": "#FF0000",
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 403


# =============================================================================
# C. Días No Laborables API
# =============================================================================

class TestDiasNoLaborablesAPI:
    """Integration tests for non-working day endpoints."""

    def test_create_dia_no_laborable(self, client, headers_admin, sample_doctor):
        """POST /doctores/{id}/dias-no-laborables returns 201 with correct data."""
        resp = client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_admin,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["fecha"] == "2026-07-06"
        assert data["motivo"] == "Feriado"
        assert "id" in data

    def test_create_duplicate(self, client, headers_admin, sample_doctor):
        """POST same fecha + doctor returns 409."""
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_admin,
        )
        resp = client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Otro"},
            headers=headers_admin,
        )
        assert resp.status_code == 409

    def test_list_dias_no_laborables(self, client, headers_admin, sample_doctor):
        """GET with date range returns correct list."""
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_admin,
        )
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-15", "motivo": "Vacaciones"},
            headers=headers_admin,
        )
        resp = client.get(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables?desde=2026-07-01&hasta=2026-07-31",
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert data[0]["fecha"] == "2026-07-06"
        assert data[1]["fecha"] == "2026-07-15"

    def test_delete_dia_no_laborable(self, client, headers_admin, sample_doctor):
        """DELETE removes the entry, subsequent GET returns empty."""
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06"},
            headers=headers_admin,
        )
        del_resp = client.delete(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables/2026-07-06",
            headers=headers_admin,
        )
        assert del_resp.status_code == 200
        assert "mensaje" in del_resp.json()

        list_resp = client.get(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables?desde=2026-07-01&hasta=2026-07-31",
            headers=headers_admin,
        )
        assert list_resp.json() == []

    def test_delete_not_found(self, client, headers_admin, sample_doctor):
        """DELETE on non-existent date returns 404."""
        resp = client.delete(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables/2026-07-06",
            headers=headers_admin,
        )
        assert resp.status_code == 404

    def test_create_dia_no_laborable_secretaria_allowed(self, client, headers_secretaria, sample_doctor):
        """Secretaria can now POST dias-no-laborables (201)."""
        resp = client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_secretaria,
        )
        assert resp.status_code == 201
        assert resp.json()["fecha"] == "2026-07-06"

    def test_delete_dia_no_laborable_secretaria_allowed(self, client, headers_secretaria, sample_doctor):
        """Secretaria can DELETE dias-no-laborables (200)."""
        # First create one
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_secretaria,
        )
        resp = client.delete(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables/2026-07-06",
            headers=headers_secretaria,
        )
        assert resp.status_code == 200
        assert "mensaje" in resp.json()


# =============================================================================
# D. Impacto en Turnos — Slot generation, turno creation, blocking
# =============================================================================

class TestImpactoEnTurnos:
    """Core validation: doctor-specific schedule affects slots, turnos, and blocking."""

    def _put_solo_manana(self, client, headers_admin, doctor_id: int):
        payload = {
            "dias": {
                "lunes": {"manana": ["09:00", "13:00"]},
                "martes": {"manana": ["09:00", "13:00"]},
                "miercoles": {"manana": ["09:00", "13:00"]},
                "jueves": None,
                "viernes": {"manana": ["09:00", "13:00"]},
                "sabado": {"manana": ["09:00", "13:00"]},
                "domingo": None,
            }
        }
        return client.put(f"/api/doctores/{doctor_id}/horarios", json=payload, headers=headers_admin)

    def test_doctor_solo_manana_slots(self, client, headers_admin, sample_doctor):
        """Doctor with only morning hours → GET /turnos/slots returns only morning slots."""
        self._put_solo_manana(client, headers_admin, sample_doctor.id)
        resp = client.get(
            f"/api/turnos/slots?fecha=2026-07-06&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert resp.status_code == 200
        slots = resp.json()
        assert len(slots) == 8
        horas = [s["hora"] for s in slots]
        assert horas[0] == "09:00"
        assert horas[-1] == "12:30"
        assert all(s["estado"] == "libre" for s in slots)

    def test_doctor_solo_manana_turno_ok(self, client, headers_secretaria, headers_admin, sample_doctor, sample_paciente):
        """Creating turno at 10:30 works for morning-only doctor."""
        self._put_solo_manana(client, headers_admin, sample_doctor.id)
        resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-06T10:30:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 201

    def test_doctor_solo_manana_turno_tarde_rechaza(self, client, headers_secretaria, headers_admin, sample_doctor, sample_paciente):
        """Creating turno at 16:00 fails for morning-only doctor (400)."""
        self._put_solo_manana(client, headers_admin, sample_doctor.id)
        resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-06T16:00:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 400

    def test_dia_no_laborable_slots_vacios(self, client, headers_admin, sample_doctor):
        """Marking Monday as non-working → GET /turnos/slots returns empty for that day."""
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_admin,
        )
        resp = client.get(
            f"/api/turnos/slots?fecha=2026-07-06&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_dia_no_laborable_crear_turno_rechaza(self, client, headers_secretaria, headers_admin, sample_doctor, sample_paciente):
        """Creating turno on a non-working day returns 400."""
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_admin,
        )
        resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-06T10:00:00",
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
            },
            headers=headers_secretaria,
        )
        assert resp.status_code == 400

    def test_bloquear_slot_respeta_horario_doctor(self, client, headers_admin, sample_doctor):
        """Blocking slot outside doctor's hours returns 400."""
        self._put_solo_manana(client, headers_admin, sample_doctor.id)
        resp_valido = client.post(
            "/api/turnos/slots/bloquear",
            json={"fecha": "2026-07-06", "hora": "10:00", "id_doctor": sample_doctor.id, "motivo": "Válido"},
            headers=headers_admin,
        )
        assert resp_valido.status_code == 201
        resp_invalido = client.post(
            "/api/turnos/slots/bloquear",
            json={"fecha": "2026-07-06", "hora": "16:00", "id_doctor": sample_doctor.id, "motivo": "Fuera horario"},
            headers=headers_admin,
        )
        assert resp_invalido.status_code == 400

    def test_doctor_jueves_cerrado_slots_vacios(self, client, headers_admin, sample_doctor):
        """Doctor with Thursday closed → slots empty on Thursday."""
        resp = client.get(
            f"/api/turnos/slots?fecha=2026-07-09&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert resp.status_code == 200
        assert resp.json() == []

    def test_delete_dia_no_laborable_restaura_slots(self, client, headers_admin, sample_doctor):
        """Unmark non-working day → slots return."""
        client.post(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables",
            json={"fecha": "2026-07-06", "motivo": "Feriado"},
            headers=headers_admin,
        )
        resp_empty = client.get(
            f"/api/turnos/slots?fecha=2026-07-06&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert resp_empty.json() == []
        client.delete(
            f"/api/doctores/{sample_doctor.id}/dias-no-laborables/2026-07-06",
            headers=headers_admin,
        )
        resp_full = client.get(
            f"/api/turnos/slots?fecha=2026-07-06&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert len(resp_full.json()) == 16
        assert resp_full.json()[0]["estado"] == "libre"


# =============================================================================
# E. Doctor Seeding — Auto-seed on creation
# =============================================================================

class TestDoctorSeeding:
    """Doctor creation auto-seeds schedule rows."""

    def test_crear_doctor_tiene_horario_default(self, client, headers_admin):
        """POST /doctores/ creates doctor with 7 schedule rows configuradas."""
        resp = client.post(
            "/api/doctores/",
            json={"nombre": "Dr. Nuevo", "color_agenda": "#FF0000"},
            headers=headers_admin,
        )
        assert resp.status_code == 201
        doctor_id = resp.json()["id"]

        horario_resp = client.get(f"/api/doctores/{doctor_id}/horarios", headers=headers_admin)
        assert horario_resp.status_code == 200
        data = horario_resp.json()
        assert data["id_doctor"] == doctor_id
        assert data["nombre_doctor"] == "Dr. Nuevo"
        dias = data["dias"]
        assert len(dias) == 7
        assert dias["lunes"]["manana"] == ["09:00", "13:00"]
        assert dias["lunes"]["tarde"] == ["16:00", "20:00"]
        assert dias["jueves"] is None
        assert dias["domingo"] is None
