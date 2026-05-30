# 09 — Decisiones y Supuestos

## Decisiones de diseño

### D-01: Guest Checkout en vez de login para pacientes
**Decisión**: paciente sin cuenta. Accede con DNI + UUID. **Alternativa**: login DNI+contraseña. **Razón**: barrera cero, seguro (UUID v4), shadow profiles automáticos. Secretaria mantiene control final.

### D-02: Precios del catálogo editables al cerrar turno
**Decisión**: modal precarga precio del catálogo pero permite modificarlo. **Alternativa**: precios bloqueados. **Razón**: flexibilidad para descuentos, recargos, casos especiales.

### D-03: Obra social como texto libre, no FK
**Decisión**: Paciente.obra_social = String. Selector usa catálogo como fuente. **Razón**: si se borra obra social, pacientes no se rompen.

### D-04: UUID en vez de ID numérico para acceso público
**Decisión**: UUID v4 (2^122 combinaciones). **Alternativa**: ID + hash corto. **Razón**: imposible de enumerar, estándar, portable.

### D-05: JWT propio en vez de Supabase Auth
**Decisión**: python-jose + passlib. **Razón**: solo 2 roles internos, sin vendor lock-in, pacientes sin cuenta.

### D-06: Supabase solo como hosting de PostgreSQL
**Decisión**: Supabase free tier (500MB) como opción de DB en deploy. **Razón**: alternativa gratuita. No se usa Auth, RLS, Storage ni Edge Functions.

### D-07: Mock de notificaciones antes de API real
**Decisión**: email y WhatsApp mock (loguean en consola). Real en deploy. **Razón**: testear flujo sin APIs externas pagas.

### D-08: Soft-delete en catálogos y doctores
**Decisión**: activo=False en vez de DELETE físico. **Razón**: turnos históricos referencian entidades.

### D-09: Monorepo sin tooling
**Decisión**: /backend y /frontend independientes, sin Nx/Turborepo. **Razón**: separación estricta Python vs Node.

### D-10: Unificación de changes en formato kebab-case
**Decisión**: migrar de IDs CHANGE-XXX a nombres descriptivos (ej: `auth-y-autorizacion`). **Razón**: más legible, alineado con OpenSpec SDD. Cada change = una feature full-stack completa.

## Supuestos

### S-01: Dos doctores fijos
Darío y Fabiana. Sistema soporta CRUD pero no se espera rotación frecuente.

### S-02: Una sola sucursal
Sin multi-tenancy. Si se expande, requiere tenant_id en todas las tablas.

### S-03: Sin facturación electrónica
No se integra con AFIP. Los pagos son registros internos.

### S-04: WhatsApp como canal prioritario en Argentina
Mayoría de pacientes usan WhatsApp. Email es secundario y opcional.

### S-05: Sin pasarela de pago
Pagos manuales (efectivo/transferencia). Sin Mercado Pago API.

### S-06: DNI como identificador único
Argentina, DNI obligatorio. Sin pacientes sin documento.

### S-07: Múltiples secretarias simultáneas
Sistema soporta N secretarias conectadas. Sincronización con polling (refetch 15s). First-write-wins en conflictos. Auditoría por creado_por_id en Turno.
