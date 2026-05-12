# CHANGE-007: Portal de Autogestión del Paciente (Guest Checkout)

## Problema

Actualmente los pacientes solo pueden sacar turno llamando por teléfono o
yendo a la clínica. La secretaria debe atender el teléfono, buscar
disponibilidad manualmente y cargar los datos. Esto consume tiempo que podría
usar en otras tareas administrativas.

El sistema ya tiene agenda, doctores y pacientes. Falta un portal público
donde el paciente pueda solicitar turnos por su cuenta, las 24 horas, sin
intervención de la secretaria.

## Solución: Guest Checkout sin login

El paciente **no necesita crear cuenta ni recordar contraseña**. El flujo es
directo y público:

1. **Elegir Tratamiento**: ve cards del catálogo con nombre, precio y duración
2. **Elegir Profesional**: elige doctor (Darío o Fabiana)
3. **Elegir Horario**: ve slots de 30 min como tarjetas en franjas mañana/tarde
4. **Identificarse**: ingresa DNI. El sistema verifica:
   - DNI existe → muestra datos precargados en modo lectura para confirmar
   - DNI nuevo → formulario para cargar datos (shadow profile automático)

Al confirmar, el turno se crea con estado `solicitado` y recibe un UUID único.
Ese UUID se convierte en un enlace web clickeable para seguimiento. La
secretaria revisa las solicitudes y las acepta o rechaza desde su panel.

### ¿Por qué no login?

- **Barrera de entrada**: personas mayores, sin email, sin ganas de crear cuenta.
- **Seguridad**: el DNI es el identificador único en Argentina. El UUID protege
  el acceso al turno sin exponer datos del paciente.
- **Shadow profiles**: si el DNI no existe, se crea automáticamente. El paciente
  "ya está en el sistema" para su próxima visita.

## Flujo completo

```
Paso 1: Servicio    →  Cards del catálogo (GET /catalogo/tratamientos)
Paso 2: Profesional →  Cards de doctores (GET /doctores)
Paso 3: Agenda      →  Slots disponibles (GET /portal/disponibilidad)
                        Solo mañana 9-12:30 y tarde 16-19:30. Sin jueves/domingo.
Paso 4: Identif.    →  Input DNI (GET /pacientes/verificar/{dni})
                        ├── Existe → confirmar datos
                        └── Nuevo  → formulario + obra social (GET /catalogo/obras-sociales)
Confirmación        →  POST /portal/reservar → turno "solicitado" + UUID
                        Muestra link: /consulta/A1B2C3D4

Secretaria          →  Panel "Solicitudes" en AgendaPage
                        Aceptar → estado "pendiente" + notificación (CHANGE-006)
                        Rechazar → textarea motivo → estado "rechazado" + notificación

Consulta UUID       →  /consulta/:uuid (pública)
                        Ver estado, cancelar si está pendiente
```

## Capabilities

- `portal-guest-checkout`: reserva pública sin login, 4 pasos
- `shadow-profiles`: creación automática de paciente por DNI
- `uuid-turno-publico`: acceso y cancelación por UUID sin credenciales
- `panel-aprobacion`: secretaria acepta/rechaza solicitudes con motivo
- `bloqueo-slots`: secretaria bloquea horarios manualmente
- `horarios-franjas`: validación de mañana (9-12:30) y tarde (16-19:30)

## Impacto

### Backend — archivos nuevos
- `backend/schemas/portal.py`
- `backend/crud/portal.py`
- `backend/routers/portal.py`

### Backend — archivos modificados
- `backend/models.py` (Turno: +uuid, +motivo_rechazo, +id_tratamiento, +obra_social)
- `backend/schemas/turnos.py` (+TurnoSolicitadoResponse, RechazarTurnoRequest)
- `backend/schemas/pacientes.py` (+VerificacionDNIResponse)
- `backend/routers/pacientes.py` (+GET /verificar/{dni})
- `backend/routers/turnos.py` (+solicitados, +confirmar, +rechazar, +bloquear, validar horarios)

### Frontend — archivos nuevos
- `frontend/src/pages/portal/PortalPage.tsx` (stepper container)
- `frontend/src/pages/portal/Step1Servicio.tsx`
- `frontend/src/pages/portal/Step2Profesional.tsx`
- `frontend/src/pages/portal/Step3Agenda.tsx`
- `frontend/src/pages/portal/Step4Identificacion.tsx`
- `frontend/src/pages/portal/ConfirmacionTurno.tsx`
- `frontend/src/pages/ConsultaTurnoPage.tsx`

### Frontend — archivos modificados
- `frontend/src/pages/AgendaPage.tsx` (+panel solicitudes + bloqueo)
- `frontend/src/App.tsx` (+rutas públicas /portal y /consulta/:uuid)

## Depende de
- CHANGE-009 (auth para panel de aprobación, slowapi para rate limiting)
- CHANGE-011 (catálogo de tratamientos y obras sociales)

## Riesgos

- **Privacidad DNI**: GET /verificar/{dni} es público. Solo devuelve nombre,
  apellido, teléfono y obra social. Sin email ni historial clínico.
  Protegido por rate limiting.
- **Shadow profiles**: si un paciente escribe mal su DNI, se crea un perfil
  duplicado. La secretaria puede mergear/editar después.
- **Disponibilidad en tiempo real**: race condition si dos pacientes reservan
  el mismo slot al mismo tiempo. Se valida antes del INSERT.
