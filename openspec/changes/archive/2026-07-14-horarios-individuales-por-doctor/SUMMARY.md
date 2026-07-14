# C-16: Horarios Individuales por Doctor — Summary

## Qué se hizo

Reemplazar el horario global único de la clínica por un patrón semanal **por doctor** más excepciones por fecha (`DiaNoLaborableDoctor`).

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `backend/models.py` | + `HorarioDoctor` (7 filas/doctor, dia_semana + franjas mañana/tarde), + `DiaNoLaborableDoctor` (excepciones por fecha) |
| `backend/schemas/horarios.py` | + `DiaHorarioEntry`, `HorarioDoctorResponse`, `HorarioDoctorUpdate`, `DiaNoLaborableCreate/Response` |
| `backend/crud/horarios_doctor.py` | CRUD completo: guardar/obtener horario semanal, seed, agregar/listar/eliminar días no laborables |
| `backend/core/horarios.py` | + `cargar_horario_doctor`, `generar_slots_doctor`, `es_hora_valida_doctor`, `es_dia_laboral_doctor`, `obtener_horarios_doctor_publico`. `HORARIOS` → `HORARIOS_DEFAULT` (solo seeding) |
| `backend/routers/doctores.py` | + 5 endpoints: GET/PUT horarios, GET/POST/DELETE días-no-laborables |
| `backend/routers/turnos.py` | Validación switches a `es_hora_valida_doctor` |
| `backend/crud/turnos.py` | Slot generation switches a `generar_slots_doctor` |
| `backend/crud/doctores.py` | Seed automático al crear doctor |
| `crear_tablas.py` | Migración para doctores existentes |
| `knowledge-base/04_modelo_de_datos.md` | Tablas nuevas documentadas |
| `knowledge-base/05_reglas_de_negocio.md` | RN-01 reescrita |

## Tests — 92/92 pass

```
backend/tests/test_horarios_doctor.py ............. 25/25 ✅
  ├── TestHorariosDoctorModel  — seed, CRUD, guardar, días no laborables
  ├── TestHorariosDoctorAPI   — GET/PUT horarios, roles admin/secretaria
  ├── TestDiasNoLaborablesAPI — crear, duplicados, listar, eliminar, 403
  ├── TestImpactoEnTurnos     — slots, crear turno, bloquear, día no laborable
  └── TestDoctorSeeding       — auto-seed al crear doctor

Suite completa: 92 passed (no regresiones)
```

## Bugs corregidos durante testing

1. `guardar_horario_semanal` usaba `.get("key")` en Pydantic models → normaliza con `model_dump()`
2. `obtener_horarios_doctor_publico` usaba `"mañana"` (acentuado) → cambiado a `"manana"` matcheando schema
3. Nombres de día `NOMBRES_DIAS` con acentos vs input sin acentos → usa `DIA_SEMANA_KEYS`
