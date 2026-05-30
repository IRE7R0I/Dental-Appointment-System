# Plantillas de Prompts Extendidas — JR Stack + OpenSpec

Estas tres plantillas complementan el flujo iniciado con los Prompts 1 y 2 del archivo base.
Cubren: construcción de la Knowledge Base, generación del CHANGES.md operativo, y creación del archivo de instrucciones del agente.

---

## PROMPT 3 — Generación de la Knowledge Base con `kb-creator`

> **Cuándo usarlo**: Después de tener los tres documentos base aprobados en `docs/` (o incluso desde cero si no tenés ninguno).
> La skill detecta automáticamente cuál modo usar.
>
> **Dónde ejecutarlo**: En **Claude Code / OpenCode**, dentro del repositorio del proyecto.
> **Pre-requisito**: Tener instalada la skill: `npx skills add https://github.com/JuanCruzRobledo/kb-creator`

---

```
Usá la skill kb-creator para generar la base de conocimiento del proyecto Odontogest.

Contexto de ejecución:
- Si existe la carpeta docs/ con archivos (.txt, .md, .docx, .pdf), operá en **Mode A (silent)**:
  leé todos los documentos disponibles y generá la KB completa sin hacer preguntas.
- Si no existe docs/ o está vacía, operá en **Mode B (interactive)**:
  actuá como arquitecto senior + product manager y haceme 3-5 preguntas estratégicas
  por ronda hasta construir la KB de forma colaborativa.

La KB debe quedar en knowledge-base/ en la raíz del proyecto con los 10 archivos canónicos obligatorios:

  01_vision_y_objetivos.md
  02_descripcion_general.md
  03_actores_y_roles.md
  04_modelo_de_datos.md
  05_reglas_de_negocio.md
  06_funcionalidades.md
  07_flujos_principales.md
  08_arquitectura_propuesta.md
  09_decisiones_y_supuestos.md
  10_preguntas_abiertas.md
  README.md  ← índice + resumen ejecutivo

Si el dominio del proyecto lo requiere (ej.: pasarela de pagos, sistema de audit trail específico,
integraciones complejas), agregá archivos extra con prefijo 11_, 12_, etc. en kebab-case y justificá
brevemente por qué los agregás.

Reglas de calidad por archivo:
- 01: visión clara, objetivos medibles (OBJ-01, OBJ-02...), no más de 2 páginas.
- 04: ERD completo con tipos de datos, relaciones cardinalidad, constraints.
- 05: reglas con ID estable (RN-01, RN-02...), organizadas por dominio.
- 07: flujos principales como secuencia numerada de pasos, no como prosa libre.
- 09: cada decisión con su alternativa descartada y el motivo. Sin este archivo el proyecto
      acumula deuda de contexto.
- 10: preguntas abiertas que bloquean decisiones futuras, cada una con responsable sugerido.

Una vez terminado, mostrá el árbol de archivos generados y un resumen de 3-5 líneas
de los hallazgos más importantes que detectaste en la documentación fuente.
```

---

## PROMPT 4 — Generación del CHANGES.md operativo con `roadmap-generator`

> **Cuándo usarlo**: Una vez que `knowledge-base/` esté completa y OpenSpec esté inicializado
> (`npx @fission-ai/openspec@latest init`).
>
> **Dónde ejecutarlo**: En **Claude Code / OpenCode**, dentro del repositorio del proyecto.
> **Pre-requisito**: Tener instalada la skill: `npx skills add https://github.com/JuanCruzRobledo/roadmap-generator`
> **Validación**: Si falta `knowledge-base/` o la carpeta `openspec/`, detenete y avisame antes de escribir nada.

---

