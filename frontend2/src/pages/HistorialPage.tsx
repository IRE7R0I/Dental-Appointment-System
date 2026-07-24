import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Paciente, CuentaCorriente, Pago } from '../types';
import { 
  ArrowLeft, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  PlusCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  User, 
  Heart,
  Stethoscope,
  Receipt
} from 'lucide-react';

export function HistorialPage() {
  const { dni } = useParams<{ dni: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [cuentaCorriente, setCuentaCorriente] = useState<CuentaCorriente | null>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion state to collapse/expand turnos details
  const [expandedTurnos, setExpandedTurnos] = useState<{ [id: string]: boolean }>({});

  const loadData = async () => {
    if (!dni) return;
    setLoading(true);
    try {
      const [pacData, ccData] = await Promise.all([
        apiFetch(`/api/pacientes/${dni}`),
        apiFetch(`/api/pacientes/${dni}/cuenta`)
      ]);
      setPaciente(pacData);
      setCuentaCorriente(ccData);
      setMovimientos(ccData.movimientos || []);
    } catch (e: any) {
      showToast('Error cargando historial del paciente.', 'error');
      navigate('/pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dni]);

  const toggleTurnoExpand = (key: string) => {
    setExpandedTurnos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-neutral-warm-600 gap-2 text-xs bg-white border border-neutral-warm-100 rounded-xl">
        <svg className="animate-spin h-6 w-6 text-[#1D9E75]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Cargando línea de tiempo del paciente...</span>
      </div>
    );
  }

  if (!paciente) return null;

  // Let's compute consolidated metrics
  const totalBilledArs = movimientos.filter(m => m.tipo === 'cargo' && m.moneda === 'ARS').reduce((acc, x) => acc + x.monto, 0);
  const totalPaidArs = movimientos.filter(m => m.tipo === 'abono' && m.moneda === 'ARS').reduce((acc, x) => acc + x.monto, 0);
  const pendingArs = cuentaCorriente?.saldo_ars || 0;

  const totalBilledUsd = movimientos.filter(m => m.tipo === 'cargo' && m.moneda === 'USD').reduce((acc, x) => acc + x.monto, 0);
  const totalPaidUsd = movimientos.filter(m => m.tipo === 'abono' && m.moneda === 'USD').reduce((acc, x) => acc + x.monto, 0);
  const pendingUsd = cuentaCorriente?.saldo_usd || 0;

  return (
    <div className="space-y-6">
      {/* Back to pacientes button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/pacientes')}
            className="p-2.5 rounded-xl border border-neutral-warm-100/60 bg-white hover:bg-neutral-warm-50 text-neutral-warm-900 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-neutral-warm-900 tracking-tight">
              Ficha de Cuenta Corriente
            </h2>
            <p className="text-xs text-neutral-warm-600 mt-1">
              Paciente: {paciente.apellido}, {paciente.nombre} • DNI {paciente.dni}
            </p>
          </div>
        </div>

        {/* Cobertura tag */}
        <span className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-neutral-warm-100/60 text-xs font-semibold text-neutral-warm-900 shadow-2xs">
          Prepaga: {paciente.obra_social || 'Particular'}
        </span>
      </div>

      {/* Grid of consolidated balances per Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pesos Card */}
        <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1D9E75]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-warm-600">
            Resumen en Pesos ARS
          </h3>
          
          <div className="grid grid-cols-3 gap-2 text-center py-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-warm-600">Total Facturado</span>
              <span className="text-xs font-medium text-neutral-warm-900 mt-1">$ {totalBilledArs.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-warm-600">Total Abonado</span>
              <span className="text-xs font-medium text-[#3B6D11] mt-1">$ {totalPaidArs.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-warm-600">Saldo Pendiente</span>
              <span className={`text-xs font-semibold mt-1 ${pendingArs > 0 ? 'text-[#A32D2D]' : 'text-[#3B6D11]'}`}>
                $ {pendingArs.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* USD Card */}
        <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#5DCAA5]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-warm-600">
            Resumen en Dólares USD
          </h3>
          
          <div className="grid grid-cols-3 gap-2 text-center py-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-warm-600">Total Facturado</span>
              <span className="text-xs font-medium text-neutral-warm-900 mt-1">U$S {totalBilledUsd.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-warm-600">Total Abonado</span>
              <span className="text-xs font-medium text-[#3B6D11] mt-1">U$S {totalPaidUsd.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-warm-600">Saldo Pendiente</span>
              <span className={`text-xs font-semibold mt-1 ${pendingUsd > 0 ? 'text-[#A32D2D]' : 'text-[#3B6D11]'}`}>
                U$S {pendingUsd.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Downward Timeline of movements */}
      <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-6">
        <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight border-b border-neutral-warm-50 pb-3">
          Historial de Cuenta Corriente (Cargos vs Abonos)
        </h3>

        {movimientos.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-warm-600 italic">
            No se registran movimientos ni transacciones financieras para este paciente.
          </div>
        ) : (
          <div className="relative border-l border-neutral-warm-100 ml-4 pl-6 space-y-6">
            
            {movimientos.map((m, idx) => {
              const isCargo = m.tipo === 'cargo';
              const isExpanded = !!expandedTurnos[`${m.id}-${idx}`];
              const date = new Date(m.fecha);
              const formattedDate = date.toLocaleDateString('es-AR') + ' - ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' hs';

              return (
                <div key={idx} className="relative group">
                  {/* Timeline bullet dot */}
                  <span className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                    isCargo ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#EAF3DE] text-[#3B6D11]'
                  }`}>
                    {isCargo ? (
                      <TrendingDown size={10} />
                    ) : (
                      <TrendingUp size={10} />
                    )}
                  </span>

                  {/* Body Card */}
                  <div className="bg-neutral-warm-50/20 border border-neutral-warm-100/60 rounded-xl p-4 space-y-3 hover:border-neutral-warm-100 transition-all">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${
                          isCargo ? 'bg-[#FCEBEB] text-[#A32D2D] border-[#FCEBEB]' : 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]'
                        }`}>
                          {isCargo ? 'Cargo Sesión' : 'Abono / Pago'}
                        </span>
                        <span className="text-[10px] text-neutral-warm-600 font-mono">
                          {formattedDate}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`font-semibold text-xs ${isCargo ? 'text-[#A32D2D]' : 'text-[#3B6D11]'}`}>
                          {isCargo ? '+' : '-'} {m.moneda === 'ARS' ? '$' : 'U$S'} {m.monto.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>

                    {/* Descripcion */}
                    <div className="text-xs text-neutral-warm-900 leading-relaxed font-medium">
                      {m.descripcion || 'Registro financiero sin especificar'}
                    </div>

                    {/* Collapsible section for Cargo (Tied payments and medical notes!) */}
                    {isCargo && (
                      <div className="pt-2 border-t border-neutral-warm-50 space-y-2">
                        <button
                          onClick={() => toggleTurnoExpand(`${m.id}-${idx}`)}
                          className="text-[10px] text-[#1D9E75] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={12} />
                              <span>Ocultar detalles de consulta</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              <span>Ver evolución médica y cobros aplicados</span>
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="bg-white border border-neutral-warm-100/50 rounded-lg p-3 space-y-3 text-xs animate-fade-in">
                            {/* Doctor & Clinic note */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-neutral-warm-50">
                              <div>
                                <span className="text-[10px] text-neutral-warm-600 uppercase block">Profesional a cargo:</span>
                                <span className="font-semibold text-neutral-warm-900">{m.doctor_nombre || 'No especificado'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-warm-600 uppercase block">Prepaga / Cobertura:</span>
                                <span className="font-semibold text-neutral-warm-900">{m.obra_social || 'Particular'}</span>
                              </div>
                            </div>

                            {/* Medical evolution notes */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-neutral-warm-600 uppercase block">Evolución Médica Registrada:</span>
                              <p className="p-2 bg-neutral-warm-50/40 rounded border border-neutral-warm-50 text-[11px] text-neutral-warm-900 font-sans leading-relaxed italic whitespace-pre-line">
                                {m.comentarios_medicos || 'No se ingresaron comentarios o evolución clínica en esta sesión.'}
                              </p>
                            </div>

                            {/* Applied treatments details */}
                            {m.tratamientos && m.tratamientos.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] text-neutral-warm-600 uppercase block">Tratamientos Aplicados en Sesión:</span>
                                <div className="border border-neutral-warm-50 rounded overflow-hidden">
                                  <table className="w-full text-[10px] text-left border-collapse">
                                    <thead>
                                      <tr className="bg-neutral-warm-50/50 text-neutral-warm-600 font-normal">
                                        <th className="p-1 px-2">Detalle</th>
                                        <th className="p-1 px-2 text-center">Cant.</th>
                                        <th className="p-1 px-2 text-right">ARS</th>
                                        <th className="p-1 px-2 text-right">USD</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-warm-50/50">
                                      {m.tratamientos.map((tr: any, tIdx: number) => (
                                        <tr key={tIdx} className="hover:bg-neutral-warm-50/10">
                                          <td className="p-1 px-2 font-medium text-neutral-warm-900">{tr.nombre}</td>
                                          <td className="p-1 px-2 text-center text-neutral-warm-600">{tr.cantidad}</td>
                                          <td className="p-1 px-2 text-right font-semibold text-neutral-warm-900">$ {tr.precio_ars?.toLocaleString('es-AR') || 0}</td>
                                          <td className="p-1 px-2 text-right font-semibold text-neutral-warm-900">U$S {tr.precio_usd?.toLocaleString('es-AR') || 0}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Direct Payments registered in the session */}
                            {m.pagos_asociados && m.pagos_asociados.length > 0 ? (
                              <div className="space-y-1">
                                <span className="text-[10px] text-neutral-warm-600 uppercase block">Cobros Recibidos en esta Sesión:</span>
                                <div className="space-y-1">
                                  {m.pagos_asociados.map((p: any, pIdx: number) => (
                                    <div key={pIdx} className="flex items-center justify-between p-2 bg-[#EAF3DE]/30 border border-[#3B6D11]/10 rounded text-[11px] text-[#3B6D11]">
                                      <span className="font-medium flex items-center gap-1">
                                        <Receipt size={12} />
                                        <span>Pago #{p.id} recibido via {p.metodo_pago}</span>
                                      </span>
                                      <span className="font-bold">{p.moneda === 'ARS' ? '$' : 'U$S'} {p.monto.toLocaleString('es-AR')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-neutral-warm-600 italic">
                                No se recibieron abonos o cobros inmediatos en esta sesión. El costo fue imputado en la deuda del paciente.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
