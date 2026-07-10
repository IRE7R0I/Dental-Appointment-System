# Relevamiento Técnico del Backend — OdontoGest

Este documento actúa como relevamiento técnico detallado y fuente de verdad complementaria a [AUDITORIA_FRONTEND.md](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/docs/AUDITORIA_FRONTEND.md) para el diseño de `frontend2/`. Permite conocer los contratos reales, esquemas Pydantic, modelos SQLAlchemy, lógica de negocio y restricciones de seguridad del backend actual, incluyendo las implementaciones del cambio `C-12`.

---

## 1. Índice de routers

| Prefijo del Router | Archivo del Router | Roles Permitidos por Defecto | Roadmap Change |
| :--- | :--- | :--- | :--- |
| `/auth` | [auth.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/auth.py) | Público (Sin auth por defecto) | C-06 `auth-y-autorizacion` |
| `/admin` | [admin.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/admin.py) | `admin` | C-06 `auth-y-autorizacion` |
| `/pacientes` | [pacientes.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/pacientes.py) | `admin` \| `secretaria` | C-02 `gestion-pacientes-y-turnos` <br> C-04 `cuentas-corrientes-y-deudores` |
| `/turnos` | [turnos.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/turnos.py) | `admin` \| `secretaria` | C-02 `gestion-pacientes-y-turnos` <br> C-03 `finanzas-y-caja-diaria` <br> C-12 `correccion-horarios-doctores-pagos` |
| `/doctores` | [doctores.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/doctores.py) | `admin` \| `secretaria` (Ver Nota 1) | C-02 `gestion-pacientes-y-turnos` <br> C-12 `correccion-horarios-doctores-pagos` |
| `/finanzas` | [finanzas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/finanzas.py) | `admin` \| `secretaria` | C-03 `finanzas-y-caja-diaria` |
| `/catalogo` | [catalogo.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/catalogo.py) | Público (GET) <br> `admin` \| `secretaria` (POST/PUT/DELETE) | C-07 `catalogo-tratamientos` |
| `/config` | [config.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/config.py) | Público | C-12 `correccion-horarios-doctores-pagos` |

> [!NOTE]
> *Nota 1:* A nivel router, `/doctores` permite `admin` y `secretaria`, pero los endpoints de mutación (`POST /`, `PUT /{id}`, `DELETE /{id}`) sobrescriben la autorización exigiendo estrictamente rol `admin`.
> *Reescritura de Rutas:* Aunque en FastAPI los prefijos se declaran sin `/api`, el servidor de desarrollo de Vite redirige las peticiones desde `/api/*` hacia `http://localhost:8000/*` eliminando el prefijo mediante una regla de reescritura (`rewrite: (path) => path.replace(/^\/api/, '')`).

---

## 2. Inventario completo de endpoints

### 2.1. Router de Autenticación (`/auth`)

#### `POST /auth/login`
- **Request Body:** `LoginRequest`
  - `username`: `str` (requerido)
  - `password`: `str` (requerido)
- **Response Shape:** `TokenResponse` (200 OK)
  - `access_token`: `str`
  - `refresh_token`: `str`
  - `token_type`: `str` (default `"bearer"`)
- **Errores Posibles:**
  - `401 Unauthorized`: "Credenciales inválidas" (si el usuario no existe, está inactivo, o la contraseña es errónea).
- **Roles Permitidos:** Público.
- **Rate Limiting:** Ninguno.
- **Estado:** ✅ Consumido por el frontend actual.

#### `POST /auth/refresh`
- **Request Body:** `TokenRefreshRequest`
  - `refresh_token`: `str` (requerido)
- **Response Shape:** `TokenResponse` (200 OK)
- **Errores Posibles:**
  - `401 Unauthorized`: "Refresh token inválido o expirado" o "Token inválido".
- **Roles Permitidos:** Público.
- **Rate Limiting:** Ninguno.
- **Estado:** ✅ Consumido por el frontend actual.

#### `POST /auth/logout`
- **Request Body:** Ninguno (cabecera `Authorization: Bearer <token>`).
- **Response Shape:** `{"mensaje": "Sesión cerrada correctamente"}` (200 OK).
- **Errores Posibles:**
  - `401 Unauthorized`.
