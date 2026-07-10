# C-14: Historia Clínica y Plan de Tratamiento — Resumen de Implementación

> Change archivado el 2026-07-10. 19 tests pasando, validación OpenSpec OK.

---

## 1. ¿Qué se implementó?

Backend completo para la ficha clínica del paciente (reemplaza `localStorage` — hallazgo 6.2 de auditoría).

### 1.1 Alertas Médicas (`/pacientes/{dni}/alertas`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /pacientes/{dni}/alertas` | Listar | Todas las alertas del paciente |
| `POST /pacientes/{dni}/alertas` | Crear | Nueva alerta (tipo + descripción) |
| `DELETE /pacientes/{dni}/alertas/{id}` | Eliminar | Baja física de alerta |

### 1.2 Evoluciones Clínicas (`/pacientes/{dni}/evoluciones`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /pacientes/{dni}/evoluciones` | Listar | Historial de evoluciones |
| `POST /pacientes/{dni}/evoluciones` | Crear | Nueva evolución (RN-16: turno "Asistió" o fecha manual) |
| `PUT /pacientes/{dni}/evoluciones/{id}` | Corregir | Edición con auditoría (actualizado_por_id + actualizado_en) |

### 1.3 Plan de Tratamiento (`/pacientes/{dni}/plan-tratamiento`)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /pacientes/{dni}/plan-tratamiento` | Listar | Items del plan |
| `POST /pacientes/{dni}/plan-tratamiento` | Crear | Nuevo item (desde catálogo o texto libre) |
| `PUT /pacientes/{dni}/plan-tratamiento/{id}/estado` | Cambiar estado | pendiente ↔ completado |
| `DELETE /pacientes/{dni}/plan-tratamiento/{id}` | Eliminar | Baja física |

### 1.4 Resumen del Paciente

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `GET /pacientes/{dni}/resumen` | GET | Conteos: evoluciones, pendientes, monto estimado ARS/USD, hallazgos=null, imagenes=null |

---

## 2. Archivos creados/modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `backend/models.py` | Modificado | +3 modelos: `AlertaMedica`, `EvolucionClinica`, `PlanTratamientoItem`. Relaciones en `Paciente`. |
| `backend/schemas/historia_clinica.py` | Creado | 10 schemas Pydantic v2 con validadores FDI 11-48 y códigos de lesión O/D/G/L/M/I/V/P |
| `backend/crud/historia_clinica.py` | Creado | 11 funciones CRUD con validación RN-16 y cálculo de montos estimados |
| `backend/routers/historia_clinica.py` | Creado | 11 endpoints bajo `/pacientes/{dni}/...` protegidos admin/secretaria |
| `backend/main.py` | Modificado | Router registrado |
| `backend/tests/test_historia_clinica.py` | Creado | 19 tests de integración con base de datos real |
| `knowledge-base/04_modelo_de_datos.md` | Modificado | +3 tablas documentadas |
| `knowledge-base/05_reglas_de_negocio.md` | Modificado | +RN-15 a RN-18 |
| `crear_tablas.py` | Modificado | Imports de los 3 nuevos modelos |
| `openspec/specs/historia-clinica/spec.md` | Creado | Especificación técnica del módulo |
| `CHANGES.md` | Modificado | C-14 marcado completado. 9/14 changes completados. |
| `AGENTS.md` | Modificado | Sección 4 actualizada. Próximo: C-13. |

---

## 3. Reglas de Negocio Implementadas

| RN | Descripción |
|----|-------------|
| **RN-15** | Alertas médicas: solo admin/secretaria pueden crear/listar/eliminar |
| **RN-16** | Evoluciones: si `id_turno` está presente → turno debe estar "Asistió". Si `id_turno` es null → fecha manual (migración papel). Corrección registra auditoría. |
| **RN-17** | Plan de tratamiento: items con FK al catálogo permiten estimación de costo total |
| **RN-18** | No exponer datos clínicos (DNI, email, teléfono, historial) en logs o mensajes de error |

---

## 4. Tests (19 tests, 100% pasando)

### 4.1 Fixtures
- `sample_paciente` — paciente DNI 12345678
- `sample_doctor` — Dr. Perez
- `admin_user` / `admin_token` / `headers_admin` — usuario admin autenticado
- `sample_turno_asistio` — turno en estado "Asistió"
- `sample_turno_pendiente` — turno en estado "Pendiente"
- `sample_tratamiento_catalogo` — tratamiento "Consulta Odontológica" ($5000 ARS)

