# Design: Ajustes de Integración para Frontend2

## Context

Auditoría cruzada (`docs/auditoria-cruzada-endpoints.md`) entre los 51 endpoints que frontend2
espera consumir y el backend real. La mayoría de las divergencias (names, shapes) se resuelven
con capa de adaptación frontend, fuera de scope de este change. Quedan 4 gaps que requieren
trabajo real de backend:

1. **Reactivación**: soft-delete es unidireccional (activo → DELETE → inactivo). No hay API
   para reactivar. Frontend2 espera `PATCH .../{id}/activo` en doctores, tratamientos,
   obras-sociales, y usuarios.
2. **Campo `genero`**: ausente en modelo y schemas de Paciente. Frontend2 lo espera en GET y
   POST de pacientes (auditoría items #9, #10).
3. **Alertas en ficha**: `GET /pacientes/{dni}` no incluye alertas médicas. La funcionalidad
   ya existe (C-14) pero se accede por ruta separada. Frontend2 espera todo junto.
4. **Prefijo `/api`**: ningún endpoint lo tiene. Frontend2 asume `/api/...` en todas sus
   llamadas HTTP.

## Goals / Non-Goals

**Goals:**
- Proveer reactivación bidireccional en 4 recursos con patrón uniforme `PATCH .../{id}/activo`.
- Agregar columna `genero` con validación server-side en pacientes.
- Extender `GET /pacientes/{dni}` para incluir alertas médicas activas.
- Agregar prefijo global `/api` a todos los routers, actualizar consumers existentes.

**Non-Goals:**
- No se tocan divergencias de shape (nombres de campos, formatos de response) — son del adapter.
- No se agregar endpoints nuevos fuera de los 4 PATCH.
- No se modifica `GET /pacientes/` (listado) — solo la ficha individual.
- No se migra a Alembic — se mantiene el patrón `crear_tablas.py` + `create_all`.
- No se implementa reset de contraseña para usuarios reactivados.

## Decisions

### D1: Patrón único `PATCH .../{id}/activo` con body `{"activo": bool}`

**Alternativas**: (a) dos endpoints separados (activate/desactivate), (b) toggle sin body
como el existente `PUT /admin/usuarios/{id}/toggle-activo`.

**Decisión**: opción (a) descartada por verbosidad; (b) descartada porque el frontend
necesita saber si activó o desactivó sin depender del estado previo (race condition).
El body explícito resuelve eso. Schema compartido:

```python
class ActivoUpdate(BaseModel):
    activo: bool
```

Funciones CRUD: `set_activo_doctor(db, id, activo)`, `set_activo_tratamiento(...)`,
`set_activo_obra_social(...)`, `set_activo_usuario(...)`. Cuando `activo=False`, delegan
en `soft_delete_*` existente. Cuando `activo=True`, setean `activo=True` en el registro.

### D2: Roles — espejo del DELETE existente

**Decisión**: consistencia con permisos actuales (Opción A del plan):
- Doctores: admin-only (router-level `require_role(["admin"])`, CRUD individual `require_role(["admin"])`)
- Usuarios: admin-only (router-level + endpoint-level)
- Catálogo tratamientos: admin + secretaria (endpoint-level)
- Catálogo obras-sociales: admin + secretaria (endpoint-level)

### D2b: Admin nunca desactivable

**Regla dura**: un usuario con `rol == "admin"` no puede ser desactivado por ningún medio,
ni por otro admin ni por sí mismo. Es un principio de seguridad: el último admin nunca
pierde acceso.

Aplica a:
- `PATCH /admin/usuarios/{user_id}/activo` — rechazar si target es admin y `activo=false`
- `PUT /admin/usuarios/{user_id}/toggle-activo` — rechazar si target es admin y estado
  actual es activo (no permitir toggle a inactivo)
- `DELETE /admin/usuarios/{user_id}` — ya tiene este guard (admin.py:42)

Implementación: en `set_activo_usuario` y `toggle_usuario_activo`, si
`usuario.rol == "admin"` y el estado deseado es inactivo, levantar
`HTTPException(400, "No se puede desactivar un usuario admin")`.

### D3: Usuario reactivado — acceso inmediato

`autenticar_usuario` (crud/auth.py:22) solo chequea `usuario.activo`. Hash nunca se
borra en soft-delete. Reactivar → login OK con misma password. Sin reset ni token adicional.

### D4: Migración de `genero` sin Alembic

Proyecto no usa Alembic. Tablas se crean con `Base.metadata.create_all()` en lifespan
de FastAPI + script `crear_tablas.py` con bloques ALTER TABLE ad-hoc. Mismo patrón:

```python
genero_col = db.execute(text(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name='pacientes' AND column_name='genero'"
)).fetchone()
if not genero_col:
    db.execute(text("ALTER TABLE pacientes ADD COLUMN genero VARCHAR(20)"))
```

Gotcha: `information_schema` es Postgres-only. En SQLite dev (test.db) este bloque
lanza excepción → rollback → tabla se recrea con `create_all` si se borra test.db.
Mismo comportamiento que migraciones previas (columnas `activo` en doctores,
`creado_por_id` en turnos).

Columna nullable, sin default ni backfill.

### D5: `PacienteFichaResponse` vs modificar `PacienteResponse`

**Alternativas**: (a) agregar `alertas` opcional a `PacienteResponse` y usarlo en
todos lados, (b) schema específico solo para el endpoint de ficha.

**Decisión**: (b). Agregar `alertas` a `PacienteResponse` afectaría el listado
`GET /pacientes/` haciendo N+1 queries (una por paciente). Schema separado
`PacienteFichaResponse(PacienteResponse)` con campo `alertas: list[AlertaMedicaResponse]`.
El endpoint `GET /pacientes/{dni}` pasa a usarlo y compone el response llamando
a `listar_alertas(db, dni)` — función existente que ya filtra `activo == True`.

### D6: Prefijo `/api` global

**Alternativas**: (a) prefijo en cada router individual, (b) prefijo global en `main.py`,
(c) mantener sin prefijo y que el proxy/frontend lo maneje.

**Decisión**: (b). Menos superficie de error, una sola línea por mount. `app.include_router(..., prefix="/api")`.
Razones:
- Momento de menor costo: nada deployado a prod, un solo consumer real (frontend viejo
  aislado por proxy Vite).
- `/health` queda en raíz (convención platform healthchecks).
- Alternativa (c) descartada: difiere el problema para después, cuando haya más consumers
  y el cambio sea más costoso.

Impacto en consumers:
| Consumer | Acción |
|----------|--------|
| frontend viejo | Borrar `rewrite` de `vite.config.ts` (ya llama `/api/...`, el proxy lo desnudaba) |
| Tests (7 archivos) | Bulk update a rutas `/api/...` |
| `/health` | Sin cambios (queda en raíz) |

Riesgo aceptado: rutas viejas sin prefijo → 404. Nadie en prod las consume hoy.

### D7: `toggle-activo` como puente transicional

`PUT /admin/usuarios/{id}/toggle-activo` se conserva porque `frontend/src/pages/AdminPage.tsx:144`
lo usa. Es deuda técnica explícita: se eliminará cuando frontend2 reemplace a frontend/
completamente y el viejo se archive. El nuevo `PATCH /api/admin/usuarios/{id}/activo` convive
sin conflicto.

## Risks / Trade-offs

- **[Riesgo] Romper tests existentes con prefijo `/api`** → Mitigación: bulk update
  sistemático en mismo change, suite completa como regresión.
- **[Riesgo] SQLite en dev no soporta `information_schema`** → Mitigación: mismo
  comportamiento que migraciones previas (excepción → rollback → borrar test.db →
  recreate). Documentado en errores.
- **[Riesgo] Admin se desactiva a sí mismo** → Mitigación: guard en `set_activo_usuario`
  y en `toggle_usuario_activo` existente.
- **[Trade-off] `PacienteFichaResponse` duplica campos de `PacienteResponse`** →
  Aceptado: evita N+1 en listados. Si en el futuro se agregan más campos a ficha,
  el schema específico es el lugar correcto.

## Open Questions

- Ninguna. Las 3 preguntas de reglas de negocio fueron resueltas en plan mode.
