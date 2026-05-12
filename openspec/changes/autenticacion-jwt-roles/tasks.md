# CHANGE-009: Tareas de Implementación

> Orden exacto. Marcar `[x]` al completar.

---

## 🔧 Backend — Infraestructura

### 1. Agregar dependencias
- [ ] Agregar `python-jose[cryptography]` a requirements.txt
- [ ] Agregar `slowapi` a requirements.txt
- [ ] Verificar `passlib[bcrypt]`, `pydantic-settings`, `python-dotenv` (ya están)
- [ ] Instalar: `pip install python-jose[cryptography] slowapi`
- **Archivos**: `requirements.txt`

### 2. Crear backend/core/config.py
- [ ] Crear `backend/core/__init__.py`
- [ ] Clase `Settings(BaseSettings)`:
  - `SECRET_KEY: str`, `ALGORITHM: str = "HS256"`
  - `ACCESS_TOKEN_EXPIRE_MINUTES: int = 30`
  - `REFRESH_TOKEN_EXPIRE_DAYS: int = 7`
  - `ADMIN_USERNAME: str = "admin"`, `ADMIN_PASSWORD: str`
- [ ] `model_config = SettingsConfigDict(env_file=".env")`
- [ ] Exportar singleton `settings`
- **Archivos**: `backend/core/config.py`, `backend/core/__init__.py`

### 3. Crear backend/core/security.py
- [ ] `create_access_token(data: dict)` → JWT con exp 30 min
- [ ] `create_refresh_token(data: dict)` → JWT con exp 7 días
- [ ] `verify_token(token: str)` → payload o lanza excepción
- [ ] `hash_password(password: str)` → bcrypt hash
- [ ] `verify_password(plain: str, hashed: str)` → bool
- **Archivos**: `backend/core/security.py`

## 🔧 Backend — Modelo y Lógica

### 4. Agregar modelo Usuario
- [ ] Clase `Usuario(Base)` con: id, username (unique), hashed_password, rol, activo, creado_en
- [ ] Roles válidos: `admin` y `secretaria`
- [ ] **Sin campo paciente_dni** (el paciente no tiene cuenta)
- **Archivos**: `backend/models.py`

### 5. Crear backend/schemas/auth.py
- [ ] `LoginRequest`: username, password
- [ ] `TokenResponse`: access_token, refresh_token, token_type
- [ ] `TokenRefreshRequest`: refresh_token
- [ ] `UserCreate`: username, password, rol
- [ ] `UserResponse`: id, username, rol, activo, creado_en (Config: from_attributes)
- **Archivos**: `backend/schemas/auth.py`

### 6. Crear backend/crud/auth.py
- [ ] `get_user_by_username(db, username)` → Optional[Usuario]
- [ ] `get_user_by_id(db, user_id)` → Optional[Usuario]
- [ ] `autenticar_usuario(db, username, password)` → Optional[Usuario]
  - Busca por username, verify_password, verifica activo
- [ ] `crear_usuario(db, user: UserCreate)` → Usuario
  - Hashea password, valida username único
  - No permite crear rol `admin` por API
- [ ] `listar_usuarios(db)` → list[Usuario]
- **Archivos**: `backend/crud/auth.py`

### 7. Crear backend/routers/auth.py
- [ ] Router `prefix="/auth"`, tags=["Auth"]
- [ ] `POST /auth/login`: autentica, genera tokens, 401 si falla
- [ ] `POST /auth/refresh`: valida refresh, genera nuevos tokens
- [ ] `POST /auth/logout`: requiere Bearer, confirma logout
- [ ] `GET /auth/me`: requiere Bearer, devuelve datos del usuario
- [ ] Agregar `@limiter.limit("5/minute")` en /auth/login (anti brute-force)
- **Archivos**: `backend/routers/auth.py`

### 8. Crear backend/dependencies.py
- [ ] `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")`
- [ ] `get_current_user(token, db)`:
  1. verify_token → extrae sub (username)
  2. Busca usuario, verifica activo
  3. 401 si falla
- [ ] `require_role(roles: list[str])`:
  - Factory que verifica `current_user.rol in roles`
  - 403 si no autorizado
- [ ] Manejar HTTPException con mensajes claros
- **Archivos**: `backend/dependencies.py`

### 9. Proteger todos los routers existentes
- [ ] `dependencies=[Depends(require_role(["admin", "secretaria"]))]` en:
  - pacientes, turnos, finanzas, doctores
- [ ] `/health` y `/auth/*` sin protección
- [ ] Verificar CORS permite header `Authorization`
- **Archivos**: `backend/routers/pacientes.py`, `turnos.py`, `finanzas.py`, `doctores.py`

### 9b. Completar CRUD de doctores (solo admin)
- [ ] Agregar campo `activo` (Boolean, default=True) al modelo Doctor
- [ ] `PUT /doctores/{id}` → actualizar nombre y color_agenda
  - `dependencies=[Depends(require_role(["admin"]))]`
