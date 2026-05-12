# CHANGE-009: Diseño Técnico — Auth JWT (admin + secretaria)

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │LoginPage │  │ AuthContext  │  │   PrivateRoute     │  │
│  │          │  │ (Provider)   │  │ (rol="secretaria") │  │
│  └────┬─────┘  └──────┬──────┘  └────────┬──────────┘  │
│       └───────┬───────┴──────────────────┘              │
│               │ api.ts (Bearer + 401 refresh)           │
└───────────────┼─────────────────────────────────────────┘
                │ HTTPS
┌───────────────┼─────────────────────────────────────────┐
│               ▼            BACKEND (FastAPI)             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  slowapi (rate limiter) + security headers       │   │
│  └──────────────────┬───────────────────────────────┘   │
│  ┌──────────────────┼───────────────────────────────┐   │
│  │              dependencies.py                      │   │
│  │  get_current_user(token) → Usuario               │   │
│  │  require_role(["admin","secretaria"]) → 403      │   │
│  └──────────────────┬───────────────────────────────┘   │
│  ┌──────────────────┼───────────────────────────────┐   │
│  │  routers/        │                                │   │
│  │  auth.py    ◄────┤  login, refresh, logout, me   │   │
│  │  admin.py   ◄────┤  CRUD usuarios (solo admin)   │   │
│  │  pacientes  ◄────┤  Depends(get_current_user)    │   │
│  │  turnos     ◄────┤  + require_role              │   │
│  │  finanzas   ◄────┤                                │   │
│  │  doctores   ◄────┤                                │   │
│  └──────────────────┴───────────────────────────────┘   │
│  ┌──────────────────┐  ┌────────────────────────────┐   │
│  │  core/security   │  │  core/config               │   │
│  │  JWT + bcrypt    │  │  Settings desde .env       │   │
│  └──────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 2. Modelo de datos

### Tabla `usuarios`

```sql
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol             VARCHAR(20) NOT NULL DEFAULT 'secretaria',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP DEFAULT NOW()
);
```

### Modelo SQLAlchemy

```python
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(20), nullable=False, default="secretaria")
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime, default=datetime.now)
```

**Roles válidos**: `admin`, `secretaria`

**Usuario admin inicial**: creado via seed con credenciales desde `.env`.
Variables: `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

## 3. Endpoints

### 3.1 Auth (`/auth`) — público

| Método | Ruta | Body | Response |
|--------|------|------|----------|
| POST | `/auth/login` | `{username, password}` | `{access_token, refresh_token, token_type, user}` |
| POST | `/auth/refresh` | `{refresh_token}` | `{access_token, refresh_token}` |
| POST | `/auth/logout` | `{refresh_token}` | `{message}` |
| GET | `/auth/me` | — (Bearer) | `{id, username, rol}` |

### 3.2 Admin (`/admin`) — solo rol `admin`

| Método | Ruta | Body | Response |
|--------|------|------|----------|
| POST | `/admin/usuarios` | `{username, password, rol}` | `UserResponse` |
| GET | `/admin/usuarios` | — | `list[UserResponse]` |
| PUT | `/admin/usuarios/{id}/toggle-activo` | — | `UserResponse` |

## 4. Seguridad

### 4.1 JWT

```python
# Payload
{"sub": "admin", "rol": "admin", "exp": 1715200000}

# Configuración
SECRET_KEY=64+ chars aleatorios
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 4.2 Rate Limiting (slowapi)

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# En endpoints públicos:
@router.post("/auth/login")
@limiter.limit("5/minute")  # anti brute-force
def login(...): ...

# Preparado para CHANGE-007:
# @limiter.limit("5/minute") en POST /portal/reservar
# @limiter.limit("10/minute") en GET /pacientes/verificar/{dni}
```

### 4.3 Security Headers

```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'"
        return response
