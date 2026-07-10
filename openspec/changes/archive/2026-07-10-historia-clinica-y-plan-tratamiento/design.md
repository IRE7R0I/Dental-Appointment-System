# Design: historia-clinica-y-plan-tratamiento

## Context

El backend actual (`v0.3.0`) tiene modelo `HistoriaClinica` con un solo campo `notas` (Text) y FK a paciente, pero **cero endpoints** para interactuar con él. La ficha de paciente en el frontend viejo guarda notas clínicas en `localStorage` del navegador — si la secretaria cambia de máquina, pierde todo (hallazgo 6.2 de `AUDITORIA_BACKEND.md`).

`frontend2/` ya tiene diseñadas las vistas de ficha de paciente (blueprint secciones 2.5 y 2.6) con: banner de alertas médicas, tarjetas de resumen (Hallazgos, Pendientes, Evoluciones, Imágenes), tabs de evoluciones clínicas, y plan de tratamiento. Pero el backend no tiene endpoints para alimentar esas vistas.

La clínica usa una tarjeta de registro física en papel con columnas: Día, Prestación, Pieza Dental, Ubicación de Lesión, Observaciones, Conformidad Paciente. Este change digitaliza ese registro.

## Goals / Non-Goals

**Goals:**
- Persistir alertas médicas, evoluciones clínicas y plan de tratamiento en base de datos con endpoints REST.
- Proveer endpoint de resumen para alimentar las 4 tarjetas de la ficha de paciente en frontend2.
- Resolver definitivamente el hallazgo 6.2 de la auditoría (localStorage → DB).
- Mantener compatibilidad con el modelo de auth/roles existente (admin + secretaria).

**Non-Goals:**
- No tocar el modelo `HistoriaClinica` existente ni agregarle endpoints. Queda como está.
- No migrar estados de turno a 7 valores (eso es C-08).
- No implementar odontograma, imágenes, ni recetas.
- No tocar `frontend/` (el viejo).

## Decisions

### 1. Tres tablas separadas, no una tabla monolítica

**Alternativas consideradas:**
- **A) Tabla única `ficha_clinica`** con columnas para todo: alertas como JSON, evoluciones como JSON array, plan como JSON array. Simple de modelar pero imposible de querear, validar por columna o indexar. Descartado.
- **B) Extender `HistoriaClinica` existente**: la tabla ya existe con `notas` (Text) y `dni_paciente`. Pero es 1:1 con paciente, no soporta múltiples evoluciones, y mezcla conceptos (alerta ≠ evolución ≠ plan). Descartado.
- **C) Tres tablas independientes ✅**: `alertas_medicas`, `evoluciones_clinicas`, `plan_tratamiento_items`. Cada una con su FK a paciente, su propio CRUD, índices específicos. Elegido por claridad semántica, facilidad de query, y extensibilidad futura.

### 2. `ubicacion_lesion` como string comma-separated, no array

**Alternativas:**
- **A) PostgreSQL ARRAY**: ideal si solo usáramos PostgreSQL. Pero el proyecto usa SQLite en dev local. Rompería el entorno de desarrollo. Descartado.
- **B) Tabla separada `evolucion_ubicaciones`**: normalización pura, pero overhead innecesario para 8 valores posibles que rara vez se consultan individualmente. Over-engineering.
- **C) String comma-separated ✅**: `"O,D,M"`. Portable (SQLite + PostgreSQL), simple de parsear (`.split(",")` en frontend y Python), suficiente para el caso de uso real. Los códigos son: O-Oclusal, D-Distal, G-Gingival, L-Lingual, M-Mesial, I-Incisal, V-Vestibular, P-Palatino.

### 3. `pieza_dental` como Integer (FDI 11-48)

**Alternativas:**
- **A) String**: flexible para notaciones no estándar, pero sin validación de rango. Menos performante para ordenamiento.
- **B) Integer 1-32**: más simple pero no es el estándar odontológico real (FDI usa dos dígitos: cuadrante + diente).
- **C) Integer (FDI 11-48) ✅**: estándar real de la odontología. Cabe en int. Validable con rango `11 <= n <= 48` (excluyendo gaps). Ordenable numéricamente. Nullable porque consultas generales no tienen pieza asociada.

### 4. `id_tratamiento` como FK opcional al catálogo

