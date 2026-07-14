# Tasks: Horarios Individuales por Doctor

## 1. Modelos y DB

- [ ] 1.1 Agregar `HorarioDoctor` a `backend/models.py`
- [ ] 1.2 Agregar `DiaNoLaborableDoctor` a `backend/models.py`
- [ ] 1.3 Agregar `crear_tablas.py:seed_horarios_doctores()` — migración de doctores existentes
- [ ] 1.4 Verificar que `Base.metadata.create_all()` crea las nuevas tablas

## 2. Schemas Pydantic

- [ ] 2.1 Crear `backend/schemas/horarios.py` con todos los schemas:
  - `FranjaHorario`, `DiaHorarioEntry`
  - `HorarioDoctorResponse`, `HorarioDoctorUpdate`
  - `DiaNoLaborableCreate`, `DiaNoLaborableResponse`

## 3. Lógica core (`core/horarios.py`)

- [ ] 3.1 Renombrar `HORARIOS` a `HORARIOS_DEFAULT` y exportarlo
- [ ] 3.2 Implementar `cargar_horario_doctor(db, id_doctor)` → dict con formato HORARIOS
- [ ] 3.3 Implementar `generar_slots_doctor(db, id_doctor, fecha, duracion=30)`
- [ ] 3.4 Implementar `es_hora_valida_doctor(db, id_doctor, fecha_hora, duracion=30)`
- [ ] 3.5 Implementar `es_dia_laboral_doctor(db, id_doctor, fecha)`
- [ ] 3.6 Implementar `obtener_horarios_doctor_publico(db, id_doctor)` → dict para API
- [ ] 3.7 Implementar `es_dia_no_laborable_doctor(db, id_doctor, fecha)` → bool helper
- [ ] 3.8 Mantener funciones originales (`generar_slots`, `es_hora_valida`, etc.) con `HORARIOS_DEFAULT` para backward compat

## 4. CRUD (`crud/horarios_doctor.py`)

- [ ] 4.1 Crear archivo `backend/crud/horarios_doctor.py`
- [ ] 4.2 `obtener_horario_semanal(db, id_doctor)` → list[HorarioDoctor]
- [ ] 4.3 `guardar_horario_semanal(db, id_doctor, dias_data)` — borra existentes + inserta nuevos (transacción)
- [ ] 4.4 `agregar_dia_no_laborable(db, id_doctor, fecha, motivo)` → DiaNoLaborableDoctor
- [ ] 4.5 `listar_dias_no_laborables(db, id_doctor, desde, hasta)` → list[DiaNoLaborableDoctor]
- [ ] 4.6 `eliminar_dia_no_laborable(db, id_doctor, fecha)` → bool

## 5. Endpoints (`routers/doctores.py`)

- [ ] 5.1 Agregar `GET /doctores/{id}/horarios` — retorna `HorarioDoctorResponse`
- [ ] 5.2 Agregar `PUT /doctores/{id}/horarios` — admin-only, reemplaza patrón semanal
- [ ] 5.3 Agregar `GET /doctores/{id}/dias-no-laborables` — query params `desde`, `hasta`
- [ ] 5.4 Agregar `POST /doctores/{id}/dias-no-laborables` — admin-only, body `DiaNoLaborableCreate`
- [ ] 5.5 Agregar `DELETE /doctores/{id}/dias-no-laborables/{fecha}` — admin-only

## 6. Seeding en alta de doctor

- [ ] 6.1 Modificar `crud/doctores.py:crear_doctor()` para seedear `horarios_doctor` con `HORARIOS_DEFAULT`
- [ ] 6.2 Verificar que `POST /doctores/` retorna el doctor con su horario (o endpoint separado para obtenerlo)

## 7. Impacto en turnos

- [ ] 7.1 `crud/turnos.py:obtener_slots_con_estado()` — cambiar `generar_slots(fecha)` → `generar_slots_doctor(db, id_doctor, fecha)`
- [ ] 7.2 `routers/turnos.py:post_turno()` línea 125 — cambiar `es_hora_valida()` → `es_hora_valida_doctor()`
- [ ] 7.3 `routers/turnos.py:post_bloquear_slot()` línea 90 — cambiar `es_hora_valida()` → `es_hora_valida_doctor()`

## 8. Tests (`backend/tests/test_horarios_doctor.py`)

- [ ] 8.1 Test: seeding al crear doctor (`POST /doctores/` → `GET /doctores/{id}/horarios` tiene patrón default)
- [ ] 8.2 Test: migración inicial (`seed_horarios_doctores()` crea 7 filas por doctor existente)
- [ ] 8.3 Test: GET/PUT ciclo completo (obtener → modificar → guardar → verificar)
- [ ] 8.4 Test: patrón parcial (solo mañanas) → slots generados correctos
- [ ] 8.5 Test: día no laborable → fecha marcada no genera slots
- [ ] 8.6 Test: crear turno en fecha no laborable → 400
- [ ] 8.7 Test: DELETE día no laborable → vuelve a generar slots
- [ ] 8.8 Test: bloquear slot en horario que doctor no trabaja → 400
- [ ] 8.9 Test: secretaria no puede PUT horarios (403)
- [ ] 8.10 Test: secretaria no puede POST/DELETE días no laborables (403)
- [ ] 8.11 Test: baja de doctor no borra filas de horarios ni días no laborables
- [ ] 8.12 Test: secretaria SÍ puede GET horarios y GET días no laborables
- [ ] 8.13 Test: `POST /turnos/` valida contra horario del doctor específico (no global)
- [ ] 8.14 Test: `GET /turnos/slots` usa horario del doctor
- [ ] 8.15 Ejecutar suite completa (`pytest backend/tests/ -v`) y verificar que tests existentes no rompen

## 9. KB y documentación

- [ ] 9.1 Actualizar `knowledge-base/05_reglas_de_negocio.md`: RN-01 ahora refleja horarios per-doctor
- [ ] 9.2 Actualizar `knowledge-base/04_modelo_de_datos.md`: agregar `HorarioDoctor` y `DiaNoLaborableDoctor`
- [ ] 9.3 Actualizar `CHANGES.md`: marcar C-16 como completado al archivar
- [ ] 9.4 Actualizar `AGENTS.md` Sección 4: agregar C-16 al roadmap
