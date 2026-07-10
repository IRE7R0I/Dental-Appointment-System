# CHANGES — Secuencia de Implementación

> Índice canónico de todos los changes del proyecto **OdontoGest**.
> Actualizar los estados `[ ]` → `[x]` a medida que cada change se archiva con `/opsx:archive`.

---

## Cómo usar este documento

1. **Leer KB**: empezar por `knowledge-base/README.md`. Los archivos `08_arquitectura_propuesta.md` y `11_roadmap_y_plan_de_sprints.md` dan el contexto técnico completo.
2. **Proponer**: ejecutar `/opsx:propose <nombre-del-change>` para crear la carpeta OpenSpec con `proposal.md`, `design.md` y `tasks.md`.
3. **Aplicar**: ejecutar `/opsx:apply <nombre-del-change>` para implementar las tareas.
4. **Archivar**: ejecutar `/opsx:archive <nombre-del-change>` al terminar. Actualiza specs y cierra el change.
5. **Actualizar estado**: marcar `[x]` en la tabla de este documento.

---

## Árbol de dependencias

```
C-01 foundation-setup ──┬── C-02 pacientes-turnos ── C-03 finanzas ── C-04 cuentas ── C-05 historial ──┐
                         │
                         └── C-06 auth ──┬── C-07 catalogo ── C-12 correccion ──┬── C-08 portal ── C-09 notificaciones
                                         │                                       │
                                         ├── C-15 imagenes ──────────────────────┤
                                         ├── C-14 historia-clinica ──────────────┤── C-13 frontend2-rediseno (PARALELO)
                                         │                                       │
                                         └── C-10 reportes ──────────────────────┤
                                                                                 │
                         todos ────────────────────────────────────────────────── C-11 polish-y-deploy
```

### Paralelismo por fase

```
FASE 0 ───── C-01 (bloqueante para todo)
                │
FASE 1 ───── C-02 → C-03 (secuencial, mismo dominio)
                │
FASE 2 ───── C-04 → C-05 (secuencial, mismo dominio)
                │
FASE 3 ───── C-06 → C-07 (C-06 es CRITICO, C-07 depende de C-06)
                │
                ├── C-12 → C-08 → C-09 (secuencial, correccion desbloquea portal)
                │
                 ├── C-14 (PARALELO con C-08/C-13 — depende de C-07 y C-12)
                 ├── C-15 (PARALELO con C-08/C-13/C-14 — depende de C-02 y C-06)
                 │
                 └── C-10 (PARALELO con C-08/C-09 — solo depende de C-06)
                            │
FASE 5 ───── C-11 (bloqueado por C-08, C-09, C-10)
```

**Gates de paralelismo**:
- **GATE-1**: C-06 (`auth-y-autorizacion`) desbloquea C-07, C-10.
- **GATE-2**: C-07 (`catalogo-tratamientos`) desbloquea C-12.
- **GATE-2b**: C-12 (`correccion-horarios-doctores-pagos`) desbloquea C-08.
- **GATE-2c**: C-12 desbloquea C-14 (`historia-clinica`).
- **GATE-2d**: C-06 desbloquea C-15 (`imagenes-radiografias-paciente`).
- **GATE-3**: C-08 (`portal-autogestion`) desbloquea C-09, C-11.

### Camino crítico

```
C-01 → C-02 → C-03 → C-04 → C-05 → C-06 → C-07 → C-12 → C-08 → C-09 → C-11
  ✅      ✅      ✅      ✅      ✅      ✅      ✅      ✅      🔲      🔲      🔲
```
**9 changes en cadena lineal mínima irreducible para sistema funcionando en producción.**

### Plan óptimo con 3 agentes

| Paso | Agente 1 (Core) | Agente 2 (Finanzas/Auth) | Agente 3 (Catálogo/Portal) |
|------|-----------------|-------------------------|---------------------------|
| 1 | C-01 foundation-setup | — | — |
| 2 | C-02 pacientes-turnos | — | — |
| 3 | C-03 finanzas | — | — |
| 4 | C-04 cuentas | C-06 auth (inicia) | — |
| 5 | C-05 historial | C-06 auth (completa) | C-07 catalogo |
| 6 | C-12 correccion-horarios | — | — |
| 7 | — | C-10 reportes (paralelo) | C-08 portal |
| 8 | — | — | C-09 notificaciones |
| 9 | C-11 polish-y-deploy (todos convergen) | | |

