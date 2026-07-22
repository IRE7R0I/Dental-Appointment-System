# Ajuste de Permisos para Secretaria

## Why

La auditoría de permisos por rol reveló que el rol "secretaria" tiene menos capacidades
de las que necesita para operar el día a día de la clínica. Debe poder gestionar
horarios de doctores y sus días no laborables. Actualmente estas operaciones están
restringidas solo a admin, forzando dependencia innecesaria del admin para tareas
administrativas rutinarias.

La mayoría de estos endpoints ya están protegidos por auth JWT; el ajuste es puramente
de permisos (cambiar `require_role(["admin"])` → `require_role(["admin", "secretaria"])`).

No hay nuevas funcionalidades ni endpoints nuevos. Es un change correctivo de permisos.

## What Changes

- **Horarios de doctor**: `PUT /api/doctores/{id}/horarios` pasa de admin-only
  a admin+secretaria (`backend/routers/doctores.py:113`).
- **Días no laborables**: `POST /api/doctores/{id}/dias-no-laborables` y
  `DELETE /api/doctores/{id}/dias-no-laborables/{fecha}` pasan de admin-only a
  admin+secretaria (`backend/routers/doctores.py:142,159`).
- **PUT ficha de doctor**: `PUT /api/doctores/{id}` **se mantiene admin-only**.
  La secretaria no debe poder modificar nombre, matrícula, especialidad ni color de agenda.
- **Catálogo**: sin cambios. `PUT /api/catalogo/tratamientos/{id}` ya es admin+secretaria
  desde C-18 (auditoría confirmada). Solo se agrega test de regresión.

## Capabilities

### Modified Capabilities

- `permisos-secretaria-horarios`: extiende PUT horarios y POST/DELETE días-no-laborables
  a secretaria. Resto de endpoints de doctor siguen igual.
- `PUT ficha doctor admin-only`: refuerza que la ficha completa del doctor (nombre,
  matrícula, especialidad, color_agenda) sigue siendo exclusiva de admin.

## Impact

- **Código backend**: `backend/routers/doctores.py` — 3 decoradores `require_role`.
  Sin cambios en CRUD, modelos ni schemas.
- **DB**: sin cambios.
- **API**: sin cambios de contrato (mismos endpoints, mismos schemas). Solo cambia quién
  tiene acceso.
- **Tests**:
  - `backend/tests/test_horarios_doctor.py:171` — actualizar `test_put_horarios_doctor_solo_admin`
    para reflejar que secretaria ahora tiene 200.
  - Nuevos tests de regresión: secretaria PUT ficha doctor → 403, secretaria PUT catálogo → 200,
    secretaria POST/DELETE días-no-laborables → 200.
- **Dependencias**: C-18 completado. Sin nuevas dependencias.