- **Roles Permitidos:** Autenticados (cualquier rol).
- **Rate Limiting:** Ninguno.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /auth/me`
- **Request Body:** Ninguno (cabecera `Authorization: Bearer <token>`).
- **Response Shape:** `UserResponse` (200 OK)
  - `id`: `int`
  - `username`: `str`
  - `rol`: `str`
  - `activo`: `bool`
  - `creado_en`: `datetime`
- **Errores Posibles:**
  - `401 Unauthorized`.
- **Roles Permitidos:** Autenticados.
- **Rate Limiting:** Ninguno.
- **Estado:** ⚠️ **No consumido** por el frontend actual (dead code).

---

### 2.2. Router de Administración (`/admin`)
*Nota:* Todo el router hereda la dependencia `require_role(["admin"])`.

#### `POST /admin/usuarios`
- **Request Body:** `UserCreate`
  - `username`: `str` (requerido)
  - `password`: `str` (requerido)
  - `rol`: `str` (default `"secretaria"`)
- **Response Shape:** `UserResponse` (201 Created)
- **Errores Posibles:**
  - `401 Unauthorized` / `403 Forbidden`.
  - `400 Bad Request`: "Solo se puede crear rol secretaria" (si se envía otro rol).
- **Roles Permitidos:** `admin`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /admin/usuarios`
- **Request Body:** Ninguno.
- **Response Shape:** `list[UserResponse]` (200 OK)
- **Roles Permitidos:** `admin`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `PUT /admin/usuarios/{user_id}/toggle-activo`
- **Request Body:** Ninguno.
- **Response Shape:** `UserResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Usuario no encontrado".
- **Roles Permitidos:** `admin`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `DELETE /admin/usuarios/{user_id}`
- **Request Body:** Ninguno.
- **Response Shape:** `{"mensaje": "Usuario <username> eliminado"}` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Usuario no encontrado".
  - `400 Bad Request`: "No se puede eliminar un admin".
- **Roles Permitidos:** `admin`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `PUT /admin/usuarios/{user_id}`
- **Request Body:** `UserUpdate`
  - `username`: `Optional[str]`
  - `password`: `Optional[str]`
  - `current_password`: `Optional[str]`
- **Response Shape:** `UserResponse` (200 OK)
- **Errores Posibles:**
  - `400 Bad Request`: "Debe ingresar la contraseña actual" (si es self-edit del admin).
  - `403 Forbidden`: "Contraseña actual incorrecta".
  - `404 Not Found`: "Usuario no encontrado".
- **Roles Permitidos:** `admin`.
- **Estado:** ✅ Consumido por el frontend actual.

---

### 2.3. Router de Pacientes (`/pacientes`)
*Nota:* Todo el router requiere rol `admin` o `secretaria`.

#### `GET /pacientes/`
- **Request Body:** Ninguno.
- **Response Shape:** `list[PacienteResponse]` (200 OK)
  - `dni`: `str`
  - `nombre`: `str`
  - `apellido`: `str`
  - `fecha_nacimiento`: `Optional[date]`
  - `telefono`: `Optional[str]`
  - `email`: `Optional[EmailStr]`
  - `obra_social`: `Optional[str]`
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /pacientes/deudores`
- **Request Body:** Ninguno.
- **Response Shape:** `list[DeudorResponse]` (200 OK)
  - `dni`: `str`
  - `nombre`: `str`
  - `apellido`: `str`
  - `telefono`: `Optional[str]`
  - `saldo_ars`: `float`
  - `saldo_usd`: `float`
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /pacientes/historial`
- **Query Parameters:**
  - `dni`: `str` (requerido)
  - `fecha_desde`: `Optional[date]`
  - `fecha_hasta`: `Optional[date]`
- **Response Shape:** `HistorialPacienteResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Paciente no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /pacientes/{dni}`
- **Request Body:** Ninguno (Path parameter `dni`).
- **Response Shape:** `PacienteResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Paciente no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `POST /pacientes/`
- **Request Body:** `PacienteCreate`
- **Response Shape:** `PacienteResponse` (201 Created)
- **Errores Posibles:**
  - `400 Bad Request`: "El DNI ya está registrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `PUT /pacientes/{dni}`
- **Request Body:** `PacienteUpdate`
- **Response Shape:** `PacienteResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Paciente no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /pacientes/{dni}/cuenta`
- **Request Body:** Ninguno.
- **Response Shape:** `CuentaCorrienteResponse` (200 OK)
  - `dni_paciente`: `str`
  - `saldo_ars`: `float`
  - `saldo_usd`: `float`
  - `ultima_actualizacion`: `Optional[datetime]`
  - `movimientos`: `list[MovimientoResponse]`
- **Errores Posibles:**
  - `404 Not Found`: "Paciente no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

---

### 2.4. Router de Turnos (`/turnos`)
*Nota:* Todo el router requiere rol `admin` o `secretaria`.

