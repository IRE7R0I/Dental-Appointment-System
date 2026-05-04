# OdontoGest — Registro de Cambios (CHANGES)

Flujo de estados:
```
PROPUESTO → EN REVISIÓN → APROBADO → EN DESARROLLO → COMPLETADO
```

---

## Mapa de Dependencias

```
CHANGE-001  Refactor Backend
   ├── CHANGE-003  Módulo Finanzas / Caja
   │     └── CHANGE-004  Cuentas Corrientes / Deudores
   ├── CHANGE-005  Rest API Complementos
   └── CHANGE-002  Migración Frontend React+TS
         ├── usa CHANGE-003 (endpoints finanzas)
         └── usa CHANGE-004 (endpoints deudores)
```

> Orden de ejecución: 001 → 005 → 003 → 004 → 002

---

## Cambios Activos

### [CHANGE-001] Refactor del Backend — Buenas Prácticas FastAPI
- **Estado:** COMPLETADO
- **Prioridad:** ALTA (bloqueante para todo lo demás)
- **HU relacionada:** HU-005
- **Descripción:**
  El backend actual tiene todas las rutas en `main.py` y el código de acceso
  a datos mezclado. Se refactoriza aplicando:
    - Separar rutas con `APIRouter` por dominio (pacientes, turnos, finanzas)
    - Verificar que `database.py` expone `get_db()` con `Depends`
    - Revisar `models.py`: relaciones explícitas, FKs, índices
    - Revisar `schemas.py`: separar Create / Response / Update
    - Habilitar CORS middleware para consumo desde React
    - Validar status codes HTTP (201 POST, 404 not found, etc.)
    - Manejo de errores con `HTTPException`
    - Mover todo `app/` a `/backend/` (estructura objetivo)
- **Archivos afectados:**
    - `app/main.py` → `backend/main.py` (entrypoint limpio con routers)
    - `app/crud.py` → `backend/crud/` (separado por entidad)
    - `app/models.py` → `backend/models.py` (revisar relaciones)
    - `app/schemas.py` → `backend/schemas/` (separado por entidad)
    - `app/database.py` → `backend/database.py` (idem)
    - `backend/routers/` (NUEVO: pacientes.py, turnos.py, finanzas.py)
    - `backend/__init__.py`
- **Carpeta OpenSpec:** `openspec/changes/refactor-backend-buenas-practicas/`

---

### [CHANGE-002] Migración del Frontend a React + TypeScript
- **Estado:** PROPUESTO
- **Prioridad:** ALTA (requiere CHANGE-001 + CHANGE-003 + CHANGE-004 APROBADOS)
- **HU relacionada:** HU-006
- **Descripción:**
  Migrar las 4 vistas actuales (HTML/CSS/JS vanilla) a un proyecto React + TS
  independiente en `/frontend`, consumiendo la API REST del backend refactorizado.

  Vistas a migrar:
    - `agenda.html + agenda.js`         →  `pages/AgendaPage.tsx`
    - `dashboard.html + dashboard.js`   →  `pages/DashboardPage.tsx`
    - `pagos.html + pagos.js`           →  `pages/PagosPage.tsx`
    - `perfil-paciente.html + .js`      →  `pages/PerfilPacientePage.tsx`

  El agente DEBE leer la skill de frontend-design antes de generar cualquier
  componente.

  Estructura objetivo:
  ```
  /frontend/src
    /pages       → AgendaPage, DashboardPage, PagosPage, PerfilPacientePage
    /components  → Modal, KPICard, TurnoRow, MultiCurrencyInput
    /services    → api.ts (Axios centralizado)
    /types       → index.ts (Turno, Paciente, Moneda, etc.)
    /hooks       → useDashboard, useAgenda, usePagos
  ```
- **Archivos afectados:**
    - Nuevo proyecto: `/frontend/` (crear desde cero con Vite + React + TS)
    - `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tailwind.config.ts`
    - `frontend/vite.config.ts`
    - `frontend/src/` (todos los componentes, páginas, servicios, tipos)
    - Archivos HTML/JS actuales en `app/static/` quedan como referencia
- **Carpeta OpenSpec:** `openspec/changes/migracion-frontend-react-ts/`
- **Depende de:**
    - CHANGE-001 (backend refactorizado: routers, schemas, CORS)
    - CHANGE-003 (endpoints de finanzas/caja para DashboardPage)
    - CHANGE-004 (endpoints deudores para PerfilPacientePage)

---

