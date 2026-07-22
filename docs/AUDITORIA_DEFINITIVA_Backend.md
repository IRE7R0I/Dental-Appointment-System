# AUDITORIA DEFINITIVA — Backend (OdontoGest)

> **Documento de Auditoría Real del Backend**
> Generado para cruzamiento e integración con `frontend2`.
> Estado del código: **C-20 completado** | Fecha: 2026-07-22

---

## 1. Inventario Completo de Endpoints Reales

Todos los endpoints incluyen el prefijo unificado `/api` (a excepción del `/health` de infraestructura).

---

### 1.1 Autenticación & Sesión (`/api/auth`)

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Público (unauthenticated) | **Body (`LoginRequest`):**<br>`{ username: str, password: str }` | **Schema `TokenResponse`:**<br>`{ access_token: str, refresh_token: str, token_type: str = "bearer" }` |
| `POST` | `/api/auth/refresh` | Público (unauthenticated) | **Body (`TokenRefreshRequest`):**<br>`{ refresh_token: str }` | **Schema `TokenResponse`:**<br>`{ access_token: str, refresh_token: str, token_type: str = "bearer" }` |
| `POST` | `/api/auth/logout` | `admin`, `secretaria` | *Headers:* `Authorization: Bearer <token>` | `{ mensaje: "Sesión cerrada correctamente" }` |
| `GET` | `/api/auth/me` | `admin`, `secretaria` | *Headers:* `Authorization: Bearer <token>` | **Schema `UserResponse`:**<br>`{ id: int, username: str, rol: str, activo: bool, creado_en: datetime }` |

---

### 1.2 Usuarios & Administración (`/api/admin`)

*Dependencia del router: Requiere rol `admin` en todas las rutas.*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/usuarios` | `admin` | *Ninguno* | **`list[UserResponse]`:**<br>`Array<{ id: int, username: str, rol: str, activo: bool, creado_en: datetime }>` |
| `POST` | `/api/admin/usuarios` | `admin` | **Body (`UserCreate`):**<br>`{ username: str, password: str, rol: str = "secretaria" }` | **Schema `UserResponse`** (HTTP 201) |
| `PUT` | `/api/admin/usuarios/{user_id}` | `admin` | **Body (`UserUpdate`):**<br>`{ username?: str, password?: str, current_password?: str }` | **Schema `UserResponse`** |
| `PATCH` | `/api/admin/usuarios/{user_id}/activo` | `admin` | **Body (`ActivoUpdate`):**<br>`{ activo: bool }` | **Schema `UserResponse`** *(Implementado en C-18)* |
| `PUT` | `/api/admin/usuarios/{user_id}/toggle-activo` | `admin` | *Sin Body* | **Schema `UserResponse`** *(DEUDA TÉCNICA DT-01)* |
| `DELETE` | `/api/admin/usuarios/{user_id}` | `admin` | *Path Param:* `user_id: int` | `{ mensaje: "Usuario {username} eliminado" }` |

---

### 1.3 Pacientes (`/api/pacientes`)

*Dependencia del router: Requiere rol `admin` o `secretaria`.*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pacientes/` | `admin`, `secretaria` | *Ninguno* | **`list[PacienteResponse]`:**<br>`Array<{ dni: str, nombre: str, apellido: str, fecha_nacimiento?: date, telefono?: str, email?: EmailStr, obra_social?: str, genero?: "Masculino" \| "Femenino" \| "Otro" }>` |
| `POST` | `/api/pacientes/` | `admin`, `secretaria` | **Body (`PacienteCreate`):**<br>`{ dni: str, nombre: str, apellido: str, fecha_nacimiento?: date, telefono?: str, email?: EmailStr, obra_social?: str, genero?: "Masculino" \| "Femenino" \| "Otro" }` | **Schema `PacienteResponse`** (HTTP 201) |
| `GET` | `/api/pacientes/{dni}` | `admin`, `secretaria` | *Path Param:* `dni: str` | **Schema `PacienteFichaResponse`:**<br>`PacienteResponse` + `{ alertas: list[AlertaMedicaResponse] }` |
| `PUT` | `/api/pacientes/{dni}` | `admin`, `secretaria` | **Body (`PacienteUpdate`):**<br>`{ nombre?: str, apellido?: str, fecha_nacimiento?: date, telefono?: str, email?: EmailStr, obra_social?: str, genero?: "Masculino" \| "Femenino" \| "Otro" }` | **Schema `PacienteResponse`** |
| `GET` | `/api/pacientes/deudores` | `admin`, `secretaria` | **Query Params:**<br>`orden?: "antiguedad_desc" \| "antiguedad_asc"` | **`list[DeudorResponse]`:**<br>`Array<{ dni: str, nombre: str, apellido: str, telefono?: str, saldo_ars: float, saldo_usd: float, dias_antiguedad: int }>` |
| `GET` | `/api/pacientes/historial` | `admin`, `secretaria` | **Query Params:**<br>`dni: str` (requerido), `fecha_desde?: date`, `fecha_hasta?: date` | **Schema `HistorialPacienteResponse`:**<br>`{ dni_paciente: str, nombre: str, apellido: str, saldo_ars: float, saldo_usd: float, turnos: list[HistorialTurnoItemResponse], totales: TotalesHistorial }` |
| `GET` | `/api/pacientes/{dni}/cuenta` | `admin`, `secretaria` | *Path Param:* `dni: str` | **Schema `CuentaCorrienteResponse`:**<br>`{ dni_paciente: str, saldo_ars: float, saldo_usd: float, ultima_actualizacion?: datetime, movimientos: list[MovimientoResponse] }` |
| `GET` | `/api/pacientes/{dni}/turnos-con-deuda` | `admin`, `secretaria` | *Path Param:* `dni: str` | **`list[TurnoConDeudaResponse]`:**<br>`Array<{ id_turno: int, fecha_hora: datetime, motivo?: str, doctor?: { id: int, nombre: str }, total_facturado_ars: float, total_facturado_usd: float, total_pagado_ars: float, total_pagado_usd: float, saldo_pendiente_ars: float, saldo_pendiente_usd: float }>` |