```
Usá la skill roadmap-generator para generar el CHANGES.md del proyecto Odontogest.

Pre-flight (verificar antes de empezar):
1. Confirmá que existe knowledge-base/ con los 10 archivos canónicos. Si falta, detenete
   y decime qué falta para correr primero kb-creator.
2. Confirmá que existe la carpeta openspec/ (OpenSpec inicializado). Si falta, detenete
   y decime el comando exacto para inicializarlo.

Si los dos checks pasan, procedé sin hacer más preguntas. Es fire-and-forget.

Leé en su totalidad todos los archivos de knowledge-base/ y generá CHANGES.md en la raíz
con esta estructura completa:

────────────────────────────────────────────────────────────────
# CHANGES — Secuencia de Implementación

> Índice canónico de todos los changes del proyecto [NOMBRE].
> Actualizar los estados [ ] → [x] a medida que cada change se archiva con /opsx:archive.

## Cómo usar este documento
(5 pasos concisos: leer KB → proponer → aplicar → archivar → actualizar estado)

## Árbol de dependencias
(ASCII art jerárquico, que se entienda de un vistazo)

### Paralelismo por fase
(GATES explícitos: qué changes pueden correr en paralelo y cuáles son bloqueantes)

### Camino crítico
(cadena lineal mínima irreducible para llegar a un sistema funcionando en producción)

### Plan óptimo con 3 agentes
(tabla: paso × agente, con qué hace cada uno en cada step)

## FASE 0 — Cimientos
### [C-01] `foundation-setup`
- **Estado**: [ ] pendiente
- **Scope**: bullets operacionales concretos (ej: "modelos User y Session", "migración inicial", "seed data de roles")
- **Dependencias**: ninguna
- **Governance**: BAJO | MEDIO | ALTO | CRITICO
- **Leer antes**:
  - knowledge-base/01_vision_y_objetivos.md
  - knowledge-base/08_arquitectura_propuesta.md

## FASE 1 — [Nombre de la fase]
### [C-02] `nombre-del-change`
...
────────────────────────────────────────────────────────────────

Reglas de inferencia de dependencias que debés aplicar:
1. Infra/setup primero: C-01 nunca depende de nada.
2. Modelos core antes que features que los usan.
3. Auth antes que cualquier endpoint protegido.
4. Entidad referenciada antes que la que referencia (categorías antes que productos).
5. Backend antes que frontend acoplado al mismo dominio.
6. Integraciones externas (pagos, webhooks, emails) al final de su fase.
7. Admin, dashboards y reportes al final (dependen de datos que muestran).
8. Refactors de UI / polish al final de todo.

Niveles de governance:
- BAJO: scaffolding, CRUDs simples, pages sin lógica crítica.
- MEDIO: flujos con estado, sesiones, máquinas de estado, WebSockets no críticos.
- ALTO: notificaciones, gestión de roles, WebSocket gateway, observabilidad.
- CRITICO: auth, pagos, datos de seguridad, audit trail, modelos core del dominio.

Al cerrar, mostrá este resumen:
✅ CHANGES.md creado con [N] changes en [M] fases.
Camino crítico: [K] changes
Gates de paralelismo: [G]
Primer change recomendado: C-01 (foundation-setup)
Para arrancar: /opsx:propose C-01-foundation-setup
```

---

## PROMPT 5 — Creación del archivo AGENTS.md / CLAUDE.md

> **Cuándo usarlo**: Una vez que tenés `knowledge-base/` completa y `CHANGES.md` generado y revisado.
> Este archivo es el contrato de comportamiento del agente para todo el proyecto.
>
> **Dónde ejecutarlo**: En **Claude Code / OpenCode**, dentro del repositorio del proyecto.

---

