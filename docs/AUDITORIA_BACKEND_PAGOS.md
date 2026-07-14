# Auditoría Técnica de Caja y Cobros — OdontoGest

Este documento presenta el estado real y detallado del backend para el módulo de Caja, Pagos, deudores y cuentas corrientes, cruzado contra las auditorías previas y las implementaciones de los cambios anteriores (incluyendo C-14). 

---

## 1. Estado Real de `GET /finanzas/pagos`

El endpoint `GET /finanzas/pagos` está declarado en [backend/routers/finanzas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/finanzas.py) y es resuelto por la función `listar_pagos_filtrados` en [backend/crud/finanzas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/crud/finanzas.py).

### 1.1 Query Parameters Aceptados
El endpoint acepta los siguientes parámetros en la consulta:

| Parámetro | Tipo | Acción Exacta en el Código |
| :--- | :--- | :--- |
| `fecha_desde` | `Optional[date]` | Filtra en la query de base de datos los pagos con fecha mayor o igual al inicio de ese día (`fecha_pago >= datetime.combine(fecha_desde, time.min)`). |
| `fecha_hasta` | `Optional[date]` | Filtra en la query de base de datos los pagos con fecha menor o igual al fin de ese día (`fecha_pago <= datetime.combine(fecha_hasta, time.max)`). |
| `metodo_pago` | `Optional[str]` | Normaliza el método mediante una función interna (`_normalizar_metodo`). Si el string coincide con `"banco"`, `"mercadopago"`, `"mp"`, `"transferencia"` o `"transfer"`, lo convierte a `"transferencia"`. En caso contrario, lo convierte a `"efectivo"`. Luego aplica un filtro de coincidencia parcial insensible a mayúsculas (`Pago.metodo_pago.ilike("%<metodo_normalizado>%")`). |
| `dni_paciente` | `Optional[str]` | Filtra en memoria (código Python) los resultados de la consulta. Excluye cualquier pago cuyo DNI de paciente asociado no coincida con el provisto (`if dni_paciente and dni != dni_paciente: continue`). |
| `id_doctor` | `Optional[int]` | Filtra en memoria (código Python). Si el pago tiene un `id_turno` asociado, carga la relación del turno y verifica si el ID del doctor coincide. **Importante:** Los pagos generales / libres (sin turno asociado) no tienen `id_turno`, por lo que si se filtra por doctor, estos pagos se omiten siempre. |
| `solo_deudores` | `bool` (default `False`) | Consulta de forma auxiliar la tabla `CuentaCorriente` para obtener los DNI de pacientes con saldo ARS > 0 o saldo USD > 0. Luego, filtra en memoria (código Python) reteniendo únicamente los pagos de aquellos pacientes que pertenezcan a ese conjunto. |

### 1.2 Soporte de Filtros Requeridos

*   **¿Soporta filtro por rango de fechas?** **Sí.** Está completamente implementado a nivel base de datos usando `fecha_desde` y `fecha_hasta`.
*   **¿Por método de pago?** **Sí.** Filtrado a nivel base de datos usando `metodo_pago` con normalización inteligente intermedia (mapeando mercadopago, transferencia, etc.).
*   **¿Por moneda?** **No.** La API **no** acepta ningún parámetro de moneda ni realiza filtros sobre la columna `Pago.moneda`.
*   **¿Por doctor?** **Sí.** Se soporta usando `id_doctor`, aunque con la limitación de que se ejecuta en memoria y solo aplica a pagos vinculados a turnos (excluye amortizaciones directas o pagos en cuenta sin turno).
*   **¿Por si el turno quedó parcial o saldado?** **No.** No existe lógica alguna que calcule o filtre individualmente si la deuda de un turno específico fue saldada o quedó parcial. La base de datos asocia pagos a turnos, pero el estado de deuda se gestiona de manera global y consolidada a nivel de cuenta corriente del paciente.

### 1.3 Lógica Resuelta en Frontend vs. Backend

Actualmente, en la vista del Libro de Caja del frontend ([PagosPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/PagosPage.tsx)):
*   **Filtros de Fechas y Método:** Se delegan directamente al backend pasando los parámetros `fecha_desde`, `fecha_hasta` y `metodo_pago`.
*   **Cálculo de Totales:** El frontend realiza la sumatoria de ingresos agrupándolos por moneda en el cliente de forma dinámica:
    ```typescript
    const pagosTotalesARS = pagos.reduce((s, p) => p.moneda === 'ARS' ? s + p.monto : s, 0);
    const pagosTotalesUSD = pagos.reduce((s, p) => p.moneda === 'USD' ? s + p.monto : s, 0);
    ```
*   **Agrupamiento Contable:** El frontend agrupa los pagos individuales en bloques por DNI de paciente y fecha de pago para mostrarlos como "transacciones unificadas" de caja, ordenándolas cronológicamente de forma descendente en el cliente.
*   **Filtros de Doctor y Paciente:** No están conectados en la UI general del Libro de Caja de `PagosPage.tsx` (aunque la API los soporta). Sin embargo, `dni_paciente` sí se consume en las fichas del paciente (`PerfilPacientePage.tsx` y `HistorialPacientePage.tsx`) para listar los pagos específicos de esa persona.

---

## 2. Estado Real del Listado de Deudores / Morosos

### 2.1 Endpoint del Listado
El endpoint que devuelve la lista de deudores es:
*   **`GET /pacientes/deudores`** (definido en [backend/routers/pacientes.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/routers/pacientes.py) y resuelto en [backend/crud/pacientes.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/crud/pacientes.py)).