---

## FASE 0 — Cimientos

### [C-01] `foundation-setup` ✅

- **Estado**: [x] completado
- **Scope**:
  - Scaffolding del proyecto: `/backend` (FastAPI), `/frontend` (React+TS+Vite).
  - Modelos ORM base: Paciente, Doctor, Turno, Pago, HistoriaClinica.
  - `database.py` con `get_db()`, conexión PostgreSQL.
  - `main.py` con CORS y routers registrados.
  - `requirements.txt` con dependencias iniciales.
  - Frontend: App.tsx, main.tsx, Tailwind config, React Router v6.
  - `types/index.ts` con tipos base (Turno, Paciente, Moneda, etc.).
  - Seed data: doctores iniciales (Darío, Fabiana).
- **Historias**: HU-005, HU-006
- **Reglas de negocio**: —
- **Dependencias**: ninguna
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/01_vision_y_objetivos.md`
  - `knowledge-base/08_arquitectura_propuesta.md`

---

## FASE 1 — Core del Dominio

### [C-02] `gestion-pacientes-y-turnos` ✅

- **Estado**: [x] completado
- **Scope**:
  - CRUD de pacientes con búsqueda por DNI. Schemas: PacienteCreate, PacienteResponse, PacienteUpdate.
  - CRUD de turnos: asignación por doctor, vista por fecha, validación de duplicados (mismo doctor + misma hora).
  - Cancelación de turnos (PATCH /turnos/{id}/cancelar).
  - Frontend: `AgendaPage.tsx` con doctores y filtros, `PerfilPacientePage.tsx` con búsqueda y edición.
  - Componentes: `Modal.tsx`, `TurnoCard.tsx`, `MultiCurrencyInput.tsx`.
- **Historias**: HU-001
- **Reglas de negocio**: RN-01 (horarios), RN-02 (estados), RN-03 (prevención duplicados)
- **Dependencias**: C-01 (necesita modelos ORM y estructura base)
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md`
  - `knowledge-base/05_reglas_de_negocio.md` (RN-01 a RN-03)

### [C-03] `finanzas-y-caja-diaria` ✅

- **Estado**: [x] completado
- **Scope**:
  - Modelo `Pago`: monto, moneda (ARS/USD), método (efectivo/transferencia), FK a Turno y Paciente.
  - Endpoint `POST /finanzas/pagos` — registrar pago.
  - Endpoint `PUT /turnos/{id}/cerrar` — cerrar turno con tratamientos + pagos, calcular deuda.
  - Endpoint `GET /finanzas/caja/hoy` — resumen diario (turnos realizados/pendientes, ingresos ARS/USD).
  - Dashboard KPI en tiempo real.
  - Frontend: `DashboardPage.tsx`, `PagosPage.tsx`, `KPICard.tsx`.
- **Historias**: HU-002, HU-003
- **Reglas de negocio**: RN-04 (monedas), RN-05 (pagos), RN-11 (cierre de turno)
- **Dependencias**: C-02 (necesita modelo Turno y Paciente para cobrar)
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` (RN-04, RN-05, RN-11)
  - `knowledge-base/07_flujos_principales.md` (Flujo 2)

---

## FASE 2 — Finanzas y Auditoría

### [C-04] `cuentas-corrientes-y-deudores` ✅

- **Estado**: [x] completado
- **Scope**:
  - Modelo `CuentaCorriente`: saldo_ars, saldo_usd, FK única a Paciente.
  - Modelo `MovimientoCuenta`: tipo (cargo/pago), monto, moneda, descripción, FK a CuentaCorriente.
  - Endpoint `GET /pacientes/deudores` — pacientes con saldo > 0.
  - Endpoint `GET /pacientes/{dni}/cuenta` — detalle de movimientos.
  - Actualización automática de saldo al registrar pagos o cerrar turnos.
  - Frontend: sección de deuda en `PerfilPacientePage.tsx`, tabla deudores en `PagosPage.tsx`.
- **Historias**: HU-004
- **Reglas de negocio**: —
- **Dependencias**: C-03 (necesita modelo Pago para movimientos)
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` (CuentaCorriente, MovimientoCuenta)

