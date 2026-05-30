# 10 — Preguntas Abiertas

## Inconsistencias con el código

### I-01: Validación de horarios desactualizada
**Doc**: franjas mañana/tarde por día. **Código**: hora < 9 or hora >= 19. **Plan**: migrar en portal-autogestion. **Riesgo**: bajo (solo secretaria crea turnos por ahora).

### I-02: Estados del turno simplificados
**Doc**: 7 estados. **Código**: "Pendiente", "Asistió", "Canceló". **Plan**: portal-autogestion agrega estados nuevos. Migrar "Asistió" → "realizado".

## Preguntas sin resolver

### Q-01: ¿Migrar estados de turno existentes?
portal-autogestion introduce "solicitado", "rechazado", "bloqueado". ¿Migrar "Pendiente" → "pendiente", "Asistió" → "realizado"? **Propuesta**: sí, como parte de portal-autogestion. **Prioridad**: media.

### Q-02: ¿Rate limiting en desarrollo?
slowapi usa get_remote_address. En localhost todas las requests son 127.0.0.1. **Propuesta**: RATE_LIMIT_ENABLED=false en dev. **Prioridad**: baja.

### Q-03: ¿Reintentos del scheduler?
Si falla envío de recordatorio, ¿cola de trabajos? **Propuesta**: mock no necesita. Evaluar en polish-y-deploy. **Prioridad**: baja.

### Q-04: ¿i18n?
Solo español argentino. **Suposición**: no se necesita. **Prioridad**: ninguna.

### Q-05: ¿Testing automatizado?
Sin tests actualmente. **Propuesta**: agregar pytest en polish-y-deploy. **Prioridad**: media.

### Q-06: ¿Límite de turnos solicitados por DNI?
Riesgo de saturación del portal. **Propuesta**: máximo 3 turnos "solicitados" activos por DNI. Implementar en portal-autogestion. **Prioridad**: media.

### Q-07: ¿Timeout de turnos solicitados?
Si secretaria no aprueba en 24h, ¿liberar slot? **Propuesta**: no liberar automáticamente (confusión). Badge numérico en panel. **Prioridad**: baja.

### Q-08: ¿Dominio propio?
¿odontogest.com.ar ya comprado? **Propuesta**: comprar en polish-y-deploy si no existe. **Prioridad**: media.

### Q-09: ¿Hosting de email transaccional?
SendGrid (100/día gratis), AWS SES, o SMTP del hosting. **Propuesta**: Mailtrap en dev, SendGrid en prod. **Prioridad**: baja.

### Q-10: ¿Polling o WebSocket para sync multi-secretaria?
Con múltiples secretarias, ¿alcanza polling 15s o se requiere WebSocket? **Propuesta**: polling primero. Migrar a WebSocket post-deploy si delay molesta. **Prioridad**: media.

### Q-11: ¿Google OAuth para recuperación de admin?
Usuario pidió conectar cuenta de Google por si olvida contraseña. También recuperación por teléfono. **Propuesta**: post-deploy (CHANGE-012). Requiere Google Cloud Console + OAuth2. Complejidad alta para 1 usuario. **Prioridad**: baja.
