from datetime import date, time, datetime
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from backend import models
from backend.schemas.turnos import TurnoCreate, SlotBloquearInput
from backend.core.horarios import generar_slots, generar_slots_doctor, dt_local


def crear_turno(db: Session, turno: TurnoCreate):
    db_turno = models.Turno(
        fecha_hora=turno.fecha_hora,
        motivo=turno.motivo,
        dni_paciente=turno.dni_paciente,
        id_doctor=turno.id_doctor,
        duracion_minutos=turno.duracion_minutos,
        estado="Pendiente",
    )
    db.add(db_turno)
    db.commit()

    # Recargar con relaciones incluidas para devolver en la respuesta
    db_turno = db.query(models.Turno).options(
        joinedload(models.Turno.paciente),
        joinedload(models.Turno.doctor),
    ).filter(models.Turno.id == db_turno.id).first()

    return db_turno


def cancelar_turno(db: Session, turno_id: int, motivo_cancelacion: str, usuario_id: int):
    db_turno = db.query(models.Turno).options(
        joinedload(models.Turno.paciente),
        joinedload(models.Turno.doctor),
    ).filter(models.Turno.id == turno_id).first()
    if not db_turno:
        return None
    if db_turno.estado == "Realizado":
        raise ValueError("No se puede cancelar un turno ya facturado")
    if db_turno.estado == "Cancelado":
        raise ValueError("El turno ya está cancelado")
    db_turno.estado = "Cancelado"
    db_turno.motivo_cancelacion = motivo_cancelacion
    db_turno.actualizado_en = datetime.now()
    db_turno.actualizado_por_id = usuario_id
    db.commit()
    db.refresh(db_turno)
    return db_turno


def eliminar_turno(db: Session, turno_id: int):
    db_turno = db.query(models.Turno).filter(models.Turno.id == turno_id).first()
    if db_turno:
        db.delete(db_turno)
        db.commit()
        return True
    return False


def obtener_turnos_por_paciente(db: Session, dni: str):
    return db.query(models.Turno).filter(models.Turno.dni_paciente == dni).all()


def obtener_todos_turnos(
    db: Session,
    fecha: Optional[date] = None,
    id_doctor: Optional[int] = None,
    paciente_dni: Optional[str] = None,
):
    query = db.query(models.Turno).options(
        joinedload(models.Turno.paciente),
        joinedload(models.Turno.doctor),
    )
    if fecha:
        query = query.filter(models.Turno.fecha_hora >= datetime.combine(fecha, datetime.min.time()))
        query = query.filter(models.Turno.fecha_hora <= datetime.combine(fecha, datetime.max.time()))
    if id_doctor:
        query = query.filter(models.Turno.id_doctor == id_doctor)
    if paciente_dni:
        query = query.filter(models.Turno.dni_paciente == paciente_dni)
    return query.order_by(models.Turno.fecha_hora).all()


def obtener_turnos_hoy(db: Session):
    hoy = date.today()
    return obtener_todos_turnos(db, fecha=hoy)


# ─── C-012: Slots y bloqueos ──────────────────────────────────


def obtener_slots_con_estado(
    db: Session, fecha: date, id_doctor: int
) -> list[dict]:
    """
    Genera slots para una fecha+doctor, cruza con turnos existentes y
    bloqueos manuales, devuelve estado de cada slot.
    """
    from datetime import timedelta
    from backend.core.horarios import HORIZONTE_DIAS_DEFAULT
    doctor = db.query(models.Doctor).filter(models.Doctor.id == id_doctor).first()
    horizonte = doctor.horizonte_dias if (doctor and doctor.horizonte_dias) else HORIZONTE_DIAS_DEFAULT
    hoy_local = dt_local(datetime.now()).date()
    if fecha > hoy_local + timedelta(days=horizonte):
        return []

    slots = generar_slots_doctor(db, id_doctor, fecha)
    if not slots:
        return []

    turnos = db.query(models.Turno).filter(
        models.Turno.id_doctor == id_doctor,
        models.Turno.fecha_hora >= datetime.combine(fecha, time(0, 0)),
        models.Turno.fecha_hora < datetime.combine(fecha, time(23, 59)),
        models.Turno.estado.in_(["Pendiente", "Realizado"]),
    ).all()

    bloqueados = db.query(models.SlotsBloqueado).filter(
        models.SlotsBloqueado.fecha == fecha,
        models.SlotsBloqueado.id_doctor == id_doctor,
    ).all()

    slots_ocupados: dict[str, models.Turno] = {}
    for t in turnos:
        t_local = dt_local(t.fecha_hora)
        t_start = t_local.hour * 60 + t_local.minute
        t_dur = int(t.duracion_minutos or 30)
        for offset in range(0, t_dur, 30):
            slot_min = t_start + offset
            h, m = divmod(slot_min, 60)
            key = f"{h:02d}:{m:02d}"
            slots_ocupados[key] = t

    slots_bloqueados: dict[str, models.SlotsBloqueado] = {}
    for b in bloqueados:
        key = f"{b.hora.hour:02d}:{b.hora.minute:02d}"
        slots_bloqueados[key] = b

    resultado = []
    for s in slots:
        key = f"{s.hour:02d}:{s.minute:02d}"
        if key in slots_ocupados:
            t = slots_ocupados[key]
            nombre_pac = f"{t.paciente.apellido}" if t.paciente else None
            resultado.append({
                "hora": key,
                "estado": "ocupado",
                "turno_id": t.id,
                "paciente": nombre_pac,
                "motivo": None,
            })
        elif key in slots_bloqueados:
            b = slots_bloqueados[key]
            resultado.append({
                "hora": key,
                "estado": "bloqueado",
                "turno_id": None,
                "paciente": None,
                "motivo": b.motivo,
                "slot_bloqueado_id": b.id,
            })
        else:
            resultado.append({
                "hora": key,
                "estado": "libre",
                "turno_id": None,
                "paciente": None,
                "motivo": None,
            })

    return resultado