### [C-05] `historial-y-mejoras-frontend` ✅

- **Estado**: [x] completado
- **Scope**:
  - Endpoint `GET /pacientes/historial?dni=X&fecha_desde=&fecha_hasta=` — turnos con tratamientos y pagos.
  - Endpoint `GET /finanzas/pagos` con filtros avanzados (fecha, método, paciente, doctor, deudores).
  - Página `HistorialPacientePage.tsx` en `/pacientes/:dni/historial` con layout dos columnas.
  - Rediseño del Resumen de Cuenta en `PerfilPacientePage.tsx`.
  - Corrección de navegación: botón retroceso con query param `?dni=X`.
  - Schemas ampliados: `HistorialPacienteResponse`, `PagoContextoResponse`.
- **Historias**: HU-004 (ampliada)
- **Reglas de negocio**: —
- **Dependencias**: C-04 (necesita endpoints de cuenta y deudores)
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` (Flujo 2)

---

## FASE 3 — Seguridad y Catálogo

### [C-06] `auth-y-autorizacion` ✅

- **Estado**: [x] completado
- **Scope**:
  - Modelo `Usuario`: username, hashed_password (bcrypt), rol (admin/secretaria), activo.
  - `core/config.py`: Settings desde .env (SECRET_KEY, ALGORITHM, expiración).
  - `core/security.py`: JWT (python-jose) + bcrypt (passlib) — create_access_token, create_refresh_token, verify_token, hash_password, verify_password.
  - `dependencies.py`: get_current_user (valida JWT + activo), require_role(["admin","secretaria"]) (factory).
  - `routers/auth.py`: POST /login, /refresh, /logout, GET /me.
  - `routers/admin.py`: CRUD usuarios (POST, GET, PUT edit, PUT toggle-activo, DELETE).
  - Protección de todos los routers existentes con `Depends(require_role)`.
  - CRUD completo de doctores: `PUT /doctores/{id}`, `DELETE /doctores/{id}` (soft-delete con campo `activo`).
  - Rate limiting: slowapi en endpoints públicos.
  - Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
  - Seed: admin inicial desde .env (ADMIN_USERNAME, ADMIN_PASSWORD).
  - Frontend: `LoginPage.tsx` (con show/hide password), `AuthContext.tsx`, `PrivateRoute.tsx`, `AdminPage.tsx` (tabla CRUD con modales crear/editar/eliminar, show/hide, current_password solo para self-edit), `interceptors.ts` (Bearer + refresh 401), `NavigationRail.tsx` (link Admin + logout con confirmación).
- **Historias**: HU-007
- **Reglas de negocio**: RN-10 (rate limiting), RN-12 (seguridad de datos)
- **Dependencias**: C-01 (necesita estructura base y modelos)
- **Governance**: **CRITICO**
- **Leer antes**:
  - `knowledge-base/03_actores_y_roles.md`
  - `knowledge-base/08_arquitectura_propuesta.md` (sección Seguridad)
  - `knowledge-base/09_decisiones_y_supuestos.md` (D-05)

### [C-07] `catalogo-tratamientos` ✅

- **Estado**: [x] completado
- **Scope**:
  - Modelo `TratamientoCatalogo`: nombre, precio_ars, precio_usd, duracion_minutos, categoria, activo.
  - Modelo `ObraSocial`: nombre, activo.
  - CRUD endpoints bajo `/catalogo/`: GET públicos, POST/PUT/DELETE para admin+secretaria. Soft-delete.
  - Seed: 7 obras sociales (Particular, OSDE, Swiss Medical, Galeno, Medicus, Sancor Salud, OMINT).
  - Frontend: `CatalogoPage.tsx` — tabla CRUD con filtros por categoría y modales.
  - Integración en modal de cierre de turno (`AgendaPage.tsx`): selector del catálogo con chips (precarga precio editable) o "Servicio Manual" con texto libre.
  - NavigationRail: +link Catálogo.
- **Historias**: HU-001 (ampliada)
- **Reglas de negocio**: RN-04 (precios ARS/USD), RN-07 (obra social como texto libre)
- **Dependencias**: C-06 (endpoints de escritura requieren auth + roles)
- **Governance**: MEDIO
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` (TratamientoCatalogo, ObraSocial)
  - `knowledge-base/09_decisiones_y_supuestos.md` (D-02, D-03, D-08)

