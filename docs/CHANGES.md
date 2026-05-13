# OdontoGest — Registro de Cambios (CHANGES)

Flujo de estados:
```
PROPUESTO → EN REVISIÓN → APROBADO → EN DESARROLLO → COMPLETADO
```

---

## Mapa de Dependencias

```
CHANGE-001  Refactor Backend                        ✅ COMPLETADO
CHANGE-002  Migración Frontend React+TS             ✅ COMPLETADO
CHANGE-003  Módulo Finanzas / Caja                  ✅ COMPLETADO
CHANGE-004  Cuentas Corrientes / Deudores           ✅ COMPLETADO
CHANGE-005  Rest API Complementos                   ✅ COMPLETADO
── Mejoras post-migración ─────────────────────────────────────
INIT-002    Fix Deudores Frontend                   ✅ COMPLETADO
INIT-003    Historial Pagos Backend                 ✅ COMPLETADO
INIT-004    Navegación Query Perfil                 ✅ COMPLETADO
INIT-005    Rediseño Historial Paciente             ✅ COMPLETADO
── Próximas fases ──────────────────────────────────────────────
CHANGE-009  Autenticación JWT y Roles (admin + secretaria)  ✅ COMPLETADO
   └── CHANGE-011  Catálogo de Tratamientos y Obras Sociales       ✅ COMPLETADO
         └── CHANGE-007  Portal Autogestión (guest checkout, UUID)
               └── CHANGE-006  Notificaciones (email + WhatsApp + bot)
CHANGE-008  Reportes Exportables (Excel)
CHANGE-010  Deploy a Producción
```

> Orden de ejecución: 009 → 011 → 007 → 006 → 008 → 010

---

## ✅ Cambios Completados

### [CHANGE-001] Refactor del Backend — Buenas Prácticas FastAPI
- **Estado:** COMPLETADO
- **HU relacionada:** HU-005
- **Descripción:** Separación de rutas con `APIRouter` por dominio, refactor de
  `crud.py`, `models.py`, `schemas.py` y `database.py`. CORS habilitado.
  Estructura movida de `app/` a `backend/`.
- **Carpeta OpenSpec:** `openspec/changes/refactor-backend-buenas-practicas/`

---

### [CHANGE-002] Migración del Frontend a React + TypeScript
- **Estado:** COMPLETADO
- **HU relacionada:** HU-006
- **Descripción:** Las 4 vistas HTML/JS vanilla migradas a React 18 + TypeScript
  con Vite, Tailwind CSS y React Router v6. Servicios centralizados en `api.ts`.
- **Carpeta OpenSpec:** `openspec/changes/migracion-frontend-react-ts/`

---

### [CHANGE-003] Módulo Finanzas y Caja Diaria
- **Estado:** COMPLETADO
- **HU relacionada:** HU-002, HU-003
- **Descripción:** Modelo de caja diaria, cobro de turnos con multimoneda ARS/USD,
  endpoint de cierre de turno, resumen de caja del día, registro en cuenta corriente.
- **Carpeta OpenSpec:** `openspec/changes/modulo-finanzas-caja/`

---

### [CHANGE-004] Cuentas Corrientes y Gestión de Deudores
- **Estado:** COMPLETADO
- **HU relacionada:** HU-004
- **Descripción:** Modelo `CuentaCorriente` y `MovimientoCuenta`, endpoints de
  deudores y detalle de cuenta por paciente, auditoría de movimientos ARS/USD.
- **Carpeta OpenSpec:** `openspec/changes/cuentas-corrientes-deudores/`

---

### [CHANGE-005] Rest API Complementos
- **Estado:** COMPLETADO
- **HU relacionada:** HU-001, HU-005
- **Descripción:** Endpoints faltantes: filtrado de turnos por fecha/doctor,
  `PUT /pacientes/{dni}`, `GET /turnos/hoy`, CRUD de doctores, indexación y
  validación de duplicados.
