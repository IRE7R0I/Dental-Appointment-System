import React, { useEffect, useState } from 'react';
import { getCajaHoy, getDeudores, registrarPago, getPagos, getHistorialPaciente } from '../services/api';
import type { ResumenCaja, Deudor, PagoContextoResponse, HistorialTurnoItemResponse } from '../types';
import { globalCache } from '../services/cache';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';
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
  Receipt,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type FiltroCuenta = 'todos' | 'deudores_ars' | 'deudores_usd';

interface MiniDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
}

function MiniDatePicker({ value, onChange, label }: MiniDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const MESES_NOMBRES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const paddingDays = Array.from({ length: firstDayIndex }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getDisplayDate = () => {
    if (!value) return 'Seleccionar...';
    const dateObj = new Date(value + 'T12:00:00');
    return dateObj.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="relative flex flex-col w-full sm:w-auto">
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1 block">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-bold bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer min-w-[160px] justify-between shadow-xs"
      >
        <span className="truncate">{getDisplayDate()}</span>
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute left-0 top-full mt-2 z-50 solid-popover border border-slate-200 rounded-2xl p-4 shadow-xl w-64"
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-600"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {MESES_NOMBRES[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-slate-600"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                <div key={d} className="font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
              {paddingDays.map((_, idx) => (
                <div key={`pad-${idx}`} className="py-1"></div>
              ))}
              {days.map(day => {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = value === dateStr;
                const isToday = new Date().toISOString().slice(0, 10) === dateStr;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      onChange(dateStr);
                      setIsOpen(false);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center h-8 w-8 mx-auto ${isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isToday
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
type MetodoFiltro = 'todos' | 'efectivo' | 'transferencia' | 'tarjeta';

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

export default function PagosPage() {
  const toast = useToast();
  const [caja, setCaja] = useState<ResumenCaja | null>(globalCache.pagos.caja);
  const [deudores, setDeudores] = useState<Deudor[]>(globalCache.pagos.deudores);
  const [loading, setLoading] = useState(!globalCache.pagos.caja && globalCache.pagos.deudores.length === 0);

  // Pestaña principal activa: "deudores" (Cuentas y Deudores) o "pagos" (Libro de Caja)
  const [activeTab, setActiveTab] = useState<'deudores' | 'pagos'>('deudores');

  // Filtro predictivo de búsqueda (Nombre, Apellido o DNI)
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState<FiltroCuenta>('todos');

  // ── Registro de pagos ──────────────────────────────────────
  const [pagos, setPagos] = useState<PagoContextoResponse[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [periodoFiltro, setPeriodoFiltro] = useState<'hoy' | 'semana' | 'mes' | '30dias' | 'anio' | 'personalizado'>('mes');
  const [anioMesSeleccionado, setAnioMesSeleccionado] = useState<number | 'todos'>('todos');
  const [fechaDesdePersonalizada, setFechaDesdePersonalizada] = useState('');
  const [fechaHastaPersonalizada, setFechaHastaPersonalizada] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState<MetodoFiltro>('todos');
  const [errorPagos, setErrorPagos] = useState('');
  const [movimientosAbiertos, setMovimientosAbiertos] = useState<Record<string, boolean>>({});

  // Side Sheet y Modal de Ticket
  const [sideSheetOpen, setSideSheetOpen] = useState(false);
  const [cobroPaciente, setCobroPaciente] = useState<Deudor | null>(null);
  const [cobroMoneda, setCobroMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [cobroMonto, setCobroMonto] = useState(0);
  const [cobroMetodo, setCobroMetodo] = useState('efectivo');
  const [cobroNotas, setCobroNotas] = useState('');
  const [cobroTurnoId, setCobroTurnoId] = useState<number | null>(null);
  const [turnosPaciente, setTurnosPaciente] = useState<HistorialTurnoItemResponse[]>([]);
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
          globalCache.pagos.caja = cajaData;
          globalCache.pagos.deudores = deudoresData;
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
  const getPeriodoDates = () => {
    const today = new Date();

    // Helper to format date as YYYY-MM-DD in local time
    const formatLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (periodoFiltro === 'hoy') {
      const dateStr = formatLocal(today);
      return { desde: dateStr, hasta: dateStr };
    }

    if (periodoFiltro === 'semana') {
      // Current week start (Monday)
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { desde: formatLocal(monday), hasta: formatLocal(sunday) };
    }

    if (periodoFiltro === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { desde: formatLocal(firstDay), hasta: formatLocal(lastDay) };
    }

    if (periodoFiltro === '30dias') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      return { desde: formatLocal(past30), hasta: formatLocal(today) };
    }

    if (periodoFiltro === 'anio') {
      if (anioMesSeleccionado === 'todos') {
        return { desde: '2026-01-01', hasta: '2026-12-31' };
      } else {
        const monthIndex = Number(anioMesSeleccionado) - 1; // 0-based
        const firstDay = new Date(2026, monthIndex, 1);
        const lastDay = new Date(2026, monthIndex + 1, 0);
        return { desde: formatLocal(firstDay), hasta: formatLocal(lastDay) };
      }
    }

    if (periodoFiltro === 'personalizado') {
      return { desde: fechaDesdePersonalizada, hasta: fechaHastaPersonalizada };
    }

    return { desde: '', hasta: '' };
  };

  useEffect(() => {
    let cancelled = false;
    async function loadPagos() {
      const { desde, hasta } = getPeriodoDates();
      if (periodoFiltro === 'personalizado' && (!desde || !hasta)) return;

      setLoadingPagos(true);
      setErrorPagos('');
      try {
        const params: Record<string, string> = {
          fecha_desde: desde,
          fecha_hasta: hasta
        };
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
  }, [periodoFiltro, anioMesSeleccionado, fechaDesdePersonalizada, fechaHastaPersonalizada, filtroMetodo]);

  const pagosTotalesARS = pagos.reduce((s, p) => p.moneda === 'ARS' ? s + p.monto : s, 0);
  const pagosTotalesUSD = pagos.reduce((s, p) => p.moneda === 'USD' ? s + p.monto : s, 0);

  // Agrupamiento de movimientos por paciente y por día (fecha_pago)
  const movimientosAgrupados = React.useMemo(() => {
    const groupsMap = pagos.reduce((acc, pago) => {
      const dni = pago.dni_paciente || (pago.paciente ? pago.paciente.dni : 'sin-dni');
      const fecha = pago.fecha_pago ? new Date(pago.fecha_pago).toISOString().slice(0, 10) : 'sin-fecha';
      const key = `${dni}-${fecha}`;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          paciente: pago.paciente ? {
            dni: pago.paciente.dni,
            nombre: pago.paciente.nombre,
            apellido: pago.paciente.apellido,
            obra_social: pago.paciente.obra_social,
          } : null,
          dni_paciente: dni,
          fecha,
          conceptosSet: new Set<string>(),
          montoARS: 0,
          montoUSD: 0,
          transacciones: [],
        };
      }

      acc[key].transacciones.push(pago);
      if (pago.moneda === 'ARS') {
        acc[key].montoARS += pago.monto;
      } else if (pago.moneda === 'USD') {
        acc[key].montoUSD += pago.monto;
      }

      const concepto = pago.id_turno ? `Turno #${pago.id_turno}` : 'Concepto Directo';
      acc[key].conceptosSet.add(concepto);

      return acc;
    }, {} as Record<string, {
      id: string;
      paciente: { dni: string; nombre: string; apellido: string; obra_social?: string } | null;
      dni_paciente: string;
      fecha: string;
      conceptosSet: Set<string>;
      montoARS: number;
      montoUSD: number;
      transacciones: PagoContextoResponse[];
    }>);

    const sortedGroups = Object.values(groupsMap).map(group => ({
      ...group,
      conceptos: Array.from(group.conceptosSet).join(', '),
    }));

    // Ordenar de más reciente a más antiguo
    sortedGroups.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return sortedGroups;
  }, [pagos]);

  const toggleMovimiento = (id: string) => {
    setMovimientosAbiertos(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const chips: { key: FiltroCuenta; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'deudores_ars', label: 'Deudores ARS' },
    { key: 'deudores_usd', label: 'Deudores USD' },
  ];

  async function abrirSideSheet(deudor: Deudor) {
    setCobroPaciente(deudor);
    setCobroMoneda(deudor.saldo_ars > 0 ? 'ARS' : 'USD');
    setCobroMonto(deudor.saldo_ars > 0 ? deudor.saldo_ars : deudor.saldo_usd);
    setCobroMetodo('efectivo');
    setCobroNotas('');
    setCobroTurnoId(null);
    try {
      const hist = await getHistorialPaciente(deudor.dni);
      const turnosConDeuda = hist.turnos.filter(t => t.saldo_ars > 0 || t.saldo_usd > 0);
      setTurnosPaciente(turnosConDeuda);
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
      const updatedDeudores = deudores.map(d => {
        if (d.dni !== cobroPaciente.dni) return d;
        return {
          ...d,
          saldo_ars: cobroMoneda === 'ARS' ? d.saldo_ars - cobroMonto : d.saldo_ars,
          saldo_usd: cobroMoneda === 'USD' ? d.saldo_usd - cobroMonto : d.saldo_usd,
        };
      });
      setDeudores(updatedDeudores);
      globalCache.pagos.deudores = updatedDeudores;

      // Optimistically update caja stats if cached
      if (globalCache.pagos.caja) {
        const updatedCaja = {
          ...globalCache.pagos.caja,
          ingresos_ars: cobroMoneda === 'ARS' ? globalCache.pagos.caja.ingresos_ars + cobroMonto : globalCache.pagos.caja.ingresos_ars,
          ingresos_usd: cobroMoneda === 'USD' ? globalCache.pagos.caja.ingresos_usd + cobroMonto : globalCache.pagos.caja.ingresos_usd,
        };
        setCaja(updatedCaja);
        globalCache.pagos.caja = updatedCaja;
      }

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

  // Obtener etiqueta de período filtrado para la summary card
  const getPeriodoFiltradoLabel = () => {
    switch (periodoFiltro) {
      case 'hoy':
        return 'HOY';
      case 'semana':
        return 'ESTA SEMANA';
      case 'mes':
        return 'ESTE MES';
      case '30dias':
        return 'ÚLTIMOS 30 DÍAS';
      case 'anio':
        if (anioMesSeleccionado === 'todos') {
          return 'AÑO ACTUAL (2026)';
        } else {
          const MESES_NOMBRES = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
          ];
          return `AÑO ACTUAL (2026) - ${MESES_NOMBRES[Number(anioMesSeleccionado) - 1].toUpperCase()}`;
        }
      case 'personalizado':
        if (fechaDesdePersonalizada && fechaHastaPersonalizada) {
          const desdeStr = formatFechaCorta(fechaDesdePersonalizada + 'T12:00:00');
          const hastaStr = formatFechaCorta(fechaHastaPersonalizada + 'T12:00:00');
          return `RANGO: ${desdeStr} - ${hastaStr}`.toUpperCase();
        }
        return 'RANGO PERSONALIZADO';
      default:
        return 'SELECCIONADO';
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
        <div className="bg-white border border-slate-200/50 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 min-w-0">
          <div className="space-y-3 w-full min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 truncate" title="Recaudación Agregada Diaria (Hoy)">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              Recaudación Agregada Diaria (Hoy)
            </span>
            <div className="grid grid-cols-2 gap-2 xl:gap-4 divide-l divide-slate-100 min-w-0">
              <div className="pr-1 xl:pr-2 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate" title="Pesos Argentinos">Pesos Argentinos</span>
                <span className="text-2xl lg:text-3xl font-black text-emerald-650 font-sans block" title={loading ? '-' : `$ ${Math.round(caja?.ingresos_ars ?? 0).toLocaleString('es-AR')}`}>
                  $ {loading ? '-' : Math.round(caja?.ingresos_ars ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="pl-2 xl:pl-4 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate" title="Dólares Americanos">Dólares Americanos</span>
                <span className="text-2xl lg:text-3xl font-black text-emerald-650 font-sans block" title={loading ? '-' : `USD ${Math.round(caja?.ingresos_usd ?? 0).toLocaleString('es-AR')}`}>
                  USD {loading ? '-' : Math.round(caja?.ingresos_usd ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cartera de Saldos / Deudas - Rojo Coral */}
        <div className="bg-white border border-slate-200/50 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4 min-w-0">
          <div className="space-y-3 w-full min-w-0">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 truncate" title="Cartera de Saldos a Cobrar (Deudores)">
              <Wallet className="w-4 h-4 text-rose-600 shrink-0" />
              Cartera de Saldos a Cobrar (Deudores)
            </span>
            <div className="grid grid-cols-2 gap-2 xl:gap-4 divide-l divide-slate-100 min-w-0">
              <div className="pr-1 xl:pr-2 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate" title="Total Deuda ARS">Total Deuda ARS</span>
                <span className="text-2xl lg:text-3xl font-black text-rose-700 font-sans block" title={loading ? '-' : `$ ${Math.round(totalDeudaARS).toLocaleString('es-AR')}`}>
                  $ {loading ? '-' : Math.round(totalDeudaARS).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="pl-2 xl:pl-4 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate" title="Total Deuda USD">Total Deuda USD</span>
                <span className="text-2xl lg:text-3xl font-black text-rose-700 font-sans block" title={loading ? '-' : `USD ${Math.round(totalDeudaUSD).toLocaleString('es-AR')}`}>
                  USD {loading ? '-' : Math.round(totalDeudaUSD).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 CONTROL CENTRAL DE PESTAÑAS (CÁPSULA PREMIUM SEGMENTADA CON DESPLAZAMIENTO FLUIDO) */}
      <div className="flex justify-center mb-8" id="payments-view-tabs">
        <div className="bg-slate-100/70 p-1 rounded-full inline-flex items-center border border-slate-200/50 shadow-inner gap-1">
          <button
            onClick={() => setActiveTab('deudores')}
            className={`relative flex items-center justify-center gap-2 py-2 px-6 text-sm rounded-full cursor-pointer transition-all duration-300 z-10 ${activeTab === 'deudores'
              ? 'text-red-600 font-semibold scale-100'
              : 'text-slate-400 font-medium bg-transparent border-transparent hover:text-slate-600'
              }`}
          >
            {activeTab === 'deudores' && (
              <motion.div
                layoutId="activePaymentsTabSelection"
                className="absolute inset-0 bg-red-50 border border-red-100 rounded-full -z-10 shadow-xs"
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              />
            )}
            <Wallet className="w-4 h-4" />
            <span>Deudores</span>
          </button>

          <button
            onClick={() => setActiveTab('pagos')}
            className={`relative flex items-center justify-center gap-2 py-2 px-6 text-sm rounded-full cursor-pointer transition-all duration-300 z-10 ${activeTab === 'pagos'
              ? 'text-emerald-600 font-semibold scale-100'
              : 'text-slate-400 font-medium bg-transparent border-transparent hover:text-slate-600'
              }`}
          >
            {activeTab === 'pagos' && (
              <motion.div
                layoutId="activePaymentsTabSelection"
                className="absolute inset-0 bg-emerald-50 border border-emerald-100 rounded-full -z-10 shadow-xs"
                transition={{ type: 'spring', stiffness: 380, damping: 25 }}
              />
            )}
            <History className="w-4 h-4" />
            <span>Registro de Pagos</span>
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
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer mx-auto"
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

            {/* 1. PANEL DE FILTROS (SELECTOR DE PERÍODOS RAPIDO MODERNO) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/60 shadow-xs flex flex-col sm:flex-row justify-start items-stretch sm:items-center gap-4 flex-wrap relative z-40" id="header-filters-panel">

              {/* Filtro de Período Rápido */}
              <div className="flex flex-col relative min-w-[220px]">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1 block">FILTRO DE PERÍODO RÁPIDO</span>
                <div className="relative">
                  <select
                    value={periodoFiltro}
                    onChange={e => {
                      const val = e.target.value as any;
                      setPeriodoFiltro(val);
                      if (val !== 'anio') setAnioMesSeleccionado('todos');
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white outline-none pr-10 cursor-pointer appearance-none"
                  >
                    <option value="hoy">Hoy</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mes</option>
                    <option value="30dias">Últimos 30 días</option>
                    <option value="anio">Año Actual (2026)</option>
                    <option value="personalizado">Rango Personalizado...</option>
                  </select>
                  <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Selector de Mes para Año Actual (Condicional) */}
              {periodoFiltro === 'anio' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col relative min-w-[180px]"
                >
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 pl-1 block">MES DEL AÑO</span>
                  <div className="relative">
                    <select
                      value={anioMesSeleccionado}
                      onChange={e => {
                        const val = e.target.value;
                        setAnioMesSeleccionado(val === 'todos' ? 'todos' : Number(val));
                      }}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 bg-white outline-none pr-10 cursor-pointer appearance-none"
                    >
                      <option value="todos">Todos los meses</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                    <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Rango de Fechas Personalizado (Condicional - MiniDatePicker) */}
              {periodoFiltro === 'personalizado' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                >
                  <MiniDatePicker
                    label="Desde"
                    value={fechaDesdePersonalizada}
                    onChange={setFechaDesdePersonalizada}
                  />
                  <MiniDatePicker
                    label="Hasta"
                    value={fechaHastaPersonalizada}
                    onChange={setFechaHastaPersonalizada}
                  />
                </motion.div>
              )}
            </div>

            {/* 2. TARJETA DE MÉTRICAS (DASHBOARD SUMMARY CARD EN GRIS/AZUL TENUE #F4F6FA) */}
            {!loadingPagos && (
              <div className="bg-[#F4F6FA] border border-slate-200/40 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6" id="dashboard-summary-card">

                {/* Contenido Izquierdo */}
                <div className="space-y-2 z-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    TOTAL COBRADO EN {getPeriodoFiltradoLabel()} (FILTRADO)
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

            {/* 4. LISTA DE TRANSACCIONES (TABLA LIMPIA Y JERÁRQUICA CON ACORDEÓN) */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden" id="transactions-table-root">
              {loadingPagos ? (
                <div className="p-16 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></span>
                    <span>Cargando transacciones contables...</span>
                  </div>
                </div>
              ) : errorPagos ? (
                <div className="p-16 text-center text-rose-500 font-bold">
                  {errorPagos}
                </div>
              ) : movimientosAgrupados.length === 0 ? (
                <div className="p-16 text-center text-slate-450">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="font-bold text-slate-700">Sin movimientos registrados</p>
                  <p className="text-xs text-slate-400 mt-1">No hay cobros bajo este periodo o método seleccionado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="text-slate-450 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                        <th className="w-12 py-4 px-4 text-center"></th>
                        <th className="px-6 py-4">Paciente</th>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Concepto/Turno</th>
                        <th className="px-6 py-4 text-right">Monto ARS</th>
                        <th className="px-6 py-4 text-right">Monto USD</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                      {movimientosAgrupados.map((mov) => {
                        const isOpen = movimientosAbiertos[mov.id] || false;
                        return (
                          <React.Fragment key={mov.id}>
                            {/* Fila Principal */}
                            <tr
                              onClick={() => toggleMovimiento(mov.id)}
                              className="bg-white hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                            >
                              {/* Chevron Columna */}
                              <td className="py-4 px-4 text-center align-middle">
                                <span className="inline-block transition-transform duration-200">
                                  <svg
                                    className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </span>
                              </td>

                              {/* Paciente */}
                              <td className="px-6 py-4 align-middle">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 text-[15px] tracking-tight">
                                    {mov.paciente ? `${mov.paciente.apellido.toUpperCase()}, ${mov.paciente.nombre.toUpperCase()}` : 'PAGO DIRECTO A CUENTA'}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[11px] text-slate-400 font-bold">DNI: {mov.dni_paciente}</span>
                                    {mov.paciente?.obra_social && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                          {mov.paciente.obra_social}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Fecha */}
                              <td className="px-6 py-4 align-middle text-slate-600 font-bold">
                                {mov.fecha}
                              </td>

                              {/* Concepto / Turno */}
                              <td className="px-6 py-4 align-middle">
                                <span className="text-xs font-black uppercase text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                                  {mov.conceptos}
                                </span>
                              </td>

                              {/* Monto ARS */}
                              <td className="px-6 py-4 align-middle text-right">
                                {mov.montoARS > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-black text-[#00875A] font-sans">
                                    $ {Math.round(mov.montoARS).toLocaleString('es-AR')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs font-bold">$ 0</span>
                                )}
                              </td>

                              {/* Monto USD */}
                              <td className="px-6 py-4 align-middle text-right">
                                {mov.montoUSD > 0 ? (
                                  <span className="inline-flex items-center gap-1 font-black text-[#00875A] font-sans">
                                    USD {Math.round(mov.montoUSD).toLocaleString('es-AR')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs font-bold">USD 0</span>
                                )}
                              </td>
                            </tr>

                            {/* Desglose de transacciones vinculadas */}
                            {isOpen && mov.transacciones.map((trans) => {
                              const metodo = trans.metodo_pago.toLowerCase();
                              let desc = '';
                              if (metodo === 'efectivo') {
                                desc = trans.dni_paciente ? "Abono de saldo en efectivo billetes." : "Abono de saldo en efectivo.";
                              } else if (metodo === 'transferencia') {
                                desc = trans.dni_paciente ? "Cobro a cuenta percibido vía transferencia digital." : "Cobro vía transferencia.";
                              } else {
                                desc = `Cobro vía ${trans.metodo_pago.toLowerCase()}.`;
                              }
                              if (trans.id_turno) {
                                desc += ` enlazado a sesión #${trans.id_turno}.`;
                              }

                              return (
                                <tr
                                  key={trans.id}
                                  className="hover:bg-slate-50/50 transition-colors align-middle animate-fade-slide-up bg-slate-50/10"
                                >
                                  {/* Empty Cell for Chevron Column */}
                                  <td className="py-3 px-4"></td>

                                  {/* Connector line and compact info */}
                                  <td className="py-3 px-6" colSpan={3}>
                                    <div className="pl-6 border-l-2 border-slate-300 ml-4 py-1 flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-slate-800 font-bold text-xs">
                                          {desc}
                                        </p>
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${trans.metodo_pago === 'efectivo'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                          : trans.metodo_pago === 'transferencia'
                                            ? 'bg-blue-50 text-blue-700 border-blue-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-100'
                                          }`}>
                                          {trans.metodo_pago.toUpperCase()}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-semibold">
                                        ID: #{trans.id} &middot; {new Date(trans.fecha_pago).toISOString().slice(0, 10)}
                                      </p>
                                    </div>
                                  </td>

                                  {/* ARS Amount */}
                                  <td className="py-3 px-6 text-right align-middle">
                                    {trans.moneda === 'ARS' ? (
                                      <span className="text-[#00875A] font-black text-xs">
                                        $ {Math.round(trans.monto).toLocaleString('es-AR')}
                                      </span>
                                    ) : (
                                      <span className="text-slate-350 font-bold text-xs">-</span>
                                    )}
                                  </td>

                                  {/* USD Amount */}
                                  <td className="py-3 px-6 text-right align-middle">
                                    {trans.moneda === 'USD' ? (
                                      <span className="text-[#00875A] font-black text-xs">
                                        USD {Math.round(trans.monto).toLocaleString('es-AR')}
                                      </span>
                                    ) : (
                                      <span className="text-slate-350 font-bold text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                    <span className="bg-blue-50 text-blue-600 p-2.5 rounded-full">
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
                <div className="bg-red-50/60 rounded-2xl p-5 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Deuda Pendiente Actual</span>
                    <p className="text-2xl font-bold text-red-600 font-sans">
                      {cobroMoneda === 'ARS'
                        ? `$ ${Math.round(cobroPaciente.saldo_ars).toLocaleString('es-AR')} ARS`
                        : `USD ${Math.round(cobroPaciente.saldo_usd).toLocaleString('es-AR')}`}
                    </p>
                  </div>
                  <Wallet className="w-10 h-10 text-slate-400" />
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
                        const currency = e.target.value as 'ARS' | 'USD';
                        setCobroMoneda(currency);
                        if (cobroTurnoId) {
                          const matched = turnosPaciente.find(t => t.id === cobroTurnoId);
                          if (matched) {
                            setCobroMonto(currency === 'ARS' ? matched.saldo_ars : matched.saldo_usd);
                          }
                        } else {
                          setCobroMonto(currency === 'ARS' ? cobroPaciente.saldo_ars : cobroPaciente.saldo_usd);
                        }
                      }}
                      className="w-full mt-1.5 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-slate-50 font-bold text-slate-800 outline-none cursor-pointer transition-all"
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
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold text-slate-800 text-lg font-sans transition-all"
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
                      className="w-full mt-1.5 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white font-bold text-slate-700 outline-none cursor-pointer transition-all"
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
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) {
                          setCobroTurnoId(null);
                          setCobroMoneda(cobroPaciente.saldo_ars > 0 ? 'ARS' : 'USD');
                          setCobroMonto(cobroPaciente.saldo_ars > 0 ? cobroPaciente.saldo_ars : cobroPaciente.saldo_usd);
                        } else {
                          const turnoId = Number(val);
                          setCobroTurnoId(turnoId);
                          const matched = turnosPaciente.find(t => t.id === turnoId);
                          if (matched) {
                            const currency = matched.saldo_ars > 0 ? 'ARS' : 'USD';
                            setCobroMoneda(currency);
                            setCobroMonto(currency === 'ARS' ? matched.saldo_ars : matched.saldo_usd);
                          }
                        }
                      }}
                      className="w-full min-w-0 max-w-full mt-1.5 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white font-bold text-slate-755 outline-none cursor-pointer transition-all truncate"
                    >
                      <option value="">Abono general / Amortización automática</option>
                      {turnosPaciente.map(t => (
                        <option key={t.id} value={t.id}>
                          #{t.id} - {t.tratamientos ? t.tratamientos.map((tr) => tr.nombre).join(', ') : (t.motivo || 'Consulta')} ({formatFechaCorta(t.fecha_hora)}) - Resta: {[
                            t.saldo_ars > 0 ? `$ ${Math.round(t.saldo_ars).toLocaleString('es-AR')} ARS` : '',
                            t.saldo_usd > 0 ? `USD ${Math.round(t.saldo_usd).toLocaleString('es-AR')}` : ''
                          ].filter(Boolean).join(' + ') || '0'}
                        </option>
                      ))}
                      {turnosPaciente.length === 0 && (
                        <option value="" disabled>Sin turnos con saldo pendiente</option>
                      )}
                    </select>
                  </div>

                  {/* Botón de Acción */}
                  <div className="pt-4">
                    <button
                      onClick={handleRegistrarCobro}
                      disabled={cobrando || cobroMonto <= 0}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      <Modal
        isOpen={showReceiptModal && !!receiptData}
        onClose={() => setShowReceiptModal(false)}
      >
        {receiptData && (
          <div className="flex flex-col items-center text-center">
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
          </div>
        )}
      </Modal>

    </div>
  );
}