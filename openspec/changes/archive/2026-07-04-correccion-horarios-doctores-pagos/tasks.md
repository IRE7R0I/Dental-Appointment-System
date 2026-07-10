# CHANGE-012: Tareas de Implementación

> Depende de CHANGE-011 (catálogo). 100% backend. Sin frontend.

---

## 🔧 Backend

### 1. Crear core/horarios.py — Módulo centralizado de horarios
- [ ] Crear `backend/core/horarios.py` con `from zoneinfo import ZoneInfo` y constante `AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")`
- [ ] Definir `FRANJA_MANIANA = (time(9, 0), time(13, 0))` y `FRANJA_TARDE = (time(16, 0), time(20, 0))`
- [ ] `DIAS_LABORALES = {0, 1, 2, 4, 5}` (lun, mar, mie, vie, sáb); `SABADO = 5`
- [ ] `JUEVES = 3`, `DOMINGO = 6`
- [ ] `es_dia_laboral(fecha: date) → bool` — True si no es jueves ni domingo
- [ ] `es_hora_valida(dt: datetime, duracion: int) → bool` — valida día + franja + cierre exclusivo (start + duration <= close_time)
- [ ] `generar_slots(fecha: date, duracion: int = 30) → list[time]` — genera slots cada 30 min dentro de franjas válidas
- [ ] `validar_granularidad(dt: datetime)` — lanza ValueError si minuto no es 00 o 30
- [ ] Función auxiliar `dt_local(dt: datetime) → datetime` — convierte a AR tz
- **Archivos**: `backend/core/horarios.py`

### 2. Modelo — Agregar SlotsBloqueado
- [ ] Clase `SlotsBloqueado(Base)` con `__tablename__ = "slots_bloqueados"`
- [ ] `id = Column(Integer, primary_key=True, index=True)`
- [ ] `fecha = Column(Date, nullable=False)`
- [ ] `hora = Column(Time, nullable=False)`
- [ ] `id_doctor = Column(Integer, ForeignKey("doctores.id"), nullable=False)`
- [ ] `motivo = Column(String(255), nullable=True)`
- [ ] `bloqueado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)`
- [ ] `creado_en = Column(DateTime, default=datetime.now)`
- [ ] `__table_args__ = (UniqueConstraint("fecha", "hora", "id_doctor", name="uq_slot_bloqueado"),)`
- [ ] Relación: `doctor = relationship("Doctor")`
- **Archivos**: `backend/models.py`

### 3. Schemas — Actualizaciones y nuevos
- [ ] Agregar `duracion_minutos: int = 30` a `TurnoCreate` en `schemas/turnos.py`
- [ ] Crear `BloquearSlotInput(BaseModel)`: `fecha: date`, `hora: time`, `id_doctor: int`, `motivo: Optional[str]`
- [ ] Crear `SlotBloqueadoResponse(BaseModel)`: `id`, `fecha`, `hora`, `id_doctor`, `motivo`, `bloqueado_por_id`, `creado_en` con `from_attributes = True`
- [ ] Crear `SlotDisponibleResponse(BaseModel)`: `hora: time`, `disponible: bool`, `estado: str` (libre, ocupado, bloqueado)
- [ ] Crear `ConfigHorariosResponse(BaseModel)`: estructura con franjas y reglas de schedule como dict
- [ ] En `schemas/doctores.py` — agregar hex validator en `DoctorCreate.color_agenda`: `@field_validator("color_agenda")` → raise si no match `^#[0-9A-Fa-f]{6}$`
- [ ] En `schemas/doctores.py` — idem para `DoctorUpdate.color_agenda`
- [ ] En `schemas/finanzas.py` — agregar `constancia_turno: Optional[str] = None` a `PagoResponse`
- [ ] En `schemas/finanzas.py` — agregar `constancia_turno: Optional[str] = None` a `PagoContextoResponse`
- **Archivos**: `backend/schemas/turnos.py`, `backend/schemas/doctores.py`, `backend/schemas/finanzas.py`

### 4. CRUD — Slots bloqueados
- [ ] `bloquear_slot(db, data: BloquearSlotInput, usuario_id: int) → models.SlotsBloqueado` — insert con try/except por UniqueConstraint violación
- [ ] `desbloquear_slot(db, slot_id: int) → bool` — delete por id, retorna True si existía
- [ ] `obtener_slots_bloqueados(db, fecha: date, id_doctor: int) → list[models.SlotsBloqueado]` — lista para fecha+doctor
- **Archivos**: `backend/crud/turnos.py`

### 5. Router — Turnos: validación corregida con core/horarios.py
- [ ] Importar `es_hora_valida`, `validar_granularidad`, `dt_local` desde `backend.core.horarios`
- [ ] En `post_turno`: reemplazar validación inline por: `dt_local = dt_local(turno.fecha_hora)` → `validar_granularidad(dt_local)` → si no `es_hora_valida(dt_local, turno.duracion_minutos)` → 400
- [ ] Usar `turno.duracion_minutos` en vez de hardcoded 30 para el chequeo de cierre
- **Archivos**: `backend/routers/turnos.py`

