# 05 — Reglas de Negocio

## RN-01: Horarios de atención
- Lunes a viernes: mañana 09:00-12:30, tarde 16:00-19:30.
- Sábado: solo mañana 09:00-12:30.
- Sin atención: jueves y domingo.
- Clínica cerrada: 13:00 a 16:00.
- Slots cada 30 minutos.
- Implementado en CHANGE-007 (actualmente validación simplificada).

## RN-02: Estados del turno
| Estado | Significado | Quién lo setea |
|--------|------------|----------------|
| `solicitado` | Paciente envió solicitud | Sistema (CHANGE-007) |
| `pendiente` | Secretaria aceptó | Secretaria |
| `bloqueado` | Secretaria bloqueó slot | Secretaria |
| `realizado` | Atendido y cobrado | Secretaria |
| `cancelado` | Cancelado | Paciente (UUID) o secretaria |
| `rechazado` | Secretaria rechazó con motivo | Secretaria |

**Transiciones**:
- solicitado → pendiente (acepta), rechazado (rechaza), cancelado (paciente cancela)
- pendiente → realizado (cierra con cobro), cancelado
- bloqueado → cancelado (libera)

Nota: actualmente models.py usa valores simplificados. CHANGE-007 migrará.

## RN-03: Prevención de duplicados
No pueden existir dos turnos mismo doctor + misma hora. Estados "cancelado" y "rechazado" no bloquean.

## RN-04: Monedas
ARS y USD. `type Moneda = 'ARS' | 'USD'`. Al menos un precio en TratamientoCatalogo.

## RN-05: Pagos y cobros
Efectivo o Transferencia. Sin tarjetas. Precios del catálogo editables al cerrar turno. Deuda → cuenta corriente.

## RN-06: Shadow profiles
Si DNI no existe en portal → crear paciente automáticamente. Datos: nombre, apellido, teléfono, obra_social. Email opcional. Si DNI existe, no modificar perfil existente.

## RN-07: Obra Social
Paciente.obra_social = texto libre. Selector usa catálogo ObraSocial como fuente. Borrar obra social del catálogo no rompe pacientes existentes.

## RN-08: UUID del turno
UUID v4 generado al crear turno desde portal. Acceso público sin auth. Permite consulta y cancelación. Enlace: `/consulta/{uuid}`.

## RN-09: Notificaciones
Prioridad: email → WhatsApp → solo pantalla. Email opcional. Eventos: confirmado, rechazado (con motivo), recordatorio 48h, recordatorio 2h. Scheduler cada 10 min.

## RN-10: Rate limiting
- POST /auth/login: 5/min
- POST /portal/reservar: 5/min
- GET /pacientes/verificar/{dni}: 10/min
- GET /portal/disponibilidad: 30/min

## RN-11: Cierre de turno
PUT /turnos/{id}/cerrar → registra tratamientos + pagos → calcula deuda → actualiza cuenta corriente.

## RN-12: Seguridad de datos
- Contraseñas: bcrypt, nunca texto plano.
- JWT: access 30 min, refresh 7 días.
- CORS restrictivo en producción.
- CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff.
- Nunca loguear DNI, email, teléfono ni datos clínicos.

## RN-13: Clasificación de ingresos
Pagos agrupados en Particulares (obra_social = "Particular") y Obras Sociales (resto). Dashboard muestra separación por origen en ARS y USD.
