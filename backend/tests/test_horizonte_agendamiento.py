import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.models import Doctor, Paciente
from backend.core.horarios import dt_local


@pytest.fixture
def setup_doctores_y_pacientes(db: Session):
    # Paciente
    paciente = db.query(Paciente).filter(Paciente.dni == "11223344").first()
    if not paciente:
        paciente = Paciente(dni="11223344", nombre="Juan", apellido="Pérez")
        db.add(paciente)

    # Doctor 1: horizonte 30 días
    doc1 = db.query(Doctor).filter(Doctor.nombre == "Dr. Horizonte30").first()
    if not doc1:
        doc1 = Doctor(nombre="Dr. Horizonte30", color_agenda="#111111", horizonte_dias=30)
        db.add(doc1)
    else:
        doc1.horizonte_dias = 30

    # Doctor 2: horizonte 180 días
    doc2 = db.query(Doctor).filter(Doctor.nombre == "Dr. Horizonte180").first()
    if not doc2:
        doc2 = Doctor(nombre="Dr. Horizonte180", color_agenda="#222222", horizonte_dias=180)
        db.add(doc2)
    else:
        doc2.horizonte_dias = 180

    db.commit()
    db.refresh(doc1)
    db.refresh(doc2)
    return doc1, doc2, paciente


def _proximo_lunes(desde: datetime) -> datetime:
    """Busca el próximo lunes a las 10:00 desde una fecha base."""
    actual = desde
    while actual.weekday() != 0:  # 0 = lunes
        actual += timedelta(days=1)
    return actual.replace(hour=10, minute=0, second=0, microsecond=0)


def test_horizonte_inclusive_aceptado_y_dia31_rechazado(client, headers_admin, setup_doctores_y_pacientes):
    doc1, _, paciente = setup_doctores_y_pacientes
    hoy_local = dt_local(datetime.now()).date()

    # Buscar un lunes exacto en el límite de 30 días o antes
    fecha_limite_30 = hoy_local + timedelta(days=30)
    dt_limite = _proximo_lunes(datetime.combine(fecha_limite_30 - timedelta(days=6), datetime.min.time()))

    # 1. Turno dentro del horizonte de 30 días -> 201 Created
    body_valido = {
        "fecha_hora": dt_limite.isoformat(),
        "duracion_minutos": 30,
        "dni_paciente": paciente.dni,
        "id_doctor": doc1.id,
        "motivo": "Consulta dentro de horizonte",
    }
    resp = client.post("/api/turnos/", json=body_valido, headers=headers_admin)
    assert resp.status_code == 201, f"Falló creación dentro del horizonte: {resp.text}"

    # 2. Turno al día 35 (más allá de 30) -> 400 Bad Request
    fecha_mas_alla = hoy_local + timedelta(days=35)
    dt_mas_alla = _proximo_lunes(datetime.combine(fecha_mas_alla, datetime.min.time()))
    body_invalido = {
        "fecha_hora": dt_mas_alla.isoformat(),
        "duracion_minutos": 30,
        "dni_paciente": paciente.dni,
        "id_doctor": doc1.id,
        "motivo": "Consulta fuera de horizonte",
    }
    resp_inv = client.post("/api/turnos/", json=body_invalido, headers=headers_admin)
    assert resp_inv.status_code == 400
    assert "30 días" in resp_inv.json()["detail"]


def test_doctores_con_horizontes_diferentes(client, headers_admin, setup_doctores_y_pacientes):
    doc1, doc2, paciente = setup_doctores_y_pacientes
    hoy_local = dt_local(datetime.now()).date()

    # Mismo día a los 45 días
    dt_dia45 = _proximo_lunes(datetime.combine(hoy_local + timedelta(days=45), datetime.min.time()))

    # Doctor 1 (30 días) -> 400 Bad Request
    resp_doc1 = client.post("/api/turnos/", json={
        "fecha_hora": dt_dia45.isoformat(),
        "duracion_minutos": 30,
        "dni_paciente": paciente.dni,
        "id_doctor": doc1.id,
    }, headers=headers_admin)
    assert resp_doc1.status_code == 400
    assert "30 días" in resp_doc1.json()["detail"]

    # Doctor 2 (180 días) -> 201 Created
    resp_doc2 = client.post("/api/turnos/", json={
        "fecha_hora": dt_dia45.isoformat(),
        "duracion_minutos": 30,
        "dni_paciente": paciente.dni,
        "id_doctor": doc2.id,
    }, headers=headers_admin)
    assert resp_doc2.status_code == 201


def test_put_horarios_doctor_validacion_literal(client, headers_admin, setup_doctores_y_pacientes):
    doc1, _, _ = setup_doctores_y_pacientes

    # Intentar enviar 45 -> 422 Unprocessable Entity
    resp_inv = client.put(f"/api/doctores/{doc1.id}/horarios", json={"horizonte_dias": 45}, headers=headers_admin)
    assert resp_inv.status_code == 422

    # Enviar 60 -> 200 OK y actualiza
    resp_ok = client.put(f"/api/doctores/{doc1.id}/horarios", json={"horizonte_dias": 60}, headers=headers_admin)
    assert resp_ok.status_code == 200
    assert resp_ok.json()["horizonte_dias"] == 60

    # GET confirma cambio
    resp_get = client.get(f"/api/doctores/{doc1.id}/horarios", headers=headers_admin)
    assert resp_get.status_code == 200
    assert resp_get.json()["horizonte_dias"] == 60


def test_config_horarios_no_expone_horizonte_global(client):
    resp = client.get("/api/config/horarios")
    assert resp.status_code == 200
    data = resp.json()
    assert "horizonte_dias" not in data


def test_bulk_mensual_con_horizontes_mixtos(client, headers_admin, setup_doctores_y_pacientes, db):
    doc1, doc2, _ = setup_doctores_y_pacientes
    doc1.horizonte_dias = 30
    doc2.horizonte_dias = 180
    db.commit()

    hoy_local = dt_local(datetime.now()).date()
    fecha_45 = hoy_local + timedelta(days=45)

    resp = client.get(
        f"/api/turnos/slots/bulk?fecha_desde={fecha_45.isoformat()}&fecha_hasta={fecha_45.isoformat()}&id_doctor={doc1.id},{doc2.id}",
        headers=headers_admin,
    )
    assert resp.status_code == 200
    data = resp.json()
    dia_data = data["dias"][fecha_45.isoformat()]

    # Doctor 1 (30 días) en día 45 reporta total: 0
    assert dia_data["por_doctor"][str(doc1.id)]["total"] == 0

    # Doctor 2 (180 días) en día 45 reporta total > 0 (si es día laboral)
    if fecha_45.weekday() in (0, 1, 2, 4, 5):  # lunes, martes, miercoles, viernes, sabado
        assert dia_data["por_doctor"][str(doc2.id)]["total"] > 0


def test_slots_individuales_fuera_de_horizonte(client, headers_admin, setup_doctores_y_pacientes, db):
    doc1, _, _ = setup_doctores_y_pacientes
    doc1.horizonte_dias = 30
    db.commit()

    hoy_local = dt_local(datetime.now()).date()
    fecha_45 = hoy_local + timedelta(days=45)

    resp = client.get(f"/api/turnos/slots?fecha={fecha_45.isoformat()}&id_doctor={doc1.id}", headers=headers_admin)
    assert resp.status_code == 200
    assert resp.json() == []
