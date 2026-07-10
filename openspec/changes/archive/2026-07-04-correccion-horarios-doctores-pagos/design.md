# CHANGE-012: Diseño Técnico — Corrección de Horarios, Doctores y Pagos

## 1. Módulo de Horarios Centralizado

Archivo nuevo: `backend/core/horarios.py`

### Constantes de horario

| Día | `weekday()` | Mañana | Tarde |
|-----|-------------|--------|-------|
| Lunes | 0 | 09:00-13:00 | 16:00-20:00 |
| Martes | 1 | 09:00-13:00 | 16:00-20:00 |
| Miércoles | 2 | 09:00-13:00 | 16:00-20:00 |
| Jueves | 3 | — | — |
| Viernes | 4 | 09:00-13:00 | 16:00-20:00 |
| Sábado | 5 | 09:00-13:00 | — |
| Domingo | 6 | — | — |

**Regla de cierre**: los horarios de cierre son exclusivos. El último slot de mañana arranca a las 12:30 (12:30+30min=13:00). El último slot de tarde arranca a las 19:30 (19:30+30min=20:00). Un turno de 60 min el sábado arranca a las 12:00 como máximo.

### Código completo

```python
from zoneinfo import ZoneInfo
from datetime import datetime, date, time
from typing import Optional

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

# ── Franjas por día de semana ──
# Formato: weekday -> [(inicio_mañana, fin_mañana), (inicio_tarde, fin_tarde)]
# Tupla vacía = cerrado
HORARIOS: dict[int, list[tuple[time, time]]] = {
    0: [(time(9, 0), time(13, 0)), (time(16, 0), time(20, 0))],  # lunes
    1: [(time(9, 0), time(13, 0)), (time(16, 0), time(20, 0))],  # martes
    2: [(time(9, 0), time(13, 0)), (time(16, 0), time(20, 0))],  # miércoles
    3: [],                                                         # jueves CERRADO
    4: [(time(9, 0), time(13, 0)), (time(16, 0), time(20, 0))],  # viernes
    5: [(time(9, 0), time(13, 0))],                                # sábado SÓLO MAÑANA
    6: [],                                                         # domingo CERRADO
}

NOMBRES_DIAS = {
    0: "lunes", 1: "martes", 2: "miércoles", 3: "jueves",
    4: "viernes", 5: "sábado", 6: "domingo",
}


def dt_local(dt: datetime) -> datetime:
    """Convierte datetime a timezone AR para validación de horario."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=AR_TZ)
    return dt.astimezone(AR_TZ)


def es_dia_laboral(fecha: date) -> bool:
    """True si el día tiene al menos una franja horaria."""
    return len(HORARIOS.get(fecha.weekday(), [])) > 0


def _hora_a_decimal(t: time) -> float:
    return t.hour + t.minute / 60


def es_hora_valida(fecha_hora: datetime, duracion_minutos: int = 30) -> bool:
    """
    Valida que el slot (fecha_hora + duración) entre completo dentro de
    alguna franja del día.
    """
    local = dt_local(fecha_hora)
    dia = local.weekday()
    inicio = local.hour * 60 + local.minute
    fin = inicio + duracion_minutos

    if not validar_granularidad(local.hour, local.minute):
        return False

    for apertura, cierre in HORARIOS.get(dia, []):
        apertura_min = apertura.hour * 60 + apertura.minute
        cierre_min = cierre.hour * 60 + cierre.minute
        if inicio >= apertura_min and fin <= cierre_min:
            return True
    return False


def generar_slots(fecha: date, duracion_minutos: int = 30) -> list[time]:
    """Genera todos los slots válidos para una fecha con la duración dada."""
    dia = fecha.weekday()
    slots: list[time] = []
    for apertura, cierre in HORARIOS.get(dia, []):
        actual = apertura.hour * 60 + apertura.minute
        cierre_min = cierre.hour * 60 + cierre.minute
        while actual + duracion_minutos <= cierre_min:
            h, m = divmod(actual, 60)
            slots.append(time(int(h), int(m)))
            actual += 30  # granularidad base
    return slots


def validar_granularidad(hora: int, minuto: int) -> bool:
    """Solo minutos :00 y :30 permitidos."""
    return minuto in (0, 30)


def obtener_horarios_publicos() -> dict:
    """Devuelve las reglas de horario como dict para el endpoint público."""
    dias = {}
    for wd, nombre in NOMBRES_DIAS.items():
        franjas = HORARIOS.get(wd, [])
        if not franjas:
            dias[nombre] = None
        else:
            entry = {}
            if len(franjas) >= 1:
                entry["mañana"] = [franjas[0][0].strftime("%H:%M"), franjas[0][1].strftime("%H:%M")]
            if len(franjas) >= 2:
                entry["tarde"] = [franjas[1][0].strftime("%H:%M"), franjas[1][1].strftime("%H:%M")]
            dias[nombre] = entry
    return dias
```