- **Carpeta OpenSpec:** `openspec/changes/rest-api-complementos/`

---

### [INIT-001] Scaffold inicial de documentación
- **Estado:** COMPLETADO
- **Descripción:** Creación de la estructura base de documentación y specs OpenSpec.
- **Módulos afectados:** documentación general, todos los specs

---

### [INIT-002] Fix Deudores Frontend
- **Estado:** COMPLETADO | **Fecha:** 2026-05-05
- **Descripción:** Corrección de visualización de deudores en PagosPage.
  El KPI "Saldo en la Calle" no mostraba valores correctos; la tabla de pagos
  no cargaba deudores correctamente.
- **Carpeta OpenSpec:** `openspec/changes/fix-deudores-frontend/`

---

### [INIT-003] Historial de Pagos y Tratamientos — Backend
- **Estado:** COMPLETADO | **Fecha:** 2026-05-06
- **Descripción:** Nuevos endpoints `GET /pacientes/historial?dni=X` y
  `GET /finanzas/pagos` con filtros. Ambos usan `joinedload` para evitar N+1.
- **Carpeta OpenSpec:** `openspec/changes/historial-pagos-backend/`

---

### [INIT-004] Navegación Query Perfil
- **Estado:** COMPLETADO | **Fecha:** 2026-05-07
- **Descripción:** Corrección de navegación: botón retroceso desde
  HistorialPacientePage navega a `/pacientes?dni=<dni>`. PerfilPacientePage
  lee query-param y abre perfil correspondiente.
- **Carpeta OpenSpec:** `openspec/changes/navegacion-query-perfil/`

---

### [INIT-005] Rediseño Historial del Paciente
- **Estado:** COMPLETADO | **Fecha:** 2026-05-07
- **Descripción:** Página dedicada `HistorialPacientePage.tsx` en ruta
  `/pacientes/:dni/historial`. Layout dos columnas: timeline de turnos +
  tabla de pagos. Rediseño del Resumen de Cuenta en PerfilPacientePage.
- **Carpeta OpenSpec:** `openspec/changes/rediseno-historial-paciente/`

---

## 🔄 Cambios Pendientes (por orden de ejecución)

---

### [CHANGE-009] Autenticación JWT y Roles (admin + secretaria)
- **Estado:** COMPLETADO
- **Prioridad:** CRÍTICA — bloqueante para CHANGE-011, CHANGE-007 y CHANGE-010
- **HU relacionada:** HU-007
- **Descripción:**
  Implementar autenticación JWT para usuarios internos. Solo dos roles:
  `admin` (gestión total + configuración + usuarios) y `secretaria`
  (gestión operativa completa: agenda, pacientes, finanzas, aprobación de turnos).

  El paciente **no tiene cuenta**. Accede al portal vía guest checkout con DNI.
  Los turnos se protegen con UUID público, no con login.

   Puntos clave backend:
     - Modelo `Usuario`: `username`, `hashed_password`, `rol`, `activo`
     - Endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
     - `POST /admin/usuarios` y `GET /admin/usuarios` (solo admin)
   - `PUT /admin/usuarios/{id}` — editar username y/o contraseña (solo admin).
     Requiere `current_password` solo si el admin se edita a sí mismo.
     Al editar secretarias, el admin puede cambiar la contraseña sin conocer la actual.
   - `DELETE /admin/usuarios/{id}` — eliminar secretaria (solo admin, no admin)
     - Al cambiar contraseña: requiere `current_password`, si no coincide → 403
     - Middleware `get_current_user` con `Depends` en todos los routers internos
    - Decorador `require_role(["admin", "secretaria"])`
    - Contraseñas hasheadas con `bcrypt` (passlib)
    - JWT: access 30 min, refresh 7 días
    - Rate limiting con `slowapi` en endpoints públicos (preparación para CHANGE-007)
    - Headers de seguridad HTTP (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)

   Puntos clave frontend:
     - `LoginPage.tsx` — solo para admin y secretaria, diseño consistente con el sistema
     - `AdminPage.tsx` — panel de gestión de usuarios (solo admin): crear, editar
       (username + contraseña), listar, activar/desactivar y eliminar secretarias
     - `AuthContext` con `useAuth()` hook
     - `PrivateRoute` — redirige a `/login` si no autenticado
     - Interceptores JWT en `api.ts` (Bearer + refresh automático en 401)
     - Botón de cerrar sesión en NavigationRail con confirmación
     - Show/hide contraseña con ícono ojo en todos los inputs de password

