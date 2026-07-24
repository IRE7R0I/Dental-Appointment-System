# AUDITORÍA FINAL Y COMPLETA DEL PROYECTO FRONTEND (OdontoGest)
**Documento de referencia para la migración a entorno local y backend relacional definitivo.**
**Archivo:** `FRONTEND2_AUDITORIA_ULTIMA.md`  
**Fecha:** 23 de Julio de 2026  

---

## 1. Inventario Completo de Endpoints Esperados por el Frontend HOY

Esta sección detalla de forma exhaustiva todos los endpoints invocados por el frontend en su estado actual, indicando el método HTTP, la ruta exacta, los módulos/vistas que lo consumen, y los tipos de datos reales de Request Payload y Response.

---

### 1.1 Módulo: Autenticación y Sesión
*Consumido por `src/pages/LoginPage.tsx` y `src/lib/api.ts`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | LoginPage | Iniciar sesión de usuario | `{ username: string, password: string }` | `{ access_token: string, refresh_token: string }` |
| `POST` | `/api/auth/refresh` | `apiFetch` (Interceptors) | Renovar token JWT expirado | `{ refresh_token: string }` | `{ access_token: string, refresh_token: string }` |
| `GET` | `/api/auth/me` | LoginPage | Obtener datos del usuario autenticado | Header `Authorization: Bearer <token>` | `{ id: number, username: string, rol: 'admin' \| 'secretaria' \| 'odontologo' }` |

---

### 1.2 Módulo: Inicio / Dashboard
*Consumido por `src/pages/DashboardPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/finanzas/caja/hoy` | Dashboard | Métricas financieras del día en curso | N/A | `{ ingresos_ars: number, ingresos_usd: number, egresos_ars: number, saldo_ars: number }` |
| `GET` | `/api/turnos/hoy` | Dashboard | Listado de turnos programados para hoy | N/A | `Turno[]` |
| `GET` | `/api/doctores` | Dashboard | Lista de odontólogos para filtros y tarjetas | N/A | `Doctor[]` |
| `GET` | `/api/catalogo/tratamientos` | Dashboard | Catálogo de tratamientos para cierre de turno | N/A | `TratamientoCatalogo[]` |
| `GET` | `/api/catalogo/obras-sociales` | Dashboard | Lista de obras sociales activa | N/A | `ObraSocial[]` |
| `PATCH` | `/api/turnos/:id/cancelar` | Dashboard | Cancelar un turno desde el dashboard | `{ motivo_cancelacion: string }` | `{ success: boolean }` |
| `PUT` | `/api/turnos/:id/cerrar` | Dashboard | Cerrar o completar un turno y registrar pago/deuda | `{ tratamientos: Array<{ id_tratamiento: number, nombre?: string, cantidad: number, precio_ars?: number, precio_usd?: number }>, pagos: Array<{ monto: number, moneda: 'ARS' \| 'USD', metodo_pago: string }>, comentarios_medicos?: string, pieza_dental?: number \| null, ubicacion_lesion?: string \| null, conformidad_paciente?: boolean \| null }` | `{ success: boolean }` |

> **Nota:** El botón "Nuevo Turno" y la búsqueda/creación rápida de pacientes en Dashboard fueron eliminados. Ahora el agendamiento se realiza centralizadamente en el módulo **Agenda**.

---

