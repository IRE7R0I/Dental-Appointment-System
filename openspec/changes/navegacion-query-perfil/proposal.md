## Why

Al volver desde la página de historial, el botón retrocede a la lista de pacientes en vez del perfil del paciente. Esto rompe el flujo esperado: Lista → Perfil → Historial → Perfil → Lista.

## What Changes

- Modificar botón retroceso en `HistorialPacientePage` para navegar a `/pacientes?dni=<dni>`.
- En `PerfilPacientePage`, leer query‑param `dni` y abrir automáticamente el perfil correspondiente.

## Capabilities

- `navegacion-query-perfil`: ajuste de navegación del cliente.
