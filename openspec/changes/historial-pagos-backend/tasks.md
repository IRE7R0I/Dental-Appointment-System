# Tasks: Historial de Pagos — Backend

## Phase 1: Schemas

- [ ] 1.1 Crear `HistorialTratamientoResponse` en `backend/schemas/turnos.py` (nombre, cantidad, precio_ars, precio_usd)
- [ ] 1.2 Crear `PagoResponse` simplificado para historial (`id`, `fecha`, `monto`, `moneda`, `metodo_pago`)
- [ ] 1.3 Crear `HistorialTurnoItemResponse` (turno individual con doctor, tratamientos, pagos, totales por turno)
- [ ] 1.4 Crear `HistorialPacienteResponse` (respuesta completa con `turnos[]`, `totales{}`, `saldo_ars`, `saldo_usd`)
- [ ] 1.5 Crear `PagoContextoResponse` en `backend/schemas/finanzas.py` (pago + paciente + doctor + turno_id)
- [ ] 1.6 Agregar `dni_paciente: Optional[str] = None` a `Pago` schema para registrar sin turno

## Phase 2: CRUD

- [ ] 2.1 Crear función `obtener_historial_paciente(db, dni, fecha_desde, fecha_hasta)` en `backend/crud/pacientes.py` — query turnos con joinedload(tratamientos, pagos, doctor, paciente), filtro estado Realizado/Cancelado
- [ ] 2.2 Crear función `listar_pagos_filtrados(db, fecha_desde, fecha_hasta, metodo_pago, dni_paciente, id_doctor, solo_deudores)` en `backend/crud/finanzas.py`
- [ ] 2.3 Dentro de `listar_pagos_filtrados`: normalizar método "banco"/"mercadopago" → "transferencia" para filtro
- [ ] 2.4 Dentro de `listar_pagos_filtrados`: implementar lógica `solo_deudores` con subquery sobre CuentaCorriente

## Phase 3: Routers

- [ ] 3.1 Crear `GET /pacientes/{dni}/historial` en `backend/routers/pacientes.py` — params opcionales `fecha_desde`, `fecha_hasta`
- [ ] 3.2 El endpoint de historial calcula totales en Python (no en SQL) y arma la respuesta completa
- [ ] 3.3 Crear `GET /finanzas/pagos` en `backend/routers/finanzas.py` — params: `fecha_desde`, `fecha_hasta`, `metodo_pago`, `dni_paciente`, `id_doctor`, `solo_deudores`
- [ ] 3.4 Verificar que `crear_pago` en `crud/finanzas.py` ya inserte `dni_paciente` cuando existe turno

## Phase 4: Verificación

- [ ] 4.1 Probar `GET /pacientes/{dni}/historial` en Swagger con paciente real
- [ ] 4.2 Probar filtros de fecha en historial
- [ ] 4.3 Probar `GET /finanzas/pagos` sin filtros (todos los pagos)
- [ ] 4.4 Probar filtros `metodo_pago`, `solo_deudores`, `fecha_desde/hasta` por separado
- [ ] 4.5 Probar filtros combinados (AND)
- [ ] 4.6 Verificar que no haya N+1 queries (inspeccionar logs de SQL)