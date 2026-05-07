# Spec: fix-deudores-frontend

## ADDED Requirements

### Requirement: Mostrar deudores en tabla de pagos
El sistema DEBE mostrar correctamente los clientes deudores en la tabla de la sección de pagos del frontend.

#### Scenario: Deudores se muestran en tabla
- **WHEN** se carga la página de pagos
- **THEN** se muestran los deudores con sus saldos correspondientes

#### Scenario: KPI muestra saldo correcto
- **WHEN** se cargan los deudores
- **THEN** el KPI "Saldo en la Calle" muestra la suma correcta de los saldos

### Requirement: Filtrado de deudores funciona
El sistema DEBE permitir filtrar deudores por tipo de saldo (ARS, USD, Al Día).

#### Scenario: Filtrar por deudores ARS
- **WHEN** se selecciona el filtro "Deudores ARS"
- **THEN** se muestran solo los deudores con saldo ARS > 0

#### Scenario: Filtrar por deudores USD
- **WHEN** se selecciona el filtro "Deudores USD"
- **THEN** se muestran solo los deudores con saldo USD > 0

### Requirement: Registrar abono a deudor
El sistema DEBE permitir abrir el side sheet para registrar abonos cuando hay deudores.

#### Scenario: Abrir side sheet de cobro
- **WHEN** se hace clic en el botón de pago de un deudor
- **THEN** se abre el side sheet con los datos del deudor