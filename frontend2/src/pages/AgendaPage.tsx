import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { SelectorProfesional } from '../components/SelectorProfesional';
import { CustomSelect } from '../components/CustomSelect';
import { Doctor, SlotResponse, Paciente, TratamientoCatalogo, ObraSocial } from '../types';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Lock, 
  Unlock, 
  User, 
  Trash2,
  Clock,
  Briefcase,
  CheckCircle,
  XSquare,
  AlertTriangle,
  Search,
  UserPlus,
  Loader2
} from 'lucide-react';

// Helper to get days of the week (Mon to Sat)
const getWeekDays = (dateStr: string) => {
  const [yr, mn, dy] = dateStr.split('-').map(Number);
  const current = new Date(Date.UTC(yr, mn - 1, dy));
  const day = current.getUTCDay(); // 0 is Sunday, 1..6 is Mon..Sat
  
  // Monday is first day
  const diff = current.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(yr, mn - 1, diff));
  
  const days = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
    const yrStr = d.getUTCFullYear();
    const mnStr = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dyStr = String(d.getUTCDate()).padStart(2, '0');
    days.push(`${yrStr}-${mnStr}-${dyStr}`);
  }
  return days;
};

// Helper to get formatting for date range
const formatWeekRange = (days: string[]) => {
  if (days.length === 0) return '';
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' };
  const start = new Intl.DateTimeFormat('es-AR', options).format(new Date(days[0] + "T12:00:00"));
  const end = new Intl.DateTimeFormat('es-AR', options).format(new Date(days[days.length - 1] + "T12:00:00"));
  
  const capitalize = (str: string) => {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };
  return `${capitalize(start)} – ${capitalize(end)}`;
};

// Helper to format Month and Year
const formatMonthYear = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' };
  const str = new Intl.DateTimeFormat('es-AR', options).format(d);
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Helper to generate the full month days array (for a Monday-first calendar grid)
const getMonthGridDays = (dateStr: string) => {
  const [yr, mn, dy] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(yr, mn - 1, dy));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  let startDayOfWeek = firstDayOfMonth.getUTCDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday to 7
  
  const prevMonthDaysCount = startDayOfWeek - 1;
  const gridDays = [];
  
  // Padding previous month
  const prevMonthLastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let i = prevMonthDaysCount - 1; i >= 0; i--) {
    const prevDate = new Date(Date.UTC(year, month - 1, prevMonthLastDate - i));
    const yrStr = prevDate.getUTCFullYear();
    const mnStr = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
    const dyStr = String(prevDate.getUTCDate()).padStart(2, '0');
    gridDays.push({
      dateStr: `${yrStr}-${mnStr}-${dyStr}`,
      isCurrentMonth: false,
      dayNum: prevDate.getUTCDate()
    });
  }
  
  // Active month
  const currentMonthLastDate = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let i = 1; i <= currentMonthLastDate; i++) {
    const currDate = new Date(Date.UTC(year, month, i));
    const yrStr = currDate.getUTCFullYear();
    const mnStr = String(currDate.getUTCMonth() + 1).padStart(2, '0');
    const dyStr = String(currDate.getUTCDate()).padStart(2, '0');
    gridDays.push({
      dateStr: `${yrStr}-${mnStr}-${dyStr}`,
      isCurrentMonth: true,
      dayNum: i
    });
  }
  
  // Padding next month to multiple of 7
  const totalCells = gridDays.length <= 35 ? 35 : 42;
  const nextMonthDaysCount = totalCells - gridDays.length;
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    const nextDate = new Date(Date.UTC(year, month + 1, i));
    const yrStr = nextDate.getUTCFullYear();
    const mnStr = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const dyStr = String(nextDate.getUTCDate()).padStart(2, '0');
    gridDays.push({
      dateStr: `${yrStr}-${mnStr}-${dyStr}`,
      isCurrentMonth: false,
      dayNum: i
    });
  }
  
  return gridDays;
};