### 1.3 Módulo: Agenda de Turnos
*Consumido por `src/pages/AgendaPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/pacientes/?buscar={query}` | Agenda | Búsqueda incremental de pacientes (mínimo 2 letras) | Query param `buscar` | `Paciente[]` |
| `GET` | `/api/turnos/slots?fecha=YYYY-MM-DD&id_doctor=N` | Agenda | Obtener grilla de horarios/slots para un doctor en un día | Query params `fecha`, `id_doctor` | `SlotResponse[]` |
| `GET` | `/api/turnos/slots/bulk?fecha_desde=YYYY-MM-DD&fecha_hasta=YYYY-MM-DD&id_doctor=D1,D2...` | Agenda | Obtener grilla masiva por rango para vista multi-día/multi-doctor/mes | Query params `fecha_desde`, `fecha_hasta`, `id_doctor` | `{ [key: string]: SlotResponse[] }` |
| `POST` | `/api/turnos/slots/bloquear` | Agenda | Bloquear temporalmente un horario/slot | `{ fecha: string, hora: string, id_doctor: number }` | `{ slot_id: number, lock_id: string }` |
| `DELETE` | `/api/turnos/slots/:slotId/desbloquear` | Agenda | Liberar un bloqueo temporal de slot | N/A | `{ success: boolean }` |
| `POST` | `/api/pacientes` | Agenda | Alta rápida de paciente nuevo desde el flujo de agenda | `{ dni?: string, nombre: string, apellido: string, telefono?: string, email?: string, obra_social?: string }` | `Paciente` |
| `POST` | `/api/turnos` | Agenda | Agendar un nuevo turno (duración variable 30/60/90) | `{ fecha_hora: string, duracion_minutos: 30 \| 60 \| 90, motivo: string, dni_paciente: string, id_doctor: number }` | `Turno` |
| `GET` | `/api/turnos/:id` | Agenda | Obtener detalle completo de un turno | N/A | `Turno` |
| `PATCH` | `/api/turnos/:id/cancelar` | Agenda | Cancelar turno especificando motivo | `{ motivo_cancelacion: string }` | `{ success: boolean }` |
| `GET` | `/api/doctores` | Agenda | Carga de profesionales para filtros | N/A | `Doctor[]` |
| `GET` | `/api/catalogo/obras-sociales` | Agenda | Carga de obras sociales | N/A | `ObraSocial[]` |
| `GET` | `/api/catalogo/tratamientos` | Agenda | Carga de tratamientos | N/A | `TratamientoCatalogo[]` |
| `GET` | `/api/config/horarios` | Agenda | Horarios globales de atención clínica | N/A | `{ hora_inicio: string, hora_fin: string }` |
| `GET` | `/api/doctores/:id/horarios` | Agenda | Horarios específicos de atención del doctor | N/A | `{ dias: Array<{ dia_semana: number, activo: boolean, rangos: Array<{ hora_inicio: string, hora_fin: string }> }> }` |
| `GET` | `/api/doctores/:id/dias-no-laborables` | Agenda | Fechas de inasistencia / feriados del doctor | N/A | `Array<{ fecha: string, motivo?: string }>` |

---

### 1.4 Módulo: Pacientes y Historias Clínicas
*Consumido por `src/pages/PacientesPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/pacientes` | Pacientes | Listado general de pacientes | N/A | `Paciente[]` |
| `GET` | `/api/catalogo/obras-sociales` | Pacientes | Lista de obras sociales | N/A | `ObraSocial[]` |
| `GET` | `/api/pacientes/deudores` | Pacientes | Identificación de saldos impagos | N/A | `Deudor[]` |
| `POST` | `/api/pacientes` | Pacientes | Crear paciente nuevo completo | `{ dni: string, nombre: string, apellido: string, fecha_nacimiento?: string, telefono?: string, email?: string, direccion?: string, obra_social?: string, numero_afiliado?: string, observaciones?: string }` | `Paciente` |
| `PUT` | `/api/pacientes/:dni` | Pacientes | Actualizar datos del paciente | Mismo body de creación excepto DNI | `Paciente` |
| `GET` | `/api/pacientes/:dni/cuenta` | Pacientes | Estado de cuenta corriente | N/A | `{ saldo: number, movimientos: Array<{ fecha: string, concepto: string, monto: number, tipo: 'cargo' \| 'pago' }> }` |
| `GET` | `/api/pacientes/:dni/historia-clinica` | Pacientes | Historia clínica y odontograma | N/A | `{ antecedentes: string, odontograma: Record<string, string>, notas: Array<{ id: number, fecha: string, doctor: string, nota: string }> }` |
| `PUT` | `/api/pacientes/:dni/historia-clinica` | Pacientes | Guardar cambios en historia u odontograma | `{ antecedentes?: string, odontograma?: Record<string, string>, nota_nueva?: string }` | `HistoriaClinica` |
| `GET` | `/api/pacientes/historial?dni={dni}` | Pacientes | Historial de turnos atendidos | Query param `dni` | `Turno[]` |
| `GET` | `/api/pacientes/:dni/resumen` | Pacientes | Conteo rápido de imágenes y hallazgos | N/A | `{ conteo_imagenes: number, conteo_hallazgos: number }` |
| `GET` | `/api/pacientes/:dni/imagenes` | Pacientes | Listado de radiografías / imágenes | N/A | `ImagenRadiografica[]` |
| `POST` | `/api/pacientes/:dni/imagenes` | Pacientes | Adjuntar nueva radiografía / imagen | `{ url: string, descripcion?: string, tipo?: string }` | `ImagenRadiografica` |
| `DELETE` | `/api/pacientes/:dni/imagenes/:id` | Pacientes | Eliminar imagen radiográfica | N/A | `{ success: boolean }` |
| `POST` | `/api/turnos/:turnoId/clinical-details` | Pacientes | Registrar detalles clínicos del turno | `{ diagnostico?: string, tratamiento_realizado?: string, observaciones_clinicas?: string }` | `{ success: boolean }` |

