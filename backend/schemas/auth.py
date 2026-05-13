from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserCreate(BaseModel):
    username: str
    password: str
    rol: str = "secretaria"  # admin no se puede crear por API


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None  # requerido si se quiere cambiar la contraseña


class UserResponse(BaseModel):
    id: int
    username: str
    rol: str
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = True
