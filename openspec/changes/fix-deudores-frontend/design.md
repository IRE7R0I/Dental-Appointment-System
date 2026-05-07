## Context

El frontend no muestra correctamente los deudores en la sección de pagos, aunque el backend tiene los datos. Se necesita diagnosticar y corregir el flujo de datos entre el backend y el frontend.

## Goals / Non-Goals

**Goals:**
- Corregir la visualización de deudores en la tabla de pagos
- Asegurar que el KPI "Saldo en la Calle" muestre valores correctos
- Verificar que el filtrado de deudores funcione correctamente

**Non-Goals:**
- Modificar la estructura de la base de datos
- Cambiar el endpoint del backend de deudores
- Modificar otros componentes fuera de la página de pagos

## Decisions

1. **Diagnóstico del problema** - Se revisará el flujo de datos desde el backend hasta el frontend para identificar el punto donde se pierde la información.

2. **Verificación de tipos de datos** - Se comprobará que los tipos de datos devueltos por el backend coincidan con los esperados por el frontend.

3. **Revisión de estado de carga** - Se verificará que el estado de carga se maneje correctamente en el componente React.

## Risks / Trade-offs

**Risk**: El diagnóstico puede revelar problemas de sincronización entre frontend y backend
**Mitigation**: Implementar mecanismos de manejo de errores y reintentos en la llamada al API

**Risk**: Problemas de renderizado en la tabla pueden ser causados por datos mal formateados
**Mitigation**: Validar y formatear correctamente los datos antes de pasarlos al componente de tabla