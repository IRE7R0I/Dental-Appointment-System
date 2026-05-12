# roadmap-generator

Skill para generar el **mapa completo de OpenSpec changes** necesarios para implementar un sistema de inicio a fin, con dependencias explícitas y justificación de cada una.

---

## ¿Qué hace?

Lee tu base de conocimiento estructurada en `knowledge-base/` y genera `openspec/roadmap.md` con:

- **Orden de ejecución** de los changes (tabla con dependencias y razones).
- **Detalle por change** con funcionalidad, US implementadas, dependencias y riesgos.
- **Sugerencia de primer change** a ejecutar.

Es **fire-and-forget**: no hace preguntas, va directo al output.

---

## Pre-requisitos

Antes de invocar esta skill necesitás:

1. **Base de conocimiento generada** en `knowledge-base/` (raíz). Si no la tenés, corré primero la skill [`kb-creator`](https://github.com/JuanCruzRobledo/kb-creator).
2. **OpenSpec inicializado** en el proyecto:
   ```bash
   npx @fission-ai/openspec@latest init
   ```

Si falta cualquiera de los dos, la skill te avisa y se detiene **sin escribir nada**.

---

## Instalación

```bash
npx skills add https://github.com/JuanCruzRobledo/roadmap-generator
```

---

## Uso

```
Tu repo:
proyecto/
├── docs/                        # Documentos fuente
├── knowledge-base/              # KB generada por kb-creator
└── openspec/                    # OpenSpec inicializado

Le decís al agente:
"generá el roadmap del proyecto"
```

→ El agente lee la KB y escribe `openspec/roadmap.md`.

---

## Output esperado

`openspec/roadmap.md` con esta estructura:

```markdown
# Roadmap de Implementación

| # | Change | Funcionalidad | US | Depende de | Razón |
|---|--------|---------------|----|-----------|-------|
| 1 | us-000-setup | Infra base | US-000 | — | Punto de partida |
| 2 | us-001-auth | JWT + RBAC | US-001 a US-005 | us-000-setup | ... |
| ... |

## Detalle por change
...
```

Más una sugerencia del primer change a ejecutar:

```
✅ openspec/roadmap.md creado con 9 changes.
Primer change recomendado: us-000-setup
Para arrancar: /opsx:propose us-000-setup
```

---

## Reglas que aplica para inferir dependencias

1. **Infra primero**: `us-000-setup` no depende de nada.
2. **Auth antes que recursos protegidos**.
3. **Entidad referenciada antes que entidad que referencia** (ej. `categorias` antes que `productos`).
4. **Backend antes que frontend acoplado**.
5. **Integraciones externas (pagos, webhooks) al final**.
6. **Admin / dashboards al final** (dependen de datos que muestran).

---

## Por qué esta skill

- **Evita "vibe planning"**: en lugar de improvisar el orden de implementación a medida que codeás, lo dejás explícito y trazable.
- **Output compatible con OpenSpec**: cada fila de la tabla es directamente el input para `/opsx:propose <change-name>`.
- **Justificación obligatoria**: cada dependencia tiene un "por qué" — esto fuerza a pensar bien antes de aceptarla.
- **Detecta paralelizables**: changes con dependencias disjuntas se pueden trabajar en paralelo.

---

## Licencia

Apache-2.0
