# AGENTS.md — Odontogest

> Contrato de comportamiento del agente para este repositorio.
> Toda instrucción aquí tiene prioridad sobre el comportamiento default del agente.
> Última actualización: 2026-07-10

---

## 1. Stack Tecnológico

- **Backend**: Python 3.11 — FastAPI (RESTful API, OpenAPI automático)
- **Frontend**: React 19.x + TypeScript 6.x — Vite 8.x + Tailwind CSS 4.x + React Router v6
- **Base de datos**: PostgreSQL (producción) / SQLite (dev local) — ORM: SQLAlchemy 2.x
- **Auth**: JWT HS256 (python-jose) + bcrypt (passlib). Solo 2 roles internos: admin y secretaria. Pacientes sin cuenta (guest checkout con DNI + UUID v4).
- **Rate Limiting**: slowapi
- **Infraestructura**: Docker + Railway/Render (backend), Vercel (frontend), Railway PostgreSQL o Supabase free tier (DB), Alembic (migraciones)
- **Notificaciones** (CHANGE-009 planeado): APScheduler + Twilio/WhatsApp Cloud API + SMTP SendGrid
- **Reportes** (CHANGE-010 planeado): openpyxl
- **Testing**: pytest (planeado en polish-y-deploy)

---

## 2. Knowledge Base

La fuente de verdad del proyecto está en `knowledge-base/`.
Antes de proponer cualquier change, leé los archivos relevantes para el dominio que vas a tocar.

| Archivo | Cuándo leerlo |
|---|---|
| `01_vision_y_objetivos.md` | Siempre, antes del primer `/opsx:propose` |
| `02_descripcion_general.md` | Al empezar una sesión nueva |
| `03_actores_y_roles.md` | Al implementar auth o permisos |
| `04_modelo_de_datos.md` | Al crear/modificar modelos, migraciones o queries |
| `05_reglas_de_negocio.md` | Al implementar lógica de dominio |
| `06_funcionalidades.md` | Al proponer un change de feature |
| `07_flujos_principales.md` | Al implementar flujos end-to-end |
| `08_arquitectura_propuesta.md` | Al tomar decisiones de estructura o patrones |
| `09_decisiones_y_supuestos.md` | Antes de proponer alternativas de diseño |
| `10_preguntas_abiertas.md` | Cuando encontrés ambigüedad |
| `11_roadmap_y_plan_de_sprints.md` | Al planificar sprints o secuencia de trabajo |

---

## 3. Skills Instaladas

### kb-creator
- **Trigger**: cuando necesitás construir o actualizar la base de conocimiento del proyecto.
- **Comando**: "creá / actualizá la base de conocimiento"

### roadmap-generator
- **Trigger**: cuando necesitás generar o regenerar el CHANGES.md desde la KB.
- **Comando**: "generá el CHANGES.md del proyecto"

### find-skills
- **Trigger**: cuando el usuario pide buscar skills disponibles o instaladas.
- **Comando**: "buscá skills para [dominio]"

### Skills de Frontend
Las siguientes skills están instaladas en el proyecto y deben leerse antes de escribir cualquier código de UI:

### impeccable
- **Trigger**: en cualquier change que toque el frontend.
- **Regla**: pasar el checklist de impeccable antes de marcar una tarea de UI como done. Cubre UX review, visual hierarchy, typography, spacing, layout, color, motion, accessibility.

### design-taste-frontend
- **Trigger**: al diseñar landing pages, portfolios y redesigns.
- **Regla**: leer el brief, inferir la dirección de diseño correcta, y entregar interfaces que no parezcan templated.

### emil-design-eng
- **Trigger**: al implementar animaciones, transiciones o micro-interacciones en el frontend.
- **Regla**: aplicar la filosofía de Emil Kowalski sobre UI polish, animation decisions, y detalles invisibles.

### Otras skills disponibles
- `caveman` — modo de comunicación ultra-comprimido
- `brandkit` — generación de brand guidelines y logo systems
- `gpt-taste` — UX/UI elite + GSAP motion engineering
- `high-end-visual-design` — diseño premium tipo agencia
- `image-to-code` — conversión de imágenes de diseño a código
- `industrial-brutalist-ui` — interfaces raw, mecánicas
- `minimalist-ui` — editorial-style limpio
- `redesign-existing-projects` — upgrades de sitios existentes
- `full-output-enforcement` — evita truncamiento de código

---

## 4. Roadmap de Changes

> Estado actualizado del `CHANGES.md`. Para el detalle completo (árbol de dependencias, paralelismo, governance) consultá `CHANGES.md` en la raíz.

| ID | Change | Governance | Estado |
|----|--------|------------|--------|
| C-01 | `foundation-setup` | MEDIO | ✅ completado |
| C-02 | `gestion-pacientes-y-turnos` | MEDIO | ✅ completado |
| C-03 | `finanzas-y-caja-diaria` | ALTO | ✅ completado |
| C-04 | `cuentas-corrientes-y-deudores` | MEDIO | ✅ completado |
| C-05 | `historial-y-mejoras-frontend` | BAJO | ✅ completado |
| C-06 | `auth-y-autorizacion` | CRITICO | ✅ completado |
| C-07 | `catalogo-tratamientos` | MEDIO | ✅ completado |
| C-12 | `correccion-horarios-doctores-pagos` | ALTO | ✅ completado |
| C-13 | `frontend2-rediseno` | ALTO | 🔲 pendiente |
| C-14 | `historia-clinica-y-plan-tratamiento` | ALTO | ✅ completado |
| C-08 | `portal-autogestion` | ALTO | 🔲 pendiente |
| C-09 | `notificaciones` | ALTO | 🔲 pendiente |
| C-10 | `reportes-excel` | BAJO | 🔲 pendiente |
| C-11 | `polish-y-deploy` | CRITICO | 🔲 pendiente |

