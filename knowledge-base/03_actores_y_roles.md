# 03 — Actores y Roles

## Admin
**Descripción**: dueño/administrador. Acceso total.
**Permisos**:
- CRUD de usuarios (secretarias): crear, editar, listar, activar/desactivar, eliminar.
- Editar su propio username/contraseña (requiere contraseña actual).
- No puede eliminarse ni desactivarse a sí mismo.
- CRUD de doctores con soft-delete.
- Catálogo completo de tratamientos y obras sociales.
- Reportes financieros globales (CHANGE-008).
- Todo lo de secretaria.
**Auth**: JWT (login con usuario + contraseña).

## Secretaria
**Descripción**: usuaria principal. Controla el día a día.
Puede haber múltiples conectadas en simultáneo.
**Permisos**:
- Agenda: crear/mover/cancelar/bloquear turnos, panel de aprobación.
- Pacientes: crear, editar, buscar por DNI.
- Finanzas: cobrar, ver caja diaria, registrar pagos, ver deudores.
- Catálogo completo: CRUD de tratamientos y obras sociales.
**Auth**: JWT (login con usuario + contraseña).

## Paciente
**Descripción**: cliente. SIN cuenta ni contraseña.
**Permisos**:
- Ver tratamientos, doctores y horarios (portal público).
- Solicitar turno con DNI (guest checkout).
- Consultar/cancelar turno por UUID.
- No accede al panel interno.
**Auth**: ninguna. UUID v4 como token público.

## Tabla RBAC

| Recurso | Admin | Secretaria | Paciente | Público |
|---------|-------|------------|----------|---------|
| `/auth/*` | ✅ | ✅ | ❌ | ✅ (login/refresh) |
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/pacientes/*` | ✅ | ✅ | ❌ | ❌ |
| `/pacientes/verificar/{dni}` | — | — | — | ✅ |
| `/turnos/*` | ✅ | ✅ | ❌ | ❌ |
| `/finanzas/*` | ✅ | ✅ | ❌ | ❌ |
| `/doctores/*` | ✅ | ✅ | ❌ | ❌ |
| `/catalogo/*` GET | — | — | — | ✅ |
| `/catalogo/*` CUD | ✅ | ✅ | ❌ | ❌ |
| `/portal/*` | — | — | — | ✅ (rate limited) |
| `/consulta/:uuid` | — | — | — | ✅ |
| `/health` | — | — | — | ✅ |
| Frontend `/login` | ✅ | ✅ | ❌ | ✅ (página) |
| Frontend `/*` interno | ✅ | ✅ | ❌ | ❌ |
| Frontend `/admin/usuarios` | ✅ | ❌ | ❌ | ❌ |
| Frontend `/portal` | — | — | — | ✅ |
| Frontend `/consulta/:uuid` | — | — | — | ✅ |

## Reglas de seguridad clave
1. Contraseñas: bcrypt, nunca texto plano.
2. JWT: access 30 min, refresh 7 días.
3. Admin self-edit: requiere current_password.
4. Admin override: no necesita current_password al editar secretarias.
5. Paciente: UUID v4 (2^122 combinaciones, no enumerable).
6. Endpoints públicos: rate limited 5-10 req/min.
7. GET /pacientes/verificar/{dni}: solo nombre, apellido, teléfono, obra_social. Sin email.
