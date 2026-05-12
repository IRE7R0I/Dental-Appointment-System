# CHANGE-009: Autenticación JWT y Roles (admin + secretaria)

## Problema

El sistema OdontoGest carece de autenticación y control de acceso. Todos los
endpoints de la API están expuestos sin protección. Cualquier persona que
conozca la URL del backend puede acceder, modificar o eliminar datos de
pacientes, turnos, historias clínicas y finanzas.

Esto implica:
- **Riesgo legal**: incumplimiento de la Ley 25.326 de Protección de Datos
  Personales (Habeas Data).
- **Riesgo operativo**: cualquier persona puede modificar la agenda, borrar
  turnos o alterar registros financieros.
- **Sin trazabilidad**: no se registra quién realizó cada operación.
- **Falta de roles**: no hay distinción entre admin y secretaria.

## Decisión de diseño: Sin login para pacientes

El paciente **no tiene cuenta ni contraseña**. Accede al portal de autogestión
vía guest checkout con DNI. Los turnos generados reciben un UUID único que
sirve como token de acceso público a la consulta del estado.

Esto simplifica CHANGE-009: solo necesitamos autenticación para usuarios
internos (admin y secretaria). La seguridad pública se maneja con rate limiting
y UUIDs no enumerables.

## Roles del sistema

| Rol | Alcance |
|-----|---------|
| **admin** | Acceso total. Gestión de usuarios, configuración (doctores, tratamientos, precios), reportes financieros globales. |
| **secretaria** | Gestión operativa completa: agenda, pacientes, finanzas, catálogo de tratamientos, aprobación de turnos, bloqueo de slots, creación manual de pacientes. |

## Por qué es el primer paso

CHANGE-009 es **bloqueante** para todos los cambios siguientes:

| Dependencia | Por qué |
|-------------|---------|
| CHANGE-011 (Catálogo) | Endpoints de escritura del catálogo requieren auth |
| CHANGE-007 (Portal) | Panel de aprobación de secretaria requiere auth |
| CHANGE-008 (Reportes) | Endpoints de reportes requieren auth + rol |
| CHANGE-010 (Deploy) | No se puede exponer a internet sin autenticación |

## Solución propuesta

JWT con dos roles. Rate limiting en endpoints públicos desde el día 1
(preparando el terreno para CHANGE-007). Security headers HTTP.

### Componentes

- **Backend**: modelo `Usuario`, endpoints `/auth/*` y `/admin/*`,
  middleware `get_current_user` y `require_role`, hashing bcrypt,
  tokens JWT con refresh, slowapi, security headers.
- **Frontend**: `LoginPage`, `AuthContext`, `PrivateRoute`, interceptores JWT.

### Flujo

```
Usuario → LoginPage (user+pass) → POST /auth/login → JWT access+refresh
   → AuthContext almacena tokens
   → api.ts adjunta Bearer en cada request
   → Backend valida JWT → get_current_user → require_role
   → Si 401 → api.ts intenta refresh automático
   → Si refresh falla → redirigir a /login
```

## Capabilities

- `auth-jwt`: autenticación con JWT (login, refresh, logout, me)
- `rbac-roles`: control de acceso basado en roles (admin, secretaria)
- `gestion-usuarios`: CRUD de usuarios (solo admin)
- `rate-limiting`: protección de endpoints públicos con slowapi
- `security-headers`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- `auth-frontend`: login, contexto global, rutas protegidas, interceptores

## Impacto

### Backend — archivos nuevos
- `backend/core/config.py` — variables de entorno + settings
- `backend/core/security.py` — JWT create/verify, bcrypt hash/verify
- `backend/schemas/auth.py` — LoginRequest, TokenResponse, UserCreate, UserResponse
- `backend/crud/auth.py` — autenticar_usuario, crear_usuario, get_user_by_username
- `backend/routers/auth.py` — POST /auth/login, /refresh, /logout, GET /auth/me
- `backend/routers/admin.py` — POST/GET /admin/usuarios
- `backend/dependencies.py` — get_current_user, require_role
- `backend/seed.py` — crear admin inicial

### Backend — archivos modificados
- `backend/models.py` — nuevo modelo Usuario
- `backend/main.py` — registrar routers auth/admin, agregar slowapi, security headers
- Todos los routers existentes — agregar `Depends(get_current_user)`

### Frontend — archivos nuevos
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/PrivateRoute.tsx`

### Frontend — archivos modificados
- `frontend/src/services/api.ts` — interceptores JWT
- `frontend/src/App.tsx` — AuthProvider + PrivateRoute

### Dependencias nuevas
- `python-jose[cryptography]` — JWT
- `passlib[bcrypt]` — ya en requirements.txt
- `slowapi` — rate limiting

## Riesgos

- **Migración de datos**: modelo Usuario nuevo, sin migración de datos existentes.
- **Compatibilidad**: endpoints existentes siguen funcionando igual. Solo se agrega
  capa de auth encima.

## Success Metrics

- Todos los endpoints internos devuelven 401 sin token válido
- Login funciona con usuario+contraseña y devuelve JWT
- Refresh automático transparente para el usuario
- Rutas del frontend redirigen a /login sin sesión
- Admin puede crear usuarios desde panel
- Contraseñas nunca en texto plano
- Rate limiting activo en endpoints públicos
