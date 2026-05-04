from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import pacientes, turnos, doctores, finanzas

app = FastAPI(title="OdontoGest API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pacientes.router)
app.include_router(turnos.router)
app.include_router(doctores.router)
app.include_router(finanzas.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}