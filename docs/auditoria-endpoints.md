# Documento de Auditoría de Endpoints de Backend — OdontoGest

Este documento detalla la auditoría completa de los endpoints de backend expuestos por el servidor (`server.ts`) y consumidos por la aplicación frontend en React. Ha sido generado de forma manual mediante la revisión minuciosa del código fuente del backend, el cliente de API (`src/lib/api.ts`), las vistas del frontend (`src/pages/*`) y las definiciones de tipos TypeScript (`src/types.ts`).

---

## 1. Módulos y Catalogación de Endpoints

A continuación, se agrupan los endpoints de acuerdo con el módulo o vista del frontend que los consume, detallando su método, ruta exacta, estado actual de conexión, y la forma precisa de sus peticiones (Requests) y respuestas (Responses).

---

### MÓDULO A: Autenticación y Sesión (Login)

Este módulo gestiona el control de acceso, verificación de roles del sistema y persistencia de tokens de seguridad JWT (`access_token` y `refresh_token`).

#### 1. `POST /api/auth/login`
* **Vistas que lo usan:** `LoginPage.tsx` (Inicio de Sesión)
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 455).
* **Request Shape (Body):**
  ```typescript
  {
    username: string;
    password: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    access_token: string;
    refresh_token: string;
  }
  ```

#### 2. `POST /api/auth/refresh`
* **Vistas que lo usan:** Interceptor/Fetcher global de API (`src/lib/api.ts`)
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 527).
* **Request Shape (Body):**
  ```typescript
  {
    refresh_token: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    access_token: string;
    refresh_token: string;
  }
  ```

#### 3. `GET /api/auth/me`
* **Vistas que lo usan:** `LoginPage.tsx` (Validación inmediata de credenciales) y validación en la carga de componentes estructurales como la barra de navegación lateral.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 514).
* **Request Shape (Headers):**
  ```http
  Authorization: Bearer <access_token>
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    username: string;
    rol: 'admin' | 'secretaria';
    activo: boolean;
  }
  ```

---

### MÓDULO B: Inicio (Dashboard / Agenda del Día)

La pantalla principal consolida los indicadores claves de rendimiento financieros, la lista de turnos asignados para la fecha actual, y atajos rápidos para agendar turnos o crear nuevos pacientes de forma rápida.

#### 4. `GET /api/finanzas/caja/hoy`
* **Vistas que lo usan:** `DashboardPage.tsx` (KPIs de ingresos), `PagosPage.tsx` (KPIs del libro de finanzas).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1921).
* **Request Shape:** Ninguno (Petición GET simple sin parámetros).
* **Response Shape (Success):**
  ```typescript
  {
    ingresos_ars: number;
    ingresos_usd: number;
    turnos_realizados: number;
    turnos_pendientes: number;
  }
  ```

#### 5. `GET /api/turnos/hoy`
* **Vistas que lo usan:** `DashboardPage.tsx` (Grilla principal de turnos diarios).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1330).
* **Request Shape:** Ninguno.
* **Response Shape (Success):**
  ```typescript
  // Retorna un array de objetos Turno extendidos por el backend
  {
    id: number;
    fecha_hora: string; // ISO DateTime
    duracion_minutos: number;
    motivo?: string;
    estado: 'Pendiente' | 'Realizado' | 'Cancelado';
    dni_paciente: string;
    id_doctor: number;
    paciente?: string;       // Nombre del paciente inyectado ("Apellido, Nombre")
    doctor_nombre?: string;  // Nombre del profesional inyectado
    doctor_color?: string;   // Color hex del profesional asignado
    tratamientos?: {         // Detalles de tratamientos facturados
      id: number;
      id_turno: number;
      nombre: string;
      cantidad: number;
      precio_ars: number;
      precio_usd: number;
    }[];
    pagos?: {                // Historial de pagos asociados
      id: number;
      monto: number;
      fecha_pago: string;
      metodo_pago: string;
      moneda: 'ARS' | 'USD';
    }[];
  }[]
  ```

#### 6. `GET /api/doctores`
* **Vistas que lo usan:** `DashboardPage.tsx`, `AgendaPage.tsx`, `PagosPage.tsx`, `DoctoresPage.tsx` (Nomina general).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 824).
* **Request Shape:** Ninguno (Filtros locales en el cliente React).
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    color_agenda: string;
    activo: boolean;
    matricula: string;
    telefono?: string;
    email?: string;
  }[]
  ```

#### 7. `GET /api/catalogo/tratamientos`
* **Vistas que lo usan:** `DashboardPage.tsx` (Cierre con facturación), `AgendaPage.tsx`, `CatalogoPage.tsx`.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1943).
* **Request Shape:** Ninguno (GET simple).
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    precio_ars: number;
    precio_usd: number;
    duracion_minutos: number;
    categoria: string;
    activo: boolean;
  }[]
  ```