#### `GET /turnos/`
- **Query Parameters:**
  - `fecha`: `Optional[date]`
  - `id_doctor`: `Optional[int]`
  - `paciente_dni`: `Optional[str]`
- **Response Shape:** `list[TurnoResponse]` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /turnos/hoy`
- **Request Body:** Ninguno.
- **Response Shape:** `list[TurnoResponse]` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /turnos/paciente/{dni}`
- **Request Body:** Ninguno.
- **Response Shape:** `list[TurnoResponse]` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "No se encontraron turnos para este paciente".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ⚠️ **No consumido** por el frontend actual (dead code).

#### `POST /turnos/`
- **Request Body:** `TurnoCreate`
  - `fecha_hora`: `datetime` (requerido)
  - `duracion_minutos`: `int` (default `30`)
  - `motivo`: `Optional[str]`
  - `dni_paciente`: `str` (requerido)
  - `id_doctor`: `int` (requerido)
- **Response Shape:** `TurnoResponse` (201 Created)
- **Errores Posibles:**
  - `400 Bad Request`: "El horario está fuera del horario de atención o la granularidad es inválida" (si no pasa la validación centralizada de `es_hora_valida`).
  - `400 Bad Request`: "El doctor ya tiene un turno que se solapa en ese horario".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `PATCH /turnos/{turno_id}/cancelar`
- **Request Body:** Ninguno.
- **Response Shape:** `TurnoResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Turno no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `DELETE /turnos/{turno_id}`
- **Request Body:** Ninguno.
- **Response Shape:** `{"mensaje": "Turno <id> eliminado correctamente"}` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Turno no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ⚠️ **No consumido** por el frontend actual.

#### `PUT /turnos/{turno_id}/cerrar`
- **Request Body:** `CerrarTurnoInput`
- **Response Shape:** `CerrarTurnoResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Turno no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /turnos/slots` [NEW]
- **Query Parameters:**
  - `fecha`: `date` (requerido)
  - `id_doctor`: `int` (requerido)
- **Response Shape:** `list[SlotResponse]` (200 OK)
  - `hora`: `str` (formato `"HH:MM"`)
  - `estado`: `"libre" | "ocupado" | "bloqueado"`
  - `turno_id`: `Optional[int]`
  - `paciente`: `Optional[str]` (apellido si está ocupado)
  - `motivo`: `Optional[str]` (motivo de bloqueo si está bloqueado)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ⚠️ **No consumido** por el frontend actual (se consume en el roadmap C-12).

#### `POST /turnos/slots/bloquear` [NEW]
- **Request Body:** `SlotBloquearInput`
  - `fecha`: `date`
  - `hora`: `time`
  - `id_doctor`: `int`
  - `motivo`: `Optional[str]`
- **Response Shape:** `SlotBloqueadoResponse` (201 Created)
- **Errores Posibles:**
  - `400 Bad Request`: "El slot no está dentro del horario de atención".
  - `409 Conflict`: "El slot ya tiene un turno asignado", "El slot ya está bloqueado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ⚠️ **No consumido** por el frontend actual.

#### `DELETE /turnos/slots/{slot_id}/desbloquear` [NEW]
- **Request Body:** Ninguno (Path parameter `slot_id`).
- **Response Shape:** `{"mensaje": "Slot desbloqueado correctamente"}` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Slot bloqueado no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ⚠️ **No consumido** por el frontend actual.

---

### 2.5. Router de Doctores (`/doctores`)

#### `GET /doctores/`
- **Request Body:** Ninguno.
- **Response Shape:** `list[DoctorResponse]` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `POST /doctores/`
- **Request Body:** `DoctorCreate`
  - `nombre`: `str`
  - `color_agenda`: `Optional[str]` (valida formato `#RRGGBB`)
- **Response Shape:** `DoctorResponse` (201 Created)
- **Errores Posibles:**
  - `422 Unprocessable Entity`: Formato hex de color inválido.
- **Roles Permitidos:** `admin`. (Anula rol `secretaria` en este endpoint).
- **Estado:** ⚠️ **No consumido** por el frontend actual.

#### `GET /doctores/{id}`
- **Request Body:** Ninguno.
- **Response Shape:** `DoctorResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Doctor no encontrado".
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ⚠️ **No consumido** por el frontend actual.

#### `PUT /doctores/{id}`
- **Request Body:** `DoctorUpdate`
- **Response Shape:** `DoctorResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Doctor no encontrado".
- **Roles Permitidos:** `admin`. (Anula rol `secretaria` en este endpoint).
- **Estado:** ⚠️ **No consumido** por el frontend actual.

