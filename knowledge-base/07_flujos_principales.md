# 07 — Flujos Principales

## Flujo 1: Asignación de turno (secretaria)
1. Secretaria abre AgendaPage.
2. Click en slot vacío → modal.
3. Buscar paciente por DNI.
4. Si DNI existe → autocompleta. Si no → formulario crear paciente.
5. Seleccionar doctor, fecha, hora, motivo.
6. POST /turnos → validar duplicados → turno creado (estado "pendiente").
7. Visible en agenda del doctor.

## Flujo 2: Cierre de turno con cobro
1. Secretaria click en turno → "Cerrar turno".
2. Modal: selector de tratamientos del catálogo (precarga precio editable) o "Servicio Manual".
3. Agregar pagos (ARS/USD, efectivo/transferencia).
4. PUT /turnos/{id}/cerrar → calcula deuda → actualiza cuenta corriente.
5. Estado → "realizado". KPI dashboard actualizado.

## Flujo 3: Login + gestión de usuarios (admin)
1. Admin accede a /login → ingresa usuario/contraseña.
2. POST /auth/login → JWT → redirige a dashboard.
3. NavigationRail muestra link "Admin" (solo admin).
4. AdminPage (/admin/usuarios): tabla de usuarios.
5. [+ Nueva secretaria] → modal → POST /admin/usuarios.
6. [✏️ Editar] → modal con username + nueva contraseña.
7. Si admin se edita a sí mismo → requiere contraseña actual.
8. Si admin edita secretaria → no requiere current_password.
9. [Desactivar/Activar] → PUT toggle-activo.
10. [🗑 Eliminar] → confirmación → DELETE.
11. NavigationRail → "Salir" → confirmación → logout.

## Flujo 4: Catálogo de tratamientos
1. Secretaria/admin va a /catalogo (NavigationRail).
2. Tabla con tratamientos, filtros por categoría.
3. [+ Nuevo] → modal con nombre, precios ARS/USD, duración, categoría.
4. POST /catalogo/tratamientos → 201.
5. [✏️] → modal edición → PUT.
6. [🗑] → confirmación → DELETE (soft-delete).
7. Sección obras sociales: [+ Agregar] → POST (admin/secretaria).
8. El catálogo también se usa en el modal de cierre de turno (AgendaPage).

## Flujo 5: Portal Guest Checkout (CHANGE-007)
1. Paciente accede a /portal (link desde WhatsApp o directo).
2. Paso 1: GET /catalogo/tratamientos → cards con nombre, precio, duración.
3. Buscador + filtros por categoría. Click → guarda selección.
4. Paso 2: GET /doctores → cards de doctores. Click → guarda.
5. Paso 3: GET /portal/disponibilidad → slots 30 min como tarjetas.
6. Franjas: lun-vie mañana+tarde, sáb solo mañana, sin jueves/domingo.
7. Click en slot → guarda fecha_hora.
8. Paso 4: input DNI → GET /pacientes/verificar/{dni}.
9. DNI existe → datos en modo lectura + confirmar.
10. DNI nuevo → formulario (shadow profile) + selector obra social.
11. POST /portal/reservar → turno "solicitado" + UUID.
12. Pantalla confirmación: link /consulta/{uuid}.

## Flujo 6: Panel de Aprobación (CHANGE-007)
1. Secretaria abre AgendaPage → tab "Solicitudes" con badge.
2. GET /turnos/solicitados → tabla de solicitudes.
3. Click ✓ → PUT /turnos/{id}/confirmar → estado "pendiente".
4. Dispara notificación al paciente.
5. Click ✗ → modal textarea motivo → PUT rechazar → estado "rechazado".
6. Notifica al paciente con motivo.

## Flujo 7: Consulta pública por UUID
1. Paciente recibe link /consulta/{uuid}.
2. GET /portal/turno/{uuid} → estado, tratamiento, doctor, fecha.
3. Si rechazado → muestra motivo + link "Solicitar otro turno".
4. Si solicitado/pendiente → "Cancelar turno" → PUT cancelar.

## Flujo 8: Notificaciones (CHANGE-006)
1. Trigger: confirmar/rechazar turno → notificar(evento, paciente, turno).
2. Orquestador: si email → email_service. si teléfono → whatsapp_service.
3. Scheduler cada 10 min: busca turnos a 48h y 2h → notificar(recordatorio).
4. WhatsApp Bot: POST /webhook/whatsapp → keyword matching:
   - "turno" → link portal. "secretaria" → deriva. "llamar" → teléfono.
