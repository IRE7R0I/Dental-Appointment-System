# Design: Backend — Historial de Pagos y Tratamientos

## Architecture Overview

Dos endpoints REST nuevos sobre el modelo existente. Datos ya existen en las tablas: `Turno`, `TurnoTratamiento`, `Pago`, `CuentaCorriente`, `Doctor`. Solo se exponen con la estructura correcta.

## Endpoints

### 1. GET /pacientes/{dni}/historial

**Parámetros query:**
- `fecha_desde` (opcional, YYYY-MM-DD) — filtra turnos desde esta fecha
- `fecha_hasta` (opcional, YYYY-MM-DD) — filtra turnos hasta esta fecha

**Respuesta:**
```json
{
  "dni_paciente": "42751595",
  "nombre": "Juan Manuel",
  "apellido": "Trejo",
  "saldo_ars": 50000.0,
  "saldo_usd": 0.0,
  "turnos": [
    {
      "id": 12,
      "fecha_hora": "2026-01-15T10:00:00",
      "estado": "Realizado",
      "doctor": { "id": 1, "nombre": "Darío" },
      "tratamientos": [
        { "nombre": "Extracción", "cantidad": 1, "precio_ars": 50000.0 }
      ],
      "total_ars": 50000.0,
      "total_usd": 0.0,
      "pagos": [
        { "id": 1, "fecha": "2026-01-15T11:00:00", "monto": 20000.0, "moneda": "ARS", "metodo_pago": "efectivo" },
        { "id": 2, "fecha": "2026-01-15T12:00:00", "monto": 30000.0, "moneda": "ARS", "metodo_pago": "transferencia" }
      ],
      "total_pagado_ars": 50000.0,
      "saldo_ars": 0.0
    }
  ],
  "totales": {
    "total_tratamientos_ars": 50000.0,
    "total_tratamientos_usd": 0.0,
    "total_pagado_ars": 50000.0,
    "total_pagado_usd": 0.0,
    "saldo_ars": 0.0,
    "saldo_usd": 0.0
  }
}
```

**Query SQL (joinedload):**
```python
query = db.query(models.Turno).options(
    joinedload(models.Turno.doctor),
    joinedload(models.Turno.tratamientos),
    joinedload(models.Turno.pagos),
    joinedload(models.Turno.paciente),
).filter(
    models.Turno.dni_paciente == dni,
    models.Turno.estado.in_(["Realizado", "Cancelado"]),
)
```

### 2. GET /finanzas/pagos

**Parámetros query:**
- `fecha_desde` (opcional) — fecha mínima de pago
- `fecha_hasta` (opcional) — fecha máxima de pago
- `metodo_pago` (opcional) — "efectivo" | "transferencia"
- `dni_paciente` (opcional) — filtrar por paciente
- `id_doctor` (opcional) — filtrar por doctor del turno
- `solo_deudores` (opcional, bool) — solo pacientes con saldo > 0

**Respuesta:**
```json
[
  {
    "id": 1,
    "fecha_pago": "2026-01-15T11:00:00",
    "monto": 20000.0,
    "moneda": "ARS",
    "metodo_pago": "efectivo",
    "id_turno": 12,
    "paciente": { "dni": "42751595", "nombre": "Juan Manuel", "apellido": "Trejo" },
    "doctor": { "id": 1, "nombre": "Darío" }
  }
]
```

**Lógica de `solo_deudores`:**
- Hacemos subquery sobre `CuentaCorriente` filtrando `saldo_ars > 0 OR saldo_usd > 0`
- Obtenemos los DNIs de esos pacientes
- Filtramos pagos donde `paciente.dni IN (dnis_deudores)`

## Data Model Changes

**Schemas nuevos:**
- `HistorialTurnoResponse` — un turno con doctor, tratamientos, pagos
- `HistorialPacienteResponse` — respuesta completa con turnos + totales
- `PagoContextoResponse` — pago con paciente y doctor incluidos

**Schemas modificados:**
- Ninguno — solo se agregan nuevos

## Implementation Notes

- Usar `joinedload` para evitar N+1
- Los campos Decimal de saldo se convierten a float en los schemas (ya hecho en fix anterior)
- El endpoint de finanzas/pagos une `Pago` con `Turno` y `Paciente` via `joinedload`
- El filtro `metodo_pago` usa LIKE porque los valores pueden venir con variantes ("transferencia", "banco", "mercadopago" → normalizar a "transferencia")
- Los totales se calculan en Python, no en SQL (simplicidad)

## Risks

| Risk | Mitigation |
|------|------------|
| Muchos pagos sin turno asociado (pagos directos a cuenta) | Esos pagos ya van a `MovimientoCuenta`, se muestran solo si tienen `id_turno` |
| Pacientes sin turnos → historial vacío | Devolver vacío con saldo desde `CuentaCorriente` |
| Filtro de método con string mal escrito | Normalizar: "banco" → "transferencia", "mp" → "transferencia" |