# 11 — Roadmap y Plan de Sprints

Mapa completo de implementación derivado de `docs/CHANGES.md`.

---

## Orden de ejecución

| # | Change | US | RN | Depende de | Complejidad | Estado |
|---|--------|----|----|------------|-------------|--------|
| 1 | `project-setup` | HU-005, HU-006 | — | — | Media | ✅ |
| 2 | `gestion-pacientes-y-turnos` | HU-001 | RN-01,02,03 | 1 | Media | ✅ |
| 3 | `finanzas-y-caja-diaria` | HU-002, HU-003 | RN-04,05,11 | 2 | Alta | ✅ |
| 4 | `cuentas-corrientes-y-deudores` | HU-004 | — | 3 | Media | ✅ |
| 5 | `historial-y-mejoras-frontend` | HU-004 | — | 4 | Media | ✅ |
| 6 | `auth-y-autorizacion` | HU-007 | RN-10,12 | 1 | Alta | ✅ |
| 7 | `catalogo-tratamientos` | HU-001 | RN-04,07 | 6 | Media | ✅ |
| 8 | `portal-autogestion` | HU-008, 008b | RN-01,02,06,08,13 | 7 | Alta | 🔲 |
| 9 | `notificaciones` | HU-009 | RN-09 | 8 | Media | 🔲 |
| 10 | `reportes-excel` | HU-010 | — | 6 | Baja | 🔲 |
| 11 | `polish-y-deploy` | — | — | 8,9,10 | Alta | 🔲 |

## Tabla de dependencias

```
project-setup ──┬── gestion-pacientes-y-turnos ── finanzas-y-caja-diaria ── cuentas-corrientes-y-deudores ── historial-y-mejoras-frontend
                │
                └── auth-y-autorizacion ──┬── catalogo-tratamientos ── portal-autogestion ── notificaciones
                                          │
                                          └── reportes-excel ──────────────────────────────────────────┐
                                                                                                        │
                        todos ────────────────────────────────────────────────────────────────── polish-y-deploy
```

## Plan de Sprints

| Sprint | Changes | Días |
|--------|---------|------|
| Sprint 1 | `project-setup` + `gestion-pacientes-y-turnos` | 3-4 |
| Sprint 2 | `finanzas-y-caja-diaria` | 2-3 |
| Sprint 3 | `cuentas-corrientes-y-deudores` + `historial-y-mejoras-frontend` | 3-4 |
| Sprint 4 | `auth-y-autorizacion` | 3-4 |
| Sprint 5 | `catalogo-tratamientos` | 2 |
| Sprint 6 | `portal-autogestion` | 3-4 |
| Sprint 7 | `notificaciones` | 2-3 |
| Sprint 8 | `reportes-excel` (paralelo con 6-7) | 1-2 |
| Sprint 9 | `polish-y-deploy` | 2-3 |

## Riesgos identificados

1. **portal-autogestion** (change 8): el más complejo. Stepper 4 pasos, shadow profiles, UUID, panel aprobación, bloqueo slots, validación horaria. 22+ tareas. Scope creep risk.
2. **Migración estados turno**: de 3 estados simplificados a 7. Preservar datos existentes.
3. **notificaciones** (change 9): mock inicial, real en deploy. APIs de WhatsApp requieren verificación y tienen costo.
4. **polish-y-deploy**: bloqueado hasta que todos los anteriores estén completos.
