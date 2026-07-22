
# Tasks: Ajuste de Permisos para Secretaria

## 1. Backend — Permisos en doctores

- [x] 1.1 Cambiar `require_role(["admin"])` → `require_role(["admin", "secretaria"])` en `PUT /api/doctores/{id}/horarios` (`backend/routers/doctores.py:113`)
- [x] 1.2 Cambiar `require_role(["admin"])` → `require_role(["admin", "secretaria"])` en `POST /api/doctores/{id}/dias-no-laborables` (`backend/routers/doctores.py:142`)
- [x] 1.3 Cambiar `require_role(["admin"])` → `require_role(["admin", "secretaria"])` en `DELETE /api/doctores/{id}/dias-no-laborables/{fecha}` (`backend/routers/doctores.py:159`)
- [x] 1.4 Verificar que `PUT /api/doctores/{id}` (ficha completa) mantiene `require_role(["admin"])` — sin cambios

## 2. Tests

- [x] 2.1 Actualizar `test_put_horarios_doctor_solo_admin` en `backend/tests/test_horarios_doctor.py:171` — secretaria ahora debe recibir 200 (no 403)
- [x] 2.2 Nuevo test: secretaria hace `PUT /api/doctores/{id}` con payload completo de ficha (nombre, matricula, especialidad, color_agenda) → `403 Forbidden`
- [x] 2.3 Nuevo test: secretaria hace `PUT /api/catalogo/tratamientos/{id}` → `200 OK` (regresión para comportamiento ya existente desde C-18)
- [x] 2.4 Nuevo test: secretaria hace `POST /api/doctores/{id}/dias-no-laborables` → `201 Created`
- [x] 2.5 Nuevo test: secretaria hace `DELETE /api/doctores/{id}/dias-no-laborables/{fecha}` → `200 OK`
- [x] 2.6 Ejecutar suite completa (`pytest backend/tests/ -v`) para verificar que no hay regresiones