---

### 1.4 Historia Clínica & Alertas (`/api/pacientes`)

*Dependencia del router: Requiere rol `admin` o `secretaria`.*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pacientes/{dni}/alertas` | `admin`, `secretaria` | *Path Param:* `dni: str` | **`list[AlertaMedicaResponse]`:**<br>`Array<{ id: int, tipo: str, descripcion: str, creado_por_id: int, creado_en: datetime }>` |
| `POST` | `/api/pacientes/{dni}/alertas` | `admin`, `secretaria` | **Body (`AlertaMedicaCreate`):**<br>`{ tipo: str, descripcion: str }` | **Schema `AlertaMedicaResponse`** (HTTP 201) |
| `DELETE` | `/api/pacientes/{dni}/alertas/{alerta_id}` | `admin`, `secretaria` | *Path Params:* `dni: str`, `alerta_id: int` | `{ mensaje: "Alerta eliminada" }` |
| `GET` | `/api/pacientes/{dni}/evoluciones` | `admin`, `secretaria` | *Path Param:* `dni: str` | **`list[EvolucionClinicaResponse]`:**<br>`Array<{ id: int, fecha: date, id_turno?: int, dni_paciente: str, pieza_dental?: int, ubicacion_lesion?: str, observaciones: str, conformidad_paciente?: bool, creado_por_id: int, actualizado_por_id?: int, creado_en: datetime, actualizado_en?: datetime }>` |
| `POST` | `/api/pacientes/{dni}/evoluciones` | `admin`, `secretaria` | **Body (`EvolucionClinicaCreate`):**<br>`{ fecha: date, id_turno?: int, pieza_dental?: int, ubicacion_lesion?: str, observaciones: str, conformidad_paciente?: bool }` | **Schema `EvolucionClinicaResponse`** (HTTP 201) |
| `PUT` | `/api/pacientes/{dni}/evoluciones/{evolucion_id}` | `admin`, `secretaria` | **Body (`EvolucionClinicaUpdate`):**<br>`{ fecha?: date, pieza_dental?: int, ubicacion_lesion?: str, observaciones?: str, conformidad_paciente?: bool }` | **Schema `EvolucionClinicaResponse`** |
| `GET` | `/api/pacientes/{dni}/resumen` | `admin`, `secretaria` | *Path Param:* `dni: str` | **Schema `ResumenPacienteResponse`:**<br>`{ hallazgos?: int, evoluciones: int, imagenes: int }` |

---

### 1.5 Imágenes & Radiografías (`/api/pacientes` & `/api/imagenes`)

*Dependencia del router: Requiere rol `admin` o `secretaria`.*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pacientes/{dni}/carpetas` | `admin`, `secretaria` | *Path Param:* `dni: str` | **`list[CarpetaResponse]`:**<br>`Array<{ id: int, dni_paciente: str, nombre: str, creado_en: datetime }>` |
| `POST` | `/api/pacientes/{dni}/carpetas` | `admin`, `secretaria` | **Body (`CarpetaCreate`):**<br>`{ nombre: str }` | **Schema `CarpetaResponse`** (HTTP 201) |
| `PUT` | `/api/pacientes/{dni}/carpetas/{id_carpeta}` | `admin`, `secretaria` | **Body (`CarpetaUpdate`):**<br>`{ nombre: str }` | **Schema `CarpetaResponse`** |
| `DELETE` | `/api/pacientes/{dni}/carpetas/{id_carpeta}` | `admin`, `secretaria` | *Path Params:* `dni: str`, `id_carpeta: int` | `{ mensaje: "Carpeta eliminada" }` |
| `POST` | `/api/pacientes/{dni}/carpetas/{id_carpeta}/imagenes` | `admin`, `secretaria` | **Multipart Form:**<br>`es_radiografia: bool = False`, `archivo: UploadFile` | **Schema `ImagenResponse`:**<br>`{ id: int, id_carpeta: int, nombre_original: str, tipo_mime: str, tamano_bytes: int, es_radiografia: bool, creado_en: datetime }` (HTTP 201) |
| `GET` | `/api/pacientes/{dni}/carpetas/{id_carpeta}/imagenes` | `admin`, `secretaria` | *Path Params:* `dni: str`, `id_carpeta: int` | **`list[ImagenResponse]`** |
| `GET` | `/api/imagenes/{id_imagen}/contenido` | `admin`, `secretaria` | *Path Param:* `id_imagen: int` | Binario `Response(content=bytes, media_type=img.tipo_mime)` |
| `DELETE` | `/api/imagenes/{id_imagen}` | `admin`, `secretaria` | *Path Param:* `id_imagen: int` | `{ mensaje: "Imagen eliminada" }` |

