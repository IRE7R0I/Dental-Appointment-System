# Plantillas de Prompts — Spec-Driven Development (OpenSpec)

Estas dos plantillas cubren el flujo completo para iniciar cualquier proyecto nuevo con la metodología SDD + OpenSpec + Claude Code.

---

## PROMPT 1 — Elicitación del Proyecto y Generación de los 3 Documentos Base

> **Cuándo usarlo**: Cuando tenés una idea de proyecto y querés que la IA te ayude a construir los tres archivos fundacionales (`Descripcion.txt`, `Integrador.txt`, `Historias_de_usuario.txt`) desde cero o a partir de un PDF/notas que ya tenés.
>
> **Dónde ejecutarlo**: En Claude.ai (chat normal) o Claude Code en modo conversacional, ANTES de abrir el proyecto.

---

```
Voy a desarrollar un nuevo proyecto de software usando Spec-Driven Development (SDD) con el framework OpenSpec.
Necesito tu ayuda para construir los tres documentos fundacionales del proyecto antes de escribir una sola línea de código.

El proyecto se llama: **Odontogest**
Descripción inicial (lo que tengo claro hasta ahora):
> [Escribí 2-5 oraciones sobre qué hace el sistema, para quién es y qué problema resuelve]

---

Tu tarea es hacerme las preguntas necesarias para poder generar los tres documentos con calidad profesional.
Antes de preguntar nada, leé lo que te proporcioné y analizá qué información falta o es ambigua.
Luego, para cada bloque temático que necesite clarificación, haceme máximo 3 preguntas puntuales.

Los bloques que debés cubrir son:

**1. Visión y Actores**
- ¿Quiénes son los actores del sistema (usuarios con diferentes roles)?
- ¿Qué puede hacer cada uno que los otros no pueden?
- ¿Hay actores automáticos (procesos del sistema, webhooks, cron jobs)?

**2. Stack Tecnológico**
- ¿Tenés preferencias o restricciones de stack (lenguaje, framework, base de datos)?
- Si no tenés preferencia, te voy a proponer el stack más adecuado para el caso de uso y justificar por qué.
- ¿Hay integraciones con servicios externos (pagos, email, storage, auth providers)?

**3. Arquitectura**
- ¿El sistema es un monolito, microservicios, o algo intermedio?
- ¿Qué tipo de frontend? (SPA, SSR, mobile, solo API)
- ¿Cuáles son las entidades principales del dominio y cómo se relacionan entre sí?
- ¿Hay requerimientos especiales de performance, escala o disponibilidad?

**4. Reglas de Negocio Críticas**
- ¿Qué cosas NO pueden pasar nunca en el sistema? (invariantes del dominio)
- ¿Hay flujos de estado (máquinas de estado, lifecycles de entidades)?
- ¿Hay operaciones que deben ser atómicas (todo o nada)?

**5. Historias de Usuario**
- ¿Cuáles son las 5-10 funcionalidades más importantes desde la perspectiva del usuario?
- ¿Hay flujos críticos de punta a punta que definan el éxito del producto?
- ¿Qué criterios de aceptación son no negociables?

**6. Escalabilidad y Evolución**
- ¿Cuál es el volumen esperado (usuarios concurrentes, datos, transacciones)?
- ¿Qué funcionalidades podrían agregarse en el futuro que no están en el scope inicial?
- ¿Hay requerimientos de auditoría, compliance o seguridad específicos?

---

Una vez que tengamos todo claro, generá los tres documentos con este formato exacto:

### Documento 1: `Descripcion.txt`
Contenido:
- Visión general del sistema (2-3 párrafos)
- Actores principales con descripción detallada de sus permisos y responsabilidades
- Objetivos del sistema (OBJ-01, OBJ-02, ...)
- Stack tecnológico completo con versiones y justificación de cada elección
- Arquitectura del sistema (backend en capas, frontend, base de datos)
- Patrones de diseño aplicados y por qué
- Criterios de evaluación / Definition of Done

### Documento 2: `Integrador.txt`
Contenido:
- ERD completo con todas las entidades, atributos, tipos de datos y relaciones
- Diagrama de arquitectura en capas (Router → Service → UoW → Repository → Model)
- Especificación de todos los endpoints REST (método, path, auth requerida, request body, response)
- Máquinas de estado (si aplica)
- Patrones de diseño con ejemplos de código de referencia
- Configuración de seguridad (JWT, CORS, rate limiting)
- Criterios de entrega técnica

### Documento 3: `Historias_de_usuario.txt`
Contenido:
- Tabla de actores
- Todas las reglas de negocio organizadas por dominio (RN-XX con ID estable)
- Historias de usuario en formato:
  - ID: US-XXX
  - Título
  - Historia: Como [actor], quiero [acción], para [beneficio]
  - Prioridad: Alta/Media/Baja
  - Dependencias: [US-XXX, ...]
  - Criterios de Aceptación: GIVEN/WHEN/THEN
  - Notas Técnicas: endpoints, tablas, patrones a aplicar
- Resumen por épica
- Orden de implementación recomendado (Plan de Sprints)

Empezá haciéndome las preguntas. No generes los documentos hasta que tengamos todo el contexto necesario.
```

