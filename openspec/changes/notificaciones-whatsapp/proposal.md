# CHANGE-006: Notificaciones — Email, WhatsApp y Bot Conversacional

## Problema

Actualmente los pacientes no reciben ninguna notificación del sistema. Si
solicitan un turno, deben anotar manualmente el UUID. Si la secretaria rechaza
la solicitud, el paciente no se entera hasta que consulta el link.

El consultorio necesita:
- Confirmar turnos automáticamente sin llamadas manuales
- Recordar turnos para reducir ausencias
- Ofrecer un canal de autogestión por WhatsApp para pacientes no digitalizados

## Solución

Sistema de notificaciones multicanal con tres capas:

1. **Email** (opcional): para pacientes con correo electrónico
2. **WhatsApp**: para pacientes con teléfono (prioritario en Argentina)
3. **WhatsApp Bot**: responde mensajes entrantes con opciones (turno, secretaria, llamar)

Prioridad de envío:
- Si paciente tiene email → email con link UUID
- Si paciente tiene teléfono → WhatsApp con link UUID
- Si no tiene ninguno → UUID solo en pantalla (ya implementado en CHANGE-007)

## Eventos y mensajes

| Evento | Canal | Template |
|--------|-------|----------|
| Turno aceptado | Email + WhatsApp | "Tu turno fue confirmado para [fecha] a las [hora] con el Dr. [nombre]. Seguimiento: /consulta/{uuid}" |
| Turno rechazado | Email + WhatsApp | "Tu solicitud fue rechazada. Motivo: [razón]. Solicitá otro turno en: /portal" |
| Recordatorio 48h | Email + WhatsApp | "Te recordamos tu turno de mañana a las [hora] con el Dr. [nombre]" |
| Recordatorio 2h | Solo WhatsApp | "Tu turno es hoy a las [hora] con el Dr. [nombre]. ¡Te esperamos!" |

## WhatsApp Bot

```
Paciente escribe al WhatsApp de la clínica
         │
         ▼
   POST /webhook/whatsapp
         │
         ▼
   ┌─────────────────────┐
   │ Keyword matching     │
   └──────┬──────────────┘
          │
    ┌─────┼─────────────┐
    ▼     ▼              ▼
 "turno" "secretaria"  "llamar"
 "reservar" "hablar"   "teléfono"
 "solicitar" "persona" "número"
    │       │              │
    ▼       ▼              ▼
 Envía    Notifica a    "Clínica OdontoGest:
 link al  secretaria    11-xxxx-xxxx"
 portal   (dashboard)
```

**Fallback**: si no coincide ningún keyword → envía mensaje con las 3 opciones.

**Mock inicial**: sin API externa de WhatsApp. El webhook simula respuestas.
La integración real con Twilio/WhatsApp Cloud API se activa en CHANGE-010.

## Capabilities

- `email-service`: envío de emails con SMTP (mock inicial)
- `whatsapp-service`: envío de WhatsApp (mock inicial)
- `whatsapp-bot`: webhook para recibir y responder mensajes
- `scheduler`: recordatorios automáticos con APScheduler
- `plantillas`: templates de mensajes configurables

## Impacto

### Backend — archivos nuevos
- `backend/services/notificaciones.py` — orquestador (decide canal según datos)
- `backend/services/email_service.py` — envío de emails
- `backend/services/whatsapp_service.py` — envío de WhatsApp
- `backend/services/plantillas.py` — templates de mensajes
- `backend/services/scheduler.py` — APScheduler para recordatorios
- `backend/routers/webhook.py` — POST /webhook/whatsapp

### Backend — archivos modificados
- `backend/routers/turnos.py` (+trigger notificación al confirmar/rechazar)
- `backend/routers/portal.py` (+trigger notificación al reservar)
- `backend/core/config.py` (+vars SMTP + WhatsApp)
- `requirements.txt` (+apscheduler, +httpx)

### Frontend — sin cambios
Las notificaciones son backend-only en esta fase.

## Depende de
- CHANGE-007 (portal: la confirmación/rechazo dispara las notificaciones)

## Riesgos

- **Mock vs real**: el mock permite testear el flujo sin depender de APIs externas.
  La migración a real es solo cambiar el servicio (misma interfaz).
- **Costos**: WhatsApp Business API tiene costo por mensaje. Twilio también.
  Evaluar en CHANGE-010 según volumen.
- **Email delivery**: requiere SMTP configurado. En desarrollo se puede usar Mailtrap.
