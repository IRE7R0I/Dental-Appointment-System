# Auditoría Cruzada de Endpoints de Backend vs Frontend2 — OdontoGest

Este documento consolida los hallazgos de la auditoría cruzada entre las llamadas esperadas por el frontend (`frontend2` mapeado en `docs/auditoria-endpoints.md`) y la API real de FastAPI implementada en el backend.

---

## 1. Divergencia Global: Prefijo de API y Trailing Slashes

* **Prefijo `/api`:**
  * El frontend espera que **todos** los endpoints tengan el prefijo `/api` (ej. `/api/auth/login`).
  * En el backend real (FastAPI), los routers se incluyen directamente en la raíz de la aplicación, por lo que carecen del prefijo `/api` (ej. `/auth/login`).
  * **Solución recomendada:** Configurar un prefijo global `/api` en la inicialización de FastAPI en `backend/main.py` o mediante la configuración del proxy de desarrollo de Vite en el frontend.
* **Trailing Slashes:**
  * En FastAPI, `/pacientes` y `/pacientes/` son tratados de forma distinta si no se configura explícitamente `redirect_slashes`. Varios endpoints del backend están definidos con trailing slash (ej. `prefix="/pacientes"`, `@router.get("/")` que resulta en `/pacientes/`), mientras que el frontend los llama sin trailing slash.

---

## 2. Auditoría Detallada por Endpoint

A continuación, se detalla el análisis de cada uno de los 51 endpoints clasificados por los módulos del frontend:

### MÓDULO A: Autenticación y Sesión (Login)

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 1 | `POST /api/auth/login` | `POST /auth/login` | Sí | Sí (Público) | El backend retorna adicionalmente `token_type: "bearer"`. |
| 2 | `POST /api/auth/refresh` | `POST /auth/refresh` | Sí | Sí (Público) | |
| 3 | `GET /api/auth/me` | `GET /auth/me` | Sí | Sí (Auth req) | El backend retorna adicionalmente `creado_en`. |

---

### MÓDULO B: Inicio (Dashboard / Agenda del Día)

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 4 | `GET /api/finanzas/caja/hoy` | `GET /finanzas/caja/hoy` | Sí | Sí | El backend añade además `turnos_cancelados` y `total_ingresos`. |
| 5 | `GET /api/turnos/hoy` | `GET /turnos/hoy` | ❌ **No** | Sí | **Divergencia Crítica en Shape:**<br>1. `paciente` es un objeto en el backend (`{nombre, apellido, dni, obra_social}`), el frontend espera string plano `"Apellido, Nombre"`.<br>2. Faltan `doctor_nombre` y `doctor_color` en la raíz (viene sub-objeto `doctor: {id, nombre}`).<br>3. Faltan por completo los arrays inyectados de `tratamientos` y `pagos`. |
| 6 | `GET /api/doctores` | `GET /doctores/` | ❌ **No** | Sí | **Campos Faltantes en Backend:** El backend no tiene ni almacena los campos `matricula`, `telefono` e `email` para los doctores (no están en la base de datos). |
| 7 | `GET /api/catalogo/tratamientos` | `GET /catalogo/tratamientos` | Sí | Sí (Público) | En backend no requiere token para listar. |
| 8 | `GET /api/catalogo/obras-sociales` | `GET /catalogo/obras-sociales` | Sí | Sí (Público) | En backend no requiere token para listar. |
| 9 | `GET /api/pacientes/:dni` | `GET /pacientes/{dni}` | ❌ **No** | Sí | **Campos Faltantes en Backend:** Faltan `genero` y `alertas` en schemas y modelo de base de datos del paciente. |
| 10 | `POST /api/pacientes` | `POST /pacientes/` | ❌ **No** | Sí | **Campos Faltantes en Request:** Mismo faltante de `genero` y `alertas` en el payload de creación. |
| 11 | `POST /api/turnos` | `POST /turnos/` | Sí | Sí | El backend inyecta los objetos `paciente` y `doctor`. |
| 12 | `PATCH /api/turnos/:id/cancelar` | `PATCH /turnos/{turno_id}/cancelar` | Sí | Sí | Nombre del parámetro en el path difiere (`turno_id` vs `id`). |
| 13 | `PUT /api/turnos/:id/cerrar` | `PUT /turnos/{turno_id}/cerrar` | ❌ **No** | Sí | **Divergencias Críticas:**<br>1. **Request:** El campo `comentarios_medicos` se llama `comentarios` en el backend.<br>2. **Response:** Shape completamente diferente. El frontend espera las entidades reales creadas (`turno`, `tratamientos_registrados`, `pagos_registrados`). El backend retorna totales e IDs agregados (`turno_id`, `estado`, `total_ars`, `total_usd`, `pagado_ars`, `pagado_usd`, `deuda_ars`, `deuda_usd`). |

