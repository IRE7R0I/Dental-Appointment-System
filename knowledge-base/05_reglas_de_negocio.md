# 05 — Reglas de Negocio

## RN-01: Horarios de atención (por doctor)
- Cada doctor tiene su propio patrón semanal almacenado en `horarios_doctor` (7 filas: una por día, con franjas mañana y/o tarde).
- Doctores nuevos heredan el horario default de clínica como punto de partida editable por admin.
- Días puntuales pueden marcarse como no laborables por doctor en `dias_no_laborables_doctor` (feriados, vacaciones, ausencias).
- Un día con `DiaNoLaborableDoctor` activo para ese doctor se considera cerrado sin importar el patrón semanal.
- Los horarios de cierre son exclusivos: `inicio_turno + duracion_minutos <= hora_cierre`.
- Granularidad de 30 minutos: solo horarios en :00 y :30.
- Todos los horarios se validan en timezone `America/Argentina/Buenos_Aires`.
- Horario default de clínica (usado para seeding de nuevos doctores):
  - Lunes, martes, miércoles y viernes: mañana 09:00-13:00, tarde 16:00-20:00.
  - Sábado: solo mañana 09:00-13:00.
  - Jueves y domingo: cerrado.
- La generación de slots y validación de turnos usan el horario del doctor, no el global.
- Implementado en C-12 `correccion-horarios-doctores-pagos` (infraestructura) y C-16 `horarios-individuales-por-doctor` (per-doctor).

## RN-14: Slots bloqueados manualmente
- Admin y secretaria pueden bloquear/liberar slots puntuales en la agenda.
- Un slot bloqueado no puede recibir un turno.
- `UNIQUE(fecha, hora, id_doctor)` — no se puede bloquear el mismo slot dos veces.
- El bloqueo es independiente del turno: un slot puede estar libre, ocupado (turno) o bloqueado.
- Al bloquear, se puede indicar un motivo opcional.
- Los slots bloqueados se muestran diferenciados de los ocupados por turno en `GET /turnos/slots`.

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

Nota: actualmente models.py usa 3 estados simplificados para turnos. C-08 migrará a 7 estados. Los slots bloqueados tienen su propia tabla independiente (C-12).

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

### RN-15: Alertas médicas
- Las alertas médicas se asocian a un paciente en la tabla `alertas_medicas`.
- Solo usuarios con rol `admin` o `secretaria` pueden crear, listar o eliminar alertas.
- El tipo de alerta puede ser `"alergia"` o `"condicion"`.
- Las alertas se muestran como badges de alerta en el banner de la ficha del paciente en frontend2.

### RN-16: Evoluciones clínicas
- Cada evolución clínica requiere `fecha` (obligatoria).
- Si tiene `id_turno`, ese turno debe estar en estado "Asistió" y `fecha` debe coincidir con `turno.fecha_hora.date()`.
- Si `id_turno` es null, `fecha` se ingresa manualmente (migración de registros históricos en papel).
- `pieza_dental` y `ubicacion_lesion` son opcionales.
- `pieza_dental` usa notación FDI (11-48, null si no aplica).
- `ubicacion_lesion` usa códigos: O (Oclusal), D (Distal), G (Gingival), L (Lingual), M (Mesial), I (Incisal), V (Vestibular), P (Palatino), separados por coma.
- Solo admin y secretaria pueden crear y corregir evoluciones.
- La corrección registra `actualizado_por_id` y `actualizado_en`.
- Nunca exponer datos clínicos en logs ni mensajes de error (ver RN-12).

### ~~RN-17: Plan de tratamiento~~ ⛔ DEROGADA
~~Alcance eliminado de C-14 por decisión de producto (Jul 2026).~~
~~El plan de tratamiento ya no se implementa en esta app.~~

### RN-18: Protección de datos clínicos
- No se expone DNI, email, ni historial clínico en logs o mensajes de error del servidor.
- Los endpoints de historia clínica requieren autenticación JWT con rol admin o secretaria.
- Los mensajes de error deben ser genéricos ("Paciente no encontrado", "Error al procesar la solicitud") sin incluir datos del paciente.

### RN-19: Gestión de imágenes y radiografías
- Las imágenes se almacenan en carpetas organizadas por el usuario, sin estructura fija impuesta.
- Al eliminar una carpeta, se eliminan en cascada todas sus imágenes y contenidos binarios (CASCADE).
- Solo usuarios con rol `admin` o `secretaria` pueden gestionar imágenes (mismo criterio que datos clínicos).
- Tipos de archivo permitidos al subir: `image/jpeg`, `image/png`, `image/webp`. Cualquier otro tipo es rechazado.
- Límite de 10 MB sobre el archivo original recibido (antes de comprimir). El archivo comprimido WebP no tiene un segundo límite.
- Toda imagen se normaliza a WebP (tipo_mime = "image/webp") independientemente del formato original.
- Si `es_radiografia = true`: compresión WebP lossless (fallback a quality=95 si el lossless supera los 15 MB).
- Si `es_radiografia = false`: compresión WebP quality=80, con redimensión previa si el lado mayor supera 2000 px (manteniendo proporción).
- Si la conversión falla (archivo corrupto u otro error), se retorna un error claro sin almacenar ningún dato.
- No exponer contenido de imágenes ni nombres de archivo con datos sensibles en logs (ver RN-12).