### 6. Router — Endpoints de slots
- [ ] `GET /turnos/slots?fecha=&id_doctor=` — llama `generar_slots(fecha)`, cruza con turnos existentes (no cancelados) y slots_bloqueados, devuelve list[SlotDisponibleResponse]
- [ ] `POST /turnos/slots/bloquear` — `Depends(require_role(["admin", "secretaria"]))`, recibe `BloquearSlotInput`, retorna `SlotBloqueadoResponse` status 201
- [ ] `DELETE /turnos/slots/{id}/desbloquear` — `Depends(require_role(["admin", "secretaria"]))`, retorna `{"mensaje": "Slot desbloqueado"}`
- **Archivos**: `backend/routers/turnos.py`

### 7. Router — Config horarios público
- [ ] `GET /config/horarios` — endpoint público (sin auth), retorna JSON con schedule rules del módulo horarios
- [ ] Si se crea `backend/routers/config.py`, registrar en main.py
- **Archivos**: `backend/routers/turnos.py` (o `backend/routers/config.py`)

### 8. Router — Doctores: restricción de roles
- [ ] Sacar `dependencies=[Depends(require_role(["admin", "secretaria"]))]` del nivel router
- [ ] Agregar `Depends(require_role(["admin", "secretaria"]))` solo al `GET /` y `GET /{id}`
- [ ] Agregar `Depends(require_role(["admin"]))` a `POST /`, `PUT /{id}`, `DELETE /{id}`
- **Archivos**: `backend/routers/doctores.py`

### 9. Router — Finanzas: constancia_turno
- [ ] En `registrar_pago` (POST /finanzas/pagos): después de crear pago, si `pago.id_turno`, obtener turno con paciente y formatear `"DD/MM - Apellido (HH:MM)"` en AR tz, asignar a `constancia_turno`
- [ ] En `listar_pagos` (GET /finanzas/pagos): mismo formato en cada `PagoContextoResponse` si `id_turno` existe
- [ ] Si no hay turno (pago general), `constancia_turno = None`
- **Archivos**: `backend/routers/finanzas.py`

### 10. Registrar routers en main.py
- [ ] Si se crea `backend/routers/config.py`, agregar `app.include_router(config.router)`
- **Archivos**: `backend/main.py`

## 📚 Knowledge Base

### 11. Actualizar documentación
- [ ] En `05_reglas_de_negocio.md`: actualizar RN-01 con horario corregido (mañana 9-13, tarde 16-20, cierre exclusivo, jueves/domingo cerrado, sábado solo mañana)
- [ ] En `05_reglas_de_negocio.md`: agregar RN-14 — Slots bloqueados (secretaria puede bloquear slots, no solapan con turnos existentes, bloqueo liberable)
- [ ] En `10_preguntas_abiertas.md`: marcar I-01 como resuelto (corregido en CHANGE-012)
- [ ] En `10_preguntas_abiertas.md`: agregar input documentado para C-08/C-09: paciente elige slot disponible, solicitud queda "solicitado", secretaria aprueba/rechaza con motivo, notificación al paciente
- **Archivos**: `knowledge-base/05_reglas_de_negocio.md`, `knowledge-base/10_preguntas_abiertas.md`

## ✅ Tests

### 12. Tests de integración
- [ ] Determinar archivo de test (ej: `tests/test_horarios.py` o `tests/test_turnos.py`)
- [ ] Test: lunes 12:30 permitido (cierre mañana exclusivo)
- [ ] Test: lunes 13:00 rechazado (clínica cerrada)
- [ ] Test: viernes 19:30 permitido (cierre tarde exclusivo)
- [ ] Test: viernes 20:00 rechazado
- [ ] Test: sábado 12:30 permitido
- [ ] Test: sábado 16:00 rechazado (solo mañana)
- [ ] Test: jueves todos los slots rechazados
- [ ] Test: domingo todos los slots rechazados
- [ ] Test: granularidad 30 min — 09:15 rechazado
- [ ] Test: bloquear slot → GET /slots muestra bloqueado → desbloquear → GET /slots muestra libre
- [ ] Test: constancia_turno formateada como "DD/MM - Apellido (HH:MM)" en pagos con turno
- [ ] Test: constancia_turno = null en pagos generales (sin id_turno)
- [ ] Test: secretaria obtiene 403 en POST /doctores
- [ ] Test: secretaria obtiene 403 en PUT /doctores/{id}
- [ ] Test: secretaria obtiene 403 en DELETE /doctores/{id}
- [ ] Test: secretaria obtiene 200 en GET /doctores
- [ ] **Archivos**: `tests/` (determinar nombre)