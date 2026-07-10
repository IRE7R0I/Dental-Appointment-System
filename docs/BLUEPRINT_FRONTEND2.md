# Blueprint de Implementación para Frontend2 — OdontoGest

Este documento actúa como la especificación funcional y blueprint de arquitectura cliente para la construcción de la nueva interfaz `frontend2/`. Mapea los contratos de API y modelos de datos reales del backend (actualizados post `C-12`) con el catálogo de componentes y flujos de usuario relevados en la auditoría del frontend anterior.

---

## 1. Resumen ejecutivo

El frontend unificado de `frontend2/` requerirá la construcción de **9 vistas** para cubrir la funcionalidad del consultorio odontológico con soporte de API vigente. No se contemplan las vistas de portal de autogestión de pacientes ni notificaciones automáticas al estar pendientes de desarrollo en el backend.

### Agrupación por Rol de Acceso
1. **Públicas (1 vista):**
   - Página de Acceso (`/login`)
2. **Acceso Privado - Admin y Secretaria (6 vistas):**
   - Inicio / Control Diario (`/`)
   - Agenda y Grilla Horaria (`/agenda`)
   - Libro de Cobros y Deudores (`/pagos`)
   - Directorio y Fichas de Pacientes (`/pacientes`)
   - Ficha Clínica e Historial de Tratamientos (`/pacientes/:dni/historial`)
   - Catálogo de Servicios y Obras Sociales (`/catalogo`)
3. **Acceso Privado Exclusivo - Admin (2 vistas):**
   - Gestión de Cuentas de Personal (`/admin/usuarios`)
   - Catálogo de Profesionales / Doctores (`/admin/doctores`)

### Relación de Rediseño vs. Vistas Nuevas
- **Rediseño con corrección de Deuda Técnica (7 vistas):**
  - `/login`, `/`, `/agenda`, `/pagos`, `/pacientes`, `/pacientes/:dni/historial`, `/admin/usuarios`, y `/catalogo`.
  - *Nota:* Estas vistas se rediseñan adaptando los tipos a los contratos reales de la API (por ejemplo, resolviendo el desfase en movimientos de cuenta y notas persistidas localmente).
- **Vistas Completamente Nuevas (1 vista):**
  - `/admin/doctores`: Creada de forma dedicada para resolver la administración de profesionales, la asignación de colores hexadecimales para la agenda, y la desactivación (soft-delete), acciones antes delegadas al backend o a listados incompletos.

---

## 2. Listado de vistas

### 2.1. Página de Acceso (`/login`)
- **Rol de Acceso:** Público (Guest).
- **Propósito:** Autenticar a los usuarios del consultorio (`admin` y `secretaria`) y proveer almacenamiento de sesión.
- **Endpoints que consume:**
  - `POST /auth/login`: Envía credenciales (`username`, `password`) y obtiene el par de tokens JWT.
- **Contenido Funcional:**
  - Formulario de entrada con campos de texto e indicador visual para ocultar/revelar contraseña.
  - Almacenamiento seguro client-side del access y refresh token en `localStorage`.
- **Estados de UI:**
  - `Loading`: Campos e inputs deshabilitados con spinner en el botón de confirmación.
  - `Error`: Caja de alerta informativa si fallan las credenciales.
- **Componentes Necesarios:**
  - `FormularioLogin`, `InputTextoContraseña`, `CajaAlertaError`.

### 2.2. Panel de Control / Dashboard (`/`)
- **Rol de Acceso:** `admin` \| `secretaria`.
- **Propósito:** Mostrar métricas rápidas del día y el listado de turnos de hoy con accesos rápidos.
- **Endpoints que consume:**
  - `GET /finanzas/caja/hoy`: Carga la recaudación actual por moneda (ARS / USD).
  - `GET /turnos/hoy`: Carga listado de turnos asignados al día corriente.
  - `GET /doctores/`: Llena el filtro y selector de profesionales.
  - `GET /pacientes/{dni}`: Busca paciente para agendamiento rápido.
  - `POST /pacientes/`: Registra paciente express si no existe en la DB.
  - `POST /turnos/`: Genera un nuevo turno agendado.
  - `PATCH /turnos/{turno_id}/cancelar`: Cancela el turno seleccionado.
  - `PUT /turnos/{turno_id}/cerrar`: Cierra la consulta registrando tratamientos realizados, cobro inmediato y comentarios médicos.
