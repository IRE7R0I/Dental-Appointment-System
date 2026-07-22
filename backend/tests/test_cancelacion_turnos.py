import pytest
from datetime import datetime
from backend import models


@pytest.fixture
def sample_turno_pendiente(db, sample_paciente, sample_doctor, admin_user):
    """Create a turno in 'Pendiente' state."""
    turno = models.Turno(
        fecha_hora=datetime(2026, 7, 20, 10, 0),
        estado="Pendiente",
        motivo="Consulta de rutina",
        dni_paciente=sample_paciente.dni,
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id,
    )
    db.add(turno)
    db.commit()
    db.refresh(turno)
    return turno


@pytest.fixture
def sample_turno_realizado(db, sample_paciente, sample_doctor, admin_user):
    """Create a turno already in 'Realizado' state."""
    turno = models.Turno(
        fecha_hora=datetime(2026, 7, 20, 11, 0),
        estado="Realizado",
        motivo="Extracción",
        dni_paciente=sample_paciente.dni,
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id,
    )
    db.add(turno)
    db.commit()
    db.refresh(turno)
    return turno


class TestCancelarTurno:
    """PATCH /api/turnos/{turno_id}/cancelar"""

    def test_cancelar_pendiente_ok(self, client, headers_admin, sample_turno_pendiente):
        """Cancel a pending turno → 200, motivo_cancelacion saved, motivo original intact."""
        turno_id = sample_turno_pendiente.id
        resp = client.patch(
            f"/api/turnos/{turno_id}/cancelar",
            json={"motivo_cancelacion": "El paciente no pudo asistir"},
            headers=headers_admin,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["estado"] == "Cancelado"
        assert data["motivo_cancelacion"] == "El paciente no pudo asistir"
        assert data["motivo"] == "Consulta de rutina"  # original intact
        assert data["actualizado_en"] is not None

    def test_cancelar_realizado_rechaza(self, client, headers_admin, sample_turno_realizado):
        """Cancel a 'Realizado' turno → 400."""
        turno_id = sample_turno_realizado.id
        resp = client.patch(
            f"/api/turnos/{turno_id}/cancelar",
            json={"motivo_cancelacion": "Error del operador"},
            headers=headers_admin,
        )
        assert resp.status_code == 400
        assert "facturado" in resp.json()["detail"].lower()

    def test_cancelar_ya_cancelado_rechaza(self, client, headers_admin, sample_turno_pendiente):
        """Cancel an already-cancelled turno → 400. Protects double-click."""
        turno_id = sample_turno_pendiente.id
        # First cancel
        resp1 = client.patch(
            f"/api/turnos/{turno_id}/cancelar",
            json={"motivo_cancelacion": "Primera cancelación"},
            headers=headers_admin,
        )
        assert resp1.status_code == 200
        # Second cancel
        resp2 = client.patch(
            f"/api/turnos/{turno_id}/cancelar",
            json={"motivo_cancelacion": "Segunda cancelación"},
            headers=headers_admin,
        )
        assert resp2.status_code == 400
        assert "ya está cancelado" in resp2.json()["detail"].lower()

    def test_cancelar_sin_motivo_rechaza(self, client, headers_admin, sample_turno_pendiente):
        """Cancel without motivo_cancelacion → 422 (Pydantic validation)."""
        turno_id = sample_turno_pendiente.id
        resp = client.patch(
            f"/api/turnos/{turno_id}/cancelar",
            json={},
            headers=headers_admin,
        )
        assert resp.status_code == 422

    def test_cancelar_motivo_vacio_rechaza(self, client, headers_admin, sample_turno_pendiente):
        """Cancel with empty motivo_cancelacion string → 422."""
        turno_id = sample_turno_pendiente.id
        resp = client.patch(
            f"/api/turnos/{turno_id}/cancelar",
            json={"motivo_cancelacion": ""},
            headers=headers_admin,
        )
        assert resp.status_code == 422

    def test_cancelar_turno_inexistente_404(self, client, headers_admin):
        """Cancel non-existent turno → 404."""
        resp = client.patch(
            "/api/turnos/99999/cancelar",
            json={"motivo_cancelacion": "No existe"},
            headers=headers_admin,
        )
        assert resp.status_code == 404


class TestCierreAuditoria:
    """Close turno sets actualizado_en."""

    def test_cerrar_turno_setea_actualizado_en(self, client, headers_admin, sample_turno_pendiente, admin_user):
        """Closing a turno should set actualizado_en and actualizado_por_id."""
        from backend.schemas.finanzas import CerrarTurnoInput
        turno_id = sample_turno_pendiente.id
        payload = {
            "tratamientos": [{"nombre": "Limpieza", "cantidad": 1, "precio_ars": 5000, "precio_usd": None}],
            "pagos": [],
            "comentarios": "Paciente conforme",
        }
        resp = client.put(
            f"/api/turnos/{turno_id}/cerrar",
            json=payload,
            headers=headers_admin,
        )
        assert resp.status_code == 200

        # Verify actualizado_en was set on the DB record
        from sqlalchemy.orm import Session as SASession
        from backend.database import engine
        verify_db = SASession(engine)
        turno = verify_db.query(models.Turno).filter(models.Turno.id == turno_id).first()
        verify_db.close()
        assert turno.actualizado_en is not None
        assert turno.actualizado_por_id == admin_user.id