#### 8. `GET /api/catalogo/obras-sociales`
* **Vistas que lo usan:** `DashboardPage.tsx` (Ficha rápida), `AgendaPage.tsx`, `PacientesPage.tsx` (Ficha y filtros), `CatalogoPage.tsx`.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 2001).
* **Request Shape:** Ninguno.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    activo: boolean;
  }[]
  ```

#### 9. `GET /api/pacientes/:dni`
* **Vistas que lo usan:** `DashboardPage.tsx` y `AgendaPage.tsx` (Búsqueda de paciente), `HistorialPage.tsx` (Información del paciente para la CC).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1118).
* **Request Shape (URL Params):** `dni` (string) enviado en la ruta.
* **Response Shape (Success):**
  ```typescript
  {
    dni: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }
  ```

#### 10. `POST /api/pacientes`
* **Vistas que lo usan:** `DashboardPage.tsx` (Registro rápido de paciente), `AgendaPage.tsx`, `PacientesPage.tsx` (Registrar ficha).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1124).
* **Request Shape (Body):**
  ```typescript
  {
    dni: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    dni: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }
  ```

#### 11. `POST /api/turnos`
* **Vistas que lo usan:** `DashboardPage.tsx` (Atajo agendar turno), `AgendaPage.tsx` (Creación interactiva desde la grilla horaria).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1361).
* **Request Shape (Body):**
  ```typescript
  {
    fecha_hora: string; // Formato local ISO 'YYYY-MM-DDTHH:MM'
    duracion_minutos: number;
    motivo: string;
    dni_paciente: string;
    id_doctor: number;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    fecha_hora: string;
    duracion_minutos: number;
    motivo?: string;
    estado: 'Pendiente' | 'Realizado' | 'Cancelado';
    dni_paciente: string;
    id_doctor: number;
  }
  ```

#### 12. `PATCH /api/turnos/:id/cancelar`
* **Vistas que lo usan:** `DashboardPage.tsx` (Acción de cancelar cita médica en el día).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1420).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    estado: 'Cancelado';
    fecha_hora: string;
    dni_paciente: string;
    id_doctor: number;
  }
  ```

#### 13. `PUT /api/turnos/:id/cerrar`
* **Vistas que lo usan:** `DashboardPage.tsx` (Procedimiento de Cierre con Facturación y Ficha Odontológica). El backend se encarga de crear la deuda en la cuenta corriente y registrar las transacciones.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1430).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    comentarios_medicos: string;
    tratamientos: {
      nombre: string;
      cantidad: number;
      precio_ars: number;
      precio_usd: number;
    }[];
    pagos: {
      monto: number;
      metodo_pago: string;
      moneda: 'ARS' | 'USD';
    }[];
    pieza_dental?: number | null;
    ubicacion_lesion?: string | null;
    conformidad_paciente?: boolean | null;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    turno: {
      id: number;
      estado: 'Realizado';
      fecha_hora: string;
      dni_paciente: string;
      id_doctor: number;
    };
    tratamientos_registrados: {
      id: number;
      id_turno: number;
      nombre: string;
      cantidad: number;
      precio_ars: number;
      precio_usd: number;
    }[];
    pagos_registrados: {
      id: number;
      monto: number;
      fecha_pago: string;
      metodo_pago: string;
      moneda: 'ARS' | 'USD';
      dni_paciente: string;
      id_turno: number;
    }[];
  }
  ```

---

### MÓDULO C: Agenda Médica Inteligente

Este módulo administra la grilla horaria diaria o mensual, detecta slots laborables para cada odontólogo, gestiona bloqueos manuales/administrativos interactivos y excepciones en el calendario (licencias o vacaciones).

#### 14. `GET /api/config/horarios`
* **Vistas que lo usan:** `AgendaPage.tsx` (Configura la hora de inicio, hora de fin e intervalo de visualización de la grilla horaria).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 2045).
* **Request Shape:** Ninguno.
* **Response Shape (Success):**
  ```typescript
  {
    hora_inicio: string;       // "08:00"
    hora_fin: string;          // "21:00"
    intervalo_minutos: number; // 30
  }
  ```

#### 15. `GET /api/doctores/:id/horarios`
* **Vistas que lo usan:** `AgendaPage.tsx` (Consultar horario de atención del doctor activo), `DoctoresPage.tsx` (Subcomponente `DoctorHorariosConfig`).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 837).
* **Request Shape (URL Params):** `id` (number) de doctor en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    dias: {
      [dayOfWeek: string]: { // "1" (Lunes) a "0" (Domingo)
        mañana: [string, string] | null; // e.g. ["09:00", "13:00"]
        tarde: [string, string] | null;  // e.g. ["16:00", "20:00"]
      } | null;
    };
    duracion_turno: number;
    horizonte_dias: number;
  }
  ```

