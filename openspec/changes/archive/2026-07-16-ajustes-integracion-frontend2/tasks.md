# Tasks: Ajustes de Integración para Frontend2

## 1. Schema y modelo: `genero` en pacientes

- [ ] 1.1 Agregar columna `genero = Column(String(20), nullable=True)` en `Paciente` (models.py)
- [ ] 1.2 Agregar `genero: Optional[Literal["Masculino", "Femenino", "Otro"]] = None` en `PacienteCreate`, `PacienteUpdate`, `PacienteResponse` (schemas/pacientes.py)
- [ ] 1.3 Agregar bloque de migración `ALTER TABLE pacientes ADD COLUMN genero VARCHAR(20)` en `crear_tablas.py`

## 2. Reactivación: schema y lógica compartida

- [ ] 2.1 Crear schema `ActivoUpdate(BaseModel): activo: bool` en `schemas/catalogo.py`
- [ ] 2.2 Agregar funciones CRUD `set_activo_doctor(db, id, activo)`, `set_activo_tratamiento(...)`, `set_activo_obra_social(...)` que deleguen en soft-delete cuando `activo=False`
- [ ] 2.3 Agregar `set_activo_usuario(db, id, activo)` en `crud/auth.py` con guard: no desactivar a sí mismo

## 3. Reactivación: endpoints PATCH

- [ ] 3.1 `PATCH /api/doctores/{id}/activo` — admin-only, response `DoctorResponse`
- [ ] 3.2 `PATCH /api/catalogo/tratamientos/{id}/activo` — admin+secretaria, response `TratamientoCatalogoResponse`
- [ ] 3.3 `PATCH /api/catalogo/obras-sociales/{id}/activo` — admin+secretaria, response `ObraSocialResponse`
- [ ] 3.4 `PATCH /api/admin/usuarios/{user_id}/activo` — admin-only, response `UserResponse`, guard self-deactivation
- [ ] 3.5 Mantener `PUT /admin/usuarios/{id}/toggle-activo` (puente transicional frontend viejo) y agregarle guard self-deactivation

## 4. Alertas en ficha de paciente

- [ ] 4.1 Crear `PacienteFichaResponse(PacienteResponse)` con campo `alertas: list[AlertaMedicaResponse] = []` en `schemas/pacientes.py`
- [ ] 4.2 Modificar `GET /pacientes/{dni}` para usar `PacienteFichaResponse` y componer response con `crud.historia_clinica.listar_alertas(db, dni)` (reusa función existente que filtra `activo == True`)

## 5. Prefijo `/api` global

- [ ] 5.1 Agregar `prefix="/api"` a todos los `app.include_router(...)` en `main.py` (10 routers). `/health` queda sin prefijo.
- [ ] 5.2 Eliminar línea `rewrite: (path) => path.replace(/^\/api/, '')` de `frontend/vite.config.ts`
- [ ] 5.3 Actualizar todas las rutas en tests (`backend/tests/*.py`) de `/auth/...`, `/pacientes/...`, etc. a `/api/auth/...`, `/api/pacientes/...`, etc.

## 6. Tests de integración

- [ ] 6.1 Crear `backend/tests/test_ajustes_integracion.py` con casos:
  - Reactivar doctor: desactivar → verificar horario intacto tras reactivar
  - Reactivar usuario: desactivar → login 401 → reactivar → login OK misma password
  - Guard self-deactivation: admin intenta PATCH `{"activo": false}` sobre sí mismo → 403
  - Reactivar tratamiento/obra social: reactivar → reaparece en GET listado
  - Campo `genero`: acepta 3 valores del enum, rechaza valor inválido (422), acepta NULL
  - Ficha incluye alertas activas y excluye soft-deleted
  - Prefijo `/api`: rutas con prefijo responden OK
  - Regresión: ruta vieja sin prefijo → 404
- [ ] 6.2 Ejecutar suite completa de tests para verificar regresión (`pytest backend/tests/ -v`)
