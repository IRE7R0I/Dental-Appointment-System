import { useEffect, useState, useCallback } from 'react';
import { getDoctores, getTurnos, getPaciente, crearTurno, cerrarTurno, cancelarTurno, crearPaciente } from '../services/api';
import type { Doctor, Turno, Paciente, CerrarTurnoInput, TratamientoFormItem, PagoFormItem } from '../types';

type Vista = 'dia' | 'semana';

const DOCTOR_COLORS: Record<number, { bg: string; border: string; dot: string; name: string }> = {
  1: { bg: 'bg-blue-50/60', border: 'border-l-[#0061a4]', dot: '#0061a4', name: 'Darío' },
  2: { bg: 'bg-purple-50/60', border: 'border-l-[#7c3aed]', dot: '#7c3aed', name: 'Fabiana' },
};

const ESTADO_CONFIG: Record<string, { label: string; classes: string; icon: string }> = {
  Pendiente: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'schedule' },
  Realizado: { label: 'Realizado', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'check_circle' },
  Cancelado: { label: 'Cancelado', classes: 'bg-red-50 text-red-700 border-red-200', icon: 'cancel' },
};

function formatDate(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDayName(d: Date) {
  return d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '').toLowerCase();
}

const DAYS_OF_WEEK = [1, 2, 3, 5, 6];

