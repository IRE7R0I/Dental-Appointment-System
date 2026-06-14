# 💳 Mapeo Técnico, Ficha de Diseño y Prompt — Módulo de Cuentas Corrientes y Pagos Clínicos

Este documento especifica con lujo de detalles la arquitectura visual, estructural e interactiva del módulo de gestión financiera en dos monedas de **OdontoGest**. Puedes descargar este archivo Markdown o copiar su contenido directamente para dárselo a **Antigravity** u otro agente de desarrollo para replicarlo con absoluta fidelidad.

---

## 🎨 Ficha de Estilo y Decisiones de Diseño Principal (Design Ledger)

### 1. Tipografía Unificada ("Zero-Larping" Number Rule)
- Se prohíbe terminantemente el uso de fuentes monoespaciadas (`font-mono`) en balances financieros, importes, identificadores de DNI o fechas. 
- Todos los números de la interfaz utilizan la fuente primaria sans-serif de alta legibilidad **Inter** (`font-sans`), jerarquizada con pesos avanzados (`font-black`, `font-extrabold` o `font-bold`), logrando un acabado editorial moderno, limpio y de alta gama en lugar de un estilo de terminal de computación.

### 2. Estructura de Navegación "Always-On" (Métricas Siempre Visibles)
- Los indicadores clave de rendimiento (KPIs) en estilo Bento están posicionados en la cima de la pantalla por encima de las pestañas de selección. Esto asegura que la administración posea visualización continua sobre la liquidez sin importar la pestaña activa.
- Debajo de estos KPIs se encuentra la barra de navegación centralizada con el diseño de cápsula deslizante.

### 3. Pestañas de Navegación de Doble Tono (Dual-Chrome Sliding Tabs)
La barra de selección de vistas cuenta con un diseño de cápsula responsiva con transiciones de resorte (`spring` animations) que diferencian temáticamente cada solapa:
- **Pestaña "Cuentas y Deudores"**: Muestra un sutil tono carmín de advertencia cuando está activa. El fondo deslizante se colorea en un suave rosa pastel `bg-red-100/75 border-red-200/60` con tipografía en rojo profundo `text-rose-800` y el icono `Wallet` en carmín `text-rose-600`.
- **Pestaña "Registro de Pagos"**: Muestra un sutil tono verde esmeralda de liquidez/ingresos cuando está activa. El fondo deslizante se colorea en un suave verde pastel `bg-emerald-100/75 border-emerald-200/60` con tipografía de esmeralda profundo `text-emerald-805` y el icono `History` en verde de caja `text-emerald-650`.

---

## 📋 Especificaciones Estructurales por Componentes

### 📊 Componente A: Indicadores Bento Superiores (Siempre Visibles)
Se despliegan horizontalmente en pantallas medianas/grandes y se apilan en móviles:
1. **Recaudación Agregada Diaria (Hoy)**:
   - Título con etiqueta en mayúsculas pequeñas e icono `Coins` en verde esmeralda.
   - Desglose paralelo de monedas lado a lado: Pesos Argentinos (ARS) en gris grafito profundo `$ {monto}` y Dólares Americanos (USD) en esmeralda vibrante `U$S {monto}` (`text-emerald-650`).
2. **Cartera de Saldos a Cobrar (Métrica de Deuda)**:
   - Título con etiqueta superior e icono `Wallet` en carmín de peligro.
   - Desglose paralelo de deuda acumulada: Deuda ARS `$ {monto}` en carmín (`text-rose-700`) y Deuda USD `U$S {monto}` en el mismo carmín de alerta.

### 🎯 Componente B: Pestaña 1 - Control de Cuentas Corrientes
Se encarga de listar y filtrar las deudas activas e individuales de los pacientes en tiempo real:

1. **Filtro Predictivo con Buscador**:
   - Input interactivo estilizado con lupa incorporada (`Search`). Permite tipear instantáneamente letras o números para filtrar la grilla coincidiento por Nombre, Apellido o DNI.