interface MergedSlot {
  horaInicio: string;
  horaFin: string;
  slotsCount: number;
  estado: string;
  paciente?: string;
  turno_id?: number;
  slot_bloqueado_id?: number;
  motivo?: string;
  originalSlots: SlotResponse[];
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function groupDoctorSlots(slots: SlotResponse[]): MergedSlot[] {
  if (!slots || slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.hora.localeCompare(b.hora));
  const merged: MergedSlot[] = [];

  let i = 0;
  while (i < sorted.length) {
    const curr = sorted[i];

    if (curr.estado === 'ocupado' && curr.turno_id != null) {
      let j = i + 1;
      while (
        j < sorted.length &&
        sorted[j].estado === 'ocupado' &&
        sorted[j].turno_id === curr.turno_id
      ) {
        j++;
      }
      const count = j - i;
      const startMins = timeToMinutes(curr.hora);
      const endMins = startMins + count * 30;

      merged.push({
        horaInicio: curr.hora,
        horaFin: minutesToTime(endMins),
        slotsCount: count,
        estado: curr.estado,
        paciente: curr.paciente,
        turno_id: curr.turno_id,
        motivo: curr.motivo,
        slot_bloqueado_id: curr.slot_bloqueado_id,
        originalSlots: sorted.slice(i, j)
      });
      i = j;
    } else {
      const startMins = timeToMinutes(curr.hora);
      const endMins = startMins + 30;

      merged.push({
        horaInicio: curr.hora,
        horaFin: minutesToTime(endMins),
        slotsCount: 1,
        estado: curr.estado,
        paciente: curr.paciente,
        turno_id: curr.turno_id,
        motivo: curr.motivo,
        slot_bloqueado_id: curr.slot_bloqueado_id,
        originalSlots: [curr]
      });
      i++;
    }
  }

  return merged;
}

export function AgendaPage() {
  const navigate = useNavigate();
  const [doctores, setDoctores] = useState<Doctor[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Current local browser date YYYY-MM-DD
    const d = new Date();
    const yr = d.getFullYear();
    const mn = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mn}-${dy}`;
  });
  const [slotsData, setSlotsData] = useState<{ [docId: number]: SlotResponse[] }>({});
  const [loading, setLoading] = useState(true);

  // View settings
  const [viewMode, setViewMode] = useState<'semana' | 'mes'>('mes');
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [clinicConfig, setClinicConfig] = useState<any>(null);
  const [docSchedules, setDocSchedules] = useState<{ [docId: number]: any }>({});
  const [docExceptions, setDocExceptions] = useState<{ [docId: number]: string[] }>({});

  const weekDays = getWeekDays(selectedDate);
  const monthDays = getMonthGridDays(selectedDate);

  const isDayClosed = (dateStr: string): boolean => {
    const docsToCheck = selectedDocs.length > 0 ? selectedDocs : doctores.map(d => d.id);
    if (docsToCheck.length === 0) return false;

    const [yr, mn, dy] = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(yr, mn - 1, dy));
    const dayOfWeek = d.getUTCDay(); // 0 is Sunday, 1..6 is Mon..Sat
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dayOfWeek];

    const defaultSchedule = {
      dias: {
        "lunes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
        "martes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
        "miercoles": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
        "jueves": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
        "viernes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
        "sabado": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
        "domingo": null
      }
    } as any;

    // Check if at least one selected doctor is working on this date
    let anyoneWorking = false;
    for (const docId of docsToCheck) {
      const sched = docSchedules[docId] || defaultSchedule;
      const config = sched.dias?.[dayName] || sched.dias?.[String(dayOfWeek)];
      const isLaborable = config ? !!(config.manana || config.mañana || config.tarde) : false;
      const isException = docExceptions[docId]?.includes(dateStr) || false;

      if (isLaborable && !isException) {
        anyoneWorking = true;
        break;
      }
    }

    return !anyoneWorking;
  };

  const getClosedDayTooltip = (dateStr: string): string | undefined => {
    if (!isDayClosed(dateStr)) return undefined;
    
    const docsToCheck = selectedDocs.length > 0 ? selectedDocs : doctores.map(d => d.id);
    if (docsToCheck.length === 1) {
      const doc = doctores.find(d => d.id === docsToCheck[0]);
      const docName = doc ? `${doc.nombre} ${doc.apellido}` : "El odontólogo";
      
      const [yr, mn, dy] = dateStr.split('-').map(Number);
      const d = new Date(Date.UTC(yr, mn - 1, dy));
      const dayOfWeek = d.getUTCDay();
      
      const isException = docExceptions[docsToCheck[0]]?.includes(dateStr);
      if (isException) {
        return `${docName} tiene este día marcado como no laborable o licencia.`;
      }
      const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      const dayName = dayNames[dayOfWeek];
      return `${docName} no atiende los días ${dayName}s.`;
    }
    
    return "Ningún odontólogo disponible o clínica cerrada en esta fecha.";
  };

  useEffect(() => {
    if (isDayClosed(selectedDate)) {
      let d = new Date(selectedDate + "T12:00:00");
      let attempts = 0;
      while (attempts < 7) {
        d.setDate(d.getDate() + 1);
        const nextDateStr = d.toISOString().split('T')[0];
        if (!isDayClosed(nextDateStr)) {
          setSelectedDate(nextDateStr);
          break;
        }
        attempts++;
      }
    }
  }, [selectedDate, clinicConfig, docSchedules, docExceptions, selectedDocs]);

  // New Appointment from slot
  const [isNewTurnoOpen, setIsNewTurnoOpen] = useState(false);
  const [selectedSlotHour, setSelectedSlotHour] = useState('');
  const [selectedSlotDocId, setSelectedSlotDocId] = useState<number | null>(null);

  const [dni, setDni] = useState('');
  const [pacienteEnc, setPacienteEnc] = useState<Paciente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Paciente[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [isNewPacienteOpen, setIsNewPacienteOpen] = useState(false);
  const [newPacForm, setNewPacForm] = useState({ dni: '', nombre: '', apellido: '', telefono: '', email: '', obra_social: '' });
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [catalogo, setCatalogo] = useState<TratamientoCatalogo[]>([]);

  // Debounced patient autocomplete search
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/pacientes/?buscar=${encodeURIComponent(query)}`);
        setSearchResults(Array.isArray(res) ? res : []);
        setHasSearched(true);
        setShowDropdown(true);
      } catch (err: any) {
        showToast('Error al buscar pacientes: ' + (err.message || 'Error de conexión'), 'error');
        setSearchResults([]);
        setHasSearched(false);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const [turnoForm, setTurnoForm] = useState({
    duracion_minutos: 30,
    motivo: ''
  });

  // Manual Block modal
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    hora: '09:00',
    id_doctor: '',
    motivo: 'Bloqueo Administrativo'
  });

  // Occupied Turno detail & Cancellation states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTurnoId, setSelectedTurnoId] = useState<number | null>(null);
  const [selectedTurnoDetails, setSelectedTurnoDetails] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Batch blocking interactive mode
  const [isBlockingModeActive, setIsBlockingModeActive] = useState(false);
  const [selectedSlotsToBlock, setSelectedSlotsToBlock] = useState<{ docId: number; hora: string }[]>([]);
  const [blockingMotivo, setBlockingMotivo] = useState('Bloqueo Administrativo');

  const handleBatchBlockSlots = async () => {
    if (selectedSlotsToBlock.length === 0) {
      showToast('No ha seleccionado ningún slot para bloquear.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        selectedSlotsToBlock.map(sel => 
          apiFetch('/api/turnos/slots/bloquear', {
            method: 'POST',
            body: JSON.stringify({
              fecha: selectedDate,
              hora: sel.hora,
              id_doctor: sel.docId,
              motivo: blockingMotivo || 'Bloqueo Administrativo'
            })
          })
        )
      );
      showToast(`${selectedSlotsToBlock.length} slots bloqueados correctamente.`, 'success');
      setSelectedSlotsToBlock([]);
      setIsBlockingModeActive(false);
      await loadSlots();
    } catch (err: any) {
      showToast('Error al bloquear algunos slots: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const { showToast } = useToast();

  // New UI states
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const [dayViewMode, setDayViewMode] = useState<'calendario' | 'lista'>('calendario');
  const [upcomingSlots, setUpcomingSlots] = useState<{ fecha: string; hora: string; docId: number; docNombre: string }[]>([]);
  const [monthSlotsData, setMonthSlotsData] = useState<{ [dateStr: string]: { total: number; libres: number } }>({});

  const getDoctorInitials = (nombre: string) => {
    const clean = nombre.replace(/^Dr\.\s+|Dra\.\s+/i, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
  };

  const formatUpcomingDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const handleUpcomingSlotClick = (fecha: string, hora: string, docId: number) => {
    setSelectedDate(fecha);
    handleSlotClick(hora, docId);
  };

  // Date Navigation for List View
  const handlePrevDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    let attempts = 0;
    while (attempts < 7) {
      d.setDate(d.getDate() - 1);
      const prevDateStr = d.toISOString().split('T')[0];
      if (!isDayClosed(prevDateStr)) {
        setSelectedDate(prevDateStr);
        break;
      }
      attempts++;
    }
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + "T12:00:00");
    let attempts = 0;
    while (attempts < 7) {
      d.setDate(d.getDate() + 1);
      const nextDateStr = d.toISOString().split('T')[0];
      if (!isDayClosed(nextDateStr)) {
        setSelectedDate(nextDateStr);
        break;
      }
      attempts++;
    }
  };

  // Helper to summarize slots for selected doctors on active day
  const getSelectedDaySlotsSummary = () => {
    const activeSlots: SlotResponse[] = [];
    filteredDoctorsToDisplay.forEach(doc => {
      const list = slotsData[doc.id] || [];
      activeSlots.push(...list);
    });
    const total = activeSlots.length;
    const libres = activeSlots.filter(s => s.estado === 'libre').length;
    return { total, libres, slots: activeSlots };
  };

  // Effect to load upcoming slots across working days for filtered doctor(s)
  useEffect(() => {
    if (doctores.length > 0) {
      const checkUpcoming = async () => {
        const docsToCheck = selectedDocs.length > 0 ? selectedDocs : doctores.map(d => d.id);
        const upcoming: { fecha: string; hora: string; docId: number; docNombre: string }[] = [];
        
        let checkDate = new Date();
        const datesToCheck: string[] = [];
        
        while (datesToCheck.length < 5 && datesToCheck.length < 15) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (!isDayClosed(dateStr)) {
            datesToCheck.push(dateStr);
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }

        try {
          const promises = datesToCheck.map(async dateStr => {
            const docPromises = docsToCheck.map(async docId => {
              try {
                const slots = await apiFetch(`/api/turnos/slots?fecha=${dateStr}&id_doctor=${docId}`);
                return { dateStr, docId, slots };
              } catch (e) {
                return { dateStr, docId, slots: [] };
              }
            });
            return Promise.all(docPromises);
          });

          const resultsOfLists = await Promise.all(promises);
          const results = resultsOfLists.flat();

          results.forEach(res => {
            const docObj = doctores.find(d => d.id === res.docId);
            if (!docObj) return;
            
            (res.slots || []).forEach((slot: any) => {
              if (slot.estado === 'libre') {
                upcoming.push({
                  fecha: res.dateStr,
                  hora: slot.hora,
                  docId: res.docId,
                  docNombre: docObj.nombre
                });
              }
            });
          });

          upcoming.sort((a, b) => {
            if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
            return a.hora.localeCompare(b.hora);
          });

          setUpcomingSlots(upcoming.slice(0, 3));
        } catch (e) {
          console.error("Error fetching upcoming slots", e);
        }
      };
      checkUpcoming();
    }
  }, [doctores, selectedDocs]);

  // Load monthly slots for the grid when in mes mode
  const loadMonthSlots = async () => {
    if (doctores.length === 0) return;
    const docsToCheck = selectedDocs.length > 0 ? selectedDocs : doctores.map(d => d.id);
    const gridDays = getMonthGridDays(selectedDate);
    
    if (gridDays.length === 0) {
      setMonthSlotsData({});
      return;
    }

    const fechaDesde = gridDays[0].dateStr;
    const fechaHasta = gridDays[gridDays.length - 1].dateStr;
    
    try {
      const res = await apiFetch(`/api/turnos/slots/bulk?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}&id_doctor=${docsToCheck.join(',')}`);
      setMonthSlotsData(res?.dias || res || {});
    } catch (e) {
      console.error("Error loading month slots data", e);
    }
  };

  const loadBaseData = async () => {
    try {
      const [docs, os, cat, config] = await Promise.all([
        apiFetch('/api/doctores'),
        apiFetch('/api/catalogo/obras-sociales'),
        apiFetch('/api/catalogo/tratamientos'),
        apiFetch('/api/config/horarios').catch(() => null)
      ]);
      const activeDocs = docs.filter((d: any) => d.activo);
      setDoctores(activeDocs);
      setObrasSociales(os);
      setCatalogo(cat);
      if (config) {
        setClinicConfig(config);
      }
      if (activeDocs.length > 0) {
        setBlockForm(prev => ({ ...prev, id_doctor: String(activeDocs[0].id) }));

        // Fetch schedules and exceptions for active doctors
        try {
          const schedPromises = activeDocs.map(async (doc: any) => {
            try {
              const sched = await apiFetch(`/api/doctores/${doc.id}/horarios`);
              const exc = await apiFetch(`/api/doctores/${doc.id}/dias-no-laborables`);
              return { docId: doc.id, sched, exc };
            } catch (e) {
              return { docId: doc.id, sched: null, exc: [] };
            }
          });
          const schedResults = await Promise.all(schedPromises);
          const schedMap: { [docId: number]: any } = {};
          const excMap: { [docId: number]: string[] } = {};
          schedResults.forEach(r => {
            if (r.sched) schedMap[r.docId] = r.sched;
            excMap[r.docId] = r.exc || [];
          });
          setDocSchedules(schedMap);
          setDocExceptions(excMap);
        } catch (err) {
          console.error("Error loading doctor schedules", err);
        }

        // Load selected doctors preference or default
        const storedDocsJson = localStorage.getItem('agenda-selected-doctors');
        let initialSelected: number[] = [];
        if (storedDocsJson) {
          try {
            initialSelected = JSON.parse(storedDocsJson);
          } catch (e) {}
        }
        initialSelected = initialSelected.filter(id => activeDocs.some((d: any) => d.id === id));
        if (initialSelected.length !== 1) {
          initialSelected = [activeDocs[0].id];
        }
        setSelectedDocs(initialSelected);
      }
    } catch (e: any) {
      showToast('Error cargando catálogo y odontólogos.', 'error');
    }
  };

  const loadSlots = async () => {
    if (doctores.length === 0) return;
    setLoading(true);
    try {
      const slotsPromises = doctores.map(async doc => {
        try {
          const slots = await apiFetch(`/api/turnos/slots?fecha=${selectedDate}&id_doctor=${doc.id}`);
          return { docId: doc.id, slots };
        } catch (e) {
          console.error(`Error fetching slots for doctor ${doc.id}:`, e);
          return { docId: doc.id, slots: [] };
        }
      });
      const results = await Promise.all(slotsPromises);
      const dataMap: { [docId: number]: SlotResponse[] } = {};
      results.forEach(r => {
        dataMap[r.docId] = r.slots;
      });
      setSlotsData(dataMap);

      if (viewMode === 'mes') {
        await loadMonthSlots();
      }
    } catch (err: any) {
      showToast('Error cargando slots de agenda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (doctores.length > 0) {
      loadSlots();
    }
    setSelectedSlotsToBlock([]);
    setIsBlockingModeActive(false);
  }, [doctores, selectedDate, selectedDocs, viewMode]);

  // View Range Navigation
  const handlePrevRange = () => {
    const d = new Date(selectedDate + "T12:00:00");
    if (viewMode === 'semana') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextRange = () => {
    const d = new Date(selectedDate + "T12:00:00");
    if (viewMode === 'semana') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Block manual slot
  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.id_doctor || !blockForm.hora) {
      showToast('Odontólogo y hora son obligatorios.', 'warning');
      return;
    }
    try {
      await apiFetch('/api/turnos/slots/bloquear', {
        method: 'POST',
        body: JSON.stringify({
          fecha: selectedDate,
          hora: blockForm.hora,
          id_doctor: Number(blockForm.id_doctor),
          motivo: blockForm.motivo
        })
      });
      showToast('Slot bloqueado correctamente.', 'success');
      setIsBlockOpen(false);
      setBlockForm(prev => ({ ...prev, motivo: 'Bloqueo Administrativo' }));
      loadSlots();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Unblock slot
  const handleUnblockSlot = async (slotBloqueadoId: number) => {
    if (window.confirm('¿Está seguro que desea desbloquear este slot de agenda?')) {
      try {
        await apiFetch(`/api/turnos/slots/${slotBloqueadoId}/desbloquear`, { method: 'DELETE' });
        showToast('Slot liberado.', 'success');
        loadSlots();
      } catch (err: any) {
        showToast(err.message, 'error');
      }
    }
  };

  const handleOpenNewPacienteModal = () => {
    setNewPacForm({ dni: '', nombre: '', apellido: '', telefono: '', email: '', obra_social: '' });
    setShowDropdown(false);
    setIsNewPacienteOpen(true);
  };

  // Create patient fast
  const handleCreatePaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPacForm.nombre || !newPacForm.apellido) {
      showToast('Nombre y apellido requeridos.', 'warning');
      return;
    }
    try {
      const created = await apiFetch('/api/pacientes', {
        method: 'POST',
        body: JSON.stringify(newPacForm)
      });
      setPacienteEnc(created);
      setIsNewPacienteOpen(false);
      setNewPacForm({ dni: '', nombre: '', apellido: '', telefono: '', email: '', obra_social: '' });
      showToast('Paciente registrado correctamente.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Click on Free Slot
  const handleSlotClick = (hour: string, docId: number) => {
    setSelectedSlotHour(hour);
    setSelectedSlotDocId(docId);
    setDni('');
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setShowDropdown(false);
    setPacienteEnc(null);
    setTurnoForm({ duracion_minutos: 30, motivo: '' });
    setIsNewTurnoOpen(true);
  };

  // Confirm slot schedule
  const handleConfirmTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteEnc) {
      showToast('Debe ingresar un paciente.', 'warning');
      return;
    }
    if (!selectedSlotDocId || !selectedSlotHour) return;

    const fullIso = `${selectedDate}T${selectedSlotHour}:00`;
    try {
      await apiFetch('/api/turnos', {
        method: 'POST',
        body: JSON.stringify({
          fecha_hora: fullIso,
          duracion_minutos: Number(turnoForm.duracion_minutos) || 30,
          motivo: turnoForm.motivo,
          dni_paciente: pacienteEnc.dni,
          id_doctor: selectedSlotDocId
        })
      });
      showToast('Turno agendado.', 'success');
      setIsNewTurnoOpen(false);
      loadSlots();
    } catch (err: any) {
      showToast(err.message || 'Error al agendar el turno.', 'error');
    }
  };

  const handleOccupiedSlotClick = async (turnoId: number, docId: number, hora: string) => {
    setSelectedTurnoId(turnoId);
    setDetailLoading(true);
    setIsDetailOpen(true);
    setSelectedTurnoDetails(null);
    try {
      const details = await apiFetch(`/api/turnos/${turnoId}`);
      setSelectedTurnoDetails(details);
    } catch (err: any) {
      showToast('Error al obtener los detalles del turno: ' + err.message, 'error');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelTurnoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurnoId) return;
    if (!motivoCancelacion.trim()) {
      showToast('Debe ingresar un motivo de cancelación obligatorio.', 'warning');
      return;
    }
    
    try {
      await apiFetch(`/api/turnos/${selectedTurnoId}/cancelar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motivo_cancelacion: motivoCancelacion })
      });
      showToast('Turno cancelado correctamente', 'success');
      setIsCancelling(false);
      setIsDetailOpen(false);
      setMotivoCancelacion('');
      await loadSlots(); // Refresh slot list immediately to liberate the slot!
    } catch (err: any) {
      showToast('Error al cancelar el turno: ' + err.message, 'error');
    }
  };

  // Dynamic filter lists
  const filteredDoctorsToDisplay = doctores.filter(d => selectedDocs.includes(d.id));

  // Create morning/afternoon split slots list for list view with merged multi-slot turnos
  type MergedListSlot = {
    horaInicio: string;
    horaFin: string;
    duracionMinutos: number;
    slotsCount: number;
    estado: string;
    docId: number;
    docNombre: string;
    paciente?: string;
    slot_bloqueado_id?: number;
    motivo?: string;
    turno_id?: number;
  };

  const listSlotsToRender: MergedListSlot[] = [];
  filteredDoctorsToDisplay.forEach(doc => {
    const list = slotsData[doc.id] || [];
    const mergedList = groupDoctorSlots(list);
    mergedList.forEach(m => {
      listSlotsToRender.push({
        horaInicio: m.horaInicio,
        horaFin: m.horaFin,
        duracionMinutos: m.slotsCount * 30,
        slotsCount: m.slotsCount,
        estado: m.estado,
        docId: doc.id,
        docNombre: doc.nombre,
        paciente: m.paciente,
        slot_bloqueado_id: m.slot_bloqueado_id,
        motivo: m.motivo,
        turno_id: m.turno_id
      });
    });
  });
  listSlotsToRender.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const morningSlots = listSlotsToRender.filter(s => s.horaInicio < '13:00');
  const afternoonSlots = listSlotsToRender.filter(s => s.horaInicio >= '13:00');

  const getSelectedDoctorDisplay = () => {
    if (selectedDocs.length === 1) {
      const doc = doctores.find(d => d.id === selectedDocs[0]);
      if (doc) {
        return {
          nombre: doc.nombre,
          initials: getDoctorInitials(doc.nombre),
          color: doc.color_agenda
        };
      }
    }
    return {
      nombre: "Todos los profesionales",
      initials: "TD",
      color: "#1D9E75"
    };
  };

  const selectedDisplay = getSelectedDoctorDisplay();

  return (
    <div className="space-y-6">
      {/* 1. Top row: Doctor Selector Dropdown (Left) & Toggle / CTA (Right) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Doctor Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDocDropdownOpen(prev => !prev)}
            className="flex items-center gap-3 bg-white border border-neutral-warm-100 rounded-2xl px-4 py-2.5 shadow-xs hover:bg-neutral-warm-50 transition-all cursor-pointer min-w-[240px]"
          >
            {/* Initials Avatar */}
            <span
              className="w-10 h-10 rounded-full text-white font-extrabold flex items-center justify-center text-sm shadow-2xs shrink-0"
              style={{ backgroundColor: selectedDisplay.color }}
            >
              {selectedDisplay.initials}
            </span>
            {/* Text Info */}
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-xs font-extrabold text-neutral-warm-900 truncate">
                {selectedDisplay.nombre}
              </h4>
            </div>
            {/* Chevron icon */}
            <ChevronLeft size={16} className={`text-neutral-warm-500 transition-transform duration-200 transform ${isDocDropdownOpen ? '-rotate-90' : 'rotate-180'}`} />
          </button>

          {isDocDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDocDropdownOpen(false)} />
              <div className="absolute left-0 mt-2 w-72 bg-white border border-neutral-warm-100 rounded-2xl shadow-lg py-2 z-50 divide-y divide-neutral-warm-50">
                <div className="py-1">
                  {/* Individual Doctors */}
                  {doctores.map(doc => {
                    const isSelected = selectedDocs.length === 1 && selectedDocs[0] === doc.id;
                    const initials = getDoctorInitials(doc.nombre);
                    
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocs([doc.id]);
                          localStorage.setItem('agenda-selected-doctors', JSON.stringify([doc.id]));
                          setIsDocDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-warm-50/50 transition-colors text-left cursor-pointer"
                      >
                        <span
                          className="w-8 h-8 rounded-full text-white font-extrabold flex items-center justify-center text-xs shadow-2xs"
                          style={{ backgroundColor: doc.color_agenda }}
                        >
                          {initials}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-extrabold text-neutral-warm-900 truncate">{doc.nombre}</h5>
                        </div>
                        {isSelected && (
                          <span className="text-brand-400 font-bold text-xs font-sans">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocDropdownOpen(false);
                      navigate('/doctores');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-warm-600 hover:text-neutral-warm-900 hover:bg-neutral-warm-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Briefcase size={14} className="text-neutral-warm-500" />
                    <span>Configurar horarios</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Toggle Calendario / Lista & CTA */}
        <div className="flex items-center gap-3">
          {/* Day View Mode Selector (Calendario / Lista) */}
          <div className="bg-neutral-warm-100/40 p-1 rounded-xl flex items-center space-x-1 border border-neutral-warm-100 shadow-xs">
            <button
              onClick={() => setDayViewMode('calendario')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dayViewMode === 'calendario'
                  ? 'bg-white text-[#085041] shadow-xs'
                  : 'text-neutral-warm-600 hover:text-neutral-warm-900'
              }`}
            >
              Calendario
            </button>
            <button
              onClick={() => setDayViewMode('lista')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dayViewMode === 'lista'
                  ? 'bg-white text-[#085041] shadow-xs'
                  : 'text-neutral-warm-600 hover:text-neutral-warm-900'
              }`}
            >
              Lista
            </button>
          </div>

          {/* New Turno button */}
          <button
            onClick={() => {
              const activeDocId = selectedDocs[0] || (doctores.length > 0 ? doctores[0].id : null);
              if (activeDocId) {
                const slots = slotsData[activeDocId] || [];
                const freeSlot = slots.find(s => s.estado === 'libre');
                const hour = freeSlot ? freeSlot.hora : '09:00';
                handleSlotClick(hour, activeDocId);
              } else {
                showToast("Por favor seleccione un profesional.", "warning");
              }
            }}
            className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:shadow-md transform hover:-translate-y-0.5"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Nuevo Turno</span>
          </button>
        </div>
      </div>

      {/* 2. Próximos disponibles shortcuts */}
      {upcomingSlots.length > 0 && (
        <div className="bg-[#EAF3DE]/30 border border-brand-100/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#1D9E75]" />
            <span className="text-xs font-extrabold text-[#085041] uppercase tracking-wider">
              PRÓXIMOS DISPONIBLES
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {upcomingSlots.map((slot, index) => (
              <div
                key={index}
                className="bg-white border border-neutral-warm-100/60 hover:border-brand-400/40 rounded-xl p-2 flex items-center gap-3 transition-all text-xs"
              >
                <span className="font-semibold text-neutral-warm-800">
                  {formatUpcomingDate(slot.fecha)} <span className="font-mono font-bold text-neutral-warm-950">{slot.hora} hs</span>
                </span>
                <button
                  onClick={() => handleUpcomingSlotClick(slot.fecha, slot.hora, slot.docId)}
                  className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Reservar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CORE VIEWS SWITCH */}
      {dayViewMode === 'calendario' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Calendars (Week/Month) */}
          <div className="xl:col-span-7 space-y-4">
            {/* Navigation & view switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 flex-wrap">
                <div className="flex items-center space-x-1 bg-white border border-neutral-warm-100 rounded-xl p-1 shadow-xs">
                  <button
                    onClick={handlePrevRange}
                    className="p-1.5 rounded-lg hover:bg-neutral-warm-50 text-neutral-warm-900 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={handleNextRange}
                    className="p-1.5 rounded-lg hover:bg-neutral-warm-50 text-neutral-warm-900 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <span className="text-sm font-bold text-neutral-warm-900 tracking-tight font-sans block first-letter:uppercase">
                  {formatMonthYear(selectedDate)}
                </span>

                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-xl bg-white border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 transition-all cursor-pointer shadow-xs"
                >
                  Hoy
                </button>
              </div>
            </div>

            {/* Core month display */}
            <div className="bg-white border border-neutral-warm-100 rounded-[24px] shadow-xs p-4 space-y-3">
              {/* Day of week headers */}
              <div className="grid grid-cols-7 text-center text-[9px] font-semibold tracking-wider text-neutral-warm-500 uppercase">
                <div>LUN</div>
                <div>MAR</div>
                <div>MIÉ</div>
                <div>JUE</div>
                <div>VIE</div>
                <div>SÁB</div>
                <div>DOM</div>
              </div>
              
              {/* Monthly grid cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {monthDays.map(({ dateStr, isCurrentMonth, dayNum }) => {
                  const isSelected = selectedDate === dateStr;
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  const closed = isDayClosed(dateStr);
                  const tooltip = getClosedDayTooltip(dateStr);
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isFutureOrToday = dateStr >= todayStr;
                  
                  // Month slots metrics
                  const mData = monthSlotsData[dateStr];
                  const total = mData?.total || 0;
                  const libres = mData?.libres || 0;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        if (!closed) setSelectedDate(dateStr);
                      }}
                      disabled={closed}
                      title={tooltip}
                      className={`min-h-[72px] p-2 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                        closed
                          ? 'bg-neutral-warm-100/10 border-neutral-warm-50 text-neutral-warm-400 opacity-40 cursor-not-allowed pointer-events-auto'
                          : isSelected
                          ? 'bg-[#1D9E75] border-[#1D9E75] text-white shadow-xs cursor-pointer'
                          : isCurrentMonth
                          ? 'bg-neutral-warm-50/20 border-neutral-warm-100/60 hover:bg-neutral-warm-50/70 hover:border-neutral-warm-200 text-neutral-warm-900 cursor-pointer'
                          : 'bg-neutral-warm-50/10 border-neutral-warm-50 text-neutral-warm-600/55 opacity-40 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold">{dayNum}</span>
                        {isToday && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected && !closed ? 'bg-white' : 'bg-[#1D9E75]'}`} />
                        )}
                      </div>

                      {isFutureOrToday && !closed && mData && total > 0 && libres > 0 && (
                        <div className="w-full mt-1.5">
                          <div className={`text-[10px] font-bold px-1 py-0.5 rounded text-center truncate ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-[#EAF3DE] text-[#3B6D11] border border-[#3B6D11]/10'
                          }`}>
                            {libres} lib.
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Daily Slots Detailed Side-panel */}
          <div className="xl:col-span-5 bg-white border border-neutral-warm-100 rounded-[24px] p-5 shadow-xs space-y-4">
            {/* Day Header details */}
            <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-4">
              <div>
                <h4 className="text-sm font-bold text-neutral-warm-900 sentence-case">
                  {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(selectedDate + "T12:00:00"))}
                </h4>
                <span className="text-[11px] font-bold text-[#1D9E75] capitalize block">
                  {new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(selectedDate + "T12:00:00"))}
                </span>
              </div>
              
              {/* Disponibles summary */}
              {(() => {
                const sum = getSelectedDaySlotsSummary();
                return (
                  <span className="bg-[#EAF3DE] text-[#3B6D11] border border-[#3B6D11]/10 px-2.5 py-1 rounded-full text-[10px] font-extrabold">
                    {sum.libres} libres
                  </span>
                );
              })()}
            </div>

            {/* Doctor Slots list */}
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-neutral-warm-600 gap-2 text-xs">
                <svg className="animate-spin h-5 w-5 text-[#1D9E75]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sincronizando...</span>
              </div>
            ) : filteredDoctorsToDisplay.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-warm-600 italic">
                Seleccione profesionales para ver.
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {/* Batch Blocking Banner inside panel */}
                {isBlockingModeActive && (
                  <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl space-y-2">
                    <span className="text-[9px] font-bold text-red-800 uppercase tracking-wider block">Bloqueo por lotes</span>
                    <input
                      type="text"
                      value={blockingMotivo}
                      onChange={e => setBlockingMotivo(e.target.value)}
                      placeholder="Motivo del bloqueo"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleBatchBlockSlots}
                        disabled={selectedSlotsToBlock.length === 0}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          selectedSlotsToBlock.length > 0
                            ? 'bg-[#A32D2D] hover:bg-[#822121] text-white'
                            : 'bg-neutral-warm-100 text-neutral-warm-400 cursor-not-allowed'
                        }`}
                      >
                        <Lock size={12} />
                        <span>Confirmar ({selectedSlotsToBlock.length})</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsBlockingModeActive(false);
                          setSelectedSlotsToBlock([]);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-neutral-warm-200 text-neutral-warm-600 hover:bg-neutral-warm-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Normal CTA if blocking mode not active */}
                {!isBlockingModeActive && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setIsBlockingModeActive(true);
                        setSelectedSlotsToBlock([]);
                      }}
                      className="text-neutral-warm-700 hover:text-neutral-warm-900 font-bold text-[10px] flex items-center gap-1.5"
                    >
                      <Lock size={12} />
                      <span>Bloquear Horas</span>
                    </button>
                  </div>
                )}

                {filteredDoctorsToDisplay.map(doc => {
                  const rawSlots = slotsData[doc.id] || [];
                  const mergedSlots = groupDoctorSlots(rawSlots);
                  
                  return (
                    <div key={doc.id} className="space-y-2 border border-neutral-warm-100/40 rounded-xl p-3 bg-neutral-warm-50/10">
                      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-warm-50">
                        <span className="text-[11px] font-extrabold text-neutral-warm-900">{doc.nombre}</span>
                        <span className="text-[9px] text-neutral-warm-600 bg-neutral-warm-100/80 px-1.5 py-0.5 rounded font-mono font-bold">
                          {rawSlots.filter(s => s.estado === 'libre').length} libres
                        </span>
                      </div>

                      {rawSlots.length === 0 ? (
                        <div className="py-4 text-center text-[10px] text-neutral-warm-500 italic">Clínica cerrada</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5">
                          {mergedSlots.map(s => {
                            const isFree = s.estado === 'libre';
                            const isOccupied = s.estado === 'ocupado';
                            const isBlocked = s.estado === 'bloqueado';
                            const isSelectedForBlock = isBlockingModeActive && isFree && selectedSlotsToBlock.some(sel => sel.docId === doc.id && sel.hora === s.horaInicio);

                            return (
                              <div
                                key={s.horaInicio}
                                className={`rounded-lg border text-[11px] flex items-center justify-between transition-all p-2.5 ${
                                  isSelectedForBlock ? 'bg-red-50/75 border-[#A32D2D] text-[#A32D2D]' :
                                  isFree ? 'bg-white border-neutral-warm-100 hover:border-[#1D9E75]/40 hover:bg-[#1D9E75]/5 cursor-pointer' :
                                  isOccupied ? 'bg-[#EAF3DE] border-[#3B6D11]/20 text-[#3B6D11] hover:border-[#3B6D11]/40 cursor-pointer shadow-3xs' :
                                  'bg-neutral-warm-100/40 border-neutral-warm-200 text-neutral-warm-500 line-through'
                                } ${isOccupied && s.slotsCount > 1 ? 'py-3.5 border-l-4 border-l-[#3B6D11]' : ''}`}
                                onClick={() => {
                                  if (isBlockingModeActive) {
                                    if (isFree) {
                                      setSelectedSlotsToBlock(prev => {
                                        const exists = prev.some(sel => sel.docId === doc.id && sel.hora === s.horaInicio);
                                        if (exists) {
                                          return prev.filter(sel => !(sel.docId === doc.id && sel.hora === s.horaInicio));
                                        } else {
                                          return [...prev, { docId: doc.id, hora: s.horaInicio }];
                                        }
                                      });
                                    }
                                  } else {
                                    if (isFree) {
                                      handleSlotClick(s.horaInicio, doc.id);
                                    } else if (isOccupied && s.turno_id) {
                                      handleOccupiedSlotClick(s.turno_id, doc.id, s.horaInicio);
                                    }
                                  }
                                }}
                              >
                                <div className="flex items-center space-x-2 min-w-0">
                                  <Clock size={11} className={isOccupied ? "text-[#3B6D11]" : "text-neutral-warm-600"} />
                                  <span className="font-mono font-bold tracking-tight">
                                    {isOccupied && s.slotsCount > 1 ? `${s.horaInicio} - ${s.horaFin}` : `${s.horaInicio} hs`}
                                  </span>
                                  <div className="truncate max-w-[140px] text-[10px] font-semibold opacity-95 flex items-center gap-1.5">
                                    {isOccupied && (
                                      <>
                                        <span className="truncate">{s.paciente}</span>
                                        {s.slotsCount > 1 && (
                                          <span className="bg-[#3B6D11]/15 text-[#085041] px-1 py-0.2 rounded text-[9px] font-bold font-mono shrink-0">
                                            {s.slotsCount * 30}m
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {isBlocked && 'Bloqueado'}
                                    {isFree && <span className="text-neutral-warm-600 font-normal italic">Libre</span>}
                                  </div>
                                </div>

                                {isBlocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (s.slot_bloqueado_id) handleUnblockSlot(s.slot_bloqueado_id);
                                    }}
                                    className="text-[#A32D2D] hover:bg-red-50 p-0.5 rounded cursor-pointer"
                                  >
                                    <Unlock size={11} />
                                  </button>
                                )}
                                {isFree && !isBlockingModeActive && (
                                  <Plus size={11} className="text-neutral-warm-600 opacity-60" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 4. LIST VIEW (Image 3 design) */
        <div className="bg-white border border-neutral-warm-100 rounded-[24px] p-6 shadow-xs space-y-6 animate-fade-in">
          {/* Day Navigation */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl hover:bg-neutral-warm-50 text-neutral-warm-900 border border-neutral-warm-100 shadow-3xs cursor-pointer transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <span className="text-xs font-extrabold text-[#1D9E75] uppercase tracking-wider block">
                {new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(selectedDate + "T12:00:00"))}
              </span>
              <h3 className="text-clamp-title-lg font-bold text-neutral-warm-900 sentence-case leading-tight">
                {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(selectedDate + "T12:00:00"))}
              </h3>
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl hover:bg-neutral-warm-50 text-neutral-warm-900 border border-neutral-warm-100 shadow-3xs cursor-pointer transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Availability Count */}
          <div className="text-center">
            {(() => {
              const sum = getSelectedDaySlotsSummary();
              return (
                <span className="text-sm font-semibold text-neutral-warm-600 block">
                  <span className="text-neutral-warm-900 font-extrabold font-sans text-base">{sum.libres}</span> disponibles
                </span>
              );
            })()}
          </div>

          {/* Morning / Afternoon split columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. MAÑANA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#1D9E75] font-extrabold text-sm">✦</span>
                  <h4 className="text-xs font-extrabold text-neutral-warm-900 uppercase tracking-wider">MAÑANA</h4>
                </div>
                <span className="text-[10px] text-neutral-warm-500 font-bold">
                  {morningSlots.length} turnos
                </span>
              </div>

              <div className="space-y-2.5">
                {morningSlots.length === 0 ? (
                  <p className="text-xs text-neutral-warm-500 italic text-center py-6">No hay turnos en la mañana</p>
                ) : (
                  morningSlots.map((s, index) => {
                    const isFree = s.estado === 'libre';
                    const isOccupied = s.estado === 'ocupado';
                    const isBlocked = s.estado === 'bloqueado';
                    
                    return (
                      <div
                        key={index}
                        className={`border rounded-xl p-3.5 bg-white transition-all flex items-center justify-between shadow-3xs ${
                          isFree 
                            ? 'border-l-4 border-l-[#1D9E75] border-neutral-warm-100' 
                            : isOccupied
                            ? 'border-l-4 border-l-blue-500 border-neutral-warm-100'
                            : 'border-l-4 border-l-neutral-400 border-neutral-warm-100'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="text-left">
                            <span className="text-base font-extrabold font-mono text-neutral-warm-900 block leading-tight">
                              {s.slotsCount > 1 ? `${s.horaInicio} - ${s.horaFin}` : s.horaInicio}
                            </span>
                            <span className="text-[10px] text-neutral-warm-500 block">{s.duracionMinutos} min</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isFree ? 'bg-[#1D9E75]' : isOccupied ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                            <span className="text-[11px] font-bold text-neutral-warm-700 truncate max-w-[150px]">
                              {isFree && 'Disponible'}
                              {isOccupied && `Ocupado · ${s.paciente}`}
                              {isBlocked && `Bloqueado`}
                            </span>
                            {selectedDocs.length > 1 && (
                              <span className="text-[10px] font-bold bg-neutral-warm-50 text-neutral-warm-600 px-1.5 py-0.5 rounded border border-neutral-warm-100 max-w-[100px] truncate">
                                {s.docNombre}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isFree ? (
                            <button
                              onClick={() => handleSlotClick(s.horaInicio, s.docId)}
                              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                            >
                              Reservar
                            </button>
                          ) : isBlocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (s.slot_bloqueado_id) handleUnblockSlot(s.slot_bloqueado_id);
                              }}
                              className="text-[#A32D2D] hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-red-100 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Unlock size={11} />
                              Liberar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (s.turno_id) handleOccupiedSlotClick(s.turno_id, s.docId, s.horaInicio);
                              }}
                              className="bg-neutral-warm-100 hover:bg-neutral-warm-200 text-neutral-warm-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Ver detalle
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. TARDE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#1D9E75] font-extrabold text-sm">🌙</span>
                  <h4 className="text-xs font-extrabold text-neutral-warm-900 uppercase tracking-wider">TARDE</h4>
                </div>
                <span className="text-[10px] text-neutral-warm-500 font-bold">
                  {afternoonSlots.length} turnos
                </span>
              </div>

              <div className="space-y-2.5">
                {afternoonSlots.length === 0 ? (
                  <p className="text-xs text-neutral-warm-500 italic text-center py-6">No hay turnos en la tarde</p>
                ) : (
                  afternoonSlots.map((s, index) => {
                    const isFree = s.estado === 'libre';
                    const isOccupied = s.estado === 'ocupado';
                    const isBlocked = s.estado === 'bloqueado';
                    
                    return (
                      <div
                        key={index}
                        className={`border rounded-xl p-3.5 bg-white transition-all flex items-center justify-between shadow-3xs ${
                          isFree 
                            ? 'border-l-4 border-l-[#1D9E75] border-neutral-warm-100' 
                            : isOccupied
                            ? 'border-l-4 border-l-blue-500 border-neutral-warm-100'
                            : 'border-l-4 border-l-neutral-400 border-neutral-warm-100'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="text-left">
                            <span className="text-base font-extrabold font-mono text-neutral-warm-900 block leading-tight">
                              {s.slotsCount > 1 ? `${s.horaInicio} - ${s.horaFin}` : s.horaInicio}
                            </span>
                            <span className="text-[10px] text-neutral-warm-500 block">{s.duracionMinutos} min</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isFree ? 'bg-[#1D9E75]' : isOccupied ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                            <span className="text-[11px] font-bold text-neutral-warm-700 truncate max-w-[150px]">
                              {isFree && 'Disponible'}
                              {isOccupied && `Ocupado · ${s.paciente}`}
                              {isBlocked && `Bloqueado`}
                            </span>
                            {selectedDocs.length > 1 && (
                              <span className="text-[10px] font-bold bg-neutral-warm-50 text-neutral-warm-600 px-1.5 py-0.5 rounded border border-neutral-warm-100 max-w-[100px] truncate">
                                {s.docNombre}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          {isFree ? (
                            <button
                              onClick={() => handleSlotClick(s.horaInicio, s.docId)}
                              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                            >
                              Reservar
                            </button>
                          ) : isBlocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (s.slot_bloqueado_id) handleUnblockSlot(s.slot_bloqueado_id);
                              }}
                              className="text-[#A32D2D] hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-red-100 flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Unlock size={11} />
                              Liberar
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (s.turno_id) handleOccupiedSlotClick(s.turno_id, s.docId, s.horaInicio);
                              }}
                              className="bg-neutral-warm-100 hover:bg-neutral-warm-200 text-neutral-warm-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                            >
                              Ver detalle
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: SCHEDULE TURN FROM SLOT --- */}
      <Modal isOpen={isNewTurnoOpen} onClose={() => setIsNewTurnoOpen(false)} title={`Agendar Turno para las ${selectedSlotHour} hs`}>
        <form onSubmit={handleConfirmTurno} className="space-y-4">
          
          {/* Patient Finder Autocomplete */}
          <div className="bg-[#F1EFE8] p-4 rounded-xl border border-neutral-warm-100 space-y-3">
            <h4 className="text-xs font-bold text-neutral-warm-900 sentence-case">Buscar Paciente</h4>
            
            {pacienteEnc ? (
              <div className="text-xs text-brand-800 bg-[#E1F5EE] px-3 py-2.5 rounded-lg border border-brand-100 flex items-center justify-between shadow-3xs">
                <div>
                  <div className="font-bold text-sm text-[#0F6E56]">{pacienteEnc.apellido}, {pacienteEnc.nombre}</div>
                  <div className="text-[11px] text-neutral-warm-700 font-mono mt-0.5">
                    DNI: {pacienteEnc.dni} {pacienteEnc.obra_social ? `· ${pacienteEnc.obra_social}` : '· Particular'}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setPacienteEnc(null);
                    setSearchQuery('');
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  className="text-red-700 hover:text-red-900 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) {
                        setShowDropdown(true);
                      }
                    }}
                    placeholder="Buscar por nombre, apellido o DNI..."
                    className="w-full text-xs pl-8 pr-8 py-2.5 rounded-lg border border-neutral-warm-200 bg-white text-neutral-warm-900 placeholder:text-neutral-warm-400 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]"
                  />
                  <Search size={14} className="absolute left-2.5 top-3 text-neutral-warm-400 pointer-events-none" />
                  {isSearching && (
                    <Loader2 size={14} className="absolute right-2.5 top-3 text-[#1D9E75] animate-spin" />
                  )}
                </div>

                {/* Dropdown Menu */}
                {showDropdown && searchQuery.trim().length >= 2 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-neutral-warm-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1 text-xs">
                    {isSearching && searchResults.length === 0 && (
                      <div className="px-3 py-2 text-neutral-warm-500 italic flex items-center gap-2">
                        <Loader2 size={12} className="animate-spin" />
                        Buscando coincidencias...
                      </div>
                    )}

                    {!isSearching && hasSearched && searchResults.length === 0 && (
                      <div className="p-3 text-center space-y-2">
                        <p className="text-neutral-warm-600 font-medium">No se encontraron pacientes que coincidan con "{searchQuery}"</p>
                        <button
                          type="button"
                          onClick={handleOpenNewPacienteModal}
                          className="inline-flex items-center gap-1.5 bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer"
                        >
                          <UserPlus size={13} />
                          Registrar paciente nuevo
                        </button>
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-warm-400 bg-neutral-warm-50 border-b border-neutral-warm-100 flex items-center justify-between">
                          <span>Pacientes encontrados ({searchResults.length})</span>
                        </div>
                        {searchResults.map(p => (
                          <div
                            key={p.id || p.dni}
                            onClick={() => {
                              setPacienteEnc(p);
                              setShowDropdown(false);
                              setSearchQuery('');
                            }}
                            className="px-3 py-2 hover:bg-[#1D9E75]/10 cursor-pointer border-b border-neutral-warm-100/60 last:border-b-0 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-neutral-warm-900 block">{p.apellido}, {p.nombre}</span>
                              <span className="text-[10px] text-neutral-warm-500 font-mono">DNI: {p.dni} {p.obra_social ? `· ${p.obra_social}` : ''}</span>
                            </div>
                            <span className="text-[10px] text-[#1D9E75] font-bold bg-[#1D9E75]/10 px-2 py-0.5 rounded">
                              Seleccionar
                            </span>
                          </div>
                        ))}
                        
                        <div className="p-2 bg-neutral-warm-50/80 border-t border-neutral-warm-100 text-center">
                          <button
                            type="button"
                            onClick={handleOpenNewPacienteModal}
                            className="text-[11px] text-[#1D9E75] hover:underline font-bold flex items-center justify-center gap-1 w-full py-1"
                          >
                            <UserPlus size={12} />
                            ¿No está en la lista? Registrar paciente nuevo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!pacienteEnc && searchQuery.trim().length < 2 && (
                  <div className="text-[10px] text-neutral-warm-600 italic mt-1.5">
                    Escriba al menos 2 caracteres para buscar por nombre, apellido o DNI.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Turno fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Odontólogo Designado
              </label>
              <div className="text-xs font-bold text-neutral-warm-900 bg-neutral-warm-50 border border-neutral-warm-100 p-2.5 rounded-lg">
                {doctores.find(d => d.id === selectedSlotDocId)?.nombre || 'Profesional'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Fecha de la Cita
              </label>
              <div className="text-xs font-bold text-neutral-warm-900 bg-neutral-warm-50 border border-neutral-warm-100 p-2.5 rounded-lg">
                {selectedDate}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Duración del Turno
              </label>
              <CustomSelect
                value={turnoForm.duracion_minutos}
                onChange={val => setTurnoForm(p => ({ ...p, duracion_minutos: Number(val) }))}
                options={[
                  { value: 30, label: '30 minutos' },
                  { value: 60, label: '60 minutos' },
                  { value: 90, label: '90 minutos' }
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Motivo / Notas clínicas
              </label>
              <input
                type="text"
                value={turnoForm.motivo}
                onChange={e => setTurnoForm(p => ({ ...p, motivo: e.target.value }))}
                placeholder="Ej: Caries, Consulta, etc."
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewTurnoOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              Reservar Cita
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 1B: EXPRESS PACIENTE REGISTRATION --- */}
      <Modal isOpen={isNewPacienteOpen} onClose={() => setIsNewPacienteOpen(false)} title="Registrar Paciente de Forma Rápida">
        <form onSubmit={handleCreatePaciente} className="space-y-4">
          <div className="text-xs text-[#854F0B] bg-[#FAEEDA] p-3 rounded-md border border-[#FAEEDA]/50">
            {searchQuery.trim() ? (
              <>No se encontraron pacientes que coincidan con <span className="font-bold">"{searchQuery.trim()}"</span>. Ingresá los datos para registrar un paciente nuevo.</>
            ) : (
              <>Ingresá los datos para registrar un paciente nuevo.</>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                DNI
              </label>
              <input
                type="text"
                value={newPacForm.dni}
                onChange={e => setNewPacForm(prev => ({ ...prev, dni: e.target.value }))}
                placeholder="Ej: 12345678"
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={newPacForm.nombre}
                onChange={e => setNewPacForm(prev => ({ ...prev, nombre: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={newPacForm.apellido}
                onChange={e => setNewPacForm(prev => ({ ...prev, apellido: e.target.value }))}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Teléfono de Contacto
            </label>
            <input
              type="text"
              value={newPacForm.telefono}
              onChange={e => setNewPacForm(prev => ({ ...prev, telefono: e.target.value }))}
              placeholder="Ej: 11-2233-4455"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={newPacForm.email}
              onChange={e => setNewPacForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Obra Social o Prepaga
            </label>
            <CustomSelect
              value={newPacForm.obra_social}
              onChange={val => setNewPacForm(prev => ({ ...prev, obra_social: String(val) }))}
              options={[
                { value: '', label: 'Seleccione Prepaga / Obra Social' },
                ...obrasSociales.map(os => ({ value: os.name || os.nombre, label: os.name || os.nombre }))
              ]}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewPacienteOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-bold transition-colors cursor-pointer"
            >
              Atrás
            </button>
            <button
              type="submit"
              className="bg-neutral-warm-900 hover:bg-neutral-warm-900/85 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
              Registrar Paciente
            </button>
          </div>
        </form>
      </Modal>


      {/* --- MODAL 2: MANUAL LOCKS BLOCK --- */}
      <Modal isOpen={isBlockOpen} onClose={() => setIsBlockOpen(false)} title="Bloquear Slot de Agenda Manual">
        <form onSubmit={handleBlockSlot} className="space-y-4">
          
          {/* Selector Profesional */}
          <SelectorProfesional
            doctores={doctores}
            selectedId={blockForm.id_doctor ? Number(blockForm.id_doctor) : null}
            onChange={id => setBlockForm(prev => ({ ...prev, id_doctor: String(id) }))}
            label="Seleccione Profesional"
          />

          {/* Time Picker block */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Seleccione Hora del Bloqueo
            </label>
            <input
              type="time"
              required
              value={blockForm.hora}
              onChange={e => setBlockForm(prev => ({ ...prev, hora: e.target.value }))}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-neutral-warm-200 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-[#1D9E75] cursor-pointer"
            />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
              Motivo del Bloqueo
            </label>
            <input
              type="text"
              required
              value={blockForm.motivo}
              onChange={e => setBlockForm(prev => ({ ...prev, motivo: e.target.value }))}
              placeholder="Ej: Cirugía Externa, Almuerzo, Ausente"
              className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBlockOpen(false)}
              className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1D9E75] hover:bg-[#0F6E56] text-white px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer"
            >
              Bloquear Slot
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: TURN DETAIL --- */}
      <Modal isOpen={isDetailOpen} onClose={() => { if (!isCancelling) setIsDetailOpen(false); }} title="Detalle de Turno">
        {detailLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D9E75]" />
            <p className="text-xs text-neutral-warm-500 font-bold">Cargando detalles del turno...</p>
          </div>
        ) : selectedTurnoDetails ? (
          <div className="space-y-5">
            <div className="space-y-3 bg-white p-4 rounded-xl border border-neutral-warm-100 shadow-3xs">
              <div className="flex items-center justify-between border-b border-neutral-warm-50 pb-2">
                <span className="text-[10px] uppercase font-extrabold text-neutral-warm-500 tracking-wider">Estado</span>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  selectedTurnoDetails.estado === 'Pendiente' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                  selectedTurnoDetails.estado === 'Realizado' ? 'bg-[#EAF3DE] text-[#3B6D11] border border-[#3B6D11]/15' :
                  'bg-red-50 text-red-800 border border-red-100'
                }`}>
                  {selectedTurnoDetails.estado}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-warm-500 block mb-0.5 font-medium">Paciente</span>
                  <span className="font-extrabold text-neutral-warm-900">{selectedTurnoDetails.paciente}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-warm-500 block mb-0.5 font-medium">DNI</span>
                  <span className="font-mono font-bold text-neutral-warm-700">{selectedTurnoDetails.dni_paciente}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-warm-500 block mb-0.5 font-medium">Odontólogo</span>
                  <span className="font-extrabold text-neutral-warm-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedTurnoDetails.doctor_color }} />
                    {selectedTurnoDetails.doctor_nombre}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-warm-500 block mb-0.5 font-medium">Fecha y Hora</span>
                  <span className="font-bold text-neutral-warm-800">
                    {new Date(selectedTurnoDetails.fecha_hora).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} a las {new Date(selectedTurnoDetails.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                  </span>
                </div>
              </div>

              {selectedTurnoDetails.motivo && (
                <div className="pt-2 border-t border-neutral-warm-50 text-xs">
                  <span className="text-[10px] text-neutral-warm-500 block mb-0.5 font-medium">Motivo de la consulta</span>
                  <p className="text-neutral-warm-700 font-medium bg-neutral-warm-50/50 p-2.5 rounded-lg border border-neutral-warm-100/40">
                    {selectedTurnoDetails.motivo}
                  </p>
                </div>
              )}

              {selectedTurnoDetails.estado === 'Cancelado' && selectedTurnoDetails.motivo_cancelacion && (
                <div className="pt-2 border-t border-red-100 text-xs">
                  <span className="text-[10px] text-red-600 block mb-0.5 font-bold">Motivo de Cancelación</span>
                  <p className="text-red-900 font-semibold bg-red-50/75 p-2.5 rounded-lg border border-red-100/55">
                    {selectedTurnoDetails.motivo_cancelacion}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-warm-100">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 rounded-md border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-900 text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              
              {selectedTurnoDetails.estado === 'Pendiente' ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsCancelling(true);
                    setMotivoCancelacion('');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-3xs"
                >
                  Cancelar Turno
                </button>
              ) : selectedTurnoDetails.estado === 'Realizado' ? (
                <button
                  type="button"
                  disabled
                  className="bg-neutral-200 text-neutral-400 px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-not-allowed flex items-center gap-1.5"
                  title="No se puede cancelar un turno que ya ha sido Realizado y facturado"
                >
                  No Cancelable
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-neutral-warm-500">No se pudieron cargar los detalles del turno.</div>
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
