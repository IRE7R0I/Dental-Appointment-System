# AUDITORÍA DEFINITIVA DEL PROYECTO ODONTOGEST

Este documento contiene la auditoría integral y definitiva del estado actual de la aplicación **OdontoGest** (Frontend + Backend Mock Express). Su propósito es servir como la guía de referencia técnica completa para los desarrolladores que realizarán la migración a un repositorio local y la implementación del backend definitivo en producción.

---

## 1. INVENTARIO COMPLETO DE ENDPOINTS ESPERADOS

A continuación se detalla la totalidad de los endpoints que la aplicación consume mediante `apiFetch` y `fetch`, organizados por módulo funcional.

### 1.1 Módulo de Autenticación (`/api/auth`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `LoginPage.tsx` | **Body:** `{ username: string, password: string }` | `{ access_token: string, refresh_token: string, token_type: "bearer" }` |
| `POST` | `/api/auth/refresh` | `apiFetch` (`src/lib/api.ts`) | **Body:** `{ refresh_token: string }` | `{ access_token: string, refresh_token: string, token_type: "bearer" }` |
| `POST` | `/api/auth/logout` | `NavigationRail.tsx` | *Sin Body* | `{ mensaje: string }` |
| `GET` | `/api/auth/me` | `LoginPage.tsx`, `App.tsx` | *Headers:* `Authorization: Bearer <token>` | `{ id: number, username: string, rol: 'admin' \| 'secretaria', activo: boolean, creado_en: string }` |

---

### 1.2 Módulo de Usuarios & Administración (`/api/admin/usuarios`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/usuarios` | `UsuariosPage.tsx` | *Headers:* `Authorization` | `Array<{ id: number, username: string, rol: 'admin' \| 'secretaria', activo: boolean, creado_en: string }>` |
| `POST` | `/api/admin/usuarios` | `UsuariosPage.tsx` | **Body:** `{ username: string, password: string, rol: 'admin' \| 'secretaria' }` | `{ id: number, username: string, rol: 'admin' \| 'secretaria', activo: boolean, creado_en: string }` |
| `PUT` | `/api/admin/usuarios/:user_id/toggle-activo` | `UsuariosPage.tsx` *(Nota: ver Inconsistencias)* | *Sin Body* | `{ id: number, username: string, rol: 'admin' \| 'secretaria', activo: boolean, creado_en: string }` |
| `PUT` | `/api/admin/usuarios/:user_id` | `UsuariosPage.tsx` | **Body:** `{ password?: string, rol?: 'admin' \| 'secretaria' }` | `{ id: number, username: string, rol: 'admin' \| 'secretaria', activo: boolean, creado_en: string }` |
| `DELETE` | `/api/admin/usuarios/:user_id` | `UsuariosPage.tsx` | *Sin Body* | `{ mensaje: string }` |

---

