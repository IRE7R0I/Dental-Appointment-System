# genero-paciente

Columna `genero` en tabla `pacientes` con validación server-side.

## Modelo

```python
# models.py — Paciente
genero = Column(String(20), nullable=True)
```

Valores aceptados: `"Masculino"`, `"Femenino"`, `"Otro"`. Columna nullable (NULL permitido,
sin default ni backfill para registros existentes).

## Schemas Pydantic

```python
# schemas/pacientes.py
from typing import Optional, Literal

class PacienteCreate(BaseModel):
    # ... campos existentes ...
    genero: Optional[Literal["Masculino", "Femenino", "Otro"]] = None

class PacienteUpdate(BaseModel):
    # ... campos existentes ...
    genero: Optional[Literal["Masculino", "Femenino", "Otro"]] = None

class PacienteResponse(BaseModel):
    # ... campos existentes ...
    genero: Optional[str] = None  # hereda valor de la DB
```

## Validación

- Pydantic rechaza valores fuera del `Literal` con `422 Unprocessable Entity`.
- Sin validación adicional en capa de base de datos (columna String sin CHECK constraint).
- Endpoints afectados: `POST /pacientes/`, `PUT /pacientes/{dni}`, `GET /pacientes/{dni}`,
  `GET /pacientes/`.

## Migración

Bloque en `crear_tablas.py`:

```python
genero_col = db.execute(text(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name='pacientes' AND column_name='genero'"
)).fetchone()
if not genero_col:
    db.execute(text("ALTER TABLE pacientes ADD COLUMN genero VARCHAR(20)"))
```

Postgres-only. SQLite dev regenera tabla con `create_all` si se borra test.db.
