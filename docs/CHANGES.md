# OdontoGest — Registro de Cambios (CHANGES)

Flujo de estados:
```
PROPUESTO → EN DESARROLLO → COMPLETADO
```

---

## Mapa de Dependencias

```
project-setup ──┬── gestion-pacientes-y-turnos ── finanzas-y-caja-diaria ── cuentas-corrientes-y-deudores ── historial-y-mejoras-frontend
                │
                └── auth-y-autorizacion ──┬── catalogo-tratamientos ── portal-autogestion ── notificaciones
                                          │
                                          └── reportes-excel ──────────────────────────────────────────┐
                                                                                                        │
                        todos ────────────────────────────────────────────────────────────────── polish-y-deploy
```

> **Leyenda**: ✅ COMPLETADO | 🔲 PENDIENTE
>
> Orden de ejecución pendiente: 8 → 9 → 10 → 11

---

## Estimación de Sprints

| Sprint | Changes | Estado |
|--------|---------|--------|
| Sprint 1-3 | 1 `project-setup` → 5 `historial-y-mejoras-frontend` | ✅ COMPLETADO |
| Sprint 4-5 | 6 `auth-y-autorizacion` → 7 `catalogo-tratamientos` | ✅ COMPLETADO |
| Sprint 6 | 8 `portal-autogestion` | 🔲 PENDIENTE |
| Sprint 7 | 9 `notificaciones` | 🔲 PENDIENTE |
| Sprint 8 | 10 `reportes-excel` | 🔲 PENDIENTE |
| Sprint 9 | 11 `polish-y-deploy` | 🔲 PENDIENTE |

---

## ⚠️ Riesgos y Advertencias

1. **`portal-autogestion`** (change 8): el más complejo. Stepper 4 pasos, shadow profiles, UUID público, panel de aprobación, bloqueo de slots, validación horaria por día de semana. 22+ tareas planificadas. Riesgo de scope creep.

2. **Estados del turno**: models.py usa valores simplificados (`"Pendiente"`, `"Asistió"`, `"Canceló"`). `portal-autogestion` migra a 7 estados (`solicitado`, `pendiente`, `bloqueado`, `realizado`, `cancelado`, `rechazado` + compatibilidad). La migración debe preservar datos existentes.

3. **`notificaciones`** (change 9): mock inicial sin APIs externas. La integración real (Twilio/WhatsApp Cloud API + SMTP) en `polish-y-deploy` requiere verificación de negocio y costos de API.

4. **`polish-y-deploy`**: bloqueado hasta que todos los changes anteriores estén completos. Sin auth + portal + notificaciones, no se puede exponer a internet.

---

## ✅ Cambios Completados

---

### [1]. `project-setup`

**Funcionalidad**: Scaffolding inicial del proyecto. Estructura de carpetas backend (FastAPI) y frontend (React+TS+Vite+Tailwind). Modelos ORM base con relaciones. Configuración de entorno (.env, database.py). Migraciones iniciales y seed data de tablas. CORS habilitado.

**Historias**: HU-005, HU-006

**Reglas de negocio**: —

**Depende de**: — (punto de partida)

**Complejidad**: Media

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `main.py`, `database.py`, `models.py` | `App.tsx`, `main.tsx`, `vite.config.ts` |
| `routers/`, `schemas/`, `crud/` base | `tailwind.config.ts`, `tsconfig.json`, `package.json` |
| `requirements.txt`, `.env` | `types/index.ts` base |

---

### [2]. `gestion-pacientes-y-turnos`

**Funcionalidad**: Gestión completa de pacientes (CRUD con búsqueda por DNI) y turnos (asignación por doctor, vista por fecha, validación de duplicados, cancelación). AgendaPage funcional con doctores y filtros. PerfilPacientePage con búsqueda y edición.

**Historias**: HU-001

**Reglas de negocio**: RN-01 (horarios), RN-02 (estados), RN-03 (prevención duplicados)

**Depende de**: `project-setup` (necesita modelos ORM y estructura base)

**Complejidad**: Media

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `routers/pacientes.py`, `routers/turnos.py` | `AgendaPage.tsx`, `PerfilPacientePage.tsx` |
| `crud/pacientes.py`, `crud/turnos.py` | `Modal.tsx`, `MultiCurrencyInput.tsx` |
| `schemas/pacientes.py`, `schemas/turnos.py` | `api.ts` |