- **Contenido Funcional:**
  - Tarjetas de KPI financieras (Ingresos ARS, Ingresos USD, Turnos Realizados, Pendientes).
  - Tabla interactiva de turnos de hoy clasificados cromáticamente por doctor.
  - Filtros de estado y doctor de aplicación en tiempo real.
  - Modal rápido de agendamiento con validación de horarios laborables.
- **Estados de UI:**
  - `Loading`: Skeletons en tarjetas KPI y filas de tabla con efecto de carga (shimmer).
  - `Vacío`: Contenedor ilustrativo si no hay turnos registrados en el día.
  - `Error`: Pantalla completa de error de red con botón de reintento.
- **Componentes Necesarios:**
  - `TarjetasKPI`, `TablaTurnosHoy`, `FiltroTurnos`, `ModalCrearTurno`, `ModalCerrarTurno`, `SelectorProfesional`.

### 2.3. Agenda y Grilla Horaria (`/agenda`)
- **Rol de Acceso:** `admin` \| `secretaria`.
- **Propósito:** Vista de calendario semanal o mensual para agendamiento y visualización de slots por profesional.
- **Endpoints que consume:**
  - `GET /doctores/`: Lista profesionales.
  - `GET /config/horarios`: Lee reglas horarias de la clínica (intervalo, rangos permitidos).
  - `GET /turnos/slots`: Carga los slots del día (`libre`, `ocupado`, `bloqueado`) de un doctor.
  - `POST /turnos/slots/bloquear`: Bloquea un slot manualmente por día, hora y doctor.
  - `DELETE /turnos/slots/{slot_id}/desbloquear`: Libera el bloqueo del slot.
  - `GET /pacientes/{dni}`: Busca paciente por DNI.
  - `POST /pacientes/`: Crea paciente rápido.
  - `POST /turnos/`: Agrega un nuevo turno en el slot libre seleccionado.
  - `PATCH /turnos/{turno_id}/cancelar`: Cancela el turno.
  - `PUT /turnos/{turno_id}/cerrar`: Cierra y factura la cita.
- **Contenido Funcional:**
  - Grilla de slots horarios paralelos por doctor (Vista Semanal) o grilla de calendario clásico (Vista Mensual).
  - Visualización del estado del slot: libre (seleccionable para agendar), ocupado (muestra apellido de paciente y abre detalle/cierre), y bloqueado (muestra motivo de bloqueo y opción para liberar si es admin/secretaria).
  - Validación horaria en cliente usando los datos provistos de `/config/horarios` (bloqueo automático de mediodía 13:00-16:00, sábados tarde y domingos).
- **Estados de UI:**
  - `Loading`: Spinner centralizado en la grilla.
  - `Bloqueo de Día`: Fondo ilustrado si se navega a un jueves o domingo indicando día cerrado.
  - `Confirmación Destructiva`: Alerta emergente antes de desbloquear un slot de doctor.
- **Componentes Necesarios:**
  - `GrillaAgendaSemanal`, `GrillaAgendaMensual`, `SlotHorario`, `ModalBloquearSlot`, `ModalDetalleTurno`, `PanelTurnoCerrado`.

### 2.4. Caja y Libro Contable (`/pagos`)
- **Rol de Acceso:** `admin` \| `secretaria`.
- **Propósito:** Consultar cobros históricos, registrar abonos generales y auditar deudores de la clínica.
- **Endpoints que consume:**
  - `GET /finanzas/caja/hoy`: KPI de caja total diaria.
  - `GET /pacientes/deudores`: Listado de pacientes con saldos pendientes acumulados.
  - `GET /finanzas/pagos`: Listado general de transacciones agrupadas con filtros de fecha y método.
  - `GET /pacientes/historial`: Obtiene turnos impagos del paciente seleccionado para cobro directo.
  - `POST /finanzas/pagos`: Registra abono (amortiza deuda o deja saldo a favor).
- **Contenido Funcional:**
  - Listado de Deudores con búsqueda predictiva por DNI o Apellido.
  - Panel deslizante (Side Sheet) para registrar cobro rápido mostrando saldo adeudado del paciente y combo para enlazar a un turno específico o aplicar abono general.
  - Registro Histórico de Caja: Agrupa pagos por día y los detalla por paciente, mostrando la propiedad `constancia_turno` (ej: `"14/06 - Perez (16:30)"`) para rápida legibilidad.
  - Generación de Ticket Físico virtual estructurado con información detallada de la transacción.
- **Estados de UI:**
  - `Loading`: Skeletons en el listado de deudores y transacciones.
  - `Vacío`: Alertas sutiles si no hay deudores o cobros registrados en el rango.
  - `Optimistic`: Disminución instantánea en el balance local de deuda del deudor tras el post exitoso.