#### `DELETE /doctores/{id}`
- **Request Body:** Ninguno (Soft delete).
- **Response Shape:** `DoctorResponse` (200 OK)
- **Errores Posibles:**
  - `404 Not Found`: "Doctor no encontrado".
- **Roles Permitidos:** `admin`. (Anula rol `secretaria` en este endpoint).
- **Estado:** ⚠️ **No consumido** por el frontend actual.

---

### 2.6. Router de Finanzas (`/finanzas`)
*Nota:* Todo el router requiere rol `admin` o `secretaria`.

#### `POST /finanzas/pagos`
- **Request Body:** `PagoCreate`
- **Response Shape:** `PagoResponse` (201 Created)
  - Incluye `constancia_turno`: `Optional[str]` (ej: `"14/06 - Perez (16:30)"`)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /finanzas/pagos`
- **Query Parameters:**
  - `fecha_desde`, `fecha_hasta`, `metodo_pago`, `dni_paciente`, `id_doctor`, `solo_deudores`
- **Response Shape:** `list[PagoContextoResponse]` (200 OK)
  - Incluye `constancia_turno`: `Optional[str]`
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /finanzas/caja/hoy`
- **Request Body:** Ninguno.
- **Response Shape:** `ResumenCajaResponse` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

---

### 2.7. Router de Catálogo (`/catalogo`)

