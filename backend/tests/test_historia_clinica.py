import pytest

from backend import models


# ── Fixtures ──────────────────────────────────────────────────


@pytest.fixture
def sample_turno_asistio(db, sample_paciente, sample_doctor, admin_user):
    """Create a turno in 'Asistió' state."""
    from datetime import datetime
    turno = models.Turno(
        fecha_hora=datetime(2026, 7, 10, 10, 0),
        estado="Asistió",
        dni_paciente="12345678",
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id,
    )
    db.add(turno)
    db.commit()
    db.refresh(turno)
    return turno


@pytest.fixture
def sample_turno_pendiente(db, sample_paciente, sample_doctor, admin_user):
    """Create a turno in 'Pendiente' state."""
    from datetime import datetime
    turno = models.Turno(
        fecha_hora=datetime(2026, 7, 11, 10, 0),
        estado="Pendiente",
        dni_paciente="12345678",
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id,
    )
    db.add(turno)
    db.commit()
    db.refresh(turno)
    return turno



# ── 5.2 Alertas CRUD happy path ────────────────────────────


def test_crear_alerta(client, headers_admin, sample_paciente):
    response = client.post(
        "/pacientes/12345678/alertas",
        json={"tipo": "alergia", "descripcion": "Alergia a la penicilina"},
        headers=headers_admin,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["tipo"] == "alergia"
    assert data["descripcion"] == "Alergia a la penicilina"
    assert "creado_en" in data


def test_listar_alertas(client, headers_admin, sample_paciente):
    client.post(
        "/pacientes/12345678/alertas",
        json={"tipo": "alergia", "descripcion": "Penicilina"},
        headers=headers_admin,
    )
    response = client.get("/pacientes/12345678/alertas", headers=headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_eliminar_alerta(client, headers_admin, sample_paciente, db):
    resp = client.post(
        "/pacientes/12345678/alertas",
        json={"tipo": "condicion", "descripcion": "Hipertensión"},
        headers=headers_admin,
    )
    alerta_id = resp.json()["id"]

    # DELETE debe retornar 200
    response = client.delete(
        f"/pacientes/12345678/alertas/{alerta_id}", headers=headers_admin
    )
    assert response.status_code == 200

    # GET no debe mostrar la alerta (filtra activo=True)
    response = client.get("/pacientes/12345678/alertas", headers=headers_admin)
    assert len(response.json()) == 0

    # La fila sigue existiendo en DB con soft-delete
    row = db.query(models.AlertaMedica).filter(models.AlertaMedica.id == alerta_id).first()
    assert row is not None
    assert row.activo is False
    assert row.eliminado_por_id is not None  # audit trail
    assert row.eliminado_en is not None


def test_eliminar_alerta_not_found(client, headers_admin):
    response = client.delete(
        "/pacientes/12345678/alertas/99999", headers=headers_admin
    )
    assert response.status_code == 404


# ── 5.3 Evolución con turno "Asistió" (válido) y "Pendiente" (rechazado) ──


def test_crear_evolucion_con_turno_asistio(
    client, headers_admin, sample_turno_asistio
):
    response = client.post(
        "/pacientes/12345678/evoluciones",
        json={
            "fecha": "2026-07-10",
            "id_turno": sample_turno_asistio.id,
            "pieza_dental": 15,
            "ubicacion_lesion": "O,D",
            "observaciones": "Caries oclusal amplia. Operatoria realizada.",
            "conformidad_paciente": True,
        },
        headers=headers_admin,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["observaciones"] == "Caries oclusal amplia. Operatoria realizada."
    assert data["fecha"] == "2026-07-10"
    assert data["id_turno"] == sample_turno_asistio.id


def test_rechazar_evolucion_con_turno_pendiente(
    client, headers_admin, sample_turno_pendiente
):
    response = client.post(
        "/pacientes/12345678/evoluciones",
        json={
            "fecha": "2026-07-10",
            "id_turno": sample_turno_pendiente.id,
            "observaciones": "Test",
        },
        headers=headers_admin,
    )
    assert response.status_code == 400
    assert "Asistió" in response.json()["detail"]


# ── 5.4 Evolución sin turno (migración papel) ──────────────


def test_crear_evolucion_sin_turno(client, headers_admin, sample_paciente):
    response = client.post(
        "/pacientes/12345678/evoluciones",
        json={
            "fecha": "2025-03-15",
            "observaciones": "Extracción pieza 36. Sin complicaciones.",
        },
        headers=headers_admin,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["id_turno"] is None
    assert data["fecha"] == "2025-03-15"


# ── 5.5 Corrección de evolución ─────────────────────────────


def test_corregir_evolucion(client, headers_admin, sample_paciente):
    resp = client.post(
        "/pacientes/12345678/evoluciones",
        json={"fecha": "2026-07-10", "observaciones": "Texto original"},
        headers=headers_admin,
    )
    evol_id = resp.json()["id"]
    response = client.put(
        f"/pacientes/12345678/evoluciones/{evol_id}",
        json={"observaciones": "Texto corregido"},
        headers=headers_admin,
    )
    assert response.status_code == 200
    assert response.json()["observaciones"] == "Texto corregido"
    assert response.json()["actualizado_por_id"] is not None


# ── 5.6 Validación de campos ────────────────────────────────


def test_validar_pieza_dental_fuera_rango(client, headers_admin):
    response = client.post(
        "/pacientes/12345678/evoluciones",
        json={"fecha": "2026-07-10", "pieza_dental": 99, "observaciones": "Test"},
        headers=headers_admin,
    )
    assert response.status_code == 422


def test_validar_ubicacion_lesion_invalida(client, headers_admin):
    response = client.post(
        "/pacientes/12345678/evoluciones",
        json={"fecha": "2026-07-10", "ubicacion_lesion": "X,Z", "observaciones": "Test"},
        headers=headers_admin,
    )
    assert response.status_code == 422



# ── 5.7 Resumen endpoint ────────────────────────────────────


def test_resumen_con_datos(
    client, headers_admin, sample_turno_asistio
):
    client.post(
        "/pacientes/12345678/evoluciones",
        json={
            "fecha": "2026-07-10",
            "id_turno": sample_turno_asistio.id,
            "observaciones": "Evolución test",
        },
        headers=headers_admin,
    )
    response = client.get("/pacientes/12345678/resumen", headers=headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["evoluciones"] == 1
    assert data["hallazgos"] is None
    assert data["imagenes"] == 0  # C-015: ahora es conteo real, no None


def test_resumen_sin_datos(client, headers_admin, sample_paciente):
    response = client.get("/pacientes/12345678/resumen", headers=headers_admin)
    assert response.status_code == 200
    data = response.json()
    assert data["evoluciones"] == 0


def test_resumen_paciente_no_encontrado(client, headers_admin):
    response = client.get("/pacientes/99999999/resumen", headers=headers_admin)
    assert response.status_code == 404


# ── 5.9 No autenticado ─────────────────────────────────────


def test_no_auth_returns_401(client):
    endpoints = [
        ("GET", "/pacientes/12345678/alertas"),
        ("POST", "/pacientes/12345678/alertas"),
        ("GET", "/pacientes/12345678/evoluciones"),
        ("POST", "/pacientes/12345678/evoluciones"),
        ("GET", "/pacientes/12345678/resumen"),
    ]
    for method, url in endpoints:
        if method == "GET":
            response = client.get(url)
        elif method == "POST":
            response = client.post(url, json={})
        assert response.status_code == 401, f"{method} {url} should return 401"


# ── 5.10 Hallazgos e imágenes son null ──────────────────────


def test_hallazgos_imagenes_null(client, headers_admin, sample_paciente):
    response = client.get("/pacientes/12345678/resumen", headers=headers_admin)
    assert response.json()["hallazgos"] is None
    assert response.json()["imagenes"] == 0  # C-015: ahora es conteo real


# ── 5.11 RN-18: No exponer datos clínicos en errores ────────


def test_rn18_no_exponer_datos_clinicos(client, headers_admin, sample_paciente):
    """Verifica que ningún endpoint del módulo exponga DNI, observaciones
    ni otros datos clínicos en sus mensajes de error."""
    # Caso 1: 404 de paciente inexistente — no debe incluir el DNI buscado
    r = client.get("/pacientes/99999999/evoluciones", headers=headers_admin)
    assert r.status_code == 404
    assert "99999999" not in r.text

    # Caso 2: 400 por turno inexistente — no debe incluir DNI ni observaciones
    r = client.post(
        "/pacientes/12345678/evoluciones",
        json={"fecha": "2026-07-10", "id_turno": 99999, "observaciones": "Paciente VIH positivo"},
        headers=headers_admin,
    )
    assert r.status_code == 400
    detail = r.json()["detail"]
    assert "12345678" not in detail
    assert "VIH" not in detail
    assert "Paciente" not in detail  # No debe ecoar contenido clínico

    # Caso 3: 422 de validación (ubicacion_lesion inválida)
    # — no debe incluir observaciones del body en la respuesta de error
    r = client.post(
        "/pacientes/12345678/evoluciones",
        json={
            "fecha": "2026-07-10",
            "ubicacion_lesion": "X,Z",
            "observaciones": "Contenido sensible de prueba RN18",
        },
        headers=headers_admin,
    )
    assert r.status_code == 422
    assert "RN18" not in r.text
    assert "sensible" not in r.text
