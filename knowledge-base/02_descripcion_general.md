# 02 — Descripción General

## Stack tecnológico

### Backend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Lenguaje | Python | 3.11+ |
| Framework | FastAPI | latest |
| ORM | SQLAlchemy | 2.x |
| Validación | Pydantic | 2.x |
| Base de datos | PostgreSQL | producción |
| DB alternativa | SQLite | solo desarrollo local |
| Servidor | Uvicorn | ASGI |
| Auth | JWT (python-jose) + bcrypt (passlib) | pendiente CHANGE-009 |
| Rate limiting | slowapi | pendiente CHANGE-009 |
| Scheduler | APScheduler | pendiente CHANGE-006 |
| Migraciones | Alembic | pendiente CHANGE-010 |

### Frontend
| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Lenguaje | TypeScript | 6.x |
| Framework | React | 19.x |
| Bundler | Vite | 8.x |
| Estilos | Tailwind CSS | 4.x |
| Router | React Router | v6 |
| HTTP | Fetch API (centralizado en api.ts) | — |
| Diseño | Material Design 3 | referencia visual |

### Infraestructura (planificada CHANGE-010)
| Componente | Opciones |
|-----------|---------|
| Backend hosting | Railway o Render |
| Frontend hosting | Vercel (build estático) |
| DB hosting | Railway PostgreSQL o Supabase free tier |
| HTTPS | Let's Encrypt |
| CI/CD | GitHub Actions (opcional) |

## Arquitectura general

```
┌─────────────────────────────┐
│     Frontend (Vercel)       │
│   React + Vite SPA          │
│   /login  /agenda  /portal  │
└──────────┬──────────────────┘
           │ HTTPS + JWT Bearer (rutas internas)
           │ Sin auth (rutas públicas: /portal, /consulta/:uuid)
┌──────────▼──────────────────┐
│   Backend (Railway/Render)  │
│   FastAPI + Uvicorn          │
│   ┌──────────┐ ┌──────────┐ │
│   │ JWT Auth │ │ slowapi  │ │
│   │ bcrypt   │ │ rate lim │ │
│   └──────────┘ └──────────┘ │
│   ┌──────────────────────┐  │
│   │ Security Headers     │  │
│   │ CSP, HSTS, X-Frame   │  │
│   └──────────────────────┘  │
└──────────┬──────────────────┘
           │ SSL connection
┌──────────▼──────────────────┐
│  PostgreSQL (Railway/       │
│  Supabase free tier)         │
│  Backups diarios            │
└─────────────────────────────┘
```

## Estructura del proyecto

```
/
├── backend/               # API REST Python
│   ├── main.py           # entrypoint + CORS + routers
│   ├── database.py       # get_db() con Depends
│   ├── models.py         # SQLAlchemy ORM
│   ├── dependencies.py   # get_current_user, require_role (CHANGE-009)
│   ├── seed.py           # datos iniciales (admin, obras sociales)
│   ├── routers/          # APIRouter por dominio
│   ├── schemas/          # Pydantic (Create / Response / Update)
│   ├── crud/             # lógica de acceso a datos
│   ├── core/             # config, security (CHANGE-009)
│   └── services/         # notificaciones, reportes, scheduler
├── frontend/              # SPA React
│   └── src/
│       ├── pages/        # vistas (Agenda, Dashboard, Portal, etc.)
│       ├── components/   # reutilizables (Modal, KPICard, PrivateRoute)
│       ├── context/      # AuthContext (CHANGE-009)
│       ├── services/     # api.ts (llamadas HTTP)
│       └── types/        # TypeScript interfaces
├── docs/                  # documentación fuente
├── knowledge-base/        # base de conocimiento (esta carpeta)
└── openspec/              # especificaciones por módulo
    ├── specs/
    └── changes/           # uno por CHANGE con proposal/design/tasks
```

## Comunicación

- **Frontend ↔ Backend**: exclusivamente REST API (JSON).
- **Sin lógica de negocio en frontend**: solo presentación + hooks.
- **Toda llamada HTTP centralizada** en `frontend/src/services/api.ts`.
- **Interceptores JWT**: Bearer token en request, refresh automático en 401.

## Variables de entorno principales

```bash
# CHANGE-009
SECRET_KEY=xxx
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxx

# CHANGE-006
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
WHATSAPP_API_KEY=xxx
PORTAL_URL=http://localhost:5173/portal
CLINICA_TELEFONO=11-xxxx-xxxx
```
