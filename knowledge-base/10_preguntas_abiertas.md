# 10 — Preguntas Abiertas

## Inconsistencias detectadas en el código vs documentación

### I-01: Validación de horarios desactualizada
- **Documentación**: horarios en franjas mañana (9-12:30) y tarde (16-19:30).
- **Código actual** (`routers/turnos.py:72`): `hora < 9 or hora >= 19` — no respeta franjas ni cierre de mediodía.
- **Plan**: migrar en CHANGE-007. Mientras tanto, la validación existente permite turnos a las 14:00.
- **Riesgo**: bajo (solo la secretaria crea turnos por ahora).

### I-02: Estados del turno simplificados
- **Documentación**: 7 estados (solicitado, pendiente, confirmado, bloqueado, realizado, cancelado, rechazado).
- **Código actual** (`models.py:43`): `default="Pendiente"`, solo maneja "Pendiente", "Asistió", "Canceló".
- **Plan**: CHANGE-007 agrega los estados nuevos. Mantener compatibilidad con valores existentes.
- **Riesgo**: medio. Hay que migrar datos existentes o mapear "Asistió" → "realizado".

### I-03: Endpoint /health documentado como pendiente pero implementado
- **Integrador.txt** (viejo): marcaba /health como CHANGE-010.
- **Código real** (`main.py:21`): `/health` ya existe y funciona.
- **Corregido** en la documentación actualizada (marcado ✅ operativo).

### I-04: /finanzas/ingresos vs /finanzas/pagos
- **Integrador.txt** (viejo): listaba `GET /finanzas/ingresos`.
- **Código real**: `GET /finanzas/pagos?fecha_desde=&fecha_hasta=&metodo_pago=&...`.
- **Corregido** en documentación actualizada.

## Preguntas sin resolver

### Q-01: ¿Migrar estados de turno existentes?
Los turnos en producción tienen estado "Pendiente" o "Asistió". CHANGE-007 introduce
"solicitado", "pendiente", "rechazado", "bloqueado". ¿Se migran los existentes?
- "Pendiente" podría mapearse a "pendiente" (mismo nombre, diferente semántica).
- "Asistió" debería mapearse a "realizado".

**Impacto**: si no se migra, hay dos sistemas de estados conviviendo.
**Prioridad**: media. Resolver antes de CHANGE-007.

### Q-02: ¿Rate limiting en desarrollo?
slowapi con `@limiter.limit()` usa `get_remote_address`. En desarrollo (localhost),
todas las requests vienen de 127.0.0.1. ¿Se deshabilita rate limiting en dev?

**Propuesta**: variable de entorno `RATE_LIMIT_ENABLED=false` en desarrollo.
**Prioridad**: baja.

### Q-03: ¿Manejo de errores del scheduler?
Si el scheduler falla al enviar un recordatorio (ej: 500 emails en una tanda),
¿cómo se maneja el reintento? ¿Se requiere una cola de trabajos (Celery/Redis)?

**Propuesta**: mock inicial no necesita cola. En CHANGE-010 evaluar según volumen real.
**Prioridad**: baja (postergar a producción).

### Q-04: ¿Internacionalización (i18n)?
El sistema está en español argentino. ¿Se prevé soporte para inglés u otros idiomas?

**Suposición**: no. La clínica atiende en Argentina, pacientes y secretaria hablan español.
**Prioridad**: ninguna.

### Q-05: ¿Testing automatizado?
Actualmente no hay tests unitarios ni de integración. ¿Se planean agregar?

**Propuesta**: agregar tests con pytest para endpoints críticos (auth, portal, finanzas)
en CHANGE-010 como parte del deploy.
**Prioridad**: media.

### Q-06: ¿Límite de turnos por paciente?
Un paciente podría (teóricamente) solicitar 100 turnos desde el portal y saturar
la agenda. ¿Hay un límite de turnos "solicitados" activos por DNI?

**Propuesta**: máximo 3 turnos en estado "solicitado" por DNI. Si intenta un 4to → 400.
**Prioridad**: media. Implementar en CHANGE-007.

### Q-07: ¿Timeout de turnos solicitados?
Si un paciente solicita un turno y la secretaria no lo aprueba ni rechaza en 24h,
¿qué pasa con ese slot? ¿Se libera automáticamente?

**Propuesta**: no liberar automáticamente (puede generar confusión). La secretaria
ve las solicitudes pendientes en el panel con un badge numérico.
**Prioridad**: baja.

### Q-08: ¿Dominio propio?
¿Ya existe un dominio comprado para el consultorio (ej: odontogest.com.ar)?
¿O se necesita comprar uno en CHANGE-010?

**Suposición**: se comprará un dominio `.com.ar` en CHANGE-010.
**Prioridad**: media (bloqueante para deploy).

### Q-09: ¿Hosting de email transaccional?
Para enviar emails de notificación en producción, ¿se usará SendGrid, AWS SES,
Mailtrap, o el SMTP del hosting?

**Propuesta**: empezar con Mailtrap en desarrollo. Evaluar SendGrid (100 emails/día gratis)
para producción.
**Prioridad**: baja (CHANGE-010).

### Q-10: ¿Polling o WebSocket para sync multi-secretaria?
Con múltiples secretarias conectadas en simultáneo, ¿alcanza con polling cada
10-15 segundos (refetch de agenda/dashboard) o se requiere WebSocket para
sincronización en tiempo real?

**Propuesta**: empezar con polling (más simple, ya tenemos el patrón en Dashboard KPI).
Migrar a WebSocket post-deploy si el delay de 10-15s resulta molesto.
**Prioridad**: media (CHANGE-007).
