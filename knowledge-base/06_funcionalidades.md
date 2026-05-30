# 06 — Funcionalidades

## Completadas (v2.x)

### Gestión de pacientes
Lista, perfil, edición, búsqueda por DNI. Página dedicada con historial clínico (turnos + tratamientos + pagos). Layout de dos columnas.

### Agenda
Turnos por doctor con vista por fecha. Asignación con validación de duplicados. Cancelación. Cierre de turno con cobro multimoneda (integración con catálogo). Modal con selector de tratamientos del catálogo (precarga precio editable) o "Servicio Manual".

### Finanzas y Caja
Cierre de turno con tratamientos + pagos. Resumen diario (turnos realizados/pendientes, ingresos ARS/USD). Historial de pagos con filtros avanzados.

### Cuentas Corrientes
Saldo ARS/USD por paciente. Movimientos tipo "cargo" o "pago". Lista de deudores. Detalle por paciente.

### Doctores
CRUD completo con soft-delete. Color de agenda por doctor. Filtro en agenda.

### Dashboard
KPIs de turnos del día e ingresos ARS/USD en tiempo real.

### Autenticación (CHANGE-009)
Login JWT con roles admin/secretaria. Refresh automático. Rate limiting + security headers. Panel de administración de usuarios (AdminPage): crear, editar, listar, activar/desactivar, eliminar secretarias. Admin self-edit con current_password. Logout con confirmación en NavigationRail.

### Catálogo (CHANGE-011)
Tratamientos odontológicos con precios ARS/USD, duración y categoría. Catálogo de obras sociales (7 seed). CRUD completo (admin + secretaria). Página CatalogoPage con tabla, filtros y modales. Soft-delete en ambos.

### Health check
GET /health operativo.

### Frontend completo
9 páginas (Agenda, Dashboard, Pagos, PerfilPaciente, HistorialPaciente, Login, Admin, Catalogo). 6 componentes (NavigationRail con logout, KPICard, TurnoCard, Modal, MultiCurrencyInput, PrivateRoute). AuthContext + interceptores JWT con refresh automático.

---

## Pendientes (planificadas)

### portal-autogestion (CHANGE-007)
Guest checkout 4 pasos: tratamiento → doctor → horario → DNI. Shadow profiles. UUID público. Panel de aprobación. Bloqueo de slots. Validación horaria por día. Dashboard con ingresos separados por origen. Polling sync multi-secretaria.

### notificaciones (CHANGE-006)
Email + WhatsApp + bot conversacional. Scheduler recordatorios 48h/2h. Templates configurables. Mock inicial sin APIs externas.

### reportes-excel (CHANGE-008)
Exportación .xlsx: historia clínica, deudores, ingresos. Solo admin/secretaria.

### polish-y-deploy (CHANGE-010)
Docker, Alembic, HTTPS, backups, CI/CD. Integración real de APIs (Twilio, SMTP).
