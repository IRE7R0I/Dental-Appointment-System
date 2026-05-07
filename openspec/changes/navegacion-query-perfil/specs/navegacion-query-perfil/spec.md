## ADDED Requirements

### Requirement: Historial back navigation via query param
The system SHALL navigate back from `/pacientes/:dni/historial` to `/pacientes?dni=<dni>` when the user clicks the back button.

#### Scenario: Back from historial to patient profile
- **WHEN** user is on the historial page for patient with DNI `12345678` and clicks the back arrow.
- **THEN** the application navigates to `/pacientes?dni=12345678` and displays that patient’s profile.

### Requirement: Perfil loads patient from query param
The system SHALL, on mounting `PerfilPacientePage`, read the query parameter `dni` and automatically display that patient’s profile.

#### Scenario: Direct URL with dni query
- **WHEN** user accesses `/pacientes?dni=12345678`.
- **THEN** the page shows the profile of the patient with DNI `12345678`.