- [ ] `DELETE /doctores/{id}` → soft-delete (activo=false)
  - `dependencies=[Depends(require_role(["admin"]))]`
- [ ] `GET /doctores` → filtrar solo `activo=True`
- [ ] `GET /doctores/{id}` → devolver aunque esté inactivo (para turnos históricos)
- **Archivos**: `backend/models.py`, `backend/crud/doctores.py`, `backend/routers/doctores.py`, `backend/schemas/doctores.py`

### 9c. Agregar campos de auditoría a Turno
- [ ] `creado_por_id`: Integer, FK → usuarios.id, nullable
- [ ] `actualizado_por_id`: Integer, FK → usuarios.id, nullable
- [ ] Relaciones: `creado_por`, `actualizado_por` (foreign_keys)
- [ ] En cada acción sobre Turno (crear, confirmar, rechazar, cerrar, cancelar):
  asignar `creado_por_id` (si es nuevo) o actualizar `actualizado_por_id`
- **Archivos**: `backend/models.py`, `backend/crud/turnos.py`

### 10. Crear backend/routers/admin.py
- [ ] Router `prefix="/admin"`, tags=["Admin"]
- [ ] `POST /admin/usuarios` → crear usuario (solo rol secretaria, no admin)
  - `dependencies=[Depends(require_role(["admin"]))]`
- [ ] `GET /admin/usuarios` → listar todos
- [ ] `PUT /admin/usuarios/{id}/toggle-activo` → activar/desactivar
- **Archivos**: `backend/routers/admin.py`

### 11. Actualizar main.py + seed
- [ ] Importar y registrar routers `auth` y `admin`
- [ ] Agregar `slowapi` Limiter + middleware
- [ ] Agregar `SecurityHeadersMiddleware`
- [ ] Configurar exception handler para RateLimitExceeded
- [ ] Crear `backend/seed.py`:
  - Lee ADMIN_USERNAME/ADMIN_PASSWORD de settings
  - Crea admin si no existe con hash_password
- [ ] Verificar `.env` tiene SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
- **Archivos**: `backend/main.py`, `backend/seed.py`, `.env`

## 🎨 Frontend

### 12. Crear LoginPage.tsx
- [ ] Layout centrado, branding OdontoGest
- [ ] Formulario: username, password, botón "Iniciar sesión"
- [ ] Estado: username, password, error, isLoading
- [ ] POST /auth/login, guarda tokens en localStorage
- [ ] Redirige a `/` al loguear
- [ ] Usar frontend-design SKILL para estilos
- [ ] **Sin** NavigationRail (página pública)
- **Archivos**: `frontend/src/pages/LoginPage.tsx`

### 13. Crear AuthContext.tsx
- [ ] `createContext` con AuthState
- [ ] `User`: { id, username, rol }
- [ ] `AuthProvider`:
  - Al montar: lee tokens de localStorage, GET /auth/me
  - `login(username, password)` → guarda en state + localStorage
  - `logout()` → limpia state + localStorage
  - `refreshAuth()` → POST /auth/refresh
  - `getAccessToken()` → usado por api.ts
- [ ] Hook `useAuth()`
- **Archivos**: `frontend/src/context/AuthContext.tsx`

### 14. Crear PrivateRoute.tsx
- [ ] Props: `children` (ReactNode)
- [ ] Si `isLoading` → spinner
- [ ] Si `!isAuthenticated` → `<Navigate to="/login" />`
- [ ] Si OK → renderiza children
- **Archivos**: `frontend/src/components/PrivateRoute.tsx`

### 15. Agregar interceptores JWT en api.ts
- [ ] Request interceptor: adjunta `Authorization: Bearer <token>`
- [ ] Response interceptor:
  - 401 no retry → POST /auth/refresh → reintenta request
  - Refresh falla → limpia localStorage → /login
- [ ] No interceptar /auth/login ni /auth/refresh
- **Archivos**: `frontend/src/services/api.ts`

### 16. Proteger App.tsx
- [ ] Envolver todo en `<AuthProvider>`
- [ ] Ruta `/login` pública
- [ ] Resto de rutas dentro de `<PrivateRoute>`
- [ ] NavigationRail solo si `isAuthenticated`
- **Archivos**: `frontend/src/App.tsx`

## ✅ Validación

### 17. Testear flujo completo
- [ ] Ejecutar seed → verificar admin creado
- [ ] Login con admin → redirige a `/`
- [ ] NavigationRail visible
- [ ] Dashboard carga datos con token
- [ ] Token expirado → refresh automático
- [ ] Logout → redirige a `/login`
- [ ] Intentar /agenda sin token → 401
- [ ] Crear usuario secretaria desde admin
- [ ] Login con secretaria → acceso a panel
- [ ] Rate limiting: 5+ login attempts rápidos → 429
- [ ] Security headers presentes en response