#### 16. `GET /api/doctores/:id/dias-no-laborables`
* **Vistas que lo usan:** `AgendaPage.tsx` (Saber si el doctor está ausente en la fecha seleccionada), `DoctoresPage.tsx` (Subcomponente `DoctorHorariosConfig`).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 912).
* **Request Shape (URL Params):** `id` (number) de doctor en la URL.
* **Request Shape (Query Params - Opcional):** `desde` (YYYY-MM-DD), `hasta` (YYYY-MM-DD).
* **Response Shape (Success):**
  ```typescript
  string[] // Array de fechas marcadas como inactivas (e.g., ["2026-07-20", "2026-07-24"])
  ```

#### 17. `GET /api/turnos/slots`
* **Vistas que lo usan:** `AgendaPage.tsx` (Grilla diaria de turnos, calcula disponibilidad, turnos existentes y bloqueos).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1494).
* **Request Shape (Query Params):** `fecha` (YYYY-MM-DD), `id_doctor` (number).
* **Response Shape (Success):**
  ```typescript
  {
    hora: string;                      // "09:00"
    estado: 'libre' | 'ocupado' | 'bloqueado';
    slot_bloqueado_id?: number;        // ID de la tabla de bloqueados en caso de estar bloqueado
    turno_id?: number;                 // ID del turno asignado en caso de estar ocupado
    paciente?: string;                 // Nombre del paciente inyectado
    motivo?: string;                   // Causa de la consulta o descripción del bloqueo administrativo
  }[]
  ```

#### 18. `GET /api/turnos/slots/bulk`
* **Vistas que lo usan:** `AgendaPage.tsx` (Carga la vista mensual compacta, permitiendo contar los slots libres por día del mes completo en una sola llamada).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1581).
* **Request Shape (Query Params):** `fechas` (lista de strings separada por comas), `id_doctor` (lista de IDs de doctores separada por comas).
* **Response Shape (Success):**
  ```typescript
  {
    [dateStr: string]: {
      total: number;
      libres: number;
    }
  }
  ```

#### 19. `POST /api/turnos/slots/bloquear`
* **Vistas que lo usan:** `AgendaPage.tsx` (Bloqueo administrativo manual, también para el modo de bloqueo masivo).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1618).
* **Request Shape (Body):**
  ```typescript
  {
    fecha: string; // YYYY-MM-DD
    hora: string;  // HH:MM
    id_doctor: number;
    motivo: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    fecha: string;
    hora: string;
    id_doctor: number;
    motivo: string;
    bloqueado_por_id: number;
    creado_en: string;
  }
  ```

#### 20. `DELETE /api/turnos/slots/:id/desbloquear`
* **Vistas que lo usan:** `AgendaPage.tsx` (Desbloquear ranura de agenda de forma interactiva).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1658).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    success: true;
  }
  ```

---

### MÓDULO D: Fichas Clínicas de Pacientes y Diagnósticos

Este módulo consolida la lista global de pacientes, el estado de deuda en cuenta corriente de cada uno, el historial completo de consultas con evoluciones, diagnósticos y el archivo radiográfico/imagenológico persistido.

#### 21. `GET /api/pacientes`
* **Vistas que lo usan:** `PacientesPage.tsx` (Lista global), `PagosPage.tsx` (Registros e imputaciones).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1083).
* **Request Shape:** Ninguno.
* **Response Shape (Success):**
  ```typescript
  {
    dni: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }[]
  ```

#### 22. `GET /api/pacientes/deudores`
* **Vistas que lo usan:** `PacientesPage.tsx` (Para mostrar la alerta visual de saldo impago en la lista general), `PagosPage.tsx` (Grilla principal de cuentas deudoras en mora).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1708).
* **Request Shape (Query Params - Opcional):** `orden` (e.g. `antiguedad_desc` | `antiguedad_asc` o vacío para ordenar de forma predeterminada).
* **Response Shape (Success):**
  ```typescript
  {
    dni: string;
    nombre: string;
    apellido: string;
    saldo_deuda_ars: number;
    saldo_deuda_usd: number;
    fecha_deuda_mas_antigua: string; // ISO DateTime
    antiguedad_dias: number;
  }[]
  ```

#### 23. `GET /api/pacientes/:dni/cuenta`
* **Vistas que lo usan:** `PacientesPage.tsx` (Pestaña "Resumen/Estado de Cuenta"), `HistorialPage.tsx` (Ficha completa de Cuenta Corriente).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1785).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    dni_paciente: string;
    saldo_ars: number;
    saldo_usd: number;
    ultima_actualizacion: string;
    movimientos: {
      id: number;
      id_cuenta: number;
      tipo: 'cargo' | 'pago'; // Cargo (Deuda generada) vs Pago (Abono realizado)
      monto: number;
      moneda: 'ARS' | 'USD';
      descripcion: string;
      fecha: string;
    }[];
  }
  ```

