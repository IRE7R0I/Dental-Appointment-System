## Context

Backend actual: 5 archivos planos en `app/` con toda la lógica en `main.py`. Sin separación por dominio, sin CORS, schemas Pydantic mezclados (PacienteCreate hereda de Paciente), CRUD sin tipado fino, y modelo Pago sin soporte multimoneda. El frontend React futuro necesita endpoints limpios, CORS habilitado, y schemas response dedicados.

Stack objetivo: FastAPI + SQLAlchemy + Pydantic v2 + Alembic. Base de datos SQLite (dev) / PostgreSQL (prod).

## Goals / Non-Goals

**Goals:**
- Separar código en routers por dominio (pacientes, turnos, doctores, finanzas)
- Schemas Pydantic con Create/Response/Update independientes por entidad
- CRUD separado por entidad con funciones tipadas
- Modelo Pago con campo moneda (ARS/USD)
- CORS habilitado para `http://localhost:5173` (Vite dev server)
- `get_db()` como dependency injection
- Status codes HTTP correctos (201, 404, 400, 204)
- Manejo de errores con `HTTPException`
- Migraciones con Alembic
- Estructura `backend/` independiente

**Non-Goals:**
- No se crean endpoints nuevos (eso es CHANGE-005)
- No se implementa lógica de cuenta corriente (CHANGE-004)
- No se tocan los HTML/JS estáticos (se migran en CHANGE-002)
- No se agrega autenticación

## Decisions

### 1. Router por dominio vs. router único
**Decisión**: `APIRouter` separado por cada dominio.
**Alternativa**: Mantener todo en `main.py`. Descartado porque escala mal y viola separación de concerns.
**Routing**: `backend/routers/pacientes.py`, `routers/turnos.py`, `routers/doctores.py`, `routers/finanzas.py`.

### 2. Estructura de schemas
**Decisión**: Un archivo por entidad: `schemas/pacientes.py`, `schemas/turnos.py`, `schemas/doctores.py`, `schemas/finanzas.py`.
**Alternativa**: Un solo `schemas.py`. Descartado porque los archivos crecerán con cada change.

### 3. CRUD por entidad
**Decisión**: `crud/pacientes.py`, `crud/turnos.py`, `crud/doctores.py`, `crud/finanzas.py`.
**Alternativa**: Un solo `crud.py`. Descartado por mismo motivo que schemas.

### 4. Modelo Pago con moneda
**Decisión**: Agregar columna `moneda: str` (CHECK ARS/USD) y `saldo_pendiente: DECIMAL`.
**Motivo**: HU-002 requiere cobro en ARS o USD. Sin este campo, no se puede desglosar caja por moneda (HU-003).

### 5. Entrypoint único
**Decisión**: `backend/main.py` importa todos los routers y configura CORS + static files.
**Estructura**: `app = FastAPI()` → `app.include_router(...)` para cada router. CORS middleware antes de incluir routers.

### 6. Migraciones con Alembic
**Decisión**: Inicializar Alembic con autogenerate para detectar cambios en modelos.
**Motivo**: Control de versiones sobre schema SQL. Requerido cuando se agreguen modelos en changes futuros.

## Risks / Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Mover `app/` → `backend/` rompe imports existentes | Hacer en un solo commit. Actualizar `crear_tablas.py` para que use `backend.models`. Verificar que `uvicorn` apunte a `backend.main:app` |
| CORS mal configurado bloquea frontend | Usar `CORSMiddleware` con `allow_origins=["http://localhost:5173"]` y methods/headers explícitos |
| Alembic autogenerate puede fallar con cambios complejos | Revisar migraciones generadas manualmente antes de aplicar |
| Static files HTML dejan de servirse | El entrypoint `/` redirige a 404 o mensaje "Frontend en migración". Los HTML se mantienen como referencia inerte |

## Migration Plan

1. Crear estructura `backend/` con `__init__.py`
2. Mover `database.py`, `models.py` a `backend/`
3. Crear `backend/routers/` con los 4 routers
4. Crear `backend/schemas/` con schemas separados por entidad
5. Crear `backend/crud/` con CRUD separados por entidad
6. Refactorizar `backend/main.py` como entrypoint limpio
7. Agregar campo `moneda` y `saldo_pendiente` a modelo Pago
8. Inicializar Alembic y generar migración inicial
9. Probar que todos los endpoints funcionan igual
10. Actualizar `crear_tablas.py` y `requirements.txt`
11. Eliminar archivos `app/` viejos (opcional, mantener como backup)

## Open Questions

- Puerto y host del frontend Vite: asumimos `localhost:5173`. Confirmar antes de merge.