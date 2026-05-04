import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCajaHoy, getTurnosHoy, getDoctores, getPaciente, crearPaciente, crearTurno, cerrarTurno, cancelarTurno } from '../services/api';
import type { ResumenCaja, Turno, Doctor, Paciente, CerrarTurnoInput, TratamientoFormItem, PagoFormItem } from '../types';
import KPICard from '../components/KPICard';

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const estadoBadge: Record<string, string> = {
  Realizado: 'bg-emerald-50 text-emerald-700',
  Pendiente: 'bg-amber-50 text-amber-700',
  Cancelado: 'bg-red-50 text-red-700',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [caja, setCaja] = useState<ResumenCaja | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal crear turno
  const [modalCrear, setModalCrear] = useState(false);
  const [dniPaciente, setDniPaciente] = useState('');
  const [pacienteInfo, setPacienteInfo] = useState<Paciente | null>(null);
  const [pacienteBuscando, setPacienteBuscando] = useState(false);
  const [pacienteError, setPacienteError] = useState('');
  const [nuevoTurno, setNuevoTurno] = useState({ fecha_hora: '', motivo: '', id_doctor: 0 });
  const [creando, setCreando] = useState(false);

  // Modal crear paciente rápido
  const [modalNuevoPac, setModalNuevoPac] = useState(false);
  const [nuevoPac, setNuevoPac] = useState({ dni: '', nombre: '', apellido: '', telefono: ''});
  const [creandoPac, setCreandoPac] = useState(false);

  // Modal cerrar turno desde dashboard
  const [turnoCerrar, setTurnoCerrar] = useState<Turno | null>(null);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [tratamientos, setTratamientos] = useState<TratamientoFormItem[]>([{ nombre: '', precio: 0, moneda: 'ARS' }]);
  const [pagos, setPagos] = useState<PagoFormItem[]>([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [cajaData, turnosData, docs] = await Promise.all([getCajaHoy(), getTurnosHoy(), getDoctores()]);
        if (!cancelled) {
          setCaja(cajaData);
          setTurnos(turnosData);
          setDoctores(docs);
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
    if (dia === 4) return 'Los jueves no se atiende. Elegí otro día.';
    if (dia === 0) return 'Los domingos no se atiende. Elegí otro día.';
    if (hora < 9 || hora >= 19) return 'El horario de atención es de 9:00 a 19:00. Elegí otro horario.';
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
      };
      await cerrarTurno(turnoCerrar.id, body);
      setModalCerrar(false);
      setTurnoCerrar(null);
      setTratamientos([{ nombre: '', precio: 0, moneda: 'ARS' }]);
      setPagos([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
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
    } catch { /* ignore */ }
  }

  const DOCTOR_ROW_COLOR: Record<number, string> = {
    1: 'bg-blue-100/60 hover:bg-blue-100/80',
    2: 'bg-pink-100/60 hover:bg-pink-100/80',
  };

  // ── Filtros ──
  const [filtroDoctor, setFiltroDoctor] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const turnosFiltrados = turnos.filter(t => {
    if (filtroDoctor && t.id_doctor !== filtroDoctor) return false;
    if (filtroEstado && t.estado !== filtroEstado) return false;
    return true;
  });

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

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
      <div className="flex gap-2 flex-wrap mb-4 px-6">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setFiltroDoctor(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filtroDoctor === null ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
          <button onClick={() => setFiltroDoctor(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filtroDoctor === 1 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Darío</button>
          <button onClick={() => setFiltroDoctor(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filtroDoctor === 2 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Fabiana</button>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setFiltroEstado(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filtroEstado === null ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
          <button onClick={() => setFiltroEstado('Pendiente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filtroEstado === 'Pendiente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Pendientes</button>
          <button onClick={() => setFiltroEstado('Realizado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filtroEstado === 'Realizado' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Realizados</button>
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
                            onClick={() => handleCancelarTurno(turno.id)}
                            className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-rounded text-sm">cancel</span>
                            Cancelar
                          </button>
                          <button
                            onClick={() => { setTurnoCerrar(turno); setModalCerrar(true); }}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-rounded text-sm">how_to_reg</span>
                            Cerrar
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
      {modalCrear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModalCrear(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 animate-fade-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Turno</h2>
              <button onClick={() => { setModalCrear(false); resetFormulario(); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

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
                  <button onClick={handleBuscarPaciente} disabled={pacienteBuscando}
                    className="px-4 py-3 rounded-2xl bg-[#0061a4] text-white text-sm font-bold hover:bg-[#00528c] transition-colors disabled:opacity-50">
                    {pacienteBuscando ? <span className="material-symbols-rounded animate-spin text-lg">refresh</span> : 'Buscar'}
                  </button>
                </div>

                {pacienteBuscando && <p className="text-slate-400 text-xs mt-2 animate-pulse-soft">Buscando...</p>}

                {pacienteError && (
                  <div className="mt-3">
                    <p className="text-red-500 text-xs mb-2">{pacienteError}</p>
                    <button onClick={() => {
                      setModalNuevoPac(true);
                      setNuevoPac(prev => ({ ...prev, dni: dniPaciente }));
                    }}
                      className="flex items-center gap-1 text-xs font-bold text-[#0061a4] hover:underline">
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
                <select value={nuevoTurno.id_doctor} onChange={e => setNuevoTurno(prev => ({ ...prev, id_doctor: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all bg-white">
                  <option value={0}>Seleccioná un doctor</option>
                  {doctores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha y Hora</label>
                <input type="datetime-local" value={nuevoTurno.fecha_hora}
                  onChange={e => setNuevoTurno(prev => ({ ...prev, fecha_hora: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:border-[#0061a4] focus:ring-2 focus:ring-[#0061a4]/10 transition-all" />
              </div>

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
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleCrearTurno} disabled={creando || !pacienteInfo || !nuevoTurno.fecha_hora || !nuevoTurno.id_doctor}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50">
                {creando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL CREAR PACIENTE ════════════════ */}
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
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setModalNuevoPac(false)}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleCrearPaciente} disabled={creandoPac || !nuevoPac.nombre || !nuevoPac.apellido}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50">
                {creandoPac ? 'Creando...' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ MODAL CERRAR TURNO ════════════════ */}
      {modalCerrar && turnoCerrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto" onClick={() => setModalCerrar(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 my-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Cerrar Turno</h2>
              <button onClick={() => { setModalCerrar(false); setTurnoCerrar(null); }} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="mb-6 bg-slate-50 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-800">{turnoCerrar.paciente?.apellido}, {turnoCerrar.paciente?.nombre}</p>
              <p className="text-xs text-slate-500 mt-1">{getDoctorName(turnoCerrar.id_doctor)} &middot; {formatHour(turnoCerrar.fecha_hora)}</p>
            </div>

            {/* Tratamientos */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tratamientos</label>
              {tratamientos.map((t, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <input type="text" value={t.nombre} onChange={e => { const a = [...tratamientos]; a[i] = { ...a[i], nombre: e.target.value }; setTratamientos(a); }}
                    placeholder="Nombre" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all" />
                  <input type="number" value={t.precio || ''} onChange={e => { const a = [...tratamientos]; a[i] = { ...a[i], precio: Number(e.target.value) }; setTratamientos(a); }}
                    placeholder="Precio" className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all" />
                  <select value={t.moneda} onChange={e => { const a = [...tratamientos]; a[i] = { ...a[i], moneda: e.target.value as 'ARS' | 'USD' }; setTratamientos(a); }}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white transition-all">
                    <option value="ARS">$</option><option value="USD">USD</option>
                  </select>
                  {tratamientos.length > 1 && <button onClick={() => setTratamientos(tratamientos.filter((_, idx) => idx !== i))} className="p-2.5 text-red-400 hover:text-red-600"><span className="material-symbols-rounded text-lg">remove_circle</span></button>}
                </div>
              ))}
              <button onClick={() => setTratamientos([...tratamientos, { nombre: '', precio: 0, moneda: 'ARS' }])}
                className="text-xs font-bold text-[#0061a4] hover:underline mt-1 flex items-center gap-1">
                <span className="material-symbols-rounded text-sm">add_circle</span> Agregar tratamiento
              </button>
            </div>

            {/* Pagos */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pagos</label>
              {pagos.map((p, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <input type="number" value={p.monto || ''} onChange={e => { const a = [...pagos]; a[i] = { ...a[i], monto: Number(e.target.value) }; setPagos(a); }}
                    placeholder="Monto" className="w-28 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all" />
                  <select value={p.moneda} onChange={e => { const a = [...pagos]; a[i] = { ...a[i], moneda: e.target.value as 'ARS' | 'USD' }; setPagos(a); }}
                    className="w-16 px-2 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                    <option value="ARS">$</option><option value="USD">USD</option>
                  </select>
                  <select value={p.metodo} onChange={e => { const a = [...pagos]; a[i] = { ...a[i], metodo: e.target.value }; setPagos(a); }}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none bg-white">
                    <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option>
                  </select>
                  {pagos.length > 1 && <button onClick={() => setPagos(pagos.filter((_, idx) => idx !== i))} className="p-2.5 text-red-400 hover:text-red-600"><span className="material-symbols-rounded text-lg">remove_circle</span></button>}
                </div>
              ))}
              <button onClick={() => setPagos([...pagos, { monto: 0, moneda: 'ARS', metodo: 'efectivo' }])}
                className="text-xs font-bold text-[#0061a4] hover:underline mt-1 flex items-center gap-1">
                <span className="material-symbols-rounded text-sm">add_circle</span> Agregar pago
              </button>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setModalCerrar(false); setTurnoCerrar(null); }}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={handleCerrarTurno} disabled={cerrando}
                className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
                {cerrando ? 'Cerrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}