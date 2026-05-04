## Why

El backend actual tiene todas las rutas HTTP en un solo archivo (`main.py`), schemas Pydantic sin separación Request/Response, CRUD sin separación por dominio, y no expone CORS para consumo desde un frontend React. Sin este refactor, la migración frontend (CHANGE-002) y los módulos de finanzas/deudores (CHANGE-003/004) serán difíciles de implementar y mantener.

## What Changes

- Separar `main.py` en routers por dominio usando `APIRouter` (pacientes, turnos, finanzas, doctores)
- Mover carpeta `app/` a `backend/` con estructura de proyecto independiente
- Separar `schemas.py` en archivos por entidad con Create/Response/Update por endpoint
- Separar `crud.py` en archivos por entidad con funciones tipadas
- Agregar modelos faltantes: campo `moneda` a Pago
- Habilitar CORS middleware para origen del frontend React
- Agregar manejo de errores consistente con `HTTPException`
- Agregar `alembic` para migraciones de base de datos
- Refactorizar `main.py` como entrypoint limpio que importa routers
- Mover archivos estáticos HTML/JS a `backend/static/` o dejarlos como referencia

## Capabilities

### New Capabilities
- `refactor-backend-estructura`: Separación de código backend en routers, schemas, CRUD por dominio con estructura de proyecto estándar FastAPI.

### Modified Capabilities
- Ninguna. No hay specs existentes en `openspec/specs/`.

## Impact

- **Código**: `app/main.py`, `app/crud.py`, `app/schemas.py`, `app/models.py`, `app/database.py` serán refactorizados y movidos a `backend/`
- **API**: Los endpoints cambian de ruta (se mantienen funcionalmente idénticos pero organizados por router). La raíz `/` dejará de servir `dashboard.html`.
- **Dependencias**: Se agrega `alembic` a requirements.txt
- **Frontend actual**: Los HTML estáticos dejan de servirse desde FastAPI (se migrarán a React en CHANGE-002)
- **Breaking**: La estructura de archivos cambia (app/ → backend/). El entrypoint deja de ser `app/main.py` y pasa a `backend/main.py`.