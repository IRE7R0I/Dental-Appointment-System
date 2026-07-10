# Diseño Consolidado — frontend2 (Odontogest)

> Fuente de verdad visual para la implementación de `frontend2/`.
> Complementa (no reemplaza) `docs/BLUEPRINT_FRONTEND2.md` (vistas/endpoints/componentes).
> Stack de UI: **shadcn/ui + Tailwind CSS 4.x** (sin Chakra, sin skill `frontend-design`).

---

## 1. Paleta de marca

Base: fórmula Comex 3C "Afluente" (turquesa + beige + blanco).

| Token | Hex | Uso |
|---|---|---|
| `--brand-50` | `#E1F5EE` | Fondos tinte (fills suaves de tarjetas, hover) |
| `--brand-100` | `#9FE1CB` | Acentos secundarios, bordes de foco suave |
| `--brand-200` | `#5DCAA5` | Iconografía sobre fondo blanco |
| `--brand-400` | `#1D9E75` | Color primario de marca — header, botón primario, tab activo |
| `--brand-600` | `#0F6E56` | Sidebar sólida (variante A), hover de primario, texto sobre `--brand-50` |
| `--brand-800` | `#085041` | Texto sobre fondos `--brand-50` (títulos de KPI) |
| `--brand-900` | `#04342C` | Texto de mayor contraste sobre fondo turquesa |
| `--neutral-warm-50` | `#F1EFE8` | Fondo de página (page background), no blanco puro |
| `--neutral-warm-100` | `#D8C3A5` | Acento cálido — avatares default, separadores decorativos |
| `--neutral-warm-600` | `#5F5E5A` | Texto secundario |
| `--neutral-warm-900` | `#2C2C2A` | Texto primario |
| `--surface-white` | `#FFFFFF` | Tarjetas, sidebar expandida, inputs |

**Regla de uso:** el turquesa (`--brand-*`) es el único acento de marca. No se introduce un segundo color "decorativo" — los demás colores del sistema (abajo) son exclusivamente semánticos, nunca decorativos.

## 2. Colores semánticos (estado, no marca)

Estos son independientes de la paleta de marca — comunican significado funcional (pagado, pendiente, error), no identidad visual.

| Rol | Fondo tinte | Texto/ícono | Uso |
|---|---|---|---|
| Éxito / pagado / confirmado | `#EAF3DE` | `#3B6D11` | Turno confirmado, pago registrado, tratamiento realizado |
| Pendiente / atención | `#FAEEDA` | `#854F0B` | Turno pendiente, deuda parcial, slot por confirmar |
| Error / cancelado / deuda vencida | `#FCEBEB` | `#A32D2D` | Turno cancelado, error de validación, deuda vencida |
| Info / neutro | `#F1EFE8` | `#5F5E5A` | Datos informativos sin carga de urgencia |
| Slot bloqueado (agenda) | rayado diagonal gris sobre `#F1EFE8` | `#5F5E5A` | Bloqueo manual de secretaria/admin, ver sección 6 |

**Nunca** usar el turquesa de marca para comunicar "éxito" — son sistemas distintos aunque ambos usen tonos verdes. Si se confunden, un usuario podría interpretar toda la UI como "todo bien" por el color de fondo dominante.

## 3. Colores de doctor (dinámicos, no de este sistema)

El color de cada doctor **no** forma parte de la paleta fija — viene del campo `color` en `GET /doctores/` (hex libre elegido por el admin). Se usa exclusivamente como:
- Punto/badge circular de 8px junto al nombre en listados de turnos.
- Borde lateral de 3px en tarjetas de turno en la agenda.

Nunca se usa como fondo de tarjeta completo (para no competir con los colores semánticos de estado).

## 4. Tipografía