- **Componentes Necesarios:**
  - `BuscadorDeudores`, `TablaDeudores`, `SideSheetCobro`, `ComprobanteTicket`, `TablaTransaccionesCaja`.

### 2.5. Directorio de Pacientes (`/pacientes`)
- **Rol de Acceso:** `admin` \| `secretaria`.
- **Propósito:** Maestro-Detalle para buscar, crear, modificar perfiles de pacientes, administrar coberturas médicas y auditar estados de cuenta corriente.
- **Endpoints que consume:**
  - `GET /pacientes/`: Obtiene todos los pacientes registrados.
  - `GET /pacientes/{dni}/cuenta`: Obtiene saldo en ARS/USD y lista real de movimientos de la cuenta.
  - `POST /pacientes/`: Crea un nuevo paciente.
  - `PUT /pacientes/{dni}`: Modifica datos demográficos e información de obra social.
  - `GET /pacientes/historial`: Obtiene los turnos, tratamientos y cobros detallados del paciente.
  - `GET /finanzas/pagos`: Obtiene pagos asociados al DNI del paciente.
  - `POST /finanzas/pagos`: Registra pago inmediato.
  - **Propuesto (Pendiente API):** `GET /pacientes/{dni}/historia-clinica` y `PUT /pacientes/{dni}/historia-clinica` para persistir las notas en base de datos en lugar de `localStorage`.
- **Contenido Funcional:**
  - Tabla de pacientes ordenada por Apellido. Si tiene deudas activas en la cuenta, muestra la etiqueta de alerta **`DEUDOR`** (color rojo).
  - Pestaña de Ficha de Paciente: balances de cuenta corriente consolidados por divisa.
  - Historial de Cuenta Corriente: Línea de tiempo descendente que combina cargos (turnos finalizados) y abonos (pagos recibidos). Los turnos son colapsables (acordeón) y expandibles para detallar los pagos específicos asociados a ese turno.
- **Estados de UI:**
  - `Loading`: Animación de carga de perfil y cuenta.
  - `Éxito`: Modal flotante animado ("¡Ficha Actualizada!") tras guardar modificaciones.
- **Componentes Necesarios:**
  - `TablaMaestroPacientes`, `FichaPacienteDetalle`, `LineaTiempoContable`, `AcordeonTurnoPago`, `FormularioEditarPaciente`.

### 2.6. Ficha Clínica e Historial (`/pacientes/:dni/historial`)
- **Rol de Acceso:** `admin` \| `secretaria`.
- **Propósito:** Consulta completa de la cronología médica y de abonos detallados de un paciente.
- **Endpoints que consume:**
  - `GET /pacientes/{dni}`: Carga el header del paciente.
  - `GET /pacientes/historial`: Carga el historial de tratamientos filtrado por rango de fecha.
  - `GET /finanzas/pagos`: Carga los abonos recibidos del DNI paciente.
- **Contenido Funcional:**
  - Doble columna paralela: Tratamientos y sesiones a la izquierda, abonos en el libro diario a la derecha.
  - Tarjetas superiores de resumen: Facturado Total, Cobrado Total, Saldo Pendiente.
  - Filtro interactivo de abonos por método (Efectivo, Transferencia).
  - Enlaces de anclaje que desplazan la página al hacer click en un abono hacia el turno correspondiente.
- **Estados de UI:**
  - `Loading` individualizado por columna.
- **Componentes Necesarios:**
  - `ResumenFacturacion`, `ColumnaTratamientos`, `ColumnaPagosRegistrados`, `EnlaceAnclaTurno`.

### 2.7. Administración de Cuentas (`/admin/usuarios`)
- **Rol de Acceso:** Exclusivo `admin` (la API bloquea con 403 al rol `secretaria`).
- **Propósito:** Gestión de cuentas y credenciales del personal administrativo.
- **Endpoints que consume:**
  - `GET /admin/usuarios`: Obtiene las cuentas registradas.
  - `POST /admin/usuarios`: Registra una nueva cuenta de rol `secretaria`.
  - `PUT /admin/usuarios/{user_id}/toggle-activo`: Alterna estado de cuenta activa/inactiva.
  - `DELETE /admin/usuarios/{user_id}`: Elimina de forma definitiva la cuenta.
  - `PUT /admin/usuarios/{user_id}`: Modifica username y password (requiere contraseña actual si el admin se edita a sí mismo).
