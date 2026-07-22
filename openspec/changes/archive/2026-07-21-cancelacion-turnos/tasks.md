# Tasks: Cancelación de Turnos

## 1. Modelo — `backend/models.py`

- [ ] 1.1 Agregar `motivo_cancelacion = Column(String(255), nullable=True)` en clase `Turno`
- [ ] 1.2 Agregar `actualizado_en = Column(DateTime, nullable=True)` en clase `Turno`
- [ ] 1.3 Documentar migración manual en tasks (ALTER TABLE para DB dev existente)

## 2. Schemas — `backend/schemas/turnos.py`

- [ ] 2.1 Crear `TurnoCancelarInput(BaseModel)` con campo `motivo_cancelacion: str` (obligatorio, sin `Optional`)
- [ ] 2.2 Agregar `motivo_cancelacion: Optional[str] = None` a `TurnoResponse`
- [ ] 2.3 Agregar `actualizado_en: Optional[datetime] = None` a `TurnoResponse`

## 3. CRUD — `backend/crud/turnos.py`

- [ ] 3.1 Cambiar firma de `cancelar_turno` para recibir `motivo_cancelacion: str` y `usuario_id: int`
- [ ] 3.2 Agregar validación de estado: `"Realizado"` → `ValueError("No se puede cancelar un turno ya facturado")`
- [ ] 3.3 Agregar validación de estado: `"Cancelado"` → `ValueError("El turno ya está cancelado")`
- [ ] 3.4 Setear `motivo_cancelacion`, `actualizado_en = datetime.now()`, `actualizado_por_id = usuario_id`
- [ ] 3.5 Importar `datetime` si no está ya importado

## 4. CRUD — `backend/crud/finanzas.py`

- [ ] 4.1 En `cerrar_turno_con_pago`, después de `turno.estado = "Realizado"`, setear `turno.actualizado_en = datetime.now()` y `turno.actualizado_por_id = creado_por_id`

## 5. Router — `backend/routers/turnos.py`

- [ ] 5.1 Agregar `TurnoCancelarInput` al import de schemas
- [ ] 5.2 Agregar `get_current_user` al import de dependencies
- [ ] 5.3 Modificar `cancelar_turno_api`: agregar `body: TurnoCancelarInput`, `current_user = Depends(get_current_user)`, pasar params a CRUD
- [ ] 5.4 Manejar `ValueError` → `HTTPException(400)`
- [ ] 5.5 Actualizar `_turno_to_response()`: incluir `motivo_cancelacion=turno.motivo_cancelacion`, `actualizado_en=turno.actualizado_en`

## 6. Tests — `backend/tests/test_cancelacion_turnos.py`

- [ ] 6.1 Test: Cancelar turno Pendiente → 200, verifica estado, motivo_cancelacion, motivo intacto, actualizado_en
- [ ] 6.2 Test: Cancelar turno Realizado → 400 (crear, cerrar, intentar cancelar)
- [ ] 6.3 Test: Cancelar turno ya Cancelado → 400 (crear, cancelar, cancelar de nuevo)
- [ ] 6.4 Test: Cancelar sin body → 422
- [ ] 6.5 Test: Cancelar con motivo vacío → 422
- [ ] 6.6 Test: Cierre de turno setea actualizado_en → 200, verifica campo
- [ ] 6.7 Test: actualizado_por_id poblado al cancelar (no null)
- [ ] 6.8 Regresión: correr `pytest backend/tests/ -v` y verificar que todo pasa

## 7. Verificación final

- [ ] 7.1 `pytest backend/tests/ -v` — suite completa verde
- [ ] 7.2 `git status` — solo archivos modificados/creados esperados
- [ ] 7.3 Revisar que `motivo` original no se toca en ninguna ruta de código