- Familia: la que traiga shadcn por default (Inter o system-ui), sin fuentes custom — prioridad a legibilidad en tablas densas por sobre personalidad tipográfica.
- Escala: `12px` (etiquetas/captions), `13px` (texto secundario/tabla), `14–15px` (texto de cuerpo), `17–18px` (valores KPI/números destacados), `20px` (títulos de sección).
- Pesos: `400` regular para texto de cuerpo, `500` para valores destacados y navegación activa. No usar `600`/`700` — se ve pesado contra superficies claras.
- Sentence case en toda la UI (botones, tabs, encabezados de sección). Nunca Title Case ni mayúsculas sostenidas.

## 5. Layout base

- **Fondo de página:** `--neutral-warm-50` (`#F1EFE8`), no blanco puro — así las tarjetas blancas destacan por contraste real.
- **Sidebar:** ancho `190px` expandida / `56px` colapsada a solo íconos. Colapsa con una transición simple de ancho (sin animaciones complejas). Persistir preferencia de colapsado en `localStorage` (esto sí es aceptable en `localStorage`, es preferencia de UI, no dato de negocio).
- **Sidebar variante elegida:** sólida en `--brand-600` con ítem activo en `--brand-50`/texto `--brand-800` (Variante A del mockup). Header superior no lleva banda de color — queda blanco, con buscador + notificaciones + avatar.
- **Contenedor de contenido:** tarjetas blancas con `border-radius: 12px`, borde `0.5px` sutil, padding `16px 20px`, sin sombras decorativas.
- **Grid de KPIs:** 4 columnas en desktop, colapsa a 2 en tablet — un único componente `TarjetaKPI` reutilizado en las 9 vistas (ver sección 6).

## 6. Sistema de tarjetas — regla única

**Un solo template de tarjeta KPI para toda la app.** Estructura fija:

```
[ícono circular 32px, fondo tinte semántico]
[valor destacado, 17–18px, weight 500]
[etiqueta, 11–12px, texto secundario]
```

Variables permitidas: color del ícono/fondo (según semántica, sección 2), y tamaño (chico para grillas de 4, grande para una tarjeta destacada individual, ej. saldo de un paciente en su ficha). Nunca se introduce un layout de tarjeta distinto — ni con imagen de fondo, ni con barra de progreso embebida, ni con estructura invertida (número arriba, ícono abajo).

## 7. Componentes específicos de C-12 (ya con contrato de backend confirmado)

- **`SelectorColorHex`**: color picker o paleta predefinida, valida `#RRGGBB` antes de enviar a `POST/PUT /doctores`.
- **`SlotHorario`**: tres estados visuales —
  - Libre: fondo blanco, hora visible, ícono `+` al hover.
  - Ocupado: fondo tinte según estado semántico del turno (pendiente/confirmado), punto de color del doctor, apellido del paciente.
  - Bloqueado: fondo rayado gris (`repeating-linear-gradient` sutil o patrón de líneas diagonales `#D3D1C7`), motivo en tooltip, botón de desbloqueo si el rol lo permite. Usa `slot_bloqueado_id` ya expuesto por el backend.
- **`ConstanciaPagoBadge`**: texto pequeño con el valor de `constancia_turno` tal cual lo arma el backend (ej. "14/06 — Pérez (16:30)"), en `--neutral-warm-600`, sin fondo propio — vive dentro de la fila de la tabla de pagos.
- Bloqueos consecutivos en agenda semanal: se agrupan en una sola tarjeta alta con el motivo centrado (decisión ya tomada).
- Vista mensual: indicador resumido "Parcial"/"Completo" por día (colores semánticos: parcial = tinte pendiente, completo = tinte éxito), detalle real al entrar al día.

## 8. Lo que este documento NO define

- Nombres de archivo o estructura de carpetas de `frontend2/` — eso va en el prompt de implementación.
- Copys/textos exactos de botones y mensajes — se escriben en sentence case al implementar, siguiendo el tono de `AGENTS.md`.
- Iconografía específica por vista — se elige de la librería de íconos que uses con shadcn (ej. Lucide) al implementar cada componente.

---

Cuando quieras, el siguiente paso es el prompt de implementación de `frontend2/` tomando este documento + `BLUEPRINT_FRONTEND2.md` como input.
