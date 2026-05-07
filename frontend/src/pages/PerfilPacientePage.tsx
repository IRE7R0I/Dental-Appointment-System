import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes, getTurnos, getCuentaCorriente, crearPaciente, actualizarPaciente, getDoctores } from '../services/api';
import type { Paciente, Turno, Doctor, CuentaCorrienteResponse } from '../types';

const OBRAS_SOCIALES_DEFAULT = [
  'Particular',
  'OSDE',
  'Swiss Medical',
  'OSEP',
  'Medicus',
  'Galeno',
  'IOMA',
  'PAMI',
  'Otra',
];


type Vista = 'lista' | 'perfil' | 'editar';

const obraSocialColors: Record<string, string> = {
  osde: 'bg-amber-50 text-amber-700 border-amber-200',
  'swiss medical': 'bg-purple-50 text-purple-700 border-purple-200',
  osep: 'bg-sky-50 text-sky-700 border-sky-200',
  particular: 'bg-slate-100 text-slate-600 border-slate-200',
};

function getOSColor(os?: string) {
  if (!os) return 'bg-slate-100 text-slate-600 border-slate-200';
  const key = os.toLowerCase();
  return obraSocialColors[key] || 'bg-teal-50 text-teal-700 border-teal-200';
}

const avatarColors = [
  'bg-[#c2e7ff] text-[#001d35]',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function getInitials(nombre: string, apellido: string) {
  return (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
}

function getAvatarColor(dni: string) {
  let hash = 0;
  for (let i = 0; i < dni.length; i++) {
    hash = dni.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const estadoTimelineColor: Record<string, string> = {
  Realizado: 'bg-emerald-100 border-emerald-500',
  Pendiente: 'bg-amber-100 border-amber-500',
  Cancelado: 'bg-red-100 border-red-400',
};

export default function PerfilPacientePage() {
  const [vista, setVista] = useState<Vista>('lista');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  const [doctores, setDoctores] = useState<Doctor[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('az');
  const [filtroOS, setFiltroOS] = useState('');

  const [pacienteSel, setPacienteSel] = useState<Paciente | null>(null);
  const [cuentaSel, setCuentaSel] = useState<CuentaCorrienteResponse | null>(null);
  const [turnosSel, setTurnosSel] = useState<Turno[]>([]);
  const [loadingPerfil, setLoadingPerfil] = useState(false);

  const [editForm, setEditForm] = useState<Partial<Paciente>>({});
  const [guardando, setGuardando] = useState(false);

  const [obrasSociales, setObrasSociales] = useState<string[]>([...OBRAS_SOCIALES_DEFAULT]);
  const [modalOS, setModalOS] = useState(false);
  const [nuevaOS, setNuevaOS] = useState('');

  const [modalNuevo, setModalNuevo] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({ dni: '', nombre: '', apellido: '', telefono: '', email: '', domicilio: '', obra_social: 'Particular' });
  const [creando, setCreando] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [data, docs] = await Promise.all([getPacientes(), getDoctores()]);
        if (!cancelled) {
          setPacientes(data);
          setDoctores(docs);
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  let pacientesFiltrados = pacientes.filter(p => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!p.nombre.toLowerCase().includes(q) && !p.apellido.toLowerCase().includes(q) && !p.dni.includes(q)) return false;
    }
    if (filtroOS && p.obra_social !== filtroOS) return false;
    return true;
  });

  if (orden === 'az') pacientesFiltrados.sort((a, b) => a.apellido.localeCompare(b.apellido));
  else if (orden === 'za') pacientesFiltrados.sort((a, b) => b.apellido.localeCompare(a.apellido));
  else if (orden === 'reciente') pacientesFiltrados.sort((a, b) => (a.dni > b.dni ? -1 : 1));

  async function abrirPerfil(paciente: Paciente) {
    setPacienteSel(paciente);
    setVista('perfil');
    setLoadingPerfil(true);
    try {
      const [cuenta, turnos] = await Promise.all([
        getCuentaCorriente(paciente.dni),
        getTurnos({ paciente_dni: paciente.dni }),
      ]);
      setCuentaSel(cuenta);
      setTurnosSel(turnos);
    } catch { /* ignore */ } finally {
      setLoadingPerfil(false);
    }
  }

  function abrirEditar() {
    if (!pacienteSel) return;
    setEditForm({ ...pacienteSel });
    setVista('editar');
  }

  async function handleGuardarEdicion() {
    if (!pacienteSel) return;
    setGuardando(true);
    try {
      const updated = await actualizarPaciente(pacienteSel.dni, editForm);
      setPacienteSel(updated);
      setPacientes(prev => prev.map(p => p.dni === updated.dni ? updated : p));
      setVista('perfil');
    } catch { /* ignore */ } finally {
      setGuardando(false);
    }
  }

  async function handleCrearPaciente() {
    if (!nuevoForm.dni || !nuevoForm.nombre || !nuevoForm.apellido) {
      setErrorNuevo('Completá DNI, nombre y apellido');
      return;
    }
    setCreando(true);
    setErrorNuevo('');
    try {
      const creado = await crearPaciente(nuevoForm);
      setPacientes(prev => [...prev, creado]);
      setModalNuevo(false);
      setNuevoForm({ dni: '', nombre: '', apellido: '', telefono: '', email: '', domicilio: '', obra_social: 'Particular' });
    } catch {
      setErrorNuevo('Error al crear paciente. Verificá que el DNI no exista.');
    } finally {
      setCreando(false);
    }
  }

  function getDoctorName(id: number) {
    return doctores.find(d => d.id === id)?.nombre || `Dr. #${id}`;
  }

  function volverALista() {
    setVista('lista');
    setPacienteSel(null);
    setCuentaSel(null);
    setTurnosSel([]);
  }

  if (vista === 'perfil' && pacienteSel) {
    const deudaARS = cuentaSel?.saldo_ars ?? 0;
    const deudaUSD = cuentaSel?.saldo_usd ?? 0;
    const tieneDeuda = deudaARS > 0 || deudaUSD > 0;

    return (
      <div className="p-4 md:p-8 pb-28 md:pb-10 h-full flex flex-col">
        <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-fade-slide-up">
          <div className="flex items-center gap-4">
            <button
              onClick={volverALista}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {pacienteSel.apellido}, {pacienteSel.nombre}
                </h1>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-lg border ${
                    tieneDeuda
                      ? 'text-[#B3261E] bg-[#fce8e8] border-[#f9dada]'
                      : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                  }`}
                >
                  {tieneDeuda ? 'Deudor' : 'Al día'}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1">
                <span className="material-symbols-rounded text-[16px]">badge</span>
                DNI: {pacienteSel.dni}
              </p>
            </div>
          </div>
          <button
            onClick={abrirEditar}
            className="bg-[#e6f2fd] hover:bg-[#c2e7ff] text-[#0061a4] px-5 py-3 rounded-2xl flex items-center gap-2 font-bold transition-colors w-max"
          >
            <span className="material-symbols-rounded text-[20px]">edit</span>
            Modificar Datos
          </button>
        </header>

        {loadingPerfil ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-[#c2e7ff] border-t-[#0061a4] animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Cargando perfil...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">contact_mail</span>
                  Contacto
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Teléfono</p>
                    <p className="text-lg font-bold text-slate-800">{pacienteSel.telefono || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Correo Electrónico</p>
                    <p className="text-lg font-bold text-slate-800">{pacienteSel.email || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">health_and_safety</span>
                  Obra Social
                </h3>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Cobertura</p>
                  <p className="text-lg font-bold text-slate-800">{pacienteSel.obra_social || 'Particular'}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">account_balance_wallet</span>
                  Resumen de Cuenta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <p className="text-xs text-slate-500 font-medium mb-2">Saldo Restante</p>
                    <p className={`text-2xl font-bold ${deudaARS > 0 ? 'text-[#B3261E]' : 'text-[#0061a4]'}`}>
                      {cuentaSel
                        ? deudaARS > 0
                          ? `$ ${deudaARS.toLocaleString()}`
                          : '$ 0'
                        : '—'}
                    </p>
                    {deudaUSD > 0 && (
                      <p className="text-sm font-bold text-[#B3261E] mt-1">
                        U$D {deudaUSD.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
                    <button
                      onClick={() => navigate(`/pacientes/${pacienteSel?.dni}/historial`)}
                      className="bg-[#0061a4] text-white px-5 py-3 rounded-lg hover:bg-[#004e8a] transition-colors w-full font-bold"
                    >
                      Historial de Pagos y Tratamientos
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">history</span>
                  Historial Clínico
                </h3>

                {turnosSel.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <span className="material-symbols-rounded text-4xl block mb-2">event_busy</span>
                    <p className="text-sm font-medium">Sin turnos registrados</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                    {turnosSel.map((turno) => (
                      <div key={turno.id} className="relative pl-6 animate-fade-slide-up">
                        <div
                          className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                            estadoTimelineColor[turno.estado] || 'bg-slate-100 border-slate-300'
                          }`}
                        />
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800">{turno.motivo || 'Consulta'}</p>
                            <p className="text-sm text-slate-500 font-medium">
                              {getDoctorName(turno.id_doctor)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-700">
                              {formatFecha(turno.fecha_hora)}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase ${
                                turno.estado === 'Realizado'
                                  ? 'text-emerald-600'
                                  : turno.estado === 'Cancelado'
                                  ? 'text-red-500'
                                  : 'text-amber-600'
                              }`}
                            >
                              {turno.estado}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (vista === 'editar' && pacienteSel) {
    return (
      <div className="p-4 md:p-8 pb-28 md:pb-10 h-full flex flex-col">
        <header className="mb-6 animate-fade-slide-up">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setVista('perfil')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e6f2fd] text-[#0061a4] flex items-center justify-center">
                <span className="material-symbols-rounded">edit_document</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Editando Paciente</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  {pacienteSel.apellido}, {pacienteSel.nombre} ({pacienteSel.dni})
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto w-full">
          <form
            onSubmit={e => { e.preventDefault(); handleGuardarEdicion(); }}
            className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-8 space-y-8 animate-fade-slide-up"
          >
            <div>
              <h3 className="text-sm font-bold text-[#0061a4] border-b border-slate-100 pb-2 mb-6">
                Datos Personales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1 ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={editForm.nombre || ''}
                    onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-[12px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#0061a4] focus:bg-white transition-all font-medium"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1 ml-1">Apellido</label>
                  <input
                    type="text"
                    value={editForm.apellido || ''}
                    onChange={e => setEditForm({ ...editForm, apellido: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-[12px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#0061a4] focus:bg-white transition-all font-medium"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1 ml-1">DNI</label>
                  <input
                    type="text"
                    value={editForm.dni || ''}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-[12px] px-4 py-3 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#0061a4] border-b border-slate-100 pb-2 mb-6">
                Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1 ml-1">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.telefono || ''}
                    onChange={e => setEditForm({ ...editForm, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-[12px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#0061a4] focus:bg-white transition-all font-medium"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1 ml-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-[12px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#0061a4] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#0061a4] border-b border-slate-100 pb-2 mb-6">
                Cobertura Médica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1 ml-1">Obra Social</label>
                  <select
                    value={editForm.obra_social || ''}
                    onChange={e => setEditForm({ ...editForm, obra_social: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-[12px] px-4 py-3 outline-none focus:ring-2 focus:ring-[#0061a4] focus:bg-white transition-all font-medium"
                  >
                    {obrasSociales.map(os => (
                      <option key={os} value={os}>{os}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setVista('perfil')}
                className="flex-1 px-5 py-3 rounded-2xl font-bold text-slate-600 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 px-6 py-3 rounded-2xl bg-[#0061a4] hover:bg-[#00528c] text-white font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-rounded text-[20px]">save</span>
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10 h-full flex flex-col">
      <header className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-fade-slide-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Directorio de Pacientes</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona historias clínicas, datos y saldos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setModalOS(true)}
            className="border border-slate-200 text-slate-600 px-5 py-4 rounded-[16px] font-bold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-rounded text-lg">settings</span>
            Obras Sociales
          </button>
          <button
            onClick={() => { setModalNuevo(true); setErrorNuevo(''); }}
            className="bg-[#0061a4] hover:bg-[#00528c] text-white px-5 py-4 rounded-[16px] flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 w-max"
          >
            <span className="material-symbols-rounded">person_add</span>
            <span className="font-medium tracking-wide">Nuevo Paciente</span>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden flex-1 animate-fade-slide-up">
        <div className="p-6 border-b border-slate-50 bg-white flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96">
            <span className="material-symbols-rounded absolute left-4 top-3 text-slate-400">search</span>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por Nombre o DNI..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0061a4]/50 focus:bg-white transition-all text-sm font-medium"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <select
              value={orden}
              onChange={e => setOrden(e.target.value)}
              className="text-sm border border-slate-200 rounded-[12px] px-3 py-2 outline-none focus:ring-2 focus:ring-[#0061a4] bg-white text-slate-600 font-medium cursor-pointer hover:bg-slate-50"
            >
              <option value="az">A-Z (Alfabético)</option>
              <option value="za">Z-A</option>
              <option value="reciente">Más Recientes</option>
            </select>
            <select
              value={filtroOS}
              onChange={e => setFiltroOS(e.target.value)}
              className="text-sm border border-slate-200 rounded-[12px] px-3 py-2 outline-none focus:ring-2 focus:ring-[#0061a4] bg-white text-slate-600 font-medium cursor-pointer hover:bg-slate-50"
            >
              <option value="">Todas las Obras Sociales</option>
              {obrasSociales.map(os => (
                <option key={os} value={os}>{os}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">DNI</th>
                <th className="px-6 py-4">Obra Social</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-200 rounded animate-shimmer" style={{ width: `${60 + Math.random() * 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pacientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-rounded text-4xl block mb-2">search_off</span>
                    <p className="font-medium">No se encontraron pacientes</p>
                  </td>
                </tr>
              ) : (
                pacientesFiltrados.map((paciente, i) => (
                  <tr
                    key={paciente.dni}
                    onClick={() => abrirPerfil(paciente)}
                    className="border-b border-slate-50 hover:bg-[#f0f7ff] cursor-pointer transition-colors animate-fade-slide-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${getAvatarColor(paciente.dni)} flex items-center justify-center font-bold text-sm`}
                        >
                          {getInitials(paciente.nombre, paciente.apellido)}
                        </div>
                        <span className="font-bold text-slate-800 text-base group-hover:text-[#0061a4] transition-colors">
                          {paciente.apellido}, {paciente.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{paciente.dni}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getOSColor(paciente.obra_social)}`}
                      >
                        {paciente.obra_social || 'Particular'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{paciente.telefono || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[#0061a4] text-xs font-bold hover:underline">
                        Ver perfil
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModalOS(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 animate-fade-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Obras Sociales</h2>
              <button onClick={() => setModalOS(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text" value={nuevaOS}
                  onChange={e => setNuevaOS(e.target.value)}
                  placeholder="Nueva obra social..."
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:border-[#0061a4] transition-all"
                  onKeyDown={e => { if (e.key === 'Enter') { const v = nuevaOS.trim(); if (v && !obrasSociales.includes(v)) { setObrasSociales(prev => [...prev, v]); setNuevaOS(''); } }}}
                />
                <button
                  onClick={() => { const v = nuevaOS.trim(); if (v && !obrasSociales.includes(v)) { setObrasSociales(prev => [...prev, v]); setNuevaOS(''); } }}
                  className="px-4 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors whitespace-nowrap"
                >
                  + Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {obrasSociales.map(os => (
                  <span key={os} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {os}
                    {os !== 'Particular' && (
                      <button
                        onClick={() => setObrasSociales(prev => prev.filter(x => x !== os))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalNuevo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => setModalNuevo(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 animate-fade-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Paciente</h2>
              <button onClick={() => setModalNuevo(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">DNI *</label>
                  <input
                    type="text"
                    value={nuevoForm.dni}
                    onChange={e => setNuevoForm({ ...nuevoForm, dni: e.target.value })}
                    placeholder="Ej: 35123456"
                    className="w-full px-4 py-3 rounded-[12px] border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0061a4] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    value={nuevoForm.nombre}
                    onChange={e => setNuevoForm({ ...nuevoForm, nombre: e.target.value })}
                    placeholder="Ej: Martín"
                    className="w-full px-4 py-3 rounded-[12px] border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0061a4] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Apellido *</label>
                  <input
                    type="text"
                    value={nuevoForm.apellido}
                    onChange={e => setNuevoForm({ ...nuevoForm, apellido: e.target.value })}
                    placeholder="Ej: Pérez"
                    className="w-full px-4 py-3 rounded-[12px] border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0061a4] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                  <input
                    type="text"
                    value={nuevoForm.telefono}
                    onChange={e => setNuevoForm({ ...nuevoForm, telefono: e.target.value })}
                    placeholder="Ej: +5492615554321"
                    className="w-full px-4 py-3 rounded-[12px] border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0061a4] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email</label>
                <input
                  type="email"
                  value={nuevoForm.email}
                  onChange={e => setNuevoForm({ ...nuevoForm, email: e.target.value })}
                  placeholder="Ej: martin@email.com"
                  className="w-full px-4 py-3 rounded-[12px] border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0061a4] transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Obra Social</label>
                <select
                  value={nuevoForm.obra_social}
                  onChange={e => setNuevoForm({ ...nuevoForm, obra_social: e.target.value })}
                  className="w-full px-4 py-3 rounded-[12px] border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#0061a4] transition-all bg-white"
                >
                  {obrasSociales.map(os => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </select>
              </div>
              {errorNuevo && (
                <p className="text-red-500 text-xs font-medium">{errorNuevo}</p>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setModalNuevo(false)}
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearPaciente}
                disabled={creando}
                className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50"
              >
                {creando ? 'Creando...' : 'Crear Paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}