- **Archivos afectados:**
    - `backend/models.py` (NUEVO: Usuario)
    - `backend/schemas/auth.py` (NUEVO)
    - `backend/crud/auth.py` (NUEVO)
    - `backend/routers/auth.py` (NUEVO)
    - `backend/routers/admin.py` (NUEVO)
    - `backend/core/security.py` (NUEVO)
    - `backend/core/config.py` (NUEVO o ampliar)
    - `backend/dependencies.py` (NUEVO)
    - `backend/main.py` (registrar routers, agregar slowapi + security headers)
    - Todos los routers existentes → `Depends(get_current_user)`
     - `frontend/src/pages/LoginPage.tsx` (NUEVO)
     - `frontend/src/pages/AdminPage.tsx` (NUEVO)
     - `frontend/src/context/AuthContext.tsx` (NUEVO)
    - `frontend/src/components/PrivateRoute.tsx` (NUEVO)
    - `frontend/src/services/api.ts` (ampliar interceptores)
    - `frontend/src/App.tsx` (AuthProvider + PrivateRoute)
- **Carpeta OpenSpec:** `openspec/changes/autenticacion-jwt-roles/`
- **Depende de:** —

---

### [CHANGE-011] Catálogo de Tratamientos y Obras Sociales
- **Estado:** COMPLETADO
- **Prioridad:** ALTA — prerrequisito para CHANGE-007 y mejora del dashboard
- **HU relacionada:** HU-001 (ampliada), HU-008 (preparación)
- **Descripción:**
  Crear un catálogo centralizado de tratamientos odontológicos con precios base
  en ARS y USD, y un catálogo de obras sociales para usar en selectores del
  sistema. El catálogo alimenta tanto el modal de turnos del dashboard interno
  como el paso 1 del portal de autogestión.

   Puntos clave backend:
     - Modelo `TratamientoCatalogo`: nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo
     - Modelo `ObraSocial`: nombre, activo
     - Seed inicial: "Particular" + 6 mutuales (OSDE, Swiss Medical, Galeno, Medicus, Sancor Salud, OMINT)
     - CRUD endpoints bajo `/catalogo/` (GET público, POST/PUT/DELETE admin+secretaria)
     - Soft-delete: `activo=false` en vez de eliminar
    - Soft-delete: `activo=false` en vez de eliminar

  Puntos clave frontend:
    - `CatalogoPage.tsx` — tabla CRUD de tratamientos (admin/secretaria)
    - Integración en modal de cierre de turno: elegir del catálogo (precarga precio **editable**) o "Servicio Manual" con texto libre
    - Selector de obra social reutilizable (usa GET /catalogo/obras-sociales)

- **Archivos afectados:**
    - `backend/models.py` (+TratamientoCatalogo, +ObraSocial)
    - `backend/schemas/catalogo.py` (NUEVO)
    - `backend/crud/catalogo.py` (NUEVO)
    - `backend/routers/catalogo.py` (NUEVO)
    - `backend/main.py` (registrar router catalogo)
    - `backend/seed.py` (ampliar: seed obras sociales)
    - `frontend/src/pages/CatalogoPage.tsx` (NUEVO)
    - `frontend/src/pages/AgendaPage.tsx` (modal usa catálogo)
- **Carpeta OpenSpec:** `openspec/changes/catalogo-tratamientos-obras-sociales/`
- **Depende de:**
    - CHANGE-009 (auth para endpoints de escritura del catálogo)