```
Creá el archivo AGENTS.md en la raíz del proyecto con el siguiente contenido y estructura.
Es el contrato de comportamiento del agente para Odontogest.
Leé knowledge-base/README.md y CHANGES.md antes de escribirlo para que los datos sean reales,
no placeholders.

────────────────────────────────────────────────────────────────
# AGENTS.md — Odontogest

> Contrato de comportamiento del agente para este repositorio.
> Toda instrucción aquí tiene prioridad sobre el comportamiento default del agente.
> Última actualización: [FECHA]

---

## 1. Stack Tecnológico

[Completar con el stack real del proyecto leído de la KB]

Ejemplo de estructura:
- **Backend**: [lenguaje] [versión] — [framework] [versión]
- **Frontend**: [framework] [versión] — [librería de estado si aplica]
- **Base de datos**: [motor] — ORM: [nombre]
- **Auth**: [mecanismo: JWT / session / OAuth provider]
- **Infraestructura**: [Docker / cloud provider / CI]
- **Testing**: [framework backend] / [framework frontend]

---

## 2. Knowledge Base

La fuente de verdad del proyecto está en knowledge-base/.
Antes de proponer cualquier change, leé los archivos relevantes para el dominio que vas a tocar.

| Archivo | Cuándo leerlo |
|---|---|
| 01_vision_y_objetivos.md | Siempre, antes del primer /opsx:propose |
| 02_descripcion_general.md | Al empezar una sesión nueva |
| 03_actores_y_roles.md | Al implementar auth o permisos |
| 04_modelo_de_datos.md | Al crear/modificar modelos, migraciones o queries |
| 05_reglas_de_negocio.md | Al implementar lógica de dominio |
| 06_funcionalidades.md | Al proponer un change de feature |
| 07_flujos_principales.md | Al implementar flujos end-to-end |
| 08_arquitectura_propuesta.md | Al tomar decisiones de estructura o patrones |
| 09_decisiones_y_supuestos.md | Antes de proponer alternativas de diseño |
| 10_preguntas_abiertas.md | Cuando encontrés ambigüedad |

---

## 3. Skills Instaladas

### kb-creator
- **Repo**: https://github.com/JuanCruzRobledo/kb-creator
- **Trigger**: cuando necesitás construir o actualizar la base de conocimiento del proyecto.
- **Comando**: "creá / actualizá la base de conocimiento"

### roadmap-generator
- **Repo**: https://github.com/JuanCruzRobledo/roadmap-generator
- **Trigger**: cuando necesitás generar o regenerar el CHANGES.md desde la KB.
- **Comando**: "generá el CHANGES.md del proyecto"

### find-skills
- **Trigger**: cuando el usuario pide buscar skills disponibles o instaladas.
- **Comando**: "buscá skills para [dominio]"

### Skills de Frontend (completar según lo instalado)
<!-- SECCIÓN EDITABLE — Agregá aquí las skills de frontend que instales en el proyecto -->
<!-- Ejemplo:
### emil-kowalski / animations
- **Repo**: Ya instalada en el proyecto
- **Trigger**: cuando implementés animaciones o transiciones en el frontend.
- **Regla**: Siempre leé esta skill antes de escribir cualquier código de animación.

### taste-ui
- **Repo**: Ya instalada en el proyecto
- **Trigger**: al construir componentes de UI nuevos.
- **Regla**: Aplicar las guías de taste antes de proponer markup o estilos.

### impeccable
- **Repo**: Ya instalada en el proyecto
- **Trigger**: en cualquier change que toque el frontend.
- **Regla**: Pasá el checklist de impeccable antes de marcar una tarea de UI como done.
-->

---

## 4. Roadmap de Changes

> Estado actualizado del CHANGES.md. Actualizá esta sección cada vez que completes
> un /opsx:archive.
> Para el detalle completo (árbol de dependencias, paralelismo, governance) consultá CHANGES.md.

[Pegar aquí la lista de changes del CHANGES.md en formato resumido]

Ejemplo:
- [ ] C-01 `foundation-setup` — CRITICO — sin dependencias
- [ ] C-02 `core-models` — CRITICO — depende de C-01
- [ ] C-03 `auth` — CRITICO — depende de C-02
- [ ] C-04 `[feature-a]` — ALTO — depende de C-03
- [ ] C-05 `[feature-b]` — MEDIO — depende de C-03
- ...
- [ ] C-N `polish-y-deploy` — MEDIO — depende de todos

---

## 5. Reglas de Trabajo con CHANGES.md y el Roadmap

### Actualización de estado obligatoria
- Cada vez que ejecutes `/opsx:archive [nombre]`, **inmediatamente** actualizá el estado
  del change en CHANGES.md de `[ ] pendiente` a `[x] completado` y registrá la fecha.
- También actualizá el resumen de la Sección 4 de este archivo (AGENTS.md).

### Antes de proponer cualquier change nuevo
1. Leé CHANGES.md para ver qué está pendiente, en progreso y completado.
2. Verificá que las dependencias del change que querés proponer estén todas en `[x] completado`.
3. Si querés agregar un change que no estaba en el mapa original, primero proponé la modificación
   del CHANGES.md y el roadmap al usuario, esperá aprobación explícita, y **solo entonces** lo incorporás.

### Ciclo de cambios al roadmap
Cuando se identifique que el scope cambió (nuevo requerimiento, cambio de prioridad, split de change):
1. Cambiá a **modo plan**: describí el impacto, qué changes se agregan/modifican/eliminan,
   y cómo afecta el camino crítico.
2. Mostrá el diff del CHANGES.md propuesto.
3. **Esperá aprobación explícita** del usuario.
4. Recién después modificá CHANGES.md, actualizá la Sección 4 de AGENTS.md, y si aplica,
   regenerá secciones del roadmap con la skill roadmap-generator.

---

## 6. Reglas Duras del Proyecto

Estas reglas no se negocian. Si algo contradice una de estas reglas, reportalo y esperá instrucción.

### Control de builds y commits
- ❌ **No buildear automáticamente** sin pedido explícito.
- ❌ **No hacer commit** sin pedido explícito.
- ✅ Conventional Commits obligatorios: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- ❌ Sin `Co-Authored-By` en los mensajes de commit.
- SIEMPRE AL HACER CUALQUIER ACTIVIDAD QUE REQUIERA EL FRONTEND usar las skills cargadas de frontend como: impeccable, taste-ui, emil-kowalski

### Testing
- ✅ Tests de integración usando base de datos real (contenedor de test).
- ❌ Sin mocks de base de datos en tests. Si una query no se puede testear con la DB real,
  eso es una señal de que el diseño tiene un problema.
- ✅ Cada change debe tener su suite de tests pasando antes de `/opsx:archive`.

### Convenciones de código
- ✅ Schemas con `extra='forbid'` (sin campos no declarados).
- ✅ `snake_case` para todo el código Python (variables, funciones, módulos).
- ✅ `PascalCase` para componentes React.
- ✅ kebab-case para nombres de archivos de componentes (`user-card.tsx`).

### Modo plan
- Ante cualquier decisión arquitectónica no trivial, cambio de dependencias entre changes,
  o requerimiento ambiguo: **activá modo plan primero**.
- Describí el approach en lenguaje natural, listá las alternativas consideradas,
  indicá cuál recomendás y por qué.
- No escribas código hasta que el usuario apruebe el plan.

### Skills de frontend
- Ante cualquier change que toque la UI, **verificá si hay skills de frontend instaladas**
  (ver Sección 3) y leélas antes de escribir markup, estilos o animaciones.
- Las guías de las skills tienen prioridad sobre tu criterio estético default.

---

## 7. Protocolo de Sesión

Al iniciar una sesión nueva:
1. Leé AGENTS.md (este archivo).
2. Leé CHANGES.md y determiná cuál es el próximo change disponible para trabajar
   (dependencias completadas, estado pendiente).
3. Leé los archivos de knowledge-base/ relevantes para ese change.
4. Reportá al usuario: "Próximo change disponible: [C-XX `nombre`]. ¿Arrancamos con `/opsx:propose C-XX-nombre`?"

Al finalizar una sesión:
1. Si completaste un `/opsx:archive`, actualizá el estado en CHANGES.md y en la Sección 4.
2. Listá brevemente qué quedó pendiente o qué preguntas abiertas surgieron.
────────────────────────────────────────────────────────────────

Importante al generar el archivo:
- Reemplazá todos los placeholders con datos reales del proyecto (leídos de la KB y CHANGES.md).
- En la Sección 3 — Skills de Frontend, dejá los comentarios de ejemplo tal como están:
  el usuario los va a reemplazar manualmente cuando instale skills.
- En la Sección 4, pegá la lista real de changes del CHANGES.md generado.
- La fecha de "Última actualización" debe ser la fecha actual.
- El archivo debe quedar en la raíz del proyecto.
```

