## MODIFIED Requirements

### Requirement: Resumen de Cuenta redesign
The system SHALL replace the existing single-div Resumen de Cuenta with two side‑by‑side cards within a grid layout:
- **Left card** shows the remaining balance in ARS and USD.
- **Right card** contains a prominent button labeled "Historial de Pagos y Tratamientos" that navigates to `/pacientes/:dni/historial`.
The button shall use the same gradient styling as other primary actions.

#### Scenario: Resumen de Cuenta UI
- **WHEN** a user views the patient profile page
- **THEN** the Resumen de Cuenta appears as two cards as described, and the button is visible and clickable.

## REMOVED Requirements

### Requirement: Inline historial panel
**Reason**: Replaced by dedicated historial page for better UX.
**Migration**: Remove all UI code related to `{mostrarHistorial && ...}` and associated state (`mostrarHistorial`, `historial`, `loadingHistorial`, `fechaDesde`, `fechaHasta`).