---

### 1.5 Módulo: Caja y Cobros
*Consumido por `src/pages/PagosPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/pacientes/deudores?orden=antiguedad_{asc\|desc}` | Caja y Cobros (Pestaña "Lista de Deudores") | Listado de deudores ordenados por antigüedad | Query param `orden` | `Deudor[]` |
| `GET` | `/api/finanzas/movimientos` | Caja y Cobros | Historial de ingresos y egresos de caja | Query params opcionales: `desde`, `hasta`, `tipo`, `moneda` | `MovimientoCaja[]` |
| `GET` | `/api/finanzas/caja/hoy` | Caja y Cobros | Resumen diario de caja | N/A | `{ ingresos_ars: number, ingresos_usd: number, egresos_ars: number, saldo_ars: number }` |
| `GET` | `/api/pacientes` | Caja y Cobros | Selector de pacientes para registro de cobros | N/A | `Paciente[]` |
| `GET` | `/api/doctores` | Caja y Cobros | Selector de doctores para imputaciones | N/A | `Doctor[]` |
| `GET` | `/api/pacientes/:dni/turnos-con-deuda` | Caja y Cobros | Turnos con saldo pendiente para el paciente | N/A | `TurnoConDeuda[]` |
| `POST` | `/api/finanzas/pagos` | Caja y Cobros | Registrar cobro de turno, egreso o pago a cuenta | `{ dni_paciente?: string, id_turno?: number, tipo?: 'ingreso' \| 'egreso', monto: number, moneda: 'ARS' \| 'USD', forma_pago: string, comprobante?: string, concepto?: string, observaciones?: string }` | `{ success: boolean, id_movimiento: number }` |

> **Cambio Visual Confirmado:** La pestaña anteriormente denominada "Maestro de Deudores" pasó a llamarse **"Lista de Deudores"**. Se preservó intacta toda la lógica de ordenamiento, cobro y visualización.

---

### 1.6 Módulo: Catálogo
*Consumido por `src/pages/CatalogoPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/catalogo/tratamientos` | Catálogo | Lista de tratamientos | N/A | `TratamientoCatalogo[]` |
| `GET` | `/api/catalogo/obras-sociales` | Catálogo | Lista de obras sociales | N/A | `ObraSocial[]` |
| `POST` | `/api/catalogo/tratamientos` | Catálogo | Crear un nuevo tratamiento | `{ codigo: string, nombre: string, categoria: string, precio_ars: number, precio_usd: number, duracion_estimada_min: number, requiere_autorizacion?: boolean }` | `TratamientoCatalogo` |
| `PUT` | `/api/catalogo/tratamientos/:id` | Catálogo | Modificar un tratamiento existente | Mismo body que creación | `TratamientoCatalogo` |
| `PUT` | `/api/catalogo/tratamientos/:id/activo` | Catálogo | Activar/Desactivar tratamiento | `{ activo: boolean }` | `{ success: boolean }` |
| `POST` | `/api/catalogo/obras-sociales` | Catálogo | Registrar nueva obra social | `{ nombre: string, acronimo?: string, contacto?: string }` | `ObraSocial` |
| `PUT` | `/api/catalogo/obras-sociales/:id/activo` | Catálogo | Activar/Desactivar obra social | `{ activo: boolean }` | `{ success: boolean }` |

---