---

### 1.6 Doctores (`/api/doctores`)

*Dependencia general: Requiere rol `admin` o `secretaria` (con overrides específicos a solo `admin`).*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/doctores/` | `admin`, `secretaria` | *Ninguno* | **`list[DoctorResponse]`:**<br>`Array<{ id: int, nombre: str, color_agenda?: str, activo: bool }>` |
| `POST` | `/api/doctores/` | **`admin` únicamente** | **Body (`DoctorCreate`):**<br>`{ nombre: str, color_agenda?: str }` | **Schema `DoctorResponse`** (HTTP 201) |
| `GET` | `/api/doctores/{id}` | `admin`, `secretaria` | *Path Param:* `id: int` | **Schema `DoctorResponse`** |
| `PUT` | `/api/doctores/{id}` | **`admin` únicamente** | **Body (`DoctorUpdate`):**<br>`{ nombre?: str, color_agenda?: str }` | **Schema `DoctorResponse`** |
| `PATCH` | `/api/doctores/{id}/activo` | **`admin` únicamente** | **Body (`ActivoUpdate`):**<br>`{ activo: bool }` | **Schema `DoctorResponse`** *(C-18)* |
| `DELETE` | `/api/doctores/{id}` | **`admin` únicamente** | *Path Param:* `id: int` | **Schema `DoctorResponse`** (Soft delete: `activo=False`) |
| `GET` | `/api/doctores/{id}/horarios` | `admin`, `secretaria` | *Path Param:* `id: int` | **Schema `HorarioDoctorResponse`:**<br>`{ id_doctor: int, nombre_doctor: str, granularidad_minutos: int, dias: dict[str, DiaHorarioEntry] }` *(C-16, C-19)* |
| `PUT` | `/api/doctores/{id}/horarios` | **`admin` únicamente** | **Body (`HorarioDoctorUpdate`):**<br>`{ dias: dict[str, DiaHorarioEntry] }` | **Schema `HorarioDoctorResponse`** *(C-16, C-19: Secretaria 403)* |
| `GET` | `/api/doctores/{id}/dias-no-laborables` | `admin`, `secretaria` | **Query Params:**<br>`desde?: date`, `hasta?: date` | **`list[DiaNoLaborableResponse]`:**<br>`Array<{ id: int, fecha: date, motivo?: str }>` *(C-16, C-19)* |
| `POST` | `/api/doctores/{id}/dias-no-laborables` | **`admin` únicamente** | **Body (`DiaNoLaborableCreate`):**<br>`{ fecha: date, motivo?: str }` | **Schema `DiaNoLaborableResponse`** (HTTP 201) *(C-16, C-19)* |
| `DELETE` | `/api/doctores/{id}/dias-no-laborables/{fecha}` | **`admin` únicamente** | *Path Params:* `id: int`, `fecha: date` | `{ mensaje: "Día no laborable eliminado" }` *(C-16, C-19)* |

---

### 1.7 Turnos & Agenda (`/api/turnos`)

*Dependencia del router: Requiere rol `admin` o `secretaria`.*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/turnos/` | `admin`, `secretaria` | **Query Params:**<br>`fecha?: date`, `id_doctor?: int`, `paciente_dni?: str` | **`list[TurnoResponse]`:**<br>`Array<{ id: int, fecha_hora: datetime, duracion_minutos: int, motivo?: str, dni_paciente: str, id_doctor: int, estado: str, motivo_cancelacion?: str, actualizado_en?: datetime, paciente?: dict, doctor?: dict }>` |
| `GET` | `/api/turnos/hoy` | `admin`, `secretaria` | *Ninguno* | **`list[TurnoResponse]`** |
| `GET` | `/api/turnos/paciente/{dni}` | `admin`, `secretaria` | *Path Param:* `dni: str` | **`list[TurnoResponse]`** |
| `POST` | `/api/turnos/` | `admin`, `secretaria` | **Body (`TurnoCreate`):**<br>`{ fecha_hora: datetime, duracion_minutos: int = 30, motivo?: str, dni_paciente: str, id_doctor: int }` | **Schema `TurnoResponse`** (HTTP 201) |
| `PATCH` | `/api/turnos/{turno_id}/cancelar` | `admin`, `secretaria` | **Body (`TurnoCancelarInput`):**<br>`{ motivo_cancelacion: str }` | **Schema `TurnoResponse`** *(C-20: Cambia estado a "Cancelado")* |
| `PUT` | `/api/turnos/{turno_id}/cerrar` | `admin`, `secretaria` | **Body (`CerrarTurnoInput`):**<br>`{ tratamientos: list[{ nombre: str, cantidad: int, precio_ars?: Decimal, precio_usd?: Decimal }], pagos: list[{ monto: Decimal, moneda: str, metodo_pago: str }], comentarios?: str, pieza_dental?: int, ubicacion_lesion?: str, conformidad_paciente?: bool }` | **Schema `CerrarTurnoResponse`:**<br>`{ turno_id: int, estado: str, total_ars: Decimal, total_usd: Decimal, pagado_ars: Decimal, pagado_usd: Decimal, deuda_ars: Decimal, deuda_usd: Decimal }` |
| `GET` | `/api/turnos/slots` | `admin`, `secretaria` | **Query Params:**<br>`fecha: date` (req), `id_doctor: int` (req) | **`list[SlotResponse]`:**<br>`Array<{ hora: str, estado: "libre" \| "ocupado" \| "bloqueado", turno_id?: int, paciente?: str, motivo?: str, slot_bloqueado_id?: int }>` |
| `POST` | `/api/turnos/slots/bloquear` | `admin`, `secretaria` | **Body (`SlotBloquearInput`):**<br>`{ fecha: date, hora: time, id_doctor: int, motivo?: str }` | **Schema `SlotBloqueadoResponse`:**<br>`{ id: int, fecha: date, hora: time, id_doctor: int, motivo?: str, creado_en: datetime }` (HTTP 201) |
| `DELETE` | `/api/turnos/slots/{slot_id}/desbloquear` | `admin`, `secretaria` | *Path Param:* `slot_id: int` | `{ mensaje: "Slot desbloqueado correctamente" }` |
| `GET` | `/api/turnos/slots/bulk` | `admin`, `secretaria` | **Query Params:**<br>`fecha_desde: date` (req), `fecha_hasta: date` (req), `id_doctor?: str` (ej: "1,2") | **Schema `SlotsBulkResponse`:**<br>`{ fecha_desde: date, fecha_hasta: date, doctores: list[int], dias: dict[str, DaySlotSummary] }` *(C-17)* |
| `DELETE` | `/api/turnos/{turno_id}` | `admin`, `secretaria` | *Path Param:* `turno_id: int` | `{ mensaje: "Turno {turno_id} eliminado correctamente" }` *(DEUDA TÉCNICA DT-02: Borrado físico)* |

