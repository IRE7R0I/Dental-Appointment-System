# CHANGE-007: Tareas de Implementación

> Depende de CHANGE-009 (auth + slowapi) y CHANGE-011 (catálogo).
> Orden exacto. 22 tareas.

---

## 🔧 Backend — Modelo

### 1. Agregar campos a Turno en models.py
- [ ] `uuid`: String(36), unique, default=uuid4
- [ ] `motivo_rechazo`: Text, nullable
- [ ] `id_tratamiento`: Integer, FK → tratamientos_catalogo.id, nullable
- [ ] `obra_social`: String(100), nullable
- [ ] Relación: `tratamiento_catalogo = relationship("TratamientoCatalogo")`
- [ ] Migrar estados existentes: mantener "Pendiente", "Asistió", "Canceló"
- **Archivos**: `backend/models.py`

## 🔧 Backend — Schemas

### 2. Crear schemas/portal.py
- [ ] `ReservaRequest`: id_tratamiento, id_doctor, fecha_hora, dni (7-8 dígitos), nombre?, apellido?, telefono?, email?, obra_social
- [ ] `ReservaResponse`: turno_id, uuid, estado
- [ ] `TurnoPublicoResponse`: uuid, estado, fecha_hora, doctor_nombre, tratamiento_nombre, motivo_rechazo?
- [ ] `VerificacionDNIResponse`: existe, nombre?, apellido?, telefono?, obra_social?
- [ ] `SlotDisponible`: hora, disponible
- [ ] `RechazarTurnoRequest`: motivo_rechazo (5-500 chars)
- **Archivos**: `backend/schemas/portal.py`

### 3. Ampliar schemas/turnos.py
- [ ] `TurnoResponse`: +uuid, +id_tratamiento, +obra_social, +motivo_rechazo, +tratamiento_nombre (del catálogo)
- [ ] `TurnoSolicitadoResponse`: datos necesarios para panel de aprobación
- [ ] `BloquearSlotRequest`: id_doctor, fecha_hora
- **Archivos**: `backend/schemas/turnos.py`

### 4. Ampliar schemas/pacientes.py
- [ ] `VerificacionDNIResponse` (o importar de portal.py)
- **Archivos**: `backend/schemas/pacientes.py`

## 🔧 Backend — CRUD

### 5. Crear crud/portal.py
- [ ] `verificar_dni(db, dni)` → {existe, datos?} — solo nombre, apellido, telefono, obra_social
- [ ] `calcular_disponibilidad(db, doctor_id, fecha)` → list[SlotDisponible]
- [ ] `reservar_turno(db, data: ReservaRequest)` → ReservaResponse
  - Validar disponibilidad (race condition)
  - Verificar DNI → shadow profile si no existe
  - Validar horarios (franjas mañana/tarde)
  - Crear turno con estado "solicitado" + UUID
- [ ] `consultar_turno_por_uuid(db, uuid)` → TurnoPublicoResponse
- [ ] `cancelar_turno_por_uuid(db, uuid)` → solo si solicitado o pendiente
- **Archivos**: `backend/crud/portal.py`

### 6. Ampliar crud/turnos.py
- [ ] `obtener_turnos_solicitados(db)` → list[Turno]
- [ ] `confirmar_turno(db, turno_id)` → cambia estado a "pendiente"
- [ ] `rechazar_turno(db, turno_id, motivo)` → cambia estado a "rechazado", guarda motivo
- [ ] `bloquear_slot(db, doctor_id, fecha_hora)` → crea turno con estado "bloqueado"
- [ ] `desbloquear_slot(db, turno_id)` → elimina o cambia a "cancelado"
- [ ] `validar_horario_atencion(dt)` → franjas mañana 9-12:30, tarde 16-19:30, sin jueves/domingo
- **Archivos**: `backend/crud/turnos.py`

## 🔧 Backend — Routers

### 7. Agregar endpoint verificar DNI en pacientes.py
- [ ] `GET /pacientes/verificar/{dni}` → público, rate limit 10/min
- [ ] Solo devuelve: nombre, apellido, telefono, obra_social (sin email ni historial)
- **Archivos**: `backend/routers/pacientes.py`

