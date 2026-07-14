# Design: Horarios Individuales por Doctor

## Arquitectura general

```
                    ┌──────────────────────────┐
                    │   HORARIOS_DEFAULT (dict) │  ← solo usado para seeding
                    └──────────┬───────────────┘
                               │ seed
                               ▼
┌──────────────────┐   ┌──────────────────────────────┐
│  dias_no_labora- │◄──┤  horarios_doctor (7 rows/doc) │
│  bles_doctor     │   │  dia_semana + franjas         │
│  (fecha, motivo) │   └──────────────────────────────┘
└──────┬───────────┘              │
       │                          │ cargar_horario_doctor()
       │                          ▼
       │              ┌───────────────────────┐
       └──────────────┤ core/horarios.py      │
                      │  - generar_slots_doctor│
                      │  - es_hora_valida_doctor│
                      │  - es_dia_laboral_doctor│
                      └───────────┬───────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              GET /slots    POST /turnos   bloquear slot
```

## Modelos de datos

### `HorarioDoctor` → `horarios_doctor`

```python
class HorarioDoctor(Base):
    __tablename__ = "horarios_doctor"
    id = Column(Integer, primary_key=True, index=True)
    id_doctor = Column(Integer, ForeignKey("doctores.id"), nullable=False)
    dia_semana = Column(Integer, nullable=False)  # 0=lunes..6=domingo
    manana_inicio = Column(Time, nullable=True)
    manana_fin = Column(Time, nullable=True)
    tarde_inicio = Column(Time, nullable=True)
    tarde_fin = Column(Time, nullable=True)
    __table_args__ = (UniqueConstraint('id_doctor', 'dia_semana', name='uq_horario_doctor_dia'),)
    doctor = relationship("Doctor")
```

- Una fila por doctor por día (7 filas por doctor).
- `manana_inicio IS NULL AND tarde_inicio IS NULL` = día cerrado.
- Ejemplo: `(id_doctor=1, dia_semana=0, manana_inicio=09:00, manana_fin=13:00, tarde_inicio=16:00, tarde_fin=20:00)`.

### `DiaNoLaborableDoctor` → `dias_no_laborables_doctor`

```python
class DiaNoLaborableDoctor(Base):
    __tablename__ = "dias_no_laborables_doctor"
    id = Column(Integer, primary_key=True, index=True)
    id_doctor = Column(Integer, ForeignKey("doctores.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    motivo = Column(String(255), nullable=True)
    __table_args__ = (UniqueConstraint('id_doctor', 'fecha', name='uq_dia_no_laborable'),)
    doctor = relationship("Doctor")
```

- Si existe fila para `(doctor, fecha)`, el día se considera cerrado sin importar patrón semanal.
- Extensible: en futuro se puede agregar `id_feriado_global` FK a tabla de feriados compartidos.

## Lógica en `core/horarios.py`

Se mantienen las funciones existentes para backward compat. Se agregan funciones doctor-aware:

### `cargar_horario_doctor(db, id_doctor) → dict[int, list[tuple[time, time]]]`

Carga el patrón semanal desde `horarios_doctor` y lo convierte al mismo formato que `HORARIOS`:

```python
# Retorna:
{
    0: [(time(9,0), time(13,0)), (time(16,0), time(20,0))],  # lunes
    1: [...],
    ...
    3: [],   # jueves cerrado
    ...
}
```

Usa caché por request (no global — se llama por request con db Session).

### `generar_slots_doctor(db, id_doctor, fecha, duracion_minutos=30) → list[time]`

1. Verifica `es_dia_no_laborable_doctor(db, id_doctor, fecha)` → si True, retorna `[]`.
2. Carga `cargar_horario_doctor(db, id_doctor)`.
3. Genera slots sobre el patrón del doctor (misma lógica que `generar_slots` actual).

### `es_hora_valida_doctor(db, id_doctor, fecha_hora, duracion_minutos) → bool`

1. Verifica que el día no sea no laborable.
2. Carga patrón del doctor.
3. Valida hora + duración dentro de franjas (misma lógica que `es_hora_valida`).

### `es_dia_laboral_doctor(db, id_doctor, fecha) → bool`

1. Si `DiaNoLaborableDoctor` existe para `(id_doctor, fecha)` → `False`.
2. Si `cargar_horario_doctor` tiene franjas para `fecha.weekday()` → `True`.

### `obtener_horarios_doctor_publico(db, id_doctor) → dict`

Mismo formato que `obtener_horarios_publicos()` pero para un doctor específico:

```json
{
  "id_doctor": 1,
  "nombre_doctor": "Darío",
  "granularidad_minutos": 30,
  "dias": {
    "lunes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
    "jueves": null,
    ...
  }
}
```

Sin campo `zona_horaria` (es constante de clínica, se devuelve solo en `GET /config/horarios`).

## Endpoints

Todos bajo `routers/doctores.py`. El router base ya tiene `require_role(["admin", "secretaria"])`.

| Método | Ruta | Rol | Request | Response |
|---|---|---|---|---|
| `GET` | `/doctores/{id}/horarios` | admin+secretaria | — | `HorarioDoctorResponse` |
| `PUT` | `/doctores/{id}/horarios` | admin-only | `HorarioDoctorUpdate` | `HorarioDoctorResponse` |
| `GET` | `/doctores/{id}/dias-no-laborables` | admin+secretaria | `?desde=&hasta=` | `list[DiaNoLaborableResponse]` |
| `POST` | `/doctores/{id}/dias-no-laborables` | admin-only | `{fecha, motivo?}` | `DiaNoLaborableResponse` (201) |
| `DELETE` | `/doctores/{id}/dias-no-laborables/{fecha}` | admin-only | — | `{"mensaje": "..."}` |