---

### [3]. `finanzas-y-caja-diaria`

**Funcionalidad**: Módulo de pagos y caja diaria. Cierre de turno con cobro multimoneda (ARS/USD). Registro de tratamientos realizados y pagos recibidos. Resumen de caja del día (turnos realizados/pendientes, ingresos ARS y USD). Dashboard KPI en tiempo real.

**Historias**: HU-002, HU-003

**Reglas de negocio**: RN-04 (monedas), RN-05 (pagos), RN-11 (cierre de turno)

**Depende de**: `gestion-pacientes-y-turnos` (necesita modelo Turno y paciente para cobrar)

**Complejidad**: Alta

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `routers/finanzas.py` | `DashboardPage.tsx`, `PagosPage.tsx` |
| `crud/finanzas.py` | `KPICard.tsx` |
| `schemas/finanzas.py` | `api.ts` (cerrarTurno, getCajaHoy) |

---

### [4]. `cuentas-corrientes-y-deudores`

**Funcionalidad**: Modelo CuentaCorriente y MovimientoCuenta. Saldo ARS y USD por paciente. Endpoint de deudores (pacientes con saldo > 0). Detalle de movimientos por paciente. Auditoría de cargos y pagos.

**Historias**: HU-004

**Reglas de negocio**: —

**Depende de**: `finanzas-y-caja-diaria` (necesita modelo Pago para los movimientos)

**Complejidad**: Media

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `models.py` (+CuentaCorriente, +MovimientoCuenta) | `PerfilPacientePage.tsx` (sección deuda) |
| `routers/pacientes.py` (+deudores, +/{dni}/cuenta) | `PagosPage.tsx` (tabla deudores) |
| `crud/pacientes.py` | `api.ts` (getCuentaCorriente, getDeudores) |

---

### [5]. `historial-y-mejoras-frontend`

**Funcionalidad**: Endpoint de historial de paciente (GET /pacientes/historial?dni=X con filtros de fecha). Página dedicada HistorialPacientePage con layout de dos columnas (timeline de turnos con tratamientos + tabla de pagos). Rediseño del resumen de cuenta en PerfilPacientePage. Corrección de navegación entre perfil e historial. Listado de pagos completo en finanzas con filtros avanzados.

**Historias**: HU-004 (ampliada)

**Reglas de negocio**: —

**Depende de**: `cuentas-corrientes-y-deudores` (necesita endpoints de cuenta y deudores para el historial)

**Complejidad**: Media

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `routers/pacientes.py` (+historial) | `HistorialPacientePage.tsx` |
| `routers/finanzas.py` (+pagos filtrables) | `PerfilPacientePage.tsx` (rediseño resumen) |
| `schemas/turnos.py` (HistorialPacienteResponse) | `NavigationRail.tsx` (navegación query param) |

---

### [6]. `auth-y-autorizacion`

**Funcionalidad**: Autenticación JWT con dos roles (admin y secretaria). Login, refresh automático, logout. Panel de administración de usuarios: crear, editar (username y contraseña con verificación de contraseña actual para self-edit), listar, activar/desactivar, eliminar secretarias. Rate limiting con slowapi. Security headers HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options). CRUD completo de doctores con soft-delete. Protección de todos los routers existentes con middleware require_role.

**Historias**: HU-007

**Reglas de negocio**: RN-10 (rate limiting), RN-12 (seguridad de datos)

**Depende de**: `project-setup` (necesita estructura base y modelos)

**Complejidad**: Alta

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `models.py` (+Usuario, Doctor.activo, Turno.creado_por_id) | `LoginPage.tsx`, `AdminPage.tsx` |
| `routers/auth.py`, `routers/admin.py`, `dependencies.py` | `AuthContext.tsx`, `PrivateRoute.tsx` |
| `core/config.py`, `core/security.py` | `interceptors.ts`, `NavigationRail.tsx` |
| `schemas/auth.py`, `crud/auth.py` | `api.ts` (interceptores JWT) |
| `routers/doctores.py` (completar CRUD) | `App.tsx` (AuthProvider + PrivateRoute) |

---

### [7]. `catalogo-tratamientos`