### 4.2 Tests de Alertas (4 tests)
| Test | Qué verifica |
|------|-------------|
| `test_crear_alerta` | POST 201, tipo/descripcion correctos, creado_en presente |
| `test_listar_alertas` | GET 200, lista con 1 alerta |
| `test_eliminar_alerta` | DELETE 200, luego GET 0 alertas |
| `test_eliminar_alerta_not_found` | DELETE 404 si ID inexistente |

### 4.3 Tests de Evoluciones (6 tests)
| Test | Qué verifica |
|------|-------------|
| `test_crear_evolucion_con_turno_asistio` | POST 201 con turno "Asistió", observaciones y fecha OK |
| `test_rechazar_evolucion_con_turno_pendiente` | POST 400 si turno está "Pendiente" (mensaje "Asistió") |
| `test_crear_evolucion_sin_turno` | POST 201 sin turno, fecha manual, id_turno null |
| `test_corregir_evolucion` | PUT 200, observaciones update, actualizado_por_id no null |
| `test_validar_pieza_dental_fuera_rango` | POST 422 si pieza 99 (fuera de 11-48 FDI) |
| `test_validar_ubicacion_lesion_invalida` | POST 422 si código "X,Z" (no válido) |

### 4.4 Tests de Plan de Tratamiento (4 tests)
| Test | Qué verifica |
|------|-------------|
| `test_crear_item_plan_desde_catalogo` | POST 201 con `id_tratamiento` (descripción se resuelve del catálogo) |
| `test_crear_item_plan_texto_libre` | POST 201 con descripción manual |
| `test_cambiar_estado_plan` | PUT 200, estado cambiado a "completado" |
| `test_eliminar_item_plan` | DELETE 200 |

### 4.5 Tests de Resumen (3 tests)
| Test | Qué verifica |
|------|-------------|
| `test_resumen_con_datos` | GET 200, evoluciones=1, pendientes=1, monto_estimado="$5000.00" |
| `test_resumen_sin_datos` | GET 200, evoluciones=0, pendientes=0, monto_estimado=0 |
| `test_resumen_paciente_no_encontrado` | GET 404 si DNI inexistente |

### 4.6 Tests de Seguridad (2 tests)
| Test | Qué verifica |
|------|-------------|
| `test_no_auth_returns_401` | 7 endpoints sin token → 401 |
| `test_hallazgos_imagenes_null` | Resumen con hallazgos=null, imagenes=null |

---

## 5. Decisiones Técnicas

| Decisión | Opción elegida | Alternativas descartadas |
|----------|---------------|------------------------|
| Estructura de tablas | 3 tablas separadas (alertas, evoluciones, plan) | Una tabla polimórfica / extender HistoriaClinica existente |
| `ubicacion_lesion` | Comma-separated string (O,D,G,L,M,I,V,P) | PostgreSQL ARRAY / tabla separada |
| `pieza_dental` | Integer FDI 11-48 (nullable) | String / rango 1-32 |
| `id_tratamiento` | FK opcional a `tratamientos_catalogo` | Solo texto libre / solo FK |
| `fecha` en evoluciones | Columna independiente (siempre seteada) | Derivada siempre del turno |
| Router | Nuevo `historia_clinica.py` | Extender `pacientes.py` |

---

## 6. Fixes Post-Tests (bugs encontrados y corregidos)

| Problema | Causa | Fix |
|----------|-------|-----|
| 404 en tests de alertas/evoluciones/plan | Tests sin `sample_paciente` fixture → router `_verificar_paciente()` devuelve 404 | Agregar `sample_paciente` a 10 tests |
| 422 en `test_crear_item_plan_desde_catalogo` | `descripcion: str` required en schema, pero test envía solo `id_tratamiento` | Cambiar a `Optional[str] = None` (CRUD ya resuelve del catálogo) |
| `assert data["pendientes_monto_estimado_ars"] == 5000.0` | Pydantic v2 serializa Decimal como string JSON ("5000.00") | Cambiar assertion a `"5000.00"` |
| SQLite NOT NULL al crear plan sin descripción | CRUD no validaba caso `descripcion=None` + `id_tratamiento=None` | Agregar `ValueError` guard en CRUD + try/except en router |
| bcrypt/passlib falla en Windows | bcrypt 5.x incompatible con passlib | Instalar `bcrypt<4.1` (bcrypt 4.0.1) |

---

## 7. Comandos Útiles

```bash
# Ejecutar tests
.\.venv\Scripts\python -m pytest backend/tests/test_historia_clinica.py -v

# Validar change (OpenSpec)
openspec validate historia-clinica-y-plan-tratamiento

# Ver estado del cambio archivado
openspec status --change "2026-07-10-historia-clinica-y-plan-tratamiento" --json
```

---

*Generado el 2026-07-10 — OdontoGest C-14*
