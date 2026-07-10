# Auditoría Técnica del Frontend Actual — OdontoGest

Este documento sirve como relevamiento técnico detallado y fuente de verdad sobre el frontend actual (`frontend/`) para guiar el rediseño y desarrollo de una nueva implementación en la carpeta `frontend2/`.

---

## 1. Índice de vistas / rutas

| Ruta (URL) | Archivo del Componente de Página | Rol Requerido | Roadmap Change |
| :--- | :--- | :--- | :--- |
| `/login` | [LoginPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/LoginPage.tsx) | Público (Guest) | C-06 `auth-y-autorizacion` |
| `/` (Inicio/Dashboard) | [DashboardPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/DashboardPage.tsx) | `admin` \| `secretaria` | C-02 `gestion-pacientes-y-turnos` <br> C-03 `finanzas-y-caja-diaria` |
| `/agenda` | [AgendaPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/AgendaPage.tsx) | `admin` \| `secretaria` | C-02 `gestion-pacientes-y-turnos` <br> C-03 `finanzas-y-caja-diaria` |
| `/pagos` | [PagosPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/PagosPage.tsx) | `admin` \| `secretaria` | C-03 `finanzas-y-caja-diaria` <br> C-04 `cuentas-corrientes-y-deudores` |
| `/pacientes` | [PerfilPacientePage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/PerfilPacientePage.tsx) | `admin` \| `secretaria` | C-02 `gestion-pacientes-y-turnos` <br> C-04 `cuentas-corrientes-y-deudores` <br> C-05 `historial-y-mejoras-frontend` |
| `/pacientes/:dni/historial` | [HistorialPacientePage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/HistorialPacientePage.tsx) | `admin` \| `secretaria` | C-05 `historial-y-mejoras-frontend` |
| `/admin/usuarios` | [AdminPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/AdminPage.tsx) | `admin` | C-06 `auth-y-autorizacion` |
| `/catalogo` | [CatalogoPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/CatalogoPage.tsx) | `admin` \| `secretaria` (Ver Nota 1) | C-07 `catalogo-tratamientos` |

> [!NOTE]
> *Nota 1:* En `/catalogo`, la visualización de tratamientos y obras sociales es de lectura pública, pero las acciones de creación, edición y borrado requieren autenticación con rol `admin` o `secretaria`.

---

## 2. Vista por vista en detalle

### 2.1. LoginPage (`/login`)
- **Propósito:** Formulario de inicio de sesión para el personal administrativo y odontológico de la clínica.
- **Endpoints que consume:**
  - `POST /api/auth/login` (a través de la función `login` de `AuthContext`). Autentica al usuario mediante username y password, guardando los tokens `access_token` y `refresh_token` en `localStorage`. No hay polling, refetch, ni optimistic updates.
- **Componentes que renderiza:**
  - Ninguno compartido de `components/`. Solo elementos nativos HTML estructurados con clases de Tailwind y animaciones mediante `motion` de `motion/react`.
- **Estado local vs. global:**
  - **Local:** `username` (string), `password` (string), `showPassword` (boolean), `error` (string), `isLoading` (boolean).
  - **Global:** Función `login` y datos del usuario expuestos por `useAuth()` (`AuthContext`); alertas de éxito expuestas por `useToast()` (`ToastContext`).
- **Validaciones de formulario:**
  - Campos `username` y `password` marcados como `required` (regla nativa del navegador). No se aplican validaciones complejas en cliente; la validación de credenciales se delega enteramente al backend.
- **Casos especiales de UI:**
  - **Loading State:** Cuando `isLoading` es `true`, los campos del formulario y el botón de submit se deshabilitan. El botón muestra la etiqueta "Ingresando...".
  - **Error State:** Si el backend responde con error, se muestra un contenedor animado rojo con el mensaje de error correspondiente.
  - **Interactive Features:** Botón para alternar la visibilidad de la contraseña (`visibility`/`visibility_off` usando iconos de Material Symbols).

### 2.2. DashboardPage (`/`)
- **Propósito:** Panel centralizador del consultorio para visualizar métricas rápidas de caja/turnos del día, ver la agenda del día y realizar gestiones rápidas (agendar turnos, crear pacientes rápido, cancelar y cerrar turnos).
- **Endpoints que consume:**
  - `GET /api/finanzas/caja/hoy`: Obtiene el resumen financiero diario.
  - `GET /api/turnos/hoy`: Lista los turnos agendados para el día actual.
  - `GET /api/doctores/`: Carga el listado de profesionales registrados para combos.
  - `GET /api/pacientes/{dni}`: Busca información de un paciente específico para el agendamiento rápido.
  - `POST /api/pacientes/`: Crea un nuevo paciente rápidamente desde el modal de nuevo turno.
  - `GET /api/turnos/`: Obtiene turnos filtrados por fecha y doctor (para determinar slots horarios ocupados al crear un turno).
  - `POST /api/turnos/`: Registra un nuevo turno.
  - `PATCH /api/turnos/{turno_id}/cancelar`: Cancela un turno pendiente.
  - `PUT /api/turnos/{turno_id}/cerrar`: Cierra un turno, registrando tratamientos efectuados, comentarios de evolución clínica y pagos.
  - `GET /api/catalogo/tratamientos`: Obtiene tratamientos para agilizar la selección en el modal de cierre.