### 1.7 Módulo: Odontólogos / Profesionales
*Consumido por `src/pages/DoctoresPage.tsx` y `src/components/DoctorHorariosConfig.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/doctores` | Odontólogos | Lista de profesionales | N/A | `Doctor[]` |
| `POST` | `/api/doctores` | Odontólogos | Alta de profesional | `{ nombre: string, color_agenda: string }` *(Confirmado: ya NO envía matrícula, teléfono ni email)* | `Doctor` |
| `PUT` | `/api/doctores/:id` | Odontólogos | Modificar datos del profesional | `{ nombre: string, color_agenda: string }` | `Doctor` |
| `PUT` | `/api/doctores/:id/activo` | Odontólogos | Reactivar / Inactivar profesional | `{ activo: boolean }` | `{ success: boolean }` |
| `GET` | `/api/doctores/:id/horarios` | Odontólogos / Horarios | Cargar esquema semanal del doctor | N/A | `{ dias: Array<{ dia_semana: number, activo: boolean, rangos: Array<{ hora_inicio: string, hora_fin: string }> }> }` |
| `PUT` | `/api/doctores/:id/horarios` | Odontólogos / Horarios | Guardar esquema semanal | `{ dias: Array<{ dia_semana: number, activo: boolean, rangos: Array<{ hora_inicio: string, hora_fin: string }> }> }` | `{ success: boolean }` |
| `GET` | `/api/doctores/:id/dias-no-laborables` | Odontólogos / Horarios | Obtener días no laborables | Query params opcionales: `desde`, `hasta` | `Array<{ fecha: string, motivo?: string }>` |
| `POST` | `/api/doctores/:id/dias-no-laborables` | Odontólogos / Horarios | Agregar día no laborable/bloqueo | `{ fecha: string, motivo?: string }` | `{ fecha: string, motivo?: string }` |
| `DELETE` | `/api/doctores/:id/dias-no-laborables` | Odontólogos / Horarios | Quitar día no laborable | `{ fecha: string }` | `{ success: boolean }` |

---

### 1.8 Módulo: Administración de Usuarios
*Consumido por `src/pages/UsuariosPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/admin/usuarios` | Usuarios | Listado de usuarios del sistema | N/A | `Usuario[]` |
| `POST` | `/api/admin/usuarios` | Usuarios | Crear usuario nuevo | `{ username: string, password: string, nombre_completo: string, rol: 'admin' \| 'secretaria' \| 'odontologo' }` | `Usuario` |
| `PUT` | `/api/admin/usuarios/:id/activo` | Usuarios | Activar/Desactivar usuario | `{ activo: boolean }` | `{ success: boolean }` |
| `PUT` | `/api/admin/usuarios/:id/password` | Usuarios | Reestablecer contraseña de usuario | `{ password_nuevo: string }` | `{ success: boolean }` |

---

### 1.9 Módulo: Historial de Paciente (Ficha Unificada)
*Consumido por `src/pages/HistorialPage.tsx`.*

| Método | Ruta | Vista(s) | Propósito | Request Shape | Response Shape |
|---|---|---|---|---|---|
| `GET` | `/api/pacientes/:dni` | Historial | Datos demográficos del paciente | N/A | `Paciente` |
| `GET` | `/api/pacientes/:dni/cuenta` | Historial | Movimientos y balance del paciente | N/A | `{ saldo: number, movimientos: Array<any> }` |

---

## 2. Confirmación Específica de Cambios Recientes

A continuación se confirma el estado exacto en el frontend de cada una de las funcionalidades modificadas recientemente:

1. **Reactivación (Doctores, Tratamientos, Obras Sociales, Usuarios):**
   - **Doctores:** `PUT /api/doctores/:id/activo` con payload `{ activo: boolean }`.
   - **Tratamientos:** `PUT /api/catalogo/tratamientos/:id/activo` con payload `{ activo: boolean }`.
   - **Obras Sociales:** `PUT /api/catalogo/obras-sociales/:id/activo` con payload `{ activo: boolean }`.
   - **Usuarios:** `PUT /api/admin/usuarios/:id/activo` con payload `{ activo: boolean }`.

2. **Horarios de doctor y días no laborables:**
   - La pestaña "Configuración de Horarios" dentro de `/doctores` está completamente accesible para los roles **`admin`** y **`secretaria`** (con la barra de navegación `NavigationRail` configurada con `roles: ['admin', 'secretaria']`).
   - Llama a `GET` y `PUT` en `/api/doctores/:id/horarios` y a `GET`, `POST`, `DELETE` en `/api/doctores/:id/dias-no-laborables`.

3. **Cancelación de turno:**
   - Invoca `POST /api/turnos/:id/cancelar`.
   - Payload enviado en el body: `{ motivo_cancelacion: string }`.

