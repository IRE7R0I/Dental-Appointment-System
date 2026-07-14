# Spec: Horarios Individuales por Doctor

## Modelos

### HorarioDoctor
- Tabla: `horarios_doctor`
- Una fila por doctor por día de semana (7 filas por doctor).
- Campos: `id`, `id_doctor` (FK doctores), `dia_semana` (0-6), `manana_inicio`, `manana_fin`, `tarde_inicio`, `tarde_fin`.
- Todas las columnas de tiempo son nullable. `manana_inicio IS NULL AND tarde_inicio IS NULL` = día cerrado.
- `UniqueConstraint(id_doctor, dia_semana)`.

### DiaNoLaborableDoctor
- Tabla: `dias_no_laborables_doctor`
- Campos: `id`, `id_doctor` (FK doctores), `fecha`, `motivo` (nullable).
- `UniqueConstraint(id_doctor, fecha)`.
- Si existe fila para `(doctor, fecha)`, el día es no laborable sin importar patrón semanal.

## Endpoints

### `GET /doctores/{id}/horarios`
- Retorna patrón semanal del doctor en formato `HorarioDoctorResponse`.
- Roles: admin, secretaria.
- Errores: 404 si doctor no encontrado o inactivo.

### `PUT /doctores/{id}/horarios`
- Reemplaza el patrón semanal completo del doctor.
- Body: `{"dias": {"lunes": {...}, ..., "domingo": null}}`.
- Borra todas las filas existentes del doctor e inserta las nuevas (transacción).
- Roles: solo admin.
- Errores: 404 si doctor no encontrado o inactivo, 403 si no es admin.

### `GET /doctores/{id}/dias-no-laborables?desde=&hasta=`
- Lista fechas no laborables del doctor en un rango.
- Roles: admin, secretaria.
- Errores: 404 si doctor no encontrado.

### `POST /doctores/{id}/dias-no-laborables`
- Marca una fecha como no laborable para el doctor.
- Body: `{"fecha": "YYYY-MM-DD", "motivo": "..."}` (motivo opcional).
- 201 si creado, 409 si ya existe para esa fecha.
- Roles: solo admin.

### `DELETE /doctores/{id}/dias-no-laborables/{fecha}`
- Desmarca una fecha (vuelve al patrón semanal).
- 200 si eliminado, 404 si no existe.
- Roles: solo admin.

## Lógica de disponibilidad

### `generar_slots_doctor(db, id_doctor, fecha, duracion_minutos=30) → list[time]`
- Si la fecha es no laborable → retorna `[]`.
- Carga patrón semanal del doctor desde DB.
- Genera slots de 30 min en las franjas del día.
- Cierre exclusivo: `inicio + duracion <= hora_cierre`.

### `es_hora_valida_doctor(db, id_doctor, fecha_hora, duracion_minutos=30) → bool`
- `False` si fecha es no laborable.
- `False` si no hay franja que contenga `[inicio, inicio+duracion]`.
- `False` si minuto no es :00 ni :30 (granularidad 30 min).

### `es_dia_laboral_doctor(db, id_doctor, fecha) → bool`
- `False` si existe `DiaNoLaborableDoctor` para `(id_doctor, fecha)`.
- `False` si patrón semanal del día no tiene franjas.

## Impacto en endpoints existentes

### `GET /turnos/slots?fecha=&id_doctor=`
- Usa `generar_slots_doctor()` en vez de `generar_slots()`.

### `POST /turnos/`
- Usa `es_hora_valida_doctor()` en vez de `es_hora_valida()`.

### `POST /turnos/slots/bloquear`
- Usa `es_hora_valida_doctor()` en vez de `es_hora_valida()`.

## Comportamiento en seeding

### Al crear doctor (`POST /doctores/`)
- Se insertan 7 filas en `horarios_doctor` con `HORARIOS_DEFAULT` (mismo patrón que el horario global actual).

### Migración inicial (`crear_tablas.py:init_db()`)
- Si `horarios_doctor` está vacío, para cada doctor activo se insertan 7 filas con `HORARIOS_DEFAULT`.

## Baja de doctor
- Al dar de baja (`activo=False`), las filas en `horarios_doctor` y `dias_no_laborables_doctor` se conservan.

## `GET /config/horarios`
- Se mantiene sin cambios (devuelve `HORARIOS_DEFAULT` como referencia de clínica).
