import { useEffect, useState } from 'react';
import { getCajaHoy, getDeudores, getTurnos, registrarPago } from '../services/api';
import type { ResumenCaja, Deudor, Turno } from '../types';
import KPICard from '../components/KPICard';

type FiltroCuenta = 'todos' | 'deudores_ars' | 'deudores_usd' | 'aldia';

export default function PagosPage() {
  const [caja, setCaja] = useState<ResumenCaja | null>(null);
  const [deudores, setDeudores] = useState<Deudor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroCuenta>('todos');

  const [sideSheetOpen, setSideSheetOpen] = useState(false);
  const [cobroPaciente, setCobroPaciente] = useState<Deudor | null>(null);
  const [cobroMoneda, setCobroMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [cobroMonto, setCobroMonto] = useState(0);
  const [cobroMetodo, setCobroMetodo] = useState('efectivo');
  const [cobroNotas, setCobroNotas] = useState('');
  const [cobroTurnoId, setCobroTurnoId] = useState<number | null>(null);
  const [turnosPaciente, setTurnosPaciente] = useState<Turno[]>([]);
  const [cobrando, setCobrando] = useState(false);
  const [cobroExito, setCobroExito] = useState(false);

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

  const deudoresFiltrados = deudores.filter(d => {
    if (filtro === 'deudores_ars') return d.saldo_ars > 0;
    if (filtro === 'deudores_usd') return d.saldo_usd > 0;
    if (filtro === 'aldia') return d.saldo_ars === 0 && d.saldo_usd === 0;
    return true;
  });

  const chips: { key: FiltroCuenta; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'deudores_ars', label: 'Deudores ARS' },
    { key: 'deudores_usd', label: 'Deudores USD' },
    { key: 'aldia', label: 'Al Día' },
  ];

  async function abrirSideSheet(deudor: Deudor) {
    setCobroPaciente(deudor);
    setCobroMoneda(deudor.saldo_ars > 0 ? 'ARS' : 'USD');
    setCobroMonto(0);
    setCobroMetodo('efectivo');
    setCobroNotas('');
    setCobroTurnoId(null);
    setCobroExito(false);
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
        notas: cobroNotas || undefined,
      });
      setCobroExito(true);
      const deudoresData = await getDeudores();
      setDeudores(deudoresData);
    } catch { /* ignore */ } finally {
      setCobrando(false);
    }
  }

  function getSaldoActual(deudor: Deudor) {
    return cobroPaciente?.dni === deudor.dni && cobroExito
      ? { ars: 0, usd: 0 }
      : { ars: deudor.saldo_ars, usd: deudor.saldo_usd };
  }

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10">
      <header className="mb-8 animate-fade-slide-up">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Pagos y Finanzas</h1>
        <p className="text-sm text-slate-500 mt-1">Control de caja, abonos y cuentas corrientes (ARS/USD)</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
        <KPICard
          title="Ingresos de Hoy"
          value={
            loading
              ? '-'
              : `ARS $${(caja?.ingresos_ars ?? 0).toLocaleString()} / USD $${(caja?.ingresos_usd ?? 0).toLocaleString()}`
          }
          subtitle="Hoy"
          icon="point_of_sale"
          color="bg-emerald-50 text-emerald-600"
          loading={loading}
          delay={0}
        />
        <KPICard
          title="Saldo en la Calle"
          value={
            loading
              ? '-'
              : `ARS $${totalDeudaARS.toLocaleString()} / USD $${totalDeudaUSD.toLocaleString()}`
          }
          subtitle="Alerta"
          icon="warning"
          color="bg-red-50 text-[#B3261E]"
          loading={loading}
          delay={100}
        />
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden animate-fade-slide-up">
        <div className="p-6 border-b border-slate-50 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-rounded text-slate-400">account_balance_wallet</span>
            Control de Cuentas
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto">
            {chips.map(chip => (
              <button
                key={chip.key}
                onClick={() => setFiltro(chip.key)}
                className={`px-4 py-2 rounded-full border transition-colors whitespace-nowrap text-xs font-bold ${
                  filtro === chip.key
                    ? 'bg-[#0061a4] text-white border-[#0061a4]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 py-4">Paciente</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-right">Saldo ARS</th>
                <th className="px-6 py-4 text-right">Saldo USD</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {deudoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-rounded text-4xl block mb-2">check_circle</span>
                    No hay pacientes en esta categoría
                  </td>
                </tr>
              ) : (
                deudoresFiltrados.map((deudor, i) => {
                  const saldo = getSaldoActual(deudor);
                  const tieneDeuda = saldo.ars > 0 || saldo.usd > 0;
                  return (
                    <tr
                      key={deudor.dni}
                      className="border-b border-slate-50 hover:bg-[#fcf8f8] transition-colors animate-fade-slide-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-base">
                            {deudor.apellido}, {deudor.nombre}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">DNI: {deudor.dni}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium text-sm">
                        {deudor.telefono || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {saldo.ars > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#B3261E] bg-[#fce8e8] px-3 py-1.5 rounded-lg border border-[#f9dada]">
                            - $ {saldo.ars.toLocaleString()} ARS
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">$ 0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {saldo.usd > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#B3261E] bg-[#fce8e8] px-3 py-1.5 rounded-lg border border-[#f9dada]">
                            - U$D {saldo.usd.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">U$D 0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {tieneDeuda ? (
                          <button
                            onClick={() => abrirSideSheet(deudor)}
                            className="bg-white border border-slate-200 hover:border-[#0061a4] hover:text-[#0061a4] text-slate-600 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm mx-auto"
                            title="Registrar Abono"
                          >
                            <span className="material-symbols-rounded text-xl">payments</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs">
                            <span className="material-symbols-rounded text-[14px]">check_circle</span>
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

      {sideSheetOpen && cobroPaciente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-fade-slide-up"
            style={{ animation: 'slideInRight 0.3s ease-out' }}
          >
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[#0061a4]">point_of_sale</span>
                  Registrar Abono
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  {cobroPaciente.apellido}, {cobroPaciente.nombre}
                </p>
              </div>
              <button
                onClick={() => setSideSheetOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              {cobroExito ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-rounded text-5xl">check_circle</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Abono Registrado</h3>
                  <p className="text-sm text-slate-500 text-center">
                    El pago se registró correctamente en el sistema.
                  </p>
                  <button
                    onClick={() => {
                      setSideSheetOpen(false);
                      setCobroExito(false);
                    }}
                    className="mt-4 px-6 py-3 rounded-2xl bg-[#0061a4] text-white font-bold hover:bg-[#00528c]"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-[#fce8e8] border border-[#f9dada] rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[#B3261E] uppercase tracking-wider mb-1">Deuda Pendiente</p>
                      <p className="text-2xl font-bold text-[#B3261E]">
                        {cobroMoneda === 'ARS'
                          ? `$ ${cobroPaciente.saldo_ars.toLocaleString()} ARS`
                          : `U$D ${cobroPaciente.saldo_usd.toLocaleString()}`}
                      </p>
                    </div>
                    <span className="material-symbols-rounded text-4xl text-[#B3261E]/20">account_balance_wallet</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                      <span className="material-symbols-rounded text-[18px] text-[#0061a4]">add_circle</span>
                      Detalle del Pago
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">Moneda del Abono</label>
                        <select
                          value={cobroMoneda}
                          onChange={e => setCobroMoneda(e.target.value as 'ARS' | 'USD')}
                          className="w-full mt-1 px-4 py-3 rounded-[12px] border border-slate-200 focus:ring-2 focus:ring-[#0061a4] bg-slate-50 font-bold text-slate-800 outline-none"
                        >
                          <option value="ARS">Pesos Argentinos (ARS)</option>
                          <option value="USD">Dólares (USD)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">Monto a entregar</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3.5 text-slate-400 font-bold">
                            {cobroMoneda === 'ARS' ? '$' : 'U$D'}
                          </span>
                          <input
                            type="number"
                            value={cobroMonto || ''}
                            onChange={e => setCobroMonto(Number(e.target.value))}
                            placeholder="Ej: 5000"
                            className="w-full mt-1 pl-10 pr-4 py-3 rounded-[12px] border border-slate-200 focus:ring-2 focus:ring-[#0061a4] outline-none font-bold text-slate-800 text-lg"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">Método de Pago</label>
                        <select
                          value={cobroMetodo}
                          onChange={e => setCobroMetodo(e.target.value)}
                          className="w-full mt-1 px-4 py-3 rounded-[12px] border border-slate-200 focus:ring-2 focus:ring-[#0061a4] bg-white font-medium text-slate-700 outline-none"
                        >
                          <option value="efectivo">Efectivo Billetes</option>
                          <option value="transferencia">Transferencia (MercadoPago/Banco)</option>
                          <option value="tarjeta">Tarjeta (Crédito/Débito)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">Turno Relacionado</label>
                        <select
                          value={cobroTurnoId || ''}
                          onChange={e => setCobroTurnoId(Number(e.target.value))}
                          className="w-full mt-1 px-4 py-3 rounded-[12px] border border-slate-200 focus:ring-2 focus:ring-[#0061a4] bg-white font-medium text-slate-700 outline-none"
                        >
                          <option value="">Seleccionar turno pendiente</option>
                          {turnosPaciente.map(t => (
                            <option key={t.id} value={t.id}>
                              #{t.id} - {t.motivo || 'Sin motivo'} ({new Date(t.fecha_hora).toLocaleDateString('es-AR')})
                            </option>
                          ))}
                          {turnosPaciente.length === 0 && (
                            <option value="" disabled>Sin turnos pendientes</option>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">Notas / Concepto (Opcional)</label>
                        <input
                          type="text"
                          value={cobroNotas}
                          onChange={e => setCobroNotas(e.target.value)}
                          placeholder="Ej: Entrega por 2da sesión"
                          className="w-full mt-1 px-4 py-3 rounded-[12px] border border-slate-200 focus:ring-2 focus:ring-[#0061a4] outline-none text-sm text-slate-700"
                        />
                      </div>

                      <div className="pt-4">
                        <button
                          onClick={handleRegistrarCobro}
                          disabled={cobrando || cobroMonto <= 0}
                          className="w-full bg-[#0061a4] hover:bg-[#00528c] text-white font-bold py-4 rounded-[16px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-rounded">receipt</span>
                          {cobrando ? 'Procesando...' : 'Registrar Abono'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}