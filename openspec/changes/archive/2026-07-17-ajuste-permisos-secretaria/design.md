# Design: Ajuste de Permisos para Secretaria

## Context

El sistema tiene 2 roles internos: `admin` y `secretaria`. La auditoría de permisos
detectó que varias operaciones del día a día están restringidas solo a admin, cuando la
secretaria debería poder ejecutarlas. No se agregan endpoints ni schemas nuevos; es un
change correctivo de decoradores de permisos en backend.

La regla de negocio general es: admin tiene acceso total, secretaria gestiona la
operación diaria (turnos, pacientes, horarios, catálogo, caja), pero no puede modificar
datos estructurales (crear/eliminar doctores, cambiar fichas de doctor, gestionar usuarios).

## Goals / Non-Goals

**Goals:**
- Permitir que secretaria modifique horarios semanales de doctores (`PUT /api/doctores/{id}/horarios`).
- Permitir que secretaria agregue/elimine días no laborables de doctores.
- Mantener `PUT /api/doctores/{id}` (ficha completa) admin-only.
- Agregar tests de regresión para los nuevos permisos y para lo que sigue prohibido.

**Non-Goals:**
- No se toca frontend2 (en proceso de definición en otra herramienta).
- No se modifican otros routers (pacientes, turnos, finanzas, auth).
- No se agregan funcionalidades nuevas.
- No se cambian schemas, modelos ni migraciones.

## Decisions

### D1: Alcance mínimo — solo 3 decoradores backend

**Alternativas**: (a) revisión completa de todos los permisos de todos los routers,
(b) solo los endpoints identificados en la auditoría.

**Decisión**: (b). La auditoría identificó puntualmente qué endpoints necesitan ajuste.
Una revisión completa de permisos es un change separado (oportunidad de mejora futura).
Los 3 endpoints a modificar están en el mismo archivo (`doctores.py`) y comparten el
mismo patrón: cambiar `require_role(["admin"])` por `require_role(["admin", "secretaria"])`.

### D2: PUT ficha doctor sigue admin-only

**Alternativas**: (a) abrir PUT /doctores/{id} a secretaria también, (b) mantener admin-only.

**Decisión**: (b). El endpoint `PUT /api/doctores/{id}` acepta nombre, matrícula,
especialidad, color_agenda — datos estructurales del doctor que la secretaria no debería
poder modificar. Solo cambian nombre y no son operativos del día a día.

Esto implica que el test nuevo debe verificar explícitamente que secretaria recibe 403
al intentar PUT con payload completo de ficha.

### D3: Catálogo — sin cambios backend

**Auditoría confirmó**: `PUT /api/catalogo/tratamientos/{id}` ya acepta admin+secretaria
desde C-18 (`backend/routers/catalogo.py`). El backend está correcto.

**Decisión**: solo agregar test de regresión que confirme 200 para secretaria en ese
endpoint (para documentar el comportamiento y evitar regresiones futuras).

Obras sociales (`/api/catalogo/obras-sociales`) no tiene PUT — solo GET y DELETE.
Sin cambios.

## Risks / Trade-offs

- **[Riesgo] Secretaria modifica horarios incorrectamente** → Mitigación: el endpoint
  ya valida el formato de horarios (días válidos, rangos horarios). La secretaria solo
  puede modificar, no eliminar doctores. El riesgo operativo es bajo y es exactamente
  la responsabilidad del rol.
- **[Riesgo] Regresión en tests existentes** → Mitigación: solo un test necesita
  actualizarse (`test_put_horarios_doctor_solo_admin`). Los tests nuevos son aditivos.
  Suite completa como regresión.
- **[Trade-off] No se auditan todos los permisos** → Aceptado. El scope es limitado
  a los gaps identificados. Una auditoría completa de permisos por rol es trabajo para
  otro change.

## Open Questions

- Ninguna. El scope está definido por la auditoría previa y confirmado por el usuario.