#### `GET /catalogo/tratamientos`
- **Query Parameters:** `categoria`
- **Response Shape:** `list[TratamientoCatalogoResponse]` (200 OK)
- **Roles Permitidos:** Público.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /catalogo/tratamientos/{id}`
- **Response Shape:** `TratamientoCatalogoResponse` (200 OK)
- **Roles Permitidos:** Público.
- **Estado:** ⚠️ **No consumido** por el frontend actual.

#### `POST /catalogo/tratamientos`
- **Request Body:** `TratamientoCatalogoCreate`
- **Response Shape:** `TratamientoCatalogoResponse` (201 Created)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `PUT /catalogo/tratamientos/{id}`
- **Request Body:** `TratamientoCatalogoUpdate`
- **Response Shape:** `TratamientoCatalogoResponse` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `DELETE /catalogo/tratamientos/{id}`
- **Response Shape:** `TratamientoCatalogoResponse` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `GET /catalogo/obras-sociales`
- **Response Shape:** `list[ObraSocialResponse]` (200 OK)
- **Roles Permitidos:** Público.
- **Estado:** ✅ Consumido por el frontend actual.

#### `POST /catalogo/obras-sociales`
- **Request Body:** `ObraSocialCreate`
- **Response Shape:** `ObraSocialResponse` (201 Created)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

#### `DELETE /catalogo/obras-sociales/{id}`
- **Response Shape:** `ObraSocialResponse` (200 OK)
- **Roles Permitidos:** `admin` \| `secretaria`.
- **Estado:** ✅ Consumido por el frontend actual.

---

### 2.8. Router de Configuración (`/config`) [NEW]

#### `GET /config/horarios` [NEW]
- **Request Body:** Ninguno.
- **Response Shape:** `obtener_horarios_publicos` (200 OK)
  - `zona_horaria`: `str`
  - `dias`: `dict` (con rangos `"mañana"` y `"tarde"` en formato `"HH:MM"`)
  - `granularidad_minutos`: `int` (default `30`)
- **Roles Permitidos:** Público.
- **Rate Limiting:** Ninguno.
- **Estado:** ⚠️ **No consumido** por el frontend actual (se introduce para `frontend2/`).

---

## 3. Modelos de datos (SQLAlchemy)

Los modelos mapeados en [models.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/models.py) corresponden a las siguientes tablas de base de datos:

### 3.1. Tabla `pacientes` (`Paciente`)
- **Columnas:**
  - `dni`: `String(20)` — **Primary Key**, Index.
  - `nombre`: `String(100)` — NOT NULL.
  - `apellido`: `String(100)` — NOT NULL.
  - `fecha_nacimiento`: `Date` — Nullable.
  - `telefono`: `String(20)` — Nullable.
  - `email`: `String(100)` — Nullable.
  - `obra_social`: `String(100)` — Nullable.
- **Relaciones:**
  - `turnos`: 1:N con `Turno` (`back_populates="paciente"`).
  - `historia_clinica`: 1:1 con `HistoriaClinica` (`back_populates="paciente"`, `uselist=False`).
- **Tipo de borrado:** Hard-delete.

### 3.2. Tabla `doctores` (`Doctor`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `nombre`: `String(100)` — NOT NULL.
  - `color_agenda`: `String(7)` — Nullable.
  - `activo`: `Boolean` — DEFAULT `True` (Control para **soft-delete**).
- **Relaciones:**
  - `turnos`: 1:N con `Turno` (`back_populates="doctor"`).
- **Tipo de borrado:** Soft-delete.

### 3.3. Tabla `turnos` (`Turno`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `fecha_hora`: `DateTime` — NOT NULL.
  - `duracion_minutos`: `Integer` — DEFAULT `30`.
  - `motivo`: `String(255)` — Nullable.
  - `estado`: `String(50)` — DEFAULT `"Pendiente"`.
  - `dni_paciente`: `String(20)` — **Foreign Key** (`pacientes.dni`).
  - `id_doctor`: `Integer` — **Foreign Key** (`doctores.id`).
  - `creado_por_id`: `Integer` — **Foreign Key** (`usuarios.id`), Nullable.
  - `actualizado_por_id`: `Integer` — **Foreign Key** (`usuarios.id`), Nullable.
- **Índices:**
  - Índice compuesto: `Index('ix_turno_fecha_doctor', 'fecha_hora', 'id_doctor')`.
- **Relaciones:**
  - `paciente`: N:1 con `Paciente` (`back_populates="turnos"`).
  - `doctor`: N:1 con `Doctor` (`back_populates="turnos"`).
  - `pagos`: 1:N con `Pago` (`back_populates="turno"`).
  - `tratamientos`: 1:N con `TurnoTratamiento` (`back_populates="turno"`, `cascade="all, delete-orphan"`).
- **Tipo de borrado:** Hard-delete con borrado en cascada sobre tratamientos.

### 3.4. Tabla `turnos_tratamientos` (`TurnoTratamiento`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `id_turno`: `Integer` — **Foreign Key** (`turnos.id`), NOT NULL.
  - `nombre`: `String(255)` — NOT NULL.
  - `cantidad`: `Integer` — DEFAULT `1`.
  - `precio_ars`: `DECIMAL(10, 2)` — Nullable.
  - `precio_usd`: `DECIMAL(10, 2)` — Nullable.
- **Relaciones:**
  - `turno`: N:1 con `Turno` (`back_populates="tratamientos"`).
- **Tipo de borrado:** Hard-delete.

### 3.5. Tabla `pagos` (`Pago`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `monto`: `DECIMAL(10, 2)` — NOT NULL.
  - `fecha_pago`: `DateTime` — DEFAULT `datetime.now`.
  - `metodo_pago`: `String(50)` — Nullable.
  - `moneda`: `String(3)` — DEFAULT `"ARS"`.
  - `saldo_pendiente`: `DECIMAL(10, 2)` — Nullable.
  - `dni_paciente`: `String(20)` — **Foreign Key** (`pacientes.dni`), Nullable.
  - `id_turno`: `Integer` — **Foreign Key** (`turnos.id`), Nullable.
- **Relaciones:**
  - `turno`: N:1 con `Turno` (`back_populates="pagos"`).
  - `paciente`: N:1 con `Paciente` (`foreign_keys=[dni_paciente]`).
- **Tipo de borrado:** Hard-delete.

### 3.6. Tabla `cuentas_corrientes` (`CuentaCorriente`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `dni_paciente`: `String(20)` — **Foreign Key** (`pacientes.dni`), **UNIQUE**, NOT NULL.
  - `saldo_ars`: `DECIMAL(10, 2)` — DEFAULT `0.00`.
  - `saldo_usd`: `DECIMAL(10, 2)` — DEFAULT `0.00`.
  - `ultima_actualizacion`: `DateTime` — DEFAULT `datetime.now` y `onupdate=datetime.now`.
- **Relaciones:**
  - `paciente`: 1:1 con `Paciente` (`backref="cuenta_corriente"`, `uselist=False`).
  - `movimientos`: 1:N con `MovimientoCuenta` (`back_populates="cuenta"`, ordena por fecha DESC).
- **Tipo de borrado:** Hard-delete.

### 3.7. Tabla `movimientos_cuenta` (`MovimientoCuenta`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `id_cuenta`: `Integer` — **Foreign Key** (`cuentas_corrientes.id`), NOT NULL.
  - `tipo`: `String(20)` — NOT NULL (Valores: `"cargo"` o `"pago"`).
  - `monto`: `DECIMAL(10, 2)` — NOT NULL.
  - `moneda`: `String(3)` — NOT NULL, DEFAULT `"ARS"`.
  - `descripcion`: `String(255)` — Nullable.
  - `fecha`: `DateTime` — DEFAULT `datetime.now`.
- **Relaciones:**
  - `cuenta`: N:1 con `CuentaCorriente` (`back_populates="movimientos"`).
- **Tipo de borrado:** Hard-delete.

### 3.8. Tabla `historias_clinicas` (`HistoriaClinica`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `notas`: `Text` — Nullable.
  - `ultima_actualizacion`: `DateTime` — `onupdate=datetime.now`.
  - `dni_paciente`: `String(20)` — **Foreign Key** (`pacientes.dni`).
- **Relaciones:**
  - `paciente`: 1:1 con `Paciente` (`back_populates="historia_clinica"`).
- **Tipo de borrado:** Hard-delete.

### 3.9. Tabla `usuarios` (`Usuario`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `username`: `String(50)` — **UNIQUE**, Index, NOT NULL.
  - `hashed_password`: `String(255)` — NOT NULL.
  - `rol`: `String(20)` — DEFAULT `"secretaria"` (Valores: `"admin"` o `"secretaria"`).
  - `activo`: `Boolean` — DEFAULT `True`.
  - `creado_en`: `DateTime` — DEFAULT `datetime.now`.
- **Tipo de borrado:** Hard-delete.

### 3.10. Tabla `tratamientos_catalogo` (`TratamientoCatalogo`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `nombre`: `String(255)` — NOT NULL.
  - `precio_ars`: `DECIMAL(10, 2)` — Nullable.
  - `precio_usd`: `DECIMAL(10, 2)` — Nullable.
  - `duracion_minutos`: `Integer` — DEFAULT `30`.
  - `categoria`: `String(100)` — Nullable.
  - `activo`: `Boolean` — DEFAULT `True` (Control para **soft-delete**).
- **Tipo de borrado:** Soft-delete.

### 3.11. Tabla `obras_sociales` (`ObraSocial`)
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `nombre`: `String(100)` — **UNIQUE**, NOT NULL.
  - `activo`: `Boolean` — DEFAULT `True`.
- **Tipo de borrado:** Soft-delete.

### 3.12. Tabla `slots_bloqueados` (`SlotsBloqueado`) [NEW]
- **Columnas:**
  - `id`: `Integer` — **Primary Key**, Index.
  - `fecha`: `Date` — NOT NULL.
  - `hora`: `Time` — NOT NULL.
  - `id_doctor`: `Integer` — **Foreign Key** (`doctores.id`), NOT NULL.
  - `motivo`: `String(255)` — Nullable.
  - `bloqueado_por_id`: `Integer` — **Foreign Key** (`usuarios.id`), NOT NULL.
  - `creado_en`: `DateTime` — DEFAULT `datetime.now`.
- **Índices y Constraints:**
  - Restricción UNIQUE compuesta: `UniqueConstraint('fecha', 'hora', 'id_doctor', name='uq_slot_bloqueado')`.
- **Relaciones:**
  - `doctor`: relationship("Doctor").
  - `bloqueado_por`: relationship("Usuario").
- **Tipo de borrado:** Hard-delete (se elimina el registro de bloqueo de la grilla).

---

## 4. Auth y autorización

### 4.1. Generación y Validación de JWT
- **Expiración de Tokens (Configurada en `backend/core/config.py`):**
  - **Access Token:** 30 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES`).
  - **Refresh Token:** 7 días (`REFRESH_TOKEN_EXPIRE_DAYS`).