---

### 1.8 Finanzas & Caja (`/api/finanzas`)

*Dependencia del router: Requiere rol `admin` o `secretaria`.*

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/finanzas/pagos` | `admin`, `secretaria` | **Body (`PagoCreate`):**<br>`{ monto: Decimal, metodo_pago: str, id_turno?: int, moneda: str = "ARS", dni_paciente?: str, notas?: str }` | **Schema `PagoResponse`:**<br>`{ id: int, fecha_pago: datetime, monto: Decimal, metodo_pago: str, id_turno?: int, moneda: str, dni_paciente?: str, notas?: str, constancia_turno?: str }` (HTTP 201) |
| `GET` | `/api/finanzas/pagos` | `admin`, `secretaria` | **Query Params:**<br>`fecha_desde?: date`, `fecha_hasta?: date`, `metodo_pago?: str`, `dni_paciente?: str`, `id_doctor?: int`, `solo_deudores: bool = False`, `moneda?: str` | **`list[PagoContextoResponse]`:**<br>`Array<{ id: int, fecha_pago: datetime, monto: float, moneda: str, metodo_pago: str, id_turno?: int, dni_paciente?: str, constancia_turno?: str, paciente?: { dni: str, nombre: str, apellido: str }, doctor?: { id: int, nombre: str } }>` |
| `GET` | `/api/finanzas/caja/hoy` | `admin`, `secretaria` | *Ninguno* | **Schema `ResumenCajaResponse`:**<br>`{ turnos_realizados: int, turnos_pendientes: int, turnos_cancelados: int, ingresos_ars: Decimal, ingresos_usd: Decimal, total_ingresos: Decimal }` |

---

### 1.9 Catálogo (`/api/catalogo`)

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload / Schema Pydantic |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/catalogo/tratamientos` | Público | **Query Params:** `categoria?: str` | **`list[TratamientoCatalogoResponse]`:**<br>`Array<{ id: int, nombre: str, precio_ars?: Decimal, precio_usd?: Decimal, duracion_minutos: int, categoria?: str, activo: bool }>` |
| `GET` | `/api/catalogo/tratamientos/{id}` | Público | *Path Param:* `id: int` | **Schema `TratamientoCatalogoResponse`** |
| `POST` | `/api/catalogo/tratamientos` | `admin`, `secretaria` | **Body (`TratamientoCatalogoCreate`):**<br>`{ nombre: str, precio_ars?: Decimal, precio_usd?: Decimal, duracion_minutos: int = 30, categoria?: str }` | **Schema `TratamientoCatalogoResponse`** (HTTP 201) |
| `PUT` | `/api/catalogo/tratamientos/{id}` | `admin`, `secretaria` | **Body (`TratamientoCatalogoUpdate`):**<br>`{ nombre?: str, precio_ars?: Decimal, precio_usd?: Decimal, duracion_minutos?: int, categoria?: str, activo?: bool }` | **Schema `TratamientoCatalogoResponse`** |
| `DELETE` | `/api/catalogo/tratamientos/{id}` | `admin`, `secretaria` | *Path Param:* `id: int` | **Schema `TratamientoCatalogoResponse`** (Soft delete: `activo=False`) |
| `PATCH` | `/api/catalogo/tratamientos/{id}/activo` | `admin`, `secretaria` | **Body (`ActivoUpdate`):**<br>`{ activo: bool }` | **Schema `TratamientoCatalogoResponse`** *(C-18)* |
| `GET` | `/api/catalogo/obras-sociales` | Público | *Ninguno* | **`list[ObraSocialResponse]`:**<br>`Array<{ id: int, nombre: str, activo: bool }>` |
| `POST` | `/api/catalogo/obras-sociales` | `admin`, `secretaria` | **Body (`ObraSocialCreate`):**<br>`{ nombre: str }` | **Schema `ObraSocialResponse`** (HTTP 201) |
| `DELETE` | `/api/catalogo/obras-sociales/{id}` | `admin`, `secretaria` | *Path Param:* `id: int` | **Schema `ObraSocialResponse`** (Soft delete: `activo=False`) |
| `PATCH` | `/api/catalogo/obras-sociales/{id}/activo` | `admin`, `secretaria` | **Body (`ActivoUpdate`):**<br>`{ activo: bool }` | **Schema `ObraSocialResponse`** *(C-18)* |

