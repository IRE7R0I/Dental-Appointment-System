# Auditoría y Documentación de Ajustes de Contrato con Backend Real (Puntos 1 a 8)

Este documento detalla la totalidad de las adaptaciones de contrato API y refactorizaciones realizadas en el sistema para garantizar alineación 100% estricta con las especificaciones del backend real.

---

## Índice de Puntos Auditados

1. [Punto 1: Cancelación de Turnos (PATCH /api/turnos/:id/cancelar)](#1-cancelación-de-turnos)
2. [Punto 2: Cierre de Turnos (PUT /api/turnos/:id/cerrar)](#2-cierre-de-turnos)
3. [Punto 3: Consulta Masiva de Slots (GET /api/turnos/slots/bulk)](#3-consulta-masiva-de-slots)
4. [Punto 4: Búsqueda Incremental y Creación Rápida de Pacientes](#4-búsqueda-incremental-y-creación-rápida-de-pacientes)
5. [Punto 5: Horarios de Doctores — Estructura Dict por Día](#5-horarios-de-doctores--estructura-dict-por-día)
6. [Punto 6: Configuración Global de Horarios de Clínica](#6-configuración-global-de-horarios-de-clínica)
7. [Punto 7: Historia Clínica (Alertas, Evoluciones y Odontograma Placeholder)](#7-historia-clínica-alertas-evoluciones-y-odontograma)
8. [Punto 8: Gestión de Imágenes por Carpetas y Búfer Binario](#8-gestión-de-imágenes-por-carpetas-y-búfer-binario)

---

## 1. Cancelación de Turnos

- **Método y Endpoint:** `PATCH /api/turnos/:id/cancelar`
- **Módulo(s) involucrado(s):** Dashboard, Agenda (`AgendaPage.tsx`, `DashboardPage.tsx`).
- **Payload Request:**
  ```json
  {
    "motivo_cancelacion": "Motivo expresado por el paciente o clínica"
  }
  ```
- **Respuesta del Backend Real:**
  Devuelve el objeto **`turno` actualizado** (status HTTP 200 OK):
  ```json
  {
    "id": 101,
    "dni_paciente": "12345678",
    "id_doctor": 1,
    "fecha_hora": "2026-07-23T10:00:00",
    "estado": "Cancelado",
    "motivo_cancelacion": "Motivo expresado por el paciente o clínica",
    "actualizado_en": "2026-07-23T15:45:00.000Z"
  }
  ```
- **Ajustes Realizados:**
  - Se cambió el método HTTP de `POST` a `PATCH`.
  - Se renombró la propiedad del body de `motivo` a `motivo_cancelacion` en todas las llamadas desde el cliente.
  - Se removieron las comprobaciones de un campo `res.success` inexistente: el éxito se detecta mediante la respuesta HTTP exitosa (2xx) manejada por `apiFetch`, leyendo directamente los datos actualizados del objeto `turno` devuelto.

---

## 2. Cierre de Turnos

- **Método y Endpoint:** `PUT /api/turnos/:id/cerrar`
- **Módulo(s) involucrado(s):** Dashboard (`DashboardPage.tsx` — Modal de cierre de atención / liquidación).
- **Payload Request:**
  ```json
  {
    "comentarios": "Evolución clínica realizada durante la atención",
    "tratamientos": [
      {
        "id_tratamiento": 1,
        "nombre": "Limpieza Dental",
        "cantidad": 1,
        "precio_ars": 15000,
        "precio_usd": 15
      }
    ],
    "pagos": [
      {
        "monto": 15000,
        "moneda": "ARS",
        "metodo_pago": "Efectivo"
      }
    ],
    "pieza_dental": 18,
    "ubicacion_lesion": "O",
    "conformidad_paciente": true
  }
  ```
- **Respuesta del Backend Real:**
  Devuelve el objeto completo de cierre y el turno actualizado (status HTTP 200 OK):
  ```json
  {
    "turno": {
      "id": 101,
      "estado": "Realizado",
      "comentarios_medicos": "Evolución clínica realizada durante la atención",
      "pieza_dental": 18,
      "ubicacion_lesion": "O",
      "conformidad_paciente": true
    },
    "tratamientos_registrados": [...],
    "pagos_registrados": [...]
  }
  ```
- **Ajustes Realizados:**
  - Método cambiado a `PUT`.
  - **Campo `comentarios` (sin sufijo):** Se corrigió la clave en el JSON enviado por el cliente de `comentarios_medicos` a `comentarios`.
  - Objeto adaptado para enviar los arrays `tratamientos` y `pagos` con sus respectivas monedas y valores.
  - La verificación de éxito se realiza vía status HTTP 2xx (sin depender de un flag `res.success`).

---

## 3. Consulta Masiva de Slots (Vista Mensual)

- **Método y Endpoint:** `GET /api/turnos/slots/bulk`
- **Módulo(s) involucrado(s):** Agenda (`AgendaPage.tsx` — Vista Mensual).
- **Query Parameters:**
  - `fecha_desde`: Fecha de inicio del rango (`YYYY-MM-DD`).
  - `fecha_hasta`: Fecha de fin del rango (`YYYY-MM-DD`).
  - `id_doctor`: Lista delimitada por comas de IDs de doctores (`1,2`).
- **Ejemplo URL:**
  `/api/turnos/slots/bulk?fecha_desde=2026-07-20&fecha_hasta=2026-07-26&id_doctor=1,2`
- **Response Shape Real (Conteos Agregados por Día):**
  ```json
  {
    "fecha_desde": "2026-07-20",
    "fecha_hasta": "2026-07-26",
    "doctores": [1, 2],
    "dias": {
      "2026-07-20": {
        "total": 16,
        "libres": 12,
        "ocupados": 3,
        "bloqueados": 1,
        "por_doctor": {
          "1": { "total": 8, "libres": 5, "ocupados": 2, "bloqueados": 1 },
          "2": { "total": 8, "libres": 7, "ocupados": 1, "bloqueados": 0 }
        }
      }
    }
  }
  ```
- **Ajustes Realizados:**
  - Este endpoint es utilizado **exclusivamente para la vista mensual del calendario** para renderizar métricas agregadas (ej: *"N lib."* en cada celda del mes).
  - Para consultar la disponibilidad detallada por hora de un día y doctor puntual, se utiliza `GET /api/turnos/slots?fecha=YYYY-MM-DD&id_doctor=N`.
  - En `AgendaPage.tsx` se actualizó el consumo de la respuesta para extraer directamente la propiedad `res.dias[fecha].libres` y `res.dias[fecha].total`.

---

## 4. Búsqueda Incremental y Creación Rápida de Pacientes

- **Métodos y Endpoints:**
  - `GET /api/pacientes/?buscar={query}` (mínimo 2 letras para activar autocompletado).
  - `POST /api/pacientes` (Alta rápida de pacientes desde modal de nuevo turno).
- **Módulo(s) involucrado(s):** Agenda (`AgendaPage.tsx`).
- **Ajustes Realizados:**
  - Se eliminó la creación/búsqueda de pacientes desde el Dashboard para centralizar el flujo de agendamiento exclusivamente en el módulo **Agenda**.
  - La búsqueda dispara sugerencias con *debounce* a partir de 2 caracteres.

---

## 5. Horarios de Doctores — Estructura Dict por Día

- **Métodos y Endpoints:**
  - `GET /api/doctores/:id/horarios`
  - `PUT /api/doctores/:id/horarios`
- **Módulo(s) involucrado(s):** Configuración de Doctores (`DoctorHorariosConfig.tsx`).
- **Shape de Datos Real (Diccionario por Día):**
  ```json
  {
    "dias": {
      "lunes": {
        "manana": { "inicio": "09:00", "fin": "13:00" },
        "tarde": { "inicio": "16:00", "fin": "20:00" }
      },
      "martes": {
        "manana": { "inicio": "09:00", "fin": "13:00" },
        "tarde": null
      },
      "miercoles": {
        "manana": { "inicio": "09:00", "fin": "13:00" },
        "tarde": { "inicio": "16:00", "fin": "20:00" }
      },
      "jueves": {
        "manana": { "inicio": "09:00", "fin": "13:00" },
        "tarde": { "inicio": "16:00", "fin": "20:00" }
      },
      "viernes": {
        "manana": { "inicio": "09:00", "fin": "13:00" },
        "tarde": { "inicio": "16:00", "fin": "20:00" }
      },
      "sabado": null,
      "domingo": null
    },
    "duracion_turno": 30,
    "horizonte_dias": 180
  }
  ```
- **Ajustes Realizados:**
  - Se eliminó la lectura por índice numérico (`"0"`, `"1"`, etc.).
  - Se adaptó la interfaz visual y lógica en `DoctorHorariosConfig.tsx` para leer y escribir las propiedades `manana` y `tarde` como objetos `{ inicio, fin }` o `null` bajo claves de días en español (`lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado`, `domingo`).
  - **Selector de Horizonte de Agendamiento:** En `DoctorHorariosConfig.tsx` se integró el selector "Horizonte de agendamiento" con opciones estrictas de **30 días, 60 días, 90 días y 180 días**, precargando `horizonte_dias` desde `GET /api/doctores/{id}/horarios`, enviándolo en `PUT /api/doctores/{id}/horarios`, y mostrando un texto dinámico explicativo *"Los pacientes podrán reservar turnos con este profesional hasta {valor} días por adelantado"*.
  - **Duración de Turnos:** Se configuraron las opciones de duración a **30, 60 y 90 minutos**.

---

## 6. Configuración Global de Horarios de Clínica

- **Método y Endpoint:** `GET /api/config/horarios`
- **Módulo(s) involucrado(s):** Agenda (`AgendaPage.tsx`).
- **Respuesta del Backend Real:**
  ```json
  {
    "zona_horaria": "America/Argentina/Buenos_Aires",
    "granularidad_minutos": 30,
    "dias": {
      "lunes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "martes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "miercoles": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "jueves": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "viernes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "sabado": null,
      "domingo": null
    }
  }
  ```
- **Ajustes Realizados:**
  - La función `isDayClosed()` y los rangos de atención general de la agenda ahora procesan la estructura dict por día enviada por la clínica para determinar feriados/días cerrados.

---

## 7. Historia Clínica (Alertas, Evoluciones y Odontograma)

- **Endpoints Asociados:**
  - `GET /api/pacientes/:dni` → Devuelve el objeto paciente incluyendo el campo `alertas`.
  - `GET /api/pacientes/:dni/alertas` / `POST /api/pacientes/:dni/alertas`
  - `GET /api/pacientes/:dni/evoluciones`
  - `POST /api/pacientes/:dni/evoluciones`
  - `PUT /api/pacientes/:dni/evoluciones/:id`
- **Módulo(s) involucrado(s):** Ficha del Paciente / Historia Clínica (`PacientesPage.tsx`).
- **Estructura de Evolución Clínica:**
  ```json
  {
    "id": 1,
    "dni_paciente": "12345678",
    "fecha": "2026-07-23",
    "id_turno": null,
    "pieza_dental": 18,
    "ubicacion_lesion": "O",
    "observaciones": "Se realizó obturación estética con resina fotocurable.",
    "conformidad_paciente": true,
    "creado_en": "2026-07-23T15:30:00.000Z"
  }
  ```
- **Ajustes Realizados:**
  - **Alertas:** Se presentan destacadas en la ficha del paciente cargándolas directamente del campo `alertas` en la respuesta de paciente.
  - **Evoluciones Clínicas:** Se reconstruyó la sección para listar todas las evoluciones históricas registradas y agregar nuevas evoluciones especificando fecha, pieza dental (11-48), ubicación de lesión (O/D/G/L/M/I/V/P), observaciones requeridas y conformidad del paciente.
  - **Odontograma:** Se mantuvo la pestaña Odontograma deshabilitada con el mensaje indicativo "Próximamente", dado que el módulo anatómico 3D no existe en el backend actual y forma parte del roadmap futuro.

---

## 8. Gestión de Imágenes por Carpetas y Búfer Binario

- **Endpoints Asociados:**
  - `GET /api/pacientes/:dni/carpetas` → Lista de carpetas del paciente (`[{ "id": "Radiografías", "nombre": "Radiografías" }]`).
  - `GET /api/pacientes/:dni/carpetas/:id_carpeta/imagenes` → Lista de imágenes asociadas a una carpeta.
  - `POST /api/pacientes/:dni/carpetas/:id_carpeta/imagenes` → Subida de imagen a una carpeta específica.
  - `GET /api/imagenes/:id/contenido` → Endpoint para servir la imagen o contenido binario directamente a las etiquetas `<img>`.
- **Módulo(s) involucrado(s):** Pestaña de Imágenes en Ficha de Paciente (`PacientesPage.tsx`).
- **Ajustes Realizados:**
  - Se estructuró la pestaña de imágenes organizada por carpetas (dinámicas y predeterminadas: Radiografías, Fotos intraorales, Estudios).
  - La subida asigna la imagen a la carpeta activa o seleccionada, manteniendo compatibilidad con la obtención de contenido binario mediante `/api/imagenes/:id/contenido`.

---

## Estado de Compilación y Verificación

- **Compilación TypeScript (`tsc --noEmit`):** ✅ Éxito sin errores.
- **Build de Aplicación (`compile_applet`):** ✅ Éxito sin errores.
- **Servidor Dev:** Operativo y probado contra todas las rutas indicadas.