2. **Sub-Filtros Deslizantes en Cápsula (Píldoras de Estado)**:
   - Contenedor con base gris esmerilado `bg-slate-100 p-1 rounded-xl` y deslizador interno blanco animado a través de un `layoutId` de Framer Motion. 
   - Las opciones son: **Todos**, **D. Pesos**, **D. Dólar**, y **Al Día**.
3. **Grilla / Tabla de Pacientes**:
   - Cabeceras alineadas con tipografía gruesa sans-serif en tonos pastel.
   - Filas dinámicas en contenedor `bg-white/45` con efecto hover suave.
   - Estricto soporte paralelo multi-moneda: muestra balances pendientes en ARS y balance en USD de forma apilada por paciente. 
   - Si no hay deuda en una moneda, se muestra un color tenue gris `$ 0`, y si existe saldo deudor, se colorea automáticamente en carmín caliente `text-red-650`.
   - Botón interactivo de caja **"Registrar Cobro"** de color azul refinado con icono de dólar que invoca la hoja de pago.
   - Si no hay deudas asociadas en ninguna divisa, la fila reemplaza el botón por un badge permanente esmerilado verde esmeralda que lee **"Saldado"** con icono de check.

### 📜 Componente C: Pestaña 2 - Libro Diario de Caja (Registro de Pagos)
Registra el listado contable minucioso de transacciones aprobadas bajo un diseño de libro diario clínico:

1. **Filtros de Período Temporal**:
   - Control desplegable (`select`) para cambiar el Mes de Auditoría (Enero - Diciembre).
   - Control desplegable para filtrar selectivamente por semanas específicas del mes (Todas, Semana 1, Semana 2, Semana 3, Semana 4, Semana 5).
2. **Banner de Caja Filtrada en Degradé**:
   - Un contenedor con degradado `bg-gradient-to-r from-blue-50/70 to-indigo-50/70` que muestra la suma total neta cobrada bajo el periodo seleccionado de forma gigante. Consolidando subtotales limpios en ARS y USD de forma paralela.
3. **Filtro de Método de Pago por Cápsula Deslizante**:
   - Píldoras de filtrado en cápsula esmerilada con transiciones animadas para elegir entre: **Todos**, **Efectivo** (verde esmeralda activo), **Transferencia** (azul/índigo activo), y **Tarjeta** (azul marino activo).
4. **Historial de Cobros Recibidos**:
   - Un histórico deslizable de transacciones que expone detalladamente el paciente, el DNI, la fecha, notas o comentarios consignados para la auditoría, y el turno enlazado si lo hubiere.
   - El monto obtenido se colorea en un verde bosque en negrita (`text-emerald-700`) junto con el método de cobro correspondiente.

### 📥 Componente D: Cajón Lateral de Amortización (Side Sheet Drawer)
Un panel deslizante interactivo que emerge desde el flanco derecho del navegador con un desvanecimiento oscuro de fondo:
- **Detalle de Cuenta Activa**: Expone el nombre completo del paciente, Seguro Médico e Identificación de DNI.
- **Información del Saldo Vigente**: Alerta en rojo con la deuda calculada del paciente en ambas monedas correlativas.
- **Selector Exclusivo de Divisa de Pago**: El usuario selecciona si el pago ingresa en **ARS** o **USD**.
- **Control Inteligente de Validación**:
  - Un validador que evalúa si el monto consignado por el operador supera el saldo que adeuda el paciente.
  - Al superar el saldo, se despliega preventivamente un aviso con advertencia e icono que explica la situación y aclara que la cuantía restante será acreditada como un abono positivo a favor del usuario para futuras consultas.
- **Detalles Contables Anexos**: selector de método de cobro elegido (Efectivo, Transferencia, Tarjeta), selector de turnos vinculados al paciente en agenda, y un bloque libre de anotaciones y justificaciones contables.

### 🎉 Componente E: Recibo y Modal de Confirmación
Pantalla flotante central que bloquea la interacción exterior una vez procesado el abono:
- Presenta un círculo con halo verde brillante y oscilación sutil.
- Muestra el ticket de pago detallando de forma elegante: Nombre del Paciente, Importe Recibido y Divisa Cobrada, Método de Pago Registrado, y Marca de Tiempo Exacta de Entrada a la Caja.

---