---

### MÓDULO C: Agenda Médica Inteligente

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 14 | `GET /api/config/horarios` | `GET /config/horarios` | ❌ **No** | Sí (Público) | **Divergencia Crítica en Shape:** El frontend espera un rango simple `{ hora_inicio, hora_fin, intervalo_minutos }`. El backend retorna un mapa estructurado de franjas por días de la semana y zonas horarias. |
| 15 | `GET /api/doctores/:id/horarios` | `GET /doctores/{id}/horarios` | ❌ **No** | Sí | **Divergencias en el Mapa de Días:**<br>1. Backend usa nombres de días en español sin acentos (`"lunes"..."domingo"`) como claves de diccionario en vez de números de día (`"1"..."0"`).<br>2. El sub-objeto del backend usa la clave `"manana"` (sin Ñ) y el frontend espera `"mañana"` (con Ñ).<br>3. Faltan `duracion_turno` y `horizonte_dias` en el backend. |
| 16 | `GET /api/doctores/:id/dias-no-laborables` | `GET /doctores/{id}/dias-no-laborables` | ❌ **No** | Sí | **Divergencias Críticas:**<br>1. **Request:** Los query params `desde` y `hasta` son obligatorios en el backend.<br>2. **Response:** El frontend espera un array plano de fechas (`string[]`), el backend retorna un array de objetos `DiaNoLaborableResponse` (`{ id, fecha, motivo }`). |
| 17 | `GET /api/turnos/slots` | `GET /turnos/slots` | Sí | Sí | |
| 18 | `GET /api/turnos/slots/bulk` | `GET /turnos/slots/bulk` | ❌ **No** | Sí | **Divergencias de Request y Shape:**<br>1. **Request:** El backend espera un rango `fecha_desde` / `fecha_hasta` en vez de un array explícito de `fechas`. En el doctor, acepta IDs separados por comas.<br>2. **Response:** El backend añade un wrapper `{ fecha_desde, fecha_hasta, doctores, dias: { [dateStr]: DaySlotSummary } }` en vez de retornar el diccionario directamente en la raíz. |
| 19 | `POST /api/turnos/slots/bloquear` | `POST /turnos/slots/bloquear` | Sí | Sí | |
| 20 | `DELETE /api/turnos/slots/:id/desbloquear` | `DELETE /turnos/slots/{slot_id}/desbloquear` | ❌ **No** | Sí | **Divergencia de Response:** El frontend espera `{ success: true }`, el backend retorna un mensaje: `{"mensaje": "Slot desbloqueado..."}`. |

---

