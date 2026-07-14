# C-16: Horarios Individuales por Doctor

## Problema

Hoy el horario de atención es único y global para toda la clínica (`core/horarios.py`, dict `HORARIOS`).
Todos los doctores comparten las mismas franjas (lunes-viernes mañana+tarde, sábado solo mañana, jueves/domingo cerrado).

Esto impide:
- Que un doctor trabaje solo mañanas mientras otro atiende mañana y tarde.
- Marcar días puntuales como no laborables (feriados, vacaciones, ausencias) por doctor.
- Que el portal de autogestión (C-08) muestre disponibilidad real por profesional.
- Que el bulk mensual de agenda (futuro) calcule slots correctos por doctor.

## Solución

Reemplazar el horario global por un sistema de dos capas:

1. **Patrón semanal por doctor**: tabla `horarios_doctor` con 7 filas por doctor (lunes a domingo),
   cada una con franjas de mañana y/o tarde. Mismo shape que `GET /config/horarios` actual.
2. **Excepciones puntuales por fecha**: tabla `dias_no_laborables_doctor` para marcar días
   específicos como cerrados (independientemente del patrón semanal).

Toda la lógica de disponibilidad (`generar_slots`, `es_hora_valida`, `es_dia_laboral`) pasa
a ser doctor-aware. El dict `HORARIOS` global persiste como `HORARIOS_DEFAULT` para seeding
de nuevos doctores.

Migración: doctores existentes heredan el horario global actual como punto de partida editable.

## Capabilities

### New Capabilities
- `horarios-doctor-db`: modelos `HorarioDoctor` y `DiaNoLaborableDoctor` con endpoints CRUD.
- `core-horarios-doctor-aware`: `core/horarios.py` extendido con funciones que cruzan patrón semanal + excepciones por doctor.
- `turnos-validan-contra-doctor`: `POST /turnos/`, `POST /turnos/slots/bloquear`, `GET /turnos/slots` usan horario del doctor (no global).

### Modified Capabilities
- `doctor-crud`: `POST /doctores/` ahora seedea `horarios_doctor` con `HORARIOS_DEFAULT` al crear.
- `config-horarios`: `GET /config/horarios` se mantiene como referencia/default (backward compat).

## Impacto

- **Código**: `backend/core/horarios.py`, `backend/models.py`, `backend/crud/turnos.py`, `backend/routers/turnos.py`, `backend/routers/doctores.py`, `backend/crud/doctores.py`, `crear_tablas.py`
- **DB**: nuevas tablas `horarios_doctor`, `dias_no_laborables_doctor`. Sin cambios en tablas existentes.
- **API**: nuevos endpoints bajo `/doctores/{id}/horarios` y `/doctores/{id}/dias-no-laborables`. Endpoints de turnos/slots validan contra horario del doctor (cambio de comportamiento interno, misma interfaz).
- **Breaking**: doctores sin `horarios_doctor` (solo posible si se saltea migración) quedarían sin slots — la migración en `crear_tablas.py` lo previene.
- **Dependencias**: C-12 (infraestructura horarios/slots actual), C-06 (auth/roles). Ambas completadas.
- **Prerrequisito para**: C-08 (`portal-autogestion`), bulk mensual de agenda (futuro).