- **Contenido Funcional:**
  - Tabla de usuarios con badges de roles e indicadores de estado activo (esmeralda) o inactivo (gris).
  - Bloqueo de acciones: se ocultan los botones de borrar y desactivar para usuarios con rol `admin`.
- **Estados de UI:**
  - `Confirmación Destructiva`: Modal de advertencia roja para eliminar usuario.
- **Componentes Necesarios:**
  - `TablaUsuarios`, `ModalCrearUsuario`, `ModalEditarUsuario`, `ModalConfirmarBorrado`.

### 2.8. Catálogo de Profesionales (`/admin/doctores`) [NUEVA VISTA]
- **Rol de Acceso:** Exclusivo `admin`.
- **Propósito:** Gestionar los odontólogos de la clínica, sus colores de identificación en la agenda y su vigencia laboral.
- **Endpoints que consume:**
  - `GET /doctores/`: Lista profesionales registrados.
  - `POST /doctores/`: Agrega un odontólogo al consultorio.
  - `PUT /doctores/{id}`: Modifica datos o color del doctor.
  - `DELETE /doctores/{id}`: Desactiva lógicamente al odontólogo (soft delete).
- **Contenido Funcional:**
  - Panel de listado de odontólogos indicando nombre, color asignado en hexadecimal y estado laboral (activo/inactivo).
  - Formulario de creación y edición que incluye un selector de paleta de color hexadecimal.
  - Validación de color Hexadecimal en cliente (formato `#RRGGBB`).
- **Estados de UI:**
  - `Confirmación Destructiva`: Confirmación de desactivación de doctor en agenda.
- **Componentes Necesarios:**
  - `ListaDoctores`, `SelectorColorHex`, `ModalEditarDoctor`, `ModalConfirmarDesactivacion`.

### 2.9. Catálogo y Obras Sociales (`/catalogo`)
- **Rol de Acceso:** Lectura pública / Escritura restringida a `admin` \| `secretaria`.
- **Propósito:** Administración de precios base de tratamientos odontológicos y obras sociales habilitadas.
- **Endpoints que consume:**
  - `GET /catalogo/tratamientos`: Lista los servicios.
  - `POST /catalogo/tratamientos`: Crea un servicio en el catálogo.
  - `PUT /catalogo/tratamientos/{id}`: Modifica precio o categoría de servicio.
  - `DELETE /catalogo/tratamientos/{id}`: Desactiva lógicamente el servicio (soft delete).
  - `GET /catalogo/obras-sociales`: Lista obras sociales.
  - `POST /catalogo/obras-sociales`: Registra obra social.
  - `DELETE /catalogo/obras-sociales/{id}`: Desactiva lógicamente la obra social.
- **Contenido Funcional:**
  - Tablas agrupadas por categoría de tratamientos y listado de obras sociales.
  - Filtro horizontal dinámico de categorías basado en los valores únicos del catálogo.
  - Validación de precio: Exige especificar obligatoriamente al menos un valor de precio en pesos (`precio_ars`) o dólares (`precio_usd`) para habilitar el guardado.
- **Estados de UI:**
  - `Solo Lectura`: Oculta botones de adición/edición si el rol autenticado no posee permisos de escritura.
- **Componentes Necesarios:**
  - `TablaTratamientosCatalogo`, `TablaObrasSociales`, `FiltroHorizontalCategorias`, `ModalTratamientoForm`, `ModalObraSocialForm`.

---

## 3. Inventario de componentes compartidos

Los siguientes componentes funcionales se repiten en 2 o más vistas y deben estructurarse de forma parametrizable:

