from fastapi import APIRouter
from backend.core.horarios import obtener_horarios_publicos

router = APIRouter(
    prefix="/config",
    tags=["Configuración"],
)


@router.get("/horarios")
def get_horarios():
    """Devuelve las reglas de horario de la clínica (público)."""
    return obtener_horarios_publicos()
