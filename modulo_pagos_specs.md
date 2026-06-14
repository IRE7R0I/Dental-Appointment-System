# 💳 Especificación Técnica: Módulo de Pagos y Cuentas Corrientes — OdontoGest

Este documento consolida la arquitectura técnica, modelos de datos, endpoints del backend y componentes del frontend del **Módulo de Pagos y Cuentas Corrientes** de la aplicación **OdontoGest**. Está diseñado para que cualquier modelo de lenguaje (LLM), como Google AI Studio, pueda comprender y recrear este módulo con precisión quirúrgica.

---

## 1. Visión General del Módulo
El sistema de pagos de **OdontoGest** está pensado para consultorios odontológicos que operan en **dos monedas concurrentes (ARS y USD)**. La lógica financiera está centralizada en una **Cuenta Corriente de Paciente**, la cual consolida deudas generadas por tratamientos médicos realizados y los abonos entregados.

### Roles Autorizados:
* **Admin / Secretaria**: Tienen acceso total a registrar cobros, ver caja diaria, saldar cuentas corrientes y consultar listas de deudores.

---

## 2. Arquitectura de Base de Datos (Modelos SQLAlchemy)

La base de datos (PostgreSQL/SQLite local) define las siguientes tablas en `backend/models.py` para sostener las finanzas:

```python
from sqlalchemy import Column, String, Integer, DateTime, DECIMAL, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class Pago(Base):
    """Registro individual de un cobro percibido por el consultorio."""
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    monto = Column(DECIMAL(10, 2), nullable=False)
    fecha_pago = Column(DateTime, default=datetime.now)
    metodo_pago = Column(String(50))  # "efectivo", "transferencia", "tarjeta"
    moneda = Column(String(3), default='ARS')  # "ARS" o "USD"
    saldo_pendiente = Column(DECIMAL(10,2), nullable=True)
    
    # FKs
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), nullable=True)
    id_turno = Column(Integer, ForeignKey("turnos.id"), nullable=True)

    # Relaciones
    turno = relationship("Turno", back_populates="pagos")
    paciente = relationship("Paciente", foreign_keys=[dni_paciente])

class CuentaCorriente(Base):
    """Consolida el saldo global (deudor) de un paciente en ambas monedas."""
    __tablename__ = "cuentas_corrientes"

    id = Column(Integer, primary_key=True, index=True)
    dni_paciente = Column(String(20), ForeignKey("pacientes.dni"), unique=True, nullable=False)
    saldo_ars = Column(DECIMAL(10, 2), default=0.00)  # Saldo > 0 representa deuda
    saldo_usd = Column(DECIMAL(10, 2), default=0.00)  # Saldo > 0 representa deuda
    ultima_actualizacion = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relaciones
    paciente = relationship("Paciente", backref="cuenta_corriente", uselist=False)
    movimientos = relationship("MovimientoCuenta", back_populates="cuenta", order_by="MovimientoCuenta.fecha.desc()")

class MovimientoCuenta(Base):
    """Libro diario contable para auditar cargos (deudas) y abonos (pagos)."""
    __tablename__ = "movimientos_cuenta"

    id = Column(Integer, primary_key=True, index=True)
    id_cuenta = Column(Integer, ForeignKey("cuentas_corrientes.id"), nullable=False)
    tipo = Column(String(20), nullable=False)  # "cargo" (suma deuda) | "pago" (resta deuda)
    monto = Column(DECIMAL(10, 2), nullable=False)
    moneda = Column(String(3), nullable=False, default="ARS")  # "ARS" | "USD"
    descripcion = Column(String(255))
    fecha = Column(DateTime, default=datetime.now)

    # Relaciones
    cuenta = relationship("CuentaCorriente", back_populates="movimientos")

class TurnoTratamiento(Base):
    """Tratamiento cargado a un turno específico."""
    __tablename__ = "turnos_tratamientos"

    id = Column(Integer, primary_key=True, index=True)
    id_turno = Column(Integer, ForeignKey("turnos.id"), nullable=False)
    nombre = Column(String(255), nullable=False)  # Ej: "Implante dental"
    cantidad = Column(Integer, default=1)
    precio_ars = Column(DECIMAL(10, 2), nullable=True)  # Puede ser null si es en USD
    precio_usd = Column(DECIMAL(10, 2), nullable=True)  # Puede ser null si es en ARS

    turno = relationship("Turno", back_populates="tratamientos")
```

---

## 3. Controladores y Lógica de Negocio (Backend)

La lógica financiera se implementa en `backend/crud/finanzas.py` y `backend/crud/pacientes.py`:

### A. Registro de Abono a Cuenta (`crear_pago`)
1. Genera un registro `Pago` asociado al DNI del paciente (y opcionalmente a un `id_turno`).
2. Invoca a `registrar_movimiento` con tipo `"pago"`, disminuyendo la deuda en la cuenta corriente del paciente.

### B. Flujo de Cierre de Turno (`cerrar_turno_con_pago`)
Cuando un paciente finaliza su turno médico, la secretaria cierra la sesión detallando los **tratamientos realizados** y los **pagos entregados en el momento**:
1. El estado del turno pasa a `"Realizado"`.
2. Se registran los tratamientos del turno en la tabla `turnos_tratamientos`.
3. Se calculan los montos totales consumidos en pesos y en dólares (`total_ars`, `total_usd`).
4. Se registran los pagos recibidos en el momento en la tabla `pagos`.
5. Se calcula la **Deuda** resultante: 
   $$\text{deuda} = \max(0, \text{total\_tratamientos} - \text{total\_pagado})$$
