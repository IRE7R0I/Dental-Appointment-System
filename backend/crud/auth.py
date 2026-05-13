from typing import Optional

from sqlalchemy.orm import Session

from backend.core.security import hash_password, verify_password
from backend.models import Usuario
from backend.schemas.auth import UserCreate


def get_user_by_username(db: Session, username: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id == user_id).first()


def autenticar_usuario(db: Session, username: str, password: str) -> Optional[Usuario]:
    usuario = get_user_by_username(db, username)
    if not usuario:
        return None
    if not usuario.activo:
        return None
    if not verify_password(password, usuario.hashed_password):
        return None
    return usuario


def crear_usuario(db: Session, user: UserCreate) -> Usuario:
    nuevo = Usuario(
        username=user.username,
        hashed_password=hash_password(user.password),
        rol=user.rol,
        activo=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def listar_usuarios(db: Session) -> list[Usuario]:
    return db.query(Usuario).all()


def toggle_usuario_activo(db: Session, user_id: int) -> Optional[Usuario]:
    usuario = get_user_by_id(db, user_id)
    if not usuario:
        return None
    usuario.activo = not usuario.activo
    db.commit()
    db.refresh(usuario)
    return usuario


def update_user(db: Session, user_id: int, data: 'UserUpdate', check_current: bool = False) -> Optional[Usuario]:
    from backend.schemas.auth import UserUpdate as _U  # avoid circular
    usuario = get_user_by_id(db, user_id)
    if not usuario:
        return None
    if data.username:
        usuario.username = data.username
    if data.password:
        if check_current:  # solo self-edit: admin cambiando su propia pass
            if not data.current_password:
                return None
            if not verify_password(data.current_password, usuario.hashed_password):
                return None
        usuario.hashed_password = hash_password(data.password)
    db.commit()
    db.refresh(usuario)
    return usuario