- **Comportamiento de carga:**
  - Carga inicial masiva de Caja, Turnos Hoy y Doctores en un único `useEffect` con `Promise.all`.
  - Búsqueda manual de paciente por DNI con disparador de botón.
  - Carga de slots ocupados gatillada dinámicamente mediante `useEffect` cuando cambian la fecha o el doctor en el modal.
- **Componentes que renderiza:**
  - [KPICard.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/KPICard.tsx)
  - [CustomSelect.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/CustomSelect.tsx)
- **Estado local vs. global:**
  - **Local:** `caja` (ResumenCaja), `turnos` (Turno[]), `doctores` (Doctor[]), `loading` (boolean), `error` (string), variables de control de modales (`modalCrear`, `modalNuevoPac`, `modalCerrar`), datos de formulario de creación/cierre (`nuevoTurno`, `nuevoPac`, `tratamientos`, `pagos`, `comentarioClinico`), variables para selector de turnos (`selectedDate`, `selectedTime`, `loadingSlots`, `occupiedSlots`), filtros (`filtroDoctor`, `filtroEstado`).
  - **Global:** `useToast()` (notificaciones de éxito/error); `useNavigate()` (navegación a vista de agenda).
- **Validaciones de formulario:**
  - **Buscar Paciente:** DNI con longitud mínima de 3 caracteres.
  - **Crear Paciente Rápido:** DNI heredado del buscador. Nombre y apellido son requeridos para habilitar el submit.
  - **Crear Turno:** Validaciones de horario en cliente (`validarHorario`):
    - Jueves y Domingos no laborables.
    - Sábados únicamente por la mañana (9:00 a 13:00, último slot 12:30).
    - Lunes, Martes, Miércoles y Viernes de 9:00 a 13:00 (último 12:30) y de 16:00 a 20:00 (último 19:30).
    - Turnos deben ser de intervalos exactos de 30 minutos (minutos 00 o 30).
    - Estas reglas de negocio replican las validaciones del backend (`turnos.py`).
  - **Cerrar Turno:** Filtra tratamientos válidos (`nombre.trim() && precio > 0`) y pagos válidos (`monto > 0`). Convierte la moneda seleccionada en el payload dinámico (`precio_ars` o `precio_usd`).
- **Casos especiales de UI:**
  - **Loading State:** Muestra filas con skeleton shimmer en la tabla de turnos del día, y skeletons de carga en las tarjetas KPI.
  - **Empty State:** Si la lista de turnos es vacía, muestra "No hay turnos registrados para hoy" con acceso directo a crear turno.
  - **Error State:** Pantalla de error completa con ícono de advertencia y botón de "Reintentar".
  - **Filtros:** Píldoras interactivas de filtro por profesional (Darío/Fabiana) y por estado (Pendiente/Realizado) con animaciones de layouts compartidos (`layoutId`).
  - **Diferenciación Visual:** Filas de la tabla pintadas con fondos sutiles según el profesional asignado al turno (Darío: azul, Fabiana: rosa).

### 2.3. AgendaPage (`/agenda`)
- **Propósito:** Vista de calendario de turnos estructurada de forma semanal o mensual, facilitando el agendamiento visual en base a slots horarios libres y ocupados por doctor.
- **Endpoints que consume:**
  - `GET /api/doctores/`: Obtiene profesionales.
  - `GET /api/turnos/`: Obtiene turnos.
    - En vista semanal: hace 5 consultas paralelas en un `Promise.all` (una por cada día hábil de la semana) enviando la fecha en formato YYYY-MM-DD y el filtro de doctor.
    - En vista mensual: realiza una única consulta general sin fecha para obtener todos los turnos del consultorio y calcular los días con turnos ocupados.
  - `GET /api/pacientes/{dni}`: Busca paciente por DNI.
  - `POST /api/pacientes/`: Registra paciente rápido.
  - `POST /api/turnos/`: Agenda un nuevo turno.
  - `PATCH /api/turnos/{turno_id}/cancelar`: Cancela un turno.
  - `PUT /api/turnos/{turno_id}/cerrar`: Cierra/completa el turno ingresando tratamientos y cobros.
  - `GET /api/catalogo/tratamientos`: Obtiene catálogo de tratamientos.
- **Componentes que renderiza:**
  - [CustomSelect.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/CustomSelect.tsx)
- **Estado local vs. global:**
  - **Local:** `vista` ('semana' | 'mensual'), `mesNavegacion` (Date para vista mensual), `doctores` (Doctor[]), `doctorFiltro` (number | null), `turnos` (Turno[]), `fecha` (Date actual de referencia), `loading` (boolean), `error` (string | null), estados de control de modales de creación/cierre/resumenes, datos del formulario, variables para slots horarios, y estados de paciente rápido.
  - **Global:** `useToast()` (ToastContext).
- **Validaciones de formulario:**
  - Réplica idéntica de las validaciones de horario en cliente (`validarHorario`) descriptas en `DashboardPage.tsx`.
  - Oculta dinámicamente slots del día de hoy que corresponden a horas ya transcurridas en tiempo real.