- **Algoritmo de firma:** `HS256`.
- **Claims incluidos en el Payload:**
  - `sub`: `username` del usuario.
  - `rol`: `rol` del usuario (`admin` \| `secretaria`).
  - `exp`: timestamp UTC de expiración del token.
- **Flujo de validación:** La cabecera `Authorization: Bearer <token>` se decodifica en `verify_token` de `backend/core/security.py`, buscando al usuario en base de datos para validar que su campo `activo` sea `True`.

### 4.2. Guest Checkout (DNI + UUID v4)
- ❓ **Verificar:** El backend actual **no posee ninguna funcionalidad de guest checkout, generación de UUID v4 para turnos, ni autenticación/acceso para pacientes**. Todos los endpoints clave internos exigen cabecera JWT con rol de `admin` o `secretaria`. Esta funcionalidad está agendada en el roadmap como `C-08 portal-autogestion` (pendiente).

### 4.3. Dependencias de FastAPI para autorización
Las dependencias declaradas en [dependencies.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/dependencies.py) controlan el acceso:
- `Depends(get_current_user)`: Valida la firma JWT del token recibido en la cabecera HTTP y retorna el modelo `Usuario` autenticado y activo.
- `Depends(require_role(["admin", "secretaria"]))`: Exige que el usuario logueado contenga el rol de `admin` o `secretaria`.
- `Depends(require_role(["admin"]))`: Exige estrictamente rol `admin`.