4. **Búsqueda de pacientes:**
   - Usa `GET /api/pacientes/?buscar={query}`.
   - Dispara la llamada a partir de **2 caracteres** (`if (query.trim().length >= 2)`).
   - Renderiza un menú desplegable interactivo que busca por coincidencia en Nombre, Apellido o DNI.
   - Si no hay resultados, ofrece el botón de registro rápido mostrando: *"No se encontraron pacientes que coincidan con '{query}'"*.

5. **Creación de turno con `duracion_minutos` variable:**
   - Invoca `POST /api/turnos`.
   - El payload incluye: `{ fecha_hora: string, duracion_minutos: 30 | 60 | 90, motivo: string, dni_paciente: string, id_doctor: number }`.

6. **Ficha de doctor:**
   - Se confirmó la remoción de los campos `matricula`, `telefono`, `email` y `especialidad` del formulario.
   - Payload de creación/edición enviado: `{ nombre: string, color_agenda: string }`.
   - Reemplazo del icono tradicional de estetoscopio (`Stethoscope`) por el icono de muela (`IconTooth`).

7. **Eliminación del botón "Nuevo Turno" en Dashboard:**
   - Se removió el botón "Nuevo Turno" y la lógica modal duplicada en `DashboardPage.tsx`. Los usuarios navegan a la vista `/agenda` para crear turnos.

8. **Renombramiento en Caja y Cobros:**
   - La pestaña anteriormente llamada "Maestro de Deudores" pasó a llamarse **"Lista de Deudores"**, manteniendo intacta la lógica de ordenamiento por antigüedad y cobro de deudas.

---

## 3. Modelo de Datos Actual del Mock (Estado Completo de `db`)

Estructura de las tablas en memoria (`server.ts` / `db.json`):

```typescript
export interface DbState {
  usuarios: Array<{
    id: number;
    username: string;
    hashed_password?: string;
    rol: 'admin' | 'secretaria' | 'odontologo';
    activo: boolean;
    creado_en: string;
  }>;

  pacientes: Array<{
    dni: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }>;

  doctores: Array<{
    id: number;
    nombre: string;
    color_agenda: string;
    activo: boolean;
  }>;

  turnos: Array<{
    id: number;
    fecha_hora: string; // ISO String
    duracion_minutos: number; // 30, 60, 90
    motivo?: string;
    estado: 'Pendiente' | 'Realizado' | 'Cancelado';
    dni_paciente: string;
    id_doctor: number;
    motivo_cancelacion?: string;
    comentarios_medicos?: string;
    pieza_dental?: number | null;
    ubicacion_lesion?: string | null;
    conformidad_paciente?: boolean | null;
  }>;

  turnos_tratamientos: Array<{
    id: number;
    id_turno: number;
    nombre: string;
    cantidad: number;
    precio_ars: number;
    precio_usd: number;
  }>;

  pagos: Array<{
    id: number;
    monto: number;
    fecha_pago: string;
    metodo_pago: string;
    moneda: 'ARS' | 'USD';
    saldo_pendiente: number;
    dni_paciente: string;
    id_turno: number | null;
  }>;

  cuentas_corrientes: Array<{
    id: number;
    dni_paciente: string;
    saldo_ars: number;
    saldo_usd: number;
    ultima_actualizacion: string;
  }>;

  movimientos_cuenta: Array<{
    id: number;
    id_cuenta: number;
    tipo: 'cargo' | 'pago';
    monto: number;
    moneda: 'ARS' | 'USD';
    descripcion: string;
    fecha: string;
  }>;

  historias_clinicas: Array<{
    id: number;
    notas: string;
    ultima_actualizacion: string;
    dni_paciente: string;
    antecedentes?: string;
    odontograma?: Record<string, string>;
  }>;

  tratamientos_catalogo: Array<{
    id: number;
    codigo?: string;
    nombre: string;
    precio_ars: number;
    precio_usd: number;
    duracion_minutos: number;
    categoria: string;
    activo: boolean;
  }>;

  obras_sociales: Array<{
    id: number;
    nombre: string;
    acronimo?: string;
    contacto?: string;
    activo: boolean;
  }>;

  slots_bloqueados: Array<{
    id: number;
    fecha: string;
    hora: string;
    id_doctor: number;
    motivo: string;
    bloqueado_por_id: number;
    creado_en: string;
  }>;

  pacientes_imagenes: Array<{
    id: number;
    dni_paciente: string;
    nombre: string;
    url: string;
    carpeta: string;
    es_radiografia: boolean;
    creado_en: string;
  }>;

  horarios_doctores: {
    [id_doctor: string]: {
      dias: Array<{
        dia_semana: number; // 0..6
        activo: boolean;
        rangos: Array<{ hora_inicio: string; hora_fin: string }>;
      }>;
    };
  };

  dias_no_laborables_doctores: {
    [id_doctor: string]: Array<{ fecha: string; motivo?: string }>;
  };
}
```

