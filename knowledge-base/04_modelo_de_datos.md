# 04 — Modelo de Datos

## Diagrama de Entidad-Relación (resumen)

```
Paciente ──1──*── Turno ──*──1── Doctor
    │1               │1              │
    │                │               │
    ├──*── Pago      ├──*── TurnoTratamiento
    │                │
    ├──1── CuentaCorriente ──1──*── MovimientoCuenta
    │
    └──1── HistoriaClinica

Usuario (auth) ── independiente
TratamientoCatalogo ── independiente (referenciado por Turno opcionalmente)
ObraSocial ── independiente
```

## Entidades completas

### Paciente (`pacientes`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `dni` | String(20) PK | |
| `nombre` | String(100) | |
| `apellido` | String(100) | |
| `fecha_nacimiento` | Date | |
| `telefono` | String(20) | |
| `email` | String(100) | opcional |
| `obra_social` | String(100) | texto libre con selector |

### Doctor (`doctores`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `nombre` | String(100) | Darío, Fabiana |
| `color_agenda` | String(7) | Hex |
| `activo` | Boolean | soft-delete (CHANGE-009) |

### Turno (`turnos`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `fecha_hora` | DateTime | |
| `duracion_minutos` | Integer | default 30 |
| `estado` | String(50) | Pendiente/Asistió/Canceló (→ CHANGE-007) |
| `dni_paciente` | String(20) FK | |
| `id_doctor` | Integer FK | |
| `creado_por_id` | Integer FK | auditoría (CHANGE-009) |
| `actualizado_por_id` | Integer FK | auditoría (CHANGE-009) |
| **Pendientes CHANGE-007**: uuid, motivo_rechazo, id_tratamiento, obra_social, notificado_48h, notificado_2h |

### Pago (`pagos`)
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `monto` | DECIMAL(10,2) | |
| `moneda` | String(3) | ARS/USD |
| `metodo_pago` | String(50) | Efectivo/Transferencia |
| `fecha_pago` | DateTime | |
| `id_turno` | Integer FK | |
| `dni_paciente` | String(20) FK | nullable |

### CuentaCorriente (`cuentas_corrientes`)
| Campo | Tipo |
|-------|------|
| `id` | Integer PK |
| `dni_paciente` | String(20) FK, unique |
| `saldo_ars` | DECIMAL(10,2) |
| `saldo_usd` | DECIMAL(10,2) |

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

### TratamientoCatalogo (`tratamientos_catalogo`) — CHANGE-011
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `nombre` | String(255) | |
| `precio_ars` | DECIMAL(10,2) | nullable (al menos 1 requerido) |
| `precio_usd` | DECIMAL(10,2) | nullable |
| `duracion_minutos` | Integer | default 30 |
| `categoria` | String(100) | |
| `activo` | Boolean | soft-delete |

### ObraSocial (`obras_sociales`) — CHANGE-011
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `nombre` | String(100) | unique |
| `activo` | Boolean | soft-delete |

### C-014 Agregados: Historia Clínica

### AlertaMedica (`alertas_medicas`)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Integer PK | |
| `dni_paciente` | String(20) FK → pacientes.dni | index |
| `tipo` | String(50) | "alergia" o "condicion" |
| `descripcion` | String(255) | |
| `creado_en` | DateTime | |

### EvolucionClinica (`evoluciones_clinicas`)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Integer PK | |
| `fecha` | Date | NOT NULL, index |
| `id_turno` | Integer FK → turnos.id | nullable (papel sin turno) |
| `dni_paciente` | String(20) FK → pacientes.dni | index |
| `pieza_dental` | Integer | nullable, FDI 11-48 |
| `ubicacion_lesion` | String(100) | nullable, códigos separados por coma |
| `observaciones` | Text | |
| `conformidad_paciente` | Boolean | default False |
| `creado_por_id` | Integer FK → usuarios.id | |
| `actualizado_por_id` | Integer FK → usuarios.id | nullable |
| `creado_en` | DateTime | |
| `actualizado_en` | DateTime | nullable |

### Usuario (`usuarios`) — CHANGE-009
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | Integer PK | |
| `username` | String(50) | unique |
| `hashed_password` | String(255) | bcrypt |
| `rol` | String(20) | "admin" / "secretaria" |
| `activo` | Boolean | |
| `creado_en` | DateTime | |

### HistoriaClinica (`historias_clinicas`)
| Campo | Tipo |
|-------|------|
| `id` | Integer PK |
| `notas` | Text |
| `dni_paciente` | String(20) FK |

### TurnoTratamiento (`turnos_tratamientos`)
| Campo | Tipo |
|-------|------|
| `id` | Integer PK |
| `id_turno` | Integer FK |
| `nombre` | String(255) |
| `cantidad` | Integer |
| `precio_ars` | DECIMAL(10,2) |
| `precio_usd` | DECIMAL(10,2) |

## Seed data

**Admin**: creado por `crear_tablas.py`. Username/password desde `.env`.

**Obras Sociales**: Particular, OSDE, Swiss Medical, Galeno, Medicus, Sancor Salud, OMINT.

**Doctores**: Darío (#1e91ed), Fabiana (#FFFFFF). Creados en DB existente.

### C-015 Agregados: Imágenes / Radiografías

### CarpetaPaciente (`carpetas`)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Integer PK | |
| `dni_paciente` | String(20) FK → pacientes.dni | index |
| `nombre` | String(255) | nombre libre definido por el usuario |
| `creado_por_id` | Integer FK → usuarios.id | auditoría |
| `creado_en` | DateTime | |

### Imagen (`imagenes`)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Integer PK | |
| `id_carpeta` | Integer FK → carpetas.id | index |
| `nombre_original` | String(255) | nombre del archivo subido (con extensión original) |
| `tipo_mime` | String(50) | siempre "image/webp" (normalizado) |
| `tamano_bytes` | Integer | tamaño del WebP final comprimido |
| `es_radiografia` | Boolean | false = normal, true = radiografía (lossless) |
| `creado_por_id` | Integer FK → usuarios.id | auditoría |
| `creado_en` | DateTime | |

### ImagenContenido (`imagenes_contenido`)
| Campo | Tipo | Notas |
|---|---|---|
| `id_imagen` | Integer FK → imagenes.id PK | 1:1 con Imagen |
| `contenido` | LargeBinary | WebP comprimido |

**Almacenamiento temporal**: Los binarios se guardan en PostgreSQL (tabla separada de metadatos). Previsto migrar a Supabase Storage en deploy real. La capa de abstracción `AlmacenamientoArchivos` permite cambiar el backend sin modificar endpoints ni CRUD.

### C-016 Agregados: Horarios Individuales por Doctor

### HorarioDoctor (`horarios_doctor`)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Integer PK | |
| `id_doctor` | Integer FK → doctores.id | |
| `dia_semana` | Integer | 0=lunes..6=domingo |
| `manana_inicio` | Time | nullable, null = día cerrado si tarde también null |
| `manana_fin` | Time | nullable |
| `tarde_inicio` | Time | nullable |
| `tarde_fin` | Time | nullable |

UniqueConstraint: `(id_doctor, dia_semana)`. 7 filas por doctor.

### DiaNoLaborableDoctor (`dias_no_laborables_doctor`)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | Integer PK | |
| `id_doctor` | Integer FK → doctores.id | |
| `fecha` | Date | |
| `motivo` | String(255) | nullable (feriado, vacaciones, ausencia) |

UniqueConstraint: `(id_doctor, fecha)`. Si existe fila, el día se considera cerrado sin importar patrón semanal.