> **Prerequisito para**: C-12 (`correccion-horarios-doctores-pagos`), C-08 (`portal-autogestion`)

---

## FASE 3.5 — Correcciones de Backend

### [C-12] `correccion-horarios-doctores-pagos` 🔲

- **Estado**: [x] completado
- **Scope**:
  - `core/horarios.py`: reglas reales de clínica centralizadas.
    - Lunes a sábado: 9:00 a 13:00 (cierre exclusivo).
    - Lunes, martes, miércoles y viernes: además 16:00 a 20:00 (cierre exclusivo).
    - Jueves y domingo: cerrado.
    - Sábado: solo mañana, sin turno tarde.
    - Cierre exclusivo validado contra `inicio + duracion_minutos <= hora_cierre`.
  - Granularidad 30 min obligatoria: solo :00 y :30. Validar en creación y en generación de slots.
  - `duracion_minutos` en `TurnoCreate` (opcional, default 30). No se deriva de catálogo al crear.
  - Timezone: toda validación horaria usa `America/Argentina/Buenos_Aires` vía `zoneinfo` (stdlib).
    - Helper `dt_local()` en `core/horarios.py` para convertir a AR_TZ.
  - Endpoint `GET /turnos/slots?fecha=&id_doctor=` — devuelve slots con estado: `"libre"`, `"ocupado"`, `"bloqueado"`.
  - Endpoint `GET /config/horarios` — expone reglas de horario como fuente única para frontend2.
  - Tabla `slots_bloqueados` en models.py:
    - Columnas: `id`, `fecha` (date), `hora` (time), `id_doctor` (FK), `motivo` (opcional), `bloqueado_por_id` (FK usuarios), `creado_en` (datetime).
    - `UniqueConstraint('fecha', 'hora', 'id_doctor')`.
  - Endpoints para bloques manuales: `POST /turnos/slots/bloquear`, `DELETE /turnos/slots/{id}/desbloquear`.
    - Solo admin y secretaria. Mismo rol que agenda de turnos.
  - Doctores: restringir POST/PUT/DELETE a solo admin. Secretaria solo GET (lectura).
  - Validación de formato hex en `color_agenda` (regex `^#[0-9A-Fa-f]{6}$`) en schemas de doctores.
  - Pagos: campo `constancia_turno: Optional[str]` en `PagoResponse` y `PagoContextoResponse`.
    - Formato: `"DD/MM - Apellido (HH:MM)"` (ej. `"03/07 - Pérez (16:00)"`).
    - `null` cuando pago no está ligado a un turno (pago general sin id_turno).
  - Pydantic v2 modernization: `model_config = ConfigDict(from_attributes=True)` en schemas tocados.
  - KB: actualizar `05_reglas_de_negocio.md` (RN-01 corregida, +RN slots bloqueados).
  - KB: actualizar `10_preguntas_abiertas.md` (I-01 resuelto, +input documentado para C-08/C-09).
