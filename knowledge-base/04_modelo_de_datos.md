# 04 — Modelo de Datos

## Diagrama de entidades

```
┌──────────────┐       ┌──────────────┐       ┌────────────────────┐
│   Paciente   │1────*│    Turno     │*────1│      Doctor         │
│              │       │              │       │                    │
│ dni (PK)     │       │ id (PK)      │       │ id (PK)            │
│ nombre       │       │ fecha_hora   │       │ nombre             │
│ apellido     │       │ estado       │       │ color_agenda       │
│ telefono     │       │ motivo       │       └────────────────────┘
│ email        │       │ uuid         │
│ obra_social  │       │ obra_social  │       ┌────────────────────┐
│ fecha_nac    │       │ motivo_rech  │*────1│TratamientoCatalogo │
└──────┬───────┘       │ dni_pac (FK) │       │                    │
       │1              │ id_doctor(FK)│       │ id (PK)            │
       │               │ id_trat (FK) │       │ nombre             │
       │               └──────┬───────┘       │ precio_ars         │
       │                      │               │ precio_usd         │
       │                      │1              │ duracion_min       │
       │               ┌──────┴───────┐       │ categoria          │
       │               │      *       │       │ activo             │
       ├───────────────│ Pago         │       └────────────────────┘
       │1              │              │
       │               │ id (PK)      │       ┌────────────────────┐
       │               │ monto        │       │   ObraSocial       │
       │               │ moneda       │       │                    │
       │               │ metodo_pago  │       │ id (PK)            │
       │               │ fecha_pago   │       │ nombre             │
       │               │ id_turno(FK) │       │ activo             │
       │               │ dni_pac (FK) │       └────────────────────┘
       │               └──────────────┘
       │                                      ┌────────────────────┐
       ├──────────────────────────────1│       │    Usuario         │
       │               ┌──────────────┴───┐   │                    │
       │               │ CuentaCorriente  │   │ id (PK)            │
       │               │                  │   │ username           │
       │               │ id (PK)          │   │ hashed_password    │
       │               │ dni_paciente(FK) │   │ rol                │
       │               │ saldo_ars        │   │ activo             │
       │               │ saldo_usd        │   │ creado_en          │
       │               └────────┬─────────┘   └────────────────────┘
       │                        │1
       │               ┌────────┴─────────┐   ┌────────────────────┐
       │               │ MovimientoCuenta │   │  HistoriaClinica   │
       │               │                  │   │                    │
       │               │ id (PK)          │   │ id (PK)            │
       │               │ tipo (cargo/pago)│   │ notas              │
       │               │ monto            │   │ dni_paciente (FK)  │
       │               │ moneda           │   └────────────────────┘
       │               │ descripcion      │
       │               │ id_cuenta (FK)   │
       │               └──────────────────┘
       │
       │1               ┌──────────────────┐
       └────────────────│ TurnoTratamiento │
                        │                  │
                        │ id (PK)          │
                        │ nombre           │
                        │ cantidad         │
                        │ precio_ars       │
                        │ precio_usd       │
                        │ id_turno (FK)    │
                        └──────────────────┘
```

## Entidades

### Paciente (`pacientes`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `dni` | String(20) PK | Identificador único |
| `nombre` | String(100) | Requerido |
| `apellido` | String(100) | Requerido |
| `fecha_nacimiento` | Date | Opcional |
| `telefono` | String(20) | Usado para WhatsApp |
| `email` | String(100) | Opcional, para notificaciones |
| `obra_social` | String(100) | Texto libre, se completa desde catálogo |

### Doctor (`doctores`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | Autoincremental |
| `nombre` | String(100) | Requerido (Darío, Fabiana) |
| `color_agenda` | String(7) | Hex (#FF5733) |
| `activo` | Boolean | Default True (soft-delete, CHANGE-009) |

### Turno (`turnos`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `fecha_hora` | DateTime | Requerido |
| `duracion_minutos` | Integer | Default 30 |
| `motivo` | String(255) | |
| `estado` | String(50) | solicitado, pendiente, bloqueado, realizado, cancelado, rechazado |
| `uuid` | String(36) | Único, UUID4, para acceso público (CHANGE-007) |
| `motivo_rechazo` | Text | Nullable (CHANGE-007) |
| `id_tratamiento` | Integer FK | → tratamientos_catalogo.id (CHANGE-007) |
| `obra_social` | String(100) | (CHANGE-007) |
| `dni_paciente` | String(20) FK | → pacientes.dni |
| `id_doctor` | Integer FK | → doctores.id |
| `creado_por_id` | Integer FK | → usuarios.id, auditoría multi-secretaria (CHANGE-009) |
| `actualizado_por_id` | Integer FK | → usuarios.id, última modificación (CHANGE-009) |

### TratamientoCatalogo (`tratamientos_catalogo`) — CHANGE-011
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `nombre` | String(255) | Requerido |
| `precio_ars` | DECIMAL(10,2) | Nullable (al menos uno requerido) |
| `precio_usd` | DECIMAL(10,2) | Nullable (al menos uno requerido) |
| `duracion_minutos` | Integer | Default 30 |
| `categoria` | String(100) | Ej: General, Cirugía, Endodoncia |
| `activo` | Boolean | Default True (soft-delete) |

### ObraSocial (`obras_sociales`) — CHANGE-011
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `nombre` | String(100) | Único |
| `activo` | Boolean | Default True |

### Usuario (`usuarios`) — CHANGE-009
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `username` | String(50) | Único |
| `hashed_password` | String(255) | bcrypt |
| `rol` | String(20) | "admin" o "secretaria" |
| `activo` | Boolean | Default True |
| `creado_en` | DateTime | |

### Pago (`pagos`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `monto` | DECIMAL(10,2) | |
| `fecha_pago` | DateTime | |
| `metodo_pago` | String(50) | Efectivo, Transferencia |
| `moneda` | String(3) | ARS, USD |
| `id_turno` | Integer FK | Nullable |
| `dni_paciente` | String(20) FK | Nullable |

### CuentaCorriente (`cuentas_corrientes`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `dni_paciente` | String(20) FK | Único |
| `saldo_ars` | DECIMAL(10,2) | Default 0 |
| `saldo_usd` | DECIMAL(10,2) | Default 0 |

### MovimientoCuenta (`movimientos_cuenta`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `id_cuenta` | Integer FK | |
| `tipo` | String(20) | "cargo" o "pago" |
| `monto` | DECIMAL(10,2) | |
| `moneda` | String(3) | |
| `descripcion` | String(255) | |
| `fecha` | DateTime | |

## Seed data

### CHANGE-009
```python
# Usuario admin inicial
Usuario(username="admin", hashed_password=hash(ADMIN_PASSWORD), rol="admin")
```

### CHANGE-011
```python
OBRAS_SOCIALES = [
    "Particular", "OSDE", "Swiss Medical", "Galeno",
    "Medicus", "Sancor Salud", "OMINT",
]
```
