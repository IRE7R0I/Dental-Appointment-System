# Auditoría Técnica del Backend — Módulo Agenda y Barrido General

Este documento detalla el relevamiento técnico del backend actual (`backend/`) para confrontarlo con los requerimientos esperados en el rediseño de `frontend2/`. Permite contrastar la realidad de los endpoints implementados frente al blueprint propuesto.

---

## 1. Parte 1 — Módulo Agenda

### 1.1. Doctores
- **Ruta exacta del listado:** `GET /doctores/`
  - Declarado en: [doctores.py:L21-23](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/doctores.py#L21-L23)
  - Dependencias: `Depends(require_role(["admin", "secretaria"]))` (a nivel router)
- **Prefijo `/api`:** FastAPI declara los endpoints con el prefijo `/doctores` (sin `/api`). El prefijo `/api` es manejado y removido client-side a través de la regla de reescritura de Vite en el frontend actual (`rewrite: (path) => path.replace(/^\/api/, '')`).
- **Campo `color_agenda`:** Sí, el backend devuelve el campo `color_agenda` con ese nombre exacto.
  - En el modelo SQLAlchemy: [models.py:L27](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/models.py#L27) (`color_agenda = Column(String(7))`).
  - En el esquema de respuesta: [doctores.py:L33](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/doctores.py#L33) (`color_agenda: Optional[str] = None`).
- **Filtro por `activo`:** Sí, el listado de doctores filtra y retorna únicamente los profesionales activos.
  - Implementado en: [doctores.py:L18-19](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/doctores.py#L18-L19) (`db.query(models.Doctor).filter(models.Doctor.activo == True).all()`).

### 1.2. Slots — Lectura Individual
- **Ruta exacta:** `GET /turnos/slots`
  - Declarado en: [turnos.py:L75-79](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L75-L79)
- **Query params exactos:**
  - `fecha`: `date` (ej. `YYYY-MM-DD`, requerido)
  - `id_doctor`: `int` (requerido)
- **Soporte para múltiples doctores:** **No**. El backend acepta un único `id_doctor` entero y genera la disponibilidad para ese profesional cruzando turnos y bloqueos individuales. La vista de múltiples columnas requerirá que el frontend haga un request por cada doctor.
  - Lógica del CRUD: [turnos.py:L84-150](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/turnos.py#L84-L150)

### 1.3. Slots — Vista Mensual / Bulk
- **Ruta / Endpoint de contadores:** **No existe**. No hay ningún endpoint en el backend que retorne contadores consolidados de slots libres/ocupados para un rango de fechas.
- **Alternativa actual:** El listado general de turnos `GET /turnos/` ([turnos.py:L47-55](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L47-L55)) solo filtra por una fecha exacta (`fecha: Optional[date]`), impidiendo también traer todos los turnos del mes en una sola llamada.
- **Resolución:** Hoy en día, la lógica del frontend debe resolverse realizando **N llamadas individuales** (una llamada diaria por cada día del mes) a `GET /turnos/slots` o acumulando consultas secuenciales.

### 1.4. Bloqueo de Slots
- **Ruta exacta:** `POST /turnos/slots/bloquear`
  - Declarado en: [turnos.py:L81-108](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L81-L108)
- **Soporte para bloqueos en lote (array):** **No**. El body esperado es un único objeto `SlotBloquearInput` ([schemas/turnos.py:L82-86](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/turnos.py#L82-L86)):
  - `fecha`: `date`
  - `hora`: `time`
  - `id_doctor`: `int`
  - `motivo`: `Optional[str]`
- **Identificación de bloqueo:** Sí, el listado de slots retorna un identificador de bloqueo.
  - En la respuesta del listado de slots ([schemas/turnos.py:L89-96](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/turnos.py#L89-L96)), el campo `slot_bloqueado_id: Optional[int]` expone el ID de la base de datos de la tabla `slots_bloqueados` cuando el estado es `"bloqueado"`.
  - Mapeado en CRUD: [turnos.py:L139](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/turnos.py#L139) (`"slot_bloqueado_id": b.id`).

### 1.5. Desbloqueo
- **Ruta exacta:** `DELETE /turnos/slots/{slot_id}/desbloquear`
  - Declarado en: [turnos.py:L110-117](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L110-L117)
- **Soporte para desbloqueos agrupados/masivos:** **No**. El endpoint solo recibe un único `slot_id` como parámetro de ruta y elimina dicho registro individual de la base de datos ([turnos.py:L167-173](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/turnos.py#L167-L173)). El frontend debe iterar y realizar múltiples llamadas para liberar slots agrupados.

### 1.6. Horarios de la Clínica
- **Ruta del horario semanal:** `GET /config/horarios`
  - Declarado en: [config.py:L10-13](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/config.py#L10-L13)
- **Shape de la respuesta:**
  ```json
  {
    "zona_horaria": "America/Argentina/Buenos_Aires",
    "dias": {
      "lunes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
      "martes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
      "miércoles": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
      "jueves": null,
      "viernes": {"mañana": ["09:00", "13:00"], "tarde": ["16:00", "20:00"]},
      "sábado": {"mañana": ["09:00", "13:00"]},
      "domingo": null
    },
    "granularidad_minutos": 30
  }
  ```
  - Lógica central en: [horarios.py:L10-18](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/core/horarios.py#L10-L18).
- **Verificación de restricciones:**
  - Jueves y domingo: Cerrados (devuelve `null`).
  - Sábado: Solo mañana (`09:00` a `13:00`).
  - Lunes, Martes, Miércoles, Viernes: Mañana (`09:00` a `13:00`) y Tarde (`16:00` a `20:00`).

### 1.7. Creación de Turno
- **Ruta exacta:** `POST /turnos/`
  - Declarado en: [turnos.py:L122-153](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L122-L153)
- **Coincidencia del Body:** Sí, el body `TurnoCreate` ([schemas/turnos.py:L6-11](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/turnos.py#L6-L11)) contiene exactamente los campos:
  - `fecha_hora`: `datetime` (ISO standard)
  - `duracion_minutos`: `int` (default `30`)
  - `motivo`: `Optional[str]` (default `None`)
  - `dni_paciente`: `str`
  - `id_doctor`: `int`
- **Shape de la respuesta:** `TurnoResponse` ([schemas/turnos.py:L14-20](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/turnos.py#L14-L20)) que devuelve todos los campos del body más:
  - `id`: `int`
  - `estado`: `str` (`"Pendiente"`, `"Realizado"`, `"Cancelado"`)
  - `paciente`: `Optional[dict]` (`{"nombre": str, "apellido": str, "dni": str, "obra_social": Optional[str]}`)
  - `doctor`: `Optional[dict]` (`{"id": int, "nombre": str}`)
  - **No** incluye campos como `facturacion_estado`.

### 1.8. Pacientes — Búsqueda y Alta Rápida
- **Ruta de búsqueda por DNI:** `GET /pacientes/{dni}`
  - Declarado en: [pacientes.py:L51-56](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/pacientes.py#L51-L56)
- **Ruta de alta:** `POST /pacientes/`
  - Declarado en: [pacientes.py:L59-64](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/pacientes.py#L59-L64)
- **Endpoint de alta rápida:** **No existe**. Se utiliza el mismo endpoint general de creación de paciente (`POST /pacientes/`). El esquema de creación `PacienteCreate` ([schemas/pacientes.py:L7-15](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/pacientes.py#L7-L15)) define todos los campos de contacto y demográficos como `Optional`, por lo que el alta rápida se efectúa enviando únicamente `dni`, `nombre` y `apellido`.

### 1.9. Catálogos
- **Rutas reales:**
  - Tratamientos: `GET /catalogo/tratamientos` y `POST /catalogo/tratamientos`
  - Obras Sociales: `GET /catalogo/obras-sociales` y `POST /catalogo/obras-sociales`
  - Declarado en: [catalogo.py](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/catalogo.py)
- **Campos de precio:** Sí, se llaman exactamente `precio_ars` y `precio_usd` de tipo `Decimal` (pueden ser nulos en la respuesta).
- **Duración del tratamiento:** Sí, `TratamientoCatalogoResponse` ([schemas/catalogo.py:L32-42](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/catalogo.py#L32-L42)) incluye `duracion_minutos: int` (default `30`), lo cual permite autocompletar la duración de la cita al seleccionar el tratamiento.

---

## 2. Parte 2 — Barrido General del Backend

### 2.1. Pacientes (Historia Clínica, Alertas y Resumen)
- **Alertas médicas:**
  - `GET /pacientes/{dni}/alertas` y `POST /pacientes/{dni}/alertas` ([historia_clinica.py:L25-39](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L25-L39)).
  - `DELETE /pacientes/{dni}/alertas/{alerta_id}` ([historia_clinica.py:L42-52](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L42-L52)): Soft-delete modificando el indicador `activo = False`.
- **Evoluciones clínicas:**
  - `GET /pacientes/{dni}/evoluciones`, `POST /pacientes/{dni}/evoluciones` y `PUT /pacientes/{dni}/evoluciones/{evolucion_id}` ([historia_clinica.py:L58-93](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L58-L93)).
  - **Shape de `EvolucionClinicaResponse`:**
    - `pieza_dental`: `Optional[int]` (validado estrictamente bajo el esquema FDI, entre `11` y `48` inclusive, en [schemas/historia_clinica.py:L37-45](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/historia_clinica.py#L37-L45)).
    - `ubicacion_lesion`: `Optional[str]` (campo de texto validado en [schemas/historia_clinica.py:L47-58](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/schemas/historia_clinica.py#L47-L58) contra las siglas de caras dentales: `O`, `D`, `G`, `L`, `M`, `I`, `V`, `P`, separadas por comas).
    - `conformidad_paciente`: `Optional[bool]` (booleano nullable).
- **Resumen de ficha:**
  - `GET /pacientes/{dni}/resumen` ([historia_clinica.py:L99-102](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L99-L102)) -> Devuelve contadores consolidados de evoluciones e imágenes en `ResumenPacienteResponse`.

### 2.2. Turnos — Cierre
- **Ruta:** `PUT /turnos/{turno_id}/cerrar` ([turnos.py:L171-192](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L171-L192))
- **Transaccionalidad:** **Sí**. El proceso es completamente transaccional. La lógica interna en `cerrar_turno_con_pago` ([crud/finanzas.py:L136-265](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/finanzas.py#L136-L265)) asocia tratamientos, evoluciones clínicas, pagos inmediatos y cargos/abonos en cuenta corriente, ejecutando un único `db.commit()` en la base de datos al finalizar la secuencia.
- **Body esperado (`CerrarTurnoInput`):**
  - `tratamientos`: `list[TratamientoInput]` (`nombre: str`, `cantidad: int`, `precio_ars: Optional[Decimal]`, `precio_usd: Optional[Decimal]`)
  - `pagos`: `list[PagoInput]` (`monto: Decimal`, `moneda: str`, `metodo_pago: str`)
  - `comentarios`: `Optional[str]`
  - `pieza_dental`: `Optional[int]`
  - `ubicacion_lesion`: `Optional[str]`
  - `conformidad_paciente`: `Optional[bool]`

### 2.3. Imágenes / Radiografías (C-15)
- **Rutas de carpetas:**
  - `POST /pacientes/{dni}/carpetas` (Crear)
  - `GET /pacientes/{dni}/carpetas` (Listar)
  - `PUT /pacientes/{dni}/carpetas/{id_carpeta}` (Renombrar)
  - `DELETE /pacientes/{dni}/carpetas/{id_carpeta}` (Borrar)
- **Rutas de imágenes:**
  - `POST /pacientes/{dni}/carpetas/{id_carpeta}/imagenes` (Subir)
  - `GET /pacientes/{dni}/carpetas/{id_carpeta}/imagenes` (Listar metadatos)
- **Rutas directas / Servido:**
  - `GET /imagenes/{id_imagen}/contenido` (Sirve el binario WebP)
  - `DELETE /imagenes/{id_imagen}` (Eliminar de forma individual)
- **Almacenamiento:** Los archivos se comprimen localmente a formato **WebP** y se guardan como binario (`LargeBinary`) en la base de datos (tabla `imagenes_contenido`).
- **Borrado en cascada:**
  - Al borrar una carpeta ([crud/imagenes.py:L48-66](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/imagenes.py#L48-L66)), la lógica primero elimina los archivos de la capa de almacenamiento y luego borra las filas de `Imagen`. La base de datos elimina automáticamente en cascada las entradas de `imagenes_contenido` asociadas a esas imágenes.
  - Al borrar una imagen individual ([crud/imagenes.py:L133-147](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/crud/imagenes.py#L133-L147)), se remueve el archivo y la fila de `Imagen`, disparando el borrado automático de la fila asociada de `ImagenContenido`.

### 2.4. Finanzas
- **Libro de Cobros:** `GET /finanzas/pagos` ([finanzas.py:L31-49](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/finanzas.py#L31-L49)). Permite filtrado por rango de fechas, método de pago, DNI del paciente, ID de doctor y opción `solo_deudores`.
- **Listado de deudores:** `GET /pacientes/deudores` ([pacientes.py:L33-35](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/pacientes.py#L33-L35)). Devuelve el saldo acumulado en ARS y USD por paciente.
- **Turnos con deuda por paciente:** **No existe** ningún endpoint de tipo `GET /pacientes/{dni}/turnos-con-deuda`. La deuda no se asocia de forma estática en la entidad Turno, sino que se liquida a nivel de cuenta corriente general del paciente.
- *Nota sobre cambios:* Se mantienen sin cambios las lógicas descritas en `AUDITORIA_BACKEND_PAGOS.md` salvo la adición del cierre atómico (C-14) que interactúa con la cuenta corriente y las evoluciones al unísono.

### 2.5. Autenticación (Auth)
- **Rutas de acceso:**
  - `POST /auth/login` ([auth.py:L20-33](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/auth.py#L20-L33))
  - `POST /auth/refresh` ([auth.py:L36-55](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/auth.py#L36-L55))
  - `POST /auth/logout` ([auth.py:L58-62](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/auth.py#L58-L62))
  - `GET /auth/me` ([auth.py:L65-67](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/auth.py#L65-L67)) (obtiene datos de sesión del token activo)
- **JWT Claims y Token Shape:**
  - Firmado mediante `HS256` con tiempo de expiración (Access: 30 minutos, Refresh: 7 días).
  - Claims incrustados: `sub` (username) y `rol` (`"admin"` o `"secretaria"`).
- **Identificación de Rol:**
  - Se extrae del claim `rol` codificado en el payload del JWT.
  - Alternativamente, se obtiene de la respuesta de `GET /auth/me`.

---

## 3. Matriz de Estado (Existencia vs. Requerimiento Agenda)

La siguiente tabla contrasta lo que asume el diseño visual e interfaces de Agenda en `frontend2/` (Blueprint y diseño consolidado) frente a lo que efectivamente expone el backend en la actualidad.

| Elemento esperado por Frontend | Estado en Backend | Ruta / Comportamiento Real |
| :--- | :--- | :--- |
| **Doctores:** Listar profesionales con `color_agenda` y filtrados por `activo`. | **Ya existe** | `GET /doctores/` -> [doctores.py:L21-23](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/doctores.py#L21-L23). Devuelve `color_agenda` hexadecimal y filtra por activos. |
| **Slots:** Traer slots del día para **varios doctores en paralelo** (una llamada). | **No existe** | `GET /turnos/slots` solo acepta un `id_doctor: int` único. Requiere una petición por cada columna de doctor en el frontend. |
| **Slots:** Traer contadores mensuales (bulk) de slots para vista mensual. | **No existe** | No hay ruta para esto. El listado `GET /turnos/` solo filtra por fecha exacta (no rango). El frontend debe invocar N llamadas. |
| **Bloqueo:** POST con **un array de slots** a bloquear (checkboxes masivos). | **No existe** | `POST /turnos/slots/bloquear` acepta un único objeto `SlotBloquearInput`. El frontend debe iterar. |
| **Desbloqueo:** Liberación masiva o consecutiva de slots. | **No existe** | `DELETE /turnos/slots/{slot_id}/desbloquear` solo acepta un `slot_id` individual en path. |
| **Horarios clínica:** Endpoint que retorne el horario de atención semanal. | **Ya existe** | `GET /config/horarios` -> [config.py:L10-13](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/config.py#L10-L13). Confirma el cierre total los jueves/domingos y sábados por la tarde. |
| **Creación Turno:** Body básico con datos médicos del turno. | **Ya existe** | `POST /turnos/` -> [turnos.py:L122-153](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/turnos.py#L122-L153). Mapea perfectamente con `TurnoCreate`. |
| **Creación Turno:** Respuesta con metadatos de cobro / `facturacion_estado`. | **No existe** | El backend no expone información contable tras crear el turno. La facturación solo se inicia en el cierre (`PUT /turnos/{id}/cerrar`). |
| **Pacientes:** Alta rápida dedicada (modal de turno). | **No existe** | Se debe reutilizar `POST /pacientes/` enviando solo `dni`, `nombre` y `apellido`, omitiendo los demás parámetros que son opcionales. |
| **Catálogos:** Listar tratamientos base con precio y duración. | **Ya existe** | `GET /catalogo/tratamientos` -> [catalogo.py:L30-32](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/catalogo.py#L30-L32). Incluye `duracion_minutos` para autocompletar la cita. |
| **Ficha Clínica:** Historial contable y de sesiones del paciente. | **Ya existe** | `GET /pacientes/historial` -> [pacientes.py:L38-48](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/pacientes.py#L38-L48). Reúne turnos, tratamientos y cobros. |
| **Historia Clínica:** Alertas médicas asociadas (con soft-delete). | **Ya existe** | `/pacientes/{dni}/alertas` -> [historia_clinica.py:L25-52](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L25-L52). |
| **Historia Clínica:** Evoluciones odontológicas con nomenclatura FDI y caras dentales. | **Ya existe** | `/pacientes/{dni}/evoluciones` -> [historia_clinica.py:L58-93](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L58-L93). Valida piezas `11-48` y siglas de caras. |
| **Ficha Clínica:** Notas de evolución persistidas en base de datos. | **Ya existe** | `/pacientes/{dni}/evoluciones` resuelve la persistencia de notas clínicas. (El frontend anterior usaba `localStorage`). |
| **Ficha Clínica:** Resumen de ficha del paciente. | **Ya existe** | `GET /pacientes/{dni}/resumen` -> [historia_clinica.py:L99-102](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/historia_clinica.py#L99-L102). Devuelve contadores de imágenes y notas. |
| **Imágenes:** Subida de radiografías/fotos y orden en carpetas. | **Ya existe** | `/pacientes/{dni}/carpetas` y subida a través de [imagenes.py:L92-107](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/imagenes.py#L92-L107). |
| **Finanzas:** Obtener turnos específicos adeudados. | **No existe** | No hay ruta `/pacientes/{dni}/turnos-con-deuda`. La amortización y deudas se manejan de manera global en la cuenta corriente. |
| **Auth:** Extracción de rol y login JWT. | **Ya existe** | `/auth/login` y `/auth/me` ([auth.py](file:///d:/____PROYECTOS/1.%20PROYECTO%20GESTOR%20TURNOS/Dental-Appointment-System/backend/routers/auth.py)). Rol codificado en claim JWT. |
