import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCajaHoy, getTurnosHoy, getDoctores, getPaciente, crearPaciente, crearTurno, cerrarTurno, cancelarTurno, getTurnos, getTratamientosCatalogo } from '../services/api';
import { globalCache } from '../services/cache';
import type { ResumenCaja, Turno, Doctor, Paciente, CerrarTurnoInput, TratamientoFormItem, PagoFormItem, TratamientoCatalogo } from '../types';
import KPICard from '../components/KPICard';
import Modal from '../components/Modal';
import { motion } from 'motion/react';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../context/ToastContext';

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getHorariosDisponibles(fecha: Date): string[] {
  const d = new Date(fecha);
  const dia = d.getDay();
  if (dia === 4 || dia === 0) return []; // Jueves y Domingos no se trabaja

  const slots: string[] = [];
  // Mañana (9:00 a 12:30)
  for (let h = 9; h <= 12; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }

  // Tarde (16:00 a 19:30) - Solo Lunes, Martes, Miércoles, Viernes
  if (dia !== 6) { // Sábados no hay tarde
    for (let h = 16; h <= 19; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
  }

  return slots;
}

const estadoBadge: Record<string, string> = {
  Realizado: 'bg-emerald-50 text-emerald-700',
  Pendiente: 'bg-amber-50 text-amber-700',
  Cancelado: 'bg-red-50 text-red-700',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [caja, setCaja] = useState<ResumenCaja | null>(globalCache.dashboard.caja);
  const [turnos, setTurnos] = useState<Turno[]>(globalCache.dashboard.turnos);
  const [doctores, setDoctores] = useState<Doctor[]>(globalCache.dashboard.doctores);
  const [loading, setLoading] = useState(!globalCache.dashboard.caja && globalCache.dashboard.turnos.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Modal crear turno
  const [modalCrear, setModalCrear] = useState(false);
  const [dniPaciente, setDniPaciente] = useState('');
  const [pacienteInfo, setPacienteInfo] = useState<Paciente | null>(null);
  const [pacienteBuscando, setPacienteBuscando] = useState(false);
  const [pacienteError, setPacienteError] = useState('');
  const [nuevoTurno, setNuevoTurno] = useState({ fecha_hora: '', motivo: '', id_doctor: 0 });
  const [creando, setCreando] = useState(false);

  // Selector personalizado de fecha y horarios
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [modalMesNavegacion, setModalMesNavegacion] = useState(() => new Date());

  useEffect(() => {
    if (!selectedDate || !nuevoTurno.id_doctor) {
      setOccupiedSlots([]);
      return;
    }
    let cancelled = false;
    async function loadOccupied() {
      setLoadingSlots(true);
      try {
        const res = await getTurnos({ fecha: selectedDate, id_doctor: nuevoTurno.id_doctor });
        if (!cancelled) {
          const occupied = res
            .filter(t => t.estado !== 'Cancelado')
            .map(t => {
              const dt = new Date(t.fecha_hora);
              return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            });
          setOccupiedSlots(occupied);
        }
      } catch {
        // Ignorar
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    loadOccupied();
    return () => { cancelled = true; };
  }, [selectedDate, nuevoTurno.id_doctor]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      setNuevoTurno(prev => ({ ...prev, fecha_hora: `${selectedDate}T${selectedTime}` }));
    } else {
      setNuevoTurno(prev => ({ ...prev, fecha_hora: '' }));
    }
  }, [selectedDate, selectedTime]);

  // Modal crear paciente rápido
  const [modalNuevoPac, setModalNuevoPac] = useState(false);
  const [nuevoPac, setNuevoPac] = useState({ dni: '', nombre: '', apellido: '', telefono: '' });
  const [creandoPac, setCreandoPac] = useState(false);

  // Modal cerrar turno desde dashboard
  const [turnoCerrar, setTurnoCerrar] = useState<Turno | null>(null);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [tratamientos, setTratamientos] = useState<TratamientoFormItem[]>([{ nombre: '', precio: 0, moneda: 'ARS' }]);
  const [catalogo, setCatalogo] = useState<TratamientoCatalogo[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [pagos, setPagos] = useState<PagoFormItem[]>([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
  const [cerrando, setCerrando] = useState(false);
  const [comentarioClinico, setComentarioClinico] = useState('');

  const closeCerrarModal = () => {
    setModalCerrar(false);
    setTratamientos([{ nombre: '', precio: 0, moneda: 'ARS' }]);
    setPagos([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
    setTurnoCerrar(null);
    setComentarioClinico('');
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cajaData, turnosData, docs] = await Promise.all([getCajaHoy(), getTurnosHoy(), getDoctores()]);
        if (!cancelled) {
          setCaja(cajaData);
          setTurnos(turnosData);
          setDoctores(docs);
          globalCache.dashboard.caja = cajaData;
          globalCache.dashboard.turnos = turnosData;
          globalCache.dashboard.doctores = docs;
        }
      } catch {
        if (!cancelled) setError('No pudimos cargar el panel. Verificá la conexión con el servidor.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function getDoctorName(id: number) {
    return doctores.find(d => d.id === id)?.nombre || `Doctor #${id}`;
  }

  // ── Buscar paciente por DNI ──
  async function handleBuscarPaciente() {
    if (dniPaciente.trim().length < 3) {
      setPacienteError('Ingresá un DNI válido');
      return;
    }
    setPacienteBuscando(true);
    setPacienteError('');
    setPacienteInfo(null);
    try {
      const p = await getPaciente(dniPaciente.trim());
      setPacienteInfo(p);
    } catch {
      setPacienteError('Paciente no encontrado');
    } finally {
      setPacienteBuscando(false);
    }
  }

  // ── Crear paciente rápido ──
  async function handleCrearPaciente() {
    if (!nuevoPac.dni || !nuevoPac.nombre || !nuevoPac.apellido) return;
    setCreandoPac(true);
    try {
      await crearPaciente(nuevoPac);
      setPacienteInfo({ dni: nuevoPac.dni, nombre: nuevoPac.nombre, apellido: nuevoPac.apellido });
      toast.success(`¡Paciente ${nuevoPac.nombre} ${nuevoPac.apellido} creado!`);
      setModalNuevoPac(false);
      setPacienteError('');
      setNuevoPac({ dni: '', nombre: '', apellido: '', telefono: '' });
    } catch {
      setError('Error al crear el paciente');
    } finally {
      setCreandoPac(false);
    }
  }

  function validarHorario(fecha_hora: string): string | null {
    const dt = new Date(fecha_hora);
    const dia = dt.getDay();
    const hora = dt.getHours() + dt.getMinutes() / 60;

    if (dia === 4) return 'Los jueves no se trabaja. Elegí otro día.';
    if (dia === 0) return 'Los domingos no se trabaja. Elegí otro día.';

    if (dia === 6) { // Sábado
      // 9:00 a 13:00 (último turno a las 12:30)
      if (hora < 9 || hora > 12.5) {
        return 'Los sábados se atiende únicamente de mañana, de 9:00 a 13:00 (último turno a las 12:30).';
      }
    } else { // Lunes, Martes, Miércoles, Viernes
      const isMorning = hora >= 9 && hora <= 12.5;
      const isAfternoon = hora >= 16 && hora <= 19.5;
      if (!isMorning && !isAfternoon) {
        return 'El horario de atención es de 9:00 a 13:00 (último a las 12:30) y de 16:00 a 20:00 (último a las 19:30).';
      }
    }

    // Validar turnos de media hora
    const mins = dt.getMinutes();
    if (mins !== 0 && mins !== 30) {
      return 'Los turnos deben agendarse en intervalos de media hora (ej: 09:00 o 09:30).';
    }

    return null;
  }

  // ── Crear turno ──
  async function handleCrearTurno() {
    if (!pacienteInfo || !nuevoTurno.fecha_hora || !nuevoTurno.id_doctor) return;
    const errorHorario = validarHorario(nuevoTurno.fecha_hora);
    if (errorHorario) {
      setError(errorHorario);
      return;
    }
    setCreando(true);
    try {
      await crearTurno({
        fecha_hora: nuevoTurno.fecha_hora,
        motivo: nuevoTurno.motivo || undefined,
        dni_paciente: pacienteInfo.dni,
        id_doctor: nuevoTurno.id_doctor,
      });
      toast.success('¡Turno agendado con éxito!');
      setModalCrear(false);
      resetFormulario();
      refresh();
    } catch {
      setError('Error al crear el turno');
    } finally {
      setCreando(false);
    }
  }

  function resetFormulario() {
    setDniPaciente('');
    setPacienteInfo(null);
    setPacienteError('');
    setNuevoTurno({ fecha_hora: '', motivo: '', id_doctor: 0 });
    setSelectedDate('');
    setSelectedTime('');
    setOccupiedSlots([]);
  }

  // ── Cerrar turno ──
  async function handleCerrarTurno() {
    if (!turnoCerrar) return;
    setCerrando(true);
    try {
      const tratamientosValidos = tratamientos.filter(t => t.nombre.trim() && t.precio > 0);
      const pagosValidos = pagos.filter(p => p.monto > 0);
      const body: CerrarTurnoInput = {
        tratamientos: tratamientosValidos.map(t => ({
          nombre: t.nombre,
          cantidad: 1,
          [`precio_${t.moneda.toLowerCase()}`]: t.precio,
        })),
        pagos: pagosValidos.map(p => ({
          monto: p.monto,
          moneda: p.moneda,
          metodo_pago: p.metodo,
        })),
        comentarios: comentarioClinico.trim() || undefined,
      };
      await cerrarTurno(turnoCerrar.id, body);
      toast.success('¡El turno ha sido marcado como realizado y cerrado!');
      setModalCerrar(false);
      setTurnoCerrar(null);
      setTratamientos([{ nombre: '', precio: 0, moneda: 'ARS' }]);
      setPagos([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
      setComentarioClinico('');
      refresh();
    } catch {
      setError('Error al cerrar el turno');
    } finally {
      setCerrando(false);
    }
  }

  async function handleCancelarTurno(turnoId: number) {
    try {
      await cancelarTurno(turnoId);
      toast.error('El turno ha sido cancelado con éxito.');
      refresh();
    } catch {
      setError('Error al cancelar el turno');
    }
  }

  async function refresh() {
    try {
      const [cajaData, turnosData] = await Promise.all([getCajaHoy(), getTurnosHoy()]);
      setCaja(cajaData);
      setTurnos(turnosData);
      globalCache.dashboard.caja = cajaData;
      globalCache.dashboard.turnos = turnosData;
    } catch { /* ignore */ }
  }

  const DOCTOR_ROW_COLOR: Record<number, string> = {
    1: 'bg-blue-100/60 hover:bg-blue-100/80',
    2: 'bg-pink-100/60 hover:bg-pink-100/80',
  };

  // ── Filtros ──
  const [filtroDoctor, setFiltroDoctor] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const doctorOptions = doctores.map(d => ({
    value: d.id,
    label: d.nombre,
    color: d.id === 1 ? '#009BFF' : '#FF0088',
    subtitle: d.id === 1 ? 'Odontología General' : 'Ortodoncia & Cirugía'
  }));

  const turnosFiltrados = turnos.filter(t => {
    if (filtroDoctor && t.id_doctor !== filtroDoctor) return false;
    if (filtroEstado && t.estado !== filtroEstado) return false;
    return true;
  });

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Lógica de celdas del mes para el selector del modal
  const modalYear = modalMesNavegacion.getFullYear();
  const modalMonth = modalMesNavegacion.getMonth();
  const modalFirstDay = new Date(modalYear, modalMonth, 1);
  const modalLastDay = new Date(modalYear, modalMonth + 1, 0);

  let modalFirstIndex = modalFirstDay.getDay() - 1;
  if (modalFirstIndex === -1) modalFirstIndex = 6;

  const modalTotalDays = modalLastDay.getDate();
  const modalCells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Prev month buffer
  const modalPrevLastDay = new Date(modalYear, modalMonth, 0).getDate();
  for (let i = modalFirstIndex - 1; i >= 0; i--) {
    modalCells.push({
      date: new Date(modalYear, modalMonth - 1, modalPrevLastDay - i),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let i = 1; i <= modalTotalDays; i++) {
    modalCells.push({
      date: new Date(modalYear, modalMonth, i),
      isCurrentMonth: true,
    });
  }

  // Next month buffer to make 42 cells (6 rows)
  const modalRemaining = 42 - modalCells.length;
  for (let i = 1; i <= modalRemaining; i++) {
    modalCells.push({
      date: new Date(modalYear, modalMonth + 1, i),
      isCurrentMonth: false,
    });
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
            <span className="material-symbols-rounded text-4xl">error_outline</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Algo salió mal</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-[#0061a4] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#00528c] transition-colors">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10">
      {/* Header + Botón crear turno */}
      <header className="mb-8 animate-fade-slide-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 mt-1 capitalize">{todayStr}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/agenda')} className="flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm">
            <span className="material-symbols-rounded text-xl">calendar_today</span>
            Ir a Agenda
          </button>
          <button onClick={() => setModalCrear(true)} className="flex items-center gap-2 bg-[#0061a4] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#00528c] transition-all shadow-sm active:scale-[0.97] text-sm">
            <span className="material-symbols-rounded text-xl">add</span>
            Nuevo Turno
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <KPICard title="Realizados" value={caja?.turnos_realizados ?? '-'} subtitle="Hoy" icon="how_to_reg" color="bg-emerald-50 text-emerald-600" loading={loading} delay={0} />
        <KPICard title="Pendientes" value={caja?.turnos_pendientes ?? '-'} subtitle="Pendientes" icon="pending_actions" color="bg-amber-50 text-amber-600" loading={loading} delay={100} />
        <KPICard title="Ingresos ARS" value={caja ? `$${(caja.ingresos_ars ?? 0).toLocaleString()}` : '-'} subtitle="ARS" icon="payments" color="bg-blue-50 text-blue-600" loading={loading} delay={200} />
        <KPICard title="Ingresos USD" value={caja ? `USD ${(caja.ingresos_usd ?? 0).toLocaleString()}` : '-'} subtitle="USD" icon="attach_money" color="bg-purple-50 text-purple-600" loading={loading} delay={300} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 px-6">
        {/* Filtro Doctor (Izquierda) */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Profesional</span>
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 relative">
            {[
              { value: null, label: 'Todos' },
              { value: 1, label: 'Darío' },
              { value: 2, label: 'Fabiana' }
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setFiltroDoctor(opt.value)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer z-10 ${filtroDoctor === opt.value
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {filtroDoctor === opt.value && (
                  <motion.div
                    layoutId="activeDoctorFilter"
                    className={`absolute inset-0 rounded-lg shadow-md -z-10 ${opt.value === null
                      ? 'bg-gradient-to-r from-[#009BFF] to-[#FF0088]'
                      : opt.value === 1
                        ? 'bg-[#009BFF]'
                        : 'bg-[#FF0088]'
                      }`}
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro Estado (Derecha) */}
        <div className="flex flex-col items-start sm:items-end">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 text-left sm:text-right w-full">Estado del turno</span>
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 relative">
            {[
              { value: null, label: 'Todos' },
              { value: 'Pendiente', label: 'Pendientes' },
              { value: 'Realizado', label: 'Realizados' }
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setFiltroEstado(opt.value)}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer z-10 ${filtroEstado === opt.value
                  ? 'text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {filtroEstado === opt.value && (
                  <motion.div
                    layoutId="activeEstadoFilter"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs -z-10"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla turnos del día con botón cerrar */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden animate-fade-slide-up">
        <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">Turnos del Día</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{turnosFiltrados.filter(t => t.estado !== 'Cancelado').length} turnos activos</span>
        </div>
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="px-6 py-4 flex gap-4 items-center">
                <div className="w-20 h-5 rounded bg-slate-200 animate-shimmer" />
                <div className="flex-1 h-5 rounded bg-slate-200 animate-shimmer" />
                <div className="w-24 h-5 rounded bg-slate-200 animate-shimmer" />
                <div className="w-28 h-5 rounded bg-slate-200 animate-shimmer" />
                <div className="w-20 h-5 rounded bg-slate-200 animate-shimmer" />
                <div className="w-24 h-10 rounded-xl bg-slate-200 animate-shimmer" />
              </div>
            ))}
          </div>
        ) : turnosFiltrados.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <span className="material-symbols-rounded text-5xl mb-3 block">event_busy</span>
            <p className="font-medium">No hay turnos registrados para hoy</p>
            <button onClick={() => setModalCrear(true)} className="mt-3 text-[#0061a4] font-bold hover:underline">Crear un turno</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50 bg-slate-50/30">
                  <th className="px-6 py-4">Horario</th>
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Doctor</th>
                  <th className="px-6 py-4 hidden md:table-cell">Tratamiento</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {turnosFiltrados.map((turno, i) => (
                  <tr key={turno.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${DOCTOR_ROW_COLOR[turno.id_doctor] || ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{formatHour(turno.fecha_hora)}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">{turno.paciente ? `${turno.paciente.apellido}, ${turno.paciente.nombre}` : 'Paciente #' + turno.dni_paciente}</span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell text-slate-800 font-bold">{getDoctorName(turno.id_doctor)}</td>
                    <td className="px-6 py-4 hidden md:table-cell text-slate-500">{turno.motivo || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold capitalize ${estadoBadge[turno.estado] || 'bg-slate-100 text-slate-600'}`}>
                        {turno.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {turno.estado === 'Pendiente' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              if (window.confirm('¿Estás seguro de que deseas cancelar este turno?')) {
                                handleCancelarTurno(turno.id);
                              }
                            }}
                            className="border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-red-50/30 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-rounded text-sm">cancel</span>
                            Cancelar
                          </button>
                          <button
                            onClick={() => { setTurnoCerrar(turno); setModalCerrar(true); }}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm hover:shadow cursor-pointer"
                          >
                            <span className="material-symbols-rounded text-sm">how_to_reg</span>
                            Finalizar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

              {/* ════════════════ MODAL CREAR TURNO ════════════════ */}
      <Modal
        isOpen={modalCrear}
        onClose={() => { setModalCrear(false); resetFormulario(); }}
        title="Nuevo Turno"
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-5">
          {/* Buscador paciente con botón crear */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paciente (DNI)</label>
            <div className="flex gap-2">
              <input
                type="text" value={dniPaciente}
                onChange={e => { setDniPaciente(e.target.value); setPacienteInfo(null); setPacienteError(''); }}
                placeholder="Ingresá el DNI"
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all"
                onKeyDown={e => { if (e.key === 'Enter') handleBuscarPaciente(); }}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBuscarPaciente}
                disabled={pacienteBuscando}
                className="px-4 py-3 rounded-2xl bg-[#0061a4] text-white text-sm font-bold hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {pacienteBuscando ? <span className="material-symbols-rounded animate-spin text-lg">refresh</span> : 'Buscar'}
              </motion.button>
            </div>

            {pacienteBuscando && <p className="text-slate-400 text-xs mt-2 animate-pulse-soft">Buscando...</p>}

            {pacienteError && (
              <div className="mt-3">
                <p className="text-red-500 text-xs mb-2">{pacienteError}</p>
                <button onClick={() => {
                  setModalNuevoPac(true);
                  setNuevoPac(prev => ({ ...prev, dni: dniPaciente }));
                }}
                  className="flex items-center gap-1 text-xs font-bold text-[#0061a4] hover:underline cursor-pointer">
                  <span className="material-symbols-rounded text-sm">person_add</span>
                  Crear paciente con DNI {dniPaciente}
                </button>
              </div>
            )}

            {pacienteInfo && (
              <div className="mt-3 bg-[#f0f9ff] rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#c2e7ff]">
                <div className="w-10 h-10 rounded-full bg-[#c2e7ff] flex items-center justify-center text-[#0061a4]">
                  <span className="material-symbols-rounded">person</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{pacienteInfo.apellido}, {pacienteInfo.nombre}</p>
                  <p className="text-xs text-slate-500">DNI {pacienteInfo.dni}</p>
                </div>
                <span className="ml-auto text-emerald-600">
                  <span className="material-symbols-rounded">check_circle</span>
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Doctor</label>
            <CustomSelect
              options={doctorOptions}
              value={nuevoTurno.id_doctor}
              onChange={val => setNuevoTurno(prev => ({ ...prev, id_doctor: val }))}
              placeholder="Seleccioná un doctor"
            />
          </div>

          {/* Custom Date Picker (Calendario Cuadricular Mini) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha del Turno</label>

            <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100/80 space-y-3">
              {/* Navegación del Mes */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(modalMesNavegacion);
                    d.setMonth(d.getMonth() - 1);
                    setModalMesNavegacion(d);
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">chevron_left</span>
                </button>
                <span className="text-sm font-bold text-slate-700 capitalize">
                  {modalMesNavegacion.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(modalMesNavegacion);
                    d.setMonth(d.getMonth() + 1);
                    setModalMesNavegacion(d);
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-rounded text-base">chevron_right</span>
                </button>
              </div>

              {/* Headers de días */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
              </div>

              {/* Grilla de días */}
              <div className="grid grid-cols-7 gap-1">
                {modalCells.map((cell, idx) => {
                  const cellStr = toISODate(cell.date);
                  const active = selectedDate === cellStr;
                  const isTodayCell = toISODate(cell.date) === toISODate(new Date());

                  const diaSem = cell.date.getDay();
                  const esNoLaboral = diaSem === 4 || diaSem === 0; // Jueves o Domingo

                  // No permitir seleccionar fechas anteriores a hoy
                  const isPast = toISODate(cell.date) < toISODate(new Date());

                  return (
                    <button
                      key={`modal-cal-${cellStr}-${idx}`}
                      type="button"
                      disabled={isPast || !cell.isCurrentMonth}
                      onClick={() => {
                        setSelectedDate(cellStr);
                        setSelectedTime('');
                      }}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${active
                        ? 'bg-[#0061a4] text-white shadow-xs font-black scale-105'
                        : isPast || !cell.isCurrentMonth
                          ? 'opacity-20 text-slate-400 cursor-not-allowed'
                          : esNoLaboral
                            ? 'bg-slate-100/20 text-slate-400/70 cursor-not-allowed font-normal'
                            : isTodayCell
                              ? 'border border-[#0061a4]/50 text-[#0061a4] hover:bg-[#eaf4fe]'
                              : 'bg-white/40 text-slate-700 hover:bg-slate-100/50 hover:scale-[1.03] cursor-pointer'
                        }`}
                    >
                      {cell.date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid de Horarios Disponibles */}
          {nuevoTurno.id_doctor > 0 && selectedDate && (
            <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Horarios Disponibles
              </label>

              {loadingSlots ? (
                <div className="py-6 text-center text-xs text-slate-400 animate-pulse-soft">
                  Cargando horarios disponibles...
                </div>
              ) : (() => {
                const slots = getHorariosDisponibles(new Date(selectedDate + 'T00:00:00'));
                if (slots.length === 0) {
                  return (
                    <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 text-xs text-slate-500 font-medium">
                      El consultorio está cerrado este día. Elegí otra fecha.
                    </div>
                  );
                }

                const morningSlots = slots.filter(s => Number(s.split(':')[0]) < 14);
                const afternoonSlots = slots.filter(s => Number(s.split(':')[0]) >= 14);

                return (
                  <div className="space-y-4">
                    {/* Turnos Mañana */}
                    {morningSlots.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Mañana</p>
                        <div className="grid grid-cols-4 gap-2">
                          {morningSlots.map(time => {
                            const isOccupied = occupiedSlots.includes(time);
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                disabled={isOccupied}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all duration-250 select-none ${isOccupied
                                  ? 'bg-slate-100/60 text-slate-350 border-slate-150 cursor-not-allowed line-through opacity-50'
                                  : isSelected
                                    ? 'bg-[#0061a4] text-white border-transparent shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:scale-[1.03] hover:shadow-xs active:scale-95 cursor-pointer'
                                  }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Turnos Tarde */}
                    {afternoonSlots.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Tarde</p>
                        <div className="grid grid-cols-4 gap-2">
                          {afternoonSlots.map(time => {
                            const isOccupied = occupiedSlots.includes(time);
                            const isSelected = selectedTime === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                disabled={isOccupied}
                                onClick={() => setSelectedTime(time)}
                                className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all duration-250 select-none ${isOccupied
                                  ? 'bg-slate-100/60 text-slate-350 border-slate-150 cursor-not-allowed line-through opacity-50'
                                  : isSelected
                                    ? 'bg-[#0061a4] text-white border-transparent shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:scale-[1.03] hover:shadow-xs active:scale-95 cursor-pointer'
                                  }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo / Tratamiento</label>
            <input type="text" value={nuevoTurno.motivo}
              onChange={e => setNuevoTurno(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ej: Limpieza, extracción..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={() => { setModalCrear(false); resetFormulario(); }}
            className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer">Cancelar</button>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleCrearTurno}
            disabled={creando || !pacienteInfo || !nuevoTurno.fecha_hora || !nuevoTurno.id_doctor}
            className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow"
          >
            {creando ? 'Guardando...' : 'Guardar'}
          </motion.button>
        </div>
      </Modal>

      {/* ════════════════ MODAL CREAR PACIENTE ════════════════ */}
      <Modal
        isOpen={modalNuevoPac}
        onClose={() => setModalNuevoPac(false)}
        title="Nuevo Paciente"
        maxWidthClass="max-w-md"
        zIndex="z-[60]"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">DNI</label>
            <input type="text" value={nuevoPac.dni} readOnly
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-slate-50 text-slate-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
            <input type="text" value={nuevoPac.nombre}
              onChange={e => setNuevoPac(prev => ({ ...prev, nombre: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellido</label>
            <input type="text" value={nuevoPac.apellido}
              onChange={e => setNuevoPac(prev => ({ ...prev, apellido: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono (opcional)</label>
            <input type="text" value={nuevoPac.telefono}
              onChange={e => setNuevoPac(prev => ({ ...prev, telefono: e.target.value }))}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all bg-white" />
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button onClick={() => setModalNuevoPac(false)}
            className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer">Cancelar</button>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleCrearPaciente}
            disabled={creandoPac || !nuevoPac.nombre || !nuevoPac.apellido}
            className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {creandoPac ? 'Creando...' : 'Crear Paciente'}
          </motion.button>
        </div>
      </Modal>

      {/* ════════════════ MODAL CERRAR TURNO ════════════════ */}
      <Modal
        isOpen={modalCerrar && !!turnoCerrar}
        onClose={closeCerrarModal}
        title="Cerrar Turno"
        maxWidthClass="max-w-lg"
      >
        {turnoCerrar && (
          <>
            {/* Selector de catálogo */}
            <div className="mb-4">
              <button
                onClick={() => { if (!catLoading && catalogo.length === 0) { setCatLoading(true); getTratamientosCatalogo().then(d => { setCatalogo(d); setCatLoading(false); }).catch(() => setCatLoading(false)); } }}
                className="text-xs font-bold text-[#0061a4] hover:underline flex items-center gap-1 mb-2 cursor-pointer"
              >
                <span className="material-symbols-rounded text-sm">browse_gallery</span>
                {catalogo.length > 0 ? 'Seleccionar del catálogo:' : 'Cargar tratamientos del catálogo'}
              </button>
              {catalogo.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    onClick={() => setTratamientos([...tratamientos, { nombre: '', precio: 0, moneda: 'ARS' }])}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors font-medium border border-dashed border-slate-300 cursor-pointer"
                  >
                    ✏️ Servicio Manual
                  </button>
                  {catalogo.filter(c => c.activo !== false).map(c => {
                    const defMoneda = c.precio_ars ? 'ARS' : 'USD';
                    const defPrecio = c.precio_ars || c.precio_usd || 0;
                    return (
                      <button key={c.id}
                        onClick={() => setTratamientos([...tratamientos, { nombre: c.nombre, precio: Number(defPrecio), moneda: defMoneda as 'ARS' | 'USD' }])}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#eaf4fe] text-[#0061a4] hover:bg-[#c2e7ff] transition-colors font-medium cursor-pointer"
                        title={`${c.nombre} - ${c.precio_ars ? `ARS $${c.precio_ars}` : ''}${c.precio_ars && c.precio_usd ? ' / ' : ''}${c.precio_usd ? `USD $${c.precio_usd}` : ''}`}
                      >
                        {c.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
              <p className="text-sm font-bold text-slate-800">
                {turnoCerrar.paciente
                  ? `${turnoCerrar.paciente.nombre} ${turnoCerrar.paciente.apellido}`
                  : `Paciente DNI ${turnoCerrar.dni_paciente}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {getDoctorName(turnoCerrar.id_doctor)} &middot;{' '}
                {formatHour(turnoCerrar.fecha_hora)} hs
              </p>
            </div>

            {/* Tratamientos */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tratamientos</label>
              {tratamientos.map((t, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start animate-fade-slide-up">
                  <input
                    type="text"
                    value={t.nombre}
                    onChange={e => {
                      const arr = [...tratamientos];
                      arr[i] = { ...arr[i], nombre: e.target.value };
                      setTratamientos(arr);
                    }}
                    placeholder="Nombre"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all bg-white"
                  />
                  <input
                    type="number"
                    value={t.precio || ''}
                    onChange={e => {
                      const arr = [...tratamientos];
                      arr[i] = { ...arr[i], precio: Number(e.target.value) };
                      setTratamientos(arr);
                    }}
                    placeholder="Precio"
                    className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all bg-white"
                  />
                  <select
                    value={t.moneda}
                    onChange={e => {
                      const arr = [...tratamientos];
                      arr[i] = { ...arr[i], moneda: e.target.value as 'ARS' | 'USD' };
                      setTratamientos(arr);
                    }}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white transition-all cursor-pointer"
                  >
                    <option value="ARS">$</option>
                    <option value="USD">USD</option>
                  </select>
                  {tratamientos.length > 1 && (
                    <button
                      onClick={() => setTratamientos(tratamientos.filter((_, idx) => idx !== i))}
                      className="p-2.5 text-red-400 hover:text-red-650 cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-lg">remove_circle</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setTratamientos([...tratamientos, { nombre: '', precio: 0, moneda: 'ARS' }])}
                className="text-xs font-bold text-[#0061a4] hover:underline mt-1 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-rounded text-sm">add_circle</span>
                Agregar tratamiento
              </button>
            </div>

            {/* Comentarios de Evolución Clínica */}
            <div className="mb-6 animate-fade-slide-up">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Evolución y Comentarios Clínicos
              </label>
              <textarea
                value={comentarioClinico}
                onChange={e => setComentarioClinico(e.target.value)}
                placeholder="Escribí los detalles de la evolución clínica de este turno..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all bg-white resize-none"
              />
            </div>

            {/* Pagos */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pagos</label>
              {pagos.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start animate-fade-slide-up">
                  <input
                    type="number"
                    value={p.monto || ''}
                    onChange={e => {
                      const arr = [...pagos];
                      arr[i] = { ...arr[i], monto: Number(e.target.value) };
                      setPagos(arr);
                    }}
                    placeholder="Monto"
                    className="w-28 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all bg-white"
                  />
                  <select
                    value={p.moneda}
                    onChange={e => {
                      const arr = [...pagos];
                      arr[i] = { ...arr[i], moneda: e.target.value as 'ARS' | 'USD' };
                      setPagos(arr);
                    }}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white cursor-pointer"
                  >
                    <option value="ARS">$</option>
                    <option value="USD">USD</option>
                  </select>
                  <select
                    value={p.metodo}
                    onChange={e => {
                      const arr = [...pagos];
                      arr[i] = { ...arr[i], metodo: e.target.value };
                      setPagos(arr);
                    }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white cursor-pointer"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                  {pagos.length > 1 && (
                    <button
                      onClick={() => setPagos(pagos.filter((_, idx) => idx !== i))}
                      className="p-2.5 text-red-400 hover:text-red-650 cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-lg">remove_circle</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPagos([...pagos, { monto: 0, moneda: 'ARS', metodo: 'efectivo' }])}
                className="text-xs font-bold text-[#0061a4] hover:underline mt-1 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-rounded text-sm">add_circle</span>
                Agregar pago
              </button>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={closeCerrarModal}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={handleCerrarTurno}
                disabled={cerrando}
                className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {cerrando ? 'Cerrando...' : 'Confirmar'}
              </motion.button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}