---

### [CHANGE-007] Portal de Autogestión del Paciente (Guest Checkout)
- **Estado:** PROPUESTO — **REDISEÑADO**
- **Prioridad:** ALTA
- **HU relacionada:** HU-008
- **Descripción:**
  Portal público donde el paciente solicita turnos **sin crear cuenta ni login**.
  Flujo guest checkout en 4 pasos con verificación por DNI. Shadow profiles:
  si el DNI no existe, el sistema crea el paciente automáticamente.

  Flujo completo del paciente:
    1. **Elegir Tratamiento**: cards del catálogo con nombre, precio, duración. Buscador + filtros.
    2. **Elegir Profesional**: cards de doctores (Darío / Fabiana).
    3. **Elegir Horario**: slots de 30 min como tarjetas rectangulares. Solo franjas
       mañana (09:00-12:30) y tarde (16:00-19:30). Sin jueves ni domingo.
    4. **Identificación**: ingresa DNI → backend verifica:
       - DNI existe → muestra datos en modo lectura (nombre, apellido, celular, obra social)
       - DNI no existe → formulario para cargar nombre, apellido, celular, email (opcional), obra social (selector)
    5. **Confirmación**: se crea turno con estado `solicitado` + UUID único.
       Si DNI no existía → shadow profile (INSERT paciente). Muestra UUID y link de seguimiento.

  Flujo de aprobación (secretaria):
    - Panel "Solicitudes" en AgendaPage: lista de turnos `solicitados`
    - **Aceptar** → cambia estado a `pendiente` (confirmado), dispara notificación
    - **Rechazar** → modal con textarea para motivo → estado `rechazado`, notifica al paciente con la razón

  Consulta pública por UUID:
    - Ruta `/consulta/:uuid` — página pública sin auth
    - Muestra: estado, fecha, hora, doctor, tratamiento, motivo de rechazo (si aplica)
    - Botón "Cancelar turno" si estado es `solicitado` o `pendiente`

  Bloqueo manual de slots (secretaria):
    - Puede bloquear un slot (ej: tratamiento largo de 1 hora)
    - Endpoint `POST /turnos/bloquear` crea turno con estado `bloqueado`, sin paciente
    - Slot bloqueado aparece gris oscuro/rojo en disponibilidad

  Horarios de atención:
    - Mañana: 09:00 a 12:30 (último turno 12:30)
    - Tarde: 16:00 a 19:30 (último turno 19:30)
    - Clínica cerrada: 13:00 a 16:00
    - Sin atención jueves ni domingo

  Puntos clave backend:
    - `GET /pacientes/verificar/{dni}` → público, solo datos no sensibles
    - `GET /portal/disponibilidad?doctor_id=&fecha=` → slots libres con franjas
    - `POST /portal/reservar` → crea turno + shadow profile si necesario, devuelve UUID
    - `GET /portal/turno/{uuid}` → consulta pública de estado
    - `PUT /portal/turno/{uuid}/cancelar` → cancelación pública
    - `GET /turnos/solicitados` → listado para secretaria
    - `PUT /turnos/{id}/confirmar` → aceptar solicitud
    - `PUT /turnos/{id}/rechazar` → rechazar con motivo
    - `POST /turnos/bloquear` → bloquear slot
    - `DELETE /turnos/{id}/desbloquear` → liberar slot bloqueado
    - Rate limiting en todos los endpoints públicos (slowapi)

  Estados del turno:
    - `solicitado` → paciente envió solicitud, espera aprobación
    - `pendiente` → secretaria aceptó, confirmado en agenda
    - `confirmado` → turno firme (sinónimo de pendiente para mantener compatibilidad)
    - `bloqueado` → secretaria bloqueó el slot manualmente
    - `realizado` → atendido y cobrado
    - `cancelado` → cancelado por paciente o secretaria
    - `rechazado` → secretaria rechazó la solicitud (incluye motivo)

  Transiciones válidas:
    - solicitado → pendiente (secretaria acepta)
    - solicitado → rechazado (secretaria rechaza)
    - solicitado → cancelado (paciente cancela vía UUID)
    - pendiente → realizado (secretaria cierra con cobro)
    - pendiente → cancelado (secretaria o paciente)
    - bloqueado → cancelado (secretaria libera)