def bloquear_slot(db: Session, data: SlotBloquearInput, usuario_id: int) -> models.SlotsBloqueado:
    db_slot = models.SlotsBloqueado(
        fecha=data.fecha,
        hora=data.hora,
        id_doctor=data.id_doctor,
        motivo=data.motivo,
        bloqueado_por_id=usuario_id,
    )
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot


def desbloquear_slot(db: Session, slot_id: int) -> Optional[models.SlotsBloqueado]:
    slot = db.query(models.SlotsBloqueado).filter(models.SlotsBloqueado.id == slot_id).first()
    if not slot:
        return None
    db.delete(slot)
    db.commit()
    return slot


def slot_esta_bloqueado(db: Session, fecha: date, hora: time, id_doctor: int) -> bool:
    return db.query(models.SlotsBloqueado).filter(
        models.SlotsBloqueado.fecha == fecha,
        models.SlotsBloqueado.hora == hora,
        models.SlotsBloqueado.id_doctor == id_doctor,
    ).first() is not None


# ─── C-017: Slots bulk mensual ──────────────────────────────────

def obtener_slots_bulk(
    db: Session,
    fecha_desde: date,
    fecha_hasta: date,
    doctores_ids: list[int],
) -> dict:
    """
    Calcula conteos agregados de slots (libres/ocupados/bloqueados) por día
    para un rango de fechas y un conjunto de doctores.

    4 bulk queries → Python aggregation:
      1. horarios_doctor (patrón semanal)
      2. dias_no_laborables_doctor (excepciones en rango)
      3. turnos (Pendiente/Realizado en rango)
      4. slots_bloqueados (en rango)

    Turnos con duración > 30 min ocupan múltiples slots.
    """
    from collections import defaultdict
    from datetime import timedelta
    from backend.core.horarios import HORIZONTE_DIAS_DEFAULT

    # ── Query 1: Patrón semanal por doctor ──
    patrones: dict[int, dict[int, list[tuple[time, time]]]] = {}
    horarios_rows = db.query(models.HorarioDoctor).filter(
        models.HorarioDoctor.id_doctor.in_(doctores_ids),
    ).all()
    for r in horarios_rows:
        if r.id_doctor not in patrones:
            patrones[r.id_doctor] = {}
        franjas = []
        if r.manana_inicio and r.manana_fin:
            franjas.append((r.manana_inicio, r.manana_fin))
        if r.tarde_inicio and r.tarde_fin:
            franjas.append((r.tarde_inicio, r.tarde_fin))
        patrones[r.id_doctor][r.dia_semana] = franjas

    # Fallback: doctores sin filas usan HORARIOS_DEFAULT
    from backend.core.horarios import HORARIOS_DEFAULT
    for doc_id in doctores_ids:
        if doc_id not in patrones:
            patrones[doc_id] = dict(HORARIOS_DEFAULT)

    # ── Query 2: Días no laborables en rango ──
    no_laborables: set[tuple[int, date]] = set()
    no_laborables_rows = db.query(models.DiaNoLaborableDoctor).filter(
        models.DiaNoLaborableDoctor.id_doctor.in_(doctores_ids),
        models.DiaNoLaborableDoctor.fecha >= fecha_desde,
        models.DiaNoLaborableDoctor.fecha <= fecha_hasta,
    ).all()
    for r in no_laborables_rows:
        no_laborables.add((r.id_doctor, r.fecha))

    # ── Query 3: Turnos en rango ──
    desde_dt = datetime.combine(fecha_desde, time(0, 0))
    hasta_dt = datetime.combine(fecha_hasta, time(23, 59, 59))
    turnos_rows = db.query(models.Turno).filter(
        models.Turno.id_doctor.in_(doctores_ids),
        models.Turno.fecha_hora >= desde_dt,
        models.Turno.fecha_hora <= hasta_dt,
        models.Turno.estado.in_(["Pendiente", "Realizado"]),
    ).all()

    # ── Query 4: Bloqueos en rango ──
    bloqueos_rows = db.query(models.SlotsBloqueado).filter(
        models.SlotsBloqueado.id_doctor.in_(doctores_ids),
        models.SlotsBloqueado.fecha >= fecha_desde,
        models.SlotsBloqueado.fecha <= fecha_hasta,
    ).all()

    # ── Indexar ocupados: (fecha, doctor_id) → set["HH:MM"] ──
    ocupados: dict[tuple[date, int], set[str]] = defaultdict(set)
    for t in turnos_rows:
        t_local = dt_local(t.fecha_hora)
        t_date = t_local.date()
        t_start = t_local.hour * 60 + t_local.minute
        t_dur = int(t.duracion_minutos or 30)
        for offset in range(0, t_dur, 30):
            slot_min = t_start + offset
            h, m = divmod(slot_min, 60)
            ocupados[(t_date, t.id_doctor)].add(f"{h:02d}:{m:02d}")

    # ── Indexar bloqueados: (fecha, doctor_id) → set["HH:MM"] ──
    bloqueados: dict[tuple[date, int], set[str]] = defaultdict(set)
    for b in bloqueos_rows:
        key = f"{b.hora.hour:02d}:{b.hora.minute:02d}"
        bloqueados[(b.fecha, b.id_doctor)].add(key)

    # ── Cargar horizontes por doctor ──
    doctores_db = db.query(models.Doctor).filter(models.Doctor.id.in_(doctores_ids)).all()
    horizontes: dict[int, int] = {d.id: (d.horizonte_dias or HORIZONTE_DIAS_DEFAULT) for d in doctores_db}
    hoy_local = dt_local(datetime.now()).date()

    # ── Iterar días del rango y calcular conteos ──
    resultado: dict[str, dict] = {}
    current = fecha_desde
    while current <= fecha_hasta:
        dow = current.weekday()
        dia_str = current.isoformat()
        dia_summary: dict = {
            "total": 0, "libres": 0, "ocupados": 0, "bloqueados": 0,
            "por_doctor": {},
        }

        for doc_id in doctores_ids:
            doc_horizonte = horizontes.get(doc_id, HORIZONTE_DIAS_DEFAULT)
            doc_limite = hoy_local + timedelta(days=doc_horizonte)
            is_fuera_horizonte = current > doc_limite

            doc_patron = patrones.get(doc_id, {}).get(dow, [])
            is_no_lab = (doc_id, current) in no_laborables

            if not doc_patron or is_no_lab or is_fuera_horizonte:
                dia_summary["por_doctor"][str(doc_id)] = {
                    "total": 0, "libres": 0, "ocupados": 0, "bloqueados": 0,
                }
                continue

            # Generar todos los slots 30-min del patrón del doctor para este día
            slot_set: set[str] = set()
            for inicio, cierre in doc_patron:
                actual = inicio.hour * 60 + inicio.minute
                cierre_min = cierre.hour * 60 + cierre.minute
                while actual + 30 <= cierre_min:
                    h, m = divmod(actual, 60)
                    slot_set.add(f"{h:02d}:{m:02d}")
                    actual += 30

            total_slots = len(slot_set)
            occ = ocupados.get((current, doc_id), set())
            blk = bloqueados.get((current, doc_id), set())

            ocupados_count = len(slot_set & occ)
            bloqueados_count = len(slot_set & blk)
            libres_count = total_slots - ocupados_count - bloqueados_count

            doc_summary = {
                "total": total_slots,
                "libres": libres_count,
                "ocupados": ocupados_count,
                "bloqueados": bloqueados_count,
            }
            dia_summary["por_doctor"][str(doc_id)] = doc_summary

            dia_summary["total"] += total_slots
            dia_summary["libres"] += libres_count
            dia_summary["ocupados"] += ocupados_count
            dia_summary["bloqueados"] += bloqueados_count

        resultado[dia_str] = dia_summary
        current += timedelta(days=1)

    return resultado


def slot_tiene_turno(db: Session, fecha: date, hora: time, id_doctor: int) -> bool:
    from datetime import datetime as dt_mod
    fecha_hora_inicio = dt_mod.combine(fecha, hora)
    return db.query(models.Turno).filter(
        models.Turno.id_doctor == id_doctor,
        models.Turno.fecha_hora == fecha_hora_inicio,
        models.Turno.estado.in_(["Pendiente", "Realizado"]),
    ).first() is not None