## 2. Modelo SlotsBloqueado

En `backend/models.py`:

```python
class SlotsBloqueado(Base):
    __tablename__ = "slots_bloqueados"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    id_doctor = Column(Integer, ForeignKey("doctores.id"), nullable=False)
    motivo = Column(String(255), nullable=True)
    bloqueado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    creado_en = Column(DateTime, default=datetime.now)

    __table_args__ = (
        UniqueConstraint('fecha', 'hora', 'id_doctor', name='uq_slot_bloqueado'),
    )

    doctor = relationship("Doctor")
    bloqueado_por = relationship("Usuario")
```

**Reglas**:
- `UNIQUE(fecha, hora, id_doctor)` — un mismo slot no se puede bloquear dos veces.
- No hay soft-delete ni edición. Se bloquea (POST) y se desbloquea (DELETE).
- Es independiente de Turno. Un slot puede estar "libre", "ocupado" (tiene Turno) o "bloqueado".

## 3. Endpoints

### GET /turnos/slots

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `fecha` | `date` | sí | Fecha a consultar (YYYY-MM-DD) |
| `id_doctor` | `int` | sí | Doctor a consultar |

**Auth**: `admin`, `secretaria`

**Respuesta**:
```json
[
  {"hora": "09:00", "estado": "libre"},
  {"hora": "09:30", "estado": "ocupado", "turno_id": 42, "paciente": "Pérez"},
  {"hora": "10:00", "estado": "bloqueado", "motivo": "Extracción pesada"},
  {"hora": "10:30", "estado": "ocupado", "turno_id": 43, "paciente": "García"},
  {"hora": "13:00", "estado": "libre"}
]
```

**Lógica** (en `crud/turnos.py`):
1. Generar slots del día vía `generar_slots(fecha)`.
2. Consultar turnos existentes para ese doctor+fecha.
3. Consultar slots bloqueados para ese doctor+fecha.
4. Construir respuesta: si un slot tiene turno → `"ocupado"`; si está en `slots_bloqueados` → `"bloqueado"`; si no → `"libre"`.

### POST /turnos/slots/bloquear

**Auth**: `admin`, `secretaria`

**Body**:
```json
{
  "fecha": "2026-07-03",
  "hora": "10:00",
  "id_doctor": 1,
  "motivo": "Extracción pesada — no agendar después"
}
```

**Respuesta**: `201 Created`
```json
{
  "id": 1,
  "fecha": "2026-07-03",
  "hora": "10:00",
  "id_doctor": 1,
  "motivo": "Extracción pesada — no agendar después",
  "creado_en": "2026-07-03T04:40:00"
}
```

**Validaciones**:
- `fecha` debe ser día laboral (no jueves/domingo).
- `hora` debe ser `:00` o `:30`.
- `hora` debe caer dentro de una franja horaria válida.
- No debe existir un turno ya ocupado en ese slot (conflicto 409).
- `UNIQUE(fecha, hora, id_doctor)` protege contra duplicados (409).

### DELETE /turnos/slots/{id}/desbloquear

**Auth**: `admin`, `secretaria`

**Respuesta**: `200 OK`
```json
{"mensaje": "Slot desbloqueado correctamente"}
```

**Error**: `404` si el slot bloqueado no existe.

### GET /config/horarios

**Auth**: público (sin autenticación)

**Respuesta**:
```json
{
  "zona_horaria": "America/Argentina/Buenos_Aires",
  "dias": {
    "lunes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
    "martes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
    "miércoles": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
    "jueves": null,
    "viernes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
    "sábado": {"mañana": ["09:00", "13:00"]},
    "domingo": null
  },
  "granularidad_minutos": 30
}
```

Consumido por frontend2 (portal autogestión) y frontend1 (eventualmente).

## 4. Schemas Pydantic

### TurnoCreate — añadir `duracion_minutos`

```python
class TurnoCreate(BaseModel):
    fecha_hora: datetime
    motivo: Optional[str] = None
    dni_paciente: str
    id_doctor: int
    duracion_minutos: int = 30  # NUEVO
```

### Nuevos schemas de slots

En `backend/schemas/turnos.py`:

