# CHANGE-011: Tareas de Implementación

> Depende de CHANGE-009 (auth). Orden exacto.

---

## 🔧 Backend

### 1. Agregar modelos a models.py
- [ ] `TratamientoCatalogo`: id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo
- [ ] `ObraSocial`: id, nombre, activo
- [ ] Validación: al menos un precio (ARS o USD) en TratamientoCatalogo
- **Archivos**: `backend/models.py`

### 2. Crear schemas/catalogo.py
- [ ] `TratamientoCatalogoCreate` (validator: al menos un precio)
- [ ] `TratamientoCatalogoUpdate`
- [ ] `TratamientoCatalogoResponse` (Config: from_attributes)
- [ ] `ObraSocialCreate`
- [ ] `ObraSocialResponse` (Config: from_attributes)
- **Archivos**: `backend/schemas/catalogo.py`

### 3. Crear crud/catalogo.py
- [ ] `listar_tratamientos(db, categoria?)` → activos, ordenados por nombre
- [ ] `obtener_tratamiento(db, id)` → Optional[TratamientoCatalogo]
- [ ] `crear_tratamiento(db, data: TratamientoCatalogoCreate)`
- [ ] `actualizar_tratamiento(db, id, data: TratamientoCatalogoUpdate)`
- [ ] `soft_delete_tratamiento(db, id)` → activo=false
- [ ] `listar_obras_sociales(db)` → activas
- [ ] `crear_obra_social(db, data: ObraSocialCreate)`
- [ ] `actualizar_obra_social(db, id, data: ObraSocialCreate)`
- [ ] `soft_delete_obra_social(db, id)` → activo=false
- **Archivos**: `backend/crud/catalogo.py`

### 4. Crear routers/catalogo.py
- [ ] Router `prefix="/catalogo"`, tags=["Catálogo"]
- [ ] `GET /catalogo/tratamientos` → público (sin auth requerida para CHANGE-007)
- [ ] `GET /catalogo/tratamientos/{id}` → público
- [ ] `POST /catalogo/tratamientos` → require_role(["admin","secretaria"])
- [ ] `PUT /catalogo/tratamientos/{id}` → require_role(["admin","secretaria"])
- [ ] `DELETE /catalogo/tratamientos/{id}` → require_role(["admin"])
- [ ] `GET /catalogo/obras-sociales` → público
- [ ] `POST /catalogo/obras-sociales` → require_role(["admin"])
- [ ] `PUT /catalogo/obras-sociales/{id}` → require_role(["admin"])
- [ ] `DELETE /catalogo/obras-sociales/{id}` → require_role(["admin"])
- **Archivos**: `backend/routers/catalogo.py`

### 5. Registrar router y seed
- [ ] `app.include_router(catalogo.router)` en main.py
- [ ] Agregar seed de obras sociales a `backend/seed.py`:
  - Crear las 7 obras sociales si no existen
- [ ] Ejecutar seed y verificar
- **Archivos**: `backend/main.py`, `backend/seed.py`

## 🎨 Frontend

### 6. Crear CatalogoPage.tsx
- [ ] Ruta protegida: solo admin y secretaria
- [ ] Tabla de tratamientos con columnas: nombre, ARS, USD, duración, categoría, acciones
- [ ] Botón [+ Nuevo tratamiento] → modal con formulario
- [ ] Click en fila → modal de edición (precarga datos)
- [ ] Botón eliminar → confirmación → soft-delete
- [ ] Filtro por categoría (chips horizontales)
- [ ] Sección secundaria: lista de obras sociales (más simple, solo nombre + eliminar)
- [ ] Usar frontend-design SKILL
- **Archivos**: `frontend/src/pages/CatalogoPage.tsx`

### 7. Agregar ruta en App.tsx
- [ ] `<Route path="/catalogo" element={<PrivateRoute><CatalogoPage /></PrivateRoute>} />`
- [ ] Agregar entrada en NavigationRail ("Catálogo")
- **Archivos**: `frontend/src/App.tsx`, `frontend/src/components/NavigationRail.tsx`

### 8. Integrar catálogo en modal de cierre de turno
- [ ] Fetch `GET /catalogo/tratamientos` al abrir modal de cierre
- [ ] Selector con opciones del catálogo + "Servicio Manual" al final
- [ ] Al elegir del catálogo: precarga nombre + precios en los campos (editables)
- [ ] Al elegir "Servicio Manual": campos vacíos, texto libre
- [ ] Los precios precargados son editables (descuentos/recargos)
- **Archivos**: `frontend/src/pages/AgendaPage.tsx`

### 9. Agregar tipos en types/index.ts
- [ ] `interface TratamientoCatalogo { id, nombre, precio_ars?, precio_usd?, duracion_minutos, categoria?, activo }`
- [ ] `interface ObraSocial { id, nombre, activo }`
- **Archivos**: `frontend/src/types/index.ts`

## ✅ Validación

### 10. Testear flujo completo
- [ ] Login como admin → ver CatalogoPage
- [ ] Crear tratamiento "Limpieza dental" con ARS 5000
- [ ] Verificar aparece en GET /catalogo/tratamientos (público, sin auth)
- [ ] Crear tratamiento "Extracción" con ARS 8000 y USD 80
- [ ] Editar precio de "Limpieza" a ARS 5500
- [ ] Soft-delete un tratamiento → no aparece en GET público
- [ ] Verificar obras sociales seed (7 items)
- [ ] Abrir modal de cierre de turno → ver opciones del catálogo
- [ ] Elegir "Limpieza" → precio ARS se precarga en 5500
- [ ] Cambiar precio a 5000 (descuento) → cerrar turno
- [ ] Elegir "Servicio Manual" → escribir "Cirugía compleja" + precio libre
- [ ] Login como secretaria → crear tratamiento (debe funcionar)
- [ ] Login como secretaria → intentar eliminar obra social (debe dar 403)
