import { useEffect, useState } from 'react';
import { getCajaHoy, getDeudores, getTurnos, registrarPago, getPagos } from '../services/api';
import type { ResumenCaja, Deudor, Turno, PagoContextoResponse } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp,
  Wallet,
  History,
  Search,
  CheckCircle,
  DollarSign,
  AlertCircle,
  X,
  Calendar,
  Receipt
} from 'lucide-react';

type FiltroCuenta = 'todos' | 'deudores_ars' | 'deudores_usd' | 'aldia';
type PeriodoTipo = 'mes' | 'semana';
type MetodoFiltro = 'todos' | 'efectivo' | 'transferencia' | 'tarjeta';

export default function PagosPage() {
  const toast = useToast();
  const [caja, setCaja] = useState<ResumenCaja | null>(null);
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pestaña principal activa: "deudores" (Cuentas y Deudores) o "pagos" (Libro de Caja)
  const [activeTab, setActiveTab] = useState<'deudores' | 'pagos'>('deudores');
  
  // Filtro predictivo de búsqueda (Nombre, Apellido o DNI)
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState<FiltroCuenta>('todos');

  // ── Registro de pagos ──────────────────────────────────────
  const [pagos, setPagos] = useState<PagoContextoResponse[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('mes');
  const [periodoValor, setPeriodoValor] = useState(''); // e.g. "2026-05"
  const [filtroMetodo, setFiltroMetodo] = useState<MetodoFiltro>('todos');
  const [errorPagos, setErrorPagos] = useState('');

  // Side Sheet y Modal de Ticket
  const [sideSheetOpen, setSideSheetOpen] = useState(false);
  const [cobroPaciente, setCobroPaciente] = useState<Deudor | null>(null);
  const [cobroMoneda, setCobroMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [cobroMonto, setCobroMonto] = useState(0);
  const [cobroMetodo, setCobroMetodo] = useState('efectivo');
  const [cobroNotas, setCobroNotas] = useState('');
  const [cobroTurnoId, setCobroTurnoId] = useState<number | null>(null);
  const [turnosPaciente, setTurnosPaciente] = useState<Turno[]>([]);
  const [cobrando, setCobrando] = useState(false);
  
  // Control de Modal Ticket de Éxito
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    paciente: string;
    monto: number;
    moneda: string;
    metodo: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cajaData, deudoresData] = await Promise.all([
          getCajaHoy(),
          getDeudores(),
        ]);
        if (!cancelled) {
          setCaja(cajaData);
          setDeudores(deudoresData);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const totalDeudaARS = deudores.reduce((s, d) => s + (d.saldo_ars > 0 ? d.saldo_ars : 0), 0);
  const totalDeudaUSD = deudores.reduce((s, d) => s + (d.saldo_usd > 0 ? d.saldo_usd : 0), 0);

  // Filtrado por píldoras de estado
  const deudoresFiltrados = deudores.filter(d => {
    if (filtro === 'deudores_ars') return d.saldo_ars > 0;
    if (filtro === 'deudores_usd') return d.saldo_usd > 0;
    if (filtro === 'aldia') return d.saldo_ars <= 0 && d.saldo_usd <= 0;
    return true;
  });

  // Filtrado predictivo por buscador (Nombre, Apellido o DNI)
  const deudoresFiltradosPorBusqueda = deudoresFiltrados.filter(d => {
    const s = searchTerm.toLowerCase();
    return (
      d.nombre.toLowerCase().includes(s) ||
      d.apellido.toLowerCase().includes(s) ||
      d.dni.toLowerCase().includes(s)
    );
  });

  // ── Helpers para períodos ──────────────────────────────────
  const getMesesOptions = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value });
    }
    return opts;
  };

  const getSemanasOptions = (yearMonth: string) => {
    if (!yearMonth) return [];
    const [y, m] = yearMonth.split('-').map(Number);
    const diasEnMes = new Date(y, m, 0).getDate();
    const semanas = [];
    let dia = 1;
    let numSemana = 1;
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long' });
    while (dia <= diasEnMes) {
      const hastaDia = Math.min(dia + 6, diasEnMes);
      semanas.push({
        label: `${numSemana}ta sem. ${monthName} (${dia.toString().padStart(2, '0')}–${hastaDia.toString().padStart(2, '0')})`,
        desde: `${yearMonth}-${dia.toString().padStart(2, '0')}`,
        hasta: `${yearMonth}-${hastaDia.toString().padStart(2, '0')}`,
      });
      dia += 7;
      numSemana++;
    }
    return semanas;
  };

  // Inicializar período por defecto (solo una vez al montar)
  const mesActual = new Date().toISOString().slice(0, 7);
  useEffect(() => {
    if (!periodoValor) setPeriodoValor(mesActual);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    async function loadPagos() {
      if (!periodoValor) return;
      setLoadingPagos(true);
      setErrorPagos('');
      try {
        let params: Record<string, string> = {};
        if (periodoTipo === 'mes') {
          const [y, m2] = periodoValor.split('-').map(Number);
          const desde = `${periodoValor}-01`;
          const hasta = `${periodoValor}-${new Date(y, m2, 0).getDate().toString().padStart(2, '0')}`;
          params = { fecha_desde: desde, fecha_hasta: hasta };
        } else {
          const semanas = getSemanasOptions(periodoValor.slice(0, 7));
          const sem = semanas.find(s => s.label === periodoValor);
          if (sem) {
            params = { fecha_desde: sem.desde, fecha_hasta: sem.hasta };
          }
        }
        if (filtroMetodo !== 'todos') {
          params.metodo_pago = filtroMetodo;
        }
        const data = await getPagos(params);
        if (!cancelled) setPagos(data);
      } catch {
        if (!cancelled) setErrorPagos('No se pudieron cargar los pagos');
      } finally {
        if (!cancelled) setLoadingPagos(false);
      }
    }
    loadPagos();
    return () => { cancelled = true; };
  }, [periodoValor, periodoTipo, filtroMetodo]);

  const pagosTotalesARS = pagos.reduce((s, p) => p.moneda === 'ARS' ? s + p.monto : s, 0);
  const pagosTotalesUSD = pagos.reduce((s, p) => p.moneda === 'USD' ? s + p.monto : s, 0);

  const chips: { key: FiltroCuenta; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'deudores_ars', label: 'Deudores ARS' },
    { key: 'deudores_usd', label: 'Deudores USD' },
    { key: 'aldia', label: 'Al Día' },
  ];

  async function abrirSideSheet(deudor: Deudor) {
    setCobroPaciente(deudor);
    setCobroMoneda(deudor.saldo_ars > 0 ? 'ARS' : 'USD');
    setCobroMonto(deudor.saldo_ars > 0 ? deudor.saldo_ars : deudor.saldo_usd);
    setCobroMetodo('efectivo');
    setCobroNotas('');
    setCobroTurnoId(null);
    try {
      const turnos = await getTurnos({ paciente_dni: deudor.dni });
      setTurnosPaciente(turnos.filter(t => t.estado === 'Pendiente'));
    } catch {
      setTurnosPaciente([]);
    }
    setSideSheetOpen(true);
  }

  async function handleRegistrarCobro() {
    if (!cobroPaciente || cobroMonto <= 0) return;

    setCobrando(true);
    try {
      await registrarPago({
        monto: cobroMonto,
        moneda: cobroMoneda,
        metodo_pago: cobroMetodo,
        ...(cobroTurnoId ? { id_turno: cobroTurnoId } : {}),
        dni_paciente: cobroPaciente.dni,
        notas: cobroNotas || undefined,
      });

      // ── Optimistic update: reduce local balance immediately ──
      setDeudores(prev => prev.map(d => {
        if (d.dni !== cobroPaciente.dni) return d;
        return {
          ...d,
          saldo_ars: cobroMoneda === 'ARS' ? d.saldo_ars - cobroMonto : d.saldo_ars,
          saldo_usd: cobroMoneda === 'USD' ? d.saldo_usd - cobroMonto : d.saldo_usd,
        };
      }));

      // Guardar información del recibo y abrir modal
      setReceiptData({
        paciente: `${cobroPaciente.apellido}, ${cobroPaciente.nombre}`,
        monto: cobroMonto,
        moneda: cobroMoneda,
        metodo: cobroMetodo === 'efectivo' ? 'Efectivo Billetes' : cobroMetodo === 'transferencia' ? 'Transferencia' : 'Tarjeta',
        timestamp: new Date().toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      });

      setSideSheetOpen(false);
      setShowReceiptModal(true);
      toast.success(`¡Abono de ${cobroMoneda} $${cobroMonto.toLocaleString()} registrado con éxito!`);
    } catch {
      toast.error('Ocurrió un error al registrar el abono.');
    } finally {
      setCobrando(false);
    }
  }

  function getSaldoActual(deudor: Deudor) {
    if (cobroPaciente?.dni === deudor.dni) {
      return { ars: cobroPaciente.saldo_ars, usd: cobroPaciente.saldo_usd };
    }
    return { ars: deudor.saldo_ars, usd: deudor.saldo_usd };
  }

  // Obtener nombre del mes actual para la summary card
  const getMesFiltradoLabel = () => {
    if (!periodoValor) return 'SELECCIONADO';
    if (periodoTipo === 'mes') {
      const [y, m] = periodoValor.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase();
    } else {
      return 'SEMANAL';
    }
  };

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10 font-sans" id="payments-module-root">
      
      {/* HEADER EDITORIAL (Sencillo, idéntico a las demás vistas, sin logo negro) */}
      <header className="mb-8 animate-fade-slide-up flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Gestión Financiera
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-1 pl-0.5">
            Libro contable y amortización de deudas multi-moneda (ARS / USD)
          </p>
        </div>
      </header>

      {/* 📊 INDICADORES BENTO (SIEMPRE VISIBLES POR ARRIBA DE LAS SOLAPAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" id="always-visible-metrics-grid">
        
        {/* Recaudación diaria - Verde Esmeralda (Números en verde médico) */}
        <div className="bg-white border border-slate-200/50 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4">
          <div className="space-y-3 w-full">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Recaudación Agregada Diaria (Hoy)
            </span>
            <div className="grid grid-cols-2 gap-4 divide-l divide-slate-100">
              <div className="pr-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Pesos Argentinos</span>
                <span className="text-xl md:text-2xl font-black text-emerald-650 font-sans">
                  $ {loading ? '-' : (caja?.ingresos_ars ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="pl-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Dólares Americanos</span>
                <span className="text-xl md:text-2xl font-black text-emerald-650 font-sans">
                  USD {loading ? '-' : (caja?.ingresos_usd ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cartera de Saldos / Deudas - Rojo Coral */}
        <div className="bg-white border border-slate-200/50 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4">
          <div className="space-y-3 w-full">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-rose-600" />
              Cartera de Saldos a Cobrar (Deudores)
            </span>
            <div className="grid grid-cols-2 gap-4 divide-l divide-slate-100">
              <div className="pr-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Deuda ARS</span>
                <span className="text-xl md:text-2xl font-black text-rose-700 font-sans">
                  $ {loading ? '-' : totalDeudaARS.toLocaleString('es-AR')}
                </span>
              </div>
              <div className="pl-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Deuda USD</span>
                <span className="text-xl md:text-2xl font-black text-rose-700 font-sans">
                  USD {loading ? '-' : totalDeudaUSD.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 CONTROL CENTRAL DE PESTAÑAS DE DOBLE COLOR (CON MAYOR PRESENCIA DE COLOR Y ANIMACIÓN) */}
      <div className="flex justify-center mb-8" id="payments-view-tabs">
        <div className="bg-slate-100 p-1.5 rounded-2xl flex relative w-full max-w-xl border border-slate-200/80 shadow-inner">
          
          {/* BOTÓN 1: Cuentas y Deudores (Slide Rojo Coral/Carmín Lleno) */}
          <button
            onClick={() => setActiveTab('deudores')}
            className="relative flex-grow py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all z-10"
          >
            {activeTab === 'deudores' && (
              <motion.div
                layoutId="activeTabSelectionHighlight"
                className="absolute inset-0 bg-red-100 rounded-xl border border-red-250/70 -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              />
            )}
            <Wallet className={`w-4 h-4 z-10 transition-colors duration-200 ${activeTab === 'deudores' ? 'text-rose-700' : 'text-slate-550'}`} />
            <span className={`z-10 transition-colors duration-200 ${activeTab === 'deudores' ? 'text-rose-900' : 'text-slate-550 hover:text-slate-800'}`}>
              Cuentas y Deudores
            </span>
          </button>

          {/* BOTÓN 2: Libro de Caja (Slide Verde Esmeralda Lleno) */}
          <button
            onClick={() => setActiveTab('pagos')}
            className="relative flex-grow py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all z-10"
          >
            {activeTab === 'pagos' && (
              <motion.div
                layoutId="activeTabSelectionHighlight"
                className="absolute inset-0 bg-emerald-100 rounded-xl border border-emerald-250/70 -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              />
            )}
            <History className={`w-4 h-4 z-10 transition-colors duration-200 ${activeTab === 'pagos' ? 'text-emerald-700' : 'text-slate-550'}`} />
            <span className={`z-10 transition-colors duration-200 ${activeTab === 'pagos' ? 'text-emerald-900' : 'text-slate-550 hover:text-slate-800'}`}>
              Registro de Pagos
            </span>
          </button>
        </div>
      </div>

      {/* CONTENIDOS DINÁMICOS CON TRANSICIÓN */}
      <AnimatePresence mode="wait">
        {activeTab === 'deudores' ? (
          <motion.div
            key="deudores-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            
            {/* BUSCADOR PREDICTIVO + CHIPS SUBFILTROS */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
              
              {/* Buscador predictivo interactivo */}
              <div className="relative w-full lg:max-w-md">
                <span className="absolute left-4 top-3 text-slate-450">
                  <Search className="w-5 h-5 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar deudor por Nombre, Apellido o DNI..."
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 transition-all font-medium text-slate-800"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-650"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sub-filtros deslizantes en cápsula */}
              <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 relative w-full lg:w-auto overflow-x-auto">
                {chips.map(chip => (
                  <button
                    key={chip.key}
                    onClick={() => setFiltro(chip.key)}
                    className="relative px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer z-10 text-slate-500 hover:text-slate-800 whitespace-nowrap"
                    style={{ color: filtro === chip.key ? '#0f172a' : undefined }}
                  >
                    {filtro === chip.key && (
                      <motion.div
                        layoutId="activeCuentasFilter"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TABLA DE CUENTAS DE PACIENTES */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="text-slate-450 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-4">Paciente de OdontoGest</th>
                      <th className="px-6 py-4">Teléfono</th>
                      <th className="px-6 py-4 text-right">Saldo ARS (Pesos)</th>
                      <th className="px-6 py-4 text-right">Saldo USD (Dólares)</th>
                      <th className="px-6 py-4 text-center">Acciones Contables</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          <div className="flex justify-center items-center gap-2">
                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></span>
                            <span>Consultando estados de cuenta...</span>
                          </div>
                        </td>
                      </tr>
                    ) : deudoresFiltradosPorBusqueda.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          <CheckCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                          <p className="font-bold text-slate-700">Sin deudores registrados</p>
                          <p className="text-xs text-slate-400 mt-1">Todos los pacientes coinciden con la selección de filtros</p>
                        </td>
                      </tr>
                    ) : (
                      deudoresFiltradosPorBusqueda.map((deudor, i) => {
                        const saldo = getSaldoActual(deudor);
                        const tieneDeuda = saldo.ars > 0 || saldo.usd > 0;
                        return (
                          <tr
                            key={deudor.dni}
                            className="bg-white hover:bg-slate-50/80 transition-colors"
                            style={{ animationDelay: `${i * 20}ms` }}
                          >
                            {/* Paciente, DNI y Obra Social */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-[15px] tracking-tight">
                                  {deudor.apellido}, {deudor.nombre}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-[11px] text-slate-400 font-bold">DNI: {deudor.dni}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                    {deudor.obra_social || 'Particular'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            {/* Teléfono */}
                            <td className="px-6 py-4 text-slate-600 font-bold">
                              {deudor.telefono || '—'}
                            </td>
                            {/* Saldo ARS */}
                            <td className="px-6 py-4 text-right">
                              {saldo.ars > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 font-sans">
                                  - $ {saldo.ars.toLocaleString('es-AR')} ARS
                                </span>
                              ) : saldo.ars < 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 font-sans">
                                  + $ {Math.abs(saldo.ars).toLocaleString('es-AR')} ARS (A Favor)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-bold">$ 0</span>
                              )}
                            </td>
                            {/* Saldo USD */}
                            <td className="px-6 py-4 text-right">
                              {saldo.usd > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 font-sans">
                                  - USD {saldo.usd.toLocaleString('es-AR')}
                                </span>
                              ) : saldo.usd < 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 font-sans">
                                  + USD {Math.abs(saldo.usd).toLocaleString('es-AR')} (A Favor)
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-bold">USD 0</span>
                              )}
                            </td>
                            {/* Acción (Botón Rectangular y de Color Elegante) */}
                            <td className="px-6 py-4 text-center">
                              {tieneDeuda ? (
                                <button
                                  onClick={() => abrirSideSheet(deudor)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer mx-auto"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  Registrar Pago
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-black uppercase text-[10px] tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Saldado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="pagos-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            
            {/* 1. PANEL DE FILTROS (HEADER DE CONTROL - FILA HORIZONTAL DE SELECTS) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-xs flex flex-row justify-start items-center gap-4 flex-wrap" id="header-filters-panel">
              
              {/* Selector Mes de Caja */}
              <div className="flex flex-col relative w-full sm:w-auto">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1 block">MES DE CAJA</span>
                <select
                  value={periodoValor}
                  onChange={e => setPeriodoValor(e.target.value)}
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white outline-none pr-8 cursor-pointer min-w-[180px]"
                >
                  {getMesesOptions().map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Selector Filtro Semana */}
              <div className="flex flex-col relative w-full sm:w-auto">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1 block">FILTRO SEMANA</span>
                <select
                  value={periodoTipo === 'mes' ? 'todos' : periodoValor}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'todos') {
                      setPeriodoTipo('mes');
                      const mes = periodoValor.includes('-W') ? periodoValor.slice(0, 7) : periodoValor;
                      setPeriodoValor(mes);
                    } else {
                      setPeriodoTipo('semana');
                      setPeriodoValor(val);
                    }
                  }}
                  className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white outline-none pr-8 cursor-pointer min-w-[200px]"
                >
                  <option value="todos">TODAS LAS SEMANAS</option>
                  {periodoValor && getSemanasOptions(periodoValor.slice(0, 7)).map(s => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Selector Tipo Periodo Toggle Sutil */}
              <div className="flex flex-col relative w-full sm:w-auto sm:ml-auto">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1 block">TIPO PERIODO</span>
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200/50">
                  {(['mes', 'semana'] as PeriodoTipo[]).map(pt => (
                    <button
                      key={pt}
                      onClick={() => {
                        setPeriodoTipo(pt);
                        setPeriodoValor(pt === 'mes' ? mesActual : getSemanasOptions(mesActual)[0]?.label ?? '');
                      }}
                      className="relative px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer z-10 text-slate-500 hover:text-slate-800"
                      style={{ color: periodoTipo === pt ? '#0f172a' : undefined }}
                    >
                      {periodoTipo === pt && (
                        <motion.div
                          layoutId="activePeriodoTipoFilter"
                          className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      {pt === 'mes' ? 'Mensual' : 'Semanal'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TARJETA DE MÉTRICAS (DASHBOARD SUMMARY CARD EN GRIS/AZUL TENUE #F4F6FA) */}
            {!loadingPagos && (
              <div className="bg-[#F4F6FA] border border-slate-200/40 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6" id="dashboard-summary-card">
                
                {/* Contenido Izquierdo */}
                <div className="space-y-2 z-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    TOTAL COBRADO EN {getMesFiltradoLabel()} (FILTRADO)
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold">Resumen de transacciones conciliadas en el periodo actual</p>
                </div>

                {/* Dos columnas divididas por línea fina */}
                <div className="grid grid-cols-2 gap-8 divide-l divide-slate-300/60 z-10">
                  <div className="pr-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pesos ARS</span>
                    <span className="text-2xl md:text-3xl font-black text-slate-800 font-sans tracking-tight block mt-1">
                      $ {pagosTotalesARS.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="pl-6">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Dólares USD</span>
                    <span className="text-2xl md:text-3xl font-black text-slate-800 font-sans tracking-tight block mt-1">
                      USD {pagosTotalesUSD.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Icono visual de tendencia difuminado en la esquina derecha */}
                <div className="absolute right-6 bottom-4 md:bottom-2 opacity-5 pointer-events-none transform scale-150 text-indigo-950 z-0">
                  <TrendingUp className="w-24 h-24" />
                </div>
              </div>
            )}

            {/* 3. BARRA DE NAVEGACIÓN DE PESTAÑAS DE MÉTODOS DE PAGO (TAB SEGMENTED CONTROL) */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex relative w-full border border-slate-200 shadow-inner" id="methods-segmented-tabs">
              {(['todos', 'efectivo', 'transferencia', 'tarjeta'] as MetodoFiltro[]).map(m => {
                const isActive = filtroMetodo === m;
                
                // Colores específicos para los estados activos solicitados por el usuario
                let activeTextClass = 'text-slate-900 font-black';
                if (isActive) {
                  if (m === 'efectivo') activeTextClass = 'text-emerald-700 font-black';
                  else if (m === 'transferencia') activeTextClass = 'text-blue-700 font-black';
                  else if (m === 'tarjeta') activeTextClass = 'text-amber-700 font-black'; // dorado sutil
                }

                return (
                  <button
                    key={m}
                    onClick={() => setFiltroMetodo(m)}
                    className="relative flex-grow py-3.5 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer z-10 flex items-center justify-center gap-1.5"
                    style={{ color: isActive ? undefined : '#64748b' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeMetodoFilter"
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50 -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={isActive ? activeTextClass : 'text-slate-500 hover:text-slate-700 font-bold'}>
                      {m === 'todos' ? 'TODOS' : m === 'efectivo' ? 'EFECTIVO' : m === 'transferencia' ? 'TRANSFERENCIA' : 'TARJETA'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 4. LISTA DE TRANSACCIONES (FEED DE TARJETAS CLINICAS INDEPENDIENTES) */}
            <div className="space-y-4" id="transactions-cards-feed">
              {loadingPagos ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/60 shadow-xs">
                  <div className="flex justify-center items-center gap-2">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></span>
                    <span className="text-slate-400 font-semibold text-sm">Cargando transacciones contables...</span>
                  </div>
                </div>
              ) : errorPagos ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/60 shadow-xs text-rose-500 font-bold">
                  {errorPagos}
                </div>
              ) : pagos.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/60 shadow-xs text-slate-450">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700">Sin movimientos registrados</p>
                  <p className="text-xs text-slate-400 mt-1">No hay cobros bajo este periodo o método seleccionado</p>
                </div>
              ) : (
                pagos.map(pago => (
                  <motion.div
                    key={pago.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                  >
                    {/* Bloque Izquierdo: Paciente, Fecha, Notas y Badges */}
                    <div className="space-y-2.5">
                      
                      {/* Línea 1: Nombre en MAYÚSCULAS y NEGRITA */}
                      <h4 className="font-black text-[15px] text-slate-850 tracking-tight">
                        {pago.paciente 
                          ? `${pago.paciente.apellido.toUpperCase()}, ${pago.paciente.nombre.toUpperCase()}`
                          : 'PAGO DIRECTO A CUENTA'}
                      </h4>

                      {/* Línea 2: Fecha (AAAA-MM-DD) y DNI: XXXXXXXX con punto medio */}
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                        <span>{new Date(pago.fecha_pago).toISOString().slice(0, 10)}</span>
                        <span className="text-slate-350 font-black">•</span>
                        <span>DNI: {pago.dni_paciente || (pago.paciente ? pago.paciente.dni : '—')}</span>
                      </p>

                      {/* Línea 3: Notas entre comillas e itálica cursiva */}
                      {pago.metodo_pago && (
                        <p className="text-xs text-slate-450 italic font-medium leading-relaxed">
                          "{pago.metodo_pago.toLowerCase() === 'efectivo' 
                            ? (pago.dni_paciente ? `Abono de saldo en efectivo billetes.` : `Abono de saldo en efectivo.`)
                            : (pago.dni_paciente ? `Cobro a cuenta percibido vía transferencia digital.` : `Cobro vía transferencia.`)}"
                          {pago.id_turno ? ` enlazado a sesión #${pago.id_turno}.` : ''}
                        </p>
                      )}

                      {/* Línea 4: Etiquetas / Badges */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="text-[9px] font-black uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {pago.id_turno ? `TURNO #${pago.id_turno}` : 'CONCEPTO DIRECTO'}
                        </span>
                        {pago.doctor && (
                          <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                            PROFESIONAL: {pago.doctor.nombre.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloque Derecho: Monto en Verde Médico y Método */}
                    <div className="text-left sm:text-right shrink-0 flex sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                      <div>
                        {/* Importe en verde médico/esmeralda exitoso #00875A */}
                        <span className="text-lg md:text-xl font-black text-[#00875A] font-sans block">
                          {pago.moneda === 'ARS' ? '$' : 'USD'} {pago.monto.toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="flex flex-col sm:items-end">
                        {/* Badge o etiqueta pequeña de método */}
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          pago.metodo_pago === 'efectivo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : pago.metodo_pago === 'transferencia'
                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {pago.metodo_pago.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📥 CAJÓN LATERAL DE AMORTIZACIÓN (SIDE SHEET DRAWER) */}
      <AnimatePresence>
        {sideSheetOpen && cobroPaciente && (
          <div className="fixed inset-0 z-50 flex justify-end">
            
            {/* Backdrop oscuro */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideSheetOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />
            
            {/* Cajón lateral */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative bg-white w-full max-w-lg h-full shadow-2xl flex flex-col z-10 font-sans border-l border-slate-100"
            >
              
              {/* Encabezado Cajón */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="bg-slate-900 text-white p-2 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </span>
                    Registrar Abono
                  </h2>
                  <p className="text-xs text-slate-450 font-bold mt-1.5">
                    {cobroPaciente.apellido}, {cobroPaciente.nombre}
                  </p>
                </div>
                <button
                  onClick={() => setSideSheetOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido Cajón */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* Banner de Deuda Vigente */}
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block mb-1">Deuda Pendiente Actual</span>
                    <p className="text-2xl font-black text-rose-800 font-sans">
                      {cobroMoneda === 'ARS'
                        ? `$ ${cobroPaciente.saldo_ars.toLocaleString('es-AR')} ARS`
                        : `USD ${cobroPaciente.saldo_usd.toLocaleString('es-AR')}`}
                    </p>
                  </div>
                  <Wallet className="w-10 h-10 text-rose-500/30" />
                </div>

                {/* Formulario */}
                <div className="space-y-5">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
                    Detalle Contable del Abono
                  </h3>

                  {/* Selector Divisa */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Moneda del Abono</label>
                    <select
                      value={cobroMoneda}
                      onChange={e => {
                        setCobroMoneda(e.target.value as 'ARS' | 'USD');
                        setCobroMonto(0);
                      }}
                      className="w-full mt-1.5 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 bg-slate-50 font-bold text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="ARS">Pesos Argentinos (ARS)</option>
                      <option value="USD">Dólares Americanos (USD)</option>
                    </select>
                  </div>

                  {/* Monto de Pago */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Monto a Entregar</label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-4 top-3.5 text-slate-450 font-black text-sm">
                        {cobroMoneda === 'ARS' ? '$' : 'USD'}
                      </span>
                      <input
                        type="number"
                        value={cobroMonto || ''}
                        onChange={e => setCobroMonto(Number(e.target.value))}
                        onWheel={e => e.currentTarget.blur()}
                        placeholder="Ej: 15000"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 outline-none font-black text-slate-800 text-lg font-sans"
                      />
                    </div>
                  </div>

                  {/* Alerta de exceso flexible e inteligente */}
                  {(() => {
                    const deudaMax = cobroMoneda === 'ARS'
                      ? cobroPaciente.saldo_ars
                      : cobroPaciente.saldo_usd;
                    const excede = cobroMonto > deudaMax;

                    if (excede && cobroMonto > 0) {
                      const excedente = cobroMonto - (deudaMax > 0 ? deudaMax : 0);
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3"
                        >
                          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-blue-800 block">Excedente de amortización</span>
                            <p className="text-[11px] text-blue-700/90 font-semibold mt-1 leading-relaxed">
                              El monto consignado supera la deuda. El sobrante de{' '}
                              <strong className="font-bold">
                                {cobroMoneda} ${excedente.toLocaleString('es-AR')}
                              </strong>{' '}
                              será acreditado como un saldo a favor en la cuenta corriente del paciente para próximas consultas.
                            </p>
                          </div>
                        </motion.div>
                      );
                    }
                    return null;
                  })()}

                  {/* Método */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Método de Cobro</label>
                    <select
                      value={cobroMetodo}
                      onChange={e => setCobroMetodo(e.target.value)}
                      className="w-full mt-1.5 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 bg-white font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="efectivo">Efectivo Billetes</option>
                      <option value="transferencia">Transferencia (MercadoPago/Banco)</option>
                      <option value="tarjeta">Tarjeta (Crédito/Débito)</option>
                    </select>
                  </div>

                  {/* Turno Vinculado */}
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Turno en Agenda Relacionado</label>
                    <select
                      value={cobroTurnoId || ''}
                      onChange={e => setCobroTurnoId(Number(e.target.value))}
                      className="w-full mt-1.5 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500 bg-white font-bold text-slate-750 outline-none cursor-pointer"
                    >
                      <option value="">Abono general (No imputado a turno)</option>
                      {turnosPaciente.map(t => (
                        <option key={t.id} value={t.id}>
                          #{t.id} - {t.motivo || 'Sin motivo'} ({new Date(t.fecha_hora).toLocaleDateString('es-AR')})
                        </option>
                      ))}
                      {turnosPaciente.length === 0 && (
                        <option value="" disabled>Sin turnos pendientes en agenda</option>
                      )}
                    </select>
                  </div>

                  {/* Botón de Acción */}
                  <div className="pt-4">
                    <button
                      onClick={handleRegistrarCobro}
                      disabled={cobrando || cobroMonto <= 0}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Receipt className="w-5 h-5" />
                      {cobrando ? 'Procesando Abono...' : 'Confirmar Registro de Pago'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎉 RECIBO Y MODAL DE CONFIRMACIÓN DE ABONO */}
      <AnimatePresence>
        {showReceiptModal && receiptData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop con desenfoque de fondo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReceiptModal(false)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-md cursor-pointer"
            />
            
            {/* Modal de Ticket contable */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl z-10 flex flex-col items-center text-center font-sans border border-slate-100"
            >
              
              {/* Halo animado con check */}
              <div className="relative mb-6">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 bg-emerald-500/10 rounded-full scale-125"
                />
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 relative z-10">
                  <CheckCircle className="w-10 h-10" />
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-900 tracking-tight">¡Abono Aprobado!</h3>
              <p className="text-xs text-slate-450 font-bold mt-1.5 uppercase tracking-wider">Comprobante de Caja Diaria</p>
              
              {/* Ticket Físico estilizado */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl w-full p-5 mt-6 space-y-3.5 text-left text-sm">
                
                <div className="flex justify-between items-start gap-4">
                  <span className="text-slate-450 text-[10px] font-black uppercase tracking-wider">Paciente:</span>
                  <span className="font-bold text-slate-800 text-right">{receiptData.paciente}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200/50 pt-3">
                  <span className="text-slate-450 text-[10px] font-black uppercase tracking-wider">Importe Recibido:</span>
                  <span className="font-black text-lg text-[#00875A] font-sans">
                    {receiptData.moneda === 'ARS' ? '$' : 'USD'} {receiptData.monto.toLocaleString('es-AR')}{' '}
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-200/30 px-1.5 py-0.5 rounded-md ml-1 font-sans">
                      {receiptData.moneda}
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200/50 pt-3">
                  <span className="text-slate-450 text-[10px] font-black uppercase tracking-wider">Método de Pago:</span>
                  <span className="font-bold text-slate-800">{receiptData.metodo}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200/50 pt-3">
                  <span className="text-slate-450 text-[10px] font-black uppercase tracking-wider">Marca de Tiempo:</span>
                  <span className="font-bold text-slate-500 text-xs">{receiptData.timestamp}</span>
                </div>
              </div>

              {/* Botón de cierre */}
              <button
                onClick={() => setShowReceiptModal(false)}
                className="mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl w-full hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Finalizar Transacción
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}