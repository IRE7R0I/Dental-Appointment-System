import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from backend import models

@pytest.fixture
def sample_paciente2(db):
    """Create a second sample patient."""
    pac = models.Paciente(
        dni="87654321",
        nombre="Maria",
        apellido="Gomez",
        telefono="2222222222",
        obra_social="OSDE",
    )
    db.add(pac)
    db.commit()
    db.refresh(pac)
    return pac

# 1. Test de Filtro por Moneda en Pagos
def test_filtro_moneda_pagos(client, headers_admin, db, sample_paciente):
    # Registrar un pago en ARS
    pago_ars = models.Pago(
        monto=1000.00,
        moneda="ARS",
        metodo_pago="efectivo",
        dni_paciente=sample_paciente.dni,
        fecha_pago=datetime.now() - timedelta(minutes=5)
    )
    # Registrar un pago en USD
    pago_usd = models.Pago(
        monto=50.00,
        moneda="USD",
        metodo_pago="transferencia",
        dni_paciente=sample_paciente.dni,
        fecha_pago=datetime.now()
    )
    db.add(pago_ars)
    db.add(pago_usd)
    db.commit()

    # GET /finanzas/pagos sin filtrar
    resp_todos = client.get("/api/finanzas/pagos", headers=headers_admin)
    assert resp_todos.status_code == 200
    todos = resp_todos.json()
    assert len(todos) >= 2
    # Verificar presencia de ambos pagos
    ids = [p["id"] for p in todos]
    assert pago_ars.id in ids
    assert pago_usd.id in ids

    # GET /finanzas/pagos?moneda=ARS
    resp_ars = client.get("/api/finanzas/pagos?moneda=ARS", headers=headers_admin)
    assert resp_ars.status_code == 200
    pagos_ars = resp_ars.json()
    assert all(p["moneda"] == "ARS" for p in pagos_ars)
    assert any(p["id"] == pago_ars.id for p in pagos_ars)
    assert not any(p["id"] == pago_usd.id for p in pagos_ars)

    # GET /finanzas/pagos?moneda=USD
    resp_usd = client.get("/api/finanzas/pagos?moneda=USD", headers=headers_admin)
    assert resp_usd.status_code == 200
    pagos_usd = resp_usd.json()
    assert all(p["moneda"] == "USD" for p in pagos_usd)
    assert any(p["id"] == pago_usd.id for p in pagos_usd)
    assert not any(p["id"] == pago_ars.id for p in pagos_usd)


# 2. Test de Cálculo de Antigüedad y Ordenamiento
def test_dias_antiguedad_y_ordenamiento(client, headers_admin, db, sample_paciente, sample_paciente2):
    # Paciente A (sample_paciente) con deuda ARS. Cargo hace 10 días, no saldado.
    cuenta_a = models.CuentaCorriente(dni_paciente=sample_paciente.dni, saldo_ars=1500.0)
    db.add(cuenta_a)
    db.commit()

    fecha_cargo_a1 = datetime.now() - timedelta(days=10)
    fecha_cargo_a2 = datetime.now() - timedelta(days=3)
    
    cargo_a1 = models.MovimientoCuenta(
        id_cuenta=cuenta_a.id, tipo="cargo", monto=1000.0, moneda="ARS", fecha=fecha_cargo_a1
    )
    cargo_a2 = models.MovimientoCuenta(
        id_cuenta=cuenta_a.id, tipo="cargo", monto=1000.0, moneda="ARS", fecha=fecha_cargo_a2
    )
    # Paciente A pagó $500, con lo que amortiza parcialmente cargo_a1 (sigue habiendo deuda en cargo_a1)
    pago_a = models.MovimientoCuenta(
        id_cuenta=cuenta_a.id, tipo="pago", monto=500.0, moneda="ARS", fecha=datetime.now()
    )
    db.add_all([cargo_a1, cargo_a2, pago_a])

    # Paciente B (sample_paciente2) con deuda ARS. Cargo hace 5 días.
    cuenta_b = models.CuentaCorriente(dni_paciente=sample_paciente2.dni, saldo_ars=2000.0)
    db.add(cuenta_b)
    db.commit()

    fecha_cargo_b1 = datetime.now() - timedelta(days=5)
    cargo_b1 = models.MovimientoCuenta(
        id_cuenta=cuenta_b.id, tipo="cargo", monto=2000.0, moneda="ARS", fecha=fecha_cargo_b1
    )
    db.add(cargo_b1)
    db.commit()

    # GET /pacientes/deudores por default (antiguedad_desc)
    resp = client.get("/api/pacientes/deudores", headers=headers_admin)
    assert resp.status_code == 200
    deudores = resp.json()
    assert len(deudores) >= 2

    # Paciente A (antigüedad de 10 días) debe aparecer antes que Paciente B (5 días)
    idx_a = next(i for i, d in enumerate(deudores) if d["dni"] == sample_paciente.dni)
    idx_b = next(i for i, d in enumerate(deudores) if d["dni"] == sample_paciente2.dni)
    assert idx_a < idx_b

    # Confirmar valores de días de antigüedad calculados
    assert deudores[idx_a]["dias_antiguedad"] == 10
    assert deudores[idx_b]["dias_antiguedad"] == 5

    # GET /pacientes/deudores?orden=antiguedad_asc
    resp_asc = client.get("/api/pacientes/deudores?orden=antiguedad_asc", headers=headers_admin)
    assert resp_asc.status_code == 200
    deudores_asc = resp_asc.json()
    idx_a_asc = next(i for i, d in enumerate(deudores_asc) if d["dni"] == sample_paciente.dni)
    idx_b_asc = next(i for i, d in enumerate(deudores_asc) if d["dni"] == sample_paciente2.dni)
    assert idx_b_asc < idx_a_asc


