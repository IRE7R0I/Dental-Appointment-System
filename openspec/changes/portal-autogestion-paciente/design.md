# CHANGE-007: Diseño Técnico — Portal Guest Checkout

## 1. Modelos — cambios en Turno

```python
# models.py — campos nuevos en Turno
uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid4()))
motivo_rechazo = Column(Text, nullable=True)
id_tratamiento = Column(Integer, ForeignKey("tratamientos_catalogo.id"), nullable=True)
obra_social = Column(String(100), nullable=True)

# Relación nueva
tratamiento_catalogo = relationship("TratamientoCatalogo")
```

Estado actual: String(50) default "Pendiente". CHANGE-007 agrega: `solicitado`,
`rechazado`, `bloqueado`. Conviven con valores existentes.

## 2. Endpoints

### 2.1 Públicos (sin auth)

```
GET  /pacientes/verificar/{dni}
     → 200 { existe: true, nombre, apellido, telefono, obra_social }
     → 200 { existe: false }
     Rate limit: 10/min por IP

GET  /portal/disponibilidad?doctor_id=1&fecha=2026-05-15
     → [ { hora: "09:00", disponible: true }, ... ]
     Rate limit: 30/min por IP

POST /portal/reservar
     Body: { id_tratamiento, id_doctor, fecha_hora, dni, nombre?, apellido?, telefono?, email?, obra_social }
     → 201 { turno_id, uuid, estado: "solicitado" }
     Rate limit: 5/min por IP

GET  /portal/turno/{uuid}
     → 200 { uuid, estado, fecha_hora, doctor_nombre, tratamiento_nombre, motivo_rechazo? }

PUT  /portal/turno/{uuid}/cancelar
     → 200 { mensaje: "Turno cancelado" }
     → 400 si estado no es "solicitado" ni "pendiente"
```

### 2.2 Internos (auth: admin + secretaria)

```
GET  /turnos/solicitados
     → list[TurnoSolicitadoResponse]

PUT  /turnos/{id}/confirmar
     → TurnoResponse (estado cambia a "pendiente")
     → Trigger: notificación (CHANGE-006)

PUT  /turnos/{id}/rechazar
     Body: { motivo_rechazo: "..." }
     → TurnoResponse (estado cambia a "rechazado")
     → Trigger: notificación con motivo (CHANGE-006)

POST /turnos/bloquear
     Body: { id_doctor, fecha_hora }
     → TurnoResponse (estado: "bloqueado", sin paciente)

DELETE /turnos/{id}/desbloquear
     → { mensaje: "Slot liberado" }
```

## 3. Lógica de verificación DNI + shadow profile

```python
# POST /portal/reservar
def reservar_turno(data: ReservaRequest, db: Session):
    # 1. Validar disponibilidad (race condition check)
    existe_turno = db.query(Turno).filter(
        Turno.id_doctor == data.id_doctor,
        Turno.fecha_hora == data.fecha_hora,
        Turno.estado.notin_(["cancelado", "rechazado"])
    ).first()
    if existe_turno:
        raise HTTPException(409, "El horario ya no está disponible")

    # 2. Verificar DNI
    paciente = db.query(Paciente).filter(Paciente.dni == data.dni).first()

    if paciente:
        # DNI existe → vincular turno, no modificar datos
        pass
    else:
        # DNI nuevo → shadow profile
        paciente = Paciente(
            dni=data.dni,
            nombre=data.nombre,
            apellido=data.apellido,
            telefono=data.telefono,
            email=data.email,
            obra_social=data.obra_social,
        )
        db.add(paciente)
        db.flush()

    # 3. Validar horario de atención (franjas)
    validar_horario_atencion(data.fecha_hora)

    # 4. Crear turno
    turno = Turno(
        fecha_hora=data.fecha_hora,
        dni_paciente=data.dni,
        id_doctor=data.id_doctor,
        id_tratamiento=data.id_tratamiento,
        obra_social=data.obra_social,
        estado="solicitado",
        uuid=str(uuid4()),
    )
    db.add(turno)
    db.commit()

    return {"turno_id": turno.id, "uuid": turno.uuid, "estado": "solicitado"}
```

## 4. Validación de horarios (franjas)

