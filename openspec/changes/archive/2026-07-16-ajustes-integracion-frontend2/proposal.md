# C-18: Ajustes de Integración para Frontend2

## Why

La auditoría cruzada de endpoints (`docs/auditoria-cruzada-endpoints.md`) entre el backend real
y lo que frontend2 espera consumir reveló 4 gaps que requieren trabajo real de backend (no
resolubles solo con capa de adaptación frontend): falta de reactivación tras soft-delete en 4
recursos, ausencia del campo `genero` en pacientes, alertas médicas no incluidas en la ficha
del paciente, y ausencia del prefijo `/api` en todas las rutas. Frontend2 (C-13) está por
arrancar y estos ajustes son prerrequisito práctico para su integración.

## What Changes

- **Reactivación por PATCH** en doctores, catálogo tratamientos, catálogo obras sociales,
  y usuarios admin. Mismo patrón `PATCH .../{id}/activo` con body `{"activo": bool}`
  en los 4 recursos (no lo resuelvas distinto en cada uno).
- **Columna `genero`** en tabla `pacientes`: nullable, enum `Masculino | Femenino | Otro`,
  sin backfill forzado. Schemas Pydantic actualizados.
- **Alertas médicas en ficha**: `GET /pacientes/{dni}` extiende su response para incluir
  lista de alertas activas del paciente (reusa `listar_alertas` de C-14).
- **Prefijo global `/api`** en todos los routers (**BREAKING**). `/health` queda en raíz.
  Frontend viejo: se elimina el `rewrite` del proxy Vite. Tests actualizados.

## Capabilities

### New Capabilities
- `reactivacion-recursos`: endpoints `PATCH .../{id}/activo` en doctores, tratamientos,
  obras-sociales, y usuarios. Schema `ActivoUpdate`. Funciones CRUD `set_activo_*` que
  reusan la lógica de soft-delete existente.
- `genero-paciente`: columna `genero` en modelo Paciente con validación Pydantic vía
  `Literal["Masculino", "Femenino", "Otro"]`. Migración en `crear_tablas.py`.
- `alertas-en-ficha`: response `PacienteFichaResponse` extiende `PacienteResponse` con
  campo `alertas: list[AlertaMedicaResponse]`. Endpoint `GET /pacientes/{dni}` compone
  la respuesta con `listar_alertas` existente.

### Modified Capabilities
- `api-prefix-global`: todos los routers montados con `prefix="/api"` en `main.py`.
  Ruta `/health` permanece sin prefijo. Tests y proxy Vite actualizados.

## Impact

- **Código**: `backend/main.py`, `backend/models.py`, `backend/routers/doctores.py`,
  `backend/routers/catalogo.py`, `backend/routers/admin.py`, `backend/routers/pacientes.py`,
  `backend/crud/doctores.py`, `backend/crud/catalogo.py`, `backend/crud/auth.py`,
  `backend/crud/historia_clinica.py`, `backend/schemas/pacientes.py`,
  `backend/schemas/catalogo.py` (nuevo `ActivoUpdate`), `crear_tablas.py`,
  `frontend/vite.config.ts` (eliminar rewrite)
- **DB**: nueva columna `pacientes.genero VARCHAR(20) NULL`. Sin nuevas tablas.
- **API**: 4 nuevos endpoints PATCH, campo `genero` en schemas de paciente,
  campo `alertas` en response de ficha, prefijo `/api/` en todas las rutas (**BREAKING**).
- **Tests**: nuevo `backend/tests/test_ajustes_integracion.py`. Todos los tests existentes
  actualizados a rutas `/api/...`.
- **Deuda técnica transicional**: `PUT /admin/usuarios/{id}/toggle-activo` se conserva
  como puente mientras el frontend viejo esté en uso. Debe eliminarse cuando frontend2
  lo reemplace por completo y frontend/ se archive (ver Sección Deuda Técnica en CHANGES.md).
- **Dependencias**: C-06 (auth), C-07 (catálogo), C-14 (alertas), C-16 (horarios doctor).
  Todas completadas.
