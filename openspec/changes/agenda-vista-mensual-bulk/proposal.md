# Proposal: agenda-vista-mensual-bulk

## What

Endpoint `GET /turnos/slots/bulk` que devuelve conteos agregados de
slots (libres/ocupados/bloqueados) por día para un rango de fechas y
un conjunto de doctores. Responde en **una sola request** lo que la
alternativa naïve haría con ~80-90 requests (una por día × doctor).

## Why

La vista mensual de agenda en frontend2 necesita mostrar, por cada día
del mes visible:
- Indicador "Parcial"/"Completo" según disponibilidad
- Contador de slots libres (ej. "16 lib.", "8 lib.")

Sin este endpoint, el frontend tendría que hacer un `GET /turnos/slots`
por cada combinación (día × doctor), resultando en 30-42 días × 1-3
doctores = hasta ~126 requests por carga de vista mensual. Inviable en
Railway/Render free tier.

## Scope

- Nuevo endpoint: `GET /turnos/slots/bulk`
- Query params: `fecha_desde`, `fecha_hasta`, `id_doctor` (comma-separated, opcional)
- Response: objeto indexado por fecha con totales combinados + desglose por doctor
- Cálculo sobre tablas de C-16: `horarios_doctor` + `dias_no_laborables_doctor`
- Performance: 4 bulk queries SQL + agregación Python (no N+1)

## Dependencies

- C-16 `horarios-individuales-por-doctor` — completado ✅
- C-12 `correccion-horarios-doctores-pagos` — completado ✅

## Governance: MEDIO

Impacto acotado: un endpoint nuevo, sin modificar comportamiento existente.
