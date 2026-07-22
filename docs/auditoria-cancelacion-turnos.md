# Auditoría Puntual — Cancelación de Turnos — OdontoGest

Este documento detalla el comportamiento del contrato real de cancelación de turnos en el backend para facilitar la planificación de cambios en el frontend y futuros flujos de notificaciones.

---

## 1. Estados de Turno Existentes
En la base de datos ([backend/models.py](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/models.py#L44)), el campo `estado` en la tabla `turnos` está definido como una columna de texto libre (`String(50)`):
```python
estado = Column(String(50), default="Pendiente")
```
No existen enums o constraints estrictos a nivel de base de datos. Sin embargo, en el código y lógica del backend, el ciclo de vida del turno opera bajo tres estados lógicos:
1. **`"Pendiente"`**: Estado asignado por defecto al crear el turno.
2. **`"Realizado"`**: Seteado cuando se cierra el turno con tratamientos y facturación.
3. **`"Cancelado"`**: Seteado cuando se anula mediante el endpoint de cancelación.

---

## 2. Endpoint de Cancelación
* **Método y Ruta:** `PATCH /turnos/{turno_id}/cancelar` (Ruta real en FastAPI).
* **Roles Autorizados:** `admin` y `secretaria`.
* **Comportamiento en Base de Datos:** Llama a la función [cancelar_turno](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/turnos.py#L30), la cual cambia el campo `estado` a `"Cancelado"`. No elimina la fila (soft-delete lógico).
* **Impacto en el Slot:** El endpoint no tiene interacción directa con ninguna tabla física de slots. La disponibilidad de la agenda se calcula en tiempo real.

---

## 3. Lógica de Soft-Delete / Anulación
El backend no implementa flags de borrado lógico tipo `activo = Column(Boolean)` en la tabla `turnos`. La anulación de la cita se maneja exclusivamente a través del estado `"Cancelado"`. Adicionalmente, existe una ruta de borrado físico (`DELETE /turnos/{turno_id}`) que remueve el registro de forma permanente.

---

## 4. Impacto en la Disponibilidad (Slots y Agenda Bulk)
El slot de un turno cancelado **vuelve a estar disponible automáticamente** de forma inmediata.
Tanto en la consulta diaria ([obtener_slots_con_estado](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/turnos.py#L84)) como en la consulta mensual bulk ([obtener_slots_bulk](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/turnos.py#L186)), la query que recupera turnos ocupados filtra explícitamente:
```python
models.Turno.estado.in_(["Pendiente", "Realizado"])
```
Como los turnos `"Cancelado"` son excluidos, los slots antes ocupados por el turno cancelado pasan a computar como `"libre"` al instante.

---

## 5. Impacto en Pagos y Cuenta Corriente
* **Estado actual del backend:** **No existe ninguna lógica de reversión**.
* Si un turno en estado `"Pendiente"` (sin facturar) se cancela, no hay impacto financiero ya que no existen registros de deuda o abonos en la cuenta corriente del paciente.
* Sin embargo, si un turno en estado `"Realizado"` (cerrado y facturado) es cancelado, el endpoint **no realiza ninguna validación** y cambia el estado a `"Cancelado"` sin tocar la cuenta corriente ni los pagos imputados. Esto causará un **descalce financiero** en la caja y los saldos del paciente.
* **Recomendación:** Agregar validaciones para bloquear la cancelación de turnos `"Realizado"` desde la API, o programar la reversión de sus movimientos asociados.

---

## 6. Campos Existentes Reutilizables para Historial y Notificaciones
Para registrar quién canceló, cuándo y por qué, la tabla `turnos` cuenta con las siguientes columnas que se pueden reutilizar:
* **`motivo`** (`String(255)`): Se puede utilizar para almacenar el motivo de cancelación (teniendo en cuenta que en el cierre de turno se concatena como `motivo_previo | comentarios`).
* **`actualizado_por_id`** (`Integer`): Almacena la relación al ID del `Usuario` que realiza la modificación (en este caso, la secretaria o admin que cancela).
* **Campos Faltantes:** No hay campos de auditoría temporal en la tabla `turnos` (falta una columna `actualizado_en` tipo `DateTime` o `motivo_cancelacion` específico). Si en el futuro se planean notificaciones por cambio de estado, convendría añadir un campo `actualizado_en` para auditoría o registrar la cancelación como una `EvolucionClinica` o evento en una tabla de auditoría.