---

### 1.10 Configuración & Infraestructura (`/api/config` & `/health`)

| Método | Ruta | Roles Permitidos | Request Payload / Query Params | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/config/horarios` | Público | *Ninguno* | Reglas de horario global clínica (`dias_laborables`, `hora_inicio`, `hora_fin`, `duracion_slot_minutos`) |
| `GET` | `/health` | Público | *Ninguno* | `{ status: "ok", version: "0.3.0" }` |

---

## 2. Confirmación de Estado Post Changes C-16 a C-20

El backend actual tiene totalmente implementados y testeados los siguientes sush-changes:

1. **C-16 (`horarios-individuales-por-doctor`)**:
   - Modelo `HorarioDoctor` con franjas independientes `manana` y `tarde` en formato JSON (`["09:00", "13:00"]`).
   - Modelo `DiaNoLaborableDoctor` para bloquear fechas completas por médico.
   - Auto-seeding automático de 7 días al crear un doctor (`seed_horarios_doctor`).
   - Endpoints `/api/doctores/{id}/horarios` y `/api/doctores/{id}/dias-no-laborables`.

2. **C-17 (`agenda-vista-mensual-bulk`)**:
   - Endpoint `/api/turnos/slots/bulk` que procesa rangos de fechas (vista mensual) en 4 consultas SQL optimizadas.
   - Retorna agregados por día y por doctor con conteos de `total`, `libres`, `ocupados`, `bloqueados`.

3. **C-18 (`ajustes-integracion-frontend2`)**:
   - **Prefijo `/api`**: Aplicado unificadamente a todos los routers en `backend/main.py`.
   - **Pacientes**: Soporte para campo `genero` (Literal `"Masculino"`, `"Femenino"`, `"Otro"`) y array de `alertas` médicas incluidas en la ficha (`GET /api/pacientes/{dni}`).
   - **Reactivación / Activo**: Endpoints `PATCH .../activo` agregados en Usuarios, Doctores, Tratamientos y Obras Sociales.

4. **C-19 (`ajuste-permisos-secretaria`)**:
   - Ajuste fino de seguridad RBAC en `backend/routers/doctores.py`.
   - Secretaria tiene permiso de lectura (`GET /api/doctores/{id}/horarios` y `GET .../dias-no-laborables`).
   - Modificaciones estructurales (`PUT /api/doctores/{id}/horarios`, `POST` y `DELETE` de días no laborables, `PUT /api/doctores/{id}`) devuelven **`403 Forbidden`** si las ejecuta una secretaria.

5. **C-20 (`cancelacion-turnos`)**:
   - Endpoint `PATCH /api/turnos/{turno_id}/cancelar` con payload obligatorio `TurnoCancelarInput(motivo_cancelacion: str)`.
   - Actualiza estado del turno a `"Cancelado"`, registra `actualizado_por_id` y `actualizado_en`.
   - Impide cancelar turnos en estado `"Realizado"` o ya cancelados previamente.

---

## 3. Variables de Entorno del Backend (`.env`)

Variables procesadas por `backend/core/config.py` y `backend/database.py`:

```env
# Conexión a Base de Datos (PostgreSQL en prod, SQLite local)
DATABASE_URL=sqlite:///./test.db