- **Historias**: HU-001 (ampliada, horarios reales)
- **Reglas de negocio**: RN-01 (corregida), RN-02 (slots bloqueados)
- **Dependencias**: C-02 (turnos), C-06 (auth/roles), C-07 (catálogo duración_minutos). Todas completadas.
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` (RN-01 actual)
  - `knowledge-base/03_actores_y_roles.md`
  - `docs/AUDITORIA_BACKEND.md` (hallazgos 5.1, 6.1)

### [C-13] `frontend2-rediseno` 🔲

- **Estado**: [ ] pendiente
- **Scope**:
  - Nuevo proyecto `frontend2/` en paralelo a `frontend/` (sin tocar).
  - Stack: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4.x + shadcn/ui.
  - Diseño: tokens de `docs/DISENO_CONSOLIDADO_FRONTEND2.md` (paleta Afluente turquesa `#1D9E75`).
  - 9 vistas según `docs/BLUEPRINT_FRONTEND2.md`:
    - `/login` — autenticación JWT
    - `/` — panel de control con KPIs y turnos del día
    - `/agenda` — vista semanal/mensual con slots por doctor
    - `/pagos` — libro de cobros, deudores, registro de pagos
    - `/pacientes` — directorio y ficha de paciente
    - `/pacientes/:dni/historial` — historial clínico y tratamientos
    - `/admin/usuarios` — gestión de cuentas (solo admin)
    - `/admin/doctores` — catálogo de profesionales (VISTA NUEVA, solo admin)
    - `/catalogo` — tratamientos y obras sociales
  - Componentes compartidos: `TarjetaKPI`, `SlotHorario`, `SelectorColorHex`, `ConstanciaPagoBadge`, `BuscadorPaciente`, `SelectorProfesional`.
  - Componentes C-12: `SlotHorario` (3 estados: libre/ocupado/bloqueado), `SelectorColorHex` (validación `#RRGGBB`), `ConstanciaPagoBadge` (`"DD/MM - Apellido (HH:MM)"`).
  - Reskin completo de primitivos shadcn/ui con tokens DISENO (nunca defaults grises de fábrica).
  - Sistema de toasts: Sonner con colores semánticos DISENO.
  - Responsive desde el primer componente: sidebar overlay mobile, KPIs 4→2→1, agenda doctores apilados mobile, tablas scroll horizontal.
  - Motion: micro-interacciones ≤300ms, `prefers-reduced-motion`, nada decorativo.
  - Testing: unitarios (utils) + componentes (React Testing Library) + integración (MSW).
  - Cliente HTTP: axios con interceptors JWT + refresh (mismo patrón que `frontend/`).
  - Tipos alineados a contratos reales del backend post C-12: `monto`+`moneda` (no `monto_ars`/`monto_usd`), `tipo: 'cargo'|'pago'` (no `'debito'|'credito'`), `color_agenda` (no `color`).
- **Historias**: HU-001 (ampliada, nueva UI completa)
- **Reglas de negocio**: RN-01 (horarios desde GET /config/horarios, sin hardcodear), RN-02 (estados de turno), RN-04 (monedas)
- **Dependencias**: C-12 (contratos de API corregidos: slots, horarios, constancia_turno, doctores admin-only, color_agenda hex). También hereda dependencias de C-06 (auth) y C-07 (catálogo).
- **Governance**: ALTO
- **Leer antes**:
  - `docs/DISENO_CONSOLIDADO_FRONTEND2.md` (fuente de verdad visual, 98 líneas)
  - `docs/BLUEPRINT_FRONTEND2.md` (fuente de verdad funcional, 259 líneas)
  - `docs/AUDITORIA_BACKEND.md` (contratos reales de API)
  - `docs/Cambios_Respecto_Anterior_Auditoria.md` (estado post C-12)
  - `knowledge-base/08_arquitectura_propuesta.md`

### [C-14] `historia-clinica` ✅

- **Estado**: [x] completado (2026-07-10)
- **Scope**:
  - **Alertas médicas**: tabla `alertas_medicas` (tipo: alergia/condicion, descripcion). CRUD vía `GET/POST/DELETE /pacientes/{dni}/alertas`. Badges en ficha frontend2.
  - **Evoluciones clínicas**: tabla `evoluciones_clinicas` (fecha, id_turno nullable, pieza_dental int FDI 11-48 nullable, ubicacion_lesion string comma-separated O/D/G/L/M/I/V/P nullable, observaciones Text, conformidad_paciente bool). Endpoints: `POST` crear, `GET` listar, `PUT` corregir (con auditoría `actualizado_por_id` + `actualizado_en`). Reemplaza `localStorage` del hallazgo 6.2 de `AUDITORIA_BACKEND.md`.
  - **Endpoint de resumen**: `GET /pacientes/{dni}/resumen` — devuelve conteos: evoluciones, hallazgos=null, imagenes=null.
  - Nuevo router `historia_clinica.py` bajo prefijo `/pacientes/{dni}/...`, protegido `admin`/`secretaria`.
  - Schemas Pydantic v2 con `model_config = ConfigDict(from_attributes=True)`.
  - Tests de integración con base de datos real (`test_historia_clinica.py`).
  - KB: `05_reglas_de_negocio.md` (RN-15, RN-16, RN-18).
