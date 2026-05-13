 # Roadmap de Implementación

Mapa completo de changes para desarrollar **OdontoGest** de inicio a fin.
Generado a partir de `knowledge-base/` el 2026-05-12.

---

## Orden de ejecución

| # | Change | Funcionalidad | US | Depende de | Razón de la dependencia |
|---|--------|---------------|-----|------------|--------------------------|
| 1 | `autenticacion-jwt-roles` | Auth JWT (admin + secretaria), rate limiting, security headers, CRUD doctores completo, auditoría Turno | HU-007 | — (CHANGE-001 a 005 completados) | Primer paso crítico. Sin auth no hay endpoints protegidos. Sin CRUD doctores completo no hay gestión de profesionales. |
| 2 | `catalogo-tratamientos-obras-sociales` | Catálogo de tratamientos odontológicos con precios ARS/USD, catálogo de obras sociales, integración en modal de cierre de turno | HU-001 (ampliada) | `autenticacion-jwt-roles` | Endpoints de escritura del catálogo requieren auth (admin + secretaria). El portal (change 3) necesita tratamientos y obras sociales listados. |
| 3 | `portal-autogestion-paciente` | Guest checkout 4 pasos (stepper), shadow profiles por DNI, UUID público, panel de aprobación secretaria, bloqueo de slots, validación horaria por franjas y sábado | HU-008, HU-008b | `catalogo-tratamientos-obras-sociales` | El paso 1 del portal muestra tratamientos del catálogo. El paso 4 usa selector de obras sociales. Panel de aprobación requiere auth. |
| 4 | `notificaciones-whatsapp` | Email transaccional + WhatsApp + bot conversacional, scheduler de recordatorios 48h/2h, templates de mensajes con UUID links | HU-009 | `portal-autogestion-paciente` | Las notificaciones se disparan al confirmar/rechazar turnos del portal. El bot envía link al portal. |
| 5 | `reportes-exportables-excel` | Exportación .xlsx: historia clínica, listado deudores, resumen ingresos. Solo admin + secretaria | HU-010 | `autenticacion-jwt-roles` | Endpoints de reportes requieren auth. Los datos a exportar provienen de pacientes, turnos, finanzas (ya operativos desde CHANGE-001 a 005). |
| 6 | `deploy-produccion` | Docker, Alembic, .env.example, HTTPS, backups, CI/CD | — | `autenticacion-jwt-roles`, `portal-autogestion-paciente`, `notificaciones-whatsapp`, `reportes-exportables-excel` | Último paso. No exponer a internet sin auth. Portal y notificaciones deben funcionar. Reportes listos. |

---

## Detalle por change

### 1. `autenticacion-jwt-roles`

**Funcionalidad**: login JWT con roles admin y secretaria. Rate limiting con slowapi. Security headers HTTP (CSP, HSTS, X-Frame-Options, X-Content-Type-Options). CRUD completo de doctores (PUT/DELETE solo admin). Campo `creado_por_id` y `actualizado_por_id` en Turno para auditoría multi-secretaria. Frontend: LoginPage, AuthContext, PrivateRoute, interceptores JWT en api.ts.

**US implementadas**: HU-007.

**Depende de**: ninguno (CHANGE-001 al CHANGE-005 e INIT-001 al INIT-005 ya completados — backend operativo, frontend React/TS operativo, PostgreSQL en producción).

**Justificación**: este change es bloqueante para todos los demás. Sin autenticación no se pueden proteger endpoints internos, y sin CRUD de doctores completo no se pueden gestionar profesionales desde el panel admin. El rate limiting y security headers blindan endpoints públicos desde el día 1.

**Archivos clave**: `backend/core/config.py`, `backend/core/security.py`, `backend/dependencies.py`, `backend/models.py` (Usuario, Doctor.activo, Turno.creado_por_id), `backend/routers/auth.py`, `backend/routers/admin.py`, `backend/routers/doctores.py` (PUT/DELETE), `frontend/src/pages/LoginPage.tsx`, `frontend/src/context/AuthContext.tsx`, `frontend/src/components/PrivateRoute.tsx`.

**Tareas**: 19 tareas en `openspec/changes/autenticacion-jwt-roles/tasks.md`.

**Riesgos / preguntas abiertas**: ver Q-02 en `10_preguntas_abiertas.md` (rate limiting en desarrollo).

---

### 2. `catalogo-tratamientos-obras-sociales`

**Funcionalidad**: modelos `TratamientoCatalogo` (nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo) y `ObraSocial` (nombre, activo). CRUD endpoints bajo `/catalogo/`. GET públicos (portal los necesita sin auth), POST/PUT/DELETE protegidos. Seed de 7 obras sociales (Particular + 6 mutuales). Integración en modal de cierre de turno: elegir del catálogo (precarga precio editable) o "Servicio Manual" con texto libre. Frontend: `CatalogoPage.tsx` con tabla CRUD.

