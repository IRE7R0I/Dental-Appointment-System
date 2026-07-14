# Design: agenda-vista-mensual-bulk

## Endpoint

```
GET /turnos/slots/bulk?fecha_desde=2026-08-01&fecha_hasta=2026-08-31&id_doctor=1,2
```

- `fecha_desde`, `fecha_hasta`: required, date (ISO 8601)
- `id_doctor`: optional, comma-separated integers (e.g. `1,2,3`). Si se omite, todos los doctores activos.

### Response shape (Opción B — Híbrido)

```json
{
  "fecha_desde": "2026-08-01",
  "fecha_hasta": "2026-08-31",
  "doctores": [1, 2],
  "dias": {
    "2026-08-01": {
      "total": 16, "libres": 12, "ocupados": 3, "bloqueados": 1,
      "por_doctor": {
        "1": {"total": 8, "libres": 6, "ocupados": 1, "bloqueados": 1},
        "2": {"total": 8, "libres": 6, "ocupados": 2, "bloqueados": 0}
      }
    },
    "2026-08-02": {
      "total": 0, "libres": 0, "ocupados": 0, "bloqueados": 0,
      "por_doctor": {}
    }
  }
}
```

**Reglas:**
- Todos los días del rango aparecen explícitamente (incluso con total: 0).
- `por_doctor` se omite si no hay doctores con slots ese día (total: 0 con objeto vacío).
- Día no laborable (patrón vacío o excepción) → total: 0 para ese doctor.
- Turnos de 60 min (duración > 30) cuentan como 2 slots ocupados.
- Turnos solo cuentan si `estado IN ('Pendiente', 'Realizado')`.

## Strategy: 4 bulk queries + Python aggregation

No se genera cada slot individual en SQL (requeriría CTE recursiva o tabla de
números — sobre-ingeniería para ~20 slots/día). En su lugar:

| # | Query | Tabla |
|---|-------|-------|
| 1 | Cargar patrón semanal | `horarios_doctor` |
| 2 | Cargar excepciones en rango | `dias_no_laborables_doctor` |
| 3 | Cargar turnos en rango | `turnos` |
| 4 | Cargar bloqueos en rango | `slots_bloqueados` |

Luego Python itera fecha × doctor (máx ~42 × 3 = 126 iteraciones) y
calcula conteos por intersección de sets de slots (HH:MM).

**Complejidad:** O(D × F × S) donde D=doctores, F=días, S=slots/día.
Peor caso: 3 × 42 × 20 = 2520 operaciones → < 5ms.

## File changes

| File | Change |
|------|--------|
| `backend/schemas/turnos.py` | +3 schemas: `SlotsBulkQuery`, `DoctorSlotSummary`, `DaySlotSummary`, `SlotsBulkResponse` |
| `backend/crud/turnos.py` | +función `obtener_slots_bulk()` |
| `backend/routers/turnos.py` | +endpoint `GET /turnos/slots/bulk` |
| `backend/tests/test_slots_bulk.py` | +tests de integración |

## Edge cases

1. **Rango vacío** (fecha_desde > fecha_hasta) → 400 Bad Request
2. **Doctor sin horarios configurados** → fallback a HORARIOS_DEFAULT (misma lógica que C-16)
3. **Doctor inactivo** → si se pide explícitamente por id, igual se calcula (sus datos existen). Si se omite id_doctor, solo doctores activos.
4. **Turno que arranca antes del rango pero termina dentro** → no cuenta (validación por fecha de inicio)
5. **Rango muy grande (> 365 días)** → opcional: limitar a 366 días para evitar abuso