**Funcionalidad**: Catálogo centralizado de tratamientos odontológicos con precios base en ARS y USD (modelo TratamientoCatalogo). Catálogo de obras sociales (modelo ObraSocial) con seed de 7 mutuales argentinas. CRUD endpoints bajo /catalogo/ — GET públicos, POST/PUT/DELETE para admin y secretaria. Soft-delete en ambos. Página CatalogoPage con tabla CRUD, filtros por categoría y modales. Integración en modal de cierre de turno: selector del catálogo (precarga precio editable) o "Servicio Manual" con texto libre.

**Historias**: HU-001 (ampliada — el modal de turno ahora usa catálogo)

**Reglas de negocio**: RN-04 (precios ARS/USD), RN-07 (obra social como texto libre con selector)

**Depende de**: `auth-y-autorizacion` (endpoints de escritura requieren roles, GET públicos usan rate limiting)

**Complejidad**: Media

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `models.py` (+TratamientoCatalogo, +ObraSocial) | `CatalogoPage.tsx` |
| `schemas/catalogo.py`, `crud/catalogo.py` | `AgendaPage.tsx` (modal con catálogo) |
| `routers/catalogo.py` | `types/index.ts` (+tipos) |
| `crear_tablas.py` (seed obras sociales) | `NavigationRail.tsx` (+link Catálogo) |

---

## 🔄 Cambios Pendientes

---

### [8]. `portal-autogestion`

**Funcionalidad**: Portal público de autogestión del paciente sin login (guest checkout). Flujo en 4 pasos: (1) elegir tratamiento del catálogo con buscador y filtros, (2) elegir doctor, (3) elegir horario con slots de 30 min como tarjetas rectangulares en franjas mañana (9:00-12:30) y tarde (16:00-19:30), sábado solo mañana, sin jueves ni domingo, (4) identificación por DNI con verificación y shadow profile automático (si el DNI no existe, se crea el paciente). Turno creado con estado "solicitado" + UUID v4. Página pública de consulta por UUID (/consulta/:uuid) con cancelación. Panel de aprobación en AgendaPage: secretaria ve solicitudes pendientes, acepta (→ estado "pendiente") o rechaza con textarea de motivo (→ estado "rechazado"). Bloqueo manual de slots por secretaria. Dashboard con ingresos separados por origen (Particulares vs Obras Sociales). Polling sync multi-secretaria (refetch cada 15s).

**Historias**: HU-008, HU-008b

**Reglas de negocio**: RN-01 (horarios por día incluyendo sábado), RN-02 (estados del turno ampliados), RN-06 (shadow profiles), RN-08 (UUID público), RN-13 (clasificación de ingresos por origen)

**Depende de**: `catalogo-tratamientos` (el paso 1 muestra tratamientos del catálogo, paso 4 usa selector de obras sociales). `auth-y-autorizacion` (panel de aprobación requiere auth, rate limiting protege endpoints públicos).

**Complejidad**: Alta

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `models.py` (Turno: +uuid, +motivo_rechazo, +id_tratamiento, +obra_social) | `portal/PortalPage.tsx` (stepper container) |
| `schemas/portal.py`, `crud/portal.py` | `portal/Step1Servicio.tsx`, `Step2Profesional.tsx` |
| `routers/portal.py` (público: /reservar, /disponibilidad, /turno/{uuid}, /cancelar) | `portal/Step3Agenda.tsx`, `Step4Identificacion.tsx`, `ConfirmacionTurno.tsx` |
| `routers/turnos.py` (+solicitados, +confirmar, +rechazar, +bloquear, validación horaria) | `ConsultaTurnoPage.tsx` (/consulta/:uuid) |
| `routers/pacientes.py` (+verificar/{dni}) | `AgendaPage.tsx` (+panel solicitudes, +bloqueo slots, +polling sync) |
| `schemas/finanzas.py` (ResumenCajaResponse ampliado) | `DashboardPage.tsx` (+KPIs separados por origen) |
| `crud/finanzas.py` (separación ingresos por origen) | `App.tsx` (+rutas públicas /portal y /consulta/:uuid) |

---

### [9]. `notificaciones`

**Funcionalidad**: Sistema de notificaciones multicanal: email (opcional, vía SMTP) y WhatsApp (prioritario en Argentina). Templates para: turno confirmado (con link UUID), turno rechazado (con motivo), recordatorio 48h, recordatorio 2h. WhatsApp bot conversacional con keywords: "turno" → link al portal, "secretaria" → deriva a persona, "llamar" → teléfono clínica, fallback con las 3 opciones. Scheduler APScheduler cada 10 min para recordatorios automáticos con campos de tracking (notificado_48h, notificado_2h) en Turno. Mock inicial (loguea en consola) sin dependencia de APIs externas. Integración real en polish-y-deploy.

