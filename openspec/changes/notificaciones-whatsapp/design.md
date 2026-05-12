# CHANGE-006: Diseño Técnico — Notificaciones

## 1. Arquitectura

```
┌─────────────────────────────────────────────────────┐
│  Routers (turnos.py, portal.py)                     │
│  Al confirmar/rechazar/reservar →                    │
│  notificaciones.notificar(evento, paciente, turno)  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  services/notificaciones.py (Orquestador)            │
│                                                      │
│  def notificar(evento, paciente, data):              │
│      if paciente.email:                              │
│          email_service.enviar(...)                   │
│      if paciente.telefono:                           │
│          whatsapp_service.enviar(...)                │
│      # Si no tiene ninguno → UUID solo en pantalla  │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
┌──────▼──────────┐  ┌───────▼───────────────────────┐
│ email_service   │  │ whatsapp_service              │
│ SMTP (mock)     │  │ API (mock → real en CHANGE-010│
└─────────────────┘  └───────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  services/scheduler.py (APScheduler)                 │
│  Cada 10 min: busca turnos pendientes               │
│  - 48h antes → recordatorio                         │
│  - 2h antes  → recordatorio                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  routers/webhook.py                                  │
│  POST /webhook/whatsapp                             │
│  Recibe mensaje → keyword matching → responde       │
└─────────────────────────────────────────────────────┘
```

## 2. Servicio de notificaciones (orquestador)

```python
# services/notificaciones.py
from enum import Enum

class EventoNotificacion(str, Enum):
    TURNO_SOLICITADO = "turno_solicitado"
    TURNO_CONFIRMADO = "turno_confirmado"
    TURNO_RECHAZADO = "turno_rechazado"
    RECORDATORIO_48H = "recordatorio_48h"
    RECORDATORIO_2H = "recordatorio_2h"

def notificar(
    evento: EventoNotificacion,
    paciente: Paciente,
    turno: Turno,
    db: Session,
):
    """Orquesta el envío por los canales disponibles."""

    # Construir datos para templates
    data = _build_template_data(evento, paciente, turno)

    # Intentar email
    if paciente.email:
        try:
            email_service.enviar(
                to=paciente.email,
                subject=PLANTILLAS[evento]["email_subject"],
                body=PLANTILLAS[evento]["email_body"].format(**data),
            )
        except Exception as e:
            logger.error(f"Error enviando email: {e}")

    # Intentar WhatsApp
    if paciente.telefono:
        try:
            whatsapp_service.enviar(
                to=paciente.telefono,
                body=PLANTILLAS[evento]["whatsapp_body"].format(**data),
            )
        except Exception as e:
            logger.error(f"Error enviando WhatsApp: {e}")

def _build_template_data(evento, paciente, turno):
    return {
        "nombre": paciente.nombre,
        "apellido": paciente.apellido,
        "fecha": turno.fecha_hora.strftime("%d/%m/%Y"),
        "hora": turno.fecha_hora.strftime("%H:%M"),
        "doctor": turno.doctor.nombre,
        "tratamiento": turno.tratamiento_catalogo.nombre if turno.tratamiento_catalogo else "Consulta",
        "uuid": turno.uuid,
        "link_seguimiento": f"https://odontogest.com.ar/consulta/{turno.uuid}",
        "link_portal": "https://odontogest.com.ar/portal",
        "motivo_rechazo": turno.motivo_rechazo or "",
    }
```

## 3. Templates de mensajes