6. Si hay deuda, se crea un movimiento de tipo `"cargo"` en la cuenta corriente del paciente, lo que **incrementa** su saldo deudor.
7. Si el paciente pagó en exceso, la diferencia se registra como un movimiento de tipo `"pago"` (abono) a favor del paciente, restándose de su saldo general.

### C. Registro del Historial del Paciente (`obtener_historial_paciente`)
Genera un estado de cuenta completo del paciente que incluye:
* Su saldo deudor actual consolidado en ARS y USD.
* El listado cronológico de turnos realizados y cancelados.
* Por cada turno:
  * Lista de tratamientos (nombre, cantidad y precio base).
  * Lista de abonos cargados a ese turno específico.
  * Subtotales de deuda resultantes de ese día de consulta.
* Totales agregados acumulados a lo largo del tiempo.

### D. Endpoints Expuestos (`backend/routers/finanzas.py`):
* `POST /finanzas/pagos`: Crear abonos / cobros manuales.
* `GET /finanzas/pagos`: Listar todos los cobros, filtrando por rango de fechas, método de pago, DNI, doctor y deudores.
* `GET /finanzas/caja/hoy`: Caja del día. Retorna la cantidad de turnos (realizados, pendientes, cancelados) e ingresos agregados del día por moneda.

---

## 4. Estructura y Flujo del Frontend (React + TS + Tailwind)

La pantalla principal de control financiero es [**`PagosPage.tsx`**](file:///d:/____PROYECTOS/SISTEMA%20TURNOS%20ODONTOLOGIA/Dental-Appointment-System/frontend/src/pages/PagosPage.tsx) (`/pagos`).

### A. Componentes Visuales del Frontend:
1. **KPI Cards (Métricas Superiores)**:
   * **Ingresos de Hoy**: Suma de ingresos agregados en ARS y USD obtenidos el día de la fecha.
   * **Saldo a Cobrar**: La deuda total consolidada de todos los pacientes morosos en el sistema (ARS / USD).
2. **Tabla de Control de Cuentas (Deudores)**:
   * Muestra todos los pacientes del sistema junto a su saldo pendiente de pago en pesos y dólares.
   * **Filtros rápidos (Chips)**: *"Todos"*, *"Deudores ARS"*, *"Deudores USD"* y *"Al Día"*.
   * Si el paciente tiene deuda, expone un botón circular con ícono de billete (`payments`) para abrir el Side Sheet de cobranzas. Si está al día, muestra una etiqueta verde *"Saldado"*.
3. **Side Sheet de Registro de Abonos (Panel Lateral)**:
   * Se abre al presionar "Registrar Abono" en un paciente deudor.
   * Muestra claramente la deuda pendiente actual en un banner de advertencia rojo.
   * Formulario interactivo:
     * **Moneda del Abono**: Selector `ARS` o `USD`.
     * **Monto a Entregar**: Input numérico. **Validación:** No se permite que el abono supere la deuda pendiente en la moneda respectiva.
     * **Método de Pago**: Selector (`efectivo`, `transferencia`, `tarjeta`).
     * **Turno Relacionado**: Selector opcional de turnos `"Pendientes"` asociados al paciente para imputar el abono a una sesión médica específica.
     * **Notas**: Comentarios de auditoría (ej: *"Pago en cuotas sesión 2"*).
     * **Actualización Optimista**: Al confirmarse con éxito el cobro, el frontend reduce de inmediato y localmente el saldo deudor del paciente en la tabla antes de que se complete una recarga total de datos.
4. **Tabla de Historial de Pagos**:
   * Listado detallado de todas las transacciones de pago cobradas.
   * **Selector de Periodo**:
     * *Por Mes*: Desplegable de meses del año actual.
     * *Por Semana*: Selector de mes y segundo selector de semana específica del mes (1ra, 2da, 3ra, etc.).
   * **Filtro de Método**: Todos, Efectivo, Transferencia.
   * **Totales del Periodo**: Banners en la parte superior que muestran el total exacto recaudado en ARS y USD según los filtros aplicados.

---

## 5. Reglas de Negocio Críticas (Para re-implementación)

1. **Dualidad Monetaria Estricta**: No se realizan conversiones automáticas ni tipos de cambio internos entre pesos y dólares. Las deudas y pagos en ARS y USD corren de forma completamente paralela e independiente en la cuenta corriente.
2. **Validación de Sobrecobros**: En las cargas manuales de abonos a cuenta, el monto ingresado por la secretaria jamás debe superar el saldo deudor actual de la moneda seleccionada, para evitar saldos negativos a favor (crédito) del paciente, a menos que provenga de un cierre de turno excedente.
3. **Cuentas Corrientes**: Toda alta de un paciente nuevo debe generar/asegurar automáticamente su respectivo registro en la tabla `cuentas_corrientes` con saldos iniciales en `0.00`.
4. **Flujo contable**:
   * Las deudas por tratamientos se registran como tipo `"cargo"` y **aumentan** el saldo deudor.
   * Los abonos monetarios se registran como tipo `"pago"` y **disminuyen** el saldo deudor.