---

## 5. Reglas de negocio implementadas en backend

A continuación se detallan las reglas de dominio reales en el backend:

### 5.1. Reglas de Horarios y Granularidad (Módulo Centralizado)
- **Ubicación:** [backend/core/horarios.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/core/horarios.py).
- **Lógica Real:**
  - Rango de atención: Lunes a viernes de 9:00 a 13:00 y de 16:00 a 20:00.
  - Sábados únicamente por la mañana: de 9:00 a 13:00.
  - Jueves y domingos cerrado (sin atención).
  - Cierre de clínica al mediodía: de 13:00 a 16:00.
  - Granularidad de slots: exclusivamente minutos `:00` y `:30` (`validar_granularidad`).
  - La duración del turno (`duracion_minutos`) se calcula para que el bloque de atención entre completo dentro de la franja.
  - Timezone forzado: `America/Argentina/Buenos_Aires`.
- **Diferencia con KB:** Coincide perfectamente con las reglas teóricas gracias a la centralización en C-12, la cual solucionó el desajuste horario del prototipo.

### 5.2. Prevención de Solapamiento e Interrupciones
- **Ubicación:** `post_turno` en [routers/turnos.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/turnos.py).
- **Lógica Real:** El backend busca todos los turnos agendados (`Pendiente`, `Realizado`) para el doctor en la misma fecha. Calcula en minutos el intervalo (`inicio_nuevo` y `fin_nuevo`) y deniega la reserva con `400 Bad Request` si existe algún solapamiento. También deniega si el slot está manualmente bloqueado en la tabla `slots_bloqueados`.

### 5.3. Amortización automática de abonos
- **Ubicación:** `crear_pago` en [crud/finanzas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/crud/finanzas.py).
- **Lógica Real:** Cuando se registra un pago general (sin especificar `id_turno`), el backend busca todos los turnos realizados con saldo pendiente, los ordena cronológicamente (más antiguo primero) y distribuye el monto recibido para amortizar sus saldos. Si queda un sobrante, crea un pago flotante a cuenta del paciente. Registra la transacción como movimiento `"pago"` en la cuenta corriente.

### 5.5. Cierre de Turno y Carga de Cargos
- **Ubicación:** `cerrar_turno_con_pago` en [crud/finanzas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/crud/finanzas.py).
- **Lógica Real:** Marca el turno como `"Realizado"`. Registra tratamientos y pagos. Si lo pagado es menor a lo facturado en esa sesión, inserta un movimiento `tipo="cargo"` por la diferencia en la cuenta corriente del paciente. Si pagó de más, genera un movimiento `tipo="pago"` por el excedente.

---

## 6. Discrepancias frontend vs. backend

### 6.1. Notas clínicas sin soporte de base de datos
- **Inconsistencia:** En la ficha de paciente ([PerfilPacientePage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/PerfilPacientePage.tsx)), las notas de evolución se guardan en el `localStorage` del navegador con la clave `dental_paciente_comentarios_${dni}`.
- ❌ **Sin soporte backend:** Aunque existe la tabla `historias_clinicas` (`HistoriaClinica`), **no hay endpoints de API** para interactuar con ella.
- *Solución:* Crear endpoints `GET` y `PUT` en `/api/pacientes/{dni}/historia-clinica` mapeando con el modelo `HistoriaClinica` para migrar esta información fuera del almacenamiento local.

### 6.2. Contratos de Cuenta Corriente desalineados
- **Inconsistencia:** En el frontend, `CuentaCorrienteResponse` espera un objeto `paciente` y una lista de movimientos contables estructurada con los campos `monto_ars` y `monto_usd` por separado, y el tipo `'debito' | 'credito'`.
- El backend en `CuentaCorrienteResponse` (`schemas/pacientes.py`) devuelve `dni_paciente` (string) en lugar del paciente completo, y los movimientos usan `monto` (único valor), `moneda` (indica divisa) y tipo `"cargo" | "pago"`. Para `frontend2/` se debe redefinir este tipado para evitar que falle el enlazado estricto.

---

## 7. Deuda técnica y hallazgos de backend

Se detallan hallazgos de calidad de código e infraestructura en el backend actual:

