## Context

Se necesita que la navegación de la página de historial vuelva al perfil del paciente en lugar de a la lista completa. Además, el perfil debe poder abrirse directamente mediante query‑param `dni`.

## Goals

- Botón «←» en `HistorialPacientePage` redirija a `/pacientes?dni=<dni>`.
- `PerfilPacientePage` detecte `dni` en la URL y abra automáticamente ese perfil.
- Mantener experiencia de retroceso: Historial → Perfil → Lista.

## Decisions

- Usar query‑param en vez de crear nueva ruta `/pacientes/:dni` para evitar cambios estructurales mayores.
- Implementar lógica de carga en un `useEffect` que dependa de `paramDni` y del estado `loading` de la lista de pacientes.

## Risks

- Si la lista de pacientes aún está cargando cuando el efecto se ejecuta, el paciente no se encontrará. Mitigación: esperar a que `loading` sea `false` antes de buscar.
- Parametro `dni` inválido podría dejar la vista en lista; se trata como caso fallback.