# 3. Test de GET /pacientes/{dni}/turnos-con-deuda
def test_turnos_con_deuda_desglose(client, headers_admin, db, sample_paciente, sample_doctor, admin_user):
    # Crear Turno 1: Completamente saldado
    turno1 = models.Turno(
        fecha_hora=datetime.now() - timedelta(days=2),
        estado="Realizado",
        dni_paciente=sample_paciente.dni,
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id
    )
    db.add(turno1)
    db.commit()
    db.refresh(turno1)

    t1_trat = models.TurnoTratamiento(id_turno=turno1.id, nombre="Consulta", cantidad=1, precio_ars=5000.0)
    t1_pago = models.Pago(monto=5000.0, moneda="ARS", metodo_pago="Efectivo", id_turno=turno1.id)
    db.add_all([t1_trat, t1_pago])

    # Crear Turno 2: Deuda parcial ARS
    turno2 = models.Turno(
        fecha_hora=datetime.now() - timedelta(days=1),
        estado="Realizado",
        dni_paciente=sample_paciente.dni,
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id
    )
    db.add(turno2)
    db.commit()
    db.refresh(turno2)

    t2_trat = models.TurnoTratamiento(id_turno=turno2.id, nombre="Extraccion", cantidad=1, precio_ars=12000.0)
    t2_pago = models.Pago(monto=4000.0, moneda="ARS", metodo_pago="Transferencia", id_turno=turno2.id)
    db.add_all([t2_trat, t2_pago])

    # Crear Turno 3: Deuda total USD
    turno3 = models.Turno(
        fecha_hora=datetime.now() - timedelta(hours=2),
        estado="Realizado",
        dni_paciente=sample_paciente.dni,
        id_doctor=sample_doctor.id,
        creado_por_id=admin_user.id
    )
    db.add(turno3)
    db.commit()
    db.refresh(turno3)

    t3_trat = models.TurnoTratamiento(id_turno=turno3.id, nombre="Limpieza", cantidad=2, precio_usd=25.0)
    db.add(t3_trat)
    db.commit()

    # GET /pacientes/{dni}/turnos-con-deuda
    resp = client.get(f"/api/pacientes/{sample_paciente.dni}/turnos-con-deuda", headers=headers_admin)
    assert resp.status_code == 200
    turnos_deuda = resp.json()

    # Solo debe retornar Turno 2 y Turno 3, no Turno 1 (ya que saldo_pendiente == 0)
    assert len(turnos_deuda) == 2
    assert turnos_deuda[0]["id_turno"] == turno2.id
    assert turnos_deuda[1]["id_turno"] == turno3.id  # Orden ascendente por fecha_hora

    # Verificar montos de Turno 2
    t2 = turnos_deuda[0]
    assert t2["total_facturado_ars"] == 12000.0
    assert t2["total_pagado_ars"] == 4000.0
    assert t2["saldo_pendiente_ars"] == 8000.0
    assert t2["total_facturado_usd"] == 0.0
    assert t2["saldo_pendiente_usd"] == 0.0
    assert t2["doctor"]["id"] == sample_doctor.id

    # Verificar montos de Turno 3
    t3 = turnos_deuda[1]
    assert t3["total_facturado_usd"] == 50.0
    assert t3["total_pagado_usd"] == 0.0
    assert t3["saldo_pendiente_usd"] == 50.0
    assert t3["total_facturado_ars"] == 0.0


# 4. Test de Paciente sin deuda
def test_paciente_sin_deuda_vacio(client, headers_admin, db, sample_paciente):
    resp = client.get(f"/api/pacientes/{sample_paciente.dni}/turnos-con-deuda", headers=headers_admin)
    assert resp.status_code == 200
    assert resp.json() == []


# 5. Test Adicional: Paciente con deuda en una sola moneda (al día en la otra)
def test_deuda_una_sola_moneda_antiguedad(client, headers_admin, db, sample_paciente):
    # Paciente con CuentaCorriente: al día en ARS, debe USD.
    cuenta = models.CuentaCorriente(dni_paciente=sample_paciente.dni, saldo_ars=0.00, saldo_usd=100.00)
    db.add(cuenta)
    db.commit()

    # Movimientos en ARS: cargo y pago totalmente saldados
    cargo_ars = models.MovimientoCuenta(
        id_cuenta=cuenta.id, tipo="cargo", monto=1000.0, moneda="ARS", fecha=datetime.now() - timedelta(days=30)
    )
    pago_ars = models.MovimientoCuenta(
        id_cuenta=cuenta.id, tipo="pago", monto=1000.0, moneda="ARS", fecha=datetime.now() - timedelta(days=29)
    )

    # Movimientos en USD: cargo hace 15 días, no saldado
    fecha_cargo_usd = datetime.now() - timedelta(days=15)
    cargo_usd = models.MovimientoCuenta(
        id_cuenta=cuenta.id, tipo="cargo", monto=100.0, moneda="USD", fecha=fecha_cargo_usd
    )
    db.add_all([cargo_ars, pago_ars, cargo_usd])
    db.commit()

    # Consultar deudores
    resp = client.get("/api/pacientes/deudores", headers=headers_admin)
    assert resp.status_code == 200
    deudores = resp.json()

    # Buscar a nuestro paciente
    d = next(deudor for deudor in deudores if deudor["dni"] == sample_paciente.dni)
    assert d["saldo_ars"] == 0.00
    assert d["saldo_usd"] == 100.00
    # La antigüedad debe calcularse correctamente basándose en el cargo USD (15 días)
    assert d["dias_antiguedad"] == 15
