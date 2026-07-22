# Design: Cancelación de Turnos

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `backend/models.py` | Turno: +`motivo_cancelacion` (String, nullable), +`actualizado_en` (DateTime, nullable) |
| `backend/schemas/turnos.py` | Nuevo `TurnoCancelarInput`; `TurnoResponse` ampliado |
| `backend/crud/turnos.py` | `cancelar_turno` recibe `motivo_cancelacion` + `usuario_id`; validación de estado |
| `backend/crud/finanzas.py` | `cerrar_turno_con_pago`: setea `actualizado_en` + `actualizado_por_id` |
| `backend/routers/turnos.py` | `cancelar_turno_api`: body `TurnoCancelarInput`, `Depends(get_current_user)` |
| `backend/tests/test_cancelacion_turnos.py` | NUEVO: suite de tests de integración |

## Modelo — `Turno` (models.py)

Columnas nuevas (nullable, patrón C-18 para migración):

```python
motivo_cancelacion = Column(String(255), nullable=True)
actualizado_en = Column(DateTime, nullable=True)
```

`actualizado_por_id` ya existe (C-09). Sin cambios estructurales.

## Schemas

### `TurnoCancelarInput` (nuevo)

```python
class TurnoCancelarInput(BaseModel):
    motivo_cancelacion: str  # obligatorio, min_length=1 implícito
```

### `TurnoResponse` (ampliado)

Agregar:
```python
motivo_cancelacion: Optional[str] = None
actualizado_en: Optional[datetime] = None
```

`model_config = ConfigDict(from_attributes=True)` ya existe.

Actualizar `_turno_to_response()` en router.

## CRUD — `cancelar_turno` (crud/turnos.py)

Firma actual: `(db, turno_id) → Turno | None`
Firma nueva: `(db, turno_id, motivo_cancelacion: str, usuario_id: int) → Turno`

Lógica:
1. Buscar turno con joinedload. Si no existe → None.
2. Validar estado:
   - `"Realizado"` → `raise ValueError("No se puede cancelar un turno ya facturado")`
   - `"Cancelado"` → `raise ValueError("El turno ya está cancelado")`
3. Setear campos: `estado = "Cancelado"`, `motivo_cancelacion`, `actualizado_en = datetime.now()`, `actualizado_por_id`.
4. Commit + refresh + return.

`eliminar_turno`: sin cambios.

## CRUD — `cerrar_turno_con_pago` (crud/finanzas.py)

Al finalizar cierre exitoso (después de `turno.estado = "Realizado"`, línea 160):
```python
turno.actualizado_en = datetime.now()
turno.actualizado_por_id = creado_por_id  # parámetro ya existe
```

## Router — `cancelar_turno_api` (routers/turnos.py)

Antes:
```python
@router.patch("/{turno_id}/cancelar", response_model=TurnoResponse)
def cancelar_turno_api(turno_id: int, db: Session = Depends(get_db)):
    db_turno = cancelar_turno(db, turno_id)
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return _turno_to_response(db_turno)
```

Después:
```python
@router.patch("/{turno_id}/cancelar", response_model=TurnoResponse)
def cancelar_turno_api(
    turno_id: int,
    body: TurnoCancelarInput,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    try:
        db_turno = cancelar_turno(db, turno_id, body.motivo_cancelacion, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not db_turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return _turno_to_response(db_turno)
```

`_turno_to_response()`: agregar `motivo_cancelacion` y `actualizado_en`.

## Migración

Patrón C-18: columnas nullable, `Base.metadata.create_all()` para DB fresca.
Para DB dev existente: ALTER manual documentado en tasks.md. Sin Alembic (llega en C-11).

```sql
ALTER TABLE turnos ADD COLUMN motivo_cancelacion VARCHAR(255);
ALTER TABLE turnos ADD COLUMN actualizado_en DATETIME;
```

## Edge cases

| Caso | Comportamiento |
|------|---------------|
| Cancelar Pendiente | ✅ 200, estado="Cancelado" |
| Cancelar Realizado | ❌ 400 "No se puede cancelar un turno ya facturado" |
| Cancelar ya Cancelado | ❌ 400 "El turno ya está cancelado" |
| Cancelar sin motivo | ❌ 422 (Pydantic) |
| Turno no existe | ❌ 404 |
| Motivo vacío `""` | ❌ 422 si min_length=1, o acepta string vacío según decisión |
| Cerrar turno | `actualizado_en` se setea |
| Slot liberado | Sin cambios — ya funciona, queries excluyen "Cancelado" |

## Testing

Nuevo archivo `backend/tests/test_cancelacion_turnos.py` con fixtures de `conftest.py`:

1. **Cancelar Pendiente**: crea turno → cancela con motivo → 200, verifica `estado`, `motivo_cancelacion`, `motivo` intacto, `actualizado_en` not null.
2. **Cancelar Realizado**: crea + cierra turno → intenta cancelar → 400.
3. **Cancelar ya Cancelado**: crea + cancela turno → intenta cancelar de nuevo → 400.
4. **Sin motivo_cancelacion**: PATCH sin body → 422.
5. **Motivo vacío**: PATCH con `{"motivo_cancelacion": ""}` → 422.
6. **Cierre setea actualizado_en**: cierra turno → verifica `actualizado_en` not null.
7. **Regresión**: correr suite completa (`pytest backend/tests/`).
