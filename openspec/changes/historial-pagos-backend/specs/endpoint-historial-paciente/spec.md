# Spec: endpoint-historial-paciente

## Overview

Endpoint REST que devuelve el historial completo de tratamientos y pagos de un paciente, agrupados por turno.

## Requirements

### REQ-001: Historial de paciente
El sistema DEBE exponer `GET /pacientes/{dni}/historial` que devuelva todos los turnos Realizados y Cancelados del paciente, con sus tratamientos y pagos.

**Scenario: Paciente con turnos y pagos**
- **GIVEN** un paciente con DNI "42751595" tiene 2 turnos cerrados
- **WHEN** se llama `GET /pacientes/42751595/historial`
- **THEN** devuelve array con turnos ordenados por fecha descendente, cada uno con doctor, tratamientos, pagos

**Scenario: Paciente sin turnos**
- **GIVEN** un paciente existe pero no tiene turnos
- **WHEN** se llama `GET /pacientes/42751595/historial`
- **THEN** devuelve array vacío con saldo desde CuentaCorriente

**Scenario: Paciente no existe**
- **WHEN** se llama `GET /pacientes/99999999/historial`
- **THEN** devuelve 404

### REQ-002: Filtro por fechas
El endpoint DEBE aceptar parámetros opcionales `fecha_desde` y `fecha_hasta` para filtrar turnos.

**Scenario: Filtrar por rango de fechas**
- **WHEN** se llama `GET /pacientes/42751595/historial?fecha_desde=2026-01-01&fecha_hasta=2026-01-31`
- **THEN** solo devuelve turnos cuya fecha_hora esté dentro del rango

## Requirements

### REQ-003: Totales por turno
Cada turno en el historial DEBE incluir:
- `total_ars` (suma de tratamientos en ARS)
- `total_usd` (suma de tratamientos en USD)
- `total_pagado_ars` (suma de pagos en ARS a ese turno)
- `total_pagado_usd` (suma de pagos en USD a ese turno)
- `saldo_ars` (total - pagado en ARS)
- `saldo_usd` (total - pagado en USD)

### REQ-004: Totales globales
La respuesta DEBE incluir sección `totales` con:
- `total_tratamientos_ars` — suma de todos los tratamientos ARS
- `total_tratamientos_usd` — suma de todos los tratamientos USD
- `total_pagado_ars` — suma de todos los pagos ARS
- `total_pagado_usd` — suma de todos los pagos USD
- `saldo_ars` y `saldo_usd` — saldo global

---

# Spec: endpoint-listado-pagos

## Overview

Endpoint REST que devuelve una lista de todos los pagos del sistema, filtrable, con datos de contexto (paciente y doctor).

## Requirements

### REQ-005: Listado de pagos con contexto
El sistema DEBE exponer `GET /finanzas/pagos` que devuelva todos los pagos con información del paciente y doctor asociado al turno.

**Scenario: Pagos sin filtros**
- **WHEN** se llama `GET /finanzas/pagos`
- **THEN** devuelve array de pagos con paciente, doctor, monto, moneda, método, fecha

**Scenario: Filtrar por método de pago**
- **WHEN** se llama `GET /finanzas/pagos?metodo_pago=efectivo`
- **THEN** solo devuelve pagos cuyo `metodo_pago` sea "efectivo"

**Scenario: Filtrar por rango de fechas**
- **WHEN** se llama `GET /finanzas/pagos?fecha_desde=2026-01-01&fecha_hasta=2026-01-31`
- **THEN** devuelve pagos dentro del rango de fecha_pago

**Scenario: Filtrar solo deudores**
- **WHEN** se llama `GET /finanzas/pagos?solo_deudores=true`
- **THEN** solo devuelve pagos de pacientes cuyo saldo en CuentaCorriente sea > 0

**Scenario: Filtros combinados**
- **WHEN** se llama `GET /finanzas/pagos?solo_deudores=true&metodo_pago=transferencia`
- **THEN** combina filtros con AND — solo pagos de deudores por transferencia

### REQ-006: Ordenamiento
Los pagos DEBEN estar ordenados por `fecha_pago` descendente (más recientes primero).

### REQ-007: Pagos sin turno
Los pagos registrados directamente a la cuenta corriente (sin id_turno) DEBEN mostrarse con `turno: null` y paciente igual al dni_paciente del pago.