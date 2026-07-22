# Proposal: Cancelación de Turnos

## What

Reforzar el endpoint `PATCH /turnos/{id}/cancelar` con validación de estado, persistencia de motivo de cancelación independiente y trazabilidad temporal. Endpoint ya existe y funciona — este change agrega las protecciones y campos que faltan para exponerlo con seguridad en frontend2.

## Why

**Auditoría** (`docs/auditoria-cancelacion-turnos.md`) confirmó que cancelación funciona correctamente (libera slot, excluye "Cancelado" de disponibilidad) pero tiene 3 gaps:

1. **Sin bloqueo de estado**: cancelar turno "Realizado" (facturado) es posible sin error → descalce financiero en caja y saldos del paciente.
2. **`motivo` reutilizado como comodín**: al cerrar turno, `motivo` se concatena (`motivo_previo | comentarios`), perdiendo el propósito original. Y al cancelar no queda registro del por qué.
3. **Sin auditoría temporal**: no hay campo `actualizado_en` en `turnos` → C-09 (notificaciones) necesita saber cuándo ocurrió un cambio de estado.

## Scope

- Columna `motivo_cancelacion` (String, nullable) en `turnos`. Separada de `motivo` original.
- Columna `actualizado_en` (DateTime, nullable). Poblada en cancelación y cierre.
- `actualizado_por_id` poblado con usuario autenticado al cancelar y al cerrar.
- `PATCH /turnos/{id}/cancelar`:
  - Body obligatorio `{ motivo_cancelacion: str }` — 422 si falta.
  - Guard: 400 si estado `"Realizado"` o `"Cancelado"`.
  - Guard: 404 si turno no existe.
- `PUT /turnos/{id}/cerrar`: setea `actualizado_en` + `actualizado_por_id`.
- `TurnoResponse` expone `motivo_cancelacion` y `actualizado_en`.
- Tests de integración con DB real.

## Success Criteria

1. Cancelar turno Pendiente → 200, `motivo_cancelacion` guardado, `motivo` intacto, slot liberado.
2. Cancelar turno Realizado → 400.
3. Cancelar turno ya Cancelado → 400.
4. Cancelar sin `motivo_cancelacion` → 422.
5. `actualizado_en` se actualiza al cancelar y al cerrar.
6. Suite completa de tests existentes pasa sin regresiones.

## Dependencies

- C-02 (turnos), C-06 (auth/roles), C-18 (prefijo /api). Todas ✅.
- No depende de C-13 ni C-08 — completamente independiente.
