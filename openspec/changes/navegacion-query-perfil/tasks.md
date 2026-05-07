## 1. UI – Historial back navigation

- [ ] 1.1 Cambiar handler back en `src/pages/HistorialPacientePage.tsx` de `navigate(-1)` a `navigate(`/pacientes?dni=${dni}`)`.

## 2. UI – Perfil carga por query param

- [ ] 2.1 Importar `useSearchParams` en `src/pages/PerfilPacientePage.tsx`.
- [ ] 2.2 Leer `dni` con `const [search] = useSearchParams(); const paramDni = search.get('dni');`.
- [ ] 2.3 Añadir `useEffect` que, si `paramDni` existe y no hay `pacienteSel`, busque en `pacientes` y ejecute `abrirPerfil(pacienteEncontrado)`.
- [ ] 2.4 Manejar caso de carga pendiente (`loading`) antes de buscar.

## 3. Verificación

- [ ] 3.1 `npm run dev` y probar flujo Lista → Perfil → Historial → back → Perfil → back → Lista.