**Alternativas:**
- **A) FK obligatoria**: todo ítem del plan debe estar en el catálogo. Rígido, obliga a crear entradas en catálogo para tratamientos únicos o personalizados. Descartado.
- **B) Sin FK, solo texto libre**: perdés la capacidad de estimar costo total y de vincular con precios del catálogo. Descartado.
- **C) FK opcional ✅**: si el ítem viene del catálogo → `id_tratamiento` poblado, se puede calcular monto estimado. Si es personalizado → `id_tratamiento = null`, `descripcion` tiene el texto. Máxima flexibilidad.

### 5. Nuevo router `historia_clinica.py`, no extender `pacientes.py`

**Alternativas:**
- **A) Extender `pacientes.py`**: todo junto, menos archivos. Pero el router ya tiene 86 líneas, crecería a 250+. Responsabilidad difusa (CRUD paciente + datos clínicos).
- **B) Nuevo router `historia_clinica.py` ✅**: separación clara. Prefijo `/pacientes/{dni}/...` consistente con el router existente. Archivos más cortos, más fáciles de mantener. Misma dependencia de auth (`require_role(["admin", "secretaria"])`).

### 6. Modelo `HistoriaClinica` existente: no se toca

El modelo fue creado en C-01 (`foundation-setup`). Tiene relación 1:1 con Paciente y un campo `notas` (Text). No tiene endpoints. Decisión: dejarlo intacto. Borrarlo requeriría migración destructiva y podría romper código que lo referencie. El nuevo modelo `evoluciones_clinicas` lo reemplaza funcionalmente sin necesidad de eliminarlo.

### 7. `fecha` como columna independiente en `evoluciones_clinicas`

**Motivación**: `id_turno` es nullable (para migrar registros históricos de la tarjeta de papel que no tienen turno digital). Pero la tarjeta física siempre tiene la columna "Día". Sin una columna `fecha` independiente, las evoluciones sin turno no tendrían fecha registrada.

**Validación condicional en RN-16**:
- Si `id_turno` presente → validar que `turno.estado == "Asistió"` y que `fecha == turno.fecha_hora.date()`.
- Si `id_turno` es null → `fecha` se ingresa manualmente, sin validación de turno (migración papel).

### 8. Creación de tablas: extender `crear_tablas.py`

El proyecto no usa Alembic (hallazgo 2 de auditoría). Usa `crear_tablas.py` que verifica existencia de columnas con SQL crudo. Para este change:
- Agregar funciones de creación condicional para las 3 tablas nuevas en `crear_tablas.py`.
- `Base.metadata.create_all()` en `main.py` también las creará en entornos nuevos, pero `crear_tablas.py` asegura que SQLite existente reciba las columnas.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| `ubicacion_lesion` como string permite valores inválidos (typos como "X,Y,Z") | Validación en schema Pydantic con regex o `field_validator` que solo acepte O,D,G,L,M,I,V,P separados por coma |
| `pieza_dental` sin FK a tabla de dientes permite valores fuera de rango FDI | Validación con `field_validator` en Pydantic: `11 <= n <= 48` |
| `id_tratamiento` opcional → items del plan sin precio no suman al monto estimado | Aceptable. El frontend muestra `--` o "No estimado" para esos items. Documentado en RN-17 |
| Tres tablas nuevas = tres juegos de endpoints = más superficie de testing | Cada módulo testeado independientemente en `test_historia_clinica.py` con DB real |
| Sin Alembic → migración manual en `crear_tablas.py` | Patrón consistente con el resto del proyecto. Alembic se agrega en C-11 (`polish-y-deploy`) |

## Migration Plan

1. **Deploy**: Agregar modelos a `models.py`, schemas a `schemas/historia_clinica.py`, router, crud.
2. **Tablas**: `crear_tablas.py` verifica y crea las 3 tablas condicionalmente. `Base.metadata.create_all()` en startup para entornos nuevos.
3. **Rollback**: No hay migración de datos desde localStorage (los datos en localStorage son efímeros y no se migran). Rollback = revertir código, las tablas quedan pero sin endpoints no se usan.
4. **Sin downtime**: Solo se agregan tablas y endpoints. Nada modifica comportamiento existente.

## Open Questions

- **Q1**: ¿Conviene agregar un endpoint `GET /pacientes/{dni}/evoluciones?fecha_desde=&fecha_hasta=` con filtro por rango de fechas, o el listado completo es suficiente? El listado completo alcanza para la ficha de paciente en frontend2, pero filtro por fecha sería útil para auditoría.
- **Q2**: ¿El plan de tratamiento debe soportar reordenamiento drag-and-drop desde el frontend? El campo `orden` (int) lo permite técnicamente, pero requiere endpoint `PUT /plan-tratamiento/reordenar` con batch update. No está en el scope de este change.