**US implementadas**: HU-001 (ampliada — el modal de turno ahora usa catálogo).

**Depende de**: `autenticacion-jwt-roles`. Los endpoints de escritura requieren `require_role(["admin","secretaria"])`. El rate limiting protege los GET públicos.

**Justificación**: prerrequisito directo del portal (change 3). El paso 1 muestra tratamientos del catálogo. El paso 4 usa el selector de obras sociales. Sin catálogo, el portal no puede funcionar. Además, mejora el flujo interno: la secretaria elige tratamientos precargados en vez de escribir cada vez.

**Archivos clave**: `backend/models.py` (+TratamientoCatalogo, +ObraSocial), `backend/schemas/catalogo.py`, `backend/crud/catalogo.py`, `backend/routers/catalogo.py`, `backend/seed.py` (ampliar), `frontend/src/pages/CatalogoPage.tsx`, `frontend/src/pages/AgendaPage.tsx` (modal usa catálogo).

**Tareas**: 10 tareas en `openspec/changes/catalogo-tratamientos-obras-sociales/tasks.md`.

**Riesgos / preguntas abiertas**: ninguno detectado. Modelos nuevos, sin migración de datos existentes.

---

### 3. `portal-autogestion-paciente`

**Funcionalidad**: portal público de autogestión. Flujo guest checkout en 4 pasos (stepper React): (1) elegir tratamiento del catálogo con buscador y filtros, (2) elegir doctor, (3) elegir horario — slots de 30 min como tarjetas, solo franjas mañana (9-12:30) y tarde (16-19:30), sábado solo mañana, sin jueves ni domingo — (4) identificación por DNI con verificación y shadow profile automático. Turno creado con estado "solicitado" + UUID v4. Página pública de consulta por UUID (`/consulta/:uuid`). Panel de aprobación en AgendaPage: aceptar (→ "pendiente") o rechazar con motivo (→ "rechazado"). Bloqueo manual de slots por secretaria. Dashboard con ingresos separados por origen (Particulares vs Obras Sociales). Polling sync multi-secretaria (setInterval 15s).

**US implementadas**: HU-008, HU-008b.

**Depende de**: `catalogo-tratamientos-obras-sociales` y `autenticacion-jwt-roles`. Necesita catálogo para paso 1 y selector de obra social para paso 4. Panel de aprobación requiere auth. Rate limiting protege endpoints públicos.

**Justificación**: funcionalidad core del producto. Permite a los pacientes solicitar turnos 24/7 sin intervención de la secretaria. El UUID reemplaza el login tradicional. Shadow profiles eliminan la fricción de registro. La secretaria mantiene control total (aprobación/rechazo).

**Archivos clave**: `backend/models.py` (Turno: +uuid, +motivo_rechazo, +id_tratamiento, +obra_social), `backend/schemas/portal.py`, `backend/crud/portal.py`, `backend/routers/portal.py`, `backend/routers/pacientes.py` (+verificar DNI), `backend/routers/turnos.py` (+solicitados, confirmar, rechazar, bloquear, validación horaria), `backend/schemas/finanzas.py` (ResumenCajaResponse ampliado), `backend/crud/finanzas.py` (separación ingresos por origen), `frontend/src/pages/portal/*` (6 archivos), `frontend/src/pages/ConsultaTurnoPage.tsx`, `frontend/src/pages/AgendaPage.tsx` (+panel solicitudes + bloqueo + polling), `frontend/src/pages/DashboardPage.tsx` (+KPIs separados).

**Tareas**: 22+ tareas en `openspec/changes/portal-autogestion-paciente/tasks.md`.

**Riesgos / preguntas abiertas**: ver Q-01 (migración de estados de turno existentes), Q-06 (límite de turnos solicitados por DNI), Q-10 (polling vs WebSocket para sync) en `10_preguntas_abiertas.md`.

---

### 4. `notificaciones-whatsapp`

**Funcionalidad**: sistema de notificaciones multicanal. Email (opcional, via SMTP) y WhatsApp (prioritario en Argentina). Templates para: turno confirmado (con link UUID), turno rechazado (con motivo), recordatorio 48h, recordatorio 2h. WhatsApp bot conversacional con keywords: "turno" → link al portal, "secretaria" → deriva a persona, "llamar" → teléfono clínica. Scheduler APScheduler cada 10 min para recordatorios automáticos. Mock inicial (loguea en consola), integración real con APIs externas en deploy.

**US implementadas**: HU-009.

**Depende de**: `portal-autogestion-paciente`. Los triggers de notificación se ejecutan al confirmar/rechazar turnos (change 3). El bot envía link al portal. El scheduler busca turnos "pendientes" creados por el portal.

**Justificación**: reduce ausencias (recordatorios) y llamados manuales (confirmación automática). El bot de WhatsApp ofrece autogestión a pacientes no digitalizados (personas mayores). Mock inicial permite testear todo el flujo sin depender de APIs externas pagas.

