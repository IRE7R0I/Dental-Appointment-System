import pytest
from datetime import datetime
from backend import models

@pytest.fixture
def sample_turno_pendiente(db, sample_paciente, sample_doctor, admin_user):
    """Create a turno in 'Pendiente' state."""
    turno = models.Turno(
        fecha_hora=datetime(2026, 7, 11, 10, 0),
        estado="Pendiente",
        dni_paciente=sample_paciente.dni,
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id,
    )
    db.add(turno)
    db.commit()
    db.refresh(turno)
    return turno

def test_cerrar_turno_crea_evolucion_clinica(client, headers_admin, sample_turno_pendiente):
    """Cierra un turno con pieza dental + ubicación + observaciones, y confirma que se crea la evolución clínica."""
    turno_id = sample_turno_pendiente.id
    dni = sample_turno_pendiente.dni_paciente

    payload = {
        "tratamientos": [
            {"nombre": "Consulta general", "cantidad": 1, "precio_ars": 5000, "precio_usd": 0}
        ],
        "pagos": [
            {"monto": 5000, "moneda": "ARS", "metodo_pago": "Efectivo"}
        ],
        "comentarios": "Evolucion de prueba C-14",
        "pieza_dental": 18,
        "ubicacion_lesion": "O,D",
        "conformidad_paciente": True
    }

    response = client.put(f"/api/turnos/{turno_id}/cerrar", json=payload, headers=headers_admin)
    assert response.status_code == 200

    # Consultar evoluciones del paciente
    resp_evoluciones = client.get(f"/api/pacientes/{dni}/evoluciones", headers=headers_admin)
    assert resp_evoluciones.status_code == 200
    evoluciones = resp_evoluciones.json()

    assert len(evoluciones) > 0
    # Buscar la evolución correspondiente a este turno
    evol = next((e for e in evoluciones if e["id_turno"] == turno_id), None)
    assert evol is not None
    assert evol["pieza_dental"] == 18
    assert evol["ubicacion_lesion"] == "O,D"
    assert evol["conformidad_paciente"] is True
    assert evol["observaciones"] == "Evolucion de prueba C-14"

def test_cerrar_turno_sin_detalle_clinico_opcional(client, headers_admin, sample_turno_pendiente):
    """Cierra un turno sin pieza dental ni ubicación (solo comentarios), confirma que se crea igual con esos campos en null."""
    turno_id = sample_turno_pendiente.id
    dni = sample_turno_pendiente.dni_paciente

    payload = {
        "tratamientos": [
            {"nombre": "Consulta general", "cantidad": 1, "precio_ars": 5000, "precio_usd": 0}
        ],
        "pagos": [
            {"monto": 5000, "moneda": "ARS", "metodo_pago": "Efectivo"}
        ],
        "comentarios": "Evolucion sin detalles"
    }

    response = client.put(f"/api/turnos/{turno_id}/cerrar", json=payload, headers=headers_admin)
    assert response.status_code == 200

    # Consultar evoluciones del paciente
    resp_evoluciones = client.get(f"/api/pacientes/{dni}/evoluciones", headers=headers_admin)
    assert resp_evoluciones.status_code == 200
    evoluciones = resp_evoluciones.json()

    evol = next((e for e in evoluciones if e["id_turno"] == turno_id), None)
    assert evol is not None
    assert evol["pieza_dental"] is None
    assert evol["ubicacion_lesion"] is None
    assert evol["conformidad_paciente"] is None
    assert evol["observaciones"] == "Evolucion sin detalles"

def test_cerrar_turno_falla_no_deja_evolucion_huerfana(client, headers_admin, sample_turno_pendiente, db, monkeypatch):
    """Forza un error en la transacción (simulado en el commit) y confirma rollback completo."""
    turno_id = sample_turno_pendiente.id
    dni = sample_turno_pendiente.dni_paciente

    # Validar cuántas evoluciones hay antes del intento fallido
    count_antes = db.query(models.EvolucionClinica).filter(models.EvolucionClinica.dni_paciente == dni).count()

    payload = {
        "tratamientos": [
            {"nombre": "Consulta general", "cantidad": 1, "precio_ars": 5000, "precio_usd": 0}
        ],
        "pagos": [
            {"monto": 5000, "moneda": "ARS", "metodo_pago": "Efectivo"}
        ],
        "comentarios": "Esta evolucion no deberia persistirse",
        "pieza_dental": 22,
        "ubicacion_lesion": "O"
    }

    from sqlalchemy.orm import Session
    original_commit = Session.commit

    def mock_commit(self):
        raise Exception("Simulated DB commit failure")

    monkeypatch.setattr(Session, "commit", mock_commit)

    try:
        with pytest.raises(Exception, match="Simulated DB commit failure"):
            client.put(f"/api/turnos/{turno_id}/cerrar", json=payload, headers=headers_admin)
    finally:
        monkeypatch.setattr(Session, "commit", original_commit)

    # Confirmar que la cantidad de evoluciones no aumentó (rollback exitoso)
    count_despues = db.query(models.EvolucionClinica).filter(models.EvolucionClinica.dni_paciente == dni).count()
    assert count_antes == count_despues

    # Comprobar que tampoco se modificó el estado del turno
    db.expire_all()
    turno_db = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    assert turno_db.estado == "Pendiente"
