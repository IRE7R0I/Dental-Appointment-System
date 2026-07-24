import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { KPICard } from '../components/KPICard';
import { Modal } from '../components/Modal';
import { CustomSelect } from '../components/CustomSelect';
import { useToast } from '../components/Toast';
import { Doctor, Turno, TratamientoCatalogo, ObraSocial, Paciente } from '../types';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Plus, 
  UserPlus, 
  Trash2, 
  CheckSquare, 
  X,
  PlusCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const fdiTeeth = [
  ...[11, 12, 13, 14, 15, 16, 17, 18],
  ...[21, 22, 23, 24, 25, 26, 27, 28],
  ...[31, 32, 33, 34, 35, 36, 37, 38],
  ...[41, 42, 43, 44, 45, 46, 47, 48]
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({
    ingresos_ars: 0,
    ingresos_usd: 0,
    turnos_realizados: 0,
    turnos_pendientes: 0
  });
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [catalogo, setCatalogo] = useState<TratamientoCatalogo[]>([]);
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDoc, setFilterDoc] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Close Turno modal state
  const [isCloseTurnoOpen, setIsCloseTurnoOpen] = useState(false);
  const [selectedTurnoToClose, setSelectedTurnoToClose] = useState<Turno | null>(null);
  const [closeForm, setCloseForm] = useState({
    comentarios_medicos: '',
    tratamientosSeleccionados: [] as { tratamiento: TratamientoCatalogo; cantidad: number; customPriceArs?: number; customPriceUsd?: number }[],
    pagosForm: [] as { monto: number; metodo_pago: string; moneda: 'ARS' | 'USD' }[]
  });

  // Cancel Turno modal state
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedTurnoToCancelId, setSelectedTurnoToCancelId] = useState<number | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  const [isClinicalDetailExpanded, setIsClinicalDetailExpanded] = useState(false);
  const [piezaDental, setPiezaDental] = useState<number | ''>('');
  const [ubicacionLesion, setUbicacionLesion] = useState<Record<string, boolean>>({
    O: false,
    D: false,
    G: false,
    L: false,
    M: false,
    I: false,
    V: false,
    P: false
  });
  const [conformidadPaciente, setConformidadPaciente] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      const [kpiData, turnosData, docsData, catData, osData] = await Promise.all([
        apiFetch('/api/finanzas/caja/hoy').catch(err => {
          console.error("Error fetching caja/hoy:", err);
          return { ingresos_ars: 0, ingresos_usd: 0, turnos_realizados: 0, turnos_pendientes: 0 };
        }),
        apiFetch('/api/turnos/hoy').catch(err => {
          console.error("Error fetching turnos/hoy:", err);
          return [];
        }),
        apiFetch('/api/doctores').catch(err => {
          console.error("Error fetching doctores:", err);
          return [];
        }),
        apiFetch('/api/catalogo/tratamientos').catch(err => {
          console.error("Error fetching tratamientos:", err);
          return [];
        }),
        apiFetch('/api/catalogo/obras-sociales').catch(err => {
          console.error("Error fetching obras-sociales:", err);
          return [];
        })
      ]);
      setKpis(kpiData);
      setTurnos(turnosData);
      setDoctores(docsData.filter((d: any) => d.activo));
      setCatalogo(catData);
      setObrasSociales(osData);
    } catch (e: any) {
      showToast('Error cargando los datos del dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cancel Turno
  const handleCancelTurnoClick = (id: number) => {
    setSelectedTurnoToCancelId(id);
    setMotivoCancelacion('');
    setIsCancelling(true);
  };

  const handleCancelTurnoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurnoToCancelId) return;
    if (!motivoCancelacion.trim()) {
      showToast('Debe ingresar un motivo de cancelación obligatorio.', 'warning');
      return;
    }

    try {
      await apiFetch(`/api/turnos/${selectedTurnoToCancelId}/cancelar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo_cancelacion: motivoCancelacion })
      });
      showToast('Turno cancelado correctamente.', 'success');
      setIsCancelling(false);
      setSelectedTurnoToCancelId(null);
      setMotivoCancelacion('');
      loadData();
    } catch (err: any) {
      showToast('Error al cancelar el turno: ' + err.message, 'error');
    }
  };

  // Close Consultation (Cierre con Facturacion)
  const openCloseModal = (turno: Turno) => {
    setSelectedTurnoToClose(turno);
    setCloseForm({
      comentarios_medicos: '',
      tratamientosSeleccionados: [],
      pagosForm: []
    });
    setIsClinicalDetailExpanded(false);
    setPiezaDental('');
    setUbicacionLesion({
      O: false,
      D: false,
      G: false,
      L: false,
      M: false,
      I: false,
      V: false,
      P: false
    });
    setConformidadPaciente(false);
    setIsCloseTurnoOpen(true);
  };

  const addTratamientoToClose = (trId: string) => {
    const tr = catalogo.find(x => x.id === parseInt(trId));
    if (!tr) return;
    
    setCloseForm(prev => {
      // Check if already selected
      const exists = prev.tratamientosSeleccionados.some(x => x.tratamiento.id === tr.id);
      if (exists) return prev;
      
      return {
        ...prev,
        tratamientosSeleccionados: [
          ...prev.tratamientosSeleccionados,
          { tratamiento: tr, cantidad: 1, customPriceArs: tr.precio_ars, customPriceUsd: tr.precio_usd }
        ]
      };
    });
  };

  const removeTratamientoFromClose = (id: number) => {
    setCloseForm(prev => ({
      ...prev,
      tratamientosSeleccionados: prev.tratamientosSeleccionados.filter(x => x.tratamiento.id !== id)
    }));
  };

  const updateTratamientoQty = (id: number, qty: number) => {
    setCloseForm(prev => ({
      ...prev,
      tratamientosSeleccionados: prev.tratamientosSeleccionados.map(x => 
        x.tratamiento.id === id ? { ...x, cantidad: Math.max(1, qty) } : x
      )
    }));
  };

  const addPagoToClose = (moneda: 'ARS' | 'USD') => {
    setCloseForm(prev => ({
      ...prev,
      pagosForm: [...prev.pagosForm, { monto: 0, metodo_pago: 'Efectivo', moneda }]
    }));
  };

  const removePagoFromClose = (idx: number) => {
    setCloseForm(prev => ({
      ...prev,
      pagosForm: prev.pagosForm.filter((_, i) => i !== idx)
    }));
  };

  const updatePagoField = (idx: number, field: string, val: any) => {
    setCloseForm(prev => ({
      ...prev,
      pagosForm: prev.pagosForm.map((p, i) => 
        i === idx ? { ...p, [field]: val } : p
      )
    }));
  };

  const handleCloseTurnoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurnoToClose) return;
    
    // Validate custom prices or structures
    const payload = {
      comentarios: closeForm.comentarios_medicos,
      tratamientos: closeForm.tratamientosSeleccionados.map(x => ({
        id_tratamiento: x.tratamiento.id,
        nombre: x.tratamiento.nombre,
        cantidad: x.cantidad,
        precio_ars: x.customPriceArs || 0,
        precio_usd: x.customPriceUsd || 0
      })),
      pagos: closeForm.pagosForm.map(p => ({
        monto: Number(p.monto),
        metodo_pago: p.metodo_pago,
        moneda: p.moneda
      })),
      pieza_dental: isClinicalDetailExpanded && piezaDental !== '' ? Number(piezaDental) : null,
      ubicacion_lesion: isClinicalDetailExpanded 
        ? (Object.entries(ubicacionLesion).filter(([_, checked]) => checked).map(([key]) => key).join(',') || null)
        : null,
      conformidad_paciente: isClinicalDetailExpanded ? conformidadPaciente : null
    };

    try {
      await apiFetch(`/api/turnos/${selectedTurnoToClose.id}/cerrar`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Turno cerrado y facturado correctamente.', 'success');
      setIsCloseTurnoOpen(false);
      setSelectedTurnoToClose(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filter turnos
  const filteredTurnos = turnos.filter(t => {
    const matchesDoc = filterDoc === null || t.id_doctor === filterDoc;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pendiente' && t.estado === 'Pendiente') ||
      (filterStatus === 'realizado' && t.estado === 'Realizado') ||
      (filterStatus === 'cancelado' && t.estado === 'Cancelado');
    return matchesDoc && matchesStatus;
  });

  const totalTratamientosArs = closeForm.tratamientosSeleccionados.reduce(
    (sum, item) => sum + ((item.customPriceArs || 0) * item.cantidad), 
    0
  );
  const totalTratamientosUsd = closeForm.tratamientosSeleccionados.reduce(
    (sum, item) => sum + ((item.customPriceUsd || 0) * item.cantidad), 
    0
  );

  const totalPagadoArs = closeForm.pagosForm
    .filter(p => p.moneda === 'ARS')
    .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const totalPagadoUsd = closeForm.pagosForm
    .filter(p => p.moneda === 'USD')
    .reduce((sum, p) => sum + (Number(p.monto) || 0), 0);

  const autoFillPago = (moneda: 'ARS' | 'USD') => {
    const totalTratamientos = moneda === 'ARS' ? totalTratamientosArs : totalTratamientosUsd;
    const totalPagado = moneda === 'ARS' ? totalPagadoArs : totalPagadoUsd;
    const balance = totalTratamientos - totalPagado;
    
    if (balance <= 0) {
      showToast(`El saldo en ${moneda} ya está cubierto o es cero.`, 'info');
      return;
    }
    
    setCloseForm(prev => ({
      ...prev,
      pagosForm: [...prev.pagosForm, { monto: balance, metodo_pago: 'Efectivo', moneda }]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl text-clamp-title-lg font-bold text-neutral-warm-900 tracking-tight">
            Control Diario
          </h2>
          <p className="text-xs text-neutral-warm-600 mt-1">
            Resumen de cobros y turnos de la jornada actual
          </p>
        </div>
        
        {/* Quick actions buttons */}
        <button
          onClick={() => navigate('/agenda')}
          className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Asignar Turno</span>
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard 
          icon={<DollarSign size={16} />} 
          value={`$ ${kpis.ingresos_ars.toLocaleString('es-AR')}`} 
          label="Caja Diaria ARS" 
          theme="success" 
        />
        <KPICard 
          icon={<DollarSign size={16} />} 
          value={`U$S ${kpis.ingresos_usd.toLocaleString('es-AR')}`} 
          label="Caja Diaria USD" 
          theme="success" 
        />
        <KPICard 
          icon={<CheckCircle size={16} />} 
          value={kpis.turnos_realizados} 
          label="Consultas Atendidas" 
          theme="info" 
        />
        <KPICard 
          icon={<Clock size={16} />} 
          value={kpis.turnos_pendientes} 
          label="Citas Pendientes" 
          theme="warning" 
        />
      </div>

      {/* Today's Appointments Section */}
      <div className="bg-white border border-neutral-warm-100/60 rounded-[24px] shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-neutral-warm-900 tracking-tight">
            Turnos del día de hoy
          </h3>
          
          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Doctor */}
            <CustomSelect
              className="w-48"
              value={filterDoc === null ? 'all' : filterDoc}
              onChange={val => setFilterDoc(val === 'all' ? null : Number(val))}
              options={[
                { value: 'all', label: 'Todos los profesionales' },
                ...doctores.map(doc => ({ value: doc.id, label: doc.nombre, color: doc.color_agenda }))
              ]}
              placeholder="Todos los profesionales"
            />

            {/* Filter by Status */}
            <CustomSelect
              className="w-36"
              value={filterStatus}
              onChange={val => setFilterStatus(String(val))}
              options={[
                { value: 'all', label: 'Todos los Estados' },
                { value: 'pendiente', label: 'Pendientes' },
                { value: 'realizado', label: 'Realizados' },
                { value: 'cancelado', label: 'Cancelados' }
              ]}
            />
          </div>
        </div>

        {/* Turnos table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-warm-600 gap-2 text-xs">
              <svg className="animate-spin h-5 w-5 text-[#1D9E75]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Cargando turnos de hoy...</span>
            </div>
          ) : filteredTurnos.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-warm-600">
              No hay turnos registrados que coincidan con los filtros para el día de hoy.
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-warm-50 text-neutral-warm-600 text-[11px] font-normal uppercase tracking-wider bg-[#FAF9F5]">
                  <th className="py-3 px-4 sticky left-0 bg-[#FAF9F5] z-20 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Hora</th>
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Profesional</th>
                  <th className="py-3 px-4">Motivo / Tratamiento</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-warm-50">
                {filteredTurnos.map(t => {
                  const date = new Date(t.fecha_hora);
                  const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                  
                  const statusStyles = {
                    Pendiente: 'bg-[#FAEEDA] text-[#854F0B] border-[#FAEEDA]',
                    Realizado: 'bg-[#EAF3DE] text-[#3B6D11] border-[#EAF3DE]',
                    Cancelado: 'bg-[#FCEBEB] text-[#A32D2D] border-[#FCEBEB]'
                  }[t.estado];

                  return (
                    <tr key={t.id} className="hover:bg-neutral-warm-50/40 transition-colors group">
                      <td className="py-3.5 px-4 font-mono font-medium text-neutral-warm-900 sticky left-0 bg-white z-10 border-r border-neutral-warm-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] group-hover:bg-[#FAF9F5] transition-colors">
                        {time} hs
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-warm-900">
                        {t.paciente}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {/* Round 8px dot beside doctor name as per visual spec Section 3 */}
                          <span 
                            className="w-2 h-2 rounded-full shadow-xs shrink-0"
                            style={{ backgroundColor: t.doctor_color || '#1D9E75' }}
                          />
                          <span className="text-neutral-warm-900">{t.doctor_nombre}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-warm-600 truncate max-w-[180px]" title={t.motivo}>
                        {t.motivo || 'Consulta Gral.'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-medium border ${statusStyles}`}>
                          {t.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.estado === 'Pendiente' && (
                            <>
                              <button
                                onClick={() => openCloseModal(t)}
                                className="text-[#3B6D11] bg-[#EAF3DE] hover:bg-[#3B6D11]/10 px-2 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="Cerrar y Facturar consulta"
                              >
                                <CheckSquare size={12} />
                                <span>Cerrar</span>
                              </button>
                              <button
                                onClick={() => handleCancelTurnoClick(t.id)}
                                className="text-[#A32D2D] bg-[#FCEBEB] hover:bg-[#A32D2D]/10 px-2 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="Cancelar Turno"
                              >
                                <X size={12} />
                                <span>Cancelar</span>
                              </button>
                            </>
                          )}
                          {t.estado === 'Realizado' && (
                            <span className="text-[10px] text-neutral-warm-600 font-normal italic mr-2">Atendido</span>
                          )}
                          {t.estado === 'Cancelado' && (
                            <span className="text-[10px] text-red-700/60 font-normal italic mr-2">Anulado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL 2: CLOSE AND BILL APPOINTMENT (CERRAR TURNO) --- */}
      <Modal isOpen={isCloseTurnoOpen} onClose={() => setIsCloseTurnoOpen(false)} title="Finalizar Consulta y Registrar Facturación" size="xl">
        {selectedTurnoToClose && (
          <form onSubmit={handleCloseTurnoSubmit} className="space-y-5">
            <div className="text-xs border-b border-neutral-warm-50 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-neutral-warm-900">Paciente:</span> {selectedTurnoToClose.paciente}
              </div>
              <div>
                <span className="font-semibold text-neutral-warm-900">Odontólogo:</span> {selectedTurnoToClose.doctor_nombre}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Columna Izquierda: Evolución, Detalle Clínico y Tratamientos */}
              <div className="md:col-span-7 space-y-4">
                {/* Evolución Clínica */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                    Evolución Clínica / Comentarios Médicos
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={closeForm.comentarios_medicos}
                    onChange={e => setCloseForm(prev => ({ ...prev, comentarios_medicos: e.target.value }))}
                    placeholder="Escriba aquí los detalles del tratamiento realizado en esta sesión..."
                    className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>

                {/* Bloque colapsable "Agregar detalle clínico (opcional)" */}
                <div className="border border-neutral-warm-200 rounded-lg overflow-hidden bg-neutral-warm-50/30">
                  <button
                    type="button"
                    onClick={() => setIsClinicalDetailExpanded(!isClinicalDetailExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-warm-700 bg-neutral-warm-50 hover:bg-neutral-warm-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{isClinicalDetailExpanded ? "−" : "+"} Agregar detalle clínico (opcional)</span>
                    </span>
                    {isClinicalDetailExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {isClinicalDetailExpanded && (
                    <div className="p-3.5 space-y-4 border-t border-neutral-warm-150 bg-white animate-fade-in">
                      {/* Pieza dental select */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-medium text-neutral-warm-600 block">
                          Pieza dental
                        </label>
                        <CustomSelect
                          value={piezaDental}
                          onChange={val => setPiezaDental(val ? Number(val) : '')}
                          options={[
                            { value: '', label: 'No aplica (dejar vacío)' },
                            ...fdiTeeth.map(num => ({ value: String(num), label: `Pieza ${num}` }))
                          ]}
                        />
                      </div>

                      {/* Ubicación de la lesión checkboxes */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-medium text-neutral-warm-600 block">
                          Ubicación de la lesión (marque una o varias)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { value: 'O', label: 'O (Oclusal)' },
                            { value: 'D', label: 'D (Distal)' },
                            { value: 'G', label: 'G (Gingival)' },
                            { value: 'L', label: 'L (Lingual)' },
                            { value: 'M', label: 'M (Mesial)' },
                            { value: 'I', label: 'I (Incisal)' },
                            { value: 'V', label: 'V (Vestibular)' },
                            { value: 'P', label: 'P (Palatino)' },
                          ].map(item => (
                            <label
                              key={item.value}
                              className="flex items-center space-x-2 text-xs p-1.5 border border-neutral-warm-100 rounded-md bg-neutral-warm-50/20 hover:bg-neutral-warm-50 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={ubicacionLesion[item.value] || false}
                                onChange={e => setUbicacionLesion(prev => ({ ...prev, [item.value]: e.target.checked }))}
                                className="w-4 h-4 text-[#085041] rounded border-neutral-warm-300 focus:ring-brand-500 cursor-pointer"
                              />
                              <span className="font-semibold text-neutral-warm-800">{item.value}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Conformidad del paciente */}
                      <div className="pt-1.5 border-t border-neutral-warm-100/50 text-left">
                        <label className="flex items-center space-x-2.5 text-xs font-semibold text-neutral-warm-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={conformidadPaciente}
                            onChange={e => setConformidadPaciente(e.target.checked)}
                            className="w-4 h-4 text-[#085041] rounded border-neutral-warm-300 focus:ring-brand-500 cursor-pointer"
                          />
                          <span>El paciente dio conformidad del tratamiento realizado</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tratamientos Aplicados (from Catalog) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                      Tratamientos Realizados en Sesión
                    </label>
                    
                    {/* Selector from Catalog */}
                    <CustomSelect
                      className="w-full sm:w-56"
                      value=""
                      onChange={val => {
                        if (val) {
                          addTratamientoToClose(String(val));
                        }
                      }}
                      options={[
                        { value: '', label: '+ Agregar Tratamiento' },
                        ...catalogo.filter(c => c.activo).map(c => ({
                          value: String(c.id),
                          label: `${c.nombre} (ARS ${c.precio_ars} / USD ${c.precio_usd})`
                        }))
                      ]}
                      placeholder="+ Agregar Tratamiento"
                    />
                  </div>

                  {closeForm.tratamientosSeleccionados.length === 0 ? (
                    <div className="text-[11px] text-neutral-warm-600 bg-[#F1EFE8] py-4 rounded-lg text-center border border-dashed border-neutral-warm-100">
                      No se han cargado tratamientos de catálogo para esta sesión. Se facturará en balance nulo si no se selecciona ninguno.
                    </div>
                  ) : (
                    <div className="border border-neutral-warm-100 rounded-lg overflow-hidden divide-y divide-neutral-warm-50 bg-white max-h-[220px] overflow-y-auto">
                      {closeForm.tratamientosSeleccionados.map((item, idx) => (
                        <div key={item.tratamiento.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-neutral-warm-50/20">
                          <div className="flex-1 min-w-0 pr-3">
                            <span className="font-medium text-neutral-warm-900 block truncate">{item.tratamiento.nombre}</span>
                            <span className="text-[9px] text-neutral-warm-500 block mt-0.5">Cat: {item.tratamiento.categoria}</span>
                          </div>
                          
                          {/* Qty and price editor */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-neutral-warm-500">Cant:</span>
                              <input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={e => updateTratamientoQty(item.tratamiento.id, parseInt(e.target.value))}
                                className="w-10 text-center text-xs border border-neutral-warm-100 rounded py-0.5 px-0.5 bg-white text-neutral-warm-900"
                              />
                            </div>
                            
                            <div className="flex flex-col text-right gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-neutral-warm-500">ARS:</span>
                                <input
                                  type="number"
                                  value={item.customPriceArs || 0}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCloseForm(p => ({
                                      ...p,
                                      tratamientosSeleccionados: p.tratamientosSeleccionados.map(ts => 
                                        ts.tratamiento.id === item.tratamiento.id ? { ...ts, customPriceArs: val } : ts
                                      )
                                    }));
                                  }}
                                  className="w-16 text-right text-[11px] border border-neutral-warm-100 rounded py-0.5 px-1 bg-white text-neutral-warm-900"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] text-neutral-warm-500">USD:</span>
                                <input
                                  type="number"
                                  value={item.customPriceUsd || 0}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCloseForm(p => ({
                                      ...p,
                                      tratamientosSeleccionados: p.tratamientosSeleccionados.map(ts => 
                                        ts.tratamiento.id === item.tratamiento.id ? { ...ts, customPriceUsd: val } : ts
                                      )
                                    }));
                                  }}
                                  className="w-16 text-right text-[11px] border border-neutral-warm-100 rounded py-0.5 px-1 bg-white text-neutral-warm-900"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeTratamientoFromClose(item.tratamiento.id)}
                              className="text-[#A32D2D] hover:bg-red-50 p-1 rounded-full"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Pagos e Información Financiera */}
              <div className="md:col-span-5 space-y-4">
                {/* Resumen Financiero */}
                <div className="bg-[#FAF9F5] border border-neutral-warm-100 p-3.5 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-neutral-warm-800 text-[11px] uppercase tracking-wider">
                    Resumen del Turno
                  </h4>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-warm-500 font-medium">A Cobrar (Tratamientos)</span>
                      <div className="font-semibold text-neutral-warm-900">
                        <div>$ {totalTratamientosArs.toLocaleString('es-AR')} ARS</div>
                        <div className="text-[11px] text-neutral-warm-600">U$S {totalTratamientosUsd.toLocaleString('es-AR')} USD</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-warm-500 font-medium">Registrado en Caja</span>
                      <div className="font-semibold text-[#3B6D11]">
                        <div>$ {totalPagadoArs.toLocaleString('es-AR')} ARS</div>
                        <div className="text-[11px] text-[#3B6D11]/85">U$S {totalPagadoUsd.toLocaleString('es-AR')} USD</div>
                      </div>
                    </div>
                  </div>

                  {/* Diferencia en Cuenta Corriente */}
                  {(totalTratamientosArs - totalPagadoArs !== 0 || totalTratamientosUsd - totalPagadoUsd !== 0) && (
                    <div className="pt-2 border-t border-neutral-warm-100 mt-2 text-[10px]">
                      <span className="text-neutral-warm-500 font-medium block">Diferencia a Cta. Cte. del Paciente:</span>
                      <div className="flex flex-col mt-0.5 font-medium">
                        {totalTratamientosArs - totalPagadoArs !== 0 && (
                          <span className={totalTratamientosArs - totalPagadoArs > 0 ? "text-[#A32D2D]" : "text-[#3B6D11]"}>
                            ARS: {totalTratamientosArs - totalPagadoArs > 0 ? `Deuda de $ ${(totalTratamientosArs - totalPagadoArs).toLocaleString('es-AR')}` : `Saldo a favor de $ ${Math.abs(totalTratamientosArs - totalPagadoArs).toLocaleString('es-AR')}`}
                          </span>
                        )}
                        {totalTratamientosUsd - totalPagadoUsd !== 0 && (
                          <span className={totalTratamientosUsd - totalPagadoUsd > 0 ? "text-[#A32D2D]" : "text-[#3B6D11]"}>
                            USD: {totalTratamientosUsd - totalPagadoUsd > 0 ? `Deuda de U$S ${(totalTratamientosUsd - totalPagadoUsd).toLocaleString('es-AR')}` : `Saldo a favor de U$S ${Math.abs(totalTratamientosUsd - totalPagadoUsd).toLocaleString('es-AR')}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Acciones de Cobro Rápido */}
                  {(totalTratamientosArs - totalPagadoArs > 0 || totalTratamientosUsd - totalPagadoUsd > 0) && (
                    <div className="pt-2.5 space-y-1.5">
                      <span className="text-[9px] text-neutral-warm-500 font-bold uppercase block">Acciones de Cobro Rápido:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {totalTratamientosArs - totalPagadoArs > 0 && (
                          <button
                            type="button"
                            onClick={() => autoFillPago('ARS')}
                            className="bg-[#EAF3DE] hover:bg-[#D9EABF] text-[#3B6D11] text-[10px] font-bold py-1 px-2 rounded-md transition-colors text-center cursor-pointer"
                          >
                            Cobrar $ {(totalTratamientosArs - totalPagadoArs).toLocaleString('es-AR')} ARS
                          </button>
                        )}
                        {totalTratamientosUsd - totalPagadoUsd > 0 && (
                          <button
                            type="button"
                            onClick={() => autoFillPago('USD')}
                            className="bg-[#EAF3DE] hover:bg-[#D9EABF] text-[#3B6D11] text-[10px] font-bold py-1 px-2 rounded-md transition-colors text-center cursor-pointer"
                          >
                            Cobrar U$S {(totalTratamientosUsd - totalPagadoUsd).toLocaleString('es-AR')} USD
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Registrar Pagos Inmediatos Recibidos */}
                <div className="space-y-3 bg-neutral-warm-50/40 border border-neutral-warm-100 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-1.5 mb-1">
                    <label className="text-xs font-bold text-neutral-warm-700 sentence-case block">
                      Cobros en esta Sesión
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addPagoToClose('ARS')}
                        className="text-[11px] font-bold text-[#3B6D11] hover:underline cursor-pointer"
                      >
                        + ARS
                      </button>
                      <button
                        type="button"
                        onClick={() => addPagoToClose('USD')}
                        className="text-[11px] font-bold text-[#3B6D11] hover:underline cursor-pointer"
                      >
                        + USD
                      </button>
                    </div>
                  </div>

                  {closeForm.pagosForm.length === 0 ? (
                    <div className="text-[10px] text-neutral-warm-500 bg-white py-6 rounded-lg text-center border border-dashed border-neutral-warm-100 px-3 leading-normal">
                      Ningún cobro registrado.<br />
                      El costo total generará deuda en la cuenta corriente del paciente.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
                      {closeForm.pagosForm.map((p, idx) => (
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
                                onChange={e => updatePagoField(idx, 'monto', parseFloat(e.target.value))}
                                placeholder="0.00"
                                className="w-20 text-xs border border-neutral-warm-100 rounded py-0.5 px-1.5 bg-white text-neutral-warm-900 text-right font-medium"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-1.5">
                            <CustomSelect
                              className="w-full text-[11px]"
                              value={p.metodo_pago}
                              onChange={val => updatePagoField(idx, 'metodo_pago', String(val))}
                              options={[
                                { value: 'Efectivo', label: 'Efectivo' },
                                { value: 'Transferencia', label: 'Transferencia Bancaria' },
                                { value: 'Tarjeta de Débito', label: 'Tarjeta Débito' },
                                { value: 'Tarjeta de Crédito', label: 'Tarjeta Crédito' }
                              ]}
                            />

                            <button
                              type="button"
                              onClick={() => removePagoFromClose(idx)}
                              className="text-[#A32D2D] hover:bg-red-50 px-2 py-1 rounded text-[10px] font-bold"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-[#EAF3DE]/30 border border-[#D5E6C4]/60 rounded-xl text-[11px] text-neutral-warm-600 leading-normal">
                  <span className="font-bold text-[#3B6D11] block mb-0.5">Nota de Cuenta Corriente</span>
                  La diferencia entre el costo de los tratamientos aplicados y los cobros registrados generará cargos/abonos automáticos en la CC del paciente de forma instantánea.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-warm-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCloseTurnoOpen(false)}
                className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Cerrar y Registrar Caja
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* --- MODAL 4: CONFIRM CANCELATION --- */}
      <Modal isOpen={isCancelling} onClose={() => setIsCancelling(false)} title="Confirmar Cancelación">
        <form onSubmit={handleCancelTurnoSubmit} className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-2">
            <h4 className="text-xs font-extrabold text-red-800 sentence-case">Atención</h4>
            <p className="text-xs text-red-700 font-medium leading-relaxed">
              Está a punto de cancelar el turno. Esta acción liberará el slot de la agenda inmediatamente y no se puede deshacer.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-warm-700 sentence-case block">
              Motivo de Cancelación <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={motivoCancelacion}
              onChange={e => setMotivoCancelacion(e.target.value)}
              placeholder="Ej: Paciente avisó que no puede venir"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-warm-50">
            <button
              type="button"
              onClick={() => setIsCancelling(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-bold transition-colors cursor-pointer"
            >
              Atrás
            </button>
            <button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-3xs"
            >
              Confirmar Cancelación
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
