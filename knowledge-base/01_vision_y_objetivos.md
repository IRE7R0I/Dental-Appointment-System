# 01 — Visión y Objetivos

## Propósito

OdontoGest es una plataforma de gestión clínica para centralizar la
administración de pacientes, turnos y finanzas en un consultorio odontológico.
El objetivo principal es **descargar la carga administrativa de la secretaria**,
permitiendo control del flujo de caja y la agenda médica en tiempo real.

## Contexto de negocio

- Consultorio odontológico argentino.
- Dos doctores (Darío y Fabiana). Secretaria como usuaria principal (no técnica).
- Monedas: ARS (Pesos Argentinos) y USD (Dólares).
- Métodos de pago: efectivo / transferencia o Mercado Pago. Sin tarjetas de crédito.
- Flujo central: Turno → Atención → Cobro → Cuenta Corriente.
- Maneja historias clínicas → cumplimiento Ley 25.326 (Habeas Data, Argentina).
- Horarios: mañana 09:00-12:30, tarde 16:00-19:30. Sin jueves ni domingo.

## Objetivos por actor

| Actor | Necesidad principal |
|-------|-------------------|
| **Secretaria** | Gestionar agenda diaria, asignar/modificar turnos, cobrar, controlar caja, ver deudores. Sin planillas manuales. |
| **Admin** | Configurar doctores, tratamientos y precios. Gestionar usuarios del sistema. Acceder a reportes financieros globales. |
| **Paciente** | Solicitar turnos por internet sin llamar. Elegir tratamiento, doctor y horario disponible. Seguir estado del turno por link. |
| **Desarrollador** | Código mantenible, tipado, separado frontend/backend, con seguridad JWT y deploy automatizado. |

## Alcance actual (v2.x)

### Completado
- Backend FastAPI refactorizado (routers, schemas, crud separados por dominio).
- Frontend React 18 + TypeScript + Vite + Tailwind CSS.
- Gestión de pacientes, turnos, doctores, finanzas, cuentas corrientes.
- Dashboard KPI con caja diaria (ARS/USD).
- Historial de paciente con tratamientos y pagos.
- Health check endpoint.

### Pendiente (planificado)
- Autenticación JWT con roles (admin + secretaria).
- Catálogo de tratamientos odontológicos con precios base.
- Portal de autogestión del paciente (guest checkout con DNI y UUID).
- Notificaciones multicanal (email + WhatsApp + bot conversacional).
- Exportación de reportes a Excel.
- Deploy a producción con HTTPS, backups y CI/CD.

## Fuera de alcance
- Procesamiento de tarjetas de crédito (reduce superficie de ataque).
- Aplicación móvil nativa (el portal es responsive/PWA).
- Integración con sistemas de obra social para validación en línea.
- Módulo de facturación electrónica (AFIP).
- Multi-tenancy o multi-sucursal.