#### 24. `GET /api/pacientes/:dni/historia-clinica`
* **Vistas que lo usan:** `PacientesPage.tsx` (Pestaña de evoluciones, observaciones generales y antecedentes clínicos del paciente).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1162).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    notas: string;
    ultima_actualizacion: string;
    dni_paciente: string;
  }
  ```

#### 25. `GET /api/pacientes/historial`
* **Vistas que lo usan:** `PacientesPage.tsx` (Pestaña "Historial de Consultas", renderiza una línea de tiempo con todos los turnos del paciente).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1279).
* **Request Shape (Query Params):** `dni` (string) del paciente.
* **Response Shape (Success):**
  ```typescript
  {
    dni_paciente: string;
    historial: {
      id: number;
      fecha_hora: string;
      duracion_minutos: number;
      motivo?: string;
      estado: 'Pendiente' | 'Realizado' | 'Cancelado';
      dni_paciente: string;
      id_doctor: number;
      doctor_nombre?: string;
      doctor_color?: string;
      pieza_dental?: number | null;
      ubicacion_lesion?: string | null;
      conformidad_paciente?: boolean | null;
      comentarios_medicos?: string | null;
      tratamientos?: {
        id: number;
        nombre: string;
        cantidad: number;
        precio_ars: number;
        precio_usd: number;
      }[];
      pagos?: {
        id: number;
        monto: number;
        fecha_pago: string;
        metodo_pago: string;
        moneda: 'ARS' | 'USD';
      }[];
    }[];
  }
  ```

#### 26. `GET /api/pacientes/:dni/resumen`
* **Vistas que lo usan:** `PacientesPage.tsx` (Muestra contadores estadísticos rápidos sobre hallazgos clínicos e imágenes cargadas).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1214).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    conteo_imagenes: number;
    conteo_hallazgos: number;
  }
  ```

#### 27. `GET /api/pacientes/:dni/imagenes`
* **Vistas que lo usan:** `PacientesPage.tsx` (Pestaña "Radiografías y Archivos").
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1234).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    url: string; // Base64 data-URL (o link absoluto a la imagen)
    carpeta: string;
    es_radiografia: boolean;
    creado_en: string;
  }[]
  ```

#### 28. `PUT /api/pacientes/:dni`
* **Vistas que lo usan:** `PacientesPage.tsx` (Formulario de actualización de datos de la ficha de paciente).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1139).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    dni: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    obra_social?: string;
    genero?: string;
    alertas?: string;
  }
  ```

#### 29. `PUT /api/pacientes/:dni/historia-clinica`
* **Vistas que lo usan:** `PacientesPage.tsx` (Guardar evolución o comentarios generales del expediente odontológico).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1184).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    notas: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    notas: string;
    ultima_actualizacion: string;
    dni_paciente: string;
  }
  ```

#### 30. `POST /api/pacientes/:dni/imagenes`
* **Vistas que lo usan:** `PacientesPage.tsx` (Subir archivos radiográficos o fotografías clínicas en formato Base64 con soporte drag-and-drop).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1248).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
    url: string; // Base64 data URL
    carpeta: string; // e.g. "Radiografías" o carpetas personalizadas
    es_radiografia: boolean;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    url: string;
    carpeta: string;
    es_radiografia: boolean;
    dni_paciente: string;
    creado_en: string;
  }
  ```

#### 31. `DELETE /api/pacientes/:dni/imagenes/:id`
* **Vistas que lo usan:** `PacientesPage.tsx` (Eliminar imagen clínica o radiografía del expediente).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1264).
* **Request Shape (URL Params):** `dni` (string) del paciente e `id` (number) del registro de imagen en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    success: true;
  }
  ```

---

### MÓDULO E: Caja, Cobros y Conciliaciones (Caja y Cobros)

Módulo encargado de llevar un registro cronológico de todas las transacciones realizadas en la clínica, y aplicar abonos a las cuentas corrientes del paciente deudor.

#### 32. `GET /api/finanzas/pagos`
* **Vistas que lo usan:** `PagosPage.tsx` (Listado histórico de transacciones en la grilla del libro diario con filtros de fecha).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1888).
* **Request Shape (Query Params):**
  * `fecha_desde` (YYYY-MM-DD)
  * `fecha_hasta` (YYYY-MM-DD + tiempo opcional)
  * `metodo_pago` (Opcional - e.g., "Efectivo", "Transferencia")
  * `moneda` (Opcional - "ARS" | "USD")
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    monto: number;
    fecha_pago: string; // ISO DateTime
    metodo_pago: string;
    moneda: 'ARS' | 'USD';
    saldo_pendiente: number;
    dni_paciente: string;
    id_turno: number | null;
    paciente_nombre?: string;  // Nombre ("Apellido, Nombre") inyectado por el backend
    constancia_turno?: string; // Descripción corta asociada ("Turno - 15/07/2026")
  }[]
  ```

#### 33. `POST /api/finanzas/pagos`
* **Vistas que lo usan:** `PagosPage.tsx` (Registrar cobro manual / Amortización de deuda desde el modal de abono).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1813).
* **Request Shape (Body):**
  ```typescript
  {
    dni_paciente: string;
    monto: number;
    metodo_pago: string;
    moneda: 'ARS' | 'USD';
    id_turno: number | null; // ID del turno a imputar el pago, o null para amortizar la deuda más antigua del paciente
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    monto: number;
    fecha_pago: string;
    metodo_pago: string;
    moneda: 'ARS' | 'USD';
    saldo_pendiente: number;
    dni_paciente: string;
    id_turno: number | null;
  }
  ```

