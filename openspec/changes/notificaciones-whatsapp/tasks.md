# CHANGE-006: Tareas de Implementación

> Depende de CHANGE-007 (portal: triggers de confirmación/rechazo).
> Orden exacto. 14 tareas.

---

## 🔧 Backend — Configuración

### 1. Ampliar core/config.py
- [ ] Agregar settings de SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`
- [ ] Agregar settings de WhatsApp: `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_ID`, `WHATSAPP_FROM`
- [ ] Agregar: `PORTAL_URL`, `CLINICA_TELEFONO`
- [ ] Valores por defecto para desarrollo local
- [ ] Actualizar `.env` con las nuevas variables
- **Archivos**: `backend/core/config.py`, `.env`

### 2. Agregar dependencias
- [ ] `apscheduler` a requirements.txt
- [ ] `httpx` a requirements.txt (para llamadas async a APIs externas)
- [ ] Instalar: `pip install apscheduler httpx`
- **Archivos**: `requirements.txt`

## 🔧 Backend — Modelo (campos para scheduler)

### 3. Agregar campos de tracking a Turno
- [ ] `notificado_48h`: Boolean, default=False
- [ ] `notificado_2h`: Boolean, default=False
- [ ] Estos campos evitan notificaciones duplicadas del scheduler
- **Archivos**: `backend/models.py`

## 🔧 Backend — Servicios

### 4. Crear services/plantillas.py
- [ ] Diccionario `PLANTILLAS` con 4 eventos:
  - `turno_confirmado`: email_subject, email_body, whatsapp_body
  - `turno_rechazado`: email_subject, email_body, whatsapp_body
  - `recordatorio_48h`: email_subject, email_body, whatsapp_body
  - `recordatorio_2h`: whatsapp_body (solo WhatsApp)
- [ ] Templates usan placeholders: {nombre}, {fecha}, {hora}, {doctor}, {tratamiento}, {uuid}, {link_seguimiento}, {link_portal}, {motivo_rechazo}
- **Archivos**: `backend/services/plantillas.py`

### 5. Crear services/email_service.py
- [ ] Función `enviar(to, subject, body)` → bool
- [ ] Mock: loguea en consola con `[EMAIL]` prefix
- [ ] Estructura preparada para SMTP real (import smtplib comentado)
- [ ] TODO CHANGE-010: integrar SendGrid/AWS SES
- **Archivos**: `backend/services/email_service.py`

### 6. Crear services/whatsapp_service.py
- [ ] Función `enviar(to, body)` → bool
- [ ] Mock: loguea en consola con `[WHATSAPP]` prefix
- [ ] Estructura preparada para Twilio/WhatsApp Cloud API
- [ ] TODO CHANGE-010: integrar API real
- **Archivos**: `backend/services/whatsapp_service.py`

### 7. Crear services/notificaciones.py
- [ ] `EventoNotificacion` enum con 5 valores
- [ ] Función `notificar(evento, paciente, turno, db)`:
  - Construye data para templates (nombre, fecha, doctor, uuid, link, etc.)
  - Si paciente tiene email → `email_service.enviar(...)`
  - Si paciente tiene telefono → `whatsapp_service.enviar(...)`
  - Try/except por canal (si uno falla, el otro sigue)
- [ ] Función `_build_template_data(evento, paciente, turno)`
- **Archivos**: `backend/services/notificaciones.py`

### 8. Crear services/scheduler.py
- [ ] `BackgroundScheduler` de APScheduler
- [ ] Función `check_recordatorios(db)`:
  - Busca turnos pendientes a 48h (ventana ±30min, notificado_48h=False)
  - Busca turnos pendientes a 2h (ventana ±15min, notificado_2h=False)
  - Envía notificación y marca campo notificado=True
- [ ] Función `iniciar_scheduler()`: agrega job cada 10 min
- [ ] Llamar `iniciar_scheduler()` en el startup de main.py
- **Archivos**: `backend/services/scheduler.py`, `backend/main.py`

## 🔧 Backend — Triggers y Webhook

### 9. Agregar triggers en routers/turnos.py
- [ ] En `PUT /turnos/{id}/confirmar`: después de confirmar, llamar `notificar(TURNO_CONFIRMADO, ...)`
- [ ] En `PUT /turnos/{id}/rechazar`: después de rechazar, llamar `notificar(TURNO_RECHAZADO, ...)`
- [ ] Ambas llamadas son fire-and-forget (no bloquean la respuesta)
- **Archivos**: `backend/routers/turnos.py`

### 10. Crear routers/webhook.py
- [ ] Router `prefix="/webhook"`, tags=["Webhook"]
- [ ] `POST /webhook/whatsapp`:
  - Recibe `From` (número) y `Body` (mensaje) como Form data
  - Keyword matching: "turno" → link portal, "secretaria" → deriva, "llamar" → teléfono
  - Fallback: mensaje con las 3 opciones
  - Mock: loguea y retorna respuesta
- [ ] Registrar router en main.py
- **Archivos**: `backend/routers/webhook.py`, `backend/main.py`

## 🎨 Frontend

### 11. Sin cambios de frontend
- [ ] Las notificaciones son backend-only. El UUID ya se muestra en pantalla (CHANGE-007).
- [ ] Opcional: en ConsultaTurnoPage, mostrar instrucciones si no hay email/WhatsApp:
      "Guardá este número de seguimiento: A1B2C3D4"

## ✅ Validación

### 12. Testear notificaciones mock
- [ ] Aceptar un turno → ver log `[EMAIL]` y/o `[WHATSAPP]` con datos correctos
- [ ] Rechazar un turno con motivo → ver log incluye motivo_rechazo
- [ ] Verificar paciente sin email → solo WhatsApp en log
- [ ] Verificar paciente sin teléfono → solo email en log
- [ ] Verificar paciente sin email ni teléfono → no hay logs de notificación

### 13. Testear scheduler
- [ ] Crear turno pendiente para dentro de 48h exactas
- [ ] Forzar ejecución del scheduler o esperar intervalo
- [ ] Verificar log de recordatorio 48h
- [ ] Verificar campo `notificado_48h = True`
- [ ] Repetir para recordatorio 2h

### 14. Testear webhook WhatsApp bot
- [ ] `POST /webhook/whatsapp` con Body="turno" → respuesta con link al portal
- [ ] `POST /webhook/whatsapp` con Body="secretaria" → respuesta de derivación
- [ ] `POST /webhook/whatsapp` con Body="llamar" → respuesta con teléfono
- [ ] `POST /webhook/whatsapp` con Body="hola" → respuesta fallback con 3 opciones
- [ ] Case insensitive (TURNO, Turno, turno → mismo resultado)