| Nombre Funcional | Vistas en las que se utiliza | Variaciones / Configuración requerida |
| :--- | :--- | :--- |
| `AppLayout` / `NavigationRail` | Todas las vistas privadas (Dashboard, Agenda, Pagos, Pacientes, Historial, Catálogo, Admin) | Debe evaluar dinámicamente si el rol es `admin` para mostrar los enlaces de administración (`/admin/usuarios` y `/admin/doctores`). |
| `SelectorProfesional` | - Dashboard<br>- Agenda<br>- Pagos<br>- AdminDoctores | Dropdown personalizado que renderiza el nombre del doctor acompañado de un indicador circular relleno con su color de agenda correspondiente. |
| `ModalCrearPaciente` | - Dashboard<br>- Agenda<br>- PerfilPaciente | Formulario emergente para inserción express de un nuevo paciente (DNI, Nombre, Apellido, Teléfono, Obra Social). |
| `ModalCerrarTurno` | - Dashboard<br>- Agenda | Panel que despliega el listado de tratamientos del catálogo para facturación, inputs de cobros recibidos y un área de texto para la evolución clínica. |
| `ModalDetalleTurno` | - Agenda<br>- PerfilPaciente<br>- HistorialPaciente | Ventana de solo lectura que detalla los tratamientos aplicados en una sesión, la evolución clínica parseada y el desglose de abonos. |
| `TicketComprobante` | - Pagos<br>- PerfilPaciente | Visualización e impresión de recibos contables virtuales detallando DNI, Nombre del paciente, monto, divisa y método de pago con marcas de tiempo. |
| `SideSheetCobro` | - Pagos<br>- PerfilPaciente | Drawer lateral para registrar abonos rápidos (amortización o a cuenta) del paciente, cargando sus saldos y turnos deudores dinámicamente. |
| `SelectorObraSocial` | - PerfilPaciente<br>- Catalogo<br>- ModalCrearPaciente | Selector dinámico cuyos elementos se cargan del endpoint público `/api/catalogo/obras-sociales` en lugar de una lista estática. |

---

## 4. Componentes nuevos (Introducidos por C-12)

Estos componentes funcionales no existían en el prototipo anterior y se incorporan para cubrir el soporte de los nuevos endpoints y reglas de negocio del backend:

1. **Selector de Color Hexadecimal (`SelectorColorHex`):**
   - Panel interactivo de color (Color Picker o paleta predefinida) que valida que la salida sea un string hexadecimal válido de 6 caracteres con almohadilla (`#RRGGBB`) antes de enviarlo a `POST/PUT /doctores`.
2. **Indicador de Slot Horario Agenda (`SlotHorario`):**
   - Casillero de grilla interactiva que discrimina visualmente entre tres estados:
     - *Libre:* Muestra la hora y un ícono para agendar turno rápido.
     - *Ocupado:* Muestra el apellido del paciente y un ícono para abrir detalle/cierre.
     - *Bloqueado:* Muestra un fondo gris rayado/deshabilitado con el motivo de bloqueo, un tooltip descriptivo y un botón rápido de desbloqueo (si el usuario cuenta con el rol).
3. **Badge de Pago con Constancia (`ConstanciaPagoBadge`):**
   - Contenedor de visualización en el listado de transacciones de caja que imprime la propiedad `.constancia_turno` (ej: `"14/06 - Perez (16:30)"`) para auditar visualmente a qué turno exacto se imputó el abono recibido.
4. **Validador de Agenda por Configuración (`ValidadorAgendaCliente`):**
   - Lógica de cliente que se suscribe a `GET /config/horarios` al inicializar la agenda, determinando dinámicamente qué slots de hora renderizar y cuáles bloquear por completo basándose en las reglas centralizadas de la clínica.

---

## 5. Preguntas abiertas o ambigüedades

1. **Inconsistencia del ID de Bloqueo en la API:**
   - *Detalle:* El endpoint para desbloquear un slot es `DELETE /api/turnos/slots/{slot_id}/desbloquear`, requiriendo el ID de la tabla `slots_bloqueados`. Sin embargo, el endpoint `GET /api/turnos/slots` (que usa el esquema `SlotResponse`) devuelve el estado `"bloqueado"` y el motivo del bloqueo, pero **no incluye el ID del bloqueo** (`slot_id`).
   - *Pregunta:* ¿Cómo debe resolver la UI el ID de bloqueo para llamar al endpoint de desbloqueo al hacer click sobre el slot? ¿Debe modificarse el backend para incluir el ID del bloqueo en `SlotResponse` o la UI debe inferirlo mediante otra llamada?
2. **Granularidad y solapamientos en la visualización mensual:**
   - *Detalle:* La base de datos permite turnos con duración flexible (`duracion_minutos`).
   - *Pregunta:* En la vista mensual de la agenda, si un doctor tiene múltiples bloqueos manuales parciales de slots y turnos agendados en un mismo día, ¿cómo debe reflejarse el estado diario en la celda del calendario? ¿Se agrupa como un indicador de "Ocupación Parcial / Total" o se listan los bloques individuales en un popover emergente?
3. **Consolidación visual de bloques contiguos:**
   - *Pregunta:* Si un doctor bloquea múltiples slots consecutivos (ej: de 9:00 a 11:30 por motivos de cirugía), ¿debe la UI de la agenda semanal agruparlos en una única tarjeta de gran altura con el texto "Bloqueado: Cirugía" o mantener slots individuales segmentados de 30 minutos?