**Archivos clave**: `backend/services/notificaciones.py` (orquestador), `backend/services/email_service.py`, `backend/services/whatsapp_service.py`, `backend/services/plantillas.py`, `backend/services/scheduler.py`, `backend/routers/webhook.py`, `backend/routers/turnos.py` (+triggers), `backend/core/config.py` (ampliar vars SMTP + WhatsApp), `requirements.txt` (+apscheduler, +httpx).

**Tareas**: 14 tareas en `openspec/changes/notificaciones-whatsapp/tasks.md`.

**Riesgos / preguntas abiertas**: ver Q-03 (manejo de errores del scheduler), Q-09 (hosting de email transaccional para producción) en `10_preguntas_abiertas.md`.

---

### 5. `reportes-exportables-excel`

**Funcionalidad**: generación de reportes en `.xlsx` con `openpyxl`. Tres reportes: (1) historia clínica completa del paciente (datos + turnos + tratamientos + pagos), (2) listado de deudores con saldo ARS/USD, (3) resumen de ingresos filtrable por fecha con desglose por moneda y método de pago. Descarga directa desde botón en frontend. Solo admin y secretaria.

**US implementadas**: HU-010.

**Depende de**: `autenticacion-jwt-roles`. Endpoints protegidos por rol. Los datos a exportar ya existen (pacientes, turnos, finanzas operativos desde CHANGE-001 a 005).

**Justificación**: puede ejecutarse en paralelo a changes 3 y 4 si hay recursos. No depende del portal ni de notificaciones. Solo requiere auth (change 1) y datos (ya existentes).

**Archivos clave**: `backend/services/reportes.py`, `backend/routers/reportes.py`, `frontend/src/pages/HistorialPacientePage.tsx` (+botón exportar), `frontend/src/pages/DashboardPage.tsx` (+botón exportar), `frontend/src/pages/PagosPage.tsx` (+botón exportar deudores), `requirements.txt` (+openpyxl).

**Tareas**: pendiente crear `openspec/changes/reportes-exportables-excel/tasks.md`.

**Riesgos / preguntas abiertas**: ninguno detectado. openpyxl es estable y los datos ya existen.

---

### 6. `deploy-produccion`

**Funcionalidad**: despliegue completo en producción. Dockerfile + docker-compose.yml. Migraciones Alembic. `.env.example`. HTTPS con Let's Encrypt. HSTS, CORS restrictivo. Backups automáticos diarios. CI/CD con GitHub Actions (opcional). Hosting: backend en Railway/Render, frontend en Vercel, PostgreSQL en Railway o Supabase free tier. Dominio propio. Health check `/health` ya operativo.

**US implementadas**: — (transversal).

**Depende de**: `autenticacion-jwt-roles`, `portal-autogestion-paciente`, `notificaciones-whatsapp`, `reportes-exportables-excel`. No exponer a internet sin auth. Portal, notificaciones y reportes deben estar completos antes del deploy.

**Justificación**: último paso del roadmap. Todo el sistema debe funcionar en entorno local/dev antes de migrar a producción.

**Archivos clave**: `Dockerfile`, `docker-compose.yml`, `.env.example`, `alembic/`, `backend/core/config.py` (ampliar), `backend/routers/health.py` (evaluar separar de main.py), `frontend/vite.config.ts`, `.github/workflows/deploy.yml`.

**Tareas**: pendiente crear `openspec/changes/deploy-produccion/tasks.md`.

**Riesgos / preguntas abiertas**: ver Q-05 (testing automatizado), Q-08 (dominio propio) en `10_preguntas_abiertas.md`.

---

## Notas finales

- **Completados previos**: CHANGE-001 al CHANGE-005 e INIT-001 al INIT-005 ya están implementados. Backend operativo (FastAPI + PostgreSQL), frontend operativo (React/TS + Vite + Tailwind), modelos base (Paciente, Turno, Doctor, Pago, CuentaCorriente), endpoints REST completos.
- **Paralelismo posible**: el change 5 (`reportes-exportables-excel`) puede ejecutarse en paralelo a los changes 3 y 4 porque solo depende del change 1 (auth) y los datos ya existen.
- **Cada change es mergeable independientemente**: cada uno tiene su carpeta OpenSpec con `proposal.md`, `design.md` y `tasks.md`. Las tareas están ordenadas para ser completadas secuencialmente dentro de cada change.
- **Preguntas abiertas**: las preguntas en `10_preguntas_abiertas.md` marcadas como "media" o "alta" deben resolverse antes de iniciar el change que las referencia.
- **Total estimado de tareas**: 19 (auth) + 10 (catálogo) + 22 (portal) + 14 (notificaciones) + ~10 (reportes) + ~10 (deploy) = **~85 tareas** en total.