### 1.3 Módulo de Doctores / Odontólogos (`/api/doctores`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/doctores` | `DoctoresPage.tsx`, `AgendaPage.tsx`, `DashboardPage.tsx`, `PagosPage.tsx` | *Headers:* `Authorization` | `Array<{ id: number, nombre: string, color_agenda: string, activo: boolean, matricula: string, telefono?: string, email?: string }>` |
| `POST` | `/api/doctores` | `DoctoresPage.tsx` | **Body:** `{ nombre: string, color_agenda: string, matricula?: string, telefono?: string, email?: string }` | `{ id: number, nombre: string, color_agenda: string, activo: boolean, matricula: string, telefono?: string, email?: string }` |
| `GET` | `/api/doctores/:id` | `DoctoresPage.tsx` | *Path Param:* `id: number` | `{ id: number, nombre: string, color_agenda: string, activo: boolean, matricula: string, telefono?: string, email?: string }` |
| `PUT` | `/api/doctores/:id` | `DoctoresPage.tsx` | **Body:** `{ nombre?: string, color_agenda?: string, activo?: boolean, matricula?: string, telefono?: string, email?: string }` | `{ id: number, nombre: string, color_agenda: string, activo: boolean, matricula: string, telefono?: string, email?: string }` |
| `DELETE` | `/api/doctores/:id` | `DoctoresPage.tsx` | *Path Param:* `id: number` | `{ mensaje: string }` |
| `GET` | `/api/doctores/:id/horarios` | `DoctorHorariosConfig.tsx`, `AgendaPage.tsx` | *Path Param:* `id: number` | Configuración de horarios del doctor: `{ dias: { [key: string]: { mañana: [string, string] \| null, tarde: [string, string] \| null } }, duracion_turno: number }` |
| `PUT` | `/api/doctores/:id/horarios` | `DoctorHorariosConfig.tsx` | **Body:** `{ dias: object, duracion_turno: number }` | Configuración de horarios actualizada. |
| `GET` | `/api/doctores/:id/dias-no-laborables` | `DoctorHorariosConfig.tsx`, `AgendaPage.tsx` | **Query Params:** `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | `Array<string>` (lista de fechas ISO `YYYY-MM-DD` deshabilitadas/bloqueadas). |
| `POST` | `/api/doctores/:id/dias-no-laborables` | `DoctorHorariosConfig.tsx` | **Body:** `{ fecha: string, accion: 'agregar' \| 'remover' }` | `Array<string>` |

---

### 1.4 Módulo de Pacientes (`/api/pacientes`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/pacientes` | `PacientesPage.tsx`, `PagosPage.tsx` | *Headers:* `Authorization` | `Array<Paciente>` |
| `POST` | `/api/pacientes` | `PacientesPage.tsx`, `AgendaPage.tsx`, `DashboardPage.tsx` | **Body:** `{ dni: string, nombre: string, apellido: string, fecha_nacimiento?: string, telefono?: string, email?: string, obra_social?: string, genero?: string, alertas?: string }` | `Paciente` |
| `GET` | `/api/pacientes/:dni` | `PacientesPage.tsx`, `AgendaPage.tsx`, `DashboardPage.tsx`, `HistorialPage.tsx` | *Path Param:* `dni: string` | `Paciente` |
| `PUT` | `/api/pacientes/:dni` | `PacientesPage.tsx` | **Body:** Objeto `Paciente` parcial con campos a actualizar. | `Paciente` actualizado |
| `GET` | `/api/pacientes/deudores` | `PagosPage.tsx`, `PacientesPage.tsx` | **Query Params:** `?orden=antiguedad_asc` / `antiguedad_desc` | `Array<{ dni: string, nombre: string, apellido: string, saldo_ars: number, saldo_usd: number, dias_antiguedad: number, ultimo_pago?: string }>` |
| `GET` | `/api/pacientes/:dni/turnos-con-deuda` | `PagosPage.tsx` | *Path Param:* `dni: string` | `Array<{ id_turno: number, fecha_hora: string, tratamiento: string, monto_total: number, monto_abonado: number, saldo_pendiente: number, moneda: 'ARS' \| 'USD' }>` |
| `GET` | `/api/pacientes/historial` | `PacientesPage.tsx` | **Query Params:** `?dni=XXXXXX` | `Array<{ id: number, fecha_hora: string, doctor_nombre: string, tratamientos: Array<TurnoTratamiento>, comentarios_medicos?: string, pieza_dental?: number, ubicacion_lesion?: string, estado: string }>` |
| `GET` | `/api/pacientes/:dni/cuenta` | `PacientesPage.tsx`, `HistorialPage.tsx` | *Path Param:* `dni: string` | `{ id: number, dni_paciente: string, saldo_ars: number, saldo_usd: number, ultima_actualizacion: string, movimientos: Array<MovimientoCuenta> }` |
| `GET` | `/api/pacientes/:dni/historia-clinica` | `PacientesPage.tsx` | *Path Param:* `dni: string` | `{ id: number, dni_paciente: string, notas: string, ultima_actualizacion: string }` |
| `PUT` | `/api/pacientes/:dni/historia-clinica` | `PacientesPage.tsx` | **Body:** `{ notas: string }` | `{ id: number, dni_paciente: string, notas: string, ultima_actualizacion: string }` |
| `GET` | `/api/pacientes/:dni/resumen` | `PacientesPage.tsx` | *Path Param:* `dni: string` | `{ conteo_imagenes: number, conteo_hallazgos: number }` |
| `GET` | `/api/pacientes/:dni/imagenes` | `PacientesPage.tsx` | *Path Param:* `dni: string` | `Array<{ id: number, dni_paciente: string, nombre: string, url: string, carpeta: string, es_radiografia: boolean, creado_en: string }>` |
| `POST` | `/api/pacientes/:dni/imagenes` | `PacientesPage.tsx` | **Body:** `{ nombre: string, url: string, carpeta: string, es_radiografia: boolean }` | `{ id: number, dni_paciente: string, nombre: string, url: string, carpeta: string, es_radiografia: boolean, creado_en: string }` |
| `DELETE` | `/api/pacientes/:dni/imagenes/:id` | `PacientesPage.tsx` | *Path Params:* `dni: string`, `id: number` | `{ mensaje: string }` |

