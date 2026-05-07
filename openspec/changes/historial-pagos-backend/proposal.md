# Proposal: Backend — Historial de Pagos y Tratamientos

## Problem Statement

El sistema carece de endpoints para ver el historial completo de pagos y tratamientos por paciente. La secretaría necesita ver qué tratamientos se realizaron, cuánto costaron, cómo se pagó cada turno, y el detalle de todos los pagos registrados en el sistema para futura exportación a planillas.

## Capabilities

- endpoint-historial-paciente
- endpoint-listado-pagos
- schemas-historial-tratamientos

## Stakeholders

- Personal administrativo
- Contadores

## Success Metrics

- `GET /pacientes/{dni}/historial` devuelve turnos con tratamientos y pagos
- `GET /finanzas/pagos` devuelve todos los pagos filtrables con datos de paciente y turno
- Los endpointsusan joinedload para evitar N+1 queries

## Technical Approach

**Endpoint historial paciente:**
- `GET /pacientes/{dni}/historial`
- Filtro opcional por `fecha_desde` y `fecha_hasta` (query params)
- Devuelve turnos Realizados + Cancelados del paciente
- Cada turno incluye: doctor, tratamientos, pagos a ese turno, totales por turno

**Endpoint listado pagos:**
- `GET /finanzas/pagos`
- Params: `fecha_desde`, `fecha_hasta`, `metodo_pago`, `dni_paciente`, `id_doctor`, `solo_deudores`
- Devuelve cada pago con datos del paciente y turno asociado

## Risks

- Queries pesadas si hay muchos turnos sin paginación → agregar paginación si escala
- joinedload con relaciones muy anidadas puede impactar memoria → usar selectinload donde corresponda