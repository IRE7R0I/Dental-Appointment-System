# OdontoGest — Base de Conocimiento

> Generada desde `docs/` — Mayo 2026

Sistema de gestión integral para consultorio odontológico.
Backend FastAPI + Frontend React/TS + PostgreSQL.

---

## Índice

| # | Archivo | Contenido |
|---|---------|-----------|
| 01 | [`01_vision_y_objetivos.md`](./01_vision_y_objetivos.md) | Propósito, objetivos por actor, alcance v2.x |
| 02 | [`02_descripcion_general.md`](./02_descripcion_general.md) | Stack tecnológico, arquitectura, integraciones |
| 03 | [`03_actores_y_roles.md`](./03_actores_y_roles.md) | Roles (2), RBAC, permisos, rutas públicas |
| 04 | [`04_modelo_de_datos.md`](./04_modelo_de_datos.md) | Entidades, ERD, relaciones, seed data |
| 05 | [`05_reglas_de_negocio.md`](./05_reglas_de_negocio.md) | Reglas codificadas (RN-XX), horarios, monedas |
| 06 | [`06_funcionalidades.md`](./06_funcionalidades.md) | Historias de usuario, features completadas y pendientes |
| 07 | [`07_flujos_principales.md`](./07_flujos_principales.md) | Flujos extremo a extremo: turno interno, portal guest checkout, aprobación |
| 08 | [`08_arquitectura_propuesta.md`](./08_arquitectura_propuesta.md) | Patrones, estructura de directorios, seguridad, env vars, deploy |
| 09 | [`09_decisiones_y_supuestos.md`](./09_decisiones_y_supuestos.md) | Decisiones de diseño, tradeoffs, supuestos |
| 10 | [`10_preguntas_abiertas.md`](./10_preguntas_abiertas.md) | Inconsistencias, preguntas sin resolver, riesgos |

---

## Roadmap de implementación

```
✅ Completado: CHANGE-001 al CHANGE-005 (backend + frontend base)
✅ Completado: INIT-001 al INIT-005 (mejoras post-migración)

Pendiente (en orden):
  CHANGE-009 → Auth JWT (admin + secretaria) + rate limiting + security headers
  CHANGE-011 → Catálogo de Tratamientos y Obras Sociales
  CHANGE-007 → Portal Guest Checkout (stepper, shadow profiles, UUID, panel aprobación)
  CHANGE-006 → Notificaciones (email + WhatsApp + bot)
  CHANGE-008 → Reportes Excel
  CHANGE-010 → Deploy a producción
```

## Fuentes

- `docs/Integrador.txt` — guía de integración para agentes IA
- `docs/Descripcion.txt` — descripción del proyecto
- `docs/Historias_de_usuario.txt` — historias de usuario
- `docs/CHANGES.md` — registro de cambios OpenSpec
- `docs/pasos_instalar.txt` — instrucciones de instalación
