# Spec: Historia Clínica y Plan de Tratamiento

## ADDED Requirements

### Requirement: Alertas médicas del paciente
El sistema SHALL permitir registrar alertas médicas (alergias y condiciones relevantes) asociadas a un paciente. Cada alerta DEBE tener tipo (`alergia` o `condicion`) y descripción. Solo usuarios con rol `admin` o `secretaria` PUEDEN crear, listar o eliminar alertas.

#### Scenario: Crear alerta médica
- **WHEN** un usuario autenticado con rol `admin` o `secretaria` envía `POST /pacientes/{dni}/alertas` con `{"tipo": "alergia", "descripcion": "Alergia a la penicilina"}`
- **THEN** el sistema crea el registro en `alertas_medicas` y retorna 201 con `id`, `tipo`, `descripcion` y `creado_en`

#### Scenario: Listar alertas de un paciente
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/alertas`
- **THEN** el sistema retorna lista de todas las alertas del paciente, ordenadas por `creado_en` descendente

#### Scenario: Eliminar alerta médica
- **WHEN** un usuario autenticado envía `DELETE /pacientes/{dni}/alertas/{id}`
- **THEN** el sistema elimina la alerta y retorna 200

#### Scenario: Usuario no autenticado no puede acceder a alertas
- **WHEN** un usuario sin token JWT intenta cualquier endpoint de alertas
- **THEN** el sistema retorna 401 Unauthorized

### Requirement: Evoluciones clínicas del paciente
El sistema SHALL permitir registrar evoluciones clínicas asociadas a un paciente, con los campos de la tarjeta de registro física: fecha, pieza dental (FDI), ubicación de lesión, observaciones y conformidad del paciente. Cada evolución PUEDE estar asociada a un turno. Si está asociada a un turno, dicho turno DEBE estar en estado "Asistió". Solo usuarios con rol `admin` o `secretaria` PUEDEN crear, listar o corregir evoluciones.

#### Scenario: Crear evolución asociada a turno
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/evoluciones` con `{"fecha": "2026-07-10", "id_turno": 42, "pieza_dental": 15, "ubicacion_lesion": "O,D", "observaciones": "Caries oclusal amplia. Se realiza operatoria.", "conformidad_paciente": true}`
- **THEN** el sistema valida que el turno 42 existe, pertenece al paciente y está en estado "Asistió", crea la evolución y retorna 201

#### Scenario: Crear evolución sin turno (migración papel)
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/evoluciones` con `{"fecha": "2025-03-15", "observaciones": "Extracción pieza 36. Sin complicaciones."}`
- **THEN** el sistema crea la evolución con `id_turno = null`, sin validar estado de turno, y retorna 201

#### Scenario: Rechazar evolución con turno no asistido
- **WHEN** un usuario intenta crear evolución con `id_turno` de un turno en estado "Pendiente" o "Canceló"
- **THEN** el sistema retorna 400 con mensaje "El turno debe estar en estado 'Asistió' para registrar una evolución"

#### Scenario: Listar evoluciones de un paciente
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/evoluciones`
- **THEN** el sistema retorna lista de todas las evoluciones del paciente ordenadas por `fecha` descendente, incluyendo datos del turno asociado si existe

#### Scenario: Corregir evolución clínica
- **WHEN** un usuario autenticado envía `PUT /pacientes/{dni}/evoluciones/{id}` con campos a modificar
- **THEN** el sistema actualiza los campos, registra `actualizado_por_id` y `actualizado_en`, y retorna la evolución actualizada

#### Scenario: Validar códigos de ubicación de lesión
- **WHEN** un usuario envía `ubicacion_lesion` con un código inválido (ej. "X,Z")
- **THEN** el sistema retorna 422 con mensaje indicando los códigos válidos (O, D, G, L, M, I, V, P)

#### Scenario: Validar rango de pieza dental
- **WHEN** un usuario envía `pieza_dental` fuera del rango FDI (ej. 99 o 5)
- **THEN** el sistema retorna 422 con mensaje indicando el rango válido (11-48)

### Requirement: Plan de tratamiento
El sistema SHALL permitir gestionar un plan de tratamiento por paciente, con ítems que PUEDEN estar vinculados al catálogo de tratamientos o ser texto libre. Cada ítem DEBE tener estado (`pendiente` o `completado`) y orden para mantener secuencia. Solo usuarios con rol `admin` o `secretaria` PUEDEN crear, listar, modificar estado o eliminar ítems.

#### Scenario: Crear ítem de plan desde catálogo
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/plan-tratamiento` con `{"id_tratamiento": 5, "estado": "pendiente", "orden": 1}`
- **THEN** el sistema crea el ítem, precargando `descripcion` desde el catálogo, y retorna 201

#### Scenario: Crear ítem de plan con texto libre
- **WHEN** un usuario autenticado envía `POST /pacientes/{dni}/plan-tratamiento` con `{"descripcion": "Corona estética pieza 21", "estado": "pendiente", "orden": 2}`
- **THEN** el sistema crea el ítem con `id_tratamiento = null` y retorna 201

#### Scenario: Listar plan de tratamiento
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/plan-tratamiento`
- **THEN** el sistema retorna lista de ítems ordenados por `orden` ascendente, incluyendo datos del catálogo si `id_tratamiento` está poblado

#### Scenario: Marcar ítem como completado
- **WHEN** un usuario autenticado envía `PUT /pacientes/{dni}/plan-tratamiento/{id}/estado` con `{"estado": "completado"}`
- **THEN** el sistema actualiza el estado y retorna 200

#### Scenario: Eliminar ítem del plan
- **WHEN** un usuario autenticado envía `DELETE /pacientes/{dni}/plan-tratamiento/{id}`
- **THEN** el sistema elimina el ítem y retorna 200

### Requirement: Endpoint de resumen de ficha de paciente
El sistema SHALL exponer un endpoint `GET /pacientes/{dni}/resumen` que devuelva conteos agregados para las tarjetas de resumen de la ficha de paciente en frontend2: cantidad de evoluciones, cantidad de ítems pendientes del plan de tratamiento (con monto estimado), y valores `null` para hallazgos e imágenes (módulos aún no implementados).

#### Scenario: Resumen con datos completos
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/resumen` para un paciente con 12 evoluciones y 3 ítems pendientes (2 con catálogo, sumando $45,000 ARS)
- **THEN** el sistema retorna `{"hallazgos": null, "pendientes": 3, "pendientes_monto_estimado_ars": 45000.00, "pendientes_monto_estimado_usd": 0.00, "evoluciones": 12, "imagenes": null}`

#### Scenario: Resumen de paciente sin datos clínicos
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/resumen` para un paciente sin evoluciones ni plan de tratamiento
- **THEN** el sistema retorna `{"hallazgos": null, "pendientes": 0, "pendientes_monto_estimado_ars": 0.00, "pendientes_monto_estimado_usd": 0.00, "evoluciones": 0, "imagenes": null}`

#### Scenario: Paciente no encontrado en resumen
- **WHEN** un usuario solicita resumen para un DNI que no existe
- **THEN** el sistema retorna 404 "Paciente no encontrado"