- **Casos especiales de UI:**
  - **Días no laborables:** Si se selecciona un jueves o domingo, muestra una pantalla de ilustración con mensaje "Día de Descanso / Cerrado".
  - **Vista Semanal:** Muestra carrusel horizontal de los 5 días hábiles de la semana con indicadores de turnos (puntos de colores por doctor). Si no hay filtro de doctor, renderiza dos columnas paralelas de slots horarios por día (Dra. Fabiana vs. Dr. Darío) lado a lado.
  - **Vista Mensual:** Grilla clásica de 42 celdas del mes con tooltips interactivos y puntitos de colores representando turnos reservados.
  - **Interaction Design:** Transiciones fluidas en las tarjetas de slots horarios (disponibles vs. reservados) y animaciones de entrada en cascada utilizando Framer Motion.

### 2.4. PagosPage (`/pagos`)
- **Propósito:** Módulo central de administración contable de la clínica. Permite registrar abonos rápidos multimoneda para amortizar deudas de pacientes deudores y consultar el libro diario/caja de transacciones conciliadas.
- **Endpoints que consume:**
  - `GET /api/finanzas/caja/hoy`: Carga recaudaciones acumuladas diarias en pesos (ARS) y dólares (USD).
  - `GET /api/pacientes/deudores`: Obtiene la lista de pacientes con deudas pendientes.
  - `GET /api/finanzas/pagos`: Obtiene cobros del periodo filtrado (acepta query params: `fecha_desde`, `fecha_hasta`, `metodo_pago`).
  - `GET /api/pacientes/historial`: Obtiene el historial del deudor seleccionado para listar sus turnos impagos dentro del side-sheet.
  - `POST /api/finanzas/pagos`: Registra un cobro/abono general o enlazado a un turno del paciente.
- **Componentes que renderiza:**
  - `MiniDatePicker` (Componente local en el mismo archivo. Implementa un dropdown con grilla interactiva mensual de días para seleccionar rangos "desde" y "hasta" sin usar inputs nativos).
  - Iconos importados de `lucide-react`.
- **Estado local vs. global:**
  - **Local:** `caja` (ResumenCaja), `deudores` (Deudor[]), `loading` (boolean), `activeTab` ('deudores' | 'pagos'), `searchTerm` (string para buscador predictivo), `filtro` (FiltroCuenta: 'todos' | 'deudores_ars' | 'deudores_usd'), `pagos` (Pago[]), `periodoFiltro` ('hoy' | 'semana' | 'mes' | '30dias' | 'anio' | 'personalizado'), `anioMesSeleccionado`, `fechaDesdePersonalizada`, `fechaHastaPersonalizada`, `filtroMetodo` (MetodoFiltro), variables para el Side Sheet de cobro y datos del Ticket.
  - **Global:** `useToast()` (ToastContext).
- **Validaciones de formulario:**
  - **Amortizar deuda (Side Sheet):** `cobroMonto` debe ser mayor a 0.
  - Si el monto ingresado supera la deuda del paciente, se muestra un banner informativo dinámico de advertencia indicando que el excedente quedará como saldo a favor en su cuenta corriente (lógica de negocio).
- **Casos especiales de UI:**
  - **Optimistic Updates:** Al procesar un pago con éxito, resta inmediatamente el importe amortizado del estado local del paciente (`setDeudores`), actualizando sus saldos de deuda en la tabla antes de que refresque el backend, otorgando rapidez visual.
  - **Libro de Caja (Registro de Pagos):** Agrupa transacciones por día y por paciente mediante un acordeón interactivo. Al hacer click en una fila de paciente, se despliegan de forma animada las transacciones individuales mostrando el ID, concepto, fecha y método de pago con badges coloreados (efectivo: verde, transferencia: azul, tarjeta: ámbar).
  - **Ticket Contable (Modal de éxito):** Renderiza un ticket físico estilizado con los datos de cobro (paciente, divisa, método, fecha y hora exacta con segundos) al completar una transacción.
  - **Buscador predictivo:** Filtro interactivo en tiempo real en la lista de deudores que busca coincidencias sobre nombre, apellido o DNI.

### 2.5. PerfilPacientePage (`/pacientes`)
- **Propósito:** Layout de gestión integral de pacientes (Maestro-Detalle). Permite buscar y dar de alta pacientes, modificar sus datos de cobertura y datos personales, agregar notas clínicas, ver su cronología de turnos previos, y consultar/abonar su cuenta corriente contable.
- **Endpoints que consume:**
  - `GET /api/pacientes/`: Obtiene listado general de pacientes.
  - `GET /api/pacientes/{dni}/cuenta`: Obtiene cuenta corriente del paciente seleccionado.
  - `POST /api/pacientes/`: Crea un nuevo paciente.
  - `PUT /api/pacientes/{dni}`: Modifica los datos demográficos y de cobertura.
  - `POST /api/finanzas/pagos`: Registra cobro rápido de cuenta corriente.
  - `GET /api/pacientes/historial`: Obtiene el historial clínico detallado (turnos, tratamientos, saldo por sesión).
  - `GET /api/finanzas/pagos`: Obtiene cobros enlazados al paciente.
- **Componentes que renderiza:**
  - `PatientHeader`, `SidebarInfo`, `ClinicalNotes`, `Timeline`, `TurnoDetalleModal` (Todos definidos localmente en el mismo archivo como sub-componentes modulares de apoyo).
  - Iconos de `lucide-react`.