---

## 4. Esquema de Autenticación y Autorización

- **Formato de Autenticación:** Basado en JWT con tokens pareados: `access_token` y `refresh_token`.
- **Almacenamiento Local:** Se guardan en `localStorage`:
  - `access_token`
  - `refresh_token`
  - `user_role` (`admin` | `secretaria` | `odontologo`)
  - `user_username`
- **Envío de Credenciales:** En cada llamada protegida a la API, el helper `apiFetch` (en `src/lib/api.ts`) adjunta la cabecera:
  `Authorization: Bearer <access_token>`
- **Renovación Transparente de Token (Refresh Flow):** Al recibir un HTTP Status `401 Unauthorized`, `apiFetch` invoca en segundo plano `POST /api/auth/refresh` enviando `{ refresh_token }`. Si responde con éxito, actualiza los tokens en `localStorage` y reintenta de forma transparente la solicitud original. Si falla, limpia la sesión y emite el evento `'auth-expired'`.

---

## 5. Variables de Entorno Utilizadas

Para el despliegue y desarrollo local, la aplicación interactúa con las siguientes variables de entorno:

| Variable | Ubicación / Configuración | Valor por Defecto / Propósito |
|---|---|---|
| `PORT` | `server.ts` | `3000` — Puerto de escucha del servidor Node Express. |
| `NODE_ENV` | `server.ts` / Scripts `package.json` | `'development'` en local, `'production'` en contenedor. Determina si Express sirve la App vía middleware de Vite o estáticos compilados en `dist/`. |
| `DISABLE_HMR` | `vite.config.ts` | `'true'` o `'false'`. Desactiva el Hot Module Replacement en entornos administrados para prevenir reinicios accidentales. |
| `GEMINI_API_KEY` | `server.ts` | Llave opcional utilizada como fallback para la firma de `JWT_SECRET` (`process.env.GEMINI_API_KEY || "odonto_secret_key_998877"`). |

---

## 6. Archivo package.json Final Actual

Contenido exacto del archivo `package.json` utilizado en el proyecto:

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
    "typescript": "~5.8.2"
  }
}
```

---

## 7. Inconsistencias Internas y Recomendaciones para Backend Real

A la hora de implementar el backend definitivo (ej: PostgreSQL/Node.js o NestJS/Fastify), se deben tener en cuenta las siguientes observaciones técnicas identificadas en la auditoría:

1. **Tipos de datos de ID:**
   - En el mock, los DNI de pacientes son cadenas de texto (`string`) utilizadas como identificadores primarios (ej: `/api/pacientes/:dni`). Sin embargo, algunas referencias cruzadas o endpoints secundarios pueden esperar IDs numéricos o cadenas. En la base de datos relacional final se sugiere usar `UUID` o `BIGINT` como clave primaria de paciente, conservando el campo `dni` con un índice de unicidad (`UNIQUE INDEX`).
2. **Control de Concurrencia en Bloqueo de Slots:**
   - El endpoint `POST /api/turnos/slots/bloquear` actual guarda bloqueos en un arreglo en memoria. En el backend de producción, se recomienda un esquema de locks temporales respaldado por Redis con expiración automática (TTL de 5-10 minutos).
3. **Manejo de Moneda Dual (ARS / USD):**
   - Las prestaciones y los pagos almacenan importes tanto en ARS como en USD. Se debe garantizar que las tablas de finanzas guarden el tipo de cambio (`cotizacion_usd`) al momento del cobro para permitir auditorías históricas precisas.
4. **Respuesta de Endpoints de Búsqueda:**
   - El endpoint `GET /api/pacientes/?buscar={query}` sanitiza tildes y caracteres especiales con normalización NFD en el mock. En la base relacional, se sugiere utilizar funciones como `ILIKE` o un índice Full-Text Search (`unaccent(lower(nombre || ' ' || apellido || ' ' || dni))`).

---
*Fin de la Auditoría Técnica Final del Proyecto OdontoGest.*
