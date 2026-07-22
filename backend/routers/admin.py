from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role, get_current_user
from backend.models import Usuario
from backend.crud.auth import crear_usuario, listar_usuarios, toggle_usuario_activo, get_user_by_id, update_user, set_activo_usuario
from backend.schemas.auth import UserCreate, UserUpdate, UserResponse
from backend.schemas.catalogo import ActivoUpdate

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_role(["admin"]))],
)


@router.post("/usuarios", response_model=UserResponse, status_code=201)
def post_usuario(data: UserCreate, db: Session = Depends(get_db)):
    if data.rol not in ("secretaria",):
        raise HTTPException(status_code=400, detail="Solo se puede crear rol secretaria")
    return crear_usuario(db, data)


@router.get("/usuarios", response_model=list[UserResponse])
def get_usuarios(db: Session = Depends(get_db)):
    return listar_usuarios(db)


@router.put("/usuarios/{user_id}/toggle-activo", response_model=UserResponse)
def toggle_activo(user_id: int, db: Session = Depends(get_db)):
    """Alternar estado activo. Solo admin. Admin no puede desactivarse.
    NOTA: endpoint transicional (DT-01). Reemplazar por PATCH .../activo cuando frontend/ se archive."""
    usuario = get_user_by_id(db, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.activo and usuario.rol == "admin":
        raise HTTPException(status_code=400, detail="No se puede desactivar un usuario admin")
    result = toggle_usuario_activo(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return result


@router.delete("/usuarios/{user_id}")
def delete_usuario_endpoint(user_id: int, db: Session = Depends(get_db)):
    usuario = get_user_by_id(db, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.rol == "admin":
        raise HTTPException(status_code=400, detail="No se puede eliminar un admin")
    db.delete(usuario)
    db.commit()
    return {"mensaje": f"Usuario {usuario.username} eliminado"}


@router.put("/usuarios/{user_id}", response_model=UserResponse)
def put_usuario(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_self = current_user.id == user_id
    usuario = update_user(db, user_id, data, check_current=es_self)
    if not usuario:
        if data.password and not data.current_password:
            raise HTTPException(status_code=400, detail="Debe ingresar la contraseña actual")
        if data.password:
            old = get_user_by_id(db, user_id)
            if old:
                raise HTTPException(status_code=403, detail="Contraseña actual incorrecta")
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.patch("/usuarios/{user_id}/activo", response_model=UserResponse)
def patch_usuario_activo(user_id: int, data: ActivoUpdate, db: Session = Depends(get_db)):
    """Activar o desactivar usuario. Solo admin. Admin nunca puede desactivarse."""
    try:
        usuario = set_activo_usuario(db, user_id, data.activo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario
