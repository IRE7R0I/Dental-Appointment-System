# 09 — Decisiones y Supuestos

## Decisiones de diseño

### D-01: Guest Checkout en vez de login para pacientes
**Decisión**: El paciente no tiene cuenta. Accede al portal con DNI y recibe un UUID único.

**Alternativa considerada**: Login con DNI + contraseña para pacientes.

**Razón**:
- Barrera de entrada cero: personas mayores, sin email, sin ganas de crear cuenta.
- Seguridad: UUID v4 es más seguro que contraseñas débiles de usuarios no técnicos.
- Shadow profiles: el sistema crea el paciente automáticamente si no existe.
- La secretaria mantiene el control final (aprobación de turnos).

**Tradeoff**: el paciente no puede ver su historial completo sin login.
Esto se mitiga con el link UUID que permite ver y cancelar su turno específico.

### D-02: Precios del catálogo editables al cerrar turno
**Decisión**: El modal de cierre de turno precarga el precio del catálogo pero permite modificarlo.

**Alternativa considerada**: Precios bloqueados del catálogo.

**Razón**:
- Flexibilidad para descuentos, recargos, casos especiales.
- La realidad del consultorio: no todos los pacientes pagan el precio de lista.
- "Servicio Manual" sigue disponible para tratamientos fuera de catálogo.

### D-03: Obra social como texto libre, no FK
**Decisión**: `Paciente.obra_social` es String. El selector usa el catálogo `ObraSocial` como fuente pero guarda texto.

**Alternativa considerada**: FK a `obras_sociales.id`.

**Razón**:
- Si una obra social se elimina del catálogo, los pacientes existentes no se rompen.
- Flexibilidad: se puede escribir "Particular" o una obra social nueva sin que esté en catálogo.
- Las obras sociales cambian con el tiempo, los datos históricos no deben perderse.

### D-04: UUID en vez de ID numérico para acceso público
**Decisión**: UUID v4 como identificador público del turno.

**Alternativa considerada**: ID autoincremental + hash corto.

**Razón**:
- UUID v4 tiene 2^122 combinaciones → imposible de enumerar.
- Sin riesgo de que un paciente adivine el ID de otro turno.
- Estándar, portable, sin dependencia de secuencia de DB.

### D-05: JWT propio en vez de Supabase Auth
**Decisión**: Implementar JWT con `python-jose` + `passlib[bcrypt]`. No usar Supabase Auth.

**Alternativa considerada**: Supabase Auth (con social login, magic link, etc.).

**Razón**:
- Solo 2 roles (admin + secretaria). Supabase Auth es overkill.
- Sin vendor lock-in.
- Más simple de mantener y testear.
- Los pacientes no tienen cuenta → el 90% del valor de Supabase Auth no se usa.

### D-06: Supabase solo como hosting de PostgreSQL
**Decisión**: Considerar Supabase free tier (500MB) como opción de hosting de DB en CHANGE-010.

**Razón**:
- Alternativa gratuita a Railway PostgreSQL.
- No se usa RLS, Auth, Storage ni Edge Functions.
- Solo se usa el PostgreSQL managed.

### D-07: Mock de notificaciones antes de API real
**Decisión**: Los servicios de email y WhatsApp comienzan como mock (loguean en consola).
La integración real se activa en CHANGE-010.

**Razón**:
- Permite testear el flujo completo sin depender de APIs externas.
- Las APIs de WhatsApp (Twilio/Meta) requieren verificación de negocio y tienen costo.
- El mock permite desarrollar y testear CHANGE-007 sin esperar CHANGE-006 real.

### D-08: Soft-delete en catálogos
**Decisión**: `DELETE` cambia `activo=False` en vez de borrar físicamente.

**Razón**:
- Los turnos históricos pueden referenciar tratamientos eliminados.
- Auditoría: mantener trazabilidad de qué tratamientos existieron.
- Las obras sociales pueden reaparecer (reactivar es más fácil que recrear).

### D-09: Monorepo sin monorepo tooling
**Decisión**: `/backend` y `/frontend` como proyectos independientes en el mismo repo, sin Nx/Turborepo.

**Razón**:
- Separación estricta de dependencias (Python vs Node).
- Sin complejidad extra de tooling.
- Cada proyecto tiene su propio `requirements.txt` / `package.json`.

## Supuestos

### S-01: Los doctores son fijos
Se asume que la clínica siempre tendrá 2 doctores (Darío y Fabiana). El sistema
soporta CRUD de doctores, pero no se espera rotación frecuente.

### S-02: Una sola sucursal
No se modela multi-sucursal. Si en el futuro se abre otra clínica, requeriría
un rediseño significativo (tenant_id en todas las tablas).

### S-03: Sin facturación electrónica
No se integra con AFIP ni se emiten facturas electrónicas. Los pagos se registran
internamente. Si se requiere facturación, es un módulo nuevo.

### S-04: WhatsApp como canal prioritario en Argentina
Se asume que la mayoría de los pacientes usan WhatsApp. Email es secundario y
opcional. La integración con WhatsApp Business API se posterga a producción.

### S-05: Sin pasarela de pago
Los pagos se registran manualmente (efectivo o transferencia). No se integra
Mercado Pago API ni ninguna pasarela. El campo "Transferencia" es solo un
registro, no una integración.

### S-06: DNI como identificador único de paciente
En Argentina el DNI es único y obligatorio. Se asume que no hay dos pacientes
con el mismo DNI. El sistema no soporta pacientes sin DNI (ej: extranjeros sin
documento argentino).

### S-07: Múltiples secretarias pueden operar en simultáneo
El sistema soporta múltiples usuarias con rol "secretaria" conectadas al mismo tiempo.
La sincronización se maneja con polling (refetch cada 10-15s) y "first write wins"
en caso de conflicto de edición concurrente. Cada acción sobre un Turno registra
`creado_por_id` para auditoría.
