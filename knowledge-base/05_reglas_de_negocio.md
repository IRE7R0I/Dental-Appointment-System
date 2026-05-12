# 05 — Reglas de Negocio

## RN-01: Horarios de atención

- Mañana: 09:00 a 12:30 (último turno 12:30, finaliza 13:00).
- Tarde: 16:00 a 19:30 (último turno 19:30, finaliza 20:00).
- Clínica cerrada: 13:00 a 16:00 (almuerzo).
- **Sábado: solo mañana 09:00-12:30. Sin atención por la tarde.**
- Sin atención: jueves y domingo.
- Slots cada 30 minutos (09:00, 09:30, 10:00, ...).

**Validación en backend**: `validar_horario_atencion(dt)` — implementada en CHANGE-007.
La validación actual en `routers/turnos.py` usa `hora < 9 or hora >= 19` — debe migrarse a franjas.

## RN-02: Estados del turno

| Estado | Significado | Quién lo setea |
|--------|------------|----------------|
| `solicitado` | Paciente envió solicitud desde portal | Sistema (CHANGE-007) |
| `pendiente` | Secretaria aceptó la solicitud (confirmado en agenda) | Secretaria |
| `confirmado` | Sinónimo de pendiente (compatibilidad) | — |
| `bloqueado` | Secretaria bloqueó slot manualmente | Secretaria (CHANGE-007) |
| `realizado` | Atendido y cobrado (cierre de turno) | Secretaria |
| `cancelado` | Cancelado por paciente o secretaria | Paciente (UUID) o secretaria |
| `rechazado` | Secretaria rechazó la solicitud (con motivo) | Secretaria (CHANGE-007) |

**Transiciones válidas**:
```
solicitado → pendiente   (secretaria acepta)
solicitado → rechazado   (secretaria rechaza, con motivo)
solicitado → cancelado   (paciente cancela vía UUID)
pendiente  → realizado   (secretaria cierra con cobro)
pendiente  → cancelado   (secretaria o paciente vía UUID)
bloqueado  → cancelado   (secretaria libera)
```

## RN-03: Prevención de duplicados

- No pueden existir dos turnos para el mismo doctor a la misma hora.
- Validación en `POST /turnos` y `POST /portal/reservar`.
- Estados "cancelado" y "rechazado" no bloquean el slot.

## RN-04: Monedas

- Monedas aceptadas: `ARS` y `USD`.
- TypeScript: `type Moneda = 'ARS' | 'USD'`. NUNCA strings libres.
- Precios pueden ser solo ARS, solo USD, o ambos.
- Al menos un precio requerido en `TratamientoCatalogo`.

## RN-05: Pagos y cobros

- Métodos: `Efectivo`, `Transferencia` (o Mercado Pago).
- Sin procesamiento de tarjetas de crédito.
- Al cerrar turno: se registran tratamientos + pagos. Si el pago es menor al total, la diferencia va a cuenta corriente como deuda.
- Precios del catálogo son **editables** al cerrar turno (descuentos, recargos).

## RN-06: Shadow profiles

- Si un paciente solicita turno con un DNI que no existe, se crea automáticamente.
- Datos requeridos para nuevo paciente: nombre, apellido, teléfono, obra_social.
- Email es opcional.
- Si el DNI ya existe, no se modifican sus datos (se usa el perfil existente).

## RN-07: Obra Social

- El campo `Paciente.obra_social` es texto libre (String).
- El selector usa el catálogo `ObraSocial` como fuente.
- Si una obra social se elimina del catálogo, los pacientes que la tenían no se rompen.
- "Particular" siempre es una opción.

## RN-08: UUID del turno

- UUID v4 generado automáticamente al crear turno desde portal.
- Formato: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.
- No requiere autenticación para consultar.
- Permite cancelar el turno si está en estado "solicitado" o "pendiente".
- El enlace público es: `/consulta/{uuid}`.

## RN-09: Notificaciones

- Prioridad: email (si tiene), WhatsApp (si tiene teléfono).
- Si no tiene ninguno → UUID solo en pantalla de confirmación.
- Eventos: turno confirmado, turno rechazado (con motivo), recordatorio 48h, recordatorio 2h.
- Recordatorios automáticos via APScheduler cada 10 minutos.
- WhatsApp bot: responde keywords "turno", "secretaria", "llamar".

## RN-10: Rate limiting

- `POST /auth/login`: 5 req/min por IP (anti brute-force).
- `POST /portal/reservar`: 5 req/min por IP.
- `GET /pacientes/verificar/{dni}`: 10 req/min por IP.
- `GET /portal/disponibilidad`: 30 req/min por IP.

## RN-11: Cierre de turno

- Al cerrar turno (`PUT /turnos/{turno_id}/cerrar`):
  - Se registran tratamientos realizados (de catálogo o manual).
  - Se registran pagos (múltiples, en ARS y/o USD).
  - Se calcula deuda = total tratamientos - total pagado.
  - La deuda se registra en cuenta corriente del paciente.
  - Estado del turno cambia a "realizado".

## RN-13: Clasificación de ingresos

Los pagos se agrupan en dos categorías según la obra social del paciente:
- **Particulares**: `obra_social == "Particular"` (pagan de su bolsillo).
- **Obras Sociales / Coseguros**: resto de obras sociales (OSDE, Swiss Medical, etc.).

El Dashboard KPI y el resumen de caja muestran los ingresos separados por estas
dos categorías, cada una desglosada en ARS y USD.

## RN-12: Seguridad de datos

- Contraseñas hasheadas con bcrypt (nunca texto plano).
- JWT con expiración y refresh automático.
- CORS restrictivo en producción (solo dominio propio).
- CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- Nunca loguear DNI, email, teléfono ni datos clínicos.
- GET /pacientes/verificar/{dni} no devuelve email ni historial.