### Schemas (`backend/schemas/horarios.py`)

```python
class FranjaHorario(BaseModel):
    inicio: str  # "HH:MM"
    fin: str     # "HH:MM"

class DiaHorarioEntry(BaseModel):
    manana: Optional[FranjaHorario] = None
    tarde: Optional[FranjaHorario] = None

class HorarioDoctorResponse(BaseModel):
    id_doctor: int
    nombre_doctor: str
    granularidad_minutos: int = 30
    dias: dict[str, Optional[DiaHorarioEntry]]  # "lunes".."domingo"
    model_config = ConfigDict(from_attributes=True)

class HorarioDoctorUpdate(BaseModel):
    dias: dict[str, Optional[DiaHorarioEntry]]

class DiaNoLaborableCreate(BaseModel):
    fecha: date
    motivo: Optional[str] = None

class DiaNoLaborableResponse(BaseModel):
    id: int
    fecha: date
    motivo: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
```

## Modificaciones en código existente

### `crud/turnos.py:obtener_slots_con_estado(db, fecha, id_doctor)`

Línea 91: `generar_slots(fecha)` → `generar_slots_doctor(db, id_doctor, fecha)`.

### `routers/turnos.py:post_turno()`

Línea 125: `es_hora_valida(turno.fecha_hora, turno.duracion_minutos)` → `es_hora_valida_doctor(db, turno.id_doctor, turno.fecha_hora, turno.duracion_minutos)`.

### `routers/turnos.py:post_bloquear_slot()`

Línea 90: `es_hora_valida(dt_check)` → `es_hora_valida_doctor(db, data.id_doctor, dt_check)`.

### `crud/doctores.py:crear_doctor(db, doctor)`

Después de `db.refresh(db_doctor)`, insertar 7 filas en `horarios_doctor` con `HORARIOS_DEFAULT`.

### `crear_tablas.py:init_db()`

1. `Base.metadata.create_all()` crea las nuevas tablas (automático al estar definidas en `models.py`).
2. Si `horarios_doctor` está vacío, para cada doctor activo insertar 7 filas con `HORARIOS_DEFAULT`.

## Migración

Al no haber Alembic, la creación de tablas es automática (vía `Base.metadata.create_all()` en `main.py`).
La población inicial de doctores existentes se hace en `crear_tablas.py:init_db()`.

### Algoritmo de seeding

```python
HORARIOS_DEFAULT = {
    0: [(time(9,0), time(13,0)), (time(16,0), time(20,0))],   # lunes
    1: [(time(9,0), time(13,0)), (time(16,0), time(20,0))],   # martes
    2: [(time(9,0), time(13,0)), (time(16,0), time(20,0))],   # miércoles
    3: [],                                                      # jueves
    4: [(time(9,0), time(13,0)), (time(16,0), time(20,0))],   # viernes
    5: [(time(9,0), time(13,0))],                               # sábado
    6: [],                                                      # domingo
}

def seed_horarios_doctores(db):
    if db.query(HorarioDoctor).count() > 0:
        return  # ya migrado
    doctores = db.query(Doctor).filter(Doctor.activo == True).all()
    for doc in doctores:
        for dia, franjas in HORARIOS_DEFAULT.items():
            manana = franjas[0] if len(franjas) >= 1 else None
            tarde = franjas[1] if len(franjas) >= 2 else None
            db.add(HorarioDoctor(
                id_doctor=doc.id,
                dia_semana=dia,
                manana_inicio=manana[0] if manana else None,
                manana_fin=manana[1] if manana else None,
                tarde_inicio=tarde[0] if tarde else None,
                tarde_fin=tarde[1] if tarde else None,
            ))
    db.commit()
```

## Baja de doctor

Al dar de baja (`activo=False`), las filas en `horarios_doctor` y `dias_no_laborables_doctor` **se conservan intactas**. Si el doctor se reactiva, su horario custom sobrevive. `obtener_doctores()` ya filtra `activo == True` así que doctores inactivos no aparecen en listas ni su horario se consulta para slots.

## Testing

Archivo `backend/tests/test_horarios_doctor.py`. Mismos patrones que `test_horarios.py`: SQLite, `Base.metadata.create_all()`, fixtures de `conftest.py`.

Casos:
1. **Seeding en creación**: `POST /doctores/` → doctor nuevo tiene `GET /doctores/{id}/horarios` con 7 días y patrón default.
2. **Seeding en migración**: crear doctor manualmente sin horarios → ejecutar seed → verifica 7 filas.
3. **GET/PUT ciclo**: obtener horario → modificar sábado a cerrado → PUT → GET verifica cambio.
4. **Patrón parcial**: PUT con solo mañanas → `GET /turnos/slots` genera solo slots de mañana.
5. **Día no laborable**: POST marcar un lunes como no laborable → `GET /turnos/slots` de ese lunes retorna `[]`.
6. **Crear turno en no laborable**: POST turno en fecha no laborable → 400.
7. **DELETE no laborable**: desmarcar fecha → vuelve a generar slots según patrón semanal.
8. **Bloquear slot con horario doctor**: `POST /turnos/slots/bloquear` en horario que el doctor NO trabaja → 400.
9. **Auth**: secretaria no puede PUT horarios ni POST/DELETE días no laborables (403).
10. **Baja doctor no borra horarios**: DELETE doctor → filas en `horarios_doctor` y `dias_no_laborables_doctor` persisten.
