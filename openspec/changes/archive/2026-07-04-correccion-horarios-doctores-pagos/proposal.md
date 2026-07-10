# C-12: Corrección de Horarios, Doctores y Pagos

## Problema

El backend actual tiene 3 deficiencias que bloquean el portal de autogestión (C-08):

1. **Horarios desactualizados**: `post_turno` permite 9-19 todos los días excepto jueves/domingo. La clínica real cierra al mediodía (13:00), abre tarde solo lun/mar/mié/vie (16:00-20:00), y sábado solo mañana. No hay granularidad 30 min, ni validación contra duración del turno, ni zona horaria consistente.

2. **Sin bloqueo manual de slots**: La secretaria no puede bloquear slots puntuales (ej: después de extracción pesada) sin crear turnos fantasma. No existe tabla ni endpoints para eso.

3. **Doctores con permisos incorrectos**: Secretaria tiene acceso de escritura a doctores (debe ser solo admin). El color del doctor existe en backend pero sin validación de formato hex.

4. **Pagos sin constancia legible**: `PagoResponse` expone `id_turno` (int crudo) sin un campo formateado que el frontend pueda mostrar como "Constancia de pago — Turno 03/07 - Pérez (16:00)".

## Solución

Cuatro áreas de trabajo, 100% backend, sin tocar frontend/:

1. **`core/horarios.py`**: Reglas reales centralizadas, validación con timezone `America/Argentina/Buenos_Aires` (zoneinfo stdlib), granularidad 30 min, duración-aware.
2. **Tabla `slots_bloqueados` + endpoints**: Bloqueo/liberación manual con `UNIQUE(fecha, hora, id_doctor)`. Endpoint `GET /turnos/slots` devuelve slots con estado.
3. **Doctores**: POST/PUT/DELETE restringido a admin. Secretaria solo GET. Validación hex en `color_agenda`.
4. **Pagos**: Campo `constancia_turno: Optional[str]` en respuestas, formato "DD/MM - Apellido (HH:MM)".

## Capabilities

- `horarios-centralizados`: reglas de horario en módulo reutilizable
- `slots-bloqueados`: bloqueo/liberación manual de slots
- `doctores-admin-only`: CRUD doctores solo admin, secretaria solo lectura
- `constancia-pagos`: identificador legible de turno en pagos
- `config-horarios-endpoint`: endpoint público con reglas de horario

## Impacto

### Archivos nuevos
- `backend/core/horarios.py`

### Archivos modificados
- `backend/models.py` (+SlotsBloqueado)
- `backend/schemas/turnos.py` (+duracion_minutos en TurnoCreate, +schemas slots)
- `backend/schemas/doctores.py` (+validator hex color, +model_config)
- `backend/schemas/finanzas.py` (+constancia_turno)
- `backend/routers/turnos.py` (validación reemplazada, +endpoints slots/bloqueo)
- `backend/routers/doctores.py` (roles restrictivos)
- `backend/routers/finanzas.py` (constancia_turno en responses)
- `backend/crud/turnos.py` (lógica slots bloqueados)

### Knowledge Base
- `knowledge-base/05_reglas_de_negocio.md` (RN-01 corregida, +RN slots)
- `knowledge-base/10_preguntas_abiertas.md` (I-01 resuelto, +input C-08/C-09)

## Depende de
- C-02 (turnos), C-06 (auth/roles), C-07 (catálogo). Todas completadas.

## Risks
- **Zona horaria**: Toda validación horaria debe usar `America/Argentina/Buenos_Aires`. Si el servidor cambia de zona, los cortes se mantienen correctos.
- **Sin migración**: La tabla `slots_bloqueados` es nueva. No hay migración de datos existentes.
- **Frontend desalineado**: `validarHorario` en frontend queda con reglas viejas hasta frontend2. Es esperado.