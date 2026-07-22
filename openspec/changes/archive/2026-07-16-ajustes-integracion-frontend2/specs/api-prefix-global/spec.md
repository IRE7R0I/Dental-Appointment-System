# api-prefix-global

Prefijo `/api` en todos los routers de FastAPI.

## Routing

```python
# main.py
app.include_router(auth.router,              prefix="/api")
app.include_router(admin.router,             prefix="/api")
app.include_router(pacientes.router,         prefix="/api")
app.include_router(turnos.router,            prefix="/api")
app.include_router(doctores.router,          prefix="/api")
app.include_router(finanzas.router,          prefix="/api")
app.include_router(catalogo.router,          prefix="/api")
app.include_router(config_router.router,     prefix="/api")
app.include_router(historia_clinica.router,  prefix="/api")
app.include_router(imagenes.router,          prefix="/api")
app.include_router(imagenes.imagenes_router, prefix="/api")
```

`/health` permanece en raíz (sin prefijo) — convención platform healthchecks.

## Rutas resultantes

| Antes | Después |
|-------|---------|
| `/auth/login` | `/api/auth/login` |
| `/pacientes/` | `/api/pacientes/` |
| `/doctores/{id}` | `/api/doctores/{id}` |
| ... | `/api/...` |

Rutas viejas sin prefijo → `404 Not Found`.

## Consumer updates

| Consumer | Cambio |
|----------|--------|
| `frontend/vite.config.ts` | Eliminar línea `rewrite: (path) => path.replace(/^\/api/, '')` |
| `backend/tests/*.py` | Todas las rutas de `"/xxx"` → `"/api/xxx"` |

## Breaking change

**BREAKING**: toda llamada HTTP sin prefijo `/api` deja de funcionar. Nadie en producción
está afectado (C-11 deploy pendiente). Único consumer activo (frontend viejo) se actualiza
en este mismo change.
