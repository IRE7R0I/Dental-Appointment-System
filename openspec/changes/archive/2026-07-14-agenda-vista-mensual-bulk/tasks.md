# Tasks: agenda-vista-mensual-bulk

## 1. Schemas
- [ ] `DoctorSlotSummary` — counts per doctor per day (total, libres, ocupados, bloqueados)
- [ ] `DaySlotSummary` — counts per day + `por_doctor: dict[str, DoctorSlotSummary]`
- [ ] `SlotsBulkResponse` — wrapper (fecha_desde, fecha_hasta, doctores, dias)

## 2. CRUD layer
- [ ] `obtener_slots_bulk(db, fecha_desde, fecha_hasta, doctores_ids)` en `backend/crud/turnos.py`
  - Query 1: `horarios_doctor` WHERE id_doctor IN (...)
  - Query 2: `dias_no_laborables_doctor` WHERE id_doctor IN (...) AND fecha BETWEEN
  - Query 3: `turnos` WHERE id_doctor IN (...) AND fecha_hora in range, estado Pendiente/Realizado
  - Query 4: `slots_bloqueados` WHERE id_doctor IN (...) AND fecha BETWEEN
  - Python: contar slots 30min por patrón, restar ocupados y bloqueados
  - Turnos >30min ocupan N slots (60min = 2 slots)

## 3. Router
- [ ] `GET /turnos/slots/bulk` en `backend/routers/turnos.py`
  - Parse `fecha_desde`, `fecha_hasta` (required)
  - Parse `id_doctor` (optional, comma-separated → list[int])
  - Si no se pasa id_doctor, default a todos los doctores activos
  - Validar fecha_desde <= fecha_hasta
  - Llamar `obtener_slots_bulk()`, devolver `SlotsBulkResponse`

## 4. Tests
- [ ] `backend/tests/test_slots_bulk.py`
  - Test: rango de 7 días con doctores de distinto patrón (lun-vie vs solo mañana)
  - Test: mes con excepciones (feriados) puntuales — día marcado debe dar total:0
  - Test: rango que cruza dos meses
  - Test: doctor sin turnos ni bloqueos → todo libres según patrón
  - Test: turno 60min ocupa 2 slots
  - Test: rango con fecha_desde > fecha_hasta → 400
  - Test: sin id_doctor → usa todos los activos
  - Test: id_doctor con doctor inactivo → no incluido si omitido, sí incluido si explícito

## 5. Docs
- [ ] Actualizar `CHANGES.md` — agregar C-17 con estado pendiente
- [ ] Actualizar `AGENTS.md` Sección 4 — agregar C-17 al roadmap