```python
from pydantic import BaseModel
from datetime import date, time, datetime
from typing import Optional, Literal


class SlotBloquearInput(BaseModel):
    fecha: date
    hora: time
    id_doctor: int
    motivo: Optional[str] = None


class SlotResponse(BaseModel):
    hora: str  # "09:00"
    estado: Literal["libre", "ocupado", "bloqueado"]
    turno_id: Optional[int] = None
    paciente: Optional[str] = None
    motivo: Optional[str] = None


class SlotBloqueadoResponse(BaseModel):
    id: int
    fecha: date
    hora: time
    id_doctor: int
    motivo: Optional[str]
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
```

### Doctor schemas — modernizar y validar hex

```python
import re

class DoctorCreate(BaseModel):
    nombre: str
    color_agenda: Optional[str] = "#FFFFFF"

    @field_validator("color_agenda")
    @classmethod
    def validar_hex(cls, v):
        if v is not None and not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Formato hex inválido. Usar #RRGGBB")
        return v


class DoctorUpdate(BaseModel):
    nombre: Optional[str] = None
    color_agenda: Optional[str] = None

    @field_validator("color_agenda")
    @classmethod
    def validar_hex(cls, v):
        if v is not None and not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError("Formato hex inválido. Usar #RRGGBB")
        return v


class DoctorResponse(BaseModel):
    id: int
    nombre: str
    color_agenda: Optional[str] = None
    activo: bool = True

    model_config = ConfigDict(from_attributes=True)
```

### Pago schemas — añadir constancia_turno

```python
class PagoResponse(PagoCreate):
    id: int
    fecha_pago: datetime
    constancia_turno: Optional[str] = None  # NUEVO

    model_config = ConfigDict(from_attributes=True)


class PagoContextoResponse(BaseModel):
    id: int
    fecha_pago: datetime
    monto: float
    moneda: str
    metodo_pago: str
    id_turno: Optional[int]
    dni_paciente: Optional[str]
    paciente: Optional[PacienteMinResponse]
    doctor: Optional[DoctorMinResponse]
    constancia_turno: Optional[str] = None  # NUEVO
```

## 5. Constancia de Turno — lógica de población

En los routers `finanzas.py` y `turnos.py` donde se construyen respuestas con `PagoResponse` o `PagoContextoResponse`:

```python
from backend.core.horarios import dt_local

def _build_constancia(pago) -> Optional[str]:
    """Construye constancia_turno desde un pago con turno asociado."""
    if pago.id_turno and hasattr(pago, 'turno') and pago.turno and pago.turno.paciente:
        t = pago.turno
        p = t.paciente
        fecha_local = dt_local(t.fecha_hora)
        return f"{fecha_local.strftime('%d/%m')} - {p.apellido} ({fecha_local.strftime('%H:%M')})"
    return None
```

Se aplica en:
- `PagoResponse`: al crear pago (POST /finanzas/pagos) y al cerrar turno.
- `PagoContextoResponse`: en `listar_pagos_filtrados` del CRUD finanzas.

**Formato**: `"03/07 - Pérez (16:00)"`
- Sin turno asociado (`id_turno is None`) → `null` explícito.

## 6. Validación de Turno — reemplazar lógica hardcodeada

En `backend/routers/turnos.py`, el método `post_turno` reemplaza su validación inline por:

```python
@router.post("/", response_model=TurnoResponse, status_code=201)
def post_turno(turno: TurnoCreate, db: Session = Depends(get_db)):
    from backend.core.horarios import es_hora_valida, validar_granularidad

    # Validar horario centralizado
    if not es_hora_valida(turno.fecha_hora, turno.duracion_minutos):
        raise HTTPException(
            status_code=400,
            detail="El horario está fuera del horario de atención o la granularidad es inválida"
        )

    # Verificar que no haya conflicto con otro turno
    local = dt_local(turno.fecha_hora)
    fin = local.hour * 60 + local.minute + turno.duracion_minutos

    conflictos = db.query(models.Turno).filter(
        models.Turno.id_doctor == turno.id_doctor,
        func.date(models.Turno.fecha_hora) == local.date(),
    ).all()

    for t in conflictos:
        t_local = dt_local(t.fecha_hora)
        t_inicio = t_local.hour * 60 + t_local.minute
        t_fin = t_inicio + (t.duracion_minutos or 30)
        # Solapamiento: inicio_nuevo < fin_existente AND fin_nuevo > inicio_existente
        if (local.hour * 60 + local.minute) < t_fin and fin > t_inicio:
            raise HTTPException(
                status_code=400,
                detail="El doctor ya tiene un turno que se solapa en ese horario"
            )

    return _turno_to_response(crear_turno(db=db, turno=turno))
```

**Cambios clave**:
- La antigua validación `hora < 9 or hora >= 19` y los `if dia_semana == 3/6` se eliminan.
- La validación por `==` exacto se reemplaza por solapamiento real (considerando duración).
- Se importa `func` de SQLAlchemy para truncar datetime a date.