#### 34. `GET /api/pacientes/:dni/turnos-con-deuda`
* **Vistas que lo usan:** `PagosPage.tsx` (Se ejecuta al abrir el modal de abono para un paciente moroso, listando los turnos del paciente que mantienen saldos impagos para imputarles pagos directamente).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1851).
* **Request Shape (URL Params):** `dni` (string) del paciente en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    fecha_hora: string; // ISO DateTime
    motivo: string;
    saldo_pendiente_ars: number;
    saldo_pendiente_usd: number;
  }[]
  ```

---

### MÓDULO F: Catálogo de Servicios e Instituciones Médicas (Catálogo)

Administración del Nomenclador Dental de Prestaciones de la clínica (Tratamientos) con sus costos en pesos (ARS) y dólares (USD), y convenios con Obras Sociales o Prepagas médicas.

#### 35. `POST /api/catalogo/tratamientos`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Dar de alta una nueva prestación clínica en el nomenclador). Requiere rol de administrador o secretaria autorizado.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1952).
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
    categoria: string;
    precio_ars: number;
    precio_usd: number;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    precio_ars: number;
    precio_usd: number;
    duracion_minutos: number;
    categoria: string;
    activo: boolean;
  }
  ```

#### 36. `PUT /api/catalogo/tratamientos/:id`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Actualizar tarifas o cambiar categoría de un tratamiento del catálogo).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1975).
* **Request Shape (URL Params):** `id` (number) del tratamiento en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
    categoria: string;
    precio_ars: number;
    precio_usd: number;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    precio_ars: number;
    precio_usd: number;
    duracion_minutos: number;
    categoria: string;
    activo: boolean;
  }
  ```

#### 37. `DELETE /api/catalogo/tratamientos/:id`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Eliminar tratamiento del nomenclador general). Realiza un borrado lógico estableciendo `activo = false` en la persistencia.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 1991).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    success: true;
  }
  ```

#### 38. `PATCH /api/catalogo/tratamientos/:id/activo`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Función `toggleTratamientoActive` para alternar habilitación).
* **Estado:** ⚠️ **MOCK / PENDIENTE DE CONEXIÓN** (Mapeado en el frontend, pero la ruta **NO** existe en `server.ts`. Realizar llamadas a este endpoint causa un error HTTP 404. El backend solo implementa `DELETE` para dar de baja lógica un tratamiento).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    activo: boolean;
  }
  ```
* **Response Shape (Esperado por el frontend):**
  ```typescript
  {
    id: number;
    activo: boolean;
    nombre: string;
  }
  ```

#### 39. `POST /api/catalogo/obras-sociales`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Agregar nueva Prepaga/Obra social para convenios de facturación).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 2005).
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    activo: boolean;
  }
  ```

#### 40. `DELETE /api/catalogo/obras-sociales/:id`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Baja de un convenio con Obra Social). Realiza baja lógica cambiando `activo = false`.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 2023).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Response Shape (Success):**
  ```typescript
  {
    success: true;
  }
  ```

#### 41. `PATCH /api/catalogo/obras-sociales/:id/activo`
* **Vistas que lo usan:** `CatalogoPage.tsx` (Función `handleTogglePrepagaActive`).
* **Estado:** ⚠️ **MOCK / PENDIENTE DE CONEXIÓN** (Mapeado en el frontend, pero la ruta **NO** existe en `server.ts`. Llamarlo genera un error HTTP 404).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    activo: boolean;
  }
  ```
* **Response Shape (Esperado):**
  ```typescript
  {
    id: number;
    activo: boolean;
    nombre: string;
  }
  ```

---

### MÓDULO G: Gestión de Personal Médico (Odontólogos)

Administración del padrón de odontólogos habilitados, color hexadecimal de grillas para organizar agendas y calendarios de horarios de atención específicos.

#### 42. `POST /api/doctores`
* **Vistas que lo usan:** `DoctoresPage.tsx` (Creación de nueva ficha médica profesional).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 849).
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
    matricula: string;
    color_agenda: string; // Color hex
    telefono?: string;
    email?: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    matricula: string;
    color_agenda: string;
    activo: boolean;
    telefono?: string;
    email?: string;
  }
  ```

#### 43. `PUT /api/doctores/:id`
* **Vistas que lo usan:** `DoctoresPage.tsx` (Actualizar teléfono, email corporativo o cambiar de color en la grilla visual).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 872).
* **Request Shape (URL Params):** `id` (number) del doctor en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    nombre: string;
    matricula: string;
    color_agenda: string;
    telefono?: string;
    email?: string;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    matricula: string;
    color_agenda: string;
    activo: boolean;
    telefono?: string;
    email?: string;
  }
  ```

#### 44. `PATCH /api/doctores/:id/activo`
* **Vistas que lo usan:** `DoctoresPage.tsx` (Habilitar o inhabilitar un odontólogo para quitarlo de las grillas de turnos).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 893).
* **Request Shape (URL Params):** `id` (number) del doctor en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    activo: boolean;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    nombre: string;
    activo: boolean;
  }
  ```

