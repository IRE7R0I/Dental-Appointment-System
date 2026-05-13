from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError

from backend.database import get_db
from backend.core.security import create_access_token, create_refresh_token, verify_token
from backend.crud.auth import autenticar_usuario, get_user_by_username
from backend.schemas.auth import (
    LoginRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserResponse,
)
from backend.dependencies import get_current_user
from backend.models import Usuario

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    usuario = autenticar_usuario(db, data.username, data.password)
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    payload = {"sub": usuario.username, "rol": usuario.rol}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: TokenRefreshRequest):
    try:
        payload = verify_token(data.refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    username = payload.get("sub")
    rol = payload.get("rol")
    if not username or not rol:
        raise HTTPException(status_code=401, detail="Token inválido")

    new_payload = {"sub": username, "rol": rol}
    access_token = create_access_token(new_payload)
    refresh_token = create_refresh_token(new_payload)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/logout")
def logout(current_user: Usuario = Depends(get_current_user)):
    # En esta fase: logout es client-side (borrar tokens del localStorage).
    # Futuro: blacklist de refresh tokens en DB/Redis.
    return {"mensaje": "Sesión cerrada correctamente"}


@router.get("/me", response_model=UserResponse)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user
