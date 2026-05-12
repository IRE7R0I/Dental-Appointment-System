# 03 — Actores y Roles

## Actores del sistema

### Admin
- **Descripción**: dueño/administrador del consultorio. Acceso total al sistema.
- **Permisos**:
  - Gestión de usuarios: crear/desactivar cuentas de secretaria.
  - Gestión de configuración: altas/bajas de doctores, tratamientos, precios base, obras sociales.
  - Acceso a reportes financieros globales.
  - Todo lo que puede hacer la secretaria.
- **Autenticación**: JWT (login con usuario + contraseña).

### Secretaria
- **Descripción**: usuaria principal del día a día. Controla agenda, pacientes, finanzas.
  Puede haber múltiples secretarias conectadas en simultáneo. Todas ven la misma
  información. Las acciones se auditan por `creado_por_id` en Turno.
- **Permisos**:
  - Gestión operativa total de agenda: crear, mover, cancelar, bloquear turnos.
  - Gestión de pacientes: crear, editar, buscar por DNI.
  - Finanzas: cobrar turnos, ver caja diaria, registrar pagos.
  - Catálogo: crear y editar tratamientos y precios.
  - Panel de aprobación: aceptar/rechazar turnos solicitados por pacientes.
  - Cuentas corrientes: ver deudores, movimientos por paciente.
- **Autenticación**: JWT (login con usuario + contraseña).

### Paciente
- **Descripción**: cliente del consultorio. Sin cuenta ni contraseña.
- **Permisos**:
  - Solo lectura y creación limitada: ver tratamientos, doctores y horarios disponibles.
  - Solicitar turno via guest checkout con DNI (portal público).
  - Consultar estado de su turno por UUID (página pública /consulta/:uuid).
  - Cancelar su turno por UUID (solo si estado es "solicitado" o "pendiente").
  - No accede al panel interno ni a datos de otros pacientes.
- **Autenticación**: **ninguna**. El UUID del turno funciona como token de acceso público.
  La verificación de identidad se hace por DNI + shadow profile.

## Tabla RBAC

| Recurso | Admin | Secretaria | Paciente | Público |
|---------|-------|------------|----------|---------|
| `/auth/*` | ✅ | ✅ | ❌ | ✅ (solo login/refresh) |
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/pacientes/*` | ✅ | ✅ | ❌ | ❌ |
| `/pacientes/verificar/{dni}` | — | — | — | ✅ (rate limited) |
| `/turnos/*` | ✅ | ✅ | ❌ | ❌ |
| `/finanzas/*` | ✅ | ✅ | ❌ | ❌ |
| `/doctores/*` | ✅ | ✅ | ❌ | ❌ |
| `/catalogo/*` GET | — | — | — | ✅ |
| `/catalogo/*` POST/PUT/DEL | ✅ | ✅ (solo tratamientos) | ❌ | ❌ |
| `/portal/*` | — | — | — | ✅ (rate limited) |
| `/consulta/:uuid` | — | — | — | ✅ |
| `/health` | — | — | — | ✅ |
| `/webhook/whatsapp` | — | — | — | ✅ |
| `/reportes/*` | ✅ | ✅ | ❌ | ❌ |
| Frontend `/login` | ✅ | ✅ | ❌ | ✅ (la página) |
| Frontend `/*` interno | ✅ | ✅ | ❌ | ❌ |
| Frontend `/portal` | — | — | — | ✅ |
| Frontend `/consulta/:uuid` | — | — | — | ✅ |

## Reglas de seguridad

1. **Contraseñas**: hasheadas con bcrypt (passlib). Nunca en texto plano.
2. **JWT**: access token 30 min, refresh token 7 días. Rotación automática.
3. **Paciente sin cuenta**: acceso a turnos solo por UUID v4 (2^122 combinaciones → no enumerable).
4. **Endpoints públicos**: protegidos con rate limiting (slowapi). 5-10 req/min por IP.
5. **Datos clínicos**: nunca expuestos en logs ni mensajes de error.
6. **GET /pacientes/verificar/{dni}**: solo devuelve nombre, apellido, teléfono, obra_social.
   Sin email ni historial clínico.
7. **Rutas públicas del frontend**: `/portal`, `/consulta/:uuid`. El resto requiere PrivateRoute.