- **Historias**: HU-001 (ampliada, ficha clínica completa)
- **Reglas de negocio**: RN-15 (alertas médicas — solo admin/secretaria), RN-16 (evoluciones — turno debe estar "Asistió", fecha manual si sin turno, corrección con auditoría), RN-18 (no exponer datos clínicos en logs)
- **Dependencias**: C-02 (turnos), C-06 (auth/roles), C-12 (estado "Asistió"). Todas completadas.
- **Governance**: ALTO
- **Paralelismo**: puede ejecutarse en paralelo con C-13 (`frontend2-rediseno`) y C-08 (`portal-autogestion`). Sin dependencias mutuas.
- **Nota**: El alcance original "Plan de Tratamiento" se eliminó de C-14 por decisión de producto (Jul 2026). No hay UI planificada en frontend2.
- **Leer antes**:
   - `docs/AUDITORIA_BACKEND.md` (hallazgo 6.2)
   - `docs/BLUEPRINT_FRONTEND2.md` (secciones 2.5 y 2.6)
   - `knowledge-base/04_modelo_de_datos.md`
   - `knowledge-base/05_reglas_de_negocio.md`

### [C-15] `imagenes-radiografias-paciente` ✅

- **Estado**: [x] completado (2026-07-10)
- **Scope**:
  - Modelos: `CarpetaPaciente` (dni FK, nombre, creado_por_id, creado_en), `Imagen` (id_carpeta FK, nombre_original, tipo_mime, tamano_bytes, es_radiografia bool, creado_por_id, creado_en), `ImagenContenido` (id_imagen FK PK, contenido LargeBinary).
  - Abstracción de almacenamiento: clase ABC `AlmacenamientoArchivos` con `guardar(id, bytes, es_radiografia) → int`, `obtener(id) → bytes`, `eliminar(id)`. Implementación concreta `AlmacenamientoPostgres` contra `imagenes_contenido`. Factory intercambiable para migrar a Supabase Storage.
  - Compresión con Pillow en `guardar()`: toda imagen se normaliza a WebP. Si `es_radiografia=true` → lossless (fallback quality=95 si lossless >15MB). Si `es_radiografia=false` → quality=80 + resize lado mayor a 2000px manteniendo proporción. `tipo_mime` siempre `"image/webp"`. Error claro si conversión falla (archivo corrupto).
  - Límite 10 MB sobre archivo original recibido (antes de comprimir). Sin segundo límite post-compresión.
  - CRUD carpetas: `POST /pacientes/{dni}/carpetas`, `GET /pacientes/{dni}/carpetas`, `PUT .../carpetas/{id}`, `DELETE .../carpetas/{id}` (CASCADE: elimina imágenes + binarios).
  - CRUD imágenes: `POST .../carpetas/{id}/imagenes` (multipart/form-data + campo `es_radiografia`), `GET .../carpetas/{id}/imagenes` (solo metadatos), `GET /imagenes/{id}/contenido` (binario WebP), `DELETE /imagenes/{id}`.
  - Actualización `GET /pacientes/{dni}/resumen`: campo `imagenes` pasa de `None` a conteo real.
  - Seguridad: solo admin/secretaria. Validación MIME original (`image/jpeg`, `image/png`, `image/webp`). No exponer nombres de archivo ni contenido en logs.
  - Schemas Pydantic v2 con `from_attributes=True`.
  - Tests integración DB real (`test_imagenes.py`): subida radiografía lossless, subida normal comprimida + resize, archivo corrupto, archivo >10MB, eliminación cascada carpeta.
  - KB: nueva RN-19 (gestión de imágenes y radiografías).