### 8. Ampliar routers/turnos.py
- [ ] `GET /turnos/solicitados` → auth: admin+secretaria
- [ ] `PUT /turnos/{id}/confirmar` → auth: admin+secretaria
- [ ] `PUT /turnos/{id}/rechazar` → auth: admin+secretaria, body: motivo_rechazo
- [ ] `POST /turnos/bloquear` → auth: admin+secretaria
- [ ] `DELETE /turnos/{id}/desbloquear` → auth: admin+secretaria
- [ ] Actualizar validación de horarios: incluir sábado solo mañana (9-12:30)
- [ ] Validación en POST /turnos existente + POST /portal/reservar
- **Archivos**: `backend/routers/turnos.py`, `backend/crud/turnos.py`, `backend/crud/portal.py`

### 8b. Separar ingresos por origen en caja diaria
- [ ] Ampliar `ResumenCajaResponse`: agregar `ingresos_particulares_ars`, `ingresos_particulares_usd`, `ingresos_obras_sociales_ars`, `ingresos_obras_sociales_usd`
- [ ] Modificar `resumen_caja_hoy()` en `crud/finanzas.py`: agrupar pagos por `obra_social == "Particular"` vs resto
- [ ] Actualizar `GET /finanzas/caja/hoy` → nuevo schema
- **Archivos**: `backend/schemas/finanzas.py`, `backend/crud/finanzas.py`, `backend/routers/finanzas.py`

### 9. Crear routers/portal.py
- [ ] Router `prefix="/portal"`, tags=["Portal"]
- [ ] `GET /portal/disponibilidad?doctor_id=&fecha=` → público, rate limit 30/min
- [ ] `POST /portal/reservar` → público, rate limit 5/min
- [ ] `GET /portal/turno/{uuid}` → público
- [ ] `PUT /portal/turno/{uuid}/cancelar` → público
- **Archivos**: `backend/routers/portal.py`

### 10. Registrar routers
- [ ] `app.include_router(portal.router)` en main.py
- [ ] Verificar rate limits en endpoints públicos
- **Archivos**: `backend/main.py`

## 🎨 Frontend — Portal

### 11. Crear PortalPage.tsx (stepper container)
- [ ] Estado: step (1-4), datos acumulados por paso
- [ ] Barra de progreso superior (4 círculos con números)
- [ ] Botón "Atrás" (excepto paso 1 y confirmación)
- [ ] Renderiza StepN según step actual
- [ ] Ruta: `/portal` (pública)
- [ ] Usar frontend-design SKILL
- **Archivos**: `frontend/src/pages/portal/PortalPage.tsx`

### 12. Crear Step1Servicio.tsx
- [ ] Fetch `GET /catalogo/tratamientos` al montar
- [ ] Grid responsive de cards: nombre, precio ARS, precio USD, duración, categoría
- [ ] Buscador (filtro local por nombre)
- [ ] Filtros por categoría (chips horizontales)
- [ ] Click en card → guarda selección, avanza a paso 2
- **Archivos**: `frontend/src/pages/portal/Step1Servicio.tsx`

### 13. Crear Step2Profesional.tsx
- [ ] Fetch `GET /doctores` al montar
- [ ] Cards: nombre, color_agenda como borde/acento
- [ ] Click en card → guarda selección, avanza a paso 3
- **Archivos**: `frontend/src/pages/portal/Step2Profesional.tsx`

### 14. Crear Step3Agenda.tsx
- [ ] Fecha seleccionable (flechas izq/der, próximos 15 días, sin jueves ni domingo)
- [ ] Fetch `GET /portal/disponibilidad?doctor_id=X&fecha=YYYY-MM-DD`
- [ ] Slots como tarjetas rectangulares agrupados en "Mañana" y "Tarde"
- [ ] Colores: verde (disponible), gris (ocupado), amarillo (solicitado)
- [ ] Click en verde → guarda fecha_hora, avanza a paso 4
- **Archivos**: `frontend/src/pages/portal/Step3Agenda.tsx`

### 15. Crear Step4Identificacion.tsx
- [ ] Input DNI con debounce 500ms
- [ ] On blur → `GET /pacientes/verificar/{dni}`
- [ ] Loading state mientras verifica
- [ ] DNI existe → card con datos en modo lectura + "¿Sos vos?" + confirmar
- [ ] DNI nuevo → formulario: nombre, apellido, telefono, email (opcional), obra_social (selector)
- [ ] Selector obra social: `GET /catalogo/obras-sociales`
- [ ] Botón "Confirmar turno"
- **Archivos**: `frontend/src/pages/portal/Step4Identificacion.tsx`

### 16. Crear ConfirmacionTurno.tsx
- [ ] `POST /portal/reservar` con todos los datos acumulados
- [ ] Loading spinner
- [ ] Success: UUID + link /consulta/:uuid + "Solicitar otro turno"
- [ ] Error 409: "Horario no disponible" + botón volver al paso 3
- **Archivos**: `frontend/src/pages/portal/ConfirmacionTurno.tsx`

