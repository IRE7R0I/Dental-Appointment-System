from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies import require_role, get_current_user
from backend.models import Usuario
from backend.crud.auth import crear_usuario, listar_usuarios, toggle_usuario_activo, get_user_by_id, update_user
from backend.schemas.auth import UserCreate, UserUpdate, UserResponse

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
    usuario = toggle_usuario_activo(db, user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


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