- **Historias**: HU-001 (ampliada)
- **Reglas de negocio**: RN-19 (formatos permitidos, compresión WebP según es_radiografia, límite 10MB original, cascada al eliminar carpeta, no exponer en logs)
- **Dependencias**: C-02 (pacientes), C-06 (auth). Ambas ✅.
- **Governance**: MEDIO
- **Paralelismo**: paralelo con C-13, C-14, C-08, C-10.
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md`
  - `knowledge-base/05_reglas_de_negocio.md`
  - `knowledge-base/03_actores_y_roles.md`

---

## FASE 4 — Autogestión y Notificaciones

### [C-08] `portal-autogestion` 🔲

- **Estado**: [ ] pendiente
- **Scope**:
  - Modelo `Turno`: +uuid (UUID v4), +motivo_rechazo (Text), +id_tratamiento (FK a TratamientoCatalogo), +obra_social (String).
  - Endpoints públicos (sin auth, rate limited):
    - `GET /pacientes/verificar/{dni}` — verifica si DNI existe, devuelve nombre/apellido/teléfono/obra_social.
    - `GET /portal/disponibilidad?doctor_id=&fecha=` — slots 30 min en franjas (lun-vie mañana+tarde, sáb solo mañana, sin jueves/domingo).
    - `POST /portal/reservar` — crea turno "solicitado" + UUID, shadow profile si DNI nuevo.
    - `GET /portal/turno/{uuid}` — consulta pública de estado.
    - `PUT /portal/turno/{uuid}/cancelar` — cancelación pública (solo si solicitado o pendiente).
  - Endpoints internos (auth: admin+secretaria):
    - `GET /turnos/solicitados` — solicitudes pendientes.
    - `PUT /turnos/{id}/confirmar` — aceptar → estado "pendiente", dispara notificación.
    - `PUT /turnos/{id}/rechazar` — rechazar con motivo → estado "rechazado", dispara notificación.
    - `POST /turnos/bloquear` / `DELETE /turnos/{id}/desbloquear` — bloquear/liberar slots.
  - Migración de estados del turno: de 3 valores simplificados ("Pendiente"/"Asistió"/"Canceló") a 7 estados.
  - Dashboard: `ResumenCajaResponse` ampliado con separación de ingresos por origen (Particulares vs Obras Sociales).
  - Polling sync multi-secretaria: setInterval 15s refetch en AgendaPage + DashboardPage.
  - Frontend: `portal/PortalPage.tsx` (stepper 4 pasos), `portal/Step1Servicio.tsx`, `portal/Step2Profesional.tsx`, `portal/Step3Agenda.tsx` (tarjetas rectangulares), `portal/Step4Identificacion.tsx` (DNI + shadow profile), `portal/ConfirmacionTurno.tsx`, `ConsultaTurnoPage.tsx` (/consulta/:uuid), `AgendaPage.tsx` (+panel solicitudes + bloqueo slots).
- **Historias**: HU-008, HU-008b
- **Reglas de negocio**: RN-01 (horarios por día incluyendo sábado), RN-02 (estados ampliados), RN-06 (shadow profiles), RN-08 (UUID público), RN-13 (clasificación ingresos)
- **Dependencias**: C-07 (paso 1 muestra catálogo, paso 4 usa obras sociales), C-12 (slots bloqueados y reglas de horario reales para disponibilidad)
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` (RN-01, RN-02, RN-06, RN-08, RN-13)
  - `knowledge-base/07_flujos_principales.md` (Flujos 5 y 6)
  - `knowledge-base/09_decisiones_y_supuestos.md` (D-01, D-04)

### [C-09] `notificaciones` 🔲

- **Estado**: [ ] pendiente
- **Scope**:
  - `services/notificaciones.py` — orquestador: decide canal (email/WhatsApp) según datos del paciente.
  - `services/email_service.py` — envío de emails (mock: loguea en consola; real: SMTP SendGrid en deploy).
  - `services/whatsapp_service.py` — envío de WhatsApp (mock; real: Twilio/WhatsApp Cloud API en deploy).
  - `services/plantillas.py` — templates de mensajes (turno confirmado, rechazado con motivo, recordatorios).
  - `services/scheduler.py` — APScheduler cada 10 min: busca turnos pendientes a 48h y 2h, envía recordatorio.
  - `routers/webhook.py` — `POST /webhook/whatsapp`: recibe mensajes del bot, keyword matching ("turno" → link, "secretaria" → deriva, "llamar" → teléfono), fallback con opciones.
  - Triggers en `routers/turnos.py`: notificar al confirmar/rechazar turno.
  - Modelo `Turno`: +notificado_48h (Boolean), +notificado_2h (Boolean) — evita duplicados del scheduler.
  - `core/config.py`: +vars SMTP + WhatsApp + PORTAL_URL + CLINICA_TELEFONO.
  - `requirements.txt`: +apscheduler, +httpx.