#### 45. `PUT /api/doctores/:id/horarios`
* **Vistas que lo usan:** `DoctoresPage.tsx` -> `DoctorHorariosConfig` (Guardar el esquema recurrente semanal de atención, por franja mañana/tarde de lunes a domingos).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 940).
* **Request Shape (URL Params):** `id` (number) del doctor en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    dias: {
      [dayOfWeek: string]: {
        mañana: [string, string] | null;
        tarde: [string, string] | null;
      } | null;
    };
    duracion_turno: number;
    horizonte_dias: number;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    dias: any;
    duracion_turno: number;
    horizonte_dias: number;
  }
  ```

#### 46. `POST /api/doctores/:id/dias-no-laborables`
* **Vistas que lo usan:** `DoctoresPage.tsx` -> `DoctorHorariosConfig` (Hacer clic en un día del calendario excepcional para bloquear todo el día como no laborable por licencia, enfermedad o feriado).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 968).
* **Request Shape (URL Params):** `id` (number) del doctor en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    fecha: string; // YYYY-MM-DD
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    success: true;
    excepciones: string[]; // Listado actualizado de días bloqueados del profesional
  }
  ```

#### 47. `DELETE /api/doctores/:id/dias-no-laborables`
* **Vistas que lo usan:** `DoctoresPage.tsx` -> `DoctorHorariosConfig` (Hacer clic sobre un día anteriormente bloqueado de forma excepcional para rehabilitarlo de nuevo).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 990).
* **Request Shape (URL Params):** `id` (number) del doctor en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    fecha: string; // YYYY-MM-DD
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    success: true;
    excepciones: string[]; // Listado de excepciones resultante
  }
  ```

---

### MÓDULO H: Gestión Administrativa de Usuarios (Usuarios)

Este módulo gestiona la creación, habilitación/inhabilitación de cuentas administrativas y reestablecimiento de claves para secretarias u odontólogos con rol administrador.

#### 48. `GET /api/admin/usuarios`
* **Vistas que lo usan:** `UsuariosPage.tsx` (Lista de cuentas registradas). Requiere rol de administrador.
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 549).
* **Request Shape:** Ninguno.
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    username: string;
    rol: 'admin' | 'secretaria';
    activo: boolean;
    creado_en: string;
  }[]
  ```

#### 49. `POST /api/admin/usuarios`
* **Vistas que lo usan:** `UsuariosPage.tsx` (Registrar cuenta nueva en el sistema).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 562).
* **Request Shape (Body):**
  ```typescript
  {
    username: string;
    password: string;
    rol: 'admin' | 'secretaria';
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    username: string;
    rol: 'admin' | 'secretaria';
    activo: boolean;
  }
  ```