```python
def validar_horario_atencion(dt: datetime):
    dia = dt.weekday()
    if dia == 3:  # jueves
        raise HTTPException(400, "Los jueves no se atiende")
    if dia == 6:  # domingo
        raise HTTPException(400, "Los domingos no se atiende")

    minutos = dt.hour * 60 + dt.minute
    manana = 540 <= minutos <= 750   # 09:00-12:30

    if dia == 5:  # sábado → solo mañana
        if not manana:
            raise HTTPException(400,
                "Sábados solo mañana: 9:00-12:30")
        return

    tarde = 960 <= minutos <= 1170   # 16:00-19:30
    if not (manana or tarde):
        raise HTTPException(400,
            "Horario fuera de atención. Mañana: 9:00-12:30, Tarde: 16:00-19:30")
```

## 5. Cálculo de disponibilidad

```python
def calcular_disponibilidad(db, doctor_id: int, fecha: date) -> list[SlotDisponible]:
    # Generar todos los slots posibles para esa fecha
    slots = []
    for hora in range(9, 13):  # 9 a 12
        for minuto in (0, 30):
            dt = datetime(fecha.year, fecha.month, fecha.day, hora, minuto)
            if validar_horario_atencion_silencioso(dt):
                slots.append({"hora": f"{hora:02d}:{minuto:02d}", "disponible": True})
    for hora in range(16, 20):  # 16 a 19
        for minuto in (0, 30):
            dt = datetime(fecha.year, fecha.month, fecha.day, hora, minuto)
            if validar_horario_atencion_silencioso(dt):
                slots.append({"hora": f"{hora:02d}:{minuto:02d}", "disponible": True})

    # Marcar ocupados
    turnos_ocupados = db.query(Turno).filter(
        Turno.id_doctor == doctor_id,
        func.date(Turno.fecha_hora) == fecha,
        Turno.estado.notin_(["cancelado", "rechazado"])
    ).all()

    ocupados_set = {t.fecha_hora.strftime("%H:%M") for t in turnos_ocupados}
    for slot in slots:
        if slot["hora"] in ocupados_set:
            slot["disponible"] = False

    return slots
```

## 6. Schemas Pydantic

```python
# schemas/portal.py
class ReservaRequest(BaseModel):
    id_tratamiento: int
    id_doctor: int
    fecha_hora: datetime
    dni: str = Field(pattern=r"^\d{7,8}$")
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    obra_social: str

class ReservaResponse(BaseModel):
    turno_id: int
    uuid: str
    estado: str

class TurnoPublicoResponse(BaseModel):
    uuid: str
    estado: str
    fecha_hora: datetime
    doctor_nombre: str
    tratamiento_nombre: str
    motivo_rechazo: Optional[str] = None

class VerificacionDNIResponse(BaseModel):
    existe: bool
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    obra_social: Optional[str] = None

class SlotDisponible(BaseModel):
    hora: str
    disponible: bool

class RechazarTurnoRequest(BaseModel):
    motivo_rechazo: str = Field(min_length=5, max_length=500)
```

## 7. Frontend — Stepper

```
PortalPage.tsx
  state: step (1-4), datos acumulados
  usa hook useStepper() o estado local

Step1Servicio.tsx
  fetch GET /catalogo/tratamientos
  grid de cards: nombre, precio (ARS y USD), duración, categoría
  buscador por nombre (filter local)
  filtros por categoría (chips: "Todas", "General", "Cirugía", "Endodoncia")
  click en card → guarda id_tratamiento, avanza a paso 2

Step2Profesional.tsx
  fetch GET /doctores
  cards: nombre, especialidad, color_agenda
  click → guarda id_doctor, avanza a paso 3

Step3Agenda.tsx
  fetch GET /portal/disponibilidad?doctor_id=X&fecha=YYYY-MM-DD
  navegación entre fechas (flechas, solo próximos 15 días)
  slots como tarjetas rectangulares:
    ┌────────┐ ┌────────┐ ┌────────┐
    │ 09:00  │ │ 09:30  │ │ 10:00  │
    │ Verde  │ │ Gris   │ │ Verde  │
    └────────┘ └────────┘ └────────┘
  verde = disponible, gris = ocupado, amarillo = solicitado pendiente
  click en verde → guarda fecha_hora, avanza a paso 4

Step4Identificacion.tsx
  input DNI con debounce 500ms
  on blur → GET /pacientes/verificar/{dni}
  loading spinner mientras verifica
  ┌─ existe → "¿Sos vos?" card:
  │   Nombre: Juan
  │   Apellido: Pérez
  │   Celular: 11 2345-6789
  │   Obra Social: OSDE
  │   [Sí, soy yo]  [No, volver]
  └─ no existe → formulario:
      Nombre [___]  Apellido [___]
      Celular [___]  Email [___] (opcional)
      Obra Social [▼ selector]
      [Confirmar turno]

ConfirmacionTurno.tsx
  POST /portal/reservar
  success:
    "¡Turno solicitado!"
    N° de seguimiento: A1B2C3D4
    Link: /consulta/A1B2C3D4
    Te enviamos los datos por email/WhatsApp
    [Solicitar otro turno]
  error (409 conflicto):
    "El horario ya no está disponible. Elegí otro."
    [Volver al paso 3]
```