1. **Ausencia de un sistema formal de migraciones (Alembic):**
   - El proyecto no tiene instalado Alembic. El archivo [crear_tablas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/crear_tablas.py) emula el control de versiones de la base de datos haciendo llamadas SQL directas en crudo para verificar la presencia de columnas nuevas en SQLite/PostgreSQL.
2. **Manejo de excepciones silenciado:**
   - Bloques `try-except` vacíos con comentarios `# silent` o capturas de excepciones genéricas que dificultan la trazabilidad ante fallos de conexión a la base de datos.
3. **Falta de índices de base de datos críticos:**
   - Las búsquedas frecuentes de turnos y pagos por DNI de paciente (`dni_paciente`) en las tablas `turnos` y `pagos` carecen de índices definidos en SQLAlchemy.
4. **Rate Limiting no operativo:**
   - A pesar de estar inicializado slowapi en `main.py`, ningún endpoint de la aplicación tiene aplicados decoradores de límite de llamadas.
5. **Contraseñas por defecto en el archivo de configuración:**
   - El archivo [config.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/core/config.py) incluye credenciales por defecto (`admin123` e inicializaciones fallback), las cuales deben ser anuladas en producción.
6. **Discrepancia en la clasificación de ingresos de Caja:**
   - El endpoint `GET /finanzas/caja/hoy` no realiza la clasificación contable de ingresos entre Particulares y Obras Sociales como dicta la regla de negocio `RN-13`.

---

## 8. Comparativa contra la Auditoría de Backend Previa (Vieja)

Al contrastar esta auditoría con la anterior (`AUDITORIA_BACKEND.md` anterior), se documentan los siguientes cambios de relevancia técnica introducidos en la rama mediante la implementación de `C-12`:

### 8.1. Nuevos Endpoints Añadidos en API
- **Gestión de Slots y Bloqueos:**
  - `GET /api/turnos/slots`: Devuelve los slots del día indicando si están libres, ocupados o bloqueados por doctor y fecha.
  - `POST /api/turnos/slots/bloquear`: Registra un bloqueo manual sobre una hora/fecha/doctor.
  - `DELETE /api/turnos/slots/{slot_id}/desbloquear`: Libera un bloqueo manual de slot.
- **Configuración de Horarios Pública:**
  - `GET /api/config/horarios` (Vía router `/config` en [routers/config.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/config.py)): Expone las reglas de zona horaria y rangos de atención del consultorio, permitiendo al frontend leerlos dinámicamente.

### 8.2. Correcciones de Seguridad y Roles
- **Restricciones de Doctores:**
  - En la auditoría anterior, cualquier rol (`admin` o `secretaria`) podía alterar o crear doctores en el catálogo.
  - **Corrección:** Los endpoints `POST /doctores/`, `PUT /doctores/{id}` y `DELETE /doctores/{id}` ahora se encuentran protegidos estrictamente con la dependencia `Depends(require_role(["admin"]))`, restringiendo a las secretarias únicamente a la lectura del listado.

### 8.3. Corrección de Horarios e Incompatibilidades (C-12)
- En la auditoría vieja se reportaron fallos donde el backend permitía agendar turnos los sábados por la tarde, en el horario de almuerzo de 13:00 a 16:00, y no permitía turnos a las 19:30 por un límite rígido (`hora >= 19`).
- **Corrección:** Con el nuevo módulo [backend/core/horarios.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/core/horarios.py), el backend ahora valida granularidades de minutos `:00`/`:30`, bloquea sábados por la tarde, bloquea el mediodía, y extiende la tarde hasta las 20:00 (permitiendo slots de 19:00 y 19:30).

### 8.4. Nuevas Entidades y Tipos
- **Modelo de Base de Datos:** Se incorporó la tabla `slots_bloqueados` (`SlotsBloqueado`) con restricciones de unicidad compuesta (`uq_slot_bloqueado`).
- **Validador Hexadecimal:** Se agregaron validadores en `schemas/doctores.py` para asegurar que el color de agenda sea un hexadecimal válido (`#RRGGBB`).
- **Constancia de Turno en Pagos:** Los pagos devuelven ahora el campo `constancia_turno` calculando dinámicamente la fecha, el apellido del paciente y la hora del turno asociado para facilitar el libro contable de caja.

### 8.5. Mitigación de Deuda Técnica
- Se removió la configuración antigua de Pydantic v1 (`class Config: from_attributes = True`) en las entidades del cambio C-12, migrándolas al nuevo estándar Pydantic v2 `model_config = ConfigDict(from_attributes=True)`.