## 7. Doctores — restricción de roles

El router-level dependency se mantiene en `["admin", "secretaria"]` para GET:

```python
router = APIRouter(
    prefix="/doctores",
    tags=["Doctores"],
    dependencies=[Depends(require_role(["admin", "secretaria"]))],
)
```

Los endpoints de escritura sobrescriben con `Depends(require_role(["admin"]))`:

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/doctores/` | admin + secretaria |
| GET | `/doctores/{id}` | admin + secretaria |
| POST | `/doctores/` | admin exclusivo |
| PUT | `/doctores/{id}` | admin exclusivo |
| DELETE | `/doctores/{id}` | admin exclusivo |

```python
@router.post("/", response_model=DoctorResponse, status_code=201)
def post_doctor(
    doctor: DoctorCreate,
    db: Session = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    return crear_doctor(db=db, doctor=doctor)
```

## 8. Orden de construcción

1. `backend/core/horarios.py` — módulo base (sin dependencias del proyecto)
2. `backend/models.py` — agregar `SlotsBloqueado`
3. `backend/schemas/doctores.py` — modernizar ConfigDict + validator hex
4. `backend/schemas/finanzas.py` — agregar `constancia_turno`
5. `backend/schemas/turnos.py` — `duracion_minutos` en TurnoCreate + schemas slots
6. `backend/crud/turnos.py` — lógica de generación/consulta de slots
7. `backend/routers/turnos.py` — reemplazar validación, agregar endpoints slots
8. `backend/routers/doctores.py` — restricción de roles
9. `backend/routers/finanzas.py` — poblar `constancia_turno` en responses
10. `backend/main.py` — registrar nuevo router de configuración
11. Tests de integración

## 9. Tests

Archivo: `backend/tests/test_horarios.py`

Usar base de datos real (SQLite en memoria), sin mocks.

### Tests de horarios

| Test | Descripción |
|------|-------------|
| `test_dias_laborales` | lun/mar/mié/vie/sáb son laborales; jue/dom no |
| `test_slots_lunes` | lunes genera 8 slots mañana + 8 slots tarde = 16 total |
| `test_slots_sabado` | sábado genera 8 slots mañana (09:00-12:30), 0 slots tarde |
| `test_slots_jueves` | jueves genera 0 slots |
| `test_slots_domingo` | domingo genera 0 slots |
| `test_slot_1230_valido` | 12:30 + 30 min ≤ 13:00 → válido |
| `test_slot_1300_invalido` | 13:00 + 30 min > 13:00 → inválido |
| `test_slot_1930_valido` | 19:30 + 30 min = 20:00 → válido |
| `test_slot_2000_invalido` | 20:00 + 30 min > 20:00 → inválido |
| `test_granularidad_0915` | 09:15 → inválido |
| `test_granularidad_0930` | 09:30 → válido |
| `test_granularidad_1000` | 10:00 → válido |
| `test_sabado_1230_valido` | sáb 12:30 + 30 min = 13:00 → válido |
| `test_sabado_1300_invalido` | sáb 13:00 + 30 min > 13:00 → inválido |

### Tests de slots bloqueados

| Test | Descripción |
|------|-------------|
| `test_bloquear_slot` | POST /turnos/slots/bloquear → responde 201 |
| `test_bloquear_duplicado` | Bloquear mismo slot dos veces → 409 |
| `test_desbloquear_slot` | DELETE /turnos/slots/{id}/desbloquear → 200 |
| `test_desbloquear_inexistente` | DELETE sobre ID que no existe → 404 |
| `test_slots_endpoint_muestra_bloqueado` | GET /turnos/slots incluye estado bloqueado |
| `test_slots_endpoint_muestra_ocupado` | GET /turnos/slots incluye estado ocupado |
| `test_post_turno_slot_bloqueado` | Crear turno en slot bloqueado → 409 |

### Tests de constancia

| Test | Descripción |
|------|-------------|
| `test_constancia_turno_asociado` | Pago con turno → formato "03/07 - Pérez (16:00)" |
| `test_constancia_sin_turno` | Pago sin id_turno → constancia_turno is None |

### Tests de doctores

| Test | Descripción |
|------|-------------|
| `test_secretaria_no_puede_crear_doctor` | POST /doctores con token secretaria → 403 |
| `test_admin_puede_crear_doctor` | POST /doctores con token admin → 201 |
| `test_color_hex_invalido` | POST con color="rojo" → 422 |
| `test_color_hex_valido` | POST con color="#FF0000" → 201 |