### [CHANGE-003] Módulo Finanzas y Caja Diaria
- **Estado:** COMPLETADO
- **Prioridad:** ALTA (requiere CHANGE-001 APROBADO)
- **HU relacionada:** HU-002 (cierre de turno y cobro), HU-003 (control de caja diaria)
- **Descripción:**
  Implementar el modelo de caja diaria y cobro de turnos. Agregar moneda (ARS/USD)
  a los pagos, endpoints para cerrar turno con cobro, resumen de caja del día
  y registro automático en cuenta corriente del paciente.

  Puntos clave:
    - Agregar campo `moneda` (ARS/USD) a modelo Pago
    - Agregar campo `saldo_pendiente` opcional a Pago (para deuda parcial)
    - Modelo `TurnoTratamiento` para tratamientos escritos por secretaria por turno
    - Endpoint `PUT /turnos/{id}/cerrar` → registra N tratamientos + N pagos + calcula deuda
    - Endpoint `GET /finanzas/caja/hoy` → turnos realizados, pendientes, ingresos ARS/USD
    - Schema `TratamientoInput` (nombre, cantidad, precio_ars, precio_usd)
    - Schema `PagoInput` (monto, moneda, metodo_pago)
    - Schema `CerrarTurnoResponse` con totales y deudas calculadas
    - Schema `ResumenCajaResponse` para el dashboard
    - Al cerrar turno, si hay deuda → registro automático en cuenta corriente
- **Archivos afectados:**
    - `backend/models.py` (moneda + saldo_pendiente en Pago, + TurnoTratamiento)
    - `backend/schemas/finanzas.py` (PagoCreate, PagoResponse, TratamientoInput, PagoInput, CerrarTurnoInput, CerrarTurnoResponse, ResumenCajaResponse)
    - `backend/crud/finanzas.py` (cerrar_turno_con_pago con lógica multimoneda, resumen_caja_hoy)
    - `backend/routers/finanzas.py` (endpoints /pagos, /caja/hoy)
    - `backend/routers/turnos.py` (endpoint cerrar turno con nuevo schema)
- **Carpeta OpenSpec:** `openspec/changes/modulo-finanzas-caja/`
- **Depende de:**
    - CHANGE-001 (estructura de routers y schemas base)

---

### [CHANGE-004] Cuentas Corrientes y Gestión de Deudores
- **Estado:** COMPLETADO
- **Prioridad:** ALTA (requiere CHANGE-003 APROBADO)
- **HU relacionada:** HU-004 (gestión de cuentas corrientes y deudores)
- **Descripción:**
  Implementar el modelo de cuenta corriente por paciente y endpoints para
  listar/filtrar deudores. Cada pago no saldado genera un registro de deuda
  asociado al paciente, acumulando saldo ARS/USD.

  Puntos clave:
    - Crear modelo `CuentaCorriente` con saldos ARS/USD y relación con Paciente
    - Crear modelo `MovimientoCuenta` para auditoría (fecha, tipo, monto, moneda)
    - Endpoint `GET /pacientes/deudores` → lista pacientes con saldo > 0 (con saldos reales)
    - Endpoint `GET /pacientes/{dni}/cuenta` → detalle de movimientos
    - Al cerrar turno (CHANGE-003), si hay deuda se crea automáticamente "cargo" en cuenta
    - Si el paciente paga más del total, el exceso se registra como "pago" (abono a cuenta)
    - Schema `DeudorResponse` con saldos ARS/USD
- **Archivos afectados:**
    - `backend/models.py` (NUEVO: CuentaCorriente, MovimientoCuenta)
    - `backend/schemas/pacientes.py` (NUEVO: DeudorResponse, MovimientoResponse)
    - `backend/crud/finanzas.py` (agregar funciones de cuenta corriente)
    - `backend/routers/pacientes.py` (agregar endpoints deudores y cuenta)
    - `backend/crud/pacientes.py` (NUEVO o extraído de crud actual)
- **Carpeta OpenSpec:** `openspec/changes/cuentas-corrientes-deudores/`
- **Depende de:**
    - CHANGE-003 (registro de pagos con moneda, base para cuenta corriente)

---