### MÓDULO D: Fichas Clínicas de Pacientes y Diagnósticos

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 21 | `GET /api/pacientes` | `GET /pacientes/` | ❌ **No** | Sí | Mismo faltante de campos: no contiene `genero` ni `alertas`. |
| 22 | `GET /api/pacientes/deudores` | `GET /pacientes/deudores` | ❌ **No** | Sí | **Divergencias de Shape:**<br>1. En backend se llaman `saldo_ars` y `saldo_usd` (en frontend: `saldo_deuda_ars`, `saldo_deuda_usd`).<br>2. En backend se llama `dias_antiguedad` (en frontend: `antiguedad_dias`).<br>3. Falta el campo `fecha_deuda_mas_antigua` en el backend. |
| 23 | `GET /api/pacientes/:dni/cuenta` | `GET /pacientes/{dni}/cuenta` | Sí | Sí | |
| 24 | `GET /api/pacientes/:dni/historia-clinica` | **NO EXISTE** | ❌ **No** | — | **GAP Crítico:** El backend no tiene endpoint para consultar las notas generales persistidas en `HistoriaClinica` (la tabla existe en SQLAlchemy pero no hay ruta de API). |
| 25 | `GET /api/pacientes/historial` | `GET /pacientes/historial` | Sí | Sí | El backend devuelve un wrapper `HistorialPacienteResponse` con datos agregados financieros y de paciente en la raíz, y la lista de turnos dentro del campo `turnos`. El frontend ya cuenta con un fallback programado (`historial || []`). |
| 26 | `GET /api/pacientes/:dni/resumen` | `GET /pacientes/{dni}/resumen` | ❌ **No** | Sí | **Divergencia de Nombres:** El frontend espera `conteo_imagenes` y `conteo_hallazgos`. El backend retorna `imagenes` y `hallazgos` (además de `evoluciones`). |
| 27 | `GET /api/pacientes/:dni/imagenes` | **NO EXISTE** | ❌ **No** | — | **GAP Crítico de Arquitectura:** El backend organiza imágenes de manera jerárquica: `GET /pacientes/{dni}/carpetas` y luego `GET /pacientes/{dni}/carpetas/{id_carpeta}/imagenes`. No existe ruta plana para traer todas las imágenes del paciente. |
| 28 | `PUT /api/pacientes/:dni` | `PUT /pacientes/{dni}` | ❌ **No** | Sí | Faltan campos `genero` y `alertas` en base de datos. |
| 29 | `PUT /api/pacientes/:dni/historia-clinica` | **NO EXISTE** | ❌ **No** | — | **GAP Crítico:** No existe ruta para actualizar las notas generales de la historia clínica. |
| 30 | `POST /api/pacientes/:dni/imagenes` | **NO EXISTE** | ❌ **No** | — | **GAP Crítico de Arquitectura:** El backend requiere subir archivos mediante multipart/form-data binario a una carpeta específica: `POST /pacientes/{dni}/carpetas/{id_carpeta}/imagenes`. El frontend espera enviar un JSON Base64 plano. |
| 31 | `DELETE /api/pacientes/:dni/imagenes/:id` | **NO EXISTE** | ❌ **No** | — | **Divergencia de Ruta:** El backend elimina imágenes de manera generalizada por su ID de recurso: `DELETE /imagenes/{id_imagen}`. No requiere pasar DNI. |

---

### MÓDULO E: Caja, Cobros y Conciliaciones (Caja y Cobros)

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 32 | `GET /api/finanzas/pagos` | `GET /finanzas/pagos` | ❌ **No** | Sí | **Divergencias en Shape:**<br>1. Falta el campo `saldo_pendiente` en la respuesta del backend.<br>2. El nombre del paciente no viene plano en `paciente_nombre`, viene estructurado en el objeto `paciente: {dni, nombre, apellido}`. |
| 33 | `POST /api/finanzas/pagos` | `POST /finanzas/pagos` | ❌ **No** | Sí | **Divergencia:** Falta `saldo_pendiente` en la respuesta del backend. |
| 34 | `GET /api/pacientes/:dni/turnos-con-deuda` | `GET /pacientes/{dni}/turnos-con-deuda` | ❌ **No** | Sí | **Divergencia:** En backend, el campo ID del turno se llama `id_turno`, no `id`. |

---

### MÓDULO F: Catálogo de Servicios e Instituciones Médicas (Catálogo)

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 35 | `POST /api/catalogo/tratamientos` | `POST /catalogo/tratamientos` | Sí | Sí | Ambos roles (admin/secretaria) autorizados en el backend. |
| 36 | `PUT /api/catalogo/tratamientos/:id` | `PUT /catalogo/tratamientos/{id}` | Sí | Sí | |
| 37 | `DELETE /api/catalogo/tratamientos/:id` | `DELETE /catalogo/tratamientos/{id}` | ❌ **No** | Sí | El backend retorna el objeto completo desactivado en vez de un flag `{ success: true }`. |
| 38 | `PATCH /api/catalogo/tratamientos/:id/activo` | **NO EXISTE** | ❌ **No** | — | **GAP:** El backend sólo permite desactivar vía `DELETE` (lógico). No existe ruta PATCH ni forma de volver a activar. |
| 39 | `POST /api/catalogo/obras-sociales` | `POST /catalogo/obras-sociales` | Sí | Sí | |
| 40 | `DELETE /api/catalogo/obras-sociales/:id` | `DELETE /catalogo/obras-sociales/{id}` | ❌ **No** | Sí | El backend retorna el objeto completo desactivado en vez de un flag `{ success: true }`. |
| 41 | `PATCH /api/catalogo/obras-sociales/:id/activo` | **NO EXISTE** | ❌ **No** | — | **GAP:** Similar al de tratamientos. No existe ruta PATCH para alternar estado activo. |

---

