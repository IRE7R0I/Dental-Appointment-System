from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from backend.routers import pacientes, turnos, doctores, finanzas, auth, admin, catalogo, config as config_router, historia_clinica
from backend.database import engine, Base

# ── Security Headers Middleware ──────────────────────────


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'"
        return response


# ── SlowAPI Rate Limiter ────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ── Lifecycle ───────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    Base.metadata.create_all(bind=engine)
    yield


# ── App ─────────────────────────────────────────────────

app = FastAPI(
    title="OdontoGest API",
    version="0.3.0",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(pacientes.router)
app.include_router(turnos.router)
app.include_router(doctores.router)
app.include_router(finanzas.router)
app.include_router(catalogo.router)
app.include_router(config_router.router)
app.include_router(historia_clinica.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.3.0"}
