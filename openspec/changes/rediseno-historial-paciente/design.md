## Context

El perfil del paciente muestra actualmente un historial de pagos y tratamientos como un panel inline bajo la información del paciente. El panel es visualmente desordenado y obliga al usuario a desplazarse hacia abajo, ocultando el perfil. Además, el Resumen de Cuenta está limitado a un único div con saldo y un enlace pequeño.

Se propone rediseñar el Resumen de Cuenta con dos cards side‑by‑side y crear una página dedicada `/pacientes/:dni/historial` que muestre el historial completo en un layout de dos columnas (turnos | pagos). No se requieren cambios en el backend; se reutilizan los endpoints existentes `GET /pacientes/historial` y `GET /finanzas/pagos`.

## Goals / Non-Goals

**Goals:**
- Mejorar la usabilidad del historial del paciente.
- Presentar saldo y botón de historial en UI coherente y prominente.
- Permitir al usuario ver la lista completa de pagos como constancia.

**Non-Goals:**
- Modificar la API ni la lógica de negocio del backend.
- Introducir nuevas dependencias externas.

## Decisions

- **Dedicated route** `/pacientes/:dni/historial` en lugar de panel inline.  Razón: separación clara de concerns y scroll independiente.
- **Two‑card Resumen de Cuenta** usando grid de dos columnas; la tarjeta derecha contiene un botón de navegación con gradiente, reemplazando el enlace de texto pequeño.
- **Reutilizar componentes existentes** (`Card`, `Button`, `useNavigate`) para mantener consistencia visual.
- **Mantener API**: se usan los mismos endpoints `GET /pacientes/historial` y `GET /finanzas/pagos`; solo cambia la UI que consume los datos.
- **Eliminar estado innecesario** (`mostrarHistorial`, `historial`, `loadingHistorial`, `fechaDesde`, `fechaHasta`) del `PerfilPacientePage`.

## Risks / Trade-offs

- **Riesgo**: Navegación a una nueva página puede romper flujos existentes si enlaces duros quedan apuntando al panel inline.
  **Mitigación**: borrar o redirigir cualquier referencia al panel inline en el código y actualizar documentación.
- **Riesgo**: Duplicar lógica de filtros (fecha, método) entre columnas izquierda y derecha.
  **Mitigación**: reutilizar hooks de filtro comunes.

