# Roadmap Template — Plantilla completa de `openspec/roadmap.md`

Esta es la **estructura exacta** que tenés que generar. Adaptá nombres y contenido al proyecto, pero respetá las secciones, el orden y el formato de la tabla.

---

```markdown
# Roadmap de Implementación

Mapa completo de changes para desarrollar **{Nombre Proyecto}** de inicio a fin.
Generado a partir de `knowledge-base/` el {YYYY-MM-DD}.

---

## Orden de ejecución

| # | Change | Funcionalidad | US | Depende de | Razón de la dependencia |
|---|--------|---------------|-----|------------|--------------------------|
| 1 | `us-000-setup` | Infraestructura base | US-000 | — | Punto de partida |
| 2 | `us-001-auth` | JWT + RBAC + refresh | US-001 a US-005 | `us-000-setup` | Requiere backend operativo y estructura de datos |
| 3 | `us-002-categorias` | Catálogo jerárquico | US-010 a US-014 | `us-001-auth` | Endpoints CRUD requieren rol admin |
| 4 | `us-003-productos` | CRUD + stock + ingredientes | US-015 a US-024 | `us-002-categorias` | `Producto.categoria_id` referencia categorías |
| 5 | `us-004-carrito` | Estado client-side con Zustand | US-030 a US-034 | `us-003-productos` | Necesita catálogo de productos disponible |
| 6 | `us-005-pedidos` | UoW + FSM + audit trail | US-040 a US-052 | `us-004-carrito` | Convierte carrito en pedido persistido |
| 7 | `us-006-pagos` | MercadoPago Checkout + webhook IPN | US-055 a US-062 | `us-005-pedidos` | El pago se asocia a un pedido existente |
| 8 | `us-007-admin` | Panel admin + métricas | US-065 a US-072 | `us-006-pagos` | Métricas requieren datos de pedidos y pagos |
| 9 | `us-008-direcciones` | Direcciones de entrega del cliente | US-075 a US-076 | `us-001-auth` | Independiente de pedidos pero requiere usuario |

---

## Detalle por change

### 1. `us-000-setup`

**Funcionalidad**: estructura del proyecto, dependencias backend y frontend, archivo `.env`, conexión a base de datos, migración inicial vacía.

**US implementadas**: US-000.

**Depende de**: ninguno (punto de partida).

**Justificación**: todos los demás changes asumen que existe estructura de directorios, dependencias instaladas, base de datos accesible y variables de entorno cargadas.

**Riesgos / preguntas abiertas**: si la DB elegida cambia (ej. de Postgres a MySQL), todos los changes posteriores se ven afectados. Validar antes de avanzar.

---

### 2. `us-001-auth`

**Funcionalidad**: registro, login, JWT con doble token (access + refresh), middleware de autenticación, sistema de roles (RBAC) con N roles definidos.

**US implementadas**: US-001 a US-005.

**Depende de**: `us-000-setup`.

**Justificación**: este change crea el modelo `User`, las tablas de roles y permisos, los endpoints `/auth/*` y el middleware. Sin esto, ningún endpoint protegido del resto del sistema puede funcionar.

**Riesgos / preguntas abiertas**: ver IN-01 en `10_preguntas_abiertas.md` (¿refresh token reutilizable o single-use?).

---

### {N}. `{change-name}`

**Funcionalidad**: ...

**US implementadas**: ...

**Depende de**: ...

**Justificación**: ...

**Riesgos / preguntas abiertas**: ...

---

## Notas finales

- Este roadmap es la **secuencia recomendada**. Si el equipo necesita paralelizar, los changes con dependencias disjuntas pueden trabajarse en paralelo (ej. `us-008-direcciones` puede empezar mientras se trabaja en `us-005-pedidos`).
- Cada change debe ser **mergeable independientemente**. Si al implementar uno te das cuenta de que necesita partirse, actualizá este roadmap.
- Las preguntas abiertas (`10_preguntas_abiertas.md`) deben resolverse **antes** de iniciar el change que las bloquea — ver columna "Riesgos".
```