### MÓDULO G: Gestión de Personal Médico (Odontólogos)

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 42 | `POST /api/doctores` | `POST /doctores/` | ❌ **No** | Sí (Admin) | Faltan campos `matricula`, `telefono` y `email`. |
| 43 | `PUT /api/doctores/:id` | `PUT /doctores/{id}` | ❌ **No** | Sí (Admin) | Faltan campos `matricula`, `telefono` y `email`. |
| 44 | `PATCH /api/doctores/:id/activo` | **NO EXISTE** | ❌ **No** | — | **GAP:** El backend sólo expone `DELETE /doctores/{id}` para desactivar. No existe PATCH para cambiar el estado activo libremente. |
| 45 | `PUT /api/doctores/:id/horarios` | `PUT /doctores/{id}/horarios` | ❌ **No** | Sí (Admin) | Claves de días en español, `"manana"` sin Ñ, y faltan `duracion_turno` y `horizonte_dias` en backend. |
| 46 | `POST /api/doctores/:id/dias-no-laborables` | `POST /doctores/{id}/dias-no-laborables` | ❌ **No** | Sí (Admin) | **Divergencia Crítica de Response:** El frontend espera `{ success: true, excepciones: string[] }`, pero el backend retorna el objeto individual creado: `{ id, fecha, motivo }`. |
| 47 | `DELETE /api/doctores/:id/dias-no-laborables` | `DELETE /doctores/{id}/dias-no-laborables/{fecha_str}` | ❌ **No** | Sí (Admin) | **Divergencias Críticas:**<br>1. **Ruta:** La fecha se pasa en la URL (`/{fecha_str}`), el frontend la pasa en el body.<br>2. **Response:** El backend retorna un mensaje plano: `{"mensaje": "..."}` en vez de `{ success: true, excepciones: string[] }`. |

---

### MÓDULO H: Gestión Administrativa de Usuarios (Usuarios)

| # | Endpoint Frontend | Endpoint Backend Real | Coincide Shape | Auth Coincide | Notas / Divergencias |
|---|-------------------|------------------------|----------------|---------------|----------------------|
| 48 | `GET /api/admin/usuarios` | `GET /admin/usuarios` | Sí | Sí (Admin) | |
| 49 | `POST /api/admin/usuarios` | `POST /admin/usuarios` | Sí | Sí (Admin) | **Restricción de lógica:** El backend impide la creación de usuarios con rol `admin` por API. Sólo permite crear rol `secretaria`. |
| 50 | `PATCH /api/admin/usuarios/:id/activo` | **NO EXISTE** | ❌ **No** | — | **Divergencia Crítica:** El frontend espera `PATCH` con body `{ activo: boolean }`. El backend tiene `PUT /admin/usuarios/{user_id}/toggle-activo` (sin body, sólo alterna el valor). |
| 51 | `PATCH /api/admin/usuarios/:id/password` | **NO EXISTE** | ❌ **No** | — | **GAP:** No existe ruta especializada para contraseñas. El backend actualiza todo mediante `PUT /admin/usuarios/{user_id}`. |

---

## 3. Matriz de Clasificación (Vistas vs Backend)

A continuación se resume el estado de la integración para los 51 endpoints requeridos por `frontend2`:

### 🟢 Ya existe (Solo conectar / ajustar de forma sencilla)
*Son endpoints que el backend ya expone en el router y cuyas discrepancias son solo de prefijo `/api` global, nombres de variables en el path, o campos adicionales sobrantes:*

1. **Autenticación completa:**
   * `POST /auth/login` (Ajustar prefijo `/api`).
   * `POST /auth/refresh` (Ajustar prefijo `/api`).
   * `GET /auth/me` (Ajustar prefijo `/api`).
2. **Caja diaria:**
   * `GET /finanzas/caja/hoy` (Ajustar prefijo `/api`).
3. **Turnos e historial general:**
   * `POST /turnos/` (Ajustar prefijo `/api` y trailing slash).
   * `PATCH /turnos/{turno_id}/cancelar` (Ajustar prefijo `/api` y parámetro de URL `turno_id` -> `id`).
   * `GET /pacientes/{dni}/cuenta` (Ajustar prefijo `/api`).
   * `GET /pacientes/historial` (Ajustar prefijo `/api`).
