## ADDED Requirements

### Requirement: Dedicated historial page
The system SHALL provide a new route `/pacientes/:dni/historial` that renders a dedicated page displaying the patient’s treatment history and a complete list of payments.

#### Scenario: Navigate to historial page
- **WHEN** the user clicks the "Historial de Pagos y Tratamientos" button on the Resumen de Cuenta card
- **THEN** the application navigates to `/pacientes/<dni>/historial` and renders `HistorialPacientePage`.

## MODIFIED Requirements

*None* (no existing capability is being modified for this new feature).