---

### 1.5 Módulo de Turnos & Agenda (`/api/turnos`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/turnos` | `AgendaPage.tsx` | **Query Params:** `?fecha=YYYY-MM-DD` / `?desde=...&hasta=...` | `Array<Turno>` |
| `GET` | `/api/turnos/hoy` | `DashboardPage.tsx` | *Headers:* `Authorization` | `Array<Turno>` |
| `POST` | `/api/turnos` | `AgendaPage.tsx`, `DashboardPage.tsx` | **Body:** `{ fecha_hora: string, duracion_minutos: number, id_doctor: number, dni_paciente: string, motivo?: string }` | `Turno` |
| `GET` | `/api/turnos/:id` | `AgendaPage.tsx` | *Path Param:* `id: number` | `Turno` con relaciones mapped (`paciente`, `doctor_nombre`, `tratamientos`, `pagos`). |
| `PATCH` | `/api/turnos/:turno_id/cancelar` | `AgendaPage.tsx`, `DashboardPage.tsx` | **Body:** `{ motivo_cancelacion: string }` | `Turno` actualizado con `estado: 'Cancelado'`. |
| `PUT` | `/api/turnos/:turno_id/cerrar` | `DashboardPage.tsx` | **Body:** `{ tratamientos: Array<{ id_tratamiento: number, cantidad: number, precio_ars: number, precio_usd: number }>, pago?: { monto: number, metodo_pago: string, moneda: 'ARS' \| 'USD' }, comentarios_medicos?: string, pieza_dental?: number, ubicacion_lesion?: string, conformidad_paciente?: boolean }` | `{ turno: Turno, pago?: Pago, cuenta_corriente: CuentaCorriente }` |
| `PUT` | `/api/turnos/:turno_id/clinical-details` | `PacientesPage.tsx` | **Body:** `{ comentarios_medicos?: string, pieza_dental?: number \| null, ubicacion_lesion?: string \| null, conformidad_paciente?: boolean \| null }` | `Turno` |
| `GET` | `/api/turnos/slots` | `AgendaPage.tsx` | **Query Params:** `?fecha=YYYY-MM-DD&id_doctor=X` | `Array<{ hora: string, estado: 'libre' \| 'ocupado' \| 'bloqueado', slot_bloqueado_id?: number, turno_id?: number, paciente?: string, motivo?: string }>` |
| `GET` | `/api/turnos/slots/bulk` | `AgendaPage.tsx` | **Query Params:** `?fechas=YYYY-MM-DD,YYYY-MM-DD&id_doctor=1,2,3` | Objeto con disponibilidad agrupada por fecha y doctor. |
| `POST` | `/api/turnos/slots/bloquear` | `AgendaPage.tsx` | **Body:** `{ fecha: string, hora: string, id_doctor: number, motivo: string }` | `SlotBloqueado` |
| `DELETE` | `/api/turnos/slots/:slot_id/desbloquear` | `AgendaPage.tsx` | *Path Param:* `slot_id: number` | `{ mensaje: string }` |