## 👩‍💻 Ejemplo del Setup de la Vista (Snippet de Referencia de Maquetación para Antigravity)

A continuación se adjunta la estructura JSX del componente para que Antigravity lo replique estructuralmente:

```tsx
export default function PaymentsDemo() {
  const [activeTab, setActiveTab] = useState<"deudores" | "pagos">("deudores");

  return (
    <div className="space-y-6" id="payments-demo-root">
      
      {/* 📊 INDICADORES BENTO (SIEMPRE VISIBLES EN AMBAS CONSOLAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="always-visible-metrics-grid">
        {/* Recaudación Diaria - Verde Esmeralda */}
        <div className="bg-white/65 border border-white/50 backdrop-blur-md rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="space-y-2 font-sans">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Recaudación Agregada Diaria (Hoy)</span>
            <div className="grid grid-cols-2 gap-8 text-sans">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Pesos Argentinos</span>
                <span className="text-2xl font-black text-slate-850">$ {totalARS}</span>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Dólares Americanos</span>
                <span className="text-2xl font-black text-emerald-650">U$S {totalUSD}</span>
              </div>
            </div>
          </div>
          <TrendingUp className="w-12 h-12 text-emerald-600 bg-emerald-500/10 p-3 rounded-2xl" />
        </div>

        {/* Cartera de Saldos / Deudas - Rojo Coral */}
        <div className="bg-white/65 border border-white/50 backdrop-blur-md rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="space-y-2 font-sans">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cartera de Saldos a Cobrar (Deudores)</span>
            <div className="grid grid-cols-2 gap-8 text-sans">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Deuda ARS</span>
                <span className="text-2xl font-black text-rose-700">$ {deudaARS}</span>
              </div>
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Deuda USD</span>
                <span className="text-2xl font-black text-rose-700">U$S {deudaUSD}</span>
              </div>
            </div>
          </div>
          <ArrowDownLeft className="w-12 h-12 text-rose-600 bg-rose-500/10 p-3 rounded-2xl" />
        </div>
      </div>

      {/* 🎯 CONTROL CENTRAL DE PESTAÑAS CON RESALTE DE DOBLE COLOR */}
      <div className="flex justify-center" id="payments-view-tabs">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex relative w-full max-w-lg border border-slate-250/60 shadow-inner">
          
          {/* BOTÓN 1: Cuentas y Deudores (Slide Rojo Coral) */}
          <button
            onClick={() => setActiveTab("deudores")}
            className="relative flex-grow py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {activeTab === "deudores" && (
              <motion.div
                layoutId="activeTabSelectionHighlight"
                className="absolute inset-0 bg-red-100/75 rounded-xl border border-red-200/60"
              />
            )}
            <Wallet className="w-4 h-4 text-rose-600 z-10" />
            <span className={activeTab === "deudores" ? "text-rose-800 z-10" : "text-slate-550 hover:text-slate-800 z-10"}>
              Cuentas y Deudores
            </span>
          </button>

          {/* BOTÓN 2: Registro de Pagos (Slide Verde Esmeralda) */}
          <button
            onClick={() => setActiveTab("pagos")}
            className="relative flex-grow py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {activeTab === "pagos" && (
              <motion.div
                layoutId="activeTabSelectionHighlight"
                className="absolute inset-0 bg-emerald-100/75 rounded-xl border border-emerald-200/60"
              />
            )}
            <History className="w-4 h-4 text-emerald-650 z-10" />
            <span className={activeTab === "pagos" ? "text-emerald-805" : "text-slate-550 hover:text-slate-800 z-10"}>
              Registro de Pagos
            </span>
          </button>

        </div>
      </div>

      {/* CONTENIDOS DINÁMICOS CON TRANSICIÓN */}
      <AnimatePresence mode="wait">
        {activeTab === "deudores" ? (
          <motion.div key="deudores-tab" className="space-y-6">
            {/* Buscador + Sub-Filtros en Cápsula Deslizante */}
          </motion.div>
        ) : (
          <motion.div key="pagos-tab" className="space-y-6">
            {/* Periódos + Banner Caja en Degradé + Filtro de Métodos Deslizante */}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}