## Why

El perfil del paciente tiene un historial de pagos y tratamientos que se abre inline como panel expandible debajo de la información del paciente. Esto tiene dos problemas: (1) el Resumen de Cuenta está visualmente pobre — un solo div con saldo y un link de texto minúsculo, y (2) el historial inline queda feo y desordenado, obligando al usuario a scrollear hacia abajo para verlo, perdiendo de vista el perfil del paciente. Además, no hay forma de ver todos los pagos realizados por un paciente como constancia/comprobante — solo se ven los pagos agrupados por turno dentro del historial clínico.

## What Changes

- **Rediseño del Resumen de Cuenta**: dos cards side-by-side dentro del grid del perfil — una con "Saldo Restante" (valor, ARS + USD) y otra con un botón prominente "Historial de Pagos y Tratamientos" que navega a una página dedicada.
- **Nueva página `/pacientes/:dni/historial`**: layout de dos columnas. Columna izquierda: historial de turnos con tratamientos, costos y deuda por turno (con filtros de fecha). Columna derecha: listado de todos los pagos registrados por el paciente con filtro por método de pago (efectivo/transferencia), funcionando como constancia/comprobante.
- **Eliminación del panel historial inline** del PerfilPacientePage (el bloque `{mostrarHistorial && (...)}`) y todo su state asociado.

## Capabilities

### New Capabilities

- `pagina-historial-paciente`: Página dedicada de historial de pagos y tratamientos del paciente, accesible desde el perfil vía ruta `/pacientes/:dni/historial`. Muestra en dos columnas: timeline de turnos con tratamientos y deudas, y tabla de pagos con filtro por método.

### Modified Capabilities

- `perfil-paciente`: La sección "Resumen de Cuenta" se rediseña con dos cards y el botón de historial navega a una ruta externa en vez de abrir un panel inline. Se elimina el panel historial expandible y sus estados asociados.

## Impact

- **Nuevo archivo**: `frontend/src/pages/HistorialPacientePage.tsx`
- **Modificado**: `frontend/src/App.tsx` (nueva ruta, nuevo import)
- **Modificado**: `frontend/src/pages/PerfilPacientePage.tsx` (rediseño resumen + eliminación panel inline + eliminación states/useEffects)
- **APIs existentes**: `GET /pacientes/historial?dni=X` y `GET /finanzas/pagos?dni_paciente=X` — sin cambios
- **Sin cambios backend**