```python
# services/plantillas.py
PLANTILLAS = {
    "turno_confirmado": {
        "email_subject": "OdontoGest — Turno confirmado",
        "email_body": (
            "Hola {nombre},\n\n"
            "Tu turno fue confirmado:\n"
            "📅 {fecha} a las {hora}\n"
            "👨‍⚕️ Dr. {doctor}\n"
            "🦷 {tratamiento}\n\n"
            "Seguí tu turno: {link_seguimiento}\n\n"
            "OdontoGest"
        ),
        "whatsapp_body": (
            "✅ *Turno confirmado*\n"
            "📅 {fecha} a las {hora}\n"
            "👨‍⚕️ Dr. {doctor}\n"
            "🦷 {tratamiento}\n\n"
            "Seguimiento: {link_seguimiento}"
        ),
    },
    "turno_rechazado": {
        "email_subject": "OdontoGest — Turno rechazado",
        "email_body": (
            "Hola {nombre},\n\n"
            "Tu solicitud de turno fue rechazada.\n"
            "Motivo: {motivo_rechazo}\n\n"
            "Solicitá otro turno: {link_portal}\n\n"
            "OdontoGest"
        ),
        "whatsapp_body": (
            "❌ *Turno rechazado*\n"
            "Motivo: {motivo_rechazo}\n\n"
            "Solicitá otro turno: {link_portal}"
        ),
    },
    "recordatorio_48h": {
        "email_subject": "OdontoGest — Recordatorio de turno",
        "email_body": (
            "Hola {nombre},\n\n"
            "Te recordamos tu turno de mañana:\n"
            "📅 {fecha} a las {hora}\n"
            "👨‍⚕️ Dr. {doctor}\n\n"
            "OdontoGest"
        ),
        "whatsapp_body": (
            "⏰ *Recordatorio*\n"
            "Tu turno es mañana {fecha} a las {hora}\n"
            "con el Dr. {doctor}"
        ),
    },
    "recordatorio_2h": {
        "whatsapp_body": (
            "⏰ *Tu turno es hoy*\n"
            "{fecha} a las {hora}\n"
            "con el Dr. {doctor}\n"
            "¡Te esperamos!"
        ),
    },
}
```

## 4. Servicio de Email (mock)

```python
# services/email_service.py
import logging

logger = logging.getLogger(__name__)

def enviar(to: str, subject: str, body: str):
    """Envía email. Mock: loguea en consola."""
    logger.info(f"[EMAIL] To: {to}")
    logger.info(f"[EMAIL] Subject: {subject}")
    logger.info(f"[EMAIL] Body:\n{body}")
    # TODO CHANGE-010: integrar con SMTP real (sendgrid, AWS SES, etc.)
    return True
```

## 5. Servicio de WhatsApp (mock → real)

```python
# services/whatsapp_service.py
import logging

logger = logging.getLogger(__name__)

def enviar(to: str, body: str):
    """Envía WhatsApp. Mock: loguea en consola."""
    logger.info(f"[WHATSAPP] To: {to}")
    logger.info(f"[WHATSAPP] Body:\n{body}")
    # TODO CHANGE-010: integrar con Twilio o WhatsApp Cloud API
    return True
```

## 6. WhatsApp Bot (webhook)

```python
# routers/webhook.py
router = APIRouter(prefix="/webhook", tags=["Webhook"])

KEYWORDS_TURNO = ["turno", "reservar", "solicitar", "pedir"]
KEYWORDS_SECRETARIA = ["secretaria", "hablar", "persona", "humano"]
KEYWORDS_LLAMAR = ["llamar", "teléfono", "número", "numero"]

RESPUESTA_TURNO = (
    "Para solicitar un turno ingresá a: {link_portal}\n"
    "Es rápido y sin registro."
)
RESPUESTA_SECRETARIA = (
    "Te comunicaremos con la secretaria. En breve te contacta."
)
RESPUESTA_LLAMAR = "Clínica OdontoGest: 11-xxxx-xxxx"
RESPUESTA_FALLBACK = (
    "Escribí:\n"
    "🔹 'turno' para reservar\n"
    "🔹 'secretaria' para hablar con nosotros\n"
    "🔹 'llamar' para el teléfono"
)

@router.post("/whatsapp")
async def webhook_whatsapp(
    From: str = Form(...),
    Body: str = Form(...),
):
    """Recibe mensajes de WhatsApp y responde según keyword."""
    mensaje = Body.lower().strip()

    if any(kw in mensaje for kw in KEYWORDS_TURNO):
        respuesta = RESPUESTA_TURNO.format(link_portal=settings.PORTAL_URL)
    elif any(kw in mensaje for kw in KEYWORDS_SECRETARIA):
        respuesta = RESPUESTA_SECRETARIA
        # TODO: notificar a secretaria via panel/WebSocket
    elif any(kw in mensaje for kw in KEYWORDS_LLAMAR):
        respuesta = RESPUESTA_LLAMAR
    else:
        respuesta = RESPUESTA_FALLBACK

    # Mock: loguea. Real: llama a Twilio API
    logger.info(f"[WHATSAPP BOT] From: {From}, Msg: {Body}")
    logger.info(f"[WHATSAPP BOT] Respuesta: {respuesta}")

    return {"respuesta": respuesta}
```