---

## Flujo Completo Extendido — Referencia Rápida

```
[Flujo base — Prompts 1 y 2]
[VOS]  PROMPT 1 → 3 documentos base en docs/
[VOS]  PROMPT 2 → CHANGES.md inicial (mapa de changes conceptual)

[Flujo extendido — Prompts 3, 4 y 5]
[VOS]  PROMPT 3 → knowledge-base/ con los 10 archivos canónicos  (kb-creator)
[VOS]  PROMPT 4 → CHANGES.md operativo reemplaza al del Prompt 2  (roadmap-generator)
[VOS]  PROMPT 5 → AGENTS.md / CLAUDE.md en la raíz              (contrato del agente)

[Ciclo de desarrollo]
[VOS]  /opsx:propose [C-01-foundation-setup]
[AGENTE] Lee KB relevante → genera proposal.md + design.md + tasks.md
[VOS]  Revisás y aprobás
[AGENTE] /opsx:apply [C-01-foundation-setup]   → implementa
[AGENTE] /opsx:archive [C-01-foundation-setup] → sincroniza specs
[AGENTE] Actualiza CHANGES.md [ ] → [x] + actualiza Sección 4 de AGENTS.md
        → repite para cada change
```

---

## Notas de Uso

- **Orden**: Los Prompts 3 y 4 son secuenciales y obligatorios. El Prompt 4 necesita la KB del 3.
- **Reemplazá** `Odontogest` en los tres prompts antes de usarlos.
- **CHANGES.md dual**: el Prompt 2 genera un CHANGES.md conceptual. El Prompt 4 lo reemplaza
  con uno operativo (checkboxes, governance, camino crítico, paralelismo). Usá el del Prompt 4
  como la fuente de verdad definitiva.
- **Sección de Skills de Frontend en AGENTS.md**: está diseñada para que la edites manualmente
  cada vez que instales una skill nueva (emil-kowalski, taste, impeccable, etc.). No hace falta
  re-correr el Prompt 5 completo; solo editá esa sección.
- **El agente actualiza CHANGES.md solo**: una vez que AGENTS.md existe en el repo, el agente
  tiene la instrucción explícita de actualizar estados después de cada `/opsx:archive`.
  No hace falta recordárselo.
- **Modo plan**: siempre que quieras cambiar el scope o agregar un change no previsto,
  el agente va a pedir aprobación antes de tocar CHANGES.md. Ese es el comportamiento esperado.