---

### 1.6 Módulo Finanzas y Caja (`/api/finanzas`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/finanzas/caja/hoy` | `DashboardPage.tsx`, `PagosPage.tsx` | *Headers:* `Authorization` | `{ fecha: string, total_efectivo_ars: number, total_transferencia_ars: number, total_dolares_usd: number, total_ingresos_ars: number, cantidad_operaciones: number }` |
| `GET` | `/api/finanzas/pagos` | `PagosPage.tsx` | **Query Params:** `?fecha_desde=...&fecha_hasta=...&metodo_pago=...&dni_paciente=...` | `Array<Pago & { paciente_nombre?: string, constancia_turno?: string }>` |
| `POST` | `/api/finanzas/pagos` | `PagosPage.tsx` | **Body:** `{ dni_paciente: string, monto: number, metodo_pago: string, moneda: 'ARS' \| 'USD', id_turno?: number \| null }` | `{ pago: Pago, cuenta_corriente: CuentaCorriente }` |

---

### 1.7 Módulo Catálogo & Configuración (`/api/catalogo`, `/api/config`)

| Método | Ruta | Vista(s) Consumidora(s) | Request Payload / Query Params | Response Payload Esperado |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/catalogo/tratamientos` | `CatalogoPage.tsx`, `AgendaPage.tsx`, `DashboardPage.tsx` | *Headers:* `Authorization` | `Array<TratamientoCatalogo>` |
| `POST` | `/api/catalogo/tratamientos` | `CatalogoPage.tsx` | **Body:** `{ nombre: string, precio_ars: number, precio_usd: number, duracion_minutos: number, categoria: string }` | `TratamientoCatalogo` |
| `PUT` | `/api/catalogo/tratamientos/:id` | `CatalogoPage.tsx` | **Body:** Objeto `TratamientoCatalogo` parcial | `TratamientoCatalogo` |
| `DELETE` | `/api/catalogo/tratamientos/:id` | `CatalogoPage.tsx` | *Path Param:* `id: number` | `{ mensaje: string }` |
| `GET` | `/api/catalogo/obras-sociales` | `CatalogoPage.tsx`, `AgendaPage.tsx`, `DashboardPage.tsx`, `PacientesPage.tsx` | *Headers:* `Authorization` | `Array<ObraSocial>` |
| `POST` | `/api/catalogo/obras-sociales` | `CatalogoPage.tsx` | **Body:** `{ nombre: string }` | `ObraSocial` |
| `DELETE` | `/api/catalogo/obras-sociales/:id` | `CatalogoPage.tsx` | *Path Param:* `id: number` | `{ mensaje: string }` |
| `GET` | `/api/config/horarios` | `AgendaPage.tsx` | *Headers:* `Authorization` | Estructura general de configuración de horarios por defecto. |

---

## 2. MODELO DE DATOS ACTUAL (MOCK DB STORE)

La persistencia del prototipo está gestionada en memoria y sincronizada con `db.json`. A continuación se detallan todas las entidades, sus campos, tipos de datos y relaciones.

```
+------------------+         +--------------------+         +-------------------+
|     Usuario      |         |      Doctor        |         |     Paciente      |
+------------------+         +--------------------+         +-------------------+
| id (PK)          |         | id (PK)            |         | dni (PK)          |
| username         |         | nombre             |         | nombre            |
| hashed_password  |         | color_agenda       |         | apellido          |
| rol              |         | activo             |         | fecha_nacimiento  |
| activo           |         | matricula          |         | telefono          |
| creado_en        |         | telefono           |         | email             |
+------------------+         | email              |         | obra_social       |
                             +--------------------+         | genero            |
                                       |                    | alertas           |
                                       | 1                  +-------------------+
                                       |                              | 1
                                       | N                            | N
                             +--------------------+                   |
                             |       Turno        | <-----------------+
                             +--------------------+
                             | id (PK)            |
                             | fecha_hora         |
                             | duracion_minutos   |
                             | motivo             |
                             | estado             |
                             | dni_paciente (FK)  |
                             | id_doctor (FK)     |
                             | motivo_cancelacion |
                             | comentarios_medicos|
                             | pieza_dental       |
                             | ubicacion_lesion   |
                             | conformidad_pacient|
                             +--------------------+
                                 | 1            | 1
                                 | N            | N
    +-------------------+        |              |        +-------------------+
    | TurnoTratamiento  | <------+              +------> |       Pago        |
    +-------------------+                                +-------------------+
    | id (PK)           |                                | id (PK)           |
    | id_turno (FK)     |                                | monto             |
    | nombre            |                                | fecha_pago        |
    | cantidad          |                                | metodo_pago       |
    | precio_ars        |                                | moneda            |
    | precio_usd        |                                | saldo_pendiente   |
    +-------------------+                                | dni_paciente (FK) |
                                                         | id_turno (FK)     |
                                                         +-------------------+