### [CHANGE-005] Rest API Complementos
- **Estado:** COMPLETADO
- **Prioridad:** MEDIA (puede ejecutarse en paralelo con CHANGE-003)
- **HU relacionada:** HU-001 (asignación de turnos), HU-005 (refactor)
- **Descripción:**
  Completar endpoints faltantes que el frontend React necesita pero que no
  están en el backend actual ni cubiertos por changes anteriores.

  Endpoints a agregar:
    - `GET /turnos?fecha=YYYY-MM-DD&id_doctor=X` → filtrar turnos por fecha/doctor
    - `PUT /pacientes/{dni}` → actualizar datos del paciente
    - `GET /turnos/hoy` → turnos del día actual (para dashboard)
    - `GET /doctores/{id}` → obtener doctor individual
    - Mejorar `GET /turnos/` actual (hoy devuelve solo por DNI)

  También incluye:
    - Indexación en `fecha_hora` de Turno para performance
    - Validación de duplicados mejorada (mismo paciente + misma hora)
- **Archivos afectados:**
    - `backend/routers/turnos.py` (nuevos endpoints con filtros)
    - `backend/routers/pacientes.py` (endpoint PUT)
    - `backend/routers/doctores.py` (NUEVO: CRUD de doctores)
    - `backend/crud/turnos.py` (nuevas funciones de filtrado)
    - `backend/crud/pacientes.py` (función actualizar)
    - `backend/crud/doctores.py` (NUEVO)
    - `backend/schemas/doctores.py` (NUEVO)
- **Carpeta OpenSpec:** `openspec/changes/rest-api-complementos/`
- **Depende de:**
    - CHANGE-001 (estructura de routers y schemas base)

---

### [CHANGE-006] Notificaciones Automáticas (WhatsApp / Email)
- **Estado:** PROPUESTO (FUTURO)
- **Prioridad:** MEDIA
- **HU relacionada:** — (feature futuro)
- **Descripción:**
  Implementar envío de notificaciones automáticas al paciente cuando se
  crea/modifica/cancela un turno. Soporte para WhatsApp (Twilio) y Email.

  Puntos clave:
    - Servicio de notificaciones desacoplado (backend/services/notificaciones.py)
    - Integración con Twilio para WhatsApp (ya en requirements.txt)
    - Plantillas de mensaje configurables
    - Cola de notificaciones (evitar bloqueo en requests HTTP)
- **Archivos proyectados:**
    - `backend/services/notificaciones.py` (NUEVO)
    - `backend/services/plantillas.py` (NUEVO)
    - `backend/core/config.py` (config de Twilio)
- **Carpeta OpenSpec:** `openspec/changes/feature-notificaciones/`

---

### [CHANGE-007] Portal de Autogestión del Paciente
- **Estado:** PROPUESTO (FUTURO)
- **Prioridad:** BAJA
- **HU relacionada:** — (feature futuro)
- **Descripción:**
  Portal web independiente donde los pacientes pueden ver su historial de
  turnos, agendar/cancelar citas y consultar su cuenta corriente.
- **Archivos proyectados:**
    - `frontend/pages/portal/` (múltiples componentes)
    - `backend/routers/auth.py` (autenticación pacientes)
- **Carpeta OpenSpec:** `openspec/changes/portal-autogestion-paciente/`

---

### [CHANGE-008] Reportes Exportables (PDF / Excel)
- **Estado:** PROPUESTO (FUTURO)
- **Prioridad:** BAJA
- **HU relacionada:** — (feature futuro)
- **Descripción:**
  Generación de reportes en PDF y Excel: cierre de caja diario, listado de
  deudores, historia de pagos por paciente, turnos por período.
- **Archivos proyectados:**
    - `backend/services/reportes.py` (NUEVO)
    - Dependencias: openpyxl (Excel), reportlab (PDF)
- **Carpeta OpenSpec:** `openspec/changes/reportes-exportables/`

---

## Cambios Completados

### [INIT-001] Scaffold inicial de documentación
- **Estado:** COMPLETADO
- **Descripción:** Creación de la estructura base de documentación:
  Descripcion.txt, Historias_de_usuario.txt, Integrador.txt, CHANGES.md
  y specs OpenSpec de los módulos turnos, pacientes, finanzas y dashboard.
- **Módulos afectados:** documentación general, todos los specs

---

## Guía rápida para el agente

Para proponer un nuevo cambio:
```
/openspec:proposal <descripción del cambio>
```

El agente debe:
1. Leer los specs relevantes en `openspec/specs/`
2. Crear `openspec/changes/<nombre-del-cambio>/`
3. Generar `proposal.md`, `design.md`, `tasks.md`
4. Actualizar este archivo con el nuevo cambio en estado PROPUESTO

⚠ Orden recomendado de ejecución:
   CHANGE-001 → CHANGE-005 → CHANGE-003 → CHANGE-004 → CHANGE-002