4. **Catálogo de Tratamientos y Obras Sociales:**
   * `GET /catalogo/tratamientos` (Ajustar prefijo `/api`).
   * `POST /catalogo/tratamientos` (Ajustar prefijo `/api`).
   * `PUT /catalogo/tratamientos/{id}` (Ajustar prefijo `/api`).
   * `DELETE /catalogo/tratamientos/{id}` (Ajustar prefijo `/api` y formatear response a `{ success: true }`).
   * `GET /catalogo/obras-sociales` (Ajustar prefijo `/api`).
   * `POST /catalogo/obras-sociales` (Ajustar prefijo `/api`).
   * `DELETE /catalogo/obras-sociales/{id}` (Ajustar prefijo `/api` y formatear response a `{ success: true }`).
5. **Administración de cuentas:**
   * `GET /admin/usuarios` (Ajustar prefijo `/api`).
   * `POST /admin/usuarios` (Ajustar prefijo `/api`. Nota: Restringido a rol secretaria).

---

### 🔴 No existe / Gap / Divergencia crítica (Requiere desarrollo o rediseño)
*Endpoints que no están implementados, que requieren alteración estructural de tablas/modelos en la base de datos, o cuyos payloads de request/response son completamente incompatibles:*

1. **Divergencias estructurales en entidades core:**
   * `GET /api/turnos/hoy` (Requiere inyectar tratamientos y pagos reales, y formatear `paciente` y `doctor` para satisfacer la UI).
   * `GET /api/doctores` y sus ABM (`POST /doctores`, `PUT /doctores/{id}`): **Falta agregar columnas `matricula`, `telefono` y `email` en la tabla `doctores`**.
   * `GET /api/pacientes/:dni` (y listado/ABM): **Falta agregar columnas `genero` y `alertas` en la tabla `pacientes`**.
2. **Cierre de turnos y facturación:**
   * `PUT /api/turnos/:id/cerrar` (Requiere renombrar campo `comentarios_medicos` en la request, y rediseñar completamente la response para retornar los objetos recién insertados en lugar de totales numéricos).
3. **Reglas de Agenda y Horarios:**
   * `GET /api/config/horarios` (El backend debe proveer un endpoint simplificado de límites globales `{ hora_inicio, hora_fin, intervalo_minutos }`).
   * `GET /api/doctores/:id/horarios` y `PUT` (El backend debe mapear las claves a números `"1"..."0"`, traducir `"manana"` -> `"mañana"` e inyectar campos de duración y horizonte).
4. **Días No Laborables:**
   * `GET /api/doctores/:id/dias-no-laborables` (Hacer query params `desde` y `hasta` opcionales en backend, y transformar array de objetos a array de strings de fechas).
   * `POST /api/doctores/:id/dias-no-laborables` y `DELETE` (Rediseñar respuestas para retornar lista completa de excepciones actualizadas y mapear la fecha en path en el DELETE).
5. **Agenda de Bloqueos:**
   * `DELETE /api/turnos/slots/:id/desbloquear` (Retornar `{ success: true }` en vez de mensaje de texto).
6. **Módulo de Historia Clínica (Notas globales):**
   * `GET /api/pacientes/:dni/historia-clinica` y `PUT` (Endpoints **inexistentes**. Requiere implementar CRUD para la tabla `HistoriaClinica` para persistir la nota clínica general).
   * `GET /api/pacientes/:dni/resumen` (Renombrar campos devueltos para coincidir con `conteo_imagenes` y `conteo_hallazgos`).
7. **Gestión de imágenes y radiografías:**
   * `GET /api/pacientes/:dni/imagenes`, `POST` y `DELETE` (Incompatibilidad crítica. El backend usa subida jerárquica con archivos binarios reales (`UploadFile`) y carpetas indexadas por ID. El frontend espera un storage plano en base de datos con archivos en Base64).
8. **Mapeo de Finanzas:**
   * `GET /api/finanzas/pagos` y `POST` (Calcular y retornar `saldo_pendiente` en las respuestas de pagos, y aplanar nombre del paciente).
   * `GET /api/pacientes/:dni/turnos-con-deuda` (Renombrar `id_turno` -> `id` en la respuesta).
9. **Activación de elementos en Catálogos, Doctores y Usuarios:**
   * `PATCH /api/catalogo/tratamientos/:id/activo`
   * `PATCH /api/catalogo/obras-sociales/:id/activo`
   * `PATCH /api/doctores/:id/activo`
   * `PATCH /api/admin/usuarios/:id/activo`
   * `PATCH /api/admin/usuarios/:id/password`
   *(Todos son **GAPs**. El backend actual no soporta re-activación por PATCH (sólo soft-delete por DELETE/toggle) ni rutas especializadas para contraseñas de usuarios).*
