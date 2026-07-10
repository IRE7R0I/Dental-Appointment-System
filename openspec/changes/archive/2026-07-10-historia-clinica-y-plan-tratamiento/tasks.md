# Tasks: historia-clinica-y-plan-tratamiento

## 1. Modelos de datos

- [ ] 1.1 Agregar modelo `AlertaMedica` en `backend/models.py` (tabla `alertas_medicas`)
- [ ] 1.2 Agregar modelo `EvolucionClinica` en `backend/models.py` (tabla `evoluciones_clinicas`)
- [ ] 1.3 Agregar modelo `PlanTratamientoItem` en `backend/models.py` (tabla `plan_tratamiento_items`)
- [ ] 1.4 Agregar relaciones en modelo `Paciente`: `alertas_medicas`, `evoluciones_clinicas`, `plan_tratamiento`
- [ ] 1.5 Actualizar `crear_tablas.py` con creación condicional de las 3 tablas nuevas

## 2. Schemas Pydantic

- [ ] 2.1 Crear `backend/schemas/historia_clinica.py` con schemas de alertas: `AlertaMedicaCreate`, `AlertaMedicaResponse`
- [ ] 2.2 Agregar schemas de evoluciones: `EvolucionClinicaCreate`, `EvolucionClinicaUpdate`, `EvolucionClinicaResponse` con validadores de `ubicacion_lesion` (regex O/D/G/L/M/I/V/P) y `pieza_dental` (rango 11-48)
- [ ] 2.3 Agregar schemas de plan de tratamiento: `PlanTratamientoItemCreate`, `PlanTratamientoItemUpdateEstado`, `PlanTratamientoItemResponse`
- [ ] 2.4 Agregar schema `ResumenPacienteResponse` con campos: hallazgos, pendientes, pendientes_monto_estimado_ars, pendientes_monto_estimado_usd, evoluciones, imagenes
- [ ] 2.5 Todos los schemas usan Pydantic v2: `model_config = ConfigDict(from_attributes=True)`

## 3. CRUD

- [ ] 3.1 Crear `backend/crud/historia_clinica.py` con funciones CRUD para alertas (crear, listar_por_paciente, eliminar)
- [ ] 3.2 Agregar funciones CRUD para evoluciones: crear (con validación RN-16), listar_por_paciente, corregir (con registro de `actualizado_por_id` + `actualizado_en`)
- [ ] 3.3 Agregar funciones CRUD para plan de tratamiento: crear, listar_por_paciente, cambiar_estado, eliminar
- [ ] 3.4 Agregar función `obtener_resumen_paciente` que calcule conteos de evoluciones, plan pendiente, y monto estimado

## 4. Router

- [ ] 4.1 Crear `backend/routers/historia_clinica.py` con prefijo `/pacientes`, protegido con `require_role(["admin", "secretaria"])`
- [ ] 4.2 Endpoints de alertas: `GET /{dni}/alertas`, `POST /{dni}/alertas`, `DELETE /{dni}/alertas/{id}`
- [ ] 4.3 Endpoints de evoluciones: `GET /{dni}/evoluciones`, `POST /{dni}/evoluciones`, `PUT /{dni}/evoluciones/{id}`
- [ ] 4.4 Endpoints de plan: `GET /{dni}/plan-tratamiento`, `POST /{dni}/plan-tratamiento`, `PUT /{dni}/plan-tratamiento/{id}/estado`, `DELETE /{dni}/plan-tratamiento/{id}`
- [ ] 4.5 Endpoint de resumen: `GET /{dni}/resumen`
- [ ] 4.6 Registrar router en `backend/main.py` con `app.include_router(historia_clinica.router)`

## 5. Testing

- [ ] 5.1 Crear `backend/tests/test_historia_clinica.py` con fixtures: paciente de prueba, turno "Asistió", turno "Pendiente", usuario admin
- [ ] 5.2 Testear creación de alerta, listado, eliminación (happy path)
- [ ] 5.3 Testear creación de evolución con turno "Asistió" (válido) y con turno "Pendiente" (rechazado 400)
- [ ] 5.4 Testear creación de evolución sin turno (migración papel, fecha manual)
- [ ] 5.5 Testear corrección de evolución (PUT) con verificación de `actualizado_por_id` y `actualizado_en`
- [ ] 5.6 Testear validación de `ubicacion_lesion` (códigos válidos e inválidos) y `pieza_dental` (rango 11-48)
- [ ] 5.7 Testear CRUD completo de plan de tratamiento (crear, listar, cambiar estado, eliminar)
- [ ] 5.8 Testear endpoint de resumen con datos reales y con paciente sin datos
- [ ] 5.9 Testear que usuario no autenticado recibe 401 en todos los endpoints
- [ ] 5.10 Testear que `hallazgos` e `imagenes` en resumen siempre son `null`

## 6. Knowledge Base

- [ ] 6.1 Actualizar `knowledge-base/05_reglas_de_negocio.md` con RN-15 (alertas médicas), RN-16 (evoluciones), RN-17 (plan de tratamiento), RN-18 (no exponer datos clínicos en logs)
- [ ] 6.2 Actualizar `knowledge-base/04_modelo_de_datos.md` con las 3 tablas nuevas

## 7. Finalización

- [ ] 7.1 Verificar que `openspec validate historia-clinica-y-plan-tratamiento` pasa sin errores
- [ ] 7.2 Ejecutar tests con `pytest backend/tests/test_historia_clinica.py -v` — todos pasan
