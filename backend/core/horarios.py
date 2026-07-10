from zoneinfo import ZoneInfo
from datetime import datetime, date, time
from typing import Optional

AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

# ── Franjas por día de semana ──
# weekday() -> [(inicio_mañana, fin_mañana), (inicio_tarde, fin_tarde)]
# Lista vacía = cerrado
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


def es_hora_valida(fecha_hora: datetime, duracion_minutos: int = 30) -> bool:
    """
    Valida que el slot (fecha_hora + duración) entre completo dentro de
    alguna franja del día. Cierre exclusivo.
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
    """Genera slots válidos para una fecha con la duración dada."""
    dia = fecha.weekday()
    slots: list[time] = []
    for apertura, cierre in HORARIOS.get(dia, []):
        actual = apertura.hour * 60 + apertura.minute
        cierre_min = cierre.hour * 60 + cierre.minute
        while actual + duracion_minutos <= cierre_min:
            h, m = divmod(actual, 60)
            slots.append(time(int(h), int(m)))
            actual += 30
    return slots


def validar_granularidad(hora: int, minuto: int) -> bool:
    """Solo minutos :00 y :30 permitidos."""
    return minuto in (0, 30)


def obtener_horarios_publicos() -> dict:
    """Devuelve reglas de horario como dict para endpoint público."""
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
    return {"zona_horaria": "America/Argentina/Buenos_Aires", "dias": dias, "granularidad_minutos": 30}