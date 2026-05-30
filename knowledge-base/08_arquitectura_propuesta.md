# 08 — Arquitectura Propuesta

## Patrones de diseño

### Backend
- **APIRouter por dominio**: auth, admin, pacientes, turnos, finanzas, doctores, catalogo.
- **Inyección de dependencias**: `Depends(get_db)`, `Depends(get_current_user)`, `require_role(["admin","secretaria"])`.
- **Schemas separados**: Create/Response/Update por entidad (Pydantic 2.x).
- **CRUD desacoplado**: funciones puras con `db: Session`.
- **Soft-delete**: `activo=False` en doctores, tratamientos, obras sociales, usuarios (toggle).
- **Rate limiting**: slowapi con decoradores por endpoint.
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

### Frontend
- **SPA con React Router v6**: PrivateRoute wrapper.
- **Context para auth**: AuthContext con useAuth() hook.
- **Llamadas HTTP**: api.ts con interceptores JWT + refresh automático.
- **Tailwind + Material Design 3**: diseño responsivo, consistente.
- **NavigationRail**: navegación lateral + bottom bar mobile, con logout.

## Seguridad

### Autenticación
- JWT HS256: access 30 min, refresh 7 días.
- bcrypt via passlib.
- OAuth2PasswordBearer → estándar FastAPI.
- Rate limit en /auth/login: 5/min.

### Autorización
- get_current_user: valida JWT + verifica activo.
- require_role(["admin","secretaria"]): factory de dependencia.
- Admin override: self-edit requiere current_password. Secretarias no.

### Producción
- HTTPS con Let's Encrypt.
- HSTS: max-age=31536000.
- CORS restrictivo (dominio frontend).
- CSP: default-src 'self'.
- Backups diarios PostgreSQL.

## Estructura objetivo

```
backend/
├── main.py, database.py, models.py, dependencies.py
├── routers/  (auth, admin, pacientes, turnos, finanzas, doctores, catalogo, portal🔲, reportes🔲, webhook🔲)
├── schemas/  (auth, pacientes, turnos, finanzas, doctores, catalogo, portal🔲)
├── crud/     (auth, pacientes, turnos, finanzas, doctores, catalogo, portal🔲)
├── core/     (config.py, security.py)
└── services/ (notificaciones🔲, email_service🔲, whatsapp_service🔲, plantillas🔲, scheduler🔲, reportes🔲)

frontend/src/
├── App.tsx, main.tsx
├── pages/  (Agenda, Dashboard, Pagos, PerfilPaciente, HistorialPaciente, Login, Admin, Catalogo, portal/🔲, ConsultaTurno🔲)
├── components/ (NavigationRail, KPICard, TurnoCard, Modal, MultiCurrencyInput, PrivateRoute, CalendarioDisponibilidad🔲)
├── context/ (AuthContext)
├── services/ (api.ts, interceptors.ts)
└── types/ (index.ts)
```

## Despliegue

| Componente | Hosting |
|-----------|---------|
| Frontend | Vercel (build estático Vite) |
| Backend | Railway o Render (FastAPI + Uvicorn) |
| DB | Railway PostgreSQL o Supabase free tier |
| Dominio | Propio con SSL/TLS |