#### 50. `PATCH /api/admin/usuarios/:id/activo`
* **Vistas que lo usan:** `UsuariosPage.tsx` (Inhabilitar el acceso de una secretaria o reactivar una cuenta suspendida).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 592).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    activo: boolean;
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    username: string;
    rol: 'admin' | 'secretaria';
    activo: boolean;
  }
  ```

#### 51. `PATCH /api/admin/usuarios/:id/password`
* **Vistas que lo usan:** `UsuariosPage.tsx` (Restablecer clave olvidada de un usuario desde la administración).
* **Estado:** **Conectado a backend real** (Definido en `server.ts` línea 614).
* **Request Shape (URL Params):** `id` (number) en la URL.
* **Request Shape (Body):**
  ```typescript
  {
    password: string; // Nueva contraseña en texto plano para hash en backend
  }
  ```
* **Response Shape (Success):**
  ```typescript
  {
    id: number;
    username: string;
    rol: 'admin' | 'secretaria';
    activo: boolean;
  }
  ```

---

## 2. Inconsistencias Frontend vs Backend Detectadas

Durante esta auditoría exhaustiva, se han identificado las siguientes discrepancias funcionales, errores de mapeo o divergencias entre las llamadas HTTP del frontend y las rutas del backend (`server.ts`):

### ⚠️ Inconsistencia 1: Rutas de Habilitación de Catálogo inexistentes (Error 404 en UI)
* **Descripción:** En la vista de Catálogo (`CatalogoPage.tsx`), al intentar alternar el estado de activación de un tratamiento (`toggleTratamientoActive`) o de una obra social (`handleTogglePrepagaActive`), el frontend realiza llamadas a los endpoints:
  * `PATCH /api/catalogo/tratamientos/:id/activo` con `{ activo: !currentActive }`
  * `PATCH /api/catalogo/obras-sociales/:id/activo` con `{ activo: !currentActive }`
* **Análisis de Impacto:** En el archivo `server.ts`, **ninguna** de estas rutas de tipo `PATCH` está definida. Al hacer clic en el conmutador de habilitado de la tabla de catálogo, el servidor responde con un error HTTP **404 Not Found**, haciendo que el cambio falle silenciosamente o levante un toast de error.
* **Causa Raíz:** El backend sólo implementa el borrado lógico a través de endpoints `DELETE /api/catalogo/tratamientos/:id` y `DELETE /api/catalogo/obras-sociales/:id`. No existe soporte para re-habilitar convenios o prestaciones dadas de baja en el backend actual.

### ⚠️ Inconsistencia 2: Tipificación y Casting de IDs en la Agenda de Bloqueos
* **Descripción:** En `src/types.ts` los IDs de doctor están unificados como tipo `number`. Sin embargo, en el formulario de la grilla de agenda (`AgendaPage.tsx`), el valor inicial en el modal se guarda como una cadena de texto vacía (`id_doctor: ''`).
* **Análisis de Impacto:** Aunque al enviar el formulario se realiza un casting manual con `Number(blockForm.id_doctor)`, esto evidencia una inconsistencia menor en la consistencia interna de tipado en el estado local del componente React, lo cual es propenso a advertencias de TypeScript en compilaciones estrictas si no se maneja preventivamente.

### ⚠️ Inconsistencia 3: Diferencia de Estructura en la Carga de Historial Clínico
* **Descripción:** Al consultar el historial clínico en la ficha del paciente, la vista `PacientesPage.tsx` realiza una petición a `GET /api/pacientes/historial?dni=...`. El backend retorna un objeto JSON anidado de la forma `{ dni_paciente: string, historial: Turno[] }`.
* **Análisis de Impacto:** El frontend espera un array plano pero lo soluciona extrayendo destructivamente la propiedad `historial` mediante `hist.historial || []`. Esto no causa fallas debido al workaround programado, pero representa una asimetría entre la interfaz declarada `Turno[]` y el wrapper real de transporte del endpoint.

### ⚠️ Inconsistencia 4: Alertas Médicas persisten como String Simple vs Tag List
* **Descripción:** El modelo `Paciente` en `src/types.ts` lista `alertas` como un campo de texto opcional (`alertas?: string`). En la interfaz gráfica del paciente se procesan de forma visual como etiquetas independientes usando un tratamiento de strings delimitados por comas.
* **Análisis de Impacto:** El backend no valida la estructura o las palabras claves de estas alertas, persistiendo el campo como un campo plano y simple en la base de datos `db.json`. Si bien es funcional, una tipificación rigurosa en una etapa real esperaría un array de strings (`string[]`) en lugar de delegar el split-join al cliente React.

---

## 3. Tabla Resumen General de Endpoints

La siguiente tabla consolida la totalidad de los cincuenta y un (51) endpoints mapeados en el frontend, ordenados de forma secuencial con su método, ruta, módulo que los consume y su estado actual de integración:

| # | Método | Ruta del Endpoint | Módulo Frontend | Estado de Conexión Real |
|---|--------|-------------------|-----------------|-------------------------|
| **1** | `POST` | `/api/auth/login` | Autenticación (Login) | **Conectado a backend real** |
| **2** | `POST` | `/api/auth/refresh` | Utilidades de Fetch (`src/lib/api.ts`) | **Conectado a backend real** |
| **3** | `GET` | `/api/auth/me` | Autenticación / Layout | **Conectado a backend real** |
| **4** | `GET` | `/api/finanzas/caja/hoy` | Inicio / Caja y Cobros | **Conectado a backend real** |
| **5** | `GET` | `/api/turnos/hoy` | Inicio (Dashboard) | **Conectado a backend real** |
| **6** | `GET` | `/api/doctores` | Inicio / Agenda / Caja / Odontólogos | **Conectado a backend real** |
| **7** | `GET` | `/api/catalogo/tratamientos` | Inicio / Agenda / Catálogo | **Conectado a backend real** |
| **8** | `GET` | `/api/catalogo/obras-sociales` | Inicio / Agenda / Pacientes / Catálogo | **Conectado a backend real** |
| **9** | `GET` | `/api/pacientes/:dni` | Inicio / Agenda / Pacientes / Historial | **Conectado a backend real** |
| **10** | `POST` | `/api/pacientes` | Inicio / Agenda / Pacientes | **Conectado a backend real** |
| **11** | `POST` | `/api/turnos` | Inicio / Agenda | **Conectado a backend real** |
| **12** | `PATCH` | `/api/turnos/:id/cancelar` | Inicio (Dashboard) | **Conectado a backend real** |
| **13** | `PUT` | `/api/turnos/:id/cerrar` | Inicio (Dashboard) | **Conectado a backend real** |
| **14** | `GET` | `/api/config/horarios` | Agenda Médica | **Conectado a backend real** |
| **15** | `GET` | `/api/doctores/:id/horarios` | Agenda / Odontólogos | **Conectado a backend real** |
| **16** | `GET` | `/api/doctores/:id/dias-no-laborables` | Agenda / Odontólogos | **Conectado a backend real** |
| **17** | `GET` | `/api/turnos/slots` | Agenda Médica | **Conectado a backend real** |
| **18** | `GET` | `/api/turnos/slots/bulk` | Agenda Médica | **Conectado a backend real** |
| **19** | `POST` | `/api/turnos/slots/bloquear` | Agenda Médica | **Conectado a backend real** |
| **20** | `DELETE`| `/api/turnos/slots/:id/desbloquear` | Agenda Médica | **Conectado a backend real** |
| **21** | `GET` | `/api/pacientes` | Pacientes / Caja y cobros | **Conectado a backend real** |
| **22** | `GET` | `/api/pacientes/deudores` | Pacientes / Caja y cobros | **Conectado a backend real** |
| **23** | `GET` | `/api/pacientes/:dni/cuenta` | Pacientes / Ficha Historial CC | **Conectado a backend real** |
| **24** | `GET` | `/api/pacientes/:dni/historia-clinica`| Pacientes (Evoluciones) | **Conectado a backend real** |
| **25** | `GET` | `/api/pacientes/historial` | Pacientes (Línea de Tiempo) | **Conectado a backend real** |
| **26** | `GET` | `/api/pacientes/:dni/resumen` | Pacientes (Contadores) | **Conectado a backend real** |
| **27** | `GET` | `/api/pacientes/:dni/imagenes` | Pacientes (Ficha Imágenes) | **Conectado a backend real** |
| **28** | `PUT` | `/api/pacientes/:dni` | Pacientes (Editar Ficha) | **Conectado a backend real** |
| **29** | `PUT` | `/api/pacientes/:dni/historia-clinica`| Pacientes (Ficha Evolución) | **Conectado a backend real** |
| **30** | `POST` | `/api/pacientes/:dni/imagenes` | Pacientes (Subida Drag-and-Drop) | **Conectado a backend real** |
| **31** | `DELETE`| `/api/pacientes/:dni/imagenes/:id` | Pacientes (Eliminar Imagen) | **Conectado a backend real** |
| **32** | `GET` | `/api/finanzas/pagos` | Caja y Cobros | **Conectado a backend real** |
| **33** | `POST` | `/api/finanzas/pagos` | Caja y Cobros (Abonos) | **Conectado a backend real** |
| **34** | `GET` | `/api/pacientes/:dni/turnos-con-deuda`| Caja y Cobros (Abono a Turnos) | **Conectado a backend real** |
| **35** | `POST` | `/api/catalogo/tratamientos` | Configuración de Catálogo | **Conectado a backend real** |
| **36** | `PUT` | `/api/catalogo/tratamientos/:id` | Configuración de Catálogo | **Conectado a backend real** |
| **37** | `DELETE`| `/api/catalogo/tratamientos/:id` | Configuración de Catálogo | **Conectado a backend real** |
| **38** | `PATCH` | `/api/catalogo/tratamientos/:id/activo`| Configuración de Catálogo | ⚠️ **MOCK (Falta ruta en backend)** |
| **39** | `POST` | `/api/catalogo/obras-sociales` | Configuración de Catálogo | **Conectado a backend real** |
| **40** | `DELETE`| `/api/catalogo/obras-sociales/:id` | Configuración de Catálogo | **Conectado a backend real** |
| **41** | `PATCH` | `/api/catalogo/obras-sociales/:id/activo`| Configuración de Catálogo | ⚠️ **MOCK (Falta ruta en backend)** |
| **42** | `POST` | `/api/doctores` | Odontólogos (Doctores) | **Conectado a backend real** |
| **43** | `PUT` | `/api/doctores/:id` | Odontólogos (Doctores) | **Conectado a backend real** |
| **44** | `PATCH` | `/api/doctores/:id/activo` | Odontólogos (Doctores) | **Conectado a backend real** |
| **45** | `PUT` | `/api/doctores/:id/horarios` | Odontólogos (Doctores) | **Conectado a backend real** |
| **46** | `POST` | `/api/doctores/:id/dias-no-laborables`| Odontólogos (Doctores) | **Conectado a backend real** |
| **47** | `DELETE`| `/api/doctores/:id/dias-no-laborables`| Odontólogos (Doctores) | **Conectado a backend real** |
| **48** | `GET` | `/api/admin/usuarios` | Gestión de Usuarios | **Conectado a backend real** |
| **49** | `POST` | `/api/admin/usuarios` | Gestión de Usuarios | **Conectado a backend real** |
| **50** | `PATCH` | `/api/admin/usuarios/:id/activo` | Gestión de Usuarios | **Conectado a backend real** |
| **51** | `PATCH` | `/api/admin/usuarios/:id/password` | Gestión de Usuarios | **Conectado a backend real** |
