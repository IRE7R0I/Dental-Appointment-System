# 06 — Funcionalidades

## Completadas (v2.x actual)

### Gestión de pacientes
- Lista de pacientes con búsqueda por DNI.
- Perfil individual con datos personales.
- Edición de datos.
- Vista de pacientes deudores (saldo > 0).
- Historial clínico: turnos con tratamientos y pagos por paciente.
- Página dedicada `/pacientes/:dni/historial` con layout de dos columnas:
  - Timeline de turnos + tratamientos y deudas.
  - Tabla de pagos con filtro por método.

### Agenda
- Turnos por doctor (Darío / Fabiana) con vista por fecha.
- Asignación de turnos con validación de duplicados (mismo doctor, misma hora).
- Búsqueda de paciente por DNI al asignar.
- Filtro de turnos por fecha, doctor y paciente.
- Cancelación de turnos.

### Finanzas y Caja
- Cierre de turno con cobro multimoneda ARS/USD.
- Registro de tratamientos realizados (nombre + precio).
- Registro de pagos (múltiples, distintas monedas).
- Resumen de caja del día: turnos realizados/pendientes/cancelados, ingresos ARS y USD.
- Historial de pagos filtrable por fecha, método, paciente, doctor, deudores.

### Cuentas Corrientes
- Saldo ARS y USD por paciente.
- Movimientos: tipo "cargo" o "pago", con descripción.
- Lista de pacientes deudores.
- Detalle de movimientos por paciente: `GET /pacientes/{dni}/cuenta`.

### Doctores
- Listado y creación de doctores.
- Cada doctor con nombre y color de agenda (hex).

### Dashboard
- KPI de turnos del día (realizados, pendientes, cancelados).
- Ingresos ARS y USD en tiempo real, separados por origen:
  - **Particulares** (obra_social = "Particular").
  - **Obras Sociales / Coseguros** (resto de obras sociales).

### Health check
- `GET /health` → estado del servidor y versión.

### Frontend
- React 18 + TypeScript + Vite + Tailwind CSS.
- 5 páginas: Agenda, Dashboard, Pagos, PerfilPaciente, HistorialPaciente.
- Componentes: NavigationRail, KPICard, TurnoCard, Modal, MultiCurrencyInput.
- Llamadas HTTP centralizadas en `services/api.ts`.

---

## Pendientes (planificadas)

### CHANGE-009: Autenticación JWT (admin + secretaria)
- Login con usuario + contraseña.
- JWT access (30 min) + refresh (7 días).
- Rate limiting (slowapi).
- Security headers (CSP, HSTS, X-Frame-Options).
- Panel de gestión de usuarios (solo admin): crear, listar,
  activar/desactivar y eliminar secretarias. Frontend: `/admin/usuarios`
  con tabla CRUD. Backend: `DELETE /admin/usuarios/{id}` para borrado físico.
- LoginPage con diseño consistente (mismos colores, tipografía y
  componentes que el resto del sistema).
- CRUD completo de doctores: PUT y DELETE (soft-delete con `activo`). Solo admin.
- Campo `creado_por_id` en Turno para auditoría multi-secretaria.
- Frontend: LoginPage, AuthContext, PrivateRoute, interceptores JWT.

### CHANGE-011: Catálogo de Tratamientos y Obras Sociales
- CRUD de tratamientos con precios ARS/USD, duración, categoría.
- CRUD de obras sociales (Particular + 6 mutuales).
- Integración en modal de cierre de turno:
  - Elegir del catálogo (precarga precio editable).
  - O "Servicio Manual" con texto libre.
- Frontend: CatalogoPage.tsx (tabla CRUD).

### CHANGE-007: Portal de Autogestión (Guest Checkout)
- Flujo 4 pasos sin login:
  1. Elegir tratamiento (cards del catálogo con buscador y filtros).
  2. Elegir doctor.
  3. Elegir horario (slots 30 min como tarjetas, solo franjas mañana/tarde).
  4. Identificación: DNI → verificar → shadow profile si nuevo.
- Turno creado con estado "solicitado" + UUID.
- Página pública `/consulta/:uuid` para seguimiento.
- Panel de aprobación en AgendaPage (secretaria):
  - Aceptar → estado "pendiente".
  - Rechazar → motivo → estado "rechazado".
- Bloqueo manual de slots por secretaria.

### CHANGE-006: Notificaciones (Email + WhatsApp + Bot)
- Notificaciones por email (si tiene) y WhatsApp (si tiene teléfono).
- Templates: turno confirmado, rechazado (con motivo), recordatorios.
- Scheduler APScheduler para recordatorios 48h y 2h.
- WhatsApp Bot: responde keywords ("turno" → link portal, "secretaria" → deriva, "llamar" → teléfono).
- Mock inicial sin API externa.

### CHANGE-008: Reportes Exportables (Excel)
- Historia clínica del paciente: datos + turnos + tratamientos + pagos.
- Listado de deudores: saldo ARS/USD.
- Resumen de ingresos filtrable por fecha, desglose por moneda y método.
- Descarga directa desde botón en frontend.
- Solo admin y secretaria.

### CHANGE-010: Deploy a Producción
- Dockerfile + docker-compose.yml.
- Alembic para migraciones.
- .env.example.
- CI/CD con GitHub Actions (opcional).
- HTTPS, dominio propio, backups diarios.