- **Archivos afectados:**
    - `backend/models.py` (Turno: +uuid, +motivo_rechazo, +id_tratamiento, +obra_social)
    - `backend/schemas/portal.py` (NUEVO)
    - `backend/schemas/turnos.py` (ampliar)
    - `backend/schemas/pacientes.py` (VerificacionDNIResponse)
    - `backend/crud/portal.py` (NUEVO)
    - `backend/routers/portal.py` (NUEVO)
    - `backend/routers/pacientes.py` (+verificar)
    - `backend/routers/turnos.py` (+solicitados, confirmar, rechazar, bloquear, validar horarios)
    - `frontend/src/pages/portal/PortalPage.tsx` (NUEVO — stepper)
    - `frontend/src/pages/portal/Step1Servicio.tsx` (NUEVO)
    - `frontend/src/pages/portal/Step2Profesional.tsx` (NUEVO)
    - `frontend/src/pages/portal/Step3Agenda.tsx` (NUEVO)
    - `frontend/src/pages/portal/Step4Identificacion.tsx` (NUEVO)
    - `frontend/src/pages/portal/ConfirmacionTurno.tsx` (NUEVO)
    - `frontend/src/pages/ConsultaTurnoPage.tsx` (NUEVO)
    - `frontend/src/pages/AgendaPage.tsx` (+panel solicitudes, +bloqueo)
    - `frontend/src/App.tsx` (+rutas públicas portal y consulta)
- **Carpeta OpenSpec:** `openspec/changes/portal-autogestion-paciente/`
- **Depende de:**
    - CHANGE-009 (auth para panel de aprobación, slowapi para rate limiting)
    - CHANGE-011 (catálogo de tratamientos y obras sociales)

---

### [CHANGE-006] Notificaciones (Email + WhatsApp + Bot)
- **Estado:** PROPUESTO — **EXPANDIDO**
- **Prioridad:** MEDIA
- **HU relacionada:** HU-009
- **Descripción:**
  Sistema de notificaciones multicanal: email y WhatsApp. El email es opcional
  (personas mayores pueden no usarlo). WhatsApp incluye un bot conversacional
  con opciones: auto-asignarse turno, hablar con secretaria, o llamar a la clínica.

  Canales y prioridad:
    1. Si paciente tiene email → envía email con link UUID
    2. Si paciente tiene teléfono → envía WhatsApp con link UUID
    3. Si no tiene ninguno → UUID solo en pantalla de confirmación

  Eventos que disparan notificación:
    - Turno aceptado → "Tu turno fue confirmado para [fecha] a las [hora]. Link: /consulta/{uuid}"
    - Turno rechazado → "Tu solicitud fue rechazada. Motivo: [razón]. Solicitá otro turno en: /portal"
    - Recordatorio 48h antes → "Te recordamos tu turno de mañana a las [hora]"
    - Recordatorio 2h antes → "Tu turno es hoy a las [hora] con el Dr. [nombre]"

  WhatsApp Bot (webhook):
    - El paciente escribe al WhatsApp de la clínica
    - Keyword "turno" / "reservar" → envía link al portal
    - Keyword "secretaria" / "hablar" / "humano" → notifica a secretaria
    - Keyword "llamar" / "teléfono" → responde con número de la clínica
    - Fallback → "Escribí 'turno' para reservar, 'secretaria' para hablar con nosotros, o 'llamar' para el teléfono"

  Puntos clave:
    - Servicios desacoplados: `notificaciones.py`, `email_service.py`, `whatsapp_service.py`
    - Plantillas en `plantillas.py` (texto configurable)
    - Scheduler APScheduler para recordatorios
    - Webhook `POST /webhook/whatsapp` para recibir mensajes del bot
    - Mock inicial (sin API externa): responde con mensajes predefinidos
    - Variables de entorno: `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_ID`, `SMTP_*`, `EMAIL_FROM`