function getWeekDays(ref: Date): Date[] {
  const start = new Date(ref);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  const days: Date[] = [];
  for (const d of DAYS_OF_WEEK) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + (d - 1));
    days.push(dt);
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatWeekRange(d: Date): string {
  const days = getWeekDays(d);
  const first = days[0];
  const last = days[days.length - 1];
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return `${first.toLocaleDateString('es-AR', opts)} – ${last.toLocaleDateString('es-AR', opts)}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatHourDisplay(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function AgendaPage() {
  const [vista, setVista] = useState<Vista>('dia');
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [doctorFiltro, setDoctorFiltro] = useState<number | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [fecha, setFecha] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalCrear, setModalCrear] = useState(false);
  const [dniPaciente, setDniPaciente] = useState('');
  const [pacienteInfo, setPacienteInfo] = useState<Paciente | null>(null);
  const [pacienteBuscando, setPacienteBuscando] = useState(false);
  const [pacienteError, setPacienteError] = useState('');
  const [nuevoTurno, setNuevoTurno] = useState({ fecha_hora: '', motivo: '', id_doctor: 0 });
  const [creando, setCreando] = useState(false);

  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [modalCerrarForm, setModalCerrarForm] = useState(false);
  const [tratamientos, setTratamientos] = useState<TratamientoFormItem[]>([{ nombre: '', precio: 0, moneda: 'ARS' }]);
  const [pagos, setPagos] = useState<PagoFormItem[]>([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
  const [cerrando, setCerrando] = useState(false);

  const [cancelando, setCancelando] = useState(false);
  const [modalResumenRealizado, setModalResumenRealizado] = useState(false);
  const [modalResumenCancelado, setModalResumenCancelado] = useState(false);

  // Modal crear paciente rápido
  const [modalNuevoPac, setModalNuevoPac] = useState(false);
  const [nuevoPac, setNuevoPac] = useState({ dni: '', nombre: '', apellido: '', telefono: '', obra_social: 'Particular' });
  const [creandoPac, setCreandoPac] = useState(false);

  const [diaSemana, setDiaSemana] = useState<Date | null>(null);

  const weekDays = vista === 'semana' ? getWeekDays(fecha) : [];
  const selectedDay = vista === 'semana' ? (diaSemana ?? weekDays[0] ?? fecha) : fecha;
  const isToday = toISODate(selectedDay) === toISODate(new Date());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const docs = await getDoctores();
        if (!cancelled) setDoctores(docs);
      } catch {
        if (!cancelled) setError('No pudimos cargar los doctores. Verificá la conexión.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const loadTurnos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (vista === 'semana') {
        const weekDays = getWeekDays(fecha);
        const results = await Promise.all(
          weekDays.map(d => {
            const params: { fecha: string; id_doctor?: number } = { fecha: toISODate(d) };
            if (doctorFiltro) params.id_doctor = doctorFiltro;
            return getTurnos(params);
          })
        );
        setTurnos(results.flat());
      } else {
        const params: { fecha: string; id_doctor?: number } = { fecha: toISODate(fecha) };
        if (doctorFiltro) params.id_doctor = doctorFiltro;
        const data = await getTurnos(params);
        setTurnos(data);
      }
    } catch {
      setError('No pudimos cargar los turnos.');
    } finally {
      setLoading(false);
    }
  }, [vista, fecha, doctorFiltro]);

  useEffect(() => {
    loadTurnos();
  }, [loadTurnos]);

  async function handleBuscarPaciente() {
    if (dniPaciente.trim().length < 6) {
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

  function validarHorario(fecha_hora: string): string | null {
    const dt = new Date(fecha_hora);
    const dia = dt.getDay();
    const hora = dt.getHours() + dt.getMinutes() / 60;
    if (dia === 4) return 'Los jueves no se atiende. Elegí otro día.';
    if (dia === 0) return 'Los domingos no se atiende. Elegí otro día.';
    if (hora < 9 || hora >= 19) return 'El horario de atención es de 9:00 a 19:00. Elegí otro horario.';
    return null;
  }

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
      setModalCrear(false);
      resetFormulario();
      loadTurnos();
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
  }

  async function handleCrearPacienteRapido() {
    if (!nuevoPac.dni || !nuevoPac.nombre || !nuevoPac.apellido) return;
    setCreandoPac(true);
    try {
      await crearPaciente(nuevoPac);
      const p = await getPaciente(nuevoPac.dni);
      setPacienteInfo(p);
      setPacienteError('');
      setModalNuevoPac(false);
      setNuevoPac({ dni: '', nombre: '', apellido: '', telefono: '', obra_social: 'Particular' });
    } catch {
      setError('Error al crear el paciente');
    } finally {
      setCreandoPac(false);
    }
  }

  function handleClickTurno(turno: Turno) {
    setTurnoSeleccionado(turno);
    if (turno.estado === 'Pendiente') {
      setModalCerrar(true);
    } else if (turno.estado === 'Realizado') {
      setModalResumenRealizado(true);
    } else if (turno.estado === 'Cancelado') {
      setModalResumenCancelado(true);
    }
  }

  function abrirModalCerrarForm() {
    setModalCerrar(false);
    setModalCerrarForm(true);
  }

  async function handleCancelarTurno() {
    if (!turnoSeleccionado) return;
    setCancelando(true);
    try {
      await cancelarTurno(turnoSeleccionado.id);
      setModalCerrar(false);
      setTurnoSeleccionado(null);
      loadTurnos();
    } catch {
      setError('Error al cancelar el turno');
    } finally {
      setCancelando(false);
    }
  }

  async function handleCerrarTurno() {
    if (!turnoSeleccionado) return;
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
      };
      await cerrarTurno(turnoSeleccionado.id, body);
      setModalCerrarForm(false);
      setTurnoSeleccionado(null);
      setTratamientos([{ nombre: '', precio: 0, moneda: 'ARS' }]);
      setPagos([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
      loadTurnos();
    } catch {
      setError('Error al cerrar el turno');
    } finally {
      setCerrando(false);
    }
  }

  function goDay(delta: number) {
    const d = new Date(fecha);
    d.setDate(d.getDate() + (vista === 'semana' ? delta * 7 : delta));
    setFecha(d);
  }

  const filteredTurnos = vista === 'semana'
    ? turnos.filter(t => toISODate(new Date(t.fecha_hora)) === toISODate(selectedDay))
    : turnos;

  const sortedTurnos = [...filteredTurnos].sort((a, b) =>
    new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
  );

  function renderTurnoCard(turno: Turno, index: number) {
    const doctorColor = DOCTOR_COLORS[turno.id_doctor] || { bg: 'bg-slate-50/60', border: 'border-l-slate-400', dot: '#94a3b8', name: 'Doctor' };
    const estadoConf = ESTADO_CONFIG[turno.estado] || { label: turno.estado, classes: 'bg-slate-50 text-slate-600 border-slate-200', icon: 'help' };
    const pacienteNombre = turno.paciente
      ? `${turno.paciente.apellido}, ${turno.paciente.nombre}`
      : turno.dni_paciente;

    return (
      <button
        key={turno.id}
        onClick={() => handleClickTurno(turno)}
        className={`w-full text-left rounded-2xl border-l-[5px] ${doctorColor.border} ${doctorColor.bg} hover:bg-white hover:shadow-lg active:scale-[0.98] transition-all duration-300 p-5 cursor-pointer group animate-fade-slide-up`}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <div className="flex items-start gap-5">
          {/* Hour column */}
          <div className="shrink-0 pt-0.5 min-w-[64px]">
            <span className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-display)' }}>
              {formatHourDisplay(turno.fecha_hora)}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-auto min-h-[56px] bg-slate-200 shrink-0 self-stretch" />

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Doctor row */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: doctorColor.dot }}
              />
              <span className="text-sm font-semibold text-slate-700">{doctorColor.name}</span>
            </div>

            {/* Patient name */}
            <p className="text-base font-bold text-slate-900 leading-tight">
              {pacienteNombre}
            </p>

            {/* Motivo */}
            {turno.motivo && (
              <p className="text-sm text-slate-500 leading-snug">
                {turno.motivo}
              </p>
            )}

            {/* Badge */}
            <div className="pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estadoConf.classes}`}>
                <span className="material-symbols-rounded text-sm">{estadoConf.icon}</span>
                {estadoConf.label}
              </span>
            </div>
          </div>

          {/* Chevron */}
          <span className="material-symbols-rounded text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 pt-1">
            chevron_right
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10 h-full flex flex-col">
      {/* Header */}
      <header className="mb-6 animate-fade-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Agenda</h1>
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 bg-[#0061a4] text-white px-5 py-3 rounded-2xl font-medium hover:bg-[#00528c] transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
          >
            <span className="material-symbols-rounded text-xl">add</span>
            Nuevo Turno
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="mb-6 space-y-4 animate-fade-slide-up">
        {/* Fecha y navegación */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => goDay(-1)}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-rounded text-lg">chevron_left</span>
            </button>
            <span className="text-lg font-bold text-slate-700 capitalize min-w-[180px] text-center">
              {vista === 'semana' ? formatWeekRange(fecha) : formatDate(fecha)}
            </span>
            <button
              onClick={() => goDay(1)}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-rounded text-lg">chevron_right</span>
            </button>
            <button
              onClick={() => { setFecha(new Date()); setDiaSemana(null); }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Vista chips */}
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
            {(['dia', 'semana'] as Vista[]).map(v => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  vista === v
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v === 'dia' ? 'Día' : 'Semana'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro doctor */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDoctorFiltro(null)}
            className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
              !doctorFiltro
                ? 'bg-[#0061a4] text-white border-[#0061a4]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            Ambos
          </button>
          {doctores.map(d => {
            const color = DOCTOR_COLORS[d.id]?.dot || '#0061a4';
            return (
              <button
                key={d.id}
                onClick={() => setDoctorFiltro(d.id)}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all border ${
                  doctorFiltro === d.id
                    ? 'text-white border-transparent'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                style={doctorFiltro === d.id ? { backgroundColor: color } : undefined}
              >
                {d.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-sm flex items-center gap-3 animate-fade-slide-up">
          <span className="material-symbols-rounded text-red-400">error_outline</span>
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>
      )}

      {/* Day tabs for week view */}
      {vista === 'semana' && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 animate-fade-slide-up">
          {weekDays.map(d => {
            const active = isSameDay(d, selectedDay);
            const color = active ? (DOCTOR_COLORS[doctorFiltro ?? 0]?.dot || '#0061a4') : undefined;
            return (
              <button
                key={toISODate(d)}
                onClick={() => setDiaSemana(d)}
                className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all border ${
                  active
                    ? 'text-white border-transparent'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : undefined}
              >
                {formatDayName(d)} {d.getDate()}
              </button>
            );
          })}
        </div>
      )}

      {/* Contenido — lista vertical */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white border border-slate-100 shadow-xs animate-fade-slide-up p-5"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start gap-5">
                  <div className="w-16 h-8 bg-slate-200 rounded animate-shimmer" />
                  <div className="w-px h-14 bg-slate-100" />
                  <div className="flex-1 space-y-2.5">
                    <div className="w-20 h-4 bg-slate-200 rounded animate-shimmer" />
                    <div className="w-44 h-5 bg-slate-200 rounded animate-shimmer" />
                    <div className="w-32 h-4 bg-slate-200 rounded animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedTurnos.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs h-full flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-rounded text-6xl text-slate-300 block mb-4">event_busy</span>
              <p className="text-slate-500 font-medium">No hay turnos para esta fecha</p>
              <button
                onClick={() => setModalCrear(true)}
                className="mt-4 text-[#0061a4] text-sm font-bold hover:underline"
              >
                Crear un turno
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-1 space-y-3 pb-4">
            {/* Fecha label */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 px-1">
              <span>{sortedTurnos.length} turno{sortedTurnos.length !== 1 ? 's' : ''}</span>
              {isToday && (
                <span className="inline-flex items-center gap-1 text-[#0061a4]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0061a4] animate-pulse" />
                  Hoy
                </span>
              )}
            </div>
            {!doctorFiltro ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0061a4]" />
                    Darío
                  </h3>
                  {sortedTurnos.filter(t => t.id_doctor === 1).length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-1">Sin turnos</p>
                  ) : (
                    <div className="space-y-3">
                      {sortedTurnos.filter(t => t.id_doctor === 1).map((turno, i) => renderTurnoCard(turno, i))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#7c3aed]" />
                    Fabiana
                  </h3>
                  {sortedTurnos.filter(t => t.id_doctor === 2).length === 0 ? (
                    <p className="text-xs text-slate-400 italic pl-1">Sin turnos</p>
                  ) : (
                    <div className="space-y-3">
                      {sortedTurnos.filter(t => t.id_doctor === 2).map((turno, i) => renderTurnoCard(turno, i))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-3">
                {sortedTurnos.map((turno, i) => renderTurnoCard(turno, i))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Crear turno */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModalCrear(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Turno</h2>
              <button onClick={() => { setModalCrear(false); resetFormulario(); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-5">
              {/* Buscador paciente */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paciente (DNI)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dniPaciente}
                    onChange={e => { setDniPaciente(e.target.value); setPacienteInfo(null); setPacienteError(''); }}
                    placeholder="Ingresá el DNI"
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all"
                  />
                  <button
                    onClick={handleBuscarPaciente}
                    disabled={pacienteBuscando}
                    className="px-4 py-3 rounded-2xl bg-[#0061a4] text-white text-sm font-bold hover:bg-[#00528c] transition-colors disabled:opacity-50"
                  >
                    {pacienteBuscando ? (
                      <span className="material-symbols-rounded animate-spin text-lg">refresh</span>
                    ) : (
                      'Buscar'
                    )}
                  </button>
                </div>
                {pacienteError && (
                  <div className="mt-3">
                    <p className="text-red-500 text-xs mb-2">{pacienteError}</p>
                    <button
                      onClick={() => {
                        setModalNuevoPac(true);
                        setNuevoPac(prev => ({ ...prev, dni: dniPaciente }));
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-[#0061a4] hover:underline"
                    >
                      <span className="material-symbols-rounded text-sm">person_add</span>
                      Crear paciente con DNI {dniPaciente}
                    </button>
                  </div>
                )}
                {pacienteInfo && (
                  <div className="mt-3 bg-[#f0f9ff] rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c2e7ff] flex items-center justify-center text-[#0061a4]">
                      <span className="material-symbols-rounded">person</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{pacienteInfo.apellido}, {pacienteInfo.nombre}</p>
                      <p className="text-xs text-slate-500">DNI {pacienteInfo.dni}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Doctor</label>
                <select
                  value={nuevoTurno.id_doctor}
                  onChange={e => setNuevoTurno(prev => ({ ...prev, id_doctor: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all bg-white"
                >
                  <option value={0}>Seleccioná un doctor</option>
                  {doctores.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha y hora */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  value={nuevoTurno.fecha_hora}
                  onChange={e => setNuevoTurno(prev => ({ ...prev, fecha_hora: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Motivo / Tratamiento</label>
                <input
                  type="text"
                  value={nuevoTurno.motivo}
                  onChange={e => setNuevoTurno(prev => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ej: Limpieza, extracción..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setModalCrear(false); resetFormulario(); }}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearTurno}
                disabled={creando || !pacienteInfo || !nuevoTurno.fecha_hora || !nuevoTurno.id_doctor}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50"
              >
                {creando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resumen turno pendiente */}
      {modalCerrar && turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => { setModalCerrar(false); setTurnoSeleccionado(null); }}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Resumen del Turno</h2>
              <button onClick={() => { setModalCerrar(false); setTurnoSeleccionado(null); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[#c2e7ff] flex items-center justify-center text-[#0061a4]">
                  <span className="material-symbols-rounded">person</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {turnoSeleccionado.paciente?.apellido}, {turnoSeleccionado.paciente?.nombre}
                  </p>
                  <p className="text-xs text-slate-500">DNI {turnoSeleccionado.dni_paciente}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Obra Social</p>
                <p className="font-bold text-slate-800">{turnoSeleccionado.paciente?.obra_social || 'Particular'}</p>
              </div>

              {turnoSeleccionado.motivo && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Motivo</p>
                  <p className="text-sm text-slate-700">{turnoSeleccionado.motivo}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Doctor</p>
                  <p className="font-bold text-slate-800">{turnoSeleccionado.doctor?.nombre || `Dr. #${turnoSeleccionado.id_doctor}`}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Horario</p>
                  <p className="font-bold text-slate-800">
                    {formatHour(turnoSeleccionado.fecha_hora)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-2xl p-4">
                <span className="material-symbols-rounded text-lg">info</span>
                Este turno está pendiente. Completalo para registrar los tratamientos y pagos.
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCancelarTurno}
                disabled={cancelando}
                className="flex-1 px-5 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelando ? 'Cancelando...' : 'Cancelar Turno'}
              </button>
              <button
                onClick={abrirModalCerrarForm}
                className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
              >
                Marcar como Realizado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Resumen turno realizado (solo informativo) */}
      {modalResumenRealizado && turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => { setModalResumenRealizado(false); setTurnoSeleccionado(null); }}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Turno Realizado</h2>
              <button onClick={() => { setModalResumenRealizado(false); setTurnoSeleccionado(null); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-rounded">check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {turnoSeleccionado.paciente?.apellido}, {turnoSeleccionado.paciente?.nombre}
                  </p>
                  <p className="text-xs text-slate-500">DNI {turnoSeleccionado.dni_paciente}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Obra Social</p>
                <p className="font-bold text-slate-800">{turnoSeleccionado.paciente?.obra_social || 'Particular'}</p>
              </div>

              {turnoSeleccionado.motivo && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Motivo</p>
                  <p className="text-sm text-slate-700">{turnoSeleccionado.motivo}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Doctor</p>
                  <p className="font-bold text-slate-800">{turnoSeleccionado.doctor?.nombre || `Dr. #${turnoSeleccionado.id_doctor}`}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Horario</p>
                  <p className="font-bold text-slate-800">
                    {formatHour(turnoSeleccionado.fecha_hora)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-2xl p-4">
                <span className="material-symbols-rounded text-lg">check_circle</span>
                Este turno ya fue realizado.
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setModalResumenRealizado(false); setTurnoSeleccionado(null); }}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear paciente rápido */}
      {modalNuevoPac && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModalNuevoPac(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Paciente</h2>
              <button onClick={() => setModalNuevoPac(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
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
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apellido</label>
                <input type="text" value={nuevoPac.apellido}
                  onChange={e => setNuevoPac(prev => ({ ...prev, apellido: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono (opcional)</label>
                <input type="text" value={nuevoPac.telefono}
                  onChange={e => setNuevoPac(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Obra Social</label>
                <select
                  value={nuevoPac.obra_social}
                  onChange={e => setNuevoPac(prev => ({ ...prev, obra_social: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] transition-all bg-white"
                >
                  {['Particular', 'OSDE', 'Swiss Medical', 'OSEP', 'Medicus', 'Galeno', 'IOMA', 'PAMI', 'Otra'].map(os => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModalNuevoPac(false)}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleCrearPacienteRapido} disabled={creandoPac || !nuevoPac.nombre || !nuevoPac.apellido}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50">
                {creandoPac ? 'Creando...' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Turno cancelado (solo informativo) */}
      {modalResumenCancelado && turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => { setModalResumenCancelado(false); setTurnoSeleccionado(null); }}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Turno Cancelado</h2>
              <button onClick={() => { setModalResumenCancelado(false); setTurnoSeleccionado(null); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <span className="material-symbols-rounded">cancel</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {turnoSeleccionado.paciente?.apellido}, {turnoSeleccionado.paciente?.nombre}
                  </p>
                  <p className="text-xs text-slate-500">DNI {turnoSeleccionado.dni_paciente}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Obra Social</p>
                <p className="font-bold text-slate-800">{turnoSeleccionado.paciente?.obra_social || 'Particular'}</p>
              </div>

              {turnoSeleccionado.motivo && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Motivo</p>
                  <p className="text-sm text-slate-700">{turnoSeleccionado.motivo}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Doctor</p>
                  <p className="font-bold text-slate-800">{turnoSeleccionado.doctor?.nombre || `Dr. #${turnoSeleccionado.id_doctor}`}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Horario</p>
                  <p className="font-bold text-slate-800">
                    {formatHour(turnoSeleccionado.fecha_hora)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-2xl p-4">
                <span className="material-symbols-rounded text-lg">cancel</span>
                Este turno fue cancelado.
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setModalResumenCancelado(false); setTurnoSeleccionado(null); }}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cerrar turno formulario */}
      {modalCerrarForm && turnoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto" onClick={() => setModalCerrarForm(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 my-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Cerrar Turno</h2>
              <button onClick={() => { setModalCerrarForm(false); setTratamientos([{ nombre: '', precio: 0, moneda: 'ARS' }]); setPagos([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="mb-6 bg-slate-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-800">
                {turnoSeleccionado.paciente?.apellido}, {turnoSeleccionado.paciente?.nombre}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {turnoSeleccionado.doctor?.nombre} &middot;{' '}
                {formatHour(turnoSeleccionado.fecha_hora)}
              </p>
            </div>

            {/* Tratamientos */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tratamientos</label>
              {tratamientos.map((t, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <input
                    type="text"
                    value={t.nombre}
                    onChange={e => {
                      const arr = [...tratamientos];
                      arr[i] = { ...arr[i], nombre: e.target.value };
                      setTratamientos(arr);
                    }}
                    placeholder="Nombre"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all"
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
                    className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all"
                  />
                  <select
                    value={t.moneda}
                    onChange={e => {
                      const arr = [...tratamientos];
                      arr[i] = { ...arr[i], moneda: e.target.value as 'ARS' | 'USD' };
                      setTratamientos(arr);
                    }}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white transition-all"
                  >
                    <option value="ARS">$</option>
                    <option value="USD">USD</option>
                  </select>
                  {tratamientos.length > 1 && (
                    <button
                      onClick={() => setTratamientos(tratamientos.filter((_, idx) => idx !== i))}
                      className="p-2.5 text-red-400 hover:text-red-600"
                    >
                      <span className="material-symbols-rounded text-lg">remove_circle</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setTratamientos([...tratamientos, { nombre: '', precio: 0, moneda: 'ARS' }])}
                className="text-xs font-bold text-[#0061a4] hover:underline mt-1 flex items-center gap-1"
              >
                <span className="material-symbols-rounded text-sm">add_circle</span>
                Agregar tratamiento
              </button>
            </div>

            {/* Pagos */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pagos</label>
              {pagos.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <input
                    type="number"
                    value={p.monto || ''}
                    onChange={e => {
                      const arr = [...pagos];
                      arr[i] = { ...arr[i], monto: Number(e.target.value) };
                      setPagos(arr);
                    }}
                    placeholder="Monto"
                    className="w-28 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all"
                  />
                  <select
                    value={p.moneda}
                    onChange={e => {
                      const arr = [...pagos];
                      arr[i] = { ...arr[i], moneda: e.target.value as 'ARS' | 'USD' };
                      setPagos(arr);
                    }}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
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
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                  {pagos.length > 1 && (
                    <button
                      onClick={() => setPagos(pagos.filter((_, idx) => idx !== i))}
                      className="p-2.5 text-red-400 hover:text-red-600"
                    >
                      <span className="material-symbols-rounded text-lg">remove_circle</span>
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPagos([...pagos, { monto: 0, moneda: 'ARS', metodo: 'efectivo' }])}
                className="text-xs font-bold text-[#0061a4] hover:underline mt-1 flex items-center gap-1"
              >
                <span className="material-symbols-rounded text-sm">add_circle</span>
                Agregar pago
              </button>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setModalCerrarForm(false); setTurnoSeleccionado(null); }}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarTurno}
                disabled={cerrando}
                className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {cerrando ? 'Cerrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}