### 2.2 Campos devueltos por Paciente
El endpoint devuelve un listado estructurado bajo el esquema `DeudorResponse`:
*   `dni`: `str`
*   `nombre`: `str`
*   `apellido`: `str`
*   `telefono`: `Optional[str]`
*   `saldo_ars`: `float` (representa `cuenta_corriente.saldo_ars`)
*   `saldo_usd`: `float` (representa `cuenta_corriente.saldo_usd`)

### 2.3 Antigüedad de Deuda e Historial
*   **¿Existe cálculo de antigüedad de deuda?** **No.** Ni el backend ni el frontend calculan actualmente cuántos días han transcurrido desde el último pago o desde el cargo de deuda más antiguo.
*   La tabla `CuentaCorriente` cuenta con la columna `ultima_actualizacion` (que registra la fecha/hora de la última transacción), pero este dato **no se expone** en `DeudorResponse` (solo está disponible al consultar la cuenta corriente individual de un paciente mediante `GET /pacientes/{dni}/cuenta`).

### 2.4 Ordenamiento por Defecto
*   El backend recupera las cuentas corrientes aplicando únicamente el filtro de saldos mayores a cero (`saldo_ars > 0` o `saldo_usd > 0`) y las devuelve tal como las retorna el motor de base de datos (sin cláusula `order_by` explícita).
*   El frontend recibe esta lista y la renderiza de inmediato sin aplicarle ningún tipo de ordenamiento secundario en el cliente.

---

## 3. Comparación con lo Último Documentado

Al contrastar la realidad actual con [AUDITORIA_BACKEND.md](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/docs/AUDITORIA_BACKEND.md) y [Cambios_Respecto_Anterior_Auditoria.md](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/docs/Cambios_Respecto_Anterior_Auditoria.md):

1.  **C-14 (Historia Clínica y Evoluciones):** 
    *   Este cambio modificó la firma y la lógica interna de `cerrar_turno_con_pago` en [backend/crud/finanzas.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/crud/finanzas.py) para que, al cerrar el turno e impactar los pagos/tratamientos, cree de forma paralela la evolución clínica (`EvolucionClinica`) asociada al turno, persista la pieza dental/lesión y genere los movimientos contables (`cargo` y `pago`) correspondientes en la cuenta corriente del paciente.
    *   **Efecto colateral en finanzas:** C-14 no alteró los endpoints de consulta de caja ni agregó lógica de antigüedad, ordenamiento o filtros adicionales de cobros. Mantener estas áreas intactas fue consistente con el alcance del cambio.
2.  **C-12 (Horarios y Slots):**
    *   C-12 introdujo en el esquema de pagos el campo `constancia_turno` (por ejemplo, `"14/06 - Perez (16:30)"`), el cual es calculado dinámicamente al registrar o listar pagos para facilitar la identificación visual del cobro en el libro contable de caja.
    *   Tanto `GET /finanzas/pagos` como `POST /finanzas/pagos` exponen este campo correctamente.

---

## 4. Matriz de Estado y Recomendación

Para evitar duplicar código o reescribir lógica innecesaria, se clasifica a continuación lo requerido por el módulo de Caja y Cobros en dos categorías:

### 4.1 Ya Existe en Backend (Solo falta conectar o mejorar en Frontend)
*   **Filtro por Doctor en Libro de Caja:** La API ya permite enviar `id_doctor` a `GET /finanzas/pagos`. Si se desea implementar este filtro en la interfaz de caja, solo se requiere diseñar el selector de doctores y enviarlo como query parameter.
*   **Filtro por Paciente en Libro de Caja:** La API ya soporta `dni_paciente` en `GET /finanzas/pagos`. Se puede integrar un buscador predictivo o selector de pacientes en la UI de caja para filtrar transacciones de forma precisa desde el servidor.
*   **Filtro "Solo deudores" en Libro de Caja:** La API ya cuenta con el parámetro `solo_deudores` en `GET /finanzas/pagos` para retornar únicamente transacciones vinculadas a clientes morosos.

### 4.2 No Existe en Backend (Requiere desarrollo nuevo)
*   **Filtro por Moneda en Libro de Caja:** Se debe modificar `listar_pagos` en `backend/routers/finanzas.py` y `listar_pagos_filtrados` in `backend/crud/finanzas.py` para aceptar un parámetro `moneda` (ej: `"ARS"` o `"USD"`) y filtrar la query de base de datos (`models.Pago.moneda == moneda`).
*   **Filtro por Turno Parcial o Saldado:** No existe a nivel de base de datos un flag o cómputo por turno. Si se requiere esto, hay que agregar un cálculo de deuda específico a nivel de turno o procesar los totales de tratamientos y pagos por cada turno en base de datos.
*   **Cálculo de Antigüedad de Deuda:** Para mostrar la antigüedad en el listado de deudores, se debe:
    1.  Modificar la consulta de `listar_deudores` en [backend/crud/pacientes.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/crud/pacientes.py) para que busque el movimiento de tipo `"cargo"` sin saldar más antiguo del paciente o en su defecto calcule los días transcurridos desde el último movimiento de cuenta de tipo `"cargo"`.
    2.  Extender la respuesta `DeudorResponse` en [backend/schemas/pacientes.py](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/backend/schemas/pacientes.py) para incluir campos como `dias_antiguedad` o `fecha_ultimo_pago`.
*   **Ordenamiento por Defecto en Morosos:** Si se desea que el listado de deudores ordene por volumen de deuda o antigüedad por default, se debe agregar el parámetro `order_by` en la consulta SQLAlchemy de `listar_deudores` o realizar un ordenamiento explícito en la lista antes de retornarla.
