# Proposal: Fix visualización de deudores en el frontend

## Problem Statement

Los clientes deudores no se muestran correctamente en la sección de pagos del frontend, aunque existen en el backend. Esto impide que el personal pueda registrar cobros de cuentas corrientes.

## Capabilities

- fix-deudores-frontend

## Stakeholders

- Personal administrativo
- Contadores

## Success Metrics

- Deudores se muestran correctamente en la tabla de PagosPage
- KPI "Saldo en la Calle" muestra valores correctos
- Se puede registrar abonos a deudores

## Technical Approach

Diagnosticar y corregir el problema en el flujo de datos entre el backend y el frontend en la sección de pagos, específicamente en la visualización de deudores.

## Risks

- Problemas de conexión con el backend
- Errores en el filtrado de deudores
- Incompatibilidad de tipos de datos entre frontend y backend