## 7. Scheduler (recordatorios)

```python
# services/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta

scheduler = BackgroundScheduler()

def check_recordatorios(db: Session):
    """Busca turnos pendientes que necesitan recordatorio."""
    ahora = datetime.now()

    # Recordatorio 48h
    ventana_48h = ahora + timedelta(hours=48)
    turnos_48h = db.query(Turno).filter(
        Turno.estado == "pendiente",
        Turno.fecha_hora.between(ventana_48h - timedelta(minutes=30),
                                  ventana_48h + timedelta(minutes=30)),
        Turno.notificado_48h == False
    ).all()

    for turno in turnos_48h:
        notificar(EventoNotificacion.RECORDATORIO_48H, turno.paciente, turno, db)
        turno.notificado_48h = True

    # Recordatorio 2h
    ventana_2h = ahora + timedelta(hours=2)
    turnos_2h = db.query(Turno).filter(
        Turno.estado == "pendiente",
        Turno.fecha_hora.between(ventana_2h - timedelta(minutes=15),
                                  ventana_2h + timedelta(minutes=15)),
        Turno.notificado_2h == False
    ).all()

    for turno in turnos_2h:
        notificar(EventoNotificacion.RECORDATORIO_2H, turno.paciente, turno, db)
        turno.notificado_2h = True

    db.commit()

def iniciar_scheduler():
    scheduler.add_job(
        lambda: check_recordatorios(next(get_db())),
        'interval', minutes=10, id='recordatorios'
    )
    scheduler.start()
```

**Campos nuevos en Turno** (para evitar notificaciones duplicadas):
```python
notificado_48h = Column(Boolean, default=False)
notificado_2h = Column(Boolean, default=False)
```

## 8. Triggers en routers existentes

```python
# En routers/turnos.py
@router.put("/{id}/confirmar")
def confirmar_turno(id: int, db: Session = Depends(get_db)):
    turno = confirmar_turno_crud(db, id)
    # Trigger notificación
    notificar(EventoNotificacion.TURNO_CONFIRMADO, turno.paciente, turno, db)
    return turno

@router.put("/{id}/rechazar")
def rechazar_turno(id: int, data: RechazarTurnoRequest, db: Session = Depends(get_db)):
    turno = rechazar_turno_crud(db, id, data.motivo_rechazo)
    # Trigger notificación
    notificar(EventoNotificacion.TURNO_RECHAZADO, turno.paciente, turno, db)
    return turno
```

## 9. Variables de entorno

```bash
# CHANGE-006 agrega a .env:
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASSWORD=xxx
EMAIL_FROM=odontogest@clinica.com

WHATSAPP_API_KEY=xxx          # Twilio o Meta Cloud API
WHATSAPP_PHONE_ID=xxx
WHATSAPP_FROM=+54911xxxxxxxx

PORTAL_URL=http://localhost:5173/portal        # Dev
# PORTAL_URL=https://odontogest.com.ar/portal  # Prod

CLINICA_TELEFONO=11-xxxx-xxxx
```

## 10. Orden de construcción

1. Config: ampliar `core/config.py` con vars SMTP + WhatsApp
2. Templates: `services/plantillas.py`
3. Email service: `services/email_service.py` (mock)
4. WhatsApp service: `services/whatsapp_service.py` (mock)
5. Orquestador: `services/notificaciones.py`
6. Triggers en `routers/turnos.py` (confirmar/rechazar)
7. Webhook bot: `routers/webhook.py`
8. Scheduler: `services/scheduler.py` + iniciar en main.py
9. Campos Turno: `notificado_48h`, `notificado_2h`
10. Dependencias: `requirements.txt`
