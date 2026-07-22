# permissions

Delta de permisos por rol para el rol "secretaria". Define qué endpoints cambian de
admin-only a admin+secretaria y cuáles se mantienen restringidos.

## PUT /api/doctores/{id}/horarios

- **Antes**: admin
- **Después**: admin, secretaria
- **Request body**: `HorariosDoctorCreate` (sin cambios)
- **Response**: `200` con lista de horarios. `404` si doctor no existe. `401` sin token.
- **Regresión**: admin sigue teniendo acceso (sin cambios).

## POST /api/doctores/{id}/dias-no-laborables

- **Antes**: admin
- **Después**: admin, secretaria
- **Request body**: `{"fecha": "YYYY-MM-DD"}`
- **Response**: `201` con `DiaNoLaborableResponse`. `404` si doctor no existe. `409` si ya existe.
- **Regresión**: admin sigue teniendo acceso (sin cambios).

## DELETE /api/doctores/{id}/dias-no-laborables/{fecha}

- **Antes**: admin
- **Después**: admin, secretaria
- **Response**: `200` con mensaje de éxito. `404` si no existe el día o el doctor.
- **Regresión**: admin sigue teniendo acceso (sin cambios).

## PUT /api/doctores/{id} — SIN CAMBIOS (admin-only)

- **Auth**: admin (sin cambios)
- **Motivo**: modifica datos estructurales del doctor (nombre, matrícula, especialidad,
  color_agenda). Fuera del scope operativo de secretaria.
- **Test nuevo requerido**: secretaria con token válido → `403 Forbidden`.

## PUT /api/catalogo/tratamientos/{id} — SIN CAMBIOS (ya admin+secretaria desde C-18)

- **Auth**: admin, secretaria (ya implementado, sin cambios)
- **Motivo**: la auditoría confirmó que el backend ya permite secretaria en este endpoint.
- **Test nuevo requerido**: secretaria con token válido → `200 OK` (regresión para documentar
  comportamiento existente).
