## 1. Setup

- [ ] 1.1 Create new page component `src/pages/HistorialPacientePage.tsx` with two‑column layout, filters, totals, and payment table.
- [ ] 1.2 Add import and route `<Route path="/pacientes/:dni/historial" element={<HistorialPacientePage/>} />` in `src/App.tsx` (place before generic `/pacientes` route).

## 2. UI – Resumen de Cuenta redesign

- [ ] 2.1 Replace existing Resumen de Cuenta div with a `grid grid-cols-2 gap-4` containing two cards:
  - Left card: balance values (ARS / USD).
  - Right card: large button "Historial de Pagos y Tratamientos" that calls `navigate('/pacientes/${dni}/historial')`.
- [ ] 2.2 Ensure grid collapses to single column on screens < 768px.

## 3. UI – Remove inline historial panel

- [ ] 3.1 Delete state variables `mostrarHistorial`, `historial`, `loadingHistorial`, `fechaDesde`, `fechaHasta` from `src/pages/PerfilPacientePage.tsx`.
- [ ] 3.2 Remove `useEffect` that loads historial via `getHistorialPaciente`.
- [ ] 3.3 Delete JSX block `{mostrarHistorial && ( … )}` and any related imports (`Button`, `faHistory`, etc.).
- [ ] 3.4 Clean up unused imports at top of the file.

## 4. Verification

- [ ] 4.1 Run `npm run dev` and open a patient profile.
- [ ] 4.2 Click the new Resumen de Cuenta button; verify navigation to `/pacientes/:dni/historial`.
- [ ] 4.3 In historial page, confirm totals match API, turnos list displays correctly, and payments table shows **all** payments.
- [ ] 4.4 Test method filter buttons (Todos, Efectivo, Transferencia) – table updates accordingly.
- [ ] 4.5 Resize browser to < 768px; verify cards stack vertically and layout remains usable.
- [ ] 4.6 Ensure no TypeScript errors or console warnings.