- **Estado local vs. global:**
  - **Local:** `subView` ('list' | 'profile' | 'edit' | 'history'), `pacientes` (Paciente[]), `busqueda` (string), `orden` (string), `filtroOS` (string), `pacienteSel` (Paciente), `cuentaSel`, `historialSel`, `pagosSel`, `saldosPacientes` (Record de DNI a balances contables), `comentariosMedicos` (string), `notaGuardada` (boolean), `editForm`, `nuevoForm`, `filtroMetodo`, `nuevoPago` (formulario de pago rápido), y booleanos de control de modales/cargas.
  - **Global:** `useToast()` (ToastContext).
- **Validaciones de formulario:**
  - **Crear Paciente / Editar Paciente:** Nombre, apellido y DNI (solo en creación) obligatorios. Validación básica en cliente.
  - **Registrar Cobro Rápido:** Monto requerido y mayor que 0. Permite elegir asociar el abono a un turno en específico que registre deuda remanente.
- **Casos especiales de UI:**
  - **Notas Clínicas (Evolución):** Se persisten directamente en el cliente a través de `localStorage` con la clave `dental_paciente_comentarios_${dni}`, mostrando un badge animado "Pendiente" cuando el texto cambia y "Guardado" cuando se hace submit.
  - **Gestión de Obras Sociales:** Modal emergente que permite al administrador agregar y quitar obras sociales de la lista del consultorio. Los cambios se guardan localmente en el estado del componente.
  - **Historial de Movimientos Contables (Vista 'history'):** Combina turnos del historial y pagos no vinculados en una única línea de tiempo contable ordenada de manera descendente. Los turnos con cobros asociados muestran un acordeón desplegable que detalla cada abono individual recibido para esa sesión con un indicador de conexión vertical.
  - **Mock Fallback Contable:** Si las llamadas de red fallan al cargar perfiles, el código inyecta balances simulados (ej: deuda de $14.995 para el DNI `'1111111'`) garantizando la resiliencia en la presentación.

### 2.6. HistorialPacientePage (`/pacientes/:dni/historial`)
- **Propósito:** Vista de ficha clínica dedicada e interactiva. Muestra dos columnas (historial de tratamientos con filtros y desglose contable a la izquierda, y libro de abonos registrados con filtros a la derecha).
- **Endpoints que consume:**
  - `GET /api/pacientes/{dni}`: Obtiene el nombre y cobertura del paciente.
  - `GET /api/pacientes/historial`: Carga el historial de tratamientos filtrado opcionalmente por rango de fechas (`fecha_desde`, `fecha_hasta`).
  - `GET /api/finanzas/pagos`: Carga abonos recibidos del paciente con opción de filtrar por método de pago.
- **Componentes que renderiza:**
  - Ninguno compartido (HTML y Tailwind).
- **Estado local vs. global:**
  - **Local:** `paciente` (Paciente), `loadingPaciente` (boolean), `historial` (HistorialPacienteResponse), `loadingHistorial` (boolean), `fechaDesde` (string), `fechaHasta` (string), `pagos` (Pago[]), `loadingPagos` (boolean), `filtroMetodo` (MetodoFiltro).
  - **Global:** `useParams()` (obtiene el DNI de la ruta); `useNavigate()` (retorno a vista previa).
- **Validaciones de formulario:**
  - No aplica (vista de consulta).
- **Casos especiales de UI:**
  - **KPIs de Ficha:** Muestra totales de tratamientos facturados, abonos conciliados y saldo final en pesos y dólares de forma consolidada en la parte superior.
  - **Enlaces de desplazamiento (Anclas):** La lista de pagos en la columna derecha incluye enlaces interactivos `<a href="#turno-ID">` que guían visualmente al usuario hacia la sesión odontológica exacta que generó esa transacción en la columna izquierda.
  - **Estructura Detallada:** Cada turno de la lista desglosa sus tratamientos con cantidades y precios individuales, la lista de pagos específicos del turno y el cálculo de saldo deudor residual de esa sesión.

### 2.7. AdminPage (`/admin/usuarios`)
- **Propósito:** Panel administrativo de control de personal para gestionar accesos, roles y contraseñas de las cuentas de secretaría.
- **Endpoints que consume:**
  - `GET /api/admin/usuarios`: Lista todas las cuentas registradas.
  - `POST /api/admin/usuarios`: Crea una nueva cuenta con rol `secretaria`.
  - `PUT /api/admin/usuarios/{user_id}/toggle-activo`: Activa o desactiva una cuenta (bloquea el inicio de sesión).
  - `DELETE /api/admin/usuarios/{user_id}`: Elimina definitivamente una cuenta.
  - `PUT /api/admin/usuarios/{user_id}`: Actualiza nombre de usuario y contraseña de una cuenta existente.
- **Componentes que renderiza:**
  - Ninguno compartido.
- **Estado local vs. global:**
  - **Local:** `users` (User[]), `isLoading` (boolean), `deleteConfirm` (modal de borrado), `showCreate` (modal de creación y campos del form), `editTarget` (modal de edición y campos del form).
  - **Global:** `getAccessToken` de `useAuth()` (para añadir cabecera `Authorization: Bearer ${token}`); `useToast()` (ToastContext).
