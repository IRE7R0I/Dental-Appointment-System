from datetime import date, time
from typing import Optional
from sqlalchemy.orm import Session
from backend import models
from backend.core.horarios import HORARIOS_DEFAULT

NOMBRES_DIAS_INV = {v: k for k, v in {
    0: "lunes", 1: "martes", 2: "miercoles", 3: "jueves",
    4: "viernes", 5: "sabado", 6: "domingo",
}.items()}


def _parse_hora(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def obtener_horario_semanal(db: Session, id_doctor: int) -> list[models.HorarioDoctor]:
    return (
        db.query(models.HorarioDoctor)
        .filter(models.HorarioDoctor.id_doctor == id_doctor)
        .order_by(models.HorarioDoctor.dia_semana)
        .all()
    )


def guardar_horario_semanal(db: Session, id_doctor: int, dias_data: dict) -> list[models.HorarioDoctor]:
    """Reemplaza el patrón semanal completo del doctor. Transaccional."""
    try:
        db.query(models.HorarioDoctor).filter(
            models.HorarioDoctor.id_doctor == id_doctor
        ).delete()
        for day_name, entry in dias_data.items():
            day_num = NOMBRES_DIAS_INV.get(day_name)
            if day_num is None or entry is None:
                continue
            # Normalize: accept both Pydantic DiaHorarioEntry and raw dict
            if hasattr(entry, 'model_dump'):
                entry = entry.model_dump()
            manana_inicio = _parse_hora(entry["manana"][0]) if entry.get("manana") else None
            manana_fin = _parse_hora(entry["manana"][1]) if entry.get("manana") else None
            tarde_inicio = _parse_hora(entry["tarde"][0]) if entry.get("tarde") else None
            tarde_fin = _parse_hora(entry["tarde"][1]) if entry.get("tarde") else None
            db.add(models.HorarioDoctor(
                id_doctor=id_doctor,
                dia_semana=day_num,
                manana_inicio=manana_inicio,
                manana_fin=manana_fin,
                tarde_inicio=tarde_inicio,
                tarde_fin=tarde_fin,
            ))
        db.commit()
        return obtener_horario_semanal(db, id_doctor)
    except Exception:
        db.rollback()
        raise


def seed_horarios_doctor(db: Session, id_doctor: int):
    """Crea filas HorarioDoctor para el doctor usando HORARIOS_DEFAULT.
    No-op si ya tiene filas."""
    existing = db.query(models.HorarioDoctor).filter(
        models.HorarioDoctor.id_doctor == id_doctor
    ).count()
    if existing > 0:
        return
    for dia_semana, franjas in HORARIOS_DEFAULT.items():
        manana_inicio = franjas[0][0] if len(franjas) >= 1 else None
        manana_fin = franjas[0][1] if len(franjas) >= 1 else None
        tarde_inicio = franjas[1][0] if len(franjas) >= 2 else None
        tarde_fin = franjas[1][1] if len(franjas) >= 2 else None
        db.add(models.HorarioDoctor(
            id_doctor=id_doctor,
            dia_semana=dia_semana,
            manana_inicio=manana_inicio,
            manana_fin=manana_fin,
            tarde_inicio=tarde_inicio,
            tarde_fin=tarde_fin,
        ))
    db.commit()


def es_dia_no_laborable(db: Session, id_doctor: int, fecha: date) -> bool:
    """True si la fecha está marcada como no laborable para el doctor."""
    return db.query(models.DiaNoLaborableDoctor).filter(
        models.DiaNoLaborableDoctor.id_doctor == id_doctor,
        models.DiaNoLaborableDoctor.fecha == fecha,
    ).first() is not None


def agregar_dia_no_laborable(
    db: Session, id_doctor: int, fecha: date, motivo: Optional[str] = None
) -> models.DiaNoLaborableDoctor:
    """Marca una fecha como no laborable. Retorna existente si ya fue marcada."""
    existente = db.query(models.DiaNoLaborableDoctor).filter(
        models.DiaNoLaborableDoctor.id_doctor == id_doctor,
        models.DiaNoLaborableDoctor.fecha == fecha,
    ).first()
    if existente:
        return existente
    entry = models.DiaNoLaborableDoctor(
        id_doctor=id_doctor, fecha=fecha, motivo=motivo,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def listar_dias_no_laborables(
    db: Session, id_doctor: int, desde: date, hasta: date
) -> list[models.DiaNoLaborableDoctor]:
    return db.query(models.DiaNoLaborableDoctor).filter(
        models.DiaNoLaborableDoctor.id_doctor == id_doctor,
        models.DiaNoLaborableDoctor.fecha >= desde,
        models.DiaNoLaborableDoctor.fecha <= hasta,
    ).order_by(models.DiaNoLaborableDoctor.fecha).all()


def eliminar_dia_no_laborable(db: Session, id_doctor: int, fecha: date) -> bool:
    filas = db.query(models.DiaNoLaborableDoctor).filter(
        models.DiaNoLaborableDoctor.id_doctor == id_doctor,
        models.DiaNoLaborableDoctor.fecha == fecha,
    ).delete()
    db.commit()
    return filas > 0
