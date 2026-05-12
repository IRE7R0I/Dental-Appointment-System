---
name: roadmap-generator
description: >
  Generates a complete roadmap of OpenSpec changes from a project knowledge base, with explicit dependencies and rationale. Fire-and-forget, no questions asked.
  Trigger: When user asks to create, build, or generate a roadmap, change map, or implementation plan; or asks "armar roadmap", "crear mapa de changes", "generar plan de implementación", "qué changes necesito".
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Generar el **mapa completo de changes** para implementar un sistema desde cero hasta su versión completa.
- Convertir una base de conocimiento estructurada en un plan de ejecución secuenciado.
- Identificar **dependencias técnicas** entre features (auth antes que rutas protegidas, modelo de datos antes que CRUD, etc.).

**Don't use when:**
- No existe `knowledge-base/` en la raíz (corré `kb-creator` primero).
- No existe la carpeta `openspec/` (corré `openspec init` primero).
- Ya existe `openspec/roadmap.md` (sugerí actualizar específicamente, no regenerar).

---

## Critical Patterns

### Pre-checks obligatorios

Antes de generar el roadmap, **validá** estas tres condiciones. Si alguna falla, **NO generes nada** y devolvé un mensaje claro:

| Check | Si falla |
|-------|----------|
| `knowledge-base/` existe en raíz | "Falta la KB. Corré primero `kb-creator` para generarla." |
| `knowledge-base/` tiene los 10 canónicos | "KB incompleta. Faltan: [lista]. Corré `kb-creator` para completarla." |
| `openspec/` existe en raíz | "OpenSpec no inicializado. Corré `npx @fission-ai/openspec@latest init` primero." |

### Input — qué leer de la KB

Leé **siempre** estos 4 canónicos (los más informativos para changes):
1. `04_modelo_de_datos.md` → entidades y relaciones (revela orden de creación de tablas).
2. `06_funcionalidades.md` → US y épicas (la unidad de cada change).
3. `07_flujos_principales.md` → flujos E2E (revela qué changes son atómicos vs compuestos).
4. `08_arquitectura_propuesta.md` → patrones (revela infraestructura previa necesaria).

Leé **opcionalmente** estos si están:
- `03_actores_y_roles.md` → para changes de auth + RBAC.
- `05_reglas_de_negocio.md` → para detectar reglas que cruzan changes.
- `10_preguntas_abiertas.md` → para flaggear changes con dependencias inciertas.

### Output — formato exacto

Generá UN archivo: `openspec/roadmap.md` con esta estructura **obligatoria**:

```markdown
# Roadmap de Implementación

Mapa completo de changes para desarrollar **{nombre proyecto}** de inicio a fin.
Generado a partir de `knowledge-base/`.

## Orden de ejecución

| # | Change | Funcionalidad | US | Depende de | Razón de la dependencia |
|---|--------|---------------|----|-----------|-----|
| 1 | `us-000-setup` | Infraestructura base, dependencias, env, DB inicial | US-000 | — | Punto de partida |
| 2 | `us-001-auth` | JWT, RBAC, refresh tokens | US-001 a US-005 | `us-000-setup` | Requiere backend operativo |
| ... |

## Detalle por change

### `us-000-setup`
**Funcionalidad**: ...
**US implementadas**: ...
**Depende de**: ninguno.
**Justificación**: ...
**Riesgos / preguntas abiertas**: (si hay) ver IN-XX en `10_preguntas_abiertas.md`.

### `us-001-auth`
...
```

### Reglas para nombrar changes

- Siempre **kebab-case**.
- Prefijo `usX-NNN-` opcional pero recomendado para alineación con US (ej. `us-001-auth`, `us-005-pedidos`).
- Si el change cubre múltiples US, usar el código del primer US (ej. `us-010-catalogo` cubre US-010 a US-014).
- Si el change es transversal (no mapea a US), prefijo `infra-` o `setup-` (ej. `infra-observability`).

### Reglas para inferir dependencias

Aplicá esta jerarquía **siempre**:

1. **Infra primero**: el primer change es `us-000-setup` (estructura, dependencias, .env, DB inicial). Todo depende de él.
2. **Auth antes que recursos protegidos**: si una US requiere usuario logueado, depende del change de auth.
3. **Modelo de datos primero**: si una entidad B referencia entidad A, el change de A precede al de B. Ejemplo: `us-002-categorias` antes que `us-003-productos` si `Producto.categoria_id → Categoria.id`.
4. **Backend antes que frontend acoplado**: si una vista frontend consume un endpoint, su change depende del change que crea el endpoint.
5. **Pagos / integraciones externas al final**: dependen de pedidos/tickets/etc. ya creados.
6. **Admin / dashboards al final**: dependen de los datos que muestran.

### Detección de changes atómicos

Un change debe ser **atómico** (mergeable de una vez). Reglas:

- Si una funcionalidad tiene > 8 US complejas → dividilo en changes secuenciales.
- Si una funcionalidad cruza 2 dominios sin acoplamiento → dividilo (ej. `us-008-direcciones` separado de `us-005-pedidos`).
- Si una funcionalidad tiene partes opcionales/post-MVP → flaggealas como changes posteriores.

### Output al usuario al cerrar

Después de escribir `openspec/roadmap.md`, devolvé:

```markdown
## Roadmap generado

✅ `openspec/roadmap.md` creado con **{N} changes**.

**Primer change recomendado**: `us-000-setup`

Para arrancar: `/opsx:propose us-000-setup`
```

---

## Code Examples

### Estructura típica para e-commerce / marketplace

```
1. us-000-setup           ← infra
2. us-001-auth            ← JWT + RBAC
3. us-002-categorias      ← catálogo jerárquico
4. us-003-productos       ← CRUD + stock
5. us-004-carrito         ← estado client-side
6. us-005-pedidos         ← UoW + FSM
7. us-006-pagos           ← integración externa
8. us-007-admin           ← panel + métricas
```

### Estructura típica para SaaS B2B

```
1. us-000-setup
2. us-001-auth-multitenancy   ← tenant + RBAC
3. us-002-billing             ← suscripciones
4. us-003-recursos-core       ← entidades del dominio
5. us-004-integraciones       ← APIs externas
6. us-005-admin-y-soporte     ← back-office
```

---

## Commands

```bash
# Instalar la skill
npx skills add https://github.com/JuanCruzRobledo/roadmap-generator

# Pre-requisitos antes de invocar:
# 1. knowledge-base/ generada (con kb-creator)
# 2. openspec/ inicializada (npx @fission-ai/openspec@latest init)

# Invocación:
"generá el roadmap del proyecto"
"creá el mapa de changes"
"qué changes necesito para el sistema"
```

---

## Resources

- **Templates**: ver [assets/roadmap-template.md](assets/roadmap-template.md) — plantilla completa de `openspec/roadmap.md`.