- **Validaciones de formulario:**
  - **Crear Usuario:** Username y contraseña obligatorios. Rol hardcodeado a `'secretaria'` en la petición.
  - **Editar Usuario:** Nombre requerido. Contraseña nueva es opcional.
  - **Self-Edit (Admin):** Si el usuario a editar es un administrador, se requiere obligatoriamente ingresar su contraseña actual (`current_password`) para autorizar cambios en las credenciales de acceso.
- **Casos especiales de UI:**
  - Restricciones visuales de seguridad: los usuarios de rol `admin` no exponen los botones de eliminación ni de desactivación en la tabla para evitar bloqueos del sistema.
  - El botón de activación/desactivación cambia dinámicamente de icono (`check_circle`/`block`) y color (esmeralda/ámbar) según el estado del registro.
  - Modales de confirmación para evitar eliminaciones accidentales.

### 2.8. CatalogoPage (`/catalogo`)
- **Propósito:** Visualizar y administrar el catálogo maestro de servicios odontológicos base y el listado de obras sociales/mutualidades asociadas de la clínica.
- **Endpoints que consume:**
  - `GET /api/catalogo/tratamientos`: Lista los tratamientos registrados.
  - `GET /api/catalogo/obras-sociales`: Lista las obras sociales registradas.
  - `POST /api/catalogo/tratamientos`: Registra un tratamiento nuevo (duración, nombre, categoría, precios base).
  - `PUT /api/catalogo/tratamientos/{id}`: Modifica un tratamiento existente.
  - `DELETE /api/catalogo/tratamientos/{id}`: Desactiva lógicamente un tratamiento (soft delete).
  - `POST /api/catalogo/obras-sociales`: Crea una nueva obra social.
  - `DELETE /api/catalogo/obras-sociales/{id}`: Elimina/desactiva una obra social del catálogo.
- **Componentes que renderiza:**
  - Ninguno compartido (HTML y Tailwind).
- **Estado local vs. global:**
  - **Local:** `tratamientos` (TratamientoCatalogo[]), `obrasSociales` (ObraSocial[]), `isLoading` (boolean), `filtroCategoria` (string), control de modales de creación/edición de tratamiento y obra social, campos de formulario (`tNombre`, `tArs`, `tUsd`, `tDuracion`, `tCategoria`, `oNombre`), y variables de eliminación.
  - **Global:** `user` y `getAccessToken` de `useAuth()` (para comprobar permisos de escritura en la UI y adjuntar token JWT).
- **Validaciones de formulario:**
  - **Tratamiento:** Nombre obligatorio. Duración parseada a entero (mínimo 30 minutos). Se exige obligatoriamente especificar al menos un precio de referencia base (ya sea en Pesos ARS o en Dólares USD).
  - **Obra Social:** Nombre obligatorio y único.
- **Casos especiales de UI:**
  - Filtro horizontal dinámico de categorías de tratamientos: las píldoras de categorías se autogeneran agrupando los valores únicos del campo `categoria` provenientes del JSON del catálogo.
  - El rol se evalúa en el renderizado: si el usuario logueado no tiene permisos de edición (no es admin ni secretaria), se ocultan todos los botones de creación, edición y eliminación de las tablas, actuando la página como catálogo de lectura.

---

## 3. Inventario global de componentes compartidos

En el frontend actual, los componentes reutilizables residen en la carpeta `components/`. Se detallan a continuación:

| Nombre | Path del Archivo | Props que recibe | Vistas en las que se usa | Lógica de Negocio Mezclada (⚠️) |
| :--- | :--- | :--- | :--- | :---: |
| `CustomSelect` | [CustomSelect.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/CustomSelect.tsx) | `options: SelectOption[]`<br>`value: string \| number`<br>`onChange: (val: any) => void`<br>`placeholder?: string`<br>`disabled?: boolean` | - `DashboardPage`<br>- `AgendaPage`<br>- `PerfilPacientePage` | No (Puro presentación) |
| `KPICard` | [KPICard.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/KPICard.tsx) | `title: string`<br>`value: string \| number`<br>`subtitle?: string`<br>`icon: string`<br>`color: string`<br>`loading?: boolean`<br>`delay?: number` | - `DashboardPage` | No (Puro presentación) |
| `NavigationRail` | [NavigationRail.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/NavigationRail.tsx) | Ninguna | - Layout general (`App.tsx`) | ⚠️ **Sí**. Importa `useAuth()` para evaluar si el rol del usuario es `admin` y renderizar el enlace a `/admin/usuarios`. También maneja la función `handleLogout` invocando el método de limpieza del backend. |
| `PrivateRoute` | [PrivateRoute.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/PrivateRoute.tsx) | `children: React.ReactNode` | - Enrutador general (`App.tsx`) | ⚠️ **Sí**. Evalúa el estado global de autenticación (`isAuthenticated` e `isLoading` desde `useAuth`) para redirigir condicionalmente a `/login`. |
| `TurnoCard` | [TurnoCard.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/components/TurnoCard.tsx) | `turno: Turno`<br>`doctorColor: string`<br>`onClick: (turno: Turno) => void`<br>`style?: React.CSSProperties` | Ninguna (**Dead code / sin uso**) | No (Puro presentación) |

