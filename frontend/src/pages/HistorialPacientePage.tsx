import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaciente, getHistorialPaciente, getPagos } from '../services/api';
import type { Paciente, HistorialPacienteResponse, PagoContextoResponse } from '../types';

type MetodoFiltro = 'todos' | 'efectivo' | 'transferencia';

export default function HistorialPacientePage() {
  const { dni } = useParams<{ dni: string }>();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [loadingPaciente, setLoadingPaciente] = useState(true);

  // ── Columna izquierda: historial de tratamientos ──────────
  const [historial, setHistorial] = useState<HistorialPacienteResponse | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // ── Columna derecha: pagos registrados ─────────────────────
  const [pagos, setPagos] = useState<PagoContextoResponse[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [filtroMetodo, setFiltroMetodo] = useState<MetodoFiltro>('todos');

  // Cargar paciente (nombre para el header)
  useEffect(() => {
    if (!dni) return;
    let cancelled = false;
    setLoadingPaciente(true);
    getPaciente(dni)
      .then(p => { if (!cancelled) setPaciente(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingPaciente(false); });
    return () => { cancelled = true; };
  }, [dni]);

  // Cargar historial de tratamientos
  useEffect(() => {
    if (!dni) return;
    let cancelled = false;
    setLoadingHistorial(true);
    const params: Record<string, string> = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    getHistorialPaciente(dni, params)
      .then(h => { if (!cancelled) setHistorial(h); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistorial(false); });
    return () => { cancelled = true; };
  }, [dni, fechaDesde, fechaHasta]);

  // Cargar pagos con filtro de método
  useEffect(() => {
    if (!dni) return;
    let cancelled = false;
    setLoadingPagos(true);
    const params: Record<string, string> = { dni_paciente: dni };
    if (filtroMetodo !== 'todos') params.metodo_pago = filtroMetodo;
    getPagos(params)
      .then(p => { if (!cancelled) setPagos(p); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingPagos(false); });
    return () => { cancelled = true; };
  }, [dni, filtroMetodo]);

  const totalPagosARS = pagos.reduce((s, p) => p.moneda === 'ARS' ? s + p.monto : s, 0);
  const totalPagosUSD = pagos.reduce((s, p) => p.moneda === 'USD' ? s + p.monto : s, 0);

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function formatFechaCorta(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  }

  if (!dni) {
    return (
      <div className="p-4 md:p-8 h-full flex items-center justify-center">
        <p className="text-slate-500">DNI no proporcionado</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10 h-full flex flex-col">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="mb-6 animate-fade-slide-up">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors mb-3"
        >
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Historial de Pagos y Tratamientos
        </h1>
        {loadingPaciente ? (
          <p className="text-sm font-medium text-slate-400 mt-1">Cargando...</p>
        ) : paciente ? (
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">
            <span className="material-symbols-rounded text-[16px]">badge</span>
            {paciente.nombre} {paciente.apellido} — DNI: {paciente.dni}
          </p>
        ) : (
          <p className="text-sm font-medium text-red-400 mt-1">Paciente no encontrado</p>
        )}
      </header>

      {/* ── Grid 2 columnas ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 flex-1">

        {/* ═════════════════════════════════════════════════════
            COLUMNA IZQUIERDA: Historial de Tratamientos
           ═════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-rounded text-[#0061a4]">history</span>
                Historial de Tratamientos
              </h3>
              {/* Filtros de fecha */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0061a4]"
                />
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0061a4]"
                />
              </div>
            </div>

            {loadingHistorial ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-[#c2e7ff] border-t-[#0061a4] animate-spin" />
              </div>
            ) : historial ? (
              <div className="flex-1 overflow-y-auto">
                {/* Cards de totales */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Tratamientos</p>
                    <p className="text-sm font-bold text-[#0061a4] mt-1">
                      ARS ${historial.totales.total_tratamientos_ars.toLocaleString()}
                    </p>
                    {historial.totales.total_tratamientos_usd > 0 && (
                      <p className="text-xs font-bold text-slate-600">
                        USD ${historial.totales.total_tratamientos_usd.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Pagado</p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">
                      ARS ${historial.totales.total_pagado_ars.toLocaleString()}
                    </p>
                    {historial.totales.total_pagado_usd > 0 && (
                      <p className="text-xs font-bold text-emerald-600">
                        USD ${historial.totales.total_pagado_usd.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Saldo</p>
                    <p className={`text-sm font-bold mt-1 ${historial.totales.saldo_ars > 0 ? 'text-[#B3261E]' : 'text-emerald-600'}`}>
                      ARS ${historial.totales.saldo_ars.toLocaleString()}
                    </p>
                    {historial.totales.saldo_usd > 0 && (
                      <p className="text-xs font-bold text-[#B3261E]">
                        USD ${historial.totales.saldo_usd.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lista de turnos */}
                {historial.turnos.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <span className="material-symbols-rounded text-4xl block mb-2">event_busy</span>
                    <p className="text-sm font-medium">Sin turnos en el período seleccionado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...historial.turnos]
                      .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
                      .map(turno => (
                        <div key={turno.id} id={`turno-${turno.id}`} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          {/* Encabezado del turno */}
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-bold text-slate-800">
                                Turno #{turno.id} — {formatFecha(turno.fecha_hora)} — Dr. {turno.doctor.nombre}
                              </p>
                              <span className={`text-xs font-bold uppercase ${
                                turno.estado === 'Realizado' ? 'text-emerald-600' :
                                turno.estado === 'Cancelado' ? 'text-red-500' : 'text-amber-600'
                              }`}>
                                {turno.estado}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500 font-medium">Total turno</p>
                              <p className="text-sm font-bold text-[#0061a4]">ARS ${turno.total_ars.toLocaleString()}</p>
                              {turno.total_usd > 0 && (
                                <p className="text-xs text-slate-600">USD ${turno.total_usd.toLocaleString()}</p>
                              )}
                            </div>
                          </div>

                          {/* Tratamientos */}
                          {turno.tratamientos.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tratamientos</p>
                              <div className="space-y-1">
                                {turno.tratamientos.map((t, i) => (
                                  <div key={i} className="flex justify-between text-sm bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                                    <span className="text-slate-700 font-medium">{t.nombre} ×{t.cantidad}</span>
                                    <span className="text-slate-600 text-xs">
                                      {t.precio_ars && `ARS $${t.precio_ars.toLocaleString()}`}
                                      {t.precio_ars && t.precio_usd && ' / '}
                                      {t.precio_usd && `USD $${t.precio_usd.toLocaleString()}`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pagos del turno */}
                          {turno.pagos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase">Pagos del Turno</p>
                              {turno.pagos.map(p => (
                                <div key={p.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-1.5 border border-slate-100">
                                  <span className="text-slate-600 text-xs">{formatFechaCorta(p.fecha)} — {p.metodo_pago}</span>
                                  <span className="text-emerald-700 font-medium text-xs">
                                    {p.moneda} ${p.monto.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Resumen financiero del turno */}
                          <div className="mt-4 pt-3 border-t border-slate-200 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Total pagado</span>
                              <span className="text-xs font-bold text-emerald-700">
                                ARS ${turno.total_pagado_ars.toLocaleString()}
                                {turno.total_pagado_usd > 0 && ` / USD $${turno.total_pagado_usd.toLocaleString()}`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-slate-500">Saldo</span>
                              <span className={`text-xs font-bold ${turno.saldo_ars > 0 ? 'text-[#B3261E]' : 'text-emerald-600'}`}>
                                ARS ${turno.saldo_ars.toLocaleString()}
                                {turno.saldo_usd > 0 && ` / USD $${turno.saldo_usd.toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════
            COLUMNA DERECHA: Pagos Registrados
           ═════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col flex-1">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-rounded text-emerald-600">payments</span>
                Pagos Registrados
              </h3>
              {/* Filtro método */}
              <div className="flex gap-1 bg-slate-100 rounded-full p-1">
                {(['todos', 'efectivo', 'transferencia'] as MetodoFiltro[]).map(m => (
                  <button
                    key={m}
                    onClick={() => setFiltroMetodo(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      filtroMetodo === m
                        ? 'bg-white text-[#0061a4] shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {m === 'todos' ? 'Todos' : m === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                  </button>
                ))}
              </div>
            </div>

            {loadingPagos ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  {pagos.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <span className="material-symbols-rounded text-4xl block mb-2">receipt_long</span>
                      <p className="text-sm font-medium">Sin pagos registrados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pagos.map(pago => (
                        <div
                          key={pago.id}
                          className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-slate-400 text-lg">calendar_today</span>
                              <span className="text-sm font-medium text-slate-700">{formatFechaCorta(pago.fecha_pago)}</span>
                            </div>
                            {pago.id_turno && (
                              <a
                                href={`#turno-${pago.id_turno}`}
                                className="text-xs font-mono text-[#0061a4] hover:underline"
                              >
                                #{pago.id_turno}
                              </a>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                              pago.metodo_pago === 'efectivo'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                              <span className="material-symbols-rounded text-[13px]">
                                {pago.metodo_pago === 'efectivo' ? 'payments' : 'account_balance'}
                              </span>
                              {pago.metodo_pago}
                            </span>
                            <span className={`text-sm font-bold ${
                              pago.moneda === 'ARS' ? 'text-[#0061a4]' : 'text-emerald-700'
                            }`}>
                              {pago.moneda === 'ARS'
                                ? `$${pago.monto.toLocaleString('es-AR')}`
                                : `U$D ${pago.monto.toLocaleString('es-AR')}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Totales */}
                {pagos.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                    {totalPagosARS > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500 font-medium">Total ARS</span>
                        <span className="text-xs font-bold text-[#0061a4]">${totalPagosARS.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {totalPagosUSD > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500 font-medium">Total USD</span>
                        <span className="text-xs font-bold text-emerald-700">U$D {totalPagosUSD.toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-50">
                      <span className="text-xs text-slate-400">{pagos.length} pago{pagos.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}