import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { KPICard } from '../components/KPICard';
import { CustomSelect } from '../components/CustomSelect';
import { MiniDatePicker, MiniMonthPicker } from '../components/MiniCalendarPicker';
import { Pago, Paciente } from '../types';

export interface TicketDetails {
  id: string;
  fecha_pago: string;
  paciente_nombre: string;
  dni_paciente: string;
  monto: number;
  moneda: 'ARS' | 'USD';
  monto_ars?: number;
  monto_usd?: number;
  metodo_pago: string;
  imputaciones: {
    monto: number;
    moneda?: 'ARS' | 'USD';
    detalle: string;
  }[];
}
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { 
  DollarSign, 
  Search, 
  PlusCircle, 
  Receipt, 
  Printer, 
  History, 
  User, 
  Calendar,
  CreditCard,
  CheckCircle,
  X,
  ArrowUpDown,
  Filter,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function PagosPage() {
  const [activeTab, setActiveTab] = useState<'deudores' | 'pagos'>('deudores');
  const [caja, setCaja] = useState({ ingresos_ars: 0, ingresos_usd: 0 });
  const [deudores, setDeudores] = useState<any[]>([]);
  const [transacciones, setTransacciones] = useState<Pago[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [doctores, setDoctores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter for deudores
  const [searchQuery, setSearchQuery] = useState('');
  const [ordenAntiguedad, setOrdenAntiguedad] = useState<'desc' | 'asc'>('desc');

  // Filters for payments log
  const [timePreset, setTimePreset] = useState<'hoy' | 'semana' | 'mes' | 'mes-especifico' | 'personalizado'>('hoy');
  const [selectedSpecificMonth, setSelectedSpecificMonth] = useState<string>('');
  const [customFechaDesde, setCustomFechaDesde] = useState('');
  const [customFechaHasta, setCustomFechaHasta] = useState('');
  const [filterMoneda, setFilterMoneda] = useState<string>('');
  const [filterMetodo, setFilterMetodo] = useState<string>('');

  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    return `${monthName} ${year}`;
  };

  // Register Abono Modal states
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);
  const [selectedDeudor, setSelectedDeudor] = useState<any | null>(null);
  const [paymentType, setPaymentType] = useState<'general' | 'turnos'>('general');
  const [turnosConDeuda, setTurnosConDeuda] = useState<any[]>([]);
  const [selectedTurnoIds, setSelectedTurnoIds] = useState<number[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);
  const [lineasPago, setLineasPago] = useState<{ monto: number; metodo_pago: string; moneda: 'ARS' | 'USD' }[]>([]);

  const addLineaPago = (moneda: 'ARS' | 'USD') => {
    setLineasPago(prev => [...prev, { monto: 0, metodo_pago: 'Efectivo', moneda }]);
  };

  const removeLineaPago = (idx: number) => {
    setLineasPago(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLineaPago = (idx: number, field: string, val: any) => {
    setLineasPago(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  // Ticket Modal (virtual printable receipt)
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetails | null>(null);

  const { showToast } = useToast();

  const getFilterDates = () => {
    const now = new Date();
    const getLocalDateStr = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    let desde = '';
    let hasta = '';

    const todayStr = getLocalDateStr(now);

    if (timePreset === 'hoy') {
      desde = todayStr;
      hasta = todayStr + 'T23:59:59';
    } else if (timePreset === 'semana') {
      const temp = new Date();
      const day = temp.getDay();
      const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(temp.setDate(diff));
      desde = getLocalDateStr(monday);
      hasta = todayStr + 'T23:59:59';
    } else if (timePreset === 'mes') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      desde = getLocalDateStr(firstDay);
      hasta = todayStr + 'T23:59:59';
    } else if (timePreset === 'mes-especifico') {
      if (selectedSpecificMonth) {
        const [yearStr, monthStr] = selectedSpecificMonth.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0); // last day of that month
        desde = getLocalDateStr(firstDay);
        hasta = getLocalDateStr(lastDay) + 'T23:59:59';
      } else {
        desde = todayStr;
        hasta = todayStr + 'T23:59:59';
      }
    } else {
      desde = customFechaDesde;
      hasta = customFechaHasta ? customFechaHasta + 'T23:59:59' : '';
    }

    return { desde, hasta };
  };

  const loadDeudores = async (orden: 'desc' | 'asc') => {
    try {
      const data = await apiFetch(`/api/pacientes/deudores?orden=antiguedad_${orden}`);
      setDeudores(data);
    } catch (e) {
      console.error("Error cargando deudores", e);
    }
  };

  const loadFilteredTransactions = async () => {
    const { desde, hasta } = getFilterDates();
    let query = '/api/finanzas/pagos?';
    const params: string[] = [];
    if (desde) params.push(`fecha_desde=${desde}`);
    if (hasta) params.push(`fecha_hasta=${hasta}`);
    if (filterMetodo) params.push(`metodo_pago=${filterMetodo}`);
    if (filterMoneda) params.push(`moneda=${filterMoneda}`);
    
    query += params.join('&');
    try {
      const data = await apiFetch(query);
      setTransacciones(data);
    } catch (err) {
      console.error("Error cargando cobros filtrados:", err);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [cajaData, pacsData, docsData] = await Promise.all([
        apiFetch('/api/finanzas/caja/hoy'),
        apiFetch('/api/pacientes'),
        apiFetch('/api/doctores')
      ]);
      setCaja(cajaData);
      setPacientes(pacsData);
      setDoctores(docsData);
      
      // Also fetch deudores and filtered transactions
      await Promise.all([
        loadDeudores(ordenAntiguedad),
        loadFilteredTransactions()
      ]);
    } catch (e: any) {
      showToast('Error cargando libro de finanzas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Re-fetch transactions whenever filter changes
  useEffect(() => {
    loadFilteredTransactions();
  }, [timePreset, selectedSpecificMonth, customFechaDesde, customFechaHasta, filterMetodo, filterMoneda]);

  const handleRegisterAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeudor) return;

    const validLines = lineasPago.filter(p => Number(p.monto) > 0);
    if (validLines.length === 0) {
      showToast('Debe ingresar al menos un monto válido mayor a cero.', 'warning');
      return;
    }

    try {
      const successfulPayments: any[] = [];

      for (const p of validLines) {
        const lineAmount = Number(p.monto);

        if (paymentType === 'turnos' && selectedTurnoIds.length > 0) {
          let remainder = lineAmount;
          const selectedTurnos = turnosConDeuda.filter(t => selectedTurnoIds.includes(t.id));
          
          for (let i = 0; i < selectedTurnos.length; i++) {
            const t = selectedTurnos[i];
            const pending = p.moneda === 'ARS' ? t.saldo_pendiente_ars : t.saldo_pendiente_usd;
            if (pending <= 0) continue;

            // Compute how much goes to this specific appointment
            const isLast = i === selectedTurnos.length - 1;
            const applyAmount = isLast ? remainder : Math.min(remainder, pending);
            
            if (applyAmount <= 0) continue;

            const response = await apiFetch('/api/finanzas/pagos', {
              method: 'POST',
              body: JSON.stringify({
                dni_paciente: selectedDeudor.dni,
                monto: applyAmount,
                metodo_pago: p.metodo_pago,
                moneda: p.moneda,
                id_turno: t.id
              })
            });
            successfulPayments.push(response);

            remainder -= applyAmount;
            if (remainder <= 0) break;
          }

          // Leftover as general payment
          if (remainder > 0.01) {
            const response = await apiFetch('/api/finanzas/pagos', {
              method: 'POST',
              body: JSON.stringify({
                dni_paciente: selectedDeudor.dni,
                monto: remainder,
                metodo_pago: p.metodo_pago,
                moneda: p.moneda,
                id_turno: null
              })
            });
            successfulPayments.push(response);
          }
        } else {
          // General Abono / Amortización
          const response = await apiFetch('/api/finanzas/pagos', {
            method: 'POST',
            body: JSON.stringify({
              dni_paciente: selectedDeudor.dni,
              monto: lineAmount,
              metodo_pago: p.metodo_pago,
              moneda: p.moneda,
              id_turno: null
            })
          });
          successfulPayments.push(response);
        }
      }

      showToast('Cobros registrados con éxito.', 'success');
      setIsAbonoOpen(false);
      setSelectedDeudor(null);
      setLineasPago([]);
      
      // Refresh
      const [cajaData] = await Promise.all([
        apiFetch('/api/finanzas/caja/hoy'),
        loadDeudores(ordenAntiguedad),
        loadFilteredTransactions()
      ]);
      setCaja(cajaData);

      // Auto open printed ticket preview
      if (successfulPayments.length > 0) {
        const firstPay = successfulPayments[0];
        const ids = successfulPayments.map(p => `#${p.id}`).join(', ');
        
        const totalArs = successfulPayments.filter(p => p.moneda === 'ARS').reduce((sum, p) => sum + Number(p.monto), 0);
        const totalUsd = successfulPayments.filter(p => p.moneda === 'USD').reduce((sum, p) => sum + Number(p.monto), 0);
        const distinctMethods = Array.from(new Set(successfulPayments.map(p => p.metodo_pago))).join(' + ');

        const combinedTicket: TicketDetails = {
          id: ids,
          fecha_pago: firstPay.fecha_pago,
          paciente_nombre: firstPay.paciente_nombre || `${selectedDeudor.apellido}, ${selectedDeudor.nombre}`,
          dni_paciente: selectedDeudor.dni,
          monto: totalArs > 0 ? totalArs : totalUsd,
          moneda: totalArs > 0 ? 'ARS' : 'USD',
          monto_ars: totalArs,
          monto_usd: totalUsd,
          metodo_pago: distinctMethods,
          imputaciones: successfulPayments.map(p => ({
            monto: p.monto,
            moneda: p.moneda,
            detalle: p.constancia_turno || 'Saldo a Cuenta / Amortización'
          }))
        };
        setSelectedTicket(combinedTicket);
        setIsTicketOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al procesar el cobro.', 'error');
    }
  };

  const openAbonoModal = async (deudor: any) => {
    setSelectedDeudor(deudor);
    setTurnosConDeuda([]);
    setSelectedTurnoIds([]);
    setPaymentType('general');
    setLineasPago([{ monto: 0, metodo_pago: 'Efectivo', moneda: 'ARS' }]);
    setLoadingTurnos(true);
    setIsAbonoOpen(true);

    try {
      const data = await apiFetch(`/api/pacientes/${deudor.dni}/turnos-con-deuda`);
      setTurnosConDeuda(data);
      if (data.length > 0) {
        setPaymentType('turnos');
        setSelectedTurnoIds(data.map((t: any) => t.id));
      }
    } catch (e) {
      showToast('Error cargando turnos pendientes.', 'error');
    } finally {
      setLoadingTurnos(false);
    }
  };

  // Update lineasPago when checked turnos change
  useEffect(() => {
    if (paymentType === 'turnos') {
      const totalArs = turnosConDeuda
        .filter(t => selectedTurnoIds.includes(t.id))
        .reduce((sum, t) => sum + Number(t.saldo_pendiente_ars || 0), 0);
      const totalUsd = turnosConDeuda
        .filter(t => selectedTurnoIds.includes(t.id))
        .reduce((sum, t) => sum + Number(t.saldo_pendiente_usd || 0), 0);

      const newLines: { monto: number; metodo_pago: string; moneda: 'ARS' | 'USD' }[] = [];
      if (totalArs > 0) {
        newLines.push({ monto: totalArs, metodo_pago: 'Efectivo', moneda: 'ARS' });
      }
      if (totalUsd > 0) {
        newLines.push({ monto: totalUsd, metodo_pago: 'Efectivo', moneda: 'USD' });
      }
      if (newLines.length === 0) {
        newLines.push({ monto: 0, metodo_pago: 'Efectivo', moneda: 'ARS' });
      }
      setLineasPago(newLines);
    }
  }, [selectedTurnoIds, paymentType, turnosConDeuda]);

  const openTicket = (pago: Pago) => {
    setSelectedTicket({
      id: `#${pago.id}`,
      fecha_pago: pago.fecha_pago,
      paciente_nombre: pago.paciente_nombre || 'Paciente',
      dni_paciente: pago.dni_paciente,
      monto: pago.monto,
      moneda: pago.moneda,
      monto_ars: pago.moneda === 'ARS' ? pago.monto : 0,
      monto_usd: pago.moneda === 'USD' ? pago.monto : 0,
      metodo_pago: pago.metodo_pago,
      imputaciones: [
        {
          monto: pago.monto,
          moneda: pago.moneda,
          detalle: pago.constancia_turno || 'Saldo a Cuenta / Amortización'
        }
      ]
    });
    setIsTicketOpen(true);
  };

  // Filter deudores locally
  const filteredDeudores = deudores.filter(d => {
    const term = searchQuery.toLowerCase();
    return d.dni.includes(term) || 
           d.nombre.toLowerCase().includes(term) || 
           d.apellido.toLowerCase().includes(term);
  });

  // Calculate live filtered totals for KPI cards in Registro de pagos tab
  const totalRecaudadoArs = transacciones
    .filter(tx => tx.moneda === 'ARS')
    .reduce((sum, tx) => sum + tx.monto, 0);

  const totalRecaudadoUsd = transacciones
    .filter(tx => tx.moneda === 'USD')
    .reduce((sum, tx) => sum + tx.monto, 0);

  const getKPILabel = (moneda: 'ARS' | 'USD') => {
    const labelSuffix = moneda === 'ARS' ? 'Pesos ARS' : 'Dólares USD';
    let prefix = 'Recaudación Hoy';
    if (timePreset === 'semana') prefix = 'Recaudación Esta Semana';
    else if (timePreset === 'mes') prefix = 'Recaudación Este Mes';
    else if (timePreset === 'mes-especifico') prefix = `Recaudación ${formatMonthLabel(selectedSpecificMonth)}`;
    else if (timePreset === 'personalizado') prefix = 'Recaudación en Rango';
    return `${prefix} (${labelSuffix})`;
  };

  const getAntiguedadBadge = (dias: number) => {
    if (dias < 15) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#78350F] border border-[#FDE68A]">
          {dias} {dias === 1 ? 'día' : 'días'} (Reciente)
        </span>
      );
    } else if (dias < 30) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFEDD5] text-[#9A3412] border border-[#FED7AA]">
          {dias} días (Media)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] animate-pulse">
          {dias} días (Vencida)
        </span>
      );
    }
  };

  return (
    <div className="space-y-6 pagos-page-container">
      {/* Upper header */}
      <div>
        <h2 className="text-3xl text-clamp-title-lg font-bold text-neutral-warm-900 tracking-tight">
          Caja y Libro Contable
        </h2>
        <p className="text-xs text-neutral-warm-600 mt-1">
          Libro de abonos, registro de ingresos financieros y auditoría de deudores
        </p>
      </div>

      {/* Tabs / Sub-sections switcher */}
      <div className="flex items-center gap-2 border-b border-neutral-warm-100/60 bg-neutral-warm-50/40 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('deudores')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-tight rounded-lg transition-all border cursor-pointer ${
            activeTab === 'deudores'
              ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#78350F] shadow-xs'
              : 'bg-transparent border-transparent text-neutral-warm-600 hover:text-neutral-warm-900'
          }`}
          id="tab-deudores"
        >
          <User size={14} className={activeTab === 'deudores' ? 'text-[#D97706]' : 'text-neutral-warm-500'} />
          <span>Lista de Deudores</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeTab === 'deudores' ? 'bg-[#F59E0B]/20 text-[#78350F]' : 'bg-neutral-warm-100 text-neutral-warm-600'
          }`}>
            {deudores.length}
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('pagos')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-tight rounded-lg transition-all border cursor-pointer ${
            activeTab === 'pagos'
              ? 'bg-[#EAF3DE] border-[#A8D385] text-[#2D5A1E] shadow-xs'
              : 'bg-transparent border-transparent text-neutral-warm-600 hover:text-neutral-warm-900'
          }`}
          id="tab-pagos"
        >
          <History size={14} className={activeTab === 'pagos' ? 'text-[#1D9E75]' : 'text-neutral-warm-500'} />
          <span>Registro de Pagos e Ingresos</span>
        </button>
      </div>

      {/* Tab CONTENT 1: LISTA DE DEUDORES */}
      {activeTab === 'deudores' && (
        <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-warm-100/50 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight flex items-center gap-2">
                <User size={16} className="text-[#F59E0B]" />
                <span>Lista de Deudores</span>
              </h3>
              <p className="text-[11px] text-neutral-warm-500">
                Pacientes con saldo pendiente, ordenados por la antigüedad de su deuda más antigua
              </p>
            </div>

            {/* Controls: Search and Sort Order */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-warm-500">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por DNI, Nombre o Apellido..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-neutral-warm-100 bg-[#F1EFE8] text-neutral-warm-900 placeholder:text-neutral-warm-600/60 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              <button
                onClick={() => {
                  const newOrder = ordenAntiguedad === 'desc' ? 'asc' : 'desc';
                  setOrdenAntiguedad(newOrder);
                  loadDeudores(newOrder);
                }}
                className="text-[11px] bg-neutral-warm-50 hover:bg-neutral-warm-100 border border-neutral-warm-200 px-3 py-2 rounded-md font-bold text-neutral-warm-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUpDown size={12} className="text-neutral-warm-500" />
                <span>Orden: {ordenAntiguedad === 'desc' ? 'Mayor antigüedad primero' : 'Menor antigüedad primero'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600">Cargando...</div>
            ) : filteredDeudores.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
                No se registran pacientes deudores con saldos pendientes.
              </div>
            ) : (
              <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-neutral-warm-50 text-neutral-warm-600 text-[10px] uppercase tracking-wider font-medium bg-[#FAF9F5]">
                        <th className="py-2.5 px-3 sticky left-0 bg-[#FAF9F5] z-20 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Paciente</th>
                        <th className="py-2.5 px-3">Contacto</th>
                        <th className="py-2.5 px-3">Antigüedad Deuda</th>
                        <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                        <th className="py-2.5 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-warm-50">
                      {filteredDeudores.map(d => (
                        <tr key={d.dni} className="hover:bg-neutral-warm-50/20 transition-colors group">
                          <td className="py-3 px-3 font-medium text-neutral-warm-900 sticky left-0 bg-white z-10 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-[#FAF9F5] transition-colors">
                            <span className="block font-bold text-neutral-warm-950">{d.apellido}, {d.nombre}</span>
                            <span className="text-[10px] text-neutral-warm-500 font-mono">DNI: {d.dni}</span>
                          </td>
                          <td className="py-3 px-3 text-neutral-warm-600 font-mono">
                            {d.telefono || 'Sin celular'}
                          </td>
                          <td className="py-3 px-3">
                            {getAntiguedadBadge(d.dias_antiguedad)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#A32D2D]">
                            <div className="flex flex-col text-right">
                              {d.saldo_ars > 0 && <span>$ {d.saldo_ars.toLocaleString('es-AR')}</span>}
                              {d.saldo_usd > 0 && <span className="text-[11px] text-[#A32D2D]/80">U$S {d.saldo_usd.toLocaleString('es-AR')}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => openAbonoModal(d)}
                              className="inline-flex items-center gap-1 bg-[#EAF3DE] text-[#3B6D11] hover:bg-[#3B6D11]/10 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <PlusCircle size={12} />
                              <span>Cobrar</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards view */}
                <div className="md:hidden divide-y divide-neutral-warm-100/60">
                  {filteredDeudores.map(d => (
                    <div key={d.dni} className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block font-bold text-neutral-warm-950 text-sm leading-tight">{d.apellido}, {d.nombre}</span>
                          <span className="text-[10px] text-neutral-warm-500 font-mono block mt-0.5">DNI: {d.dni}</span>
                        </div>
                        <div>
                          {getAntiguedadBadge(d.dias_antiguedad)}
                        </div>
                      </div>

                      <div className="flex justify-between items-end text-xs pt-2 border-t border-neutral-warm-50/80">
                        <div className="text-neutral-warm-600">
                          <span className="block text-[9px] text-neutral-warm-400 uppercase tracking-wide mb-0.5">Contacto</span>
                          <span className="font-mono text-xs">{d.telefono || 'Sin celular'}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] text-neutral-warm-400 uppercase tracking-wide mb-0.5">Saldo Pendiente</span>
                          <div className="font-mono font-bold text-[#A32D2D] text-sm leading-tight">
                            {d.saldo_ars > 0 && <span className="block">$ {d.saldo_ars.toLocaleString('es-AR')}</span>}
                            {d.saldo_usd > 0 && <span className="block text-[10px] text-[#A32D2D]/85 mt-0.5">U$S {d.saldo_usd.toLocaleString('es-AR')}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={() => openAbonoModal(d)}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-[#EAF3DE] text-[#3B6D11] hover:bg-[#3B6D11]/10 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          <PlusCircle size={14} />
                          <span>Registrar Cobro</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab CONTENT 2: REGISTRO DE PAGOS E INGRESOS */}
      {activeTab === 'pagos' && (
        <div className="space-y-6">
          {/* Dynamic Recalculated KPI Cards based on time and filter selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KPICard 
              icon={<DollarSign size={16} />} 
              value={`$ ${totalRecaudadoArs.toLocaleString('es-AR')}`} 
              label={getKPILabel('ARS')} 
              theme="success" 
              size="lg"
            />
            <KPICard 
              icon={<DollarSign size={16} />} 
              value={`U$S ${totalRecaudadoUsd.toLocaleString('es-AR')}`} 
              label={getKPILabel('USD')} 
              theme="success" 
              size="lg"
            />
          </div>

          <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-warm-100/40 pb-2">
                <Filter size={14} className="text-[#1D9E75]" />
                <h4 className="text-xs font-bold text-neutral-warm-700 uppercase tracking-wider">
                  Panel de Filtros y Rango de Fechas
                </h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                {/* Time Preset Pill Box (Col-span-5) */}
                <div className="lg:col-span-6 xl:col-span-5 space-y-1.5">
                  <span className="text-[10px] font-bold text-neutral-warm-600 block uppercase">
                    Rango de Tiempo
                  </span>
                  <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setTimePreset('hoy')}
                      className={`w-full sm:w-auto text-center px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                        timePreset === 'hoy'
                          ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
                          : 'bg-[#F1EFE8] border-neutral-warm-200 text-neutral-warm-700 hover:bg-neutral-warm-100'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => setTimePreset('semana')}
                      className={`w-full sm:w-auto text-center px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                        timePreset === 'semana'
                          ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
                          : 'bg-[#F1EFE8] border-neutral-warm-200 text-neutral-warm-700 hover:bg-neutral-warm-100'
                      }`}
                    >
                      Esta Semana
                    </button>
                    <button
                      onClick={() => setTimePreset('mes')}
                      className={`w-full sm:w-auto text-center px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                        timePreset === 'mes'
                          ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
                          : 'bg-[#F1EFE8] border-neutral-warm-200 text-neutral-warm-700 hover:bg-neutral-warm-100'
                      }`}
                    >
                      Este Mes
                    </button>

                    {/* Selector de Mes Específico */}
                    <MiniMonthPicker
                      value={selectedSpecificMonth}
                      onChange={monthVal => setSelectedSpecificMonth(monthVal)}
                      timePreset={timePreset}
                      onSelectPreset={() => setTimePreset('mes-especifico')}
                    />

                    <button
                      onClick={() => setTimePreset('personalizado')}
                      className={`w-full sm:w-auto text-center px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                        timePreset === 'personalizado'
                          ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
                          : 'bg-[#F1EFE8] border-neutral-warm-200 text-neutral-warm-700 hover:bg-neutral-warm-100'
                      }`}
                    >
                      Rango Libre
                    </button>
                  </div>

                  {timePreset === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <MiniDatePicker
                        label="Desde"
                        value={customFechaDesde}
                        onChange={dateStr => setCustomFechaDesde(dateStr)}
                        placeholder="Fecha desde"
                      />
                      <MiniDatePicker
                        label="Hasta"
                        value={customFechaHasta}
                        onChange={dateStr => setCustomFechaHasta(dateStr)}
                        placeholder="Fecha hasta"
                      />
                    </div>
                  )}
                </div>

                {/* Dropdown Filters (Col-span-7) */}
                <div className="lg:col-span-6 xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-warm-600 block uppercase">Moneda</span>
                    <CustomSelect
                      value={filterMoneda}
                      onChange={val => setFilterMoneda(String(val))}
                      options={[
                        { value: '', label: 'Todas las monedas' },
                        { value: 'ARS', label: 'Pesos (ARS)' },
                        { value: 'USD', label: 'Dólares (USD)' }
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-neutral-warm-600 block uppercase">Método</span>
                    <CustomSelect
                      value={filterMetodo}
                      onChange={val => setFilterMetodo(String(val))}
                      options={[
                        { value: '', label: 'Todos los métodos' },
                        { value: 'Efectivo', label: 'Efectivo' },
                        { value: 'Transferencia', label: 'Transferencia' },
                        { value: 'Tarjeta de Débito', label: 'Tarjeta Débito' },
                        { value: 'Tarjeta de Crédito', label: 'Tarjeta Crédito' }
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div>
                {loading ? (
                  <div className="py-12 text-center text-xs text-neutral-warm-600">Cargando...</div>
                ) : transacciones.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
                    Ningún cobro registrado coincide con los filtros activos.
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-neutral-warm-50 text-neutral-warm-600 text-[10px] uppercase tracking-wider font-medium bg-[#FAF9F5]">
                            <th className="py-2.5 px-3 sticky left-0 bg-[#FAF9F5] z-20 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Fecha / Hora</th>
                            <th className="py-2.5 px-3">Paciente</th>
                            <th className="py-2.5 px-3">Método</th>
                            <th className="py-2.5 px-3">Monto</th>
                            <th className="py-2.5 px-3">Imputación de Pago</th>
                            <th className="py-2.5 px-3 text-right">Comprobante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-warm-50">
                          {transacciones.map(tx => {
                            const date = new Date(tx.fecha_pago);
                            const formattedDate = date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            return (
                              <tr key={tx.id} className="hover:bg-neutral-warm-50/20 transition-colors group">
                                <td className="py-3 px-3 font-mono text-[11px] text-neutral-warm-900 sticky left-0 bg-white z-10 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-[#FAF9F5] transition-colors">
                                  {formattedDate}
                                </td>
                                <td className="py-3 px-3 font-medium text-neutral-warm-900">
                                  {tx.paciente_nombre}
                                </td>
                                <td className="py-3 px-3 text-neutral-warm-600 font-medium">
                                  {tx.metodo_pago}
                                </td>
                                <td className="py-3 px-3 font-semibold font-mono text-[#3B6D11]">
                                  {tx.moneda === 'ARS' ? `$ ` : `U$S `}{tx.monto.toLocaleString('es-AR')}
                                </td>
                                <td className="py-3 px-3 text-[10px] text-neutral-warm-600 font-medium italic">
                                  {tx.constancia_turno || <span className="text-neutral-warm-400">Abono general / cuenta</span>}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => openTicket(tx)}
                                    className="text-neutral-warm-600 hover:text-neutral-warm-900 hover:bg-neutral-warm-50 p-1.5 rounded-full transition-colors cursor-pointer"
                                    title="Ver Comprobante de Cobro"
                                  >
                                    <Receipt size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile stacked cards view */}
                    <div className="md:hidden divide-y divide-neutral-warm-100/60">
                      {transacciones.map(tx => {
                        const date = new Date(tx.fecha_pago);
                        const formattedDate = date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

                        return (
                          <div key={tx.id} className="p-4 flex flex-col gap-2.5">
                            {/* Fecha/Hora + Paciente arriba */}
                            <div className="flex justify-between items-start">
                              <div className="min-w-0">
                                <span className="block font-bold text-neutral-warm-950 text-sm truncate">{tx.paciente_nombre}</span>
                                <span className="text-[10px] text-neutral-warm-400 font-mono block mt-0.5">{formattedDate}</span>
                              </div>
                              <button
                                onClick={() => openTicket(tx)}
                                className="shrink-0 flex items-center gap-1.5 bg-neutral-warm-50 hover:bg-neutral-warm-100 text-neutral-warm-700 px-2.5 py-1.5 rounded-lg border border-neutral-warm-100/80 transition-colors cursor-pointer"
                                title="Ver Comprobante de Cobro"
                              >
                                <Receipt size={14} className="text-neutral-warm-600" />
                                <span className="text-[10px] font-bold">Ticket</span>
                              </button>
                            </div>

                            {/* Detalle abajo en formato lista horizontal/grilla */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-warm-50/80 text-[11px]">
                              <div>
                                <span className="block text-[9px] text-neutral-warm-400 uppercase tracking-wide mb-0.5">Método</span>
                                <span className="font-medium text-neutral-warm-800">{tx.metodo_pago}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-neutral-warm-400 uppercase tracking-wide mb-0.5">Monto</span>
                                <span className="font-semibold font-mono text-[#3B6D11]">
                                  {tx.moneda === 'ARS' ? `$ ` : `U$S `}{tx.monto.toLocaleString('es-AR')}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-neutral-warm-400 uppercase tracking-wide mb-0.5">Imputación</span>
                                <span className="font-medium text-neutral-warm-600 italic block truncate" title={tx.constancia_turno || 'Abono general / cuenta'}>
                                  {tx.constancia_turno || 'Abono / Cuenta'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: REGISTER COBRO CON DESGLOSE POR TURNO --- */}
      <Modal isOpen={isAbonoOpen} onClose={() => setIsAbonoOpen(false)} title="Registrar Cobro / Amortización de Deuda">
        {selectedDeudor && (
          <form onSubmit={handleRegisterAbono} className="space-y-4">
            <div className="text-xs border-b border-neutral-warm-100 pb-3">
              <div><span className="font-bold text-neutral-warm-900">Paciente:</span> {selectedDeudor.apellido}, {selectedDeudor.nombre}</div>
              <div className="mt-1"><span className="font-bold text-neutral-warm-900">DNI:</span> <span className="font-mono">{selectedDeudor.dni}</span></div>
            </div>

            {/* Total Global Debt Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FEF3C7]/40 p-3 rounded-xl border border-[#FDE68A] text-xs">
              <div>
                <span className="text-neutral-warm-600 block font-medium">Deuda Total Pesos</span>
                <span className="font-mono font-bold text-[#A32D2D] text-sm">$ {selectedDeudor.saldo_ars.toLocaleString('es-AR')}</span>
              </div>
              <div>
                <span className="text-neutral-warm-600 block font-medium">Deuda Total Dólares</span>
                <span className="font-mono font-bold text-[#A32D2D] text-sm">U$S {selectedDeudor.saldo_usd.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* Selector de Tipo de Imputación */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-warm-600 uppercase tracking-wider block">
                Método de Imputación del Pago
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('general')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                    paymentType === 'general'
                      ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
                      : 'bg-[#F1EFE8] text-neutral-warm-800 border-neutral-warm-200 hover:bg-neutral-warm-100'
                  }`}
                >
                  Abono Libre a Cuenta
                </button>
                <button
                  type="button"
                  disabled={turnosConDeuda.length === 0}
                  onClick={() => setPaymentType('turnos')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                    turnosConDeuda.length === 0
                      ? 'opacity-40 cursor-not-allowed bg-neutral-warm-50 text-neutral-warm-400 border-neutral-warm-100'
                      : paymentType === 'turnos'
                      ? 'bg-[#1D9E75] border-[#1D9E75] text-white shadow-xs'
                      : 'bg-[#F1EFE8] text-neutral-warm-800 border-neutral-warm-200 hover:bg-neutral-warm-100'
                  }`}
                >
                  Imputar a Turnos ({turnosConDeuda.length})
                </button>
              </div>
            </div>

            {/* List of outstanding turnos with checkboxes */}
            {paymentType === 'turnos' && (
              <div className="space-y-2 border border-neutral-warm-100 rounded-xl p-3 bg-neutral-warm-50/30 max-h-[220px] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-warm-700 uppercase tracking-wider">
                    Saldar Turnos Específicos:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedTurnoIds.length === turnosConDeuda.length) {
                        setSelectedTurnoIds([]);
                      } else {
                        setSelectedTurnoIds(turnosConDeuda.map(t => t.id));
                      }
                    }}
                    className="text-[9px] font-bold text-[#1D9E75] hover:underline cursor-pointer"
                  >
                    {selectedTurnoIds.length === turnosConDeuda.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>

                {loadingTurnos ? (
                  <div className="py-6 text-center text-xs text-neutral-warm-500 italic">Cargando turnos con deuda...</div>
                ) : turnosConDeuda.length === 0 ? (
                  <div className="py-4 text-center text-xs text-neutral-warm-500 italic">No se hallaron turnos pendientes.</div>
                ) : (
                  <div className="space-y-2">
                    {turnosConDeuda.map(t => {
                      const isSelected = selectedTurnoIds.includes(t.id);
                      const tDate = new Date(t.fecha_hora);
                      const dateString = tDate.toLocaleDateString('es-AR') + ' ' + tDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                      const pendingString = `Saldos: ARS: $${t.saldo_pendiente_ars.toLocaleString('es-AR')} | USD: U$S ${t.saldo_pendiente_usd.toLocaleString('es-AR')}`;
                      
                      return (
                        <label
                          key={t.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-[#EAF3DE] border-[#A8D385] text-neutral-warm-950'
                              : 'bg-white border-neutral-warm-100 text-neutral-warm-800 hover:bg-neutral-warm-50/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedTurnoIds(prev => prev.filter(id => id !== t.id));
                              } else {
                                setSelectedTurnoIds(prev => [...prev, t.id]);
                              }
                            }}
                            className="mt-0.5 rounded border-neutral-warm-200 text-[#1D9E75] focus:ring-[#1D9E75] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between font-bold text-neutral-warm-950">
                              <span>{dateString}</span>
                              <span className="text-[#A32D2D] font-mono flex flex-col items-end">
                                {t.saldo_pendiente_ars > 0 && <span>$ {t.saldo_pendiente_ars.toLocaleString('es-AR')}</span>}
                                {t.saldo_pendiente_usd > 0 && <span>U$S {t.saldo_pendiente_usd.toLocaleString('es-AR')}</span>}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-warm-600 truncate mt-0.5">
                              Motivo: {t.motivo} • Dr. {t.doctor_nombre}
                            </p>
                            <p className="text-[9px] text-neutral-warm-500 font-mono mt-0.5">
                              {pendingString}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Registrar Pagos Inmediatos Recibidos / Detalle de Cobros */}
            <div className="space-y-3 bg-neutral-warm-50/40 border border-neutral-warm-100 p-3.5 rounded-xl">
              <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-1.5 mb-1">
                <label className="text-xs font-bold text-neutral-warm-700 sentence-case block">
                  Detalle de Cobros / Caja
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addLineaPago('ARS')}
                    className="text-[11px] font-bold text-[#1D9E75] hover:underline cursor-pointer"
                  >
                    + ARS ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => addLineaPago('USD')}
                    className="text-[11px] font-bold text-[#1D9E75] hover:underline cursor-pointer"
                  >
                    + USD (U$S)
                  </button>
                </div>
              </div>

              {lineasPago.length === 0 ? (
                <div className="text-[10px] text-neutral-warm-500 bg-white py-6 rounded-lg text-center border border-dashed border-neutral-warm-100 px-3 leading-normal">
                  Ningún cobro registrado.<br />
                  Debe agregar al menos un cobro (+ARS o +USD) para poder registrar el pago.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                  {lineasPago.map((p, idx) => (
                    <div key={idx} className="bg-white border border-neutral-warm-100 p-2.5 rounded-lg flex flex-col gap-2 text-xs shadow-3xs">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-neutral-warm-900 uppercase text-[10px] bg-neutral-warm-100 px-1.5 py-0.5 rounded">
                          {p.moneda}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-warm-500">Monto:</span>
                          <input
                            type="number"
                            required
                            min={0.1}
                            step="any"
                            value={p.monto || ''}
                            onChange={e => updateLineaPago(idx, 'monto', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-24 text-xs border border-neutral-warm-100 rounded py-0.5 px-1.5 bg-white text-neutral-warm-900 text-right font-medium font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        <CustomSelect
                          className="w-full text-[11px]"
                          value={p.metodo_pago}
                          onChange={val => updateLineaPago(idx, 'metodo_pago', String(val))}
                          options={[
                            { value: 'Efectivo', label: 'Efectivo' },
                            { value: 'Transferencia', label: 'Transferencia Bancaria' },
                            { value: 'Tarjeta de Débito', label: 'Tarjeta Débito' },
                            { value: 'Tarjeta de Crédito', label: 'Tarjeta Crédito' }
                          ]}
                        />

                        {lineasPago.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineaPago(idx)}
                            className="text-red-600 hover:text-red-800 font-bold px-1 text-[11px] cursor-pointer"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {paymentType === 'turnos' && selectedTurnoIds.length > 0 && (
                <p className="text-[9px] text-neutral-warm-500 italic">
                  * El monto sugerido se pre-calculó automáticamente sumando el saldo de los turnos seleccionados en cada moneda. Sigue siendo totalmente editable.
                </p>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-warm-100">
              <button
                type="button"
                onClick={() => setIsAbonoOpen(false)}
                className="px-4 py-2 rounded-lg border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Registrar Cobro
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* --- MODAL 2: VIRTUAL PRINTABLE TICKET COMPROBANTE --- */}
      <Modal isOpen={isTicketOpen} onClose={() => setIsTicketOpen(false)} title="Comprobante de Recepción de Fondos" size="sm">
        {selectedTicket && (
          <div className="space-y-6">
            {/* Ticket receipt container */}
            <div className="print-ticket border border-dashed border-neutral-warm-200 p-6 rounded-lg bg-neutral-warm-50/40 text-xs font-mono space-y-4 shadow-2xs">
              <div className="text-center border-b border-dashed border-neutral-warm-200 pb-3 space-y-1">
                <h4 className="font-bold text-sm tracking-tight uppercase">OdontoGest</h4>
                <p className="text-[10px] text-neutral-warm-600">Consultorio Odontológico Integral</p>
                <p className="text-[9px] text-neutral-warm-600">
                  {new Date(selectedTicket.fecha_pago).toLocaleDateString('es-AR')} {new Date(selectedTicket.fecha_pago).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </div>

              <div className="space-y-1.5">
                <div><span className="text-neutral-warm-600 uppercase text-[9px] block">Comprobante Nro:</span> <span className="font-bold">{selectedTicket.id}</span></div>
                <div><span className="text-neutral-warm-600 uppercase text-[9px] block">Paciente:</span> <span className="font-bold">{selectedTicket.paciente_nombre || 'Paciente'}</span></div>
                <div><span className="text-neutral-warm-600 uppercase text-[9px] block">DNI:</span> <span className="font-bold font-mono">{selectedTicket.dni_paciente}</span></div>
              </div>

              <div className="border-t border-dashed border-neutral-warm-200 pt-3 space-y-2">
                <div>
                  <span className="text-neutral-warm-600 uppercase text-[9px] block">Monto Percibido:</span> 
                  <span className="font-bold text-xs text-[#3B6D11] block space-y-0.5">
                    {selectedTicket.monto_ars && selectedTicket.monto_ars > 0 ? (
                      <div>$ {selectedTicket.monto_ars.toLocaleString('es-AR')} ARS</div>
                    ) : null}
                    {selectedTicket.monto_usd && selectedTicket.monto_usd > 0 ? (
                      <div>U$S {selectedTicket.monto_usd.toLocaleString('es-AR')} USD</div>
                    ) : null}
                    {(!selectedTicket.monto_ars || selectedTicket.monto_ars <= 0) && (!selectedTicket.monto_usd || selectedTicket.monto_usd <= 0) ? (
                      <div>{selectedTicket.moneda === 'ARS' ? `$ ` : `U$S `}{selectedTicket.monto.toLocaleString('es-AR')} {selectedTicket.moneda}</div>
                    ) : null}
                  </span>
                </div>
                <div><span className="text-neutral-warm-600 uppercase text-[9px] block">Método de Cobro:</span> <span className="font-bold">{selectedTicket.metodo_pago}</span></div>
                
                <div className="space-y-1">
                  <span className="text-neutral-warm-600 uppercase text-[9px] block">Imputación / Detalle:</span>
                  <div className="divide-y divide-dashed divide-neutral-warm-200/60 font-mono text-[10px]">
                    {selectedTicket.imputaciones.map((imp, idx) => (
                      <div key={idx} className="py-1 flex justify-between gap-4 text-neutral-warm-800 font-mono">
                        <span className="font-medium truncate">{imp.detalle}</span>
                        <span className="font-bold shrink-0">
                          {imp.moneda === 'ARS' ? `$ ` : `U$S `}{imp.monto.toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-neutral-warm-200 pt-3 text-center text-[9px] text-neutral-warm-500 uppercase">
                *** Gracias por su confianza ***
              </div>
            </div>

            {/* Print trigger action */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-neutral-warm-900 hover:bg-neutral-warm-900/85 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>Imprimir Comprobante</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