- **Historias**: HU-009
- **Reglas de negocio**: RN-09 (prioridad canales: email → WhatsApp → pantalla)
- **Dependencias**: C-08 (triggers en confirmar/rechazar, bot envía link al portal)
- **Governance**: ALTO
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` (Flujo 8)
  - `knowledge-base/09_decisiones_y_supuestos.md` (D-07)

### [C-10] `reportes-excel` 🔲

- **Estado**: [ ] pendiente
- **Scope**:
  - `services/reportes.py` — generación de .xlsx con openpyxl:
    - Historia clínica: datos paciente + turnos + tratamientos + pagos (filtrable por fecha).
    - Listado de deudores: saldo ARS/USD por paciente.
    - Resumen de ingresos: filtrable por mes/semana/rango, desglose por moneda y método.
  - `routers/reportes.py` — endpoints protegidos (solo admin+secretaria):
    - `GET /reportes/historia/{dni}` → descarga .xlsx.
    - `GET /reportes/deudores` → descarga .xlsx.
    - `GET /reportes/ingresos` → descarga .xlsx.
  - Frontend: botones de exportación en `HistorialPacientePage.tsx`, `DashboardPage.tsx`, `PagosPage.tsx`.
  - `requirements.txt`: +openpyxl.
- **Historias**: HU-010
- **Reglas de negocio**: —
- **Dependencias**: C-06 (endpoints protegidos por rol). Datos a exportar ya existen (pacientes, turnos, finanzas completados). **Paralelizable con C-08 y C-09.**
- **Governance**: BAJO
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md`

---

## FASE 5 — Deploy

### [C-11] `polish-y-deploy` 🔲

- **Estado**: [ ] pendiente
- **Scope**:
  - `Dockerfile` — imagen Python slim para backend.
  - `docker-compose.yml` — desarrollo local con PostgreSQL.
  - `alembic/` — migraciones de esquema (init + revisiones).
  - `.env.example` — template de variables de entorno sin valores reales.
  - `backend/core/config.py` — ampliar con todas las vars de producción.
  - `routers/health.py` — evaluar separar de main.py.
  - HTTPS: Let's Encrypt con HSTS (max-age=31536000).
  - CORS restrictivo: solo dominio del frontend.
  - Dominio propio: comprar/ configurar.
  - Backups automáticos diarios de PostgreSQL.
  - CI/CD: GitHub Actions (opcional).
  - Hosting: Railway/Render (backend), Vercel (frontend), Railway PostgreSQL / Supabase free tier (DB).
  - Integración real de APIs: WhatsApp (Twilio/Cloud API) + email (SendGrid/SMTP) — reemplazar mocks de C-09.
  - Tests automatizados: pytest para endpoints críticos (auth, portal, finanzas).
- **Historias**: — (transversal)
- **Reglas de negocio**: —
- **Dependencias**: C-08 (portal completo), C-09 (notificaciones completas), C-10 (reportes completos). No exponer a internet sin auth. Portal, notificaciones y reportes deben funcionar.
- **Governance**: **CRITICO**
- **Leer antes**:
  - `knowledge-base/02_descripcion_general.md`
  - `knowledge-base/08_arquitectura_propuesta.md` (sección Despliegue)
  - `knowledge-base/10_preguntas_abiertas.md` (Q-01, Q-05, Q-08, Q-09, Q-11)

---

## Resumen

| Fase | Changes | Estados | Governance |
|------|---------|---------|------------|
| FASE 0 | C-01 | ✅ | MEDIO |
| FASE 1 | C-02, C-03 | ✅ ✅ | MEDIO, ALTO |
| FASE 2 | C-04, C-05 | ✅ ✅ | MEDIO, BAJO |
| FASE 3 | C-06, C-07 | ✅ ✅ | CRITICO, MEDIO |
| FASE 3.5 | C-12, C-13, C-14, C-15 | ✅ 🔲 ✅ 🔲 | ALTO, ALTO, ALTO, MEDIO |
| FASE 4 | C-08, C-09, C-10 | 🔲 🔲 🔲 | ALTO, ALTO, BAJO |
| FASE 5 | C-11 | 🔲 | CRITICO |

- **15 changes en 6 fases**
- **9 completados** (C-01 a C-07, C-12, C-14)
- **6 pendientes** (C-13, C-08 a C-11, C-15)
- **Camino crítico**: 9 changes (C-01 → C-06 → C-07 → C-12 → C-08 → C-09 → C-11)
- **Paralelismo**: C-10, C-13 y C-14 pueden ejecutarse en paralelo con C-08 y C-09
- **Primer change pendiente**: C-13 (`frontend2-rediseno`)

Para arrancar: `/opsx:propose frontend2-rediseno`