## 8. Frontend — ConsultaTurnoPage

```
/consulta/:uuid  (pública, sin auth)

GET /portal/turno/{uuid}
  Muestra:
    Estado: [⏳ Solicitado] [✓ Pendiente] [✗ Rechazado]
    Tratamiento: Limpieza dental
    Doctor: Darío
    Fecha y hora: 15/05/2026 10:00
    Obra Social: OSDE

    Si estado = rechazado:
      Motivo: "El doctor tiene una cirugía de urgencia.
               Por favor solicitá otro turno."
      [Solicitar otro turno] → /portal

    Si estado = solicitado o pendiente:
      [Cancelar turno] → PUT /portal/turno/{uuid}/cancelar
```

## 9. Frontend — Panel de Aprobación (AgendaPage)

```
Sección/tab "Solicitudes (3)" con badge rojo

┌────────────────────────────────────────────────────────┐
│ Paciente   │ Tratamiento │ Doctor │ Fecha/Hora │ Acc.  │
├────────────────────────────────────────────────────────┤
│ Juan Pérez │ Limpieza   │ Darío  │ 15/05 10:00│ ✓ ✗  │
│ Ana López  │ Extracción │ Fabiana│ 15/05 11:00│ ✓ ✗  │
└────────────────────────────────────────────────────────┘

Click ✓ → PUT /turnos/{id}/confirmar → desaparece de la lista

Click ✗ → Modal:
  "Motivo del rechazo:"
  [___________________________]
  [Cancelar]  [Confirmar rechazo]
  → PUT /turnos/{id}/rechazar

Bloqueo de slot:
  Click en slot vacío del calendario → "Bloquear horario"
  → POST /turnos/bloquear
  Slot se muestra gris oscuro/rojo en disponibilidad
```

## 9.5. Dashboard — Ingresos separados por origen

```python
# schemas/finanzas.py — ResumenCajaResponse ampliado
class ResumenCajaResponse(BaseModel):
    turnos_realizados: int
    turnos_pendientes: int
    turnos_cancelados: int
    # Particulares
    ingresos_particulares_ars: Decimal
    ingresos_particulares_usd: Decimal
    # Obras Sociales / Coseguros
    ingresos_obras_sociales_ars: Decimal
    ingresos_obras_sociales_usd: Decimal
    # Totales (calculados)
    total_ingresos_ars: Decimal
    total_ingresos_usd: Decimal
```

La lógica en `crud/finanzas.py` agrupa los pagos del día por
`obra_social == "Particular"` vs el resto.

### 9.6. Polling sync multi-secretaria

```typescript
// AgendaPage.tsx — refetch periódico
useEffect(() => {
  const interval = setInterval(() => {
    fetchTurnos();    // refetch GET /turnos
    fetchSolicitados(); // refetch GET /turnos/solicitados
  }, 15000); // cada 15 segundos
  return () => clearInterval(interval);
}, []);
```

Cada acción de escritura (crear, confirmar, rechazar) refetcha inmediatamente
después de completar, además del intervalo. "First write wins" en conflictos.

## 10. Orden de construcción

1. Modelo Turno: +uuid, +motivo_rechazo, +id_tratamiento, +obra_social
2. Schemas: portal.py, turnos.py (ampliar), pacientes.py (VerificacionDNIResponse)
3. CRUD: portal.py (reservar, verificar_dni, disponibilidad, consulta_uuid)
4. Router: pacientes.py (+verificar), turnos.py (+solicitados, confirmar, rechazar, bloquear)
5. Router: portal.py (nuevo)
6. Validación horaria (con sábado) + separación de ingresos en caja
7. Frontend: PortalPage (stepper) + 4 Steps + Confirmacion
8. Frontend: ConsultaTurnoPage
9. Frontend: AgendaPage (+panel solicitudes + bloqueo + polling sync)
10. Frontend: DashboardPage (+KPIs separados por origen)
11. Frontend: App.tsx (+rutas públicas)