- **Archivos afectados:**
    - `backend/services/notificaciones.py` (NUEVO)
    - `backend/services/email_service.py` (NUEVO)
    - `backend/services/whatsapp_service.py` (NUEVO)
    - `backend/services/plantillas.py` (NUEVO)
    - `backend/services/scheduler.py` (NUEVO)
    - `backend/routers/webhook.py` (NUEVO: POST /webhook/whatsapp)
    - `backend/routers/turnos.py` (triggers al confirmar/rechazar)
    - `backend/routers/portal.py` (trigger al reservar)
    - `backend/core/config.py` (ampliar: vars email + WhatsApp)
    - `requirements.txt` (ampliar: apscheduler, httpx)
- **Carpeta OpenSpec:** `openspec/changes/notificaciones-whatsapp/`
- **Depende de:**
    - CHANGE-007 (portal: flujo de confirmación/rechazo es el trigger principal)

---

### [CHANGE-008] Reportes Exportables (Excel)
- **Estado:** PROPUESTO
- **Prioridad:** MEDIA
- **HU relacionada:** HU-010
- **Descripción:**
  Generación y descarga de reportes en `.xlsx` desde el panel interno.
  - Historia clínica del paciente (datos, turnos, tratamientos, pagos)
  - Listado de deudores (saldo pendiente ARS/USD)
  - Resumen de ingresos (filtrable por fecha, desglose por moneda y método)
  - Solo accesible para roles `admin` y `secretaria`
- **Archivos afectados:** `backend/services/reportes.py` (NUEVO), `backend/routers/reportes.py` (NUEVO),
  `frontend/src/pages/HistorialPacientePage.tsx`, `DashboardPage.tsx`, `PagosPage.tsx`
- **Carpeta OpenSpec:** `openspec/changes/reportes-exportables-excel/`
- **Depende de:**
    - CHANGE-009 (auth: endpoints protegidos por rol)

---

### [CHANGE-010] Deploy a Producción
- **Estado:** PROPUESTO
- **Prioridad:** ALTA — último paso
- **HU relacionada:** —
- **Descripción:**
  Despliegue completo en producción con HTTPS, PostgreSQL, backups y monitoreo.
  - Backend: Railway o Render (FastAPI + Uvicorn)
  - Frontend: Vercel (build estático Vite)
  - PostgreSQL: Railway o Supabase free tier
  - Dockerfile, docker-compose.yml, Alembic, .env.example
  - HTTPS con Let's Encrypt, HSTS, CORS restrictivo
  - Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
  - Backup automático diario
- **Archivos afectados:** `Dockerfile` (NUEVO), `docker-compose.yml` (NUEVO), `.env.example` (NUEVO),
  `alembic/` (NUEVO), `backend/core/config.py` (ampliar), `frontend/vite.config.ts`
- **Carpeta OpenSpec:** `openspec/changes/deploy-produccion/`
- **Depende de:**
    - CHANGE-009 (auth antes de exponer a internet)
    - CHANGE-007 (portal completo)
    - CHANGE-006 (notificaciones con vars de entorno reales)
    - CHANGE-008 (reportes funcionando)

---

## Guía rápida para el agente

Para proponer un nuevo cambio:
```
/openspec:proposal <descripción del cambio>
```

El agente debe:
1. Leer los specs relevantes en `openspec/specs/`
2. Crear `openspec/changes/<nombre-del-cambio>/`
3. Generar `proposal.md`, `design.md`, `tasks.md`
4. Actualizar este archivo con el nuevo cambio en estado PROPUESTO

⚠ Orden de ejecución:
   CHANGE-009 → CHANGE-011 → CHANGE-007 → CHANGE-006 → CHANGE-008 → CHANGE-010
