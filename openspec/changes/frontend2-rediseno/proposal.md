# C-13: Rediseño Frontend2 — Nueva UI desde cero

## Problema

El frontend actual (`frontend/`) tiene deuda técnica acumulada:
- Páginas monolíticas (AgendaPage 1173 líneas, PerfilPacientePage 2159 líneas)
- Glassmorphism no alineado con la identidad visual odontológica definida
- Validación de horarios hardcodeada y desincronizada del backend
- Tipos desactualizados (espera `monto_ars`/`monto_usd` en vez de `monto`+`moneda`)
- Notas clínicas guardadas en localStorage sin endpoint backend
- Diseño no responsive sistemático

Además, la clínica necesita una UI con identidad visual propia (paleta "Afluente" Comex 3C)
y componentes que aprovechen los nuevos contratos de backend corregidos en C-12
(slots con estados, constancia_turno, bloqueo manual, config/horarios centralizada).

## Solución

Construir `frontend2/` como una implementación nueva desde cero, en paralelo a `frontend/`
(que sigue funcionando y no se toca), usando:

- **Stack**: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4.x + shadcn/ui
- **Diseño**: tokens de `docs/DISENO_CONSOLIDADO_FRONTEND2.md` (paleta Afluente turquesa `#1D9E75`)
- **Contratos**: endpoints reales del backend post C-12 (sin bugs heredados de frontend/)
- **Arquitectura**: 9 vistas definidas en `docs/BLUEPRINT_FRONTEND2.md`

## Capabilities

- `setup-frontend2`: scaffold Vite + Tailwind + shadcn/ui con tokens DISENO
- `primitivos-reskinned`: componentes shadcn reskinneados con paleta Afluente
- `layout-base`: sidebar colapsable + header + auth guard + responsive
- `componentes-compartidos`: TarjetaKPI, SlotHorario, SelectorColorHex, ConstanciaPagoBadge, etc.
- `login-dashboard`: /login y panel de control con KPIs y turnos del día
- `agenda`: vista semanal/mensual con slots, bloqueo, múltiples doctores, responsive
- `pagos-pacientes`: libro de cobros, deudores, ficha de paciente 2-columnas
- `admin-catalogo`: gestión de usuarios, doctores (nueva vista), catálogo de tratamientos
- `historial`: ficha clínica con historial de tratamientos y pagos

## Impacto

### Archivos nuevos (todo en `frontend2/`)
- `frontend2/` — proyecto Vite completo (~80-100 archivos estimados)
  - `src/components/ui/` — primitivos shadcn reskinned
  - `src/components/layout/` — AppLayout, Sidebar, Header, PrivateRoute
  - `src/components/shared/` — TarjetaKPI, SlotHorario, SelectorColorHex, etc.
  - `src/components/views/` — componentes específicos por vista
  - `src/pages/` — 9 páginas (Login, Dashboard, Agenda, Pagos, Pacientes, Historial, AdminUsuarios, AdminDoctores, Catalogo)
  - `src/services/` — api.ts + interceptors.ts + endpoints/
  - `src/hooks/` — use-auth, use-pacientes, use-turnos, use-finanzas
  - `src/context/` — AuthContext, ToastContext
  - `src/types/` — tipos tipados contra contratos reales del backend
  - `src/styles/` — tokens.css con variables CSS de DISENO

### Archivos modificados
- `CHANGES.md` — nuevo change C-13
- `AGENTS.md` — Sección 4 actualizada

### Archivos NO tocados
- `frontend/` — intacto
- `backend/` — intacto
- `docs/DISENO_CONSOLIDADO_FRONTEND2.md` — fuente de verdad, no se modifica
- `docs/BLUEPRINT_FRONTEND2.md` — fuente de verdad, no se modifica

## Depende de
- C-12 (`correccion-horarios-doctores-pagos`) — contratos de API corregidos
- C-06 (`auth-y-autorizacion`) — JWT + roles
- C-07 (`catalogo-tratamientos`) — catálogo y obras sociales
- C-01 a C-05 — modelos y endpoints base

Todas las dependencias están completadas.

## Desbloquea
- Ningún change posterior. C-13 es independiente de C-08/C-09/C-10/C-11.
  frontend2/ convive con frontend/ y no bloquea el desarrollo del portal ni notificaciones.

## Riesgos
- **Sin migración de datos**: frontend2/ parte de cero. No hay migración de preferencias
  de UI ni datos del frontend/ viejo (solo localStorage de sidebar, que es trivial).
- **Convivencia frontend/ y frontend2/**: ambos usan el mismo backend. Si se modifica
  la API en changes futuros, ambos frontends necesitarían actualización o uno queda roto.
- **Testing**: frontend2/ usa MSW para tests (no DB real porque es frontend puro).
  Esto es aceptable según AGENTS.md Sección 6 porque aplica a frontend puro.

## Plan de implementación (6 fases)

| Fase | Contenido | Prioridad |
|------|-----------|-----------|
| Fase 0 | Setup: Vite + Tailwind + shadcn/ui + estructura carpetas | ALTO |
| Fase 1 | Primitivos reskinned + tipos + API client + auth context | ALTO |
| Fase 2 | Layout base + componentes compartidos (TarjetaKPI, SlotHorario, etc.) | ALTO |
| Fase 3 | Login + Dashboard | ALTO |
| Fase 4 | Agenda (semanal/mensual) + componentes C-12 | ALTO |
| Fase 5 | Pagos + Pacientes + Ficha clínica | MEDIO |
| Fase 6 | Admin Usuarios + Admin Doctores + Catálogo | MEDIO |
