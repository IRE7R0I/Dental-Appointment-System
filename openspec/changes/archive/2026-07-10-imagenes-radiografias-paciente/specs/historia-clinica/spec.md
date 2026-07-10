## MODIFIED Requirements

### Requirement: Endpoint de resumen de ficha de paciente
El sistema SHALL exponer un endpoint `GET /pacientes/{dni}/resumen` que devuelva conteos agregados para las tarjetas de resumen de la ficha de paciente en frontend2: cantidad de evoluciones, cantidad de ítems pendientes del plan de tratamiento (con monto estimado), valor `null` para hallazgos (módulo aún no implementado), y conteo real de imágenes asociadas al paciente (contando a través de todas sus carpetas).

#### Scenario: Resumen con datos completos incluyendo imágenes
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/resumen` para un paciente con 12 evoluciones, 3 ítems pendientes del plan, y 8 imágenes distribuidas en 2 carpetas
- **THEN** el sistema retorna `{"hallazgos": null, "pendientes": 3, "pendientes_monto_estimado_ars": 45000.00, "pendientes_monto_estimado_usd": 0.00, "evoluciones": 12, "imagenes": 8}`. El campo `imagenes` DEBE ser un `int` (no `null`)

#### Scenario: Resumen de paciente sin imágenes
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/resumen` para un paciente sin carpetas ni imágenes
- **THEN** el sistema retorna `imagenes: 0` (no `null`)

#### Scenario: Resumen de paciente sin datos clínicos
- **WHEN** un usuario autenticado solicita `GET /pacientes/{dni}/resumen` para un paciente sin evoluciones, sin plan de tratamiento y sin imágenes
- **THEN** el sistema retorna `{"hallazgos": null, "pendientes": 0, "pendientes_monto_estimado_ars": 0.00, "pendientes_monto_estimado_usd": 0.00, "evoluciones": 0, "imagenes": 0}`

#### Scenario: Paciente no encontrado en resumen
- **WHEN** un usuario solicita resumen para un DNI que no existe
- **THEN** el sistema retorna 404 "Paciente no encontrado"
