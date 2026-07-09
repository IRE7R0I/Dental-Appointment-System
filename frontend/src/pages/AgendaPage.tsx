import { useEffect, useState, useCallback } from 'react';
import { getDoctores, getTurnos, getPaciente, crearTurno, cerrarTurno, cancelarTurno, crearPaciente, getTratamientosCatalogo } from '../services/api';
import type { Doctor, Turno, Paciente, CerrarTurnoInput, TratamientoFormItem, PagoFormItem, TratamientoCatalogo } from '../types';
import { useToast } from '../context/ToastContext';
import { motion } from 'motion/react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';

type Vista = 'semana' | 'mensual';

const DOCTOR_COLORS: Record<number, { bg: string; border: string; dot: string; name: string }> = {
  1: { bg: 'bg-blue-50/60', border: 'border-l-[#009BFF]', dot: '#009BFF', name: 'Darío' },
  2: { bg: 'bg-pink-50/60', border: 'border-l-[#FF0088]', dot: '#FF0088', name: 'Fabiana' },
};

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

function getDefaultFecha() {
  let d = new Date();

  // Si es sábado después de las 13:00, saltar al lunes
  if (d.getDay() === 6 && d.getHours() >= 13) {
    d.setDate(d.getDate() + 2);
  }

  for (let i = 0; i < 7; i++) {
    const dayOfWeek = d.getDay();
    const esNoLaboral = dayOfWeek === 4 || dayOfWeek === 0; // Jueves (4) o Domingo (0)

    // Si es hoy, verificar si ya pasó el último slot (19:30 hs)
    const isToday = d.toDateString() === new Date().toDateString();
    const now = new Date();
    const isTodayPassed = isToday && (now.getHours() > 19 || (now.getHours() === 19 && now.getMinutes() >= 30));

    if (!esNoLaboral && !isTodayPassed) {
      return d;
    }
    d = new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return new Date();
}

export default function AgendaPage() {
  const toast = useToast();
  const [vista, setVista] = useState<Vista>('semana');
  const [mesNavegacion, setMesNavegacion] = useState(() => getDefaultFecha());
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [doctorFiltro, setDoctorFiltro] = useState<number | null>(null);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [fecha, setFecha] = useState(() => getDefaultFecha());
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
  const [catalogo, setCatalogo] = useState<TratamientoCatalogo[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [pagos, setPagos] = useState<PagoFormItem[]>([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
  const [cerrando, setCerrando] = useState(false);
  const [comentarioClinico, setComentarioClinico] = useState('');

  const [cancelando, setCancelando] = useState(false);
  const [modalResumenRealizado, setModalResumenRealizado] = useState(false);
  const [modalResumenCancelado, setModalResumenCancelado] = useState(false);

  // Modal crear paciente rápido
  const [modalNuevoPac, setModalNuevoPac] = useState(false);
  const [nuevoPac, setNuevoPac] = useState({ dni: '', nombre: '', apellido: '', telefono: '', obra_social: 'Particular' });
  const [creandoPac, setCreandoPac] = useState(false);

  // Selector personalizado de fecha y horarios en modal
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [modalMesNavegacion, setModalMesNavegacion] = useState(() => new Date());

  useEffect(() => {
    if (modalCrear && nuevoTurno.fecha_hora) {
      const [datePart, timePart] = nuevoTurno.fecha_hora.split('T');
      if (datePart) setSelectedDate(datePart);
      if (timePart) setSelectedTime(timePart);
      if (datePart) setModalMesNavegacion(new Date(datePart + 'T00:00:00'));
    }
  }, [modalCrear, nuevoTurno.fecha_hora]);

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

  const weekDays = getWeekDays(fecha);
  const selectedDay = fecha;
  const isToday = toISODate(selectedDay) === toISODate(new Date());

  const doctorOptions = doctores.map(d => ({
    value: d.id,
    label: d.nombre,
    color: DOCTOR_COLORS[d.id]?.dot || '#009BFF',
    subtitle: d.id === 1 ? 'Odontología General' : 'Ortodoncia & Cirugía'
  }));

  const obraSocialOptions = ['Particular', 'OSDE', 'Swiss Medical', 'OSEP', 'Medicus', 'Galeno', 'IOMA', 'PAMI', 'Otra'].map(os => ({
    value: os,
    label: os
  }));

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
        // En vista mensual, cargamos todos los turnos para pintar los puntitos en toda la grilla de días
        const params: { id_doctor?: number } = {};
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
    setSelectedDate('');
    setSelectedTime('');
    setOccupiedSlots([]);
    setModalMesNavegacion(new Date());
  }

  async function handleCrearPacienteRapido() {
    if (!nuevoPac.dni || !nuevoPac.nombre || !nuevoPac.apellido) return;
    setCreandoPac(true);
    try {
      await crearPaciente(nuevoPac);
      const p = await getPaciente(nuevoPac.dni);
      setPacienteInfo(p);
      setPacienteError('');
      toast.success(`¡Paciente ${nuevoPac.nombre} ${nuevoPac.apellido} creado!`);
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

  function closeCerrarFormModal() {
    setModalCerrarForm(false);
    setTratamientos([{ nombre: '', precio: 0, moneda: 'ARS' }]);
    setPagos([{ monto: 0, moneda: 'ARS', metodo: 'efectivo' }]);
    setTurnoSeleccionado(null);
    setComentarioClinico('');
  }

  async function handleCancelarTurno() {
    if (!turnoSeleccionado) return;
    setCancelando(true);
    try {
      await cancelarTurno(turnoSeleccionado.id);
      toast.error('El turno ha sido cancelado con éxito.');
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
        comentarios: comentarioClinico.trim() || undefined,
      };
      await cerrarTurno(turnoSeleccionado.id, body);
      toast.success('¡El turno ha sido marcado como realizado y cerrado!');
      closeCerrarFormModal();
      loadTurnos();
    } catch {
      setError('Error al cerrar el turno');
    } finally {
      setCerrando(false);
    }
  }

  function renderSlotCard(time: string, id_doctor: number, existingTurno?: Turno) {
    if (existingTurno) {
      const doctorColor = DOCTOR_COLORS[existingTurno.id_doctor] || { bg: 'bg-slate-50/60', border: 'border-l-slate-400', dot: '#94a3b8', name: 'Doctor' };
      const pacienteNombre = existingTurno.paciente
        ? `${existingTurno.paciente.nombre} ${existingTurno.paciente.apellido}`
        : `DNI ${existingTurno.dni_paciente}`;

      return (
        <button
          onClick={() => handleSlotClick(time, id_doctor, existingTurno)}
          className="w-full text-left rounded-2xl border border-slate-100 bg-white shadow-sm p-4 flex items-center justify-between cursor-pointer transition-all duration-300 hover:shadow-md hover:border-slate-200 group relative overflow-hidden"
        >
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-black text-slate-800">{time} hs</span>
              {vista === 'semana' && (
                <span className="text-[10px] font-bold text-slate-400 capitalize">
                  &middot; {existingTurno.doctor?.nombre || doctorColor.name}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">{pacienteNombre}</p>
            {existingTurno.motivo && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{existingTurno.motivo}</p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="material-symbols-rounded text-base font-bold">check</span>
            </span>
          </div>
        </button>
      );
    } else {
      return (
        <button
          onClick={() => handleSlotClick(time, id_doctor)}
          className="w-full text-left rounded-2xl border border-dashed border-slate-200 bg-white/40 hover:bg-blue-50/40 hover:border-[#2563eb]/40 hover:shadow-xs transition-all duration-300 p-4 flex items-center justify-between cursor-pointer group"
        >
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-700 group-hover:text-[#2563eb] transition-colors">{time} hs</span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-0.5 group-hover:text-[#2563eb]/70 transition-colors">Disponible</span>
          </div>
          <span className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-[#eaf4fe] text-slate-400 group-hover:text-[#2563eb] border border-slate-200/40 group-hover:border-[#c2e7ff]/30 flex items-center justify-center transition-all duration-300">
            <span className="material-symbols-rounded text-base font-bold">add</span>
          </span>
        </button>
      );
    }
  }

  function goDay(delta: number) {
    const d = new Date(fecha);
    if (vista === 'mensual') {
      d.setMonth(d.getMonth() + delta);
      setFecha(d);
      setMesNavegacion(d);
    } else {
      d.setDate(d.getDate() + delta * 7);
      setFecha(d);
    }
  }

  // Lógica de celdas del mes
  const year = mesNavegacion.getFullYear();
  const month = mesNavegacion.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week index for Monday-start (0 = Mon, ..., 6 = Sun)
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const totalDaysInMonth = lastDayOfMonth.getDate();
  const monthCells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Prev month buffer
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    monthCells.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    monthCells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month buffer to make 42 cells (6 rows)
  const remaining = 42 - monthCells.length;
  for (let i = 1; i <= remaining; i++) {
    monthCells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }
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

  function getTurnoForSlot(time: string, id_doctor: number): Turno | undefined {
    return turnos.find(t => {
      if (t.estado === 'Cancelado') return false;
      if (t.id_doctor !== id_doctor) return false;
      if (toISODate(new Date(t.fecha_hora)) !== toISODate(selectedDay)) return false;

      const dt = new Date(t.fecha_hora);
      const h = String(dt.getHours()).padStart(2, '0');
      const m = String(dt.getMinutes()).padStart(2, '0');
      return `${h}:${m}` === time;
    });
  }

  function shouldShowSlot(time: string, id_doctor: number): boolean {
    if (!isToday) return true;
    const existing = getTurnoForSlot(time, id_doctor);
    if (existing) return true;

    const now = new Date();
    const [hStr, mStr] = time.split(':');
    const slotH = Number(hStr);
    const slotM = Number(mStr);
    return now.getHours() < slotH || (now.getHours() === slotH && now.getMinutes() < slotM);
  }

  function getDoctorTurnosDots(d: Date) {
    const hasDario = turnos.some(t => t.estado !== 'Cancelado' && t.id_doctor === 1 && toISODate(new Date(t.fecha_hora)) === toISODate(d));
    const hasFabiana = turnos.some(t => t.estado !== 'Cancelado' && t.id_doctor === 2 && toISODate(new Date(t.fecha_hora)) === toISODate(d));

    return (
      <div className="flex justify-center gap-1 h-1.5 mt-1">
        {hasDario && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#009BFF]" />
        )}
        {hasFabiana && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF0088]" />
        )}
      </div>
    );
  }

  function handleSlotClick(time: string, id_doctor: number, existingTurno?: Turno) {
    if (existingTurno) {
      handleClickTurno(existingTurno);
    } else {
      const y = selectedDay.getFullYear();
      const m = String(selectedDay.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDay.getDate()).padStart(2, '0');
      const val = `${y}-${m}-${d}T${time}`;
      setNuevoTurno({ fecha_hora: val, motivo: '', id_doctor });
      setDniPaciente('');
      setPacienteInfo(null);
      setPacienteError('');
      setModalCrear(true);
    }
  }

  const timeslots = getHorariosDisponibles(selectedDay);

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.05,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 280, damping: 24 }
    }
  };

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-10 font-[family-name:var(--font-sans)]">
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
            <span className="text-lg font-bold text-slate-700 capitalize min-w-[200px] text-center">
              {vista === 'semana'
                ? formatWeekRange(fecha)
                : mesNavegacion.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
              }
            </span>
            <button
              onClick={() => goDay(1)}
              className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-rounded text-lg">chevron_right</span>
            </button>
            <button
              onClick={() => { setFecha(getDefaultFecha()); setMesNavegacion(getDefaultFecha()); }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Vista chips */}
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 relative">
            {(['semana', 'mensual'] as Vista[]).map(v => (
              <button
                key={v}
                onClick={() => {
                  setVista(v);
                  if (v === 'mensual') setMesNavegacion(fecha);
                }}
                className="relative px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer z-10 text-slate-500 hover:text-slate-700"
                style={{ color: vista === v ? '#1e293b' : undefined }}
              >
                {vista === v && (
                  <motion.div
                    layoutId="activeVistaTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-xs -z-10"
                    transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                  />
                )}
                {v === 'semana' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro doctor */}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Profesional</span>
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 relative w-fit">
            {[
              { value: null, label: 'Ambos' },
              { value: 1, label: 'Darío' },
              { value: 2, label: 'Fabiana' }
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => setDoctorFiltro(opt.value)}
                className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer z-10 ${doctorFiltro === opt.value
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {doctorFiltro === opt.value && (
                  <motion.div
                    layoutId="activeDoctorFilter"
                    className={`absolute inset-0 rounded-xl shadow-md -z-10 ${opt.value === null
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

      {/* ────────────────────────────────────────────────────────────────────────
          CALENDARIO MODULAR CON ESTILO VIDRIO ESMERILADO (GLASSMORPHISM)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="mb-6 relative overflow-hidden rounded-3xl border border-white/40 bg-white/40 backdrop-blur-md p-6 shadow-xl animate-fade-slide-up">
        {/* Adorno brillante de fondo */}
        <div className="absolute -right-20 -top-20 w-44 h-44 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

        {vista === 'semana' ? (
          /* 📅 VISTA SEMANAL HORIZONTAL */
          <div className="flex gap-2 w-full">
            {weekDays.map(d => {
              const active = isSameDay(d, selectedDay);
              const isPast = toISODate(d) < toISODate(new Date());
              return (
                <button
                  key={toISODate(d)}
                  disabled={isPast}
                  onClick={() => {
                    setFecha(d);
                  }}
                  className={`flex-1 relative flex flex-col items-center justify-center py-4 px-2 rounded-2xl select-none transition-all duration-300 ${active
                    ? 'shadow-md shadow-blue-500/20'
                    : isPast
                      ? 'bg-slate-50 text-slate-400 pointer-events-none opacity-40'
                      : 'hover:scale-[1.03] hover:y-[-2px] cursor-pointer'
                    }`}
                  style={{ color: active ? '#ffffff' : (isPast ? '#94a3b8' : '#64748b') }}
                >
                  {active && (
                    <motion.div
                      layoutId="selectedDayWeekPill"
                      className="absolute inset-0 bg-[#009BFF] shadow-md shadow-blue-500/20 rounded-2xl -z-10"
                      transition={{ type: 'spring' as const, stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="text-[10px] uppercase font-bold tracking-wider mb-1">{formatDayName(d)}</span>
                  <span className="text-2xl font-black">{d.getDate()}</span>

                  {/* Indicadores de turnos por doctor */}
                  {getDoctorTurnosDots(d)}
                </button>
              );
            })}
          </div>
        ) : (
          /* 📅 VISTA MENSUAL CUADRADA */
          <div className="space-y-4 w-full max-w-5xl mx-auto">
            {/* Headers de días */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7 gap-1.5">
              {monthCells.map((cell, idx) => {
                const active = isSameDay(cell.date, selectedDay);

                const diaSem = cell.date.getDay();
                const esNoLaboral = diaSem === 4 || diaSem === 0; // Jueves o Domingo
                const isPast = toISODate(cell.date) < toISODate(new Date());

                return (
                  <button
                    key={`${toISODate(cell.date)}-${idx}`}
                    disabled={isPast}
                    onClick={() => {
                      setFecha(cell.date);
                      setMesNavegacion(cell.date);
                    }}
                    className={`aspect-[9/4] group relative rounded-xl flex flex-col items-center justify-between p-1.5 transition-all duration-300 ${active
                      ? 'bg-[#009BFF] text-white shadow-md shadow-blue-500/20 scale-105'
                      : isPast
                        ? 'bg-slate-50 text-slate-400 pointer-events-none opacity-40'
                        : !cell.isCurrentMonth
                          ? 'opacity-30 text-slate-400 cursor-pointer hover:scale-[1.05] hover:shadow-md'
                          : esNoLaboral
                            ? 'bg-slate-50/20 text-slate-400 cursor-pointer hover:scale-[1.05] hover:shadow-md'
                            : 'bg-white/10 text-slate-800 cursor-pointer hover:scale-[1.05] hover:shadow-md'
                      }`}
                    style={{
                      border: active ? 'none' : '1px solid rgba(0, 0, 0, 0.18)',
                    }}
                  >
                    {/* Tooltip personalizado */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none z-30 select-none flex flex-col items-center">
                      <div className="bg-slate-900/95 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg shadow-md whitespace-nowrap backdrop-blur-xs uppercase tracking-wider">
                        {cell.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-900/95 rotate-45 -mt-[3px]" />
                    </div>

                    <span className="text-xs font-black self-start leading-none">{cell.date.getDate()}</span>

                    {/* Indicadores de turnos por doctor */}
                    {getDoctorTurnosDots(cell.date)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          SECCIÓN DE HORARIOS DISPONIBLES EN CASCADA (STAGGERED)
          ──────────────────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col">
        {/* Título de sección */}
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-rounded text-[#0061a4]">schedule</span>
            <span>Horarios Disponibles para el {selectedDay.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</span>
            {isToday && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Hoy
              </span>
            )}
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Turnos de 30 min
          </span>
        </div>

        {loading ? (
          /* Loading placeholders */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-white border border-slate-100 shadow-xs animate-shimmer" />
            ))}
          </div>
        ) : timeslots.length === 0 ? (
          /* Día de descanso */
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-8 text-center flex-1 flex flex-col items-center justify-center animate-fade-slide-up">
            <span className="material-symbols-rounded text-6xl text-slate-300 mb-3">weekend</span>
            <h3 className="font-bold text-slate-700 text-lg">Día de Descanso / Cerrado</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-sm">
              No se atiende los jueves ni los domingos. Por favor, selecciona otro día de la semana.
            </p>
          </div>
        ) : (
          /* Slots Grid Cascading */
          <div className="pr-1 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6 pb-6"
            >
              {doctorFiltro === null ? (
                /* 👥 AMBOS DOCTORES - DOS COLUMNAS PARALELAS (UX PREMIUM) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Darío (General) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#009BFF]" />
                      Dr. Darío &middot; General
                    </h3>

                    {/* Mañana */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">Mañana</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {timeslots.filter(t => Number(t.split(':')[0]) < 14).filter(time => shouldShowSlot(time, 1)).map(time => {
                          const existing = getTurnoForSlot(time, 1);
                          return (
                            <motion.div key={`dario-morning-${time}`} variants={itemVariants}>
                              {renderSlotCard(time, 1, existing)}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarde */}
                    {timeslots.some(t => Number(t.split(':')[0]) >= 14) && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">Tarde</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {timeslots.filter(t => Number(t.split(':')[0]) >= 14).filter(time => shouldShowSlot(time, 1)).map(time => {
                            const existing = getTurnoForSlot(time, 1);
                            return (
                              <motion.div key={`dario-afternoon-${time}`} variants={itemVariants}>
                                {renderSlotCard(time, 1, existing)}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna Fabiana (Ortodoncia) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF0088]" />
                      Dra. Fabiana &middot; Ortodoncia
                    </h3>

                    {/* Mañana */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">Mañana</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {timeslots.filter(t => Number(t.split(':')[0]) < 14).filter(time => shouldShowSlot(time, 2)).map(time => {
                          const existing = getTurnoForSlot(time, 2);
                          return (
                            <motion.div key={`fabiana-morning-${time}`} variants={itemVariants}>
                              {renderSlotCard(time, 2, existing)}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tarde */}
                    {timeslots.some(t => Number(t.split(':')[0]) >= 14) && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">Tarde</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {timeslots.filter(t => Number(t.split(':')[0]) >= 14).filter(time => shouldShowSlot(time, 2)).map(time => {
                            const existing = getTurnoForSlot(time, 2);
                            return (
                              <motion.div key={`fabiana-afternoon-${time}`} variants={itemVariants}>
                                {renderSlotCard(time, 2, existing)}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 👤 UN SOLO DOCTOR - COLUMNA COMPLETA */
                <div className="max-w-2xl mx-auto space-y-4">
                  {/* Mañana */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">Turnos de la Mañana</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {timeslots.filter(t => Number(t.split(':')[0]) < 14).filter(time => shouldShowSlot(time, doctorFiltro)).map(time => {
                        const existing = getTurnoForSlot(time, doctorFiltro);
                        return (
                          <motion.div key={`single-morning-${time}`} variants={itemVariants}>
                            {renderSlotCard(time, doctorFiltro, existing)}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarde */}
                  {timeslots.some(t => Number(t.split(':')[0]) >= 14) && (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2 mt-4">Turnos de la Tarde</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {timeslots.filter(t => Number(t.split(':')[0]) >= 14).filter(time => shouldShowSlot(time, doctorFiltro)).map(time => {
                          const existing = getTurnoForSlot(time, doctorFiltro);
                          return (
                            <motion.div key={`single-afternoon-${time}`} variants={itemVariants}>
                              {renderSlotCard(time, doctorFiltro, existing)}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>


      <Modal
        isOpen={modalCrear}
        onClose={() => { setModalCrear(false); resetFormulario(); }}
        title="Nuevo Turno"
        maxWidthClass="max-w-lg"
      >

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
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBuscarPaciente}
                      disabled={pacienteBuscando}
                      className="px-4 py-3 rounded-2xl bg-[#0061a4] text-white text-sm font-bold hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {pacienteBuscando ? (
                        <span className="material-symbols-rounded animate-spin text-lg">refresh</span>
                      ) : (
                        'Buscar'
                      )}
                    </motion.button>
                  </div>
                  {pacienteError && (
                    <div className="mt-3">
                      <p className="text-red-500 text-xs mb-2">{pacienteError}</p>
                      <button
                        onClick={() => {
                          setModalNuevoPac(true);
                          setNuevoPac(prev => ({ ...prev, dni: dniPaciente }));
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-[#0061a4] hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-rounded text-sm">person_add</span>
                        Crear paciente con DNI {dniPaciente}
                      </button>
                    </div>
                  )}
                  {pacienteInfo && (
                    <div className="mt-3 bg-[#f0f9ff] rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#c2e7ff]/40">
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
                  className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
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

      <Modal
        isOpen={modalCerrar && !!turnoSeleccionado}
        onClose={() => { setModalCerrar(false); setTurnoSeleccionado(null); }}
        title="Resumen del Turno"
        maxWidthClass="max-w-md"
      >
        {turnoSeleccionado && (
          <>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                  <div className="w-12 h-12 rounded-full bg-[#c2e7ff] flex items-center justify-center text-[#0061a4]">
                    <span className="material-symbols-rounded">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {turnoSeleccionado.paciente
                        ? `${turnoSeleccionado.paciente.nombre} ${turnoSeleccionado.paciente.apellido}`
                        : `Paciente DNI ${turnoSeleccionado.dni_paciente}`}
                    </p>
                    <p className="text-xs text-slate-500">DNI {turnoSeleccionado.dni_paciente}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Obra Social</p>
                  <p className="font-bold text-slate-800">{turnoSeleccionado.paciente?.obra_social || 'Particular'}</p>
                </div>

                {turnoSeleccionado.motivo && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Motivo</p>
                    <p className="text-sm text-slate-700">{turnoSeleccionado.motivo}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Doctor</p>
                    <p className="font-bold text-slate-800">{turnoSeleccionado.doctor?.nombre || 'Sin doctor asignado'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Horario</p>
                    <p className="font-bold text-slate-800">
                      {formatHour(turnoSeleccionado.fecha_hora)} hs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <span className="material-symbols-rounded text-lg">info</span>
                  Este turno está pendiente. Completalo para registrar los tratamientos y pagos.
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleCancelarTurno}
                  disabled={cancelando}
                  className="flex-1 px-5 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow"
                >
                  {cancelando ? 'Cancelando...' : 'Cancelar Turno'}
                </button>
                <button
                  onClick={abrirModalCerrarForm}
                  className="flex-1 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm hover:shadow"
                >
                  Marcar como Realizado
                </button>
              </div>
            </>
        )}
      </Modal>

      <Modal
        isOpen={modalResumenRealizado && !!turnoSeleccionado}
        onClose={() => { setModalResumenRealizado(false); setTurnoSeleccionado(null); }}
        title="Turno Realizado"
        maxWidthClass="max-w-md"
      >
        {turnoSeleccionado && (
          <>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-rounded">check_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {turnoSeleccionado.paciente
                        ? `${turnoSeleccionado.paciente.nombre} ${turnoSeleccionado.paciente.apellido}`
                        : `Paciente DNI ${turnoSeleccionado.dni_paciente}`}
                    </p>
                    <p className="text-xs text-slate-500">DNI {turnoSeleccionado.dni_paciente}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Obra Social</p>
                  <p className="font-bold text-slate-800">{turnoSeleccionado.paciente?.obra_social || 'Particular'}</p>
                </div>

                {turnoSeleccionado.motivo && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Motivo</p>
                    <p className="text-sm text-slate-700">{turnoSeleccionado.motivo}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Doctor</p>
                    <p className="font-bold text-slate-800">{turnoSeleccionado.doctor?.nombre || 'Sin doctor asignado'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Horario</p>
                    <p className="font-bold text-slate-800">
                      {formatHour(turnoSeleccionado.fecha_hora)} hs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                  <span className="material-symbols-rounded text-lg">check_circle</span>
                  Este turno ya fue realizado.
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setModalResumenRealizado(false); setTurnoSeleccionado(null); }}
                  className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors cursor-pointer shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </>
        )}
      </Modal>

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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Obra Social</label>
                  <CustomSelect
                    options={obraSocialOptions}
                    value={nuevoPac.obra_social}
                    onChange={val => setNuevoPac(prev => ({ ...prev, obra_social: val }))}
                    placeholder="Seleccioná obra social"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setModalNuevoPac(false)}
                  className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer">Cancelar</button>
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleCrearPacienteRapido}
                  disabled={creandoPac || !nuevoPac.nombre || !nuevoPac.apellido}
                  className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors disabled:opacity-50 cursor-pointer shadow-sm hover:shadow"
                >
                  {creandoPac ? 'Creando...' : 'Crear Paciente'}
                </motion.button>
              </div>
      </Modal>

      <Modal
        isOpen={modalResumenCancelado && !!turnoSeleccionado}
        onClose={() => { setModalResumenCancelado(false); setTurnoSeleccionado(null); }}
        title="Turno Cancelado"
        maxWidthClass="max-w-md"
      >
        {turnoSeleccionado && (
          <>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <span className="material-symbols-rounded">cancel</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {turnoSeleccionado.paciente
                        ? `${turnoSeleccionado.paciente.nombre} ${turnoSeleccionado.paciente.apellido}`
                        : `Paciente DNI ${turnoSeleccionado.dni_paciente}`}
                    </p>
                    <p className="text-xs text-slate-500">DNI {turnoSeleccionado.dni_paciente}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Obra Social</p>
                  <p className="font-bold text-slate-800">{turnoSeleccionado.paciente?.obra_social || 'Particular'}</p>
                </div>

                {turnoSeleccionado.motivo && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Motivo</p>
                    <p className="text-sm text-slate-700">{turnoSeleccionado.motivo}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Doctor</p>
                    <p className="font-bold text-slate-800">{turnoSeleccionado.doctor?.nombre || 'Sin doctor asignado'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Horario</p>
                    <p className="font-bold text-slate-800">
                      {formatHour(turnoSeleccionado.fecha_hora)} hs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-2xl p-4 border border-red-100">
                  <span className="material-symbols-rounded text-lg">cancel</span>
                  Este turno fue cancelado.
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => { setModalResumenCancelado(false); setTurnoSeleccionado(null); }}
                  className="flex-1 px-5 py-3 rounded-2xl bg-[#0061a4] text-white font-bold text-sm hover:bg-[#00528c] transition-colors cursor-pointer shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </>
        )}
      </Modal>

      <Modal
        isOpen={modalCerrarForm && !!turnoSeleccionado}
        onClose={closeCerrarFormModal}
        title="Cerrar Turno"
        maxWidthClass="max-w-lg"
      >
        {turnoSeleccionado && (
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
                <p className="text-sm font-bold text-slate-800 font-[family-name:var(--font-sans)]">
                  {turnoSeleccionado.paciente
                    ? `${turnoSeleccionado.paciente.nombre} ${turnoSeleccionado.paciente.apellido}`
                    : `Paciente DNI ${turnoSeleccionado.dni_paciente}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {turnoSeleccionado.doctor?.nombre || 'Sin doctor asignado'} &middot;{' '}
                  {formatHour(turnoSeleccionado.fecha_hora)} hs
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
                        className="p-2.5 text-red-400 hover:text-red-600 cursor-pointer"
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
                        className="p-2.5 text-red-400 hover:text-red-600 cursor-pointer"
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
                  onClick={closeCerrarFormModal}
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