# 07 — Flujos Principales

## Flujo 1: Asignación de turno (secretaria, vía tradicional)

```
Secretaria ← paciente llama por teléfono o WhatsApp
    │
    ▼
AgendaPage → click en slot vacío
    │
    ▼
Modal: buscar paciente por DNI
    ├─ DNI existe → autocompleta datos
    └─ DNI nuevo → formulario para crear paciente
    │
    ▼
Seleccionar doctor, fecha, hora, motivo
    │
    ▼
POST /turnos → validar duplicados → turno creado (estado "pendiente")
    │
    ▼
Turno visible en agenda del doctor
```

## Flujo 2: Cierre de turno con cobro (secretaria)

```
AgendaPage → click en turno → "Cerrar turno"
    │
    ▼
Modal multimoneda:
  ┌─ Tratamientos realizados:
  │   [Seleccionar del catálogo ▼] → precarga nombre + precio (editable)
  │   O [Servicio Manual] → nombre + precio libre
  │   [+ Agregar tratamiento]
  │
  └─ Pagos recibidos:
      [$____] [ARS ▼] [Efectivo ▼]
      [$____] [USD ▼] [Transferencia ▼]
      [+ Agregar pago]
    │
    ▼
PUT /turnos/{id}/cerrar → calcula deuda → actualiza cuenta corriente
    │
    ▼
Estado turno → "realizado". KPI dashboard se actualiza con ingresos
separados por Particulares y Obras Sociales (según obra_social del paciente).
```

## Flujo 3: Portal Guest Checkout (paciente — CHANGE-007)

```
Paciente accede a /portal (link desde WhatsApp o directo)
    │
    ▼
Paso 1 — Elegir Tratamiento
  GET /catalogo/tratamientos → grid de cards
  Buscador + filtros por categoría
  Click en card → guarda id_tratamiento
    │
    ▼
Paso 2 — Elegir Doctor
  GET /doctores → cards de doctores
  Click → guarda id_doctor
    │
    ▼
Paso 3 — Elegir Horario
  GET /portal/disponibilidad?doctor_id=X&fecha=YYYY-MM-DD
  Slots como tarjetas (verde=libre, gris=ocupado)
  Franjas según día: lun-vie mañana (9-12:30) + tarde (16-19:30)
  Sábado solo mañana (9-12:30). Jueves y domingo sin atención.
  Click → guarda fecha_hora
    │
    ▼
Paso 4 — Identificación
  Input DNI → blur → GET /pacientes/verificar/{dni}
  ┌─ DNI existe: "¿Sos vos? Nombre, Apellido, Celular, Obra Social"
  │   [Sí, soy yo → Confirmar]
  └─ DNI nuevo: formulario (nombre, apellido, celular, email?, obra social)
      [Confirmar]
    │
    ▼
POST /portal/reservar → shadow profile (si nuevo) → turno "solicitado" + UUID
    │
    ▼
Pantalla de confirmación:
  "¡Turno solicitado! N° A1B2C3D4"
  Link: /consulta/A1B2C3D4
  [Solicitar otro turno]
```

## Flujo 4: Panel de Aprobación (secretaria — CHANGE-007)

```
AgendaPage → tab "Solicitudes (3)"
    │
    ▼
GET /turnos/solicitados → tabla con solicitudes pendientes
    │
    ├─ Click ✓ (Aceptar)
    │   PUT /turnos/{id}/confirmar
    │   Estado → "pendiente"
    │   Dispara notificación al paciente (email/WhatsApp)
    │   Turno visible en agenda
    │
    └─ Click ✗ (Rechazar)
        Modal: "Motivo del rechazo:" [___________]
        PUT /turnos/{id}/rechazar { motivo_rechazo }
        Estado → "rechazado"
        Dispara notificación al paciente con motivo
```

## Flujo 5: Consulta pública por UUID (paciente — CHANGE-007)

```
Paciente recibe link: https://odontogest.com.ar/consulta/A1B2C3D4
    │
    ▼
GET /portal/turno/A1B2C3D4
    │
    ▼
Muestra:
  Estado: [⏳ Solicitado] [✓ Pendiente] [✗ Rechazado]
  Tratamiento, Doctor, Fecha, Hora, Obra Social
    │
    ├─ Si estado = "rechazado":
    │   Motivo: "El doctor tiene cirugía de urgencia."
    │   [Solicitar otro turno] → /portal
    │
    └─ Si estado = "solicitado" o "pendiente":
        [Cancelar turno] → confirmación → PUT /portal/turno/{uuid}/cancelar
```

## Flujo 6: WhatsApp Bot (CHANGE-006)

```
Paciente escribe a WhatsApp de la clínica: "Hola quiero un turno"
    │
    ▼
POST /webhook/whatsapp (Twilio webhook → FastAPI)
    │
    ▼
Keyword matching (case insensitive):
  "turno", "reservar", "solicitar" → "Ingresá a: /portal"
  "secretaria", "hablar", "persona" → "Te contactamos en breve"
  "llamar", "teléfono" → "Clínica: 11-xxxx-xxxx"
  Default → "Escribí: turno / secretaria / llamar"
```

## Flujo 7: Notificaciones automáticas (CHANGE-006)

```
Scheduler APScheduler — cada 10 minutos
    │
    ▼
Buscar turnos pendientes con:
  fecha_hora ≈ ahora + 48h (±30min) Y notificado_48h = False
  fecha_hora ≈ ahora + 2h (±15min) Y notificado_2h = False
    │
    ▼
notificar(evento, paciente, turno):
  if paciente.email → email_service.enviar(template)
  if paciente.telefono → whatsapp_service.enviar(template)
  Marcar notificado_Xh = True
```