**Historias**: HU-009

**Reglas de negocio**: RN-09 (prioridad de canales: email → WhatsApp → solo pantalla)

**Depende de**: `portal-autogestion` (los triggers de notificación se ejecutan al confirmar/rechazar turnos. El scheduler busca turnos "pendientes". El bot envía link al portal.)

**Complejidad**: Media

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `services/notificaciones.py` (orquestador) | Sin cambios (backend-only) |
| `services/email_service.py` (mock SMTP) | |
| `services/whatsapp_service.py` (mock API) | |
| `services/plantillas.py` (templates configurables) | |
| `services/scheduler.py` (APScheduler) | |
| `routers/webhook.py` (POST /webhook/whatsapp) | |
| `routers/turnos.py` (+triggers confirmar/rechazar) | |
| `models.py` (Turno: +notificado_48h, +notificado_2h) | |
| `core/config.py` (+vars SMTP + WhatsApp) | |
| `requirements.txt` (+apscheduler, +httpx) | |

---

### [10]. `reportes-excel`

**Funcionalidad**: Generación de reportes en formato .xlsx con openpyxl. Tres reportes: (1) historia clínica completa del paciente (datos + turnos + tratamientos + pagos), (2) listado de deudores con saldo ARS/USD, (3) resumen de ingresos filtrable por fecha con desglose por moneda y método de pago. Descarga directa desde botón en frontend (PerfilPacientePage, DashboardPage, PagosPage). Solo accesible para roles admin y secretaria.

**Historias**: HU-010

**Reglas de negocio**: —

**Depende de**: `auth-y-autorizacion` (endpoints protegidos por rol). Los datos ya existen (pacientes, turnos, finanzas completados en changes anteriores). Puede ejecutarse en paralelo con `portal-autogestion` y `notificaciones`.

**Complejidad**: Baja

**Archivos principales**:

| Backend | Frontend |
|---------|----------|
| `services/reportes.py` (openpyxl) | `PerfilPacientePage.tsx` (+botón exportar) |
| `routers/reportes.py` | `DashboardPage.tsx` (+botón exportar ingresos) |
| `requirements.txt` (+openpyxl) | `PagosPage.tsx` (+botón exportar deudores) |

---

### [11]. `polish-y-deploy`

**Funcionalidad**: Despliegue completo en producción. Dockerfile + docker-compose.yml para backend e infraestructura local. Migraciones Alembic para control de versiones de esquema. .env.example con template de variables de entorno (sin valores reales). HTTPS con Let's Encrypt. HSTS, CORS restrictivo (solo dominio del frontend). Backups automáticos diarios de PostgreSQL. CI/CD con GitHub Actions (opcional). Hosting: backend en Railway/Render, frontend en Vercel, PostgreSQL en Railway o Supabase free tier. Dominio propio. Health check /health ya operativo. Integración real de APIs de notificaciones (Twilio/WhatsApp Cloud API + SMTP SendGrid/Mailtrap).

**Historias**: — (transversal)

**Reglas de negocio**: —

**Depende de**: todos los changes anteriores. No exponer a internet sin auth. Portal, notificaciones y reportes deben estar completos.

**Complejidad**: Alta

**Archivos principales**:

| Backend | Infraestructura |
|---------|-----------------|
| `core/config.py` (ampliar vars producción) | `Dockerfile`, `docker-compose.yml` |
| `routers/health.py` (evaluar separar de main.py) | `alembic/` (init + migraciones) |
| `requirements.txt` (finalizar) | `.env.example` |
| | `.github/workflows/deploy.yml` (opcional) |

---

## Guía rápida para el agente

Para proponer un nuevo cambio:
```
/opsx:propose <descripción del cambio>
```

El agente debe:
1. Leer este archivo y los 3 docs fundacionales primero.
2. Crear carpeta: `openspec/changes/<nombre-en-kebab-case>/`
3. Generar: `proposal.md` · `design.md` · `tasks.md`
4. Actualizar este archivo con el nuevo change en estado PROPUESTO.

⚠ **Siguiente cambio a ejecutar**: `portal-autogestion` (change 8).
