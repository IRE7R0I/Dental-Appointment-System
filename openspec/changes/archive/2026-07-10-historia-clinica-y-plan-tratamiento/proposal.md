# Proposal: historia-clinica-y-plan-tratamiento

## What

Agregar soporte backend completo para la Fase A de la ficha de paciente que ya está diseñada en `frontend2/` (Google AI Studio). Este change implementa tres módulos de datos clínicos que hoy no existen en el backend: alertas médicas, evoluciones clínicas y plan de tratamiento. Resuelve definitivamente el hallazgo 6.2 de `AUDITORIA_BACKEND.md` (notas clínicas actualmente en `localStorage`, sin persistencia real).

## Why

- **Hallazgo 6.2 de auditoría**: La ficha de paciente actual guarda notas clínicas en `localStorage` del navegador. Si la secretaria cambia de máquina o limpia el caché, pierde toda la información clínica. No hay backup, no hay auditoría, no hay persistencia.
- **Frontend2 ya diseñado**: Las vistas de ficha de paciente en `frontend2/` (secciones 2.5 y 2.6 del blueprint) esperan endpoints reales para alimentar las tarjetas de resumen, el historial de evoluciones y el plan de tratamiento. Sin backend, esas vistas quedan mockeadas.
- **Tarjeta física real**: La clínica ya usa una tarjeta de registro en papel con columnas: Día, Prestación, Pieza Dental, Ubicación de Lesión, Observaciones, Conformidad Paciente. Este change digitaliza ese registro.

## Scope

### 1. Alertas médicas del paciente
- Tabla `alertas_medicas`: tipo (alergia/condicion) + descripcion + FK a paciente.
- CRUD: crear, listar, eliminar. Solo admin y secretaria.
- Se muestran como badges de alerta en la ficha de paciente (frontend2).

### 2. Evoluciones clínicas (reemplaza localStorage)
- Tabla `evoluciones_clinicas`: fecha (date, obligatoria), id_turno (FK nullable), pieza_dental (int FDI 11-48, nullable), ubicacion_lesion (string comma-separated O/D/G/L/M/I/V/P, nullable), observaciones (Text), conformidad_paciente (bool), creado_por_id, actualizado_por_id, timestamps.
- Endpoints: crear (POST), listar por paciente (GET), corregir (PUT con auditoría).
- Regla RN-16: si tiene id_turno, el turno debe estar "Asistió". Si id_turno es null, fecha manual (migración papel).

### 3. Plan de Tratamiento
- Tabla `plan_tratamiento_items`: id_tratamiento (FK opcional a catálogo), descripcion (texto libre), fecha_objetivo (opcional), estado (pendiente/completado), orden (int).
- Endpoints: crear, listar, cambiar estado, eliminar.
- Items con FK al catálogo permiten estimación de costo total.

### 4. Endpoint de resumen
- `GET /pacientes/{dni}/resumen`: conteos para 4 tarjetas (Hallazgos, Pendientes, Evoluciones, Imágenes).
- Hallazgos e Imágenes retornan `null` hasta que existan módulos de odontograma y archivos.

## Out of scope
- Odontograma (change aparte con `op-odontogram`).
- Imágenes/Recetas/Docs (requieren infraestructura de almacenamiento).
- Frontend viejo (`frontend/`) — no se toca.
- Migración de estado de turnos a 7 estados (eso es C-08).

## Dependencies
- C-02 (`gestion-pacientes-y-turnos`) — modelo Turno y Paciente ✅
- C-06 (`auth-y-autorizacion`) — JWT, roles, dependencies ✅
- C-07 (`catalogo-tratamientos`) — FK opcional a TratamientoCatalogo ✅
- C-12 (`correccion-horarios-doctores-pagos`) — validación de estado "Asistió" ✅

## Governance
**ALTO** — datos clínicos, seguridad del paciente (alergias), reemplaza localStorage con persistencia real.