# Configuración JWT (Seguridad)
SECRET_KEY=changeme-in-production-use-a-64-char-random-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Credenciales de Admin Inicial (Seed automático en startup si no existe)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

---

## 4. Configuración de CORS y Proxying

Configuración activa en `backend/main.py` (L57-L64):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Integración con `frontend2/server.ts`
- `frontend2` cuenta con un servidor BFF (`server.ts` / Vite proxy) que reenvía peticiones hacia `http://127.0.0.1:8000/api`.
- Al realizarse las peticiones Server-to-Server o a través del proxy de Vite en el puerto `5173`, la configuración actual cubre al 100% las necesidades sin necesidad de exponer orígenes adicionales en el backend.

---

## 5. Deuda Técnica Pendiente (Registrada en `CHANGES.md`)

Deuda técnica heredada o identificada en fases anteriores:

| ID | Endpoint / Componente | Origen | Descripción / Riesgo | Condición de Eliminación |
| :--- | :--- | :--- | :--- | :--- |
| **DT-01** | `PUT /admin/usuarios/{id}/toggle-activo` | C-06, C-18 | Endpoint transicional que invierte el estado booleano sin recibir body explicitando `activo`. Mantenido por compatibilidad con el frontend legacy (`frontend/src/pages/AdminPage.tsx`). | Eliminar una vez que `frontend2/` (C-13) reemplace totalmente a `frontend/` y este último se archive. |
| **DT-02** | `DELETE /turnos/{turno_id}` | C-20 | Endpoint de borrado físico permanente. No posee uso en la UI actual (0 callers). Al borrar en cascada puede desvincular registros de `turnos_tratamientos` pero dejar `pagos.id_turno` huérfanos provocando un descalce en finanzas. | Evaluar en refactor futuro: restringir a solo `admin` o eliminar definitivamente a favor de la cancelación lógica (`PATCH /cancelar`). |

