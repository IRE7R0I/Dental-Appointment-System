# 01 — Visión y Objetivos

## Propósito

OdontoGest es una plataforma de gestión clínica para centralizar la administración de pacientes, turnos y finanzas en un consultorio odontológico. El objetivo principal es descargar la carga administrativa de la secretaria, permitiendo control del flujo de caja y la agenda médica en tiempo real.

## Contexto de negocio

- Consultorio odontológico argentino.
- Dos doctores (Darío y Fabiana). Secretaria como usuaria principal (no técnica).
- Monedas: ARS y USD. Métodos de pago: efectivo / transferencia. Sin tarjetas.
- Flujo central: Turno → Atención → Cobro → Cuenta Corriente.
- Maneja historias clínicas → Ley 25.326 (Habeas Data, Argentina).
- Horarios: mañana 09:00-12:30, tarde 16:00-19:30. Sábado solo mañana. Sin jueves ni domingo.

## Objetivos (OBJ)

| ID | Objetivo | Actor | Estado |
|----|----------|-------|--------|
| OBJ-01 | Gestionar pacientes (buscar por DNI, crear, editar) | Secretaria | ✅ |
| OBJ-02 | Administrar agenda de turnos por doctor con validación de duplicados | Secretaria | ✅ |
| OBJ-03 | Cerrar turnos con cobro multimoneda (ARS/USD) | Secretaria | ✅ |
| OBJ-04 | Visualizar caja diaria con KPIs en dashboard | Secretaria | ✅ |
| OBJ-05 | Controlar cuentas corrientes y listar deudores | Secretaria | ✅ |
| OBJ-06 | Ver historial clínico completo del paciente | Secretaria | ✅ |
| OBJ-07 | Autenticar usuarios internos con JWT y roles | Admin | ✅ |
| OBJ-08 | Gestionar usuarios (crear, editar, desactivar, eliminar secretarias) | Admin | ✅ |
| OBJ-09 | CRUD completo de doctores con soft-delete | Admin | ✅ |
| OBJ-10 | Catálogo de tratamientos odontológicos con precios ARS/USD | Admin/Secretaria | ✅ |
| OBJ-11 | Catálogo de obras sociales | Admin/Secretaria | ✅ |
| OBJ-12 | Portal de autogestión del paciente (guest checkout con DNI + UUID) | Paciente | 🔲 |
| OBJ-13 | Panel de aprobación de turnos solicitados | Secretaria | 🔲 |
| OBJ-14 | Notificaciones automáticas (email + WhatsApp + bot) | Sistema | 🔲 |
| OBJ-15 | Exportar reportes a Excel | Admin/Secretaria | 🔲 |
| OBJ-16 | Deploy a producción con HTTPS y backups | Dev | 🔲 |

## Alcance actual (v2.x)

### Completado
- Backend FastAPI con routers, schemas, crud, core separados por dominio.
- Frontend React + TypeScript + Vite + Tailwind (9 páginas, 6 componentes).
- 10 modelos ORM con PostgreSQL.
- Autenticación JWT + roles (admin/secretaria) + panel de administración.
- Catálogo de tratamientos y obras sociales con integración en modal de turno.
- CRUD completo de doctores con soft-delete.
- Rate limiting + security headers.

### Pendiente
- Portal de autogestión (guest checkout con DNI + UUID).
- Notificaciones (email + WhatsApp + bot).
- Reportes Excel.
- Deploy a producción.

## Fuera de alcance
- Procesamiento de tarjetas de crédito.
- App móvil nativa (portal es responsive).
- Integración con AFIP (facturación electrónica).
- Multi-sucursal.