---

## 4. Inventario global de endpoints (Cruce Backend vs. Frontend)

A continuación se detalla la correspondencia entre los endpoints existentes en el backend (routers de FastAPI) y su consumo real en el frontend actual:

| Método | Path del Endpoint | Body / Query Params | Response Shape | Roles Permitidos | Vista(s) desde donde se consume | Estado / Observaciones |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/auth/login` | `{ username, password }` | `{ access_token, refresh_token }` | Público | `LoginPage` (Vía `AuthContext`) | Activo |
| `POST` | `/api/auth/refresh` | `{ refresh_token }` | `{ access_token, refresh_token }` | Público | `AuthContext` e `interceptors.ts` | Activo |
| `POST` | `/api/auth/logout` | Ninguno (Bearer Token) | `{ mensaje: string }` | Autenticados | `NavigationRail` (Vía `AuthContext`) | Activo |
| `GET` | `/api/auth/me` | Ninguno (Bearer Token) | `{ id, username, rol, activo, creado_en }` | Autenticados | Ninguna | ⚠️ **Unused backend code** |
| `POST` | `/api/admin/usuarios` | `{ username, password, rol }` | `{ id, username, rol, activo, creado_en }` | `admin` | `AdminPage` | Activo |
| `GET` | `/api/admin/usuarios` | Ninguno | `list[{ id, username, rol, activo, creado_en }]` | `admin` | `AdminPage` | Activo |
| `PUT` | `/api/admin/usuarios/{user_id}/toggle-activo` | Ninguno | `{ id, username, rol, activo, creado_en }` | `admin` | `AdminPage` | Activo |
| `DELETE` | `/api/admin/usuarios/{user_id}` | Ninguno | `{ mensaje: string }` | `admin` | `AdminPage` | Activo |
| `PUT` | `/api/admin/usuarios/{user_id}` | `{ username?, password?, current_password? }` | `{ id, username, rol, activo, creado_en }` | `admin` | `AdminPage` | Activo |
| `GET` | `/api/pacientes/` | Ninguno | `list[{ dni, nombre, apellido, telefono, email, obra_social }]` | `admin`, `secretaria` | `PerfilPacientePage` (Vía `api.ts`) | Activo |
| `GET` | `/api/pacientes/deudores` | Ninguno | `list[{ dni, nombre, apellido, telefono, obra_social, saldo_ars, saldo_usd }]` | `admin`, `secretaria` | `PagosPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/pacientes/historial` | `?dni` (obligatorio)<br>`?fecha_desde`, `?fecha_hasta` | `{ dni_paciente, nombre, apellido, saldo_ars, saldo_usd, totales: {...}, turnos: [...] }` | `admin`, `secretaria` | `PerfilPacientePage`, `HistorialPacientePage` (Vía `api.ts`) | Activo |
| `GET` | `/api/pacientes/{dni}` | Ninguno | `{ dni, nombre, apellido, telefono, email, obra_social }` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage`, `PerfilPacientePage`, `HistorialPacientePage` (Vía `api.ts`) | Activo |
| `POST` | `/api/pacientes/` | `{ dni, nombre, apellido, telefono?, email?, obra_social? }` | `{ dni, nombre, apellido, telefono, email, obra_social }` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage`, `PerfilPacientePage` (Vía `api.ts`) | Activo |
| `PUT` | `/api/pacientes/{dni}` | `{ nombre?, apellido?, telefono?, email?, obra_social? }` | `{ dni, nombre, apellido, telefono, email, obra_social }` | `admin`, `secretaria` | `PerfilPacientePage` (Vía `api.ts`) | Activo |
| `GET` | `/api/pacientes/{dni}/cuenta` | Ninguno | `{ paciente: {...}, saldo_ars, saldo_usd, movimientos: [...] }` | `admin`, `secretaria` | `PerfilPacientePage` (Vía `api.ts`) | Activo |
| `GET` | `/api/turnos/` | `?fecha?`, `?id_doctor?`, `?paciente_dni?` | `list[{ id, fecha_hora, motivo, dni_paciente, id_doctor, estado, paciente, doctor }]` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/turnos/hoy` | Ninguno | `list[{ id, fecha_hora, motivo, dni_paciente, id_doctor, estado, paciente, doctor }]` | `admin`, `secretaria` | `DashboardPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/turnos/paciente/{dni}` | Ninguno | `list[{ id, fecha_hora, motivo, dni_paciente, id_doctor, estado, paciente, doctor }]` | `admin`, `secretaria` | Ninguna (Vía `api.ts` no se exporta) | ⚠️ **Unused backend code** |
| `POST` | `/api/turnos/` | `{ fecha_hora, motivo?, dni_paciente, id_doctor }` | `{ id, fecha_hora, motivo, dni_paciente, id_doctor, estado, paciente, doctor }` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage` (Vía `api.ts`) | Activo |
| `PATCH` | `/api/turnos/{turno_id}/cancelar` | Ninguno | `{ id, fecha_hora, motivo, dni_paciente, id_doctor, estado, paciente, doctor }` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage` (Vía `api.ts`) | Activo |
| `DELETE` | `/api/turnos/{turno_id}` | Ninguno | `{ mensaje: string }` | `admin`, `secretaria` | Ninguna | ⚠️ **Unused backend code** |
| `PUT` | `/api/turnos/{turno_id}/cerrar` | `{ tratamientos: [...], pagos: [...], comentarios? }` | `{ id, fecha_hora, estado, tratamientos_registrados, pagos_registrados, saldo_ars_restante, saldo_usd_restante }` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/doctores/` | Ninguno | `list[{ id, nombre, especialidad?, activo }]` | `admin`, `secretaria` | `DashboardPage`, `AgendaPage` (Vía `api.ts`) | Activo |
| `POST` | `/api/doctores/` | `{ nombre, especialidad? }` | `{ id, nombre, especialidad, activo }` | `admin`, `secretaria` | Ninguna | ⚠️ **Unused backend code** |
| `GET` | `/api/doctores/{id}` | Ninguno | `{ id, nombre, especialidad, activo }` | `admin`, `secretaria` | Ninguna | ⚠️ **Unused backend code** |
| `PUT` | `/api/doctores/{id}` | `{ nombre?, especialidad?, activo? }` | `{ id, nombre, especialidad, activo }` | `admin`, `secretaria` | Ninguna | ⚠️ **Unused backend code** |
| `DELETE` | `/api/doctores/{id}` | Ninguno | `{ id, nombre, especialidad, activo }` (Desactivar) | `admin`, `secretaria` | Ninguna | ⚠️ **Unused backend code** |
| `POST` | `/api/finanzas/pagos` | `{ monto, moneda, metodo_pago, id_turno?, dni_paciente?, notas? }` | `{ id, fecha_pago, monto, moneda, metodo_pago, id_turno, dni_paciente }` | `admin`, `secretaria` | `PerfilPacientePage`, `PagosPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/finanzas/pagos` | `?fecha_desde?`, `?fecha_hasta?`, `?metodo_pago?`, `?dni_paciente?`, `?id_doctor?`, `?solo_deudores?` | `list[{ id, fecha_pago, monto, moneda, metodo_pago, id_turno, dni_paciente, paciente, doctor }]` | `admin`, `secretaria` | `PerfilPacientePage`, `PagosPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/finanzas/caja/hoy` | Ninguno | `{ turnos_realizados, turnos_pendientes, ingresos_ars, ingresos_usd }` | `admin`, `secretaria` | `DashboardPage`, `PagosPage` (Vía `api.ts`) | Activo |
| `GET` | `/api/catalogo/tratamientos` | `?categoria?` | `list[{ id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo }]` | Público | `DashboardPage`, `AgendaPage` (Vía `api.ts`), `CatalogoPage` (Vía `fetch`) | Activo |
| `GET` | `/api/catalogo/tratamientos/{id}` | Ninguno | `{ id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo }` | Público | Ninguna | ⚠️ **Unused backend code** |
| `POST` | `/api/catalogo/tratamientos` | `{ nombre, precio_ars?, precio_usd?, duracion_minutos?, categoria? }` | `{ id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo }` | `admin`, `secretaria` | `CatalogoPage` (Vía `fetch`) | Activo |
| `PUT` | `/api/catalogo/tratamientos/{id}` | `{ nombre?, precio_ars?, precio_usd?, duracion_minutos?, categoria?, activo? }` | `{ id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo }` | `admin`, `secretaria` | `CatalogoPage` (Vía `fetch`) | Activo |
| `DELETE` | `/api/catalogo/tratamientos/{id}` | Ninguno | `{ id, nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo }` (Soft delete) | `admin`, `secretaria` | `CatalogoPage` (Vía `fetch`) | Activo |
| `GET` | `/api/catalogo/obras-sociales` | Ninguno | `list[{ id, nombre, activo }]` | Público | `CatalogoPage` (Vía `fetch`), `DashboardPage` (Vía `api.ts` - indirecto) | Activo |
| `POST` | `/api/catalogo/obras-sociales` | `{ nombre }` | `{ id, nombre, activo }` | `admin`, `secretaria` | `CatalogoPage` (Vía `fetch`) | Activo |
| `DELETE` | `/api/catalogo/obras-sociales/{id}` | Ninguno | `{ id, nombre, activo }` | `admin`, `secretaria` | `CatalogoPage` (Vía `fetch`) | Activo |

---

## 5. Deuda técnica detectada

Se enumeran los problemas de arquitectura, consistencia y calidad de código identificados en la base del frontend actual:

1. **Monolitos a nivel de página (Componentes gigantes):**
   - [AgendaPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/AgendaPage.tsx) (1898 líneas) y [PerfilPacientePage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/PerfilPacientePage.tsx) (2159 líneas) son masivos. Manejan simultáneamente la lógica de filtrado de datos, múltiples modales superpuestos, validaciones de formularios contables, manipulación del DOM, lógica de navegación y llamadas directas de red. Deben refactorizarse dividiendo la UI en componentes hijos enfocados y extrayendo la lógica a custom hooks.
2. **Duplicación de lógica y formularios:**
   - La validación horaria de turnos en cliente (`validarHorario`) se encuentra exactamente duplicada en [DashboardPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/DashboardPage.tsx#L189-L217) y [AgendaPage.tsx](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/AgendaPage.tsx#L281-L309).
   - Los modales para "Crear Turno", "Registrar Cobro" y "Crear Paciente Rápido" se implementan por duplicado con marcado HTML y estados locales casi idénticos en múltiples vistas, en lugar de estar abstraídos en componentes reutilizables.
3. **Manejo de Red y fetching inconsistente:**
   - Hay una incoherencia de patrones para consumir endpoints: vistas como `DashboardPage` o `PagosPage` usan Axios a través del cliente configurado en [api.ts](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/services/api.ts), mientras que vistas como `AdminPage` y `CatalogoPage` usan la función nativa `fetch` concatenando rutas y configurando manualmente las cabeceras JWT, duplicando código repetitivo de interceptores.
4. **Almacenamiento local persistido eludiendo al Backend:**
   - Las notas clínicas en la ficha del paciente (`PerfilPacientePage`) se leen y persisten usando directamente `localStorage` (`dental_paciente_comentarios_${dni}`). Esto crea una desconexión y pérdida de datos al cambiar de cliente o navegador, puesto que el backend de FastAPI no recibe ni almacena estos comentarios en base de datos.
5. **Inconsistencias de estilos y dependencias de iconos:**
   - Se mezclan librerías de iconografía de forma arbitraria en el mismo proyecto: unas páginas utilizan iconos SVG de `lucide-react` (como `PagosPage` y `PerfilPacientePage`), mientras que otras dependen de la fuente Google Material Symbols usando tags HTML `material-symbols-rounded` (como `DashboardPage`, `AgendaPage`, `LoginPage` y `CatalogoPage`).
6. **Manejo de estados con fallbacks en el frontend (Hardcoding):**
   - Existen fallbacks directos en los bloques `catch` de las peticiones para "simular" datos correctos si la API de red falla (ej: inyectar el cobro mockeado de Martín Riki de $14.995). Esto enmascara errores reales en los flujos de testing y desarrollo.
7. **Falta de tipado estricto:**
   - Hay un uso recurrente de tipados `any` en interceptores y payloads de error en el bloque `catch`, desaprovechando las ventajas de TypeScript e incrementando el riesgo de errores en tiempo de ejecución.

---

## 6. Paleta y tokens de diseño actuales

El sistema de diseño actual utiliza Tailwind CSS v4. Los tokens de diseño se encuentran centralizados en el archivo [index.css](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/index.css) en forma de variables nativas de CSS `:root` y directivas `@theme`:

### Variables CSS en `:root`
| Variable | Valor actual | Descripción / Propósito |
| :--- | :--- | :--- |
| `--color-primary` | `#2563eb` | Color principal de la marca (Blue 600) |
| `--color-primary-light` | `rgba(37, 99, 235, 0.15)` | Color translúcido para focos e interacciones |
| `--color-primary-dark` | `#1e3a8a` | Color secundario oscuro para estados activos |
| `--color-surface` | `transparent` | Color de fondo del layout base |
| `--color-surface-alt` | `rgba(255, 255, 255, 0.35)` | Fondo translúcido para contenedores |
| `--color-border` | `rgba(255, 255, 255, 0.4)` | Color base de bordes translúcidos |
| `--radius-card` | `24px` | Redondeado de esquinas de tarjetas principales |
| `--radius-input` | `16px` | Redondeado de esquinas de cajas de texto / formularios |
| `--radius-pill` | `12px` | Redondeado de botones de filtros segmentados y pills |
| `--font-display` | `"DM Sans", "Inter", sans-serif` | Tipografía para encabezados y títulos destacados |
| `--font-body` | `"Inter", sans-serif` | Tipografía para textos generales y listados |