```

### 4.4 Dependencies

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    """Valida JWT, busca usuario, verifica activo. Lanza 401 si falla."""
    try:
        payload = verify_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(401, "Token inválido")
    except JWTError:
        raise HTTPException(401, "Token inválido o expirado")

    user = get_user_by_username(db, username)
    if not user or not user.activo:
        raise HTTPException(401, "Usuario no encontrado o inactivo")
    return user

def require_role(roles: list[str]):
    """Factory: solo permite acceso si user.rol está en roles."""
    def role_checker(current_user = Depends(get_current_user)):
        if current_user.rol not in roles:
            raise HTTPException(403, "No tiene permisos para esta acción")
        return current_user
    return role_checker
```

## 5. Variables de entorno

```bash
# backend/.env (CHANGE-009 agrega:)
SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxxxxxxxxxxx
```

## 6. Schemas Pydantic

```python
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
    rol: str  # "secretaria" (admin no se puede crear por API)

class UserResponse(BaseModel):
    id: int
    username: str
    rol: str
    activo: bool
    creado_en: datetime
    class Config: from_attributes = True
```

## 7. Frontend

### AuthContext — solo usuarios internos

```typescript
interface AuthState {
  user: { id: number; username: string; rol: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

### PrivateRoute — sin rol paciente

```tsx
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}
```

### LoginPage — solo admin y secretaria

Formulario usuario + contraseña. Redirige a `/` (dashboard) al loguear.

### App.tsx

```tsx
<AuthProvider>
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<PrivateRoute>
        {/* NavigationRail + rutas internas */}
      </PrivateRoute>} />
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

Rutas públicas (`/portal`, `/consulta/:uuid`) se agregan en CHANGE-007.

## 8. Script seed

```python
# backend/seed.py
from backend.core.security import hash_password
from backend.database import SessionLocal
from backend.models import Usuario
from backend.core.config import settings

def seed_admin():
    db = SessionLocal()
    admin = db.query(Usuario).filter(
        Usuario.username == settings.ADMIN_USERNAME
    ).first()
    if not admin:
        admin = Usuario(
            username=settings.ADMIN_USERNAME,
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            rol="admin",
            activo=True,
        )
        db.add(admin)
        db.commit()
    db.close()
```

## 8.5. CRUD de Doctores completo (admin)

Aprovechando CHANGE-009, se completa el CRUD de doctores con endpoints
protegidos solo para admin:

| Método | Ruta | Auth |
|--------|------|------|
| PUT | `/doctores/{id}` | admin |
| DELETE | `/doctores/{id}` | admin (soft-delete: activo=false) |

### Modelo Doctor ampliado

```python
class Doctor(Base):
    __tablename__ = "doctores"
    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    color_agenda = Column(String(7))
    activo = Column(Boolean, default=True)  # NEW: soft-delete
```

- `GET /doctores` filtra solo `activo=True`.
- `DELETE` cambia `activo=False` (no borra físicamente: turnos históricos
  referencian al doctor).

## 8.6. Auditoría en Turno (multi-secretaria)

```python
class Turno(Base):
    # ... campos existentes ...
    creado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    actualizado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    creado_por = relationship("Usuario", foreign_keys=[creado_por_id])
```

Cada acción sobre Turno (crear, confirmar, rechazar, cerrar, cancelar) registra
`creado_por_id` o actualiza `actualizado_por_id` con el usuario autenticado.
Esto permite auditoría cuando hay múltiples secretarias operando en simultáneo.

## 9. Orden de construcción

1. `core/config.py` + `core/security.py`
2. Modelo `Usuario` en `models.py`
3. Schemas `auth.py`
4. CRUD `auth.py`
5. Router `auth.py`
6. `dependencies.py` (get_current_user, require_role)
7. Proteger routers existentes + completar CRUD doctores (PUT/DELETE solo admin)
8. Router `admin.py`
9. `main.py` — registrar routers + slowapi + security headers
10. `seed.py` — admin inicial
11. Frontend: `LoginPage` + `AuthContext`
12. Frontend: `PrivateRoute`
13. Frontend: `api.ts` interceptores JWT
14. Frontend: `App.tsx` AuthProvider + PrivateRoute
