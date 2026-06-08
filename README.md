<div align="center">

<img src="https://img.shields.io/badge/OdontoGest-Sistema%20de%20Gesti%C3%B3n%20Odontol%C3%B3gica-0ea5e9?style=for-the-badge&logo=tooth&logoColor=white" alt="OdontoGest" />

# 🦷 OdontoGest

**Sistema de gestión integral para clínicas odontológicas**

*Agenda · Pacientes · Caja · Turnos online · Avisos automáticos*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Licencia-Privada-red?style=flat-square)](LICENSE)

</div>

---

## ¿Qué es OdontoGest?

OdontoGest es una aplicación web hecha a medida para clínicas odontológicas. Centraliza en un solo lugar la gestión de agenda, pacientes, cobros y comunicaciones — accesible desde cualquier dispositivo con internet, sin instalaciones.

Los pacientes pueden **solicitar turnos online usando solo su DNI**, sin crear una cuenta. El personal de la clínica aprueba o rechaza cada solicitud con un clic, manteniendo el control total de la agenda.

---

## ✨ Módulos del sistema

### 01 · Fichas de Pacientes
Historial clínico digital completo por paciente. Búsqueda instantánea por nombre o DNI. Incluye timeline de turnos, tabla de pagos y saldo en cuenta corriente (pesos y dólares).

### 02 · Agenda de Turnos
Vista de agenda separada por profesional, con detección automática de conflictos de horario y bloqueo manual de slots. Estados: `solicitado` · `confirmado` · `realizado` · `cancelado` · `rechazado`.

### 03 · Caja y Cobros del Día
Registro de cobros al cerrar cada turno (efectivo o transferencia). Dashboard con resumen diario de pacientes atendidos e ingresos en ARS/USD. Lista de deudores filtrable.

### 04 · Acceso Seguro para el Personal
Autenticación con roles (`Administrador` / `Secretaria`). Sesiones con vencimiento automático y renovación transparente. Protección contra fuerza bruta con rate limiting.

### 05 · Catálogo de Tratamientos y Obras Sociales
Alta y edición de tratamientos con precio y duración. Precarga automática del precio al registrar un cobro. Gestión de obras sociales aceptadas.

### 06 · Portal de Turnos sin Cuenta
Flujo de 4 pasos para que el paciente solicite turno desde el celular sin registrarse. Si ya existe en el sistema, sus datos aparecen solos. Si es nuevo, la ficha se crea automáticamente.

```
Tratamiento → Doctor → Horario → Identificación con DNI
```

El paciente recibe un enlace único para ver y cancelar su turno. La secretaria aprueba o rechaza desde el panel integrado en la agenda.

### 07 · Avisos Automáticos por WhatsApp y Email
Notificaciones sin intervención manual:
- ✅ Confirmación del turno (con link al estado)
- ❌ Rechazo con motivo
- ⏰ Recordatorio 48 horas antes
- ⏰ Recordatorio 2 horas antes
- 🤖 Bot de WhatsApp que responde consultas y deriva a la secretaria

### 08 · Informes en Excel
Descarga con un clic de historia clínica completa, lista de deudores y resumen de ingresos por período. Disponible solo para el personal autorizado.

### 09 · Página Web de la Clínica
Sitio web responsivo con información de servicios, horarios, ubicación y botón directo al portal de turnos.

### 10 · Puesta en Producción
Deploy completo en la nube con dominio propio, HTTPS, backups diarios automáticos y monitoreo de disponibilidad.

---

## 🗓️ Horarios configurados

| Franja | Horario | Días habilitados |
|--------|---------|-----------------|
| Mañana | 09:00 – 12:30 | Lunes a Sábado |
| Tarde | 16:00 – 19:30 | Lunes, Martes, Miércoles y Viernes |
| — | Cerrado | Jueves y Domingo |

> Turnos cada 30 minutos. El portal muestra solo los horarios disponibles en tiempo real.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 · React Router v6 · Tailwind CSS · Vite |
| Backend | FastAPI · SQLAlchemy · Pydantic |
| Base de datos | PostgreSQL |
| Autenticación | JWT (python-jose) · bcrypt (passlib) |
| Notificaciones | Meta WhatsApp Business API · APScheduler |
| Informes | openpyxl · StreamingResponse |
| Deploy frontend | Vercel |
| Deploy backend | Railway / Render |
| SSL | Let's Encrypt |
| Seguridad | Rate limiting (slowapi) · Ley 25.326 Habeas Data |

---

## 🔐 Seguridad y privacidad

- Contraseñas hasheadas con **bcrypt** (nunca guardadas en texto plano)
- Autenticación stateless con **JWT**
- Sesiones con vencimiento automático
- Protección contra ataques de fuerza bruta (**rate limiting**)
- Backups automáticos diarios de la base de datos
- Cumplimiento de la **Ley 25.326 de Habeas Data** (Argentina)
- Acceso al portal de pacientes mediante **UUID público** sin exponer datos internos

---

## 📁 Estructura del proyecto

```
odontogest/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints FastAPI
│   │   ├── core/         # Configuración, seguridad, JWT
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── schemas/      # Schemas Pydantic
│   │   └── services/     # Lógica de negocio, notificaciones
│   ├── alembic/          # Migraciones de base de datos
│   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Vistas principales
│   │   ├── portal/       # Portal público de turnos
│   │   └── hooks/        # Custom hooks
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Instalación y desarrollo local

### Prerrequisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+

### Backend

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/odontogest.git
cd odontogest/backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correspondientes

# Ejecutar migraciones
alembic upgrade head

# Iniciar servidor de desarrollo
uvicorn main:app --reload
```

### Frontend

```bash
cd ../frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La API estará disponible en `http://localhost:8000` y el frontend en `http://localhost:5173`.

---

## ⚙️ Variables de entorno

```env
# Base de datos
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/odontogest

# Seguridad
SECRET_KEY=tu-clave-secreta
ACCESS_TOKEN_EXPIRE_MINUTES=60

# WhatsApp Business API
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Email (opcional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

---

## 📡 Endpoints principales

```
POST   /auth/login              → Autenticación del personal
GET    /pacientes               → Lista de pacientes
GET    /pacientes/{id}          → Ficha completa del paciente
POST   /turnos                  → Crear turno
GET    /turnos/agenda           → Agenda del día por doctor
PATCH  /turnos/{id}/estado      → Aprobar / rechazar / completar
POST   /cobros                  → Registrar pago
GET    /caja/resumen            → Dashboard diario
GET    /portal/{uuid}           → Estado del turno (público)
POST   /portal/solicitar        → Solicitar turno (público, solo DNI)
GET    /informes/deudores       → Exportar lista de deudores (Excel)
```

Documentación interactiva disponible en `/docs` (Swagger UI) y `/redoc`.

---

## 🤝 Contribuciones

Este es un proyecto privado desarrollado a medida. No se aceptan contribuciones externas por el momento.

---

## 📄 Licencia

Software privado. Todos los derechos reservados. Prohibida su reproducción, distribución o modificación sin autorización expresa.

---

<div align="center">
  <sub>Desarrollado con ❤️ para simplificar el trabajo diario de las clínicas odontológicas · Argentina 🇦🇷</sub>
</div>
