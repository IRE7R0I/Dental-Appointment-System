# Registro Completo de Cambios — OdontoGest (Sesión 14 de Junio, 2026)

Este documento centraliza e integra de manera explícita todos los cambios técnicos, de lógica de negocio y de diseño de interfaz aplicados tanto en el **Backend** como en el **Frontend** de **OdontoGest**.

---

## 1. Módulo Clínico: Notas de Evolución en Cierre de Turno

Para permitir que el profesional odontólogo registre y consulte de forma exacta el comentario de evolución de cada consulta sin incurrir en migraciones complejas de base de datos, implementamos un almacenamiento compuesto:

* **Mecanismo Técnico**: Se utiliza la columna `motivo` existente en la tabla `turnos` de PostgreSQL.
* **Formato Compuesto**: `Motivo Programado | Notas de Evolución Clínica` (delimitado por `' | '`). Si el turno no tiene un motivo previo al agendarse, se asume por defecto `"Consulta"`.
* **Retrocompatibilidad**: Si el turno no cuenta con el delimitador `' | '`, la ficha del paciente simula una evolución realista (`getMockEvolucion`) de acuerdo con los tratamientos efectuados (conducto, limpieza, extracción, etc.).

### Archivos Modificados:
* **`backend/schemas/finanzas.py`**: Añadido el campo opcional `comentarios` a `CerrarTurnoInput`.
* **`backend/schemas/turnos.py`**: Añadido el campo `motivo` a `HistorialTurnoItemResponse`.
* **`backend/crud/finanzas.py`**: Actualizado `cerrar_turno_con_pago` para estructurar y guardar el string con el formato compuesto.
* **`backend/routers/turnos.py`**: Mapeado el parámetro `comentarios` al cerrar turno.
* **`backend/crud/pacientes.py`**: Asegurada la carga de `motivo` al obtener el historial del paciente.
* **`frontend/src/types/index.ts`**: Actualizadas interfaces TypeScript de entrada y respuesta.
* **`frontend/src/pages/AgendaPage.tsx`**:
  - Incorporado el área de texto **"Evolución y Comentarios Clínicos"** en el modal de cierre de turno.
  - Envía la nota clínica en el payload de la API y limpia el estado local al finalizar.
* **`frontend/src/pages/PerfilPacientePage.tsx`**:
  - Actualizada la función `getMockEvolucion` para parsear el delimitador y extraer el comentario clínico real redactado.

---

## 2. Módulo Financiero: Lógica de Amortización Automática (Backend)

Optimizamos el flujo de cobro general (donde no se selecciona un turno específico) para evitar deudas individuales "huérfanas" mientras el balance global disminuía:

* **Distribución Cronológica**: Cuando un pago se registra sin un `id_turno` (abono general), la función `crear_pago` en `backend/crud/finanzas.py` consulta los turnos del paciente en estado `Realizado` con deuda, los ordena de **más antiguo a más reciente**, e imputa fracciones del pago a cada turno hasta saldar sus deudas individuales o agotar el monto entregado.
* **Excedente / Saldo a Favor**: Si el importe entregado supera las deudas, el sobrante se inserta como un pago general flotante (`id_turno = None`) y se acredita a favor del paciente para futuras citas.

---

## 3. Visualización y Layout del Historial Financiero (Frontend)

Rediseñamos la sección financiera del paciente (`subView === 'history'` en `PerfilPacientePage.tsx`) con un enfoque premium y limpio:

* **Bloqueo del Viewport de la Ventana**:
  - Se configuró la vista con `h-screen max-h-screen overflow-hidden` y flex constraints.
  - Evita el scroll vertical residual de 3px a nivel de navegador. El único elemento con scroll activo es la tarjeta del listado de movimientos.
* **Proporción de Grilla 70 - 30**:
  - Reformulada la grilla principal a 10 columnas (`xl:grid-cols-10`), asignando 70% (`xl:col-span-7`) al Historial de Movimientos y 30% (`xl:col-span-3`) al Libro de Caja lateral.
* **Alineación Inferior de Tarjetas**:
  - Se aplicaron clases `items-stretch` al Grid y `mt-auto` al formulario de cobro rápido para empujar las bases de ambas tarjetas a una línea visual inferior idéntica, eliminando espacios muertos.
* **Tabla de Movimientos Contables en 4 Columnas**:
  - Formateada con las columnas: `"Concepto / Fecha"`, `"Costo Total"`, `"Abonado"`, y `"Saldo Restante"`.
  - Los números y entradas monetarias adoptaron el estilo unificado **`font-black tracking-tight`**.

---

## 4. Agrupamiento e Interactividad de Pagos (Acordeón)

* **Jerarquía Visual**:
  - Los cobros correspondientes a un turno específico ya no flotan sueltos; se anidan y muestran indentados justo debajo de su turno correspondiente mediante un indicador gris (`pl-6 border-l-2 border-slate-400 ml-4`).
* **Lógica de Colapso/Accordion**:
  - Implementé el estado reactivo `turnosAbiertos` (`Record<number, boolean>`).
  - Por defecto, los turnos se muestran colapsados.
  - Al hacer clic en un turno con pagos, este se expande revelando los abonos con la animación suave `animate-fade-slide-up`.
  - Agregado el ícono `ChevronRight` que rota dinámicamente (`rotate-90` al abrirse y `rotate-0` al cerrarse). Si el turno no tiene pagos, el chevron se oculta y la fila no responde a clics.
* **Alivio Visual de Separadores**:
  - Se eliminaron las líneas gruesas oscuras de división. Se reemplazaron por separadores finos (`border-t border-slate-200`).
  - Se duplicó la separación vertical entre bloques de turnos, configurando el padding a `py-5`.

---

## 5. Visualización Multi-moneda y Etiquetas Homogéneas (ARS / USD)

Integramos el soporte multi-moneda de forma visual en todas las pantallas financieras:

* **Saldos en Ficha de Paciente**: La tarjeta compacta de balances en el perfil ahora muestra de forma explícita e individualizada el **Saldo Restante Pesos** (ARS) y el **Saldo Restante Dólares** (USD).
* **Métricas Superiores de Tres Tarjetas**: En el historial contable, el panel superior cuenta ahora con 3 tarjetas simétricas en ARS y USD:
  1. **Total Facturado**
  2. **Total Pagado** (Nueva métrica añadida)
  3. **Saldo Deuda Pendiente**
* **Libro de Caja por Divisa**: Separada la métrica "Cobrado hoy" en dos acumuladores contables independientes: "Cobrado hoy (Pesos)" y "Cobrado hoy (Dólares)".
* **Nomenclatura USD**: Reemplazado el uso de los prefijos `U$S` o el símbolo `$` por la sigla homogénea **`USD`** en todas las visualizaciones, listas, dropdowns, inputs, cajón lateral de abonos y ticket del comprobante de cobro de `PerfilPacientePage.tsx` y `PagosPage.tsx`.

---

## 6. Directorio de Pacientes: Alerta "DEUDOR"

* **Ajuste de la Columna "Estado Financiero"**:
  - Modifiqué la columna de Estado Financiero en el directorio principal de pacientes.
  - Cuando un paciente posee deudas activas (`saldo_ars > 0` o `saldo_usd > 0`), se dibuja una etiqueta roja redondeada con el texto en mayúscula **`DEUDOR`** (`text-red-700 bg-red-500/10 border border-red-300/30`), reemplazando la impresión directa de números negativos y emparejándose con el estilo de la etiqueta verde **`Al día`**.
