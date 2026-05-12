# CHANGE-011: Diseño Técnico — Catálogo de Tratamientos y Obras Sociales

## 1. Modelos

### TratamientoCatalogo

```python
class TratamientoCatalogo(Base):
    __tablename__ = "tratamientos_catalogo"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    precio_ars = Column(DECIMAL(10, 2), nullable=True)
    precio_usd = Column(DECIMAL(10, 2), nullable=True)
    duracion_minutos = Column(Integer, default=30)
    categoria = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)
```

**Regla**: al menos uno de `precio_ars` o `precio_usd` debe ser no-null.
**Soft-delete**: `DELETE` cambia `activo=false`. No se borra físicamente
porque turnos históricos pueden referenciarlo.

### ObraSocial

```python
class ObraSocial(Base):
    __tablename__ = "obras_sociales"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), unique=True, nullable=False)
    activo = Column(Boolean, default=True)
```

**Relación con Paciente**: `Paciente.obra_social` sigue como String (texto libre).
El selector usa el catálogo como fuente, pero guarda el texto. Si una obra social
se elimina del catálogo, los pacientes que la tenían no se rompen.

### Seed inicial

```python
OBRAS_SOCIALES_SEED = [
    "Particular",
    "OSDE",
    "Swiss Medical",
    "Galeno",
    "Medicus",
    "Sancor Salud",
    "OMINT",
]
```

## 2. Endpoints

### Catálogo de Tratamientos (`/catalogo`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/catalogo/tratamientos` | público | Listar activos. Query params: `?categoria=X` |
| GET | `/catalogo/tratamientos/{id}` | público | Obtener uno |
| POST | `/catalogo/tratamientos` | admin+secretaria | Crear |
| PUT | `/catalogo/tratamientos/{id}` | admin+secretaria | Actualizar |
| DELETE | `/catalogo/tratamientos/{id}` | admin | Soft-delete (activo=false) |

### Catálogo de Obras Sociales (`/catalogo`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/catalogo/obras-sociales` | público | Listar activas |
| POST | `/catalogo/obras-sociales` | admin | Crear |
| PUT | `/catalogo/obras-sociales/{id}` | admin | Actualizar nombre |
| DELETE | `/catalogo/obras-sociales/{id}` | admin | Soft-delete |

**¿Por qué GET es público?** El portal de autogestión (CHANGE-007) necesita
listar tratamientos y obras sociales sin auth. El rate limiting de CHANGE-009
protege estos endpoints.

## 3. Schemas Pydantic

```python
# schemas/catalogo.py

class TratamientoCatalogoCreate(BaseModel):
    nombre: str
    precio_ars: Optional[Decimal] = None
    precio_usd: Optional[Decimal] = None
    duracion_minutos: int = 30
    categoria: Optional[str] = None

    @model_validator(mode="after")
    def al_menos_un_precio(self):
        if self.precio_ars is None and self.precio_usd is None:
            raise ValueError("Debe especificar al menos un precio (ARS o USD)")
        return self

class TratamientoCatalogoUpdate(BaseModel):
    nombre: Optional[str] = None
    precio_ars: Optional[Decimal] = None
    precio_usd: Optional[Decimal] = None
    duracion_minutos: Optional[int] = None
    categoria: Optional[str] = None
    activo: Optional[bool] = None

class TratamientoCatalogoResponse(BaseModel):
    id: int
    nombre: str
    precio_ars: Optional[Decimal]
    precio_usd: Optional[Decimal]
    duracion_minutos: int
    categoria: Optional[str]
    activo: bool
    class Config: from_attributes = True

class ObraSocialCreate(BaseModel):
    nombre: str

class ObraSocialResponse(BaseModel):
    id: int
    nombre: str
    activo: bool
    class Config: from_attributes = True
```

## 4. Integración en modal de turno (AgendaPage)

```
Al cerrar turno (PUT /turnos/{id}/cerrar):

┌─────────────────────────────────────────┐
│ Cerrar Turno                            │
│                                         │
│ Tratamiento: [▼ Selector               ]│
│   ┌─ Limpieza dental (ARS $5000)       │
│   ├─ Extracción simple (ARS $8000)     │
│   ├─ Conducto (USD $150)               │
│   ├─ Corona (USD $300)                 │
│   ├─ ─────────────                     │
│   └─ ✏️ Servicio Manual                │
│                                         │
│ Si elige "Servicio Manual":            │
│   Descripción: [____________]           │
│   Precio ARS:  [____________]           │
│   Precio USD:  [____________]           │
│                                         │
│ Si elige del catálogo:                 │
│   Precio ARS:  [5000]    (editable)     │
│   Precio USD:  [_____]   (editable)     │
└─────────────────────────────────────────┘
```

**Comportamiento**:
- Al seleccionar del catálogo, los precios se precargan pero son editables.
- La secretaria puede modificar el precio (descuento, recargo).
- "Servicio Manual" muestra campos de texto libre (comportamiento actual).

## 5. Frontend — CatalogoPage.tsx

Página para admin/secretaria. Tabla con:

```
┌──────────────────────────────────────────────────────────┐
│ Catálogo de Tratamientos                     [+ Nuevo]   │
├──────────────────────────────────────────────────────────┤
│ Nombre          │ ARS     │ USD   │ Dur.  │ Categoría   │
├──────────────────────────────────────────────────────────┤
│ Limpieza dental │ $5.000  │ —     │ 30min │ General      │✎ 🗑│
│ Extracción      │ $8.000  │ $80   │ 45min │ Cirugía      │✎ 🗑│
│ Conducto        │ —       │ $150  │ 60min │ Endodoncia   │✎ 🗑│
└──────────────────────────────────────────────────────────┘
```

- Click en fila → modal de edición
- Botón [+ Nuevo] → modal de creación
- 🗑 → soft-delete (admin)
- Filtro por categoría

## 6. Orden de construcción

1. Modelos en `models.py`
2. Schemas en `schemas/catalogo.py`
3. CRUD en `crud/catalogo.py`
4. Router en `routers/catalogo.py`
5. Registrar en `main.py`
6. Seed de obras sociales
7. Frontend: `CatalogoPage.tsx`
8. Frontend: integración en modal de AgendaPage