---

## 6. Cruzamiento y Comparativa con `AUDITORIA _DEFINITIVA_Frontend2.md`

### 6.1 Módulos con Coincidencia Total 🟢 (95% Direct Match)
- **Autenticación (`/api/auth`)**: `login`, `refresh`, `logout` y `me` (JWT, `access_token`, `refresh_token`, `UserResponse`).
- **Usuarios & Administración (`/api/admin`)**: `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/:id` y `DELETE /usuarios/:id`.
- **Pacientes (`/api/pacientes`)**: `GET /`, `POST /`, `PUT /:dni`, `GET /deudores`, `GET /historial`, `GET /:dni/cuenta` y `GET /:dni/turnos-con-deuda`.
- **Agenda & Turnos (`/api/turnos`)**: `GET /turnos`, `GET /hoy`, `POST /turnos`, `PATCH /turnos/:id/cancelar` (C-20), `PUT /turnos/:id/cerrar`, `GET /slots`, `POST /slots/bloquear`, `DELETE /slots/:id/desbloquear` y `GET /slots/bulk` (C-17).
- **Finanzas & Caja (`/api/finanzas`)**: `POST /pagos`, `GET /pagos` (con filtros) y `GET /caja/hoy`.
- **Catálogo & Configuración (`/api/catalogo`, `/api/config`)**: Tratamientos, obras sociales y `/config/horarios`.

### 6.2 Puntos de Ajuste / Diferencias de Contrato API (Ajustar en C-13) 🟡
1. **Días No Laborables (`/api/doctores`)**:
   - `Frontend2 Mock Esperaba`: `POST /api/doctores/:id/dias-no-laborables` con `{ fecha, accion: 'remover' }`.
   - `Backend Real (C-16/C-19)`: Utiliza `DELETE /api/doctores/{id}/dias-no-laborables/{fecha}`.
2. **Imágenes & Radiografías (`/api/pacientes`)**:
   - `Frontend2 Mock Esperaba`: Lista plana `GET /api/pacientes/:dni/imagenes`.
   - `Backend Real (C-15)`: Estructura por carpetas (`/carpetas` e `/imagenes`) y servicio binario WebP en `GET /api/imagenes/{id_imagen}/contenido`.
3. **Reactivación / Activo (C-18)**:
   - `Backend Real`: Implementa `PATCH /api/.../{id}/activo` con `{ activo: boolean }` para usuarios, doctores, tratamientos y obras sociales.
4. **Campo `especialidad` en Doctores**:
   - `Backend Real`: No posee columna `especialidad` en DB. `frontend2` deriva el dato en la UI dinámicamente mediante `getDoctorSpecialty(nombre)`.

---
*Fin de la Auditoría Definitiva del Backend.*

