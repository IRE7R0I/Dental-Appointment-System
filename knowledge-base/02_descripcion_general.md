# 02 — Descripción General

## Stack tecnológico

### Backend
| Componente | Tecnología | Estado |
|-----------|-----------|--------|
| Lenguaje | Python 3.11+ | ✅ |
| Framework | FastAPI | ✅ |
| ORM | SQLAlchemy 2.x | ✅ |
| Validación | Pydantic 2.x | ✅ |
| Base de datos | PostgreSQL (prod) / SQLite (dev) | ✅ |
| Servidor | Uvicorn | ✅ |
| Auth | JWT (python-jose) + bcrypt (passlib) | ✅ |
| Rate limiting | slowapi | ✅ |
| Scheduler | APScheduler | 🔲 CHANGE-006 |
| Migraciones | Alembic | 🔲 CHANGE-010 |
| Reportes | openpyxl | 🔲 CHANGE-008 |

### Frontend
| Componente | Tecnología | Estado |
|-----------|-----------|--------|
| Lenguaje | TypeScript 6.x | ✅ |
| Framework | React 19.x | ✅ |
| Bundler | Vite 8.x | ✅ |
| Estilos | Tailwind CSS 4.x | ✅ |
| Router | React Router v6 | ✅ |
| HTTP | Fetch API (api.ts con interceptores JWT) | ✅ |
| Auth | React Context (AuthContext + useAuth hook) | ✅ |

### Infraestructura (CHANGE-010)
| Componente | Opciones | Estado |
|-----------|---------|--------|
| Backend | Railway o Render | 🔲 |
| Frontend | Vercel | 🔲 |
| DB | Railway PostgreSQL o Supabase free tier | 🔲 |
| HTTPS | Let's Encrypt | 🔲 |

## Arquitectura general

```
┌─────────────────────────────────┐
│     Frontend (Vercel)           │
│   React + Vite SPA               │
│   /login /agenda /catalogo ...  │
└──────────────┬──────────────────┘
               │ HTTPS + JWT (interno) / público (portal)
┌──────────────▼──────────────────┐
│   Backend (Railway/Render)      │
│   FastAPI + Uvicorn              │
│   JWT + slowapi + sec headers   │
│   Routers: auth, admin,         │
│   pacientes, turnos, finanzas,  │
│   doctores, catalogo            │
└──────────────┬──────────────────┘
               │ SSL
┌──────────────▼──────────────────┐
│  PostgreSQL + backups diarios   │
└─────────────────────────────────┘
```

## Estructura actual

```
/
├── backend/
│   ├── main.py, database.py, models.py, dependencies.py
│   ├── routers/  (auth, admin, pacientes, turnos, finanzas, doctores, catalogo)
│   ├── schemas/  (auth, pacientes, turnos, finanzas, doctores, catalogo)
│   ├── crud/     (auth, pacientes, turnos, finanzas, doctores, catalogo)
│   ├── core/     (config.py, security.py)
│   └── services/ (preparado para CHANGE-006/008)
├── frontend/src/
│   ├── pages/    (9: Agenda, Dashboard, Pagos, PerfilPaciente, HistorialPaciente, Login, Admin, Catalogo)
│   ├── components/ (6: NavigationRail, KPICard, TurnoCard, Modal, MultiCurrencyInput, PrivateRoute)
│   ├── context/  (AuthContext)
│   ├── services/ (api.ts, interceptors.ts)
│   └── types/    (index.ts)
├── docs/         (4 archivos fundacionales)
├── knowledge-base/ (11 archivos canónicos)
└── openspec/     (changes por módulo + roadmap)
```

## Variables de entorno principales

```bash
# Auth (CHANGE-009)
SECRET_KEY=xxx
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ADMIN_USERNAME=admin
ADMIN_PASSWORD=xxx

# DB
DATABASE_URL=postgresql://postgres:root@localhost:5432/odontogest

# Notificaciones (CHANGE-006)
SMTP_HOST=smtp.mailtrap.io
WHATSAPP_API_KEY=xxx
PORTAL_URL=http://localhost:5173/portal
```
