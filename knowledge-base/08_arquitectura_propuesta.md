# 08 — Arquitectura Propuesta

## Patrones de diseño

### Backend
- **APIRouter por dominio**: cada entidad tiene su router (`pacientes.py`, `turnos.py`, etc.).
- **Inyección de dependencias**: `Depends(get_db)` para sesiones, `Depends(get_current_user)` para auth.
- **Schemas separados**: `XxxCreate`, `XxxResponse`, `XxxUpdate` por entidad.
- **CRUD desacoplado**: funciones puras que reciben `db: Session` como primer argumento.
- **Soft-delete**: `activo=False` en vez de `DELETE` físico (catálogo, obras sociales, usuarios).
- **Rate limiting**: slowapi con `@limiter.limit("5/minute")` por endpoint público.
- **Security headers**: middleware que inyecta CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

### Frontend
- **SPA con React Router v6**: rutas anidadas, parámetros de URL.
- **Llamadas HTTP centralizadas**: `services/api.ts` con interceptores.
- **Context para estado global**: `AuthContext` (JWT), sin Redux.
- **Componentes presentacionales**: sin lógica de negocio, solo props + hooks.
- **Tailwind CSS**: utility-first, diseño responsivo. Material Design 3 como guía visual.
- **PrivateRoute**: wrapper que redirige a `/login` si no autenticado.

## Estructura de directorios objetivo

```
backend/
├── main.py                 # FastAPI app, CORS, routers, slowapi, security headers
├── database.py             # get_db() + engine
├── models.py               # SQLAlchemy ORM (todos los modelos)
├── dependencies.py          # get_current_user, require_role
├── seed.py                  # admin + obras sociales iniciales
├── core/
│   ├── config.py            # Settings (pydantic-settings + .env)
│   └── security.py          # JWT + bcrypt
├── routers/
│   ├── auth.py              # /auth/*
│   ├── admin.py             # /admin/* (solo admin)
│   ├── pacientes.py         # /pacientes/*
│   ├── turnos.py            # /turnos/*
│   ├── finanzas.py          # /finanzas/*
│   ├── doctores.py          # /doctores/*
│   ├── catalogo.py          # /catalogo/* (CHANGE-011)
│   ├── portal.py            # /portal/* (CHANGE-007)
│   ├── reportes.py          # /reportes/* (CHANGE-008)
│   └── webhook.py           # /webhook/* (CHANGE-006)
├── schemas/
│   ├── auth.py, pacientes.py, turnos.py, finanzas.py, doctores.py
│   ├── catalogo.py          # (CHANGE-011)
│   └── portal.py            # (CHANGE-007)
├── crud/
│   ├── auth.py, pacientes.py, turnos.py, finanzas.py, doctores.py
│   ├── catalogo.py          # (CHANGE-011)
│   └── portal.py            # (CHANGE-007)
└── services/
    ├── notificaciones.py    # orquestador (CHANGE-006)
    ├── email_service.py     # SMTP (CHANGE-006)
    ├── whatsapp_service.py  # API WhatsApp (CHANGE-006)
    ├── plantillas.py        # templates (CHANGE-006)
    ├── scheduler.py         # APScheduler (CHANGE-006)
    └── reportes.py          # openpyxl (CHANGE-008)

frontend/src/
├── App.tsx                   # Rutas + AuthProvider
├── main.tsx                  # Entry point
├── pages/
│   ├── LoginPage.tsx         # (CHANGE-009)
│   ├── AgendaPage.tsx
│   ├── DashboardPage.tsx
│   ├── PagosPage.tsx
│   ├── PerfilPacientePage.tsx
│   ├── HistorialPacientePage.tsx
│   ├── CatalogoPage.tsx      # (CHANGE-011)
│   ├── ConsultaTurnoPage.tsx  # (CHANGE-007)
│   └── portal/               # (CHANGE-007)
│       ├── PortalPage.tsx     # stepper container
│       ├── Step1Servicio.tsx
│       ├── Step2Profesional.tsx
│       ├── Step3Agenda.tsx
│       ├── Step4Identificacion.tsx
│       └── ConfirmacionTurno.tsx
├── components/
│   ├── NavigationRail.tsx
│   ├── KPICard.tsx
│   ├── TurnoCard.tsx
│   ├── Modal.tsx
│   ├── MultiCurrencyInput.tsx
│   └── PrivateRoute.tsx       # (CHANGE-009)
├── context/
│   └── AuthContext.tsx         # (CHANGE-009)
├── services/
│   └── api.ts
└── types/
    └── index.ts
```

## Seguridad

### Autenticación (CHANGE-009)
- JWT HS256 con `python-jose`.
- Access token: 30 min. Refresh token: 7 días.
- Contraseñas: bcrypt con `passlib[bcrypt]`.
- OAuth2PasswordBearer → estándar FastAPI.
- Rate limit en `/auth/login`: 5 req/min.

### Autorización (CHANGE-009)
- `get_current_user`: valida JWT, busca usuario, verifica activo → 401.
- `require_role(["admin","secretaria"])`: factory de dependencia → 403.
- Solo 2 roles. Paciente sin cuenta.

### Endpoints públicos (CHANGE-007)
- Rate limiting por IP con slowapi.
- UUID v4 como token de acceso (2^122 combinaciones, no enumerable).
- Sin exposición de datos sensibles.

### Producción (CHANGE-010)
- HTTPS con Let's Encrypt (obligatorio).
- HSTS: max-age=31536000; includeSubDomains.
- CORS: restringido a dominio del frontend.
- CSP: default-src 'self'.
- X-Frame-Options: DENY.
- X-Content-Type-Options: nosniff.
- SECRET_KEY: 64+ caracteres aleatorios.
- .env.example sin valores reales.

## Despliegue (CHANGE-010)

| Componente | Hosting | Notas |
|-----------|---------|-------|
| Frontend | Vercel | Build estático de Vite |
| Backend | Railway o Render | FastAPI + Uvicorn |
| DB | Railway PG o Supabase free tier | 500MB gratis en Supabase |
| Dominio | Propio | Con SSL/TLS |
| Backups | Script o feature del hosting | Diarios |

### Docker
```dockerfile
# Dockerfile (backend)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Alembic
```bash
alembic init alembic
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

## Convenciones

| Ámbito | Convención | Ejemplo |
|--------|-----------|---------|
| Cambios | kebab-case | `autenticacion-jwt-roles` |
| Interfaces TS | PascalCase | `interface Turno` |
| Campos DB | snake_case | `paciente_dni` |
| IDs de HU | HU-NNN | `HU-007` |
| IDs CHANGE | CHANGE-NNN | `CHANGE-009` |
| Ramas git | feature/CHANGE-NNN-descripcion | `feature/CHANGE-009-auth-jwt` |