**Camino crítico**: C-01 → C-02 → C-03 → C-04 → C-05 → C-06 → C-07 → C-12 → C-08 → C-09 → C-11
**Próximo change disponible**: C-13 (`frontend2-rediseno`)

---

## 5. Reglas de Trabajo con CHANGES.md y el Roadmap

### Actualización de estado obligatoria
- Cada vez que ejecutes `/opsx:archive [nombre]`, **inmediatamente** actualizá el estado del change en `CHANGES.md` de `[ ] pendiente` a `[x] completado` y registrá la fecha.
- También actualizá el resumen de la Sección 4 de este archivo (`AGENTS.md`).

### Antes de proponer cualquier change nuevo
1. Leé `CHANGES.md` para ver qué está pendiente, en progreso y completado.
2. Verificá que las dependencias del change que querés proponer estén todas en `[x] completado`.
3. Si querés agregar un change que no estaba en el mapa original, primero proponé la modificación del `CHANGES.md` y el roadmap al usuario, esperá aprobación explícita, y **solo entonces** lo incorporás.

### Ciclo de cambios al roadmap
Cuando se identifique que el scope cambió (nuevo requerimiento, cambio de prioridad, split de change):
1. Cambiá a **modo plan**: describí el impacto, qué changes se agregan/modifican/eliminan, y cómo afecta el camino crítico.
2. Mostrá el diff del `CHANGES.md` propuesto.
3. **Esperá aprobación explícita** del usuario.
4. Recién después modificá `CHANGES.md`, actualizá la Sección 4 de `AGENTS.md`, y si aplica, regenerá secciones del roadmap con la skill `roadmap-generator`.

---

## 6. Reglas Duras del Proyecto

Estas reglas no se negocian. Si algo contradice una de estas reglas, reportalo y esperá instrucción.

### Control de builds y commits
- ❌ **No buildear automáticamente** sin pedido explícito.
- ❌ **No hacer commit** sin pedido explícito.
- ✅ Conventional Commits obligatorios: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- ❌ Sin `Co-Authored-By` en los mensajes de commit.

### Testing
- ✅ Tests de integración usando base de datos real.
- ❌ Sin mocks de base de datos en tests. Si una query no se puede testear con la DB real, eso es una señal de que el diseño tiene un problema.
- ✅ Cada change debe tener su suite de tests pasando antes de `/opsx:archive`.

### Convenciones de código
- ✅ Schemas Pydantic con `from_attributes = True` para responses.
- ✅ `snake_case` para todo el código Python (variables, funciones, módulos).
- ✅ `PascalCase` para componentes React e interfaces TypeScript.
- ✅ `kebab-case` para nombres de archivos, cambios y rutas URL.
- ✅ `Moneda = 'ARS' | 'USD'` — nunca strings libres para moneda.
- ✅ Variables de entorno para secrets. Nunca hardcodear en el código fuente.

### UI y Frontend
- ✅ **Siempre** usar las skills de frontend instaladas antes de escribir markup, estilos o animaciones (ver Sección 3).
- ✅ Las guías de las skills tienen prioridad sobre tu criterio estético default.
- ✅ Sin lógica de negocio en componentes React: solo presentación + hooks.
- ✅ Tailwind para estilos. Material Design 3 como referencia visual.
- ✅ Nunca mezclar CSS inline con clases Tailwind.

### Modo plan
- Ante cualquier decisión arquitectónica no trivial, cambio de dependencias entre changes, o requerimiento ambiguo: **activá modo plan primero**.
- Describí el approach en lenguaje natural, listá las alternativas consideradas, indicá cuál recomendás y por qué.
- No escribas código hasta que el usuario apruebe el plan.

### Seguridad
- ❌ Nunca exponer DNI, email, teléfono ni historial clínico en logs o mensajes de error.
- ❌ Nunca almacenar contraseñas en texto plano. Siempre bcrypt.
- ❌ Endpoints de reportes y finanzas solo accesibles por admin y secretaria.
- ❌ GET /pacientes/verificar/{dni} solo devuelve datos no sensibles (sin email, sin historial).

---

## 7. Protocolo de Sesión

### Al iniciar una sesión nueva
1. Leé `AGENTS.md` (este archivo).
2. Leé `CHANGES.md` y determiná cuál es el próximo change disponible para trabajar (dependencias completadas, estado pendiente).
3. Leé los archivos de `knowledge-base/` relevantes para ese change.
4. Reportá al usuario: "Próximo change disponible: `C-08 portal-autogestion`. ¿Arrancamos con `/opsx:propose portal-autogestion`?"

### Al finalizar una sesión
1. Si completaste un `/opsx:archive`, actualizá el estado en `CHANGES.md` y en la Sección 4 de este archivo.
2. Listá brevemente qué quedó pendiente o qué preguntas abiertas surgieron.
3. Guardá el contexto de la sesión con `mem_session_summary`.

### Documentación fuente
- `docs/Integrador.txt` — primera lectura obligatoria (contexto y restricciones)
- `docs/Descripcion.txt` — visión, actores, stack, funcionalidades
- `docs/Historias_de_usuario.txt` — historias de usuario (✅ / 🔲)
- `docs/CHANGES.md` — mapa completo de changes con scope detallado
- `openspec/specs/*/spec.md` — especificaciones técnicas por módulo (pendiente crear)