### Directivas de Tema de Tailwind v4 (`@theme`)
- **Font Sans:** `"Inter", ui-sans-serif, system-ui, sans-serif`
- **Font Display:** `"DM Sans", "Inter", sans-serif`

### Reglas Globales de Visualización (Estilo Actual)
- **Fondo General:** Gradiente diagonal de 135 grados: `linear-gradient(135deg, #e2e8f0 0%, #f0f9ff 50%, #e0e7ff 100%)`.
- **Glassmorphism forzado:** Todas las clases `.bg-white` que no sean elementos interactivos de formulario tienen `background-color: rgba(255, 255, 255, 0.55) !important` y `backdrop-filter: blur(16px) saturate(120%) !important`.
- **Filtros Segmentados:** El contenedor `.bg-slate-50` se renderiza como `rgba(255, 255, 255, 0.35) !important` y `backdrop-filter: blur(8px)`.
- **Formularios e Inputs de Alto Contraste:** Para resguardar la usabilidad, todos los inputs, selects y textareas rompen el glassmorphism del fondo, forzándose a `#ffffff` sólido con bordes de contraste `#cbd5e1` (slate-300).
- **Escala de Fuentes para Escritorio:** Con el fin de emular una interfaz espaciosa, en pantallas medianas/grandes (MD / 768px+) el tamaño base de fuente del `body` aumenta un 25% (`font-size: 22px`), modificando dinámicamente toda la escala tipográfica de Tailwind (`.text-xs` a `0.9rem`, `.text-sm` a `1.05rem`, `.text-base` a `1.2rem`, etc.).
- **Badges y Colores de Doctores:**
  - **Darío:** `#009BFF` (General)
  - **Fabiana:** `#FF0088` (Ortodoncia)