## 🎨 Frontend — Consulta UUID

### 17. Crear ConsultaTurnoPage.tsx
- [ ] Ruta: `/consulta/:uuid` (pública)
- [ ] Fetch `GET /portal/turno/{uuid}`
- [ ] Estado: spinner → datos | 404 "Turno no encontrado"
- [ ] Mostrar: estado (badge de color), tratamiento, doctor, fecha/hora, obra social
- [ ] Si rechazado: motivo en card roja
- [ ] Si solicitado/pendiente: botón "Cancelar turno" → confirmación → PUT cancelar
- [ ] Link "Solicitar otro turno" → /portal
- **Archivos**: `frontend/src/pages/ConsultaTurnoPage.tsx`

## 🎨 Frontend — Panel Secretaria

### 18. Ampliar AgendaPage.tsx — panel solicitudes
- [ ] Nueva tab/sección "Solicitudes" con badge numérico rojo
- [ ] Fetch `GET /turnos/solicitados`
- [ ] Tabla: paciente, tratamiento, doctor, fecha/hora, obra social, acciones
- [ ] Botón ✓ → `PUT /turnos/{id}/confirmar` → remover de lista
- [ ] Botón ✗ → modal con textarea motivo → `PUT /turnos/{id}/rechazar`
- [ ] Actualizar contador al aceptar/rechazar
- **Archivos**: `frontend/src/pages/AgendaPage.tsx`

### 19. Agregar bloqueo de slots en AgendaPage.tsx
- [ ] Click en slot vacío del calendario → opción "Bloquear horario"
- [ ] `POST /turnos/bloquear`
- [ ] Slot bloqueado → gris oscuro/rojo con tooltip "Bloqueado"
- [ ] Click en bloqueado → opción "Desbloquear" → `DELETE /turnos/{id}/desbloquear`
- **Archivos**: `frontend/src/pages/AgendaPage.tsx`

### 19b. Agregar polling sync multi-secretaria
- [ ] AgendaPage: `setInterval` cada 15s refetcha turnos + solicitudes
- [ ] Refetch inmediato después de cada acción (crear, confirmar, rechazar, bloquear)
- [ ] DashboardPage: `setInterval` cada 30s refetcha caja diaria
- **Archivos**: `frontend/src/pages/AgendaPage.tsx`, `frontend/src/pages/DashboardPage.tsx`

### 19c. Actualizar Dashboard — KPIs separados por origen
- [ ] Mostrar 2 bloques KPI en vez de uno:
  - Particulares: ingresos ARS + USD
  - Obras Sociales / Coseguros: ingresos ARS + USD
- [ ] Consumir nuevos campos de `ResumenCajaResponse`
- **Archivos**: `frontend/src/pages/DashboardPage.tsx`

### 20. Agregar rutas públicas en App.tsx
- [ ] `<Route path="/portal" element={<PortalPage />} />` — sin PrivateRoute
- [ ] `<Route path="/consulta/:uuid" element={<ConsultaTurnoPage />} />` — sin PrivateRoute
- [ ] Verificar NavigationRail NO se muestra en rutas públicas
- **Archivos**: `frontend/src/App.tsx`

## ✅ Validación

### 21. Testear flujo paciente
- [ ] Acceder a /portal → ver paso 1 con tratamientos
- [ ] Elegir tratamiento → ver paso 2 con doctores
- [ ] Elegir doctor → ver paso 3 con slots (sin jueves, sin domingo, solo franjas)
- [ ] Elegir slot → ver paso 4
- [ ] Ingresar DNI existente → ver datos precargados
- [ ] Ingresar DNI nuevo → ver formulario
- [ ] Confirmar → ver UUID y link
- [ ] Acceder a /consulta/:uuid → ver datos del turno
- [ ] Cancelar turno desde /consulta/:uuid

### 22. Testear flujo secretaria
- [ ] Login como secretaria
- [ ] Ver badge "Solicitudes (N)" en AgendaPage
- [ ] Aceptar solicitud → desaparece, estado cambia a pendiente
- [ ] Rechazar solicitud con motivo → desaparece
- [ ] Bloquear slot → aparece gris en disponibilidad
- [ ] Verificar slot bloqueado no aparece en /portal/disponibilidad
- [ ] Desbloquear slot
- [ ] Verificar rate limiting: 6+ reservas rápidas → 429