```

### Entidades Adicionales
- **CuentaCorriente**: `{ id, dni_paciente (FK -> Paciente.dni), saldo_ars, saldo_usd, ultima_actualizacion }`
- **MovimientoCuenta**: `{ id, id_cuenta (FK -> CuentaCorriente.id), tipo: 'cargo'|'pago', monto, moneda: 'ARS'|'USD', descripcion, fecha }`
- **HistoriaClinica**: `{ id, dni_paciente (FK -> Paciente.dni), notas, ultima_actualizacion }`
- **TratamientoCatalogo**: `{ id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo }`
- **ObraSocial**: `{ id, nombre, activo }`
- **SlotBloqueado**: `{ id, fecha, hora, id_doctor (FK -> Doctor.id), motivo, bloqueado_por_id, creado_en }`
- **PacienteImagen**: `{ id, dni_paciente (FK -> Paciente.dni), nombre, url, carpeta, es_radiografia, creado_en }`

---

## 3. ESTADO DE AUTENTICACIÓN Y SEGURIDAD

1. **Tokens JWT**:
   - `access_token`: expira en 24 horas (almacenado en `localStorage.getItem('access_token')`).
   - `refresh_token`: expira en 7 días (almacenado en `localStorage.getItem('refresh_token')`).
2. **Intercepción y Auto-Refresh**:
   - `src/lib/api.ts` intercepta cualquier respuesta `401 Unauthorized`.
   - Si existe un `refresh_token`, realiza automátiamente un `POST /api/auth/refresh`.
   - Si la renovación es exitosa, actualiza los tokens en `localStorage` y reintenta la petición original con el nuevo `access_token`.
   - Si el `refresh_token` también expiró o es inválido, limpia `localStorage` y dispara el evento global `'auth-expired'` para redirigir al usuario a `/login`.
3. **Verificación de Usuario Activo**:
   - Todos los middlewares del backend verifican que `u.activo === true`. Si un administrador desactiva a un usuario, sus llamadas posteriores con tokens previamente emitidos son denegadas inmediatamente.

---

## 4. VARIABLES DE ENTORNO USADAS

| Variable | Archivo(s) de Uso | Propósito / Descripción | Ejemplo en Entorno |
| :--- | :--- | :--- | :--- |
| `PORT` | `server.ts` | Puerto en el que escucha el servidor Node.js/Express. | `3000` |
| `NODE_ENV` | `server.ts` | Controla si la app corre en modo desarrollo (sirviendo Vite middleware) o producción (sirviendo archivos estáticos de `dist/`). | `development` / `production` |
| `GEMINI_API_KEY` | `server.ts` | Utilizada como fallback key para la firma HMAC de los tokens JWT si no se especifica una clave secreta propia. | `string_secreto_firma` |
| `DISABLE_HMR` | `vite.config.ts` | Utilizada por la plataforma de desarrollo para deshabilitar Hot Module Replacement durante ediciones masivas. | `true` / `false` |

---

## 5. DEPENDENCIAS FINALES (`package.json`)

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-popover": "^1.1.19",
    "@radix-ui/react-select": "^2.3.2",
    "@radix-ui/react-tooltip": "^1.2.13",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "clsx": "^2.1.1",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-router-dom": "^7.18.1",
    "tailwind-merge": "^3.6.0",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

---

## 6. INCONSISTENCIAS INTERNAS DETECTADAS PARA EL BACKEND REAL

Durante la auditoría del código cliente vs. las rutas declaradas en `server.ts`, se hallaron las siguientes inconsistencias que el equipo de desarrollo debe tener en cuenta al construir la API definitiva:

1. **Ruta de Desactivación de Usuarios**:
   - `UsuariosPage.tsx` invoca: `PUT /api/admin/usuarios/:id/activo`
   - `server.ts` implementa: `PUT /api/admin/usuarios/:user_id/toggle-activo`
   - *Recomendación backend real:* Estandarizar a `PATCH /api/admin/usuarios/:id/status` o `PUT /api/admin/usuarios/:id/activo` pasando `{ activo: boolean }` en el body.

2. **Ruta de Modificación de Contraseña**:
   - `UsuariosPage.tsx` invoca: `PUT /api/admin/usuarios/:id/password`
   - `server.ts` maneja la actualización de contraseña a través del endpoint general `PUT /api/admin/usuarios/:user_id` recibiendo `{ password: "..." }`.
   - *Recomendación backend real:* Crear la ruta dedicada `PUT /api/admin/usuarios/:id/password`.

3. **Inactivación / Soft-Delete de Doctores, Tratamientos y Obras Sociales**:
   - `DoctoresPage.tsx` invoca `PUT /api/doctores/:id/activo`. En `server.ts`, la desactivación se procesa vía `DELETE /api/doctores/:id` (que ejecuta el soft-delete setting `activo = false`) o vía `PUT /api/doctores/:id` enviando `{ activo: false }`.
   - `CatalogoPage.tsx` invoca `PUT /api/catalogo/tratamientos/:id/activo` y `PUT /api/catalogo/obras-sociales/:id/activo`. En `server.ts`, se atienden mediante `DELETE /api/catalogo/tratamientos/:id` y `DELETE /api/catalogo/obras-sociales/:id`.
   - *Recomendación backend real:* Unificar los endpoints REST para cambio de estado activo/inactivo bajo el método `PATCH` o `PUT`.

4. **Filtro de Días No Laborables de Odontólogos**:
   - `DoctorHorariosConfig.tsx` envía los query params `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` a `GET /api/doctores/:id/dias-no-laborables`.
   - `server.ts` actualmente omite estos parámetros y devuelve la lista completa de fechas no laborables registradas para ese doctor.
   - *Recomendación backend real:* Implementar el filtrado por rango de fechas `desde` y `hasta` en la consulta SQL/ORM.

5. **Parametrización de Historial Clínico de Pacientes**:
   - `PacientesPage.tsx` consulta `GET /api/pacientes/historial?dni=XXXXXX`.
   - `server.ts` soporta filtrar por DNI pero devuelve la lista completa si el parámetro se omite.
   - *Recomendación backend real:* Hacer obligatorio el parámetro `dni` o convertir la ruta a `/api/pacientes/:dni/historial` para mayor consistencia REST.

---

*Documento de auditoría finalizado. Proyecto verificado y listo para exportación.*