---

## PROMPT 2 — Generación del Mapa de Changes (CHANGES.md) a partir de los 3 Documentos

> **Cuándo usarlo**: Una vez que tenés los tres documentos (`Descripcion.txt`, `Integrador.txt`, `Historias_de_usuario.txt`) revisados y aprobados, y querés que el agente proponga el plan completo de desarrollo en forma de changes de OpenSpec.
>
> **Dónde ejecutarlo**: En **Claude Code** (terminal) o en **Open Code**, dentro del repositorio del proyecto, con los tres archivos ya en la carpeta `docs/`.

---

```
  Sos un arquitecto de software senior especializado en Spec-Driven Development (SDD) con el framework OpenSpec.

  Leé en su totalidad los siguientes documentos de la carpeta docs/:
  - @docs/Descripcion.txt     → visión del sistema, actores, stack tecnológico, arquitectura
  - @docs/Integrador.txt      → ERD completo, endpoints REST, patrones de diseño, máquinas de estado
  - @docs/Historias_de_usuario.txt → reglas de negocio (RN-XX), historias de usuario (US-XXX), criterios de aceptación

  Una vez que hayas leído y comprendido los tres documentos en profundidad, proponé el mapa completo de 'changes' para desarrollar Odontogest de principio a fin usando OpenSpec.

  El mapa debe cumplir estas reglas:

  **Formato de cada change:**
  - Nombre en kebab-case (ej: `auth-y-autorizacion`, `catalogo-productos`)
  - Qué funcionalidad cubre (1-2 oraciones)
  - Qué historias de usuario implementa (lista de US-XXX)
  - Qué reglas de negocio aplica (lista de RN-XX)
  - De qué otros changes depende y por qué (dependencias explícitas)
  - Estimación de complejidad: Baja / Media / Alta

  **Restricciones del mapa:**
  1. El primer change SIEMPRE es `project-setup`: scaffolding, estructura de carpetas, configuración de entorno, modelos base, migraciones iniciales y seed data.
  2. Los changes deben seguir el orden lógico de dependencias: si el change B necesita código del change A, A debe estar antes.
  3. Cada change debe ser implementable en 1-3 días de trabajo real. Si es más grande, dividilo.
  4. Un change = una unidad coherente de funcionalidad. No mezcles dominos distintos en un mismo change.
  5. Los changes de backend y frontend de una misma funcionalidad pueden ir juntos (full-stack) o separados, según la complejidad. Justificá la decisión.
  6. El último change del proyecto debe ser `polish-y-deploy`: tests finales, documentación, variables de entorno de producción, deploy.

  **Qué incluir en la propuesta:**
  - Lista ordenada de todos los changes con su descripción completa
  - Tabla de dependencias (qué change desbloquea a cuál)
  - Estimación de sprints agrupando changes relacionados
  - Advertencias sobre riesgos o complejidades que detectaste en los documentos

  Al final de tu análisis, reemplazá el contenido de @docs/CHANGES.md con el mapa propuesto usando este formato de sección por change:

  ---
  ## [N]. `nombre-del-change`

  **Funcionalidad**: [descripción]
  **Historias**: US-XXX, US-XXX, ...
  **Reglas de negocio**: RN-XX, RN-XX, ...
  **Depende de**: `nombre-change-anterior` (razón)
  **Complejidad**: Baja | Media | Alta

  ---

  No implementes nada todavía. Solo generá el mapa y escribí el CHANGES.md.
Cuando yo lo revise y lo apruebe, empezamos con el primer `/opsx:propose`.
```

---

## Flujo Completo — Referencia Rápida

```
[VOS]  Ejecutás PROMPT 1  →  La IA hace preguntas
[VOS]  Respondés preguntas →  La IA genera los 3 .txt
[VOS]  Revisás y aprobás los 3 documentos
[VOS]  Los copiás a docs/ en el repo
[VOS]  Ejecutás PROMPT 2 en Claude Code  →  La IA genera CHANGES.md
[VOS]  Revisás el mapa de changes
[VOS]  /opsx:propose [primer-change]
[AGENTE] Genera proposal.md + design.md + tasks.md
[VOS]  Revisás los artefactos
[AGENTE] /opsx:apply [primer-change]
[AGENTE] /opsx:archive [primer-change]
        → repite para cada change
```

---

## Notas de Uso

- **Reemplazá** `Odontogest` en ambos prompts antes de usarlos.
- En el Prompt 1, si tenés un PDF o documento existente, adjuntálo antes de enviar — la IA lo leerá y solo preguntará lo que falte.
- En el Prompt 2, el `@` antes de los paths es la sintaxis de Claude Code para referenciar archivos del repo. Si usás otro agente, ajustá la sintaxis.
- El `CHANGES.md` generado por el Prompt 2 es una **propuesta**: revisala, discutila, modificala antes de ejecutar el primer `/opsx:propose`.
- Guardá estas plantillas en `docs/` o en un repositorio personal para reutilizarlas en futuros proyectos.
