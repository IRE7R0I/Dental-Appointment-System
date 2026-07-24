import pytest
from datetime import datetime, date, time
from backend import models


class TestTurnosMultiSlot:
    """Integration tests for C-21: validacion-turnos-multi-slot."""

    def test_crear_turno_60min_solapa_bloqueo_manual_rechaza(
        self, client, headers_admin, sample_paciente, sample_doctor
    ):
        """POST /api/turnos/ for 60 min starting at 08:30 overlapping a 09:00 manual block → 400 Bad Request."""
        # 1. Bloquear manualmente el slot de las 09:00 del lunes 2026-07-20 (lunes es laboral)
        block_resp = client.post(
            "/api/turnos/slots/bloquear",
            json={
                "fecha": "2026-07-20",
                "hora": "09:00:00",
                "id_doctor": sample_doctor.id,
                "motivo": "Reunión",
            },
            headers=headers_admin,
        )
        assert block_resp.status_code == 201

        # 2. Intentar crear turno de 60 min iniciando a las 08:30 (08:30 - 09:30)
        # Nota: Lunes 9:00 es hora laboral por default. 08:30 - 09:30
        turno_resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-20T09:00:00", # 09:00-10:00 sobre slot 09:00 bloqueado
                "duracion_minutos": 60,
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
                "motivo": "Consulta larga",
            },
            headers=headers_admin,
        )
        assert turno_resp.status_code == 400
        assert "bloqueo manual" in turno_resp.json()["detail"]

    def test_crear_turno_60min_sin_solapamiento_ok(
        self, client, headers_admin, sample_paciente, sample_doctor
    ):
        """POST /api/turnos/ for 60 min when no overlap exists → 201 Created."""
        resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-20T10:00:00",
                "duracion_minutos": 60,
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
                "motivo": "Ortodoncia general",
            },
            headers=headers_admin,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["duracion_minutos"] == 60

    def test_obtener_slots_vista_diaria_refleja_todos_los_slots_ocupados(
        self, client, headers_admin, sample_paciente, sample_doctor
    ):
        """GET /api/turnos/slots shows both 10:00 and 10:30 slots as 'ocupado' for a 60 min turno."""
        # 1. Crear turno de 60 min a las 10:00
        post_resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-20T10:00:00",
                "duracion_minutos": 60,
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
                "motivo": "Tratamiento de conducto",
            },
            headers=headers_admin,
        )
        assert post_resp.status_code == 201
        turno_id = post_resp.json()["id"]

        # 2. Consultar vista diaria de slots para el 2026-07-20
        slots_resp = client.get(
            f"/api/turnos/slots?fecha=2026-07-20&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert slots_resp.status_code == 200
        slots = slots_resp.json()

        # Buscar slots de las 10:00 y 10:30
        slot_1000 = next((s for s in slots if s["hora"] == "10:00"), None)
        slot_1030 = next((s for s in slots if s["hora"] == "10:30"), None)

        assert slot_1000 is not None
        assert slot_1030 is not None

        assert slot_1000["estado"] == "ocupado"
        assert slot_1000["turno_id"] == turno_id

        assert slot_1030["estado"] == "ocupado"
        assert slot_1030["turno_id"] == turno_id

    def test_regresion_turno_30min(
        self, client, headers_admin, sample_paciente, sample_doctor
    ):
        """Standard 30 min turno only occupies its single slot."""
        post_resp = client.post(
            "/api/turnos/",
            json={
                "fecha_hora": "2026-07-20T11:00:00",
                "duracion_minutos": 30,
                "dni_paciente": sample_paciente.dni,
                "id_doctor": sample_doctor.id,
                "motivo": "Revisión corta",
            },
            headers=headers_admin,
        )
        assert post_resp.status_code == 201
        turno_id = post_resp.json()["id"]

        slots_resp = client.get(
            f"/api/turnos/slots?fecha=2026-07-20&id_doctor={sample_doctor.id}",
            headers=headers_admin,
        )
        assert slots_resp.status_code == 200
        slots = slots_resp.json()

        slot_1100 = next((s for s in slots if s["hora"] == "11:00"), None)
        slot_1130 = next((s for s in slots if s["hora"] == "11:30"), None)

        assert slot_1100 is not None
        assert slot_1100["estado"] == "ocupado"
        assert slot_1100["turno_id"] == turno_id

        assert slot_1130 is not None
        assert slot_1130["estado"] == "libre"
