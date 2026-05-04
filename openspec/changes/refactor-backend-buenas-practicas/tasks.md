## 1. Setup — Estructura de proyecto

- [ ] 1.1 Crear carpeta `backend/` con subcarpetas `routers/`, `schemas/`, `crud/`, `services/`
- [ ] 1.2 Mover `database.py` y `models.py` a `backend/`
- [ ] 1.3 Agregar `alembic` a `requirements.txt` e inicializar Alembic

## 2. Modelos y Base de Datos

- [ ] 2.1 Agregar campo `moneda` (String, CHECK 'ARS' o 'USD') y `saldo_pendiente` (DECIMAL) al modelo Pago
- [ ] 2.2 Agregar índice compuesto a `Turno.fecha_hora` + `Turno.id_doctor` para performance
- [ ] 2.3 Generar migración Alembic inicial con autogenerate

## 3. Schemas Pydantic

- [ ] 3.1 Crear `schemas/pacientes.py` con PacienteCreate, PacienteResponse, PacienteUpdate
- [ ] 3.2 Crear `schemas/turnos.py` con TurnoCreate, TurnoResponse, TurnoUpdate
- [ ] 3.3 Crear `schemas/doctores.py` con DoctorCreate, DoctorResponse
- [ ] 3.4 Crear `schemas/finanzas.py` con PagoCreate, PagoResponse

## 4. CRUD por Entidad

- [ ] 4.1 Crear `crud/pacientes.py` con funciones: crear, obtener_todos, obtener_por_dni
- [ ] 4.2 Crear `crud/turnos.py` con funciones: crear, cancelar, eliminar, obtener_por_paciente, obtener_todos
- [ ] 4.3 Crear `crud/doctores.py` con funciones: crear, obtener_todos
- [ ] 4.4 Crear `crud/finanzas.py` con función: crear_pago

## 5. Routers FastAPI

- [ ] 5.1 Crear `routers/pacientes.py` con endpoints GET/POST/PUT pacientes, GET deudores
- [ ] 5.2 Crear `routers/turnos.py` con endpoints GET/POST/PUT/DELETE turnos
- [ ] 5.3 Crear `routers/doctores.py` con endpoints GET/POST doctores
- [ ] 5.4 Crear `routers/finanzas.py` con endpoint POST pagos

## 6. Entrypoint y Configuración

- [ ] 6.1 Refactorizar `backend/main.py`: importar routers, configurar CORS, configurar static files
- [ ] 6.2 Agregar CORSMiddleware con allow_origins=["http://localhost:5173"]
- [ ] 6.3 Verificar status codes HTTP correctos en todos los endpoints (201 POST, 404 not found, 400 bad request)
- [ ] 6.4 Manejo de errores consistente con HTTPException en todos los endpoints

## 7. Limpieza y Verificación

- [ ] 7.1 Actualizar `crear_tablas.py` para que importe desde `backend.models`
- [ ] 7.2 Verificar que `uvicorn backend.main:app` funciona correctamente
- [ ] 7.3 Probar todos los endpoints existentes con pytest o curl (misma funcionalidad que antes)
- [ ] 7.4 Actualizar docs/CHANGES.md: CHANGE-001 a estado COMPLETADO