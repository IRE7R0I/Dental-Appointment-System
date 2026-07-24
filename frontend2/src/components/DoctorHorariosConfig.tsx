import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/Toast';
import { Calendar, Clock, ChevronLeft, ChevronRight, Save, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { Doctor } from '../types';

interface DoctorHorariosConfigProps {
  doc: Doctor;
  onClose: () => void;
}

interface FranjaHoraria {
  inicio: string;
  fin: string;
}

interface WorkDayConfig {
  manana: FranjaHoraria | null;
  tarde: FranjaHoraria | null;
}

interface WeeklyHorarios {
  dias: { [key: string]: WorkDayConfig | null };
  duracion_turno?: number;
  horizonte_dias?: number;
}

const DAYS_OF_WEEK = [
  { id: 'lunes', name: 'Lunes' },
  { id: 'martes', name: 'Martes' },
  { id: 'miercoles', name: 'Miércoles' },
  { id: 'jueves', name: 'Jueves' },
  { id: 'viernes', name: 'Viernes' },
  { id: 'sabado', name: 'Sábado' },
  { id: 'domingo', name: 'Domingo' }
];

const HOUR_OPTIONS: string[] = [];
for (let h = 7; h <= 21; h++) {
  const padH = h.toString().padStart(2, '0');
  HOUR_OPTIONS.push(`${padH}:00`);
  HOUR_OPTIONS.push(`${padH}:30`);
}

// Helper to format Month and Year
const formatMonthYearSpanish = (date: Date) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[date.getMonth()]} de ${date.getFullYear()}`;
};

// Helper to generate the full month days array (for a Monday-first calendar grid)
const getMonthGridDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
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

export function DoctorHorariosConfig({ doc, onClose }: DoctorHorariosConfigProps) {
  const [horariosState, setHorariosState] = useState<WeeklyHorarios | null>(null);
  const [excepcionesState, setExcepcionesState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [savingPatron, setSavingPatron] = useState(false);

  const { showToast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [horariosRes, excepcionesRes] = await Promise.all([
        apiFetch(`/api/doctores/${doc.id}/horarios`),
        apiFetch(`/api/doctores/${doc.id}/dias-no-laborables`)
      ]);

      if (horariosRes && horariosRes.dias) {
        const rawDias = horariosRes.dias;
        const normalizedDias: { [key: string]: WorkDayConfig | null } = {};

        const dayMapFromNum: { [key: string]: string } = {
          '1': 'lunes', '2': 'martes', '3': 'miercoles', '4': 'jueves', '5': 'viernes', '6': 'sabado', '0': 'domingo'
        };

        DAYS_OF_WEEK.forEach(d => {
          let rawDay = rawDias[d.id];
          if (!rawDay) {
            const numKey = Object.keys(dayMapFromNum).find(k => dayMapFromNum[k] === d.id);
            if (numKey && rawDias[numKey]) {
              rawDay = rawDias[numKey];
            }
          }

          if (!rawDay) {
            normalizedDias[d.id] = null;
            return;
          }

          const parseFranja = (franjaVal: any): FranjaHoraria | null => {
            if (!franjaVal) return null;
            if (Array.isArray(franjaVal)) {
              return { inicio: franjaVal[0] || '09:00', fin: franjaVal[1] || '13:00' };
            }
            if (typeof franjaVal === 'object' && franjaVal.inicio && franjaVal.fin) {
              return { inicio: franjaVal.inicio, fin: franjaVal.fin };
            }
            return null;
          };

          const manana = parseFranja(rawDay.manana || rawDay.mañana);
          const tarde = parseFranja(rawDay.tarde);

          if (!manana && !tarde) {
            normalizedDias[d.id] = null;
          } else {
            normalizedDias[d.id] = { manana, tarde };
          }
        });

        setHorariosState({
          dias: normalizedDias,
          duracion_turno: horariosRes.duracion_turno || 30,
          horizonte_dias: horariosRes.horizonte_dias || 180
        });
      } else {
        setHorariosState({
          dias: {
            lunes: { manana: { inicio: "09:00", fin: "13:00" }, tarde: { inicio: "16:00", fin: "20:00" } },
            martes: { manana: { inicio: "09:00", fin: "13:00" }, tarde: { inicio: "16:00", fin: "20:00" } },
            miercoles: { manana: { inicio: "09:00", fin: "13:00" }, tarde: { inicio: "16:00", fin: "20:00" } },
            jueves: { manana: { inicio: "09:00", fin: "13:00" }, tarde: { inicio: "16:00", fin: "20:00" } },
            viernes: { manana: { inicio: "09:00", fin: "13:00" }, tarde: { inicio: "16:00", fin: "20:00" } },
            sabado: null,
            domingo: null
          },
          duracion_turno: 30,
          horizonte_dias: 180
        });
      }

      setExcepcionesState(excepcionesRes || []);
    } catch (err: any) {
      showToast('Error cargando la configuración de horarios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [doc.id]);

  // Fetch exceptions on calendar month change
  const fetchExcepcionesForMonth = async (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const desde = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const hasta = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    try {
      const res = await apiFetch(`/api/doctores/${doc.id}/dias-no-laborables?desde=${desde}&hasta=${hasta}`);
      setExcepcionesState(res || []);
    } catch (err) {
      console.error("Error fetching exceptions", err);
    }
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    setCurrentMonth(newMonth);
    fetchExcepcionesForMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    setCurrentMonth(newMonth);
    fetchExcepcionesForMonth(newMonth);
  };

  // Check if a day of week is normally laborable according to the Weekly pattern state
  const isDayLaborableByPattern = (dayOfWeek: number) => {
    if (!horariosState) return false;
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dayOfWeek];
    const config = horariosState.dias[dayName];
    if (!config) return false;
    return !!(config.manana || config.tarde);
  };

  const handleToggleDay = (dayId: string, checked: boolean) => {
    setHorariosState(prev => {
      if (!prev) return prev;
      const updatedDias = { ...prev.dias };
      if (checked) {
        updatedDias[dayId] = {
          manana: { inicio: "09:00", fin: "13:00" },
          tarde: { inicio: "16:00", fin: "20:00" }
        };
      } else {
        updatedDias[dayId] = null;
      }
      return { ...prev, dias: updatedDias };
    });
  };

  const handleToggleFranja = (dayId: string, franja: 'manana' | 'tarde', checked: boolean) => {
    setHorariosState(prev => {
      if (!prev) return prev;
      const updatedDias = { ...prev.dias };
      const current = updatedDias[dayId] ? { ...updatedDias[dayId]! } : { manana: null, tarde: null };
      if (checked) {
        current[franja] = franja === 'manana' ? { inicio: "09:00", fin: "13:00" } : { inicio: "16:00", fin: "20:00" };
      } else {
        current[franja] = null;
      }
      if (!current.manana && !current.tarde) {
        updatedDias[dayId] = null;
      } else {
        updatedDias[dayId] = current;
      }
      return { ...prev, dias: updatedDias };
    });
  };

  const handleChangeTime = (dayId: string, franja: 'manana' | 'tarde', key: 'inicio' | 'fin', value: string) => {
    setHorariosState(prev => {
      if (!prev) return prev;
      const updatedDias = { ...prev.dias };
      const current = updatedDias[dayId] ? { ...updatedDias[dayId]! } : { manana: null, tarde: null };
      if (current[franja]) {
        current[franja] = { ...current[franja]!, [key]: value };
        updatedDias[dayId] = current;
      }
      return { ...prev, dias: updatedDias };
    });
  };

  const handleSavePatron = async () => {
    if (!horariosState) return;
    try {
      setSavingPatron(true);
      await apiFetch(`/api/doctores/${doc.id}/horarios`, {
        method: 'PUT',
        body: JSON.stringify(horariosState)
      });
      showToast('¡Patrón semanal de atención guardado con éxito!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error guardando horarios.', 'error');
    } finally {
      setSavingPatron(false);
    }
  };

  const handleToggleExcepcion = async (dayDateStr: string) => {
    const isExcepcion = excepcionesState.includes(dayDateStr);
    
    // Optimistic UI updates
    if (isExcepcion) {
      setExcepcionesState(prev => prev.filter(d => d !== dayDateStr));
      try {
        await apiFetch(`/api/doctores/${doc.id}/dias-no-laborables`, {
          method: 'DELETE',
          body: JSON.stringify({ fecha: dayDateStr })
        });
        showToast(`Día ${dayDateStr} habilitado como laborable.`, 'success');
      } catch (err: any) {
        showToast('Error al desmarcar día no laborable.', 'error');
        setExcepcionesState(prev => [...prev, dayDateStr]);
      }
    } else {
      setExcepcionesState(prev => [...prev, dayDateStr]);
      try {
        await apiFetch(`/api/doctores/${doc.id}/dias-no-laborables`, {
          method: 'POST',
          body: JSON.stringify({ fecha: dayDateStr })
        });
        showToast(`Día ${dayDateStr} marcado como no laborable excepcionalmente.`, 'success');
      } catch (err: any) {
        showToast('Error al marcar día no laborable.', 'error');
        setExcepcionesState(prev => prev.filter(d => d !== dayDateStr));
      }
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-neutral-warm-500 flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-neutral-warm-300 border-t-brand-500 rounded-full animate-spin"></div>
        <span>Cargando configurador de horarios...</span>
      </div>
    );
  }

  const gridDays = getMonthGridDays(currentMonth);

  return (
    <div className="space-y-6">
      {/* Informative Header Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
        <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Configuración de Horario para {doc.nombre}:</span> Definí las franjas de atención semanal en el bloque izquierdo, y administrá licencias, feriados o vacaciones haciendo clic directamente sobre el calendario de días excepcionales a la derecha.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* BLOQUE A: Patrón Semanal Editable (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6 bg-white border border-neutral-warm-100/60 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-warm-50 pb-3">
            <h4 className="text-sm font-bold text-neutral-warm-900 flex items-center gap-2">
              <Clock size={16} className="text-[#1D9E75]" />
              <span>Patrón Semanal Editable</span>
            </h4>
            <button
              onClick={handleSavePatron}
              disabled={savingPatron}
              className="bg-[#1D9E75] hover:bg-[#0F6E56] disabled:bg-neutral-warm-100 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save size={14} />
              <span>{savingPatron ? 'Guardando...' : 'Guardar Patrón'}</span>
            </button>
          </div>

          {/* Turn Duration & Horizon settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-warm-50/40 p-4 rounded-xl border border-neutral-warm-100/50">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-warm-600 uppercase tracking-wider block">
                Duración del Turno
              </label>
              <select
                value={horariosState?.duracion_turno || 30}
                onChange={e => setHorariosState(prev => prev ? { ...prev, duracion_turno: parseInt(e.target.value) } : prev)}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                <option value={30}>30 Minutos</option>
                <option value={60}>60 Minutos</option>
                <option value={90}>90 Minutos</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-warm-600 uppercase tracking-wider block">
                Horizonte de Agendamiento
              </label>
              <select
                value={horariosState?.horizonte_dias || 180}
                onChange={e => setHorariosState(prev => prev ? { ...prev, horizonte_dias: parseInt(e.target.value) } : prev)}
                className="w-full text-xs px-3 py-2 rounded-md border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
              >
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
                <option value={90}>90 días</option>
                <option value={180}>180 días</option>
              </select>
              <p className="text-[11px] text-neutral-warm-500 font-medium">
                Los pacientes podrán reservar turnos con este profesional hasta {horariosState?.horizonte_dias || 180} días por adelantado.
              </p>
            </div>
          </div>

          {/* Week days list */}
          <div className="space-y-3.5">
            {DAYS_OF_WEEK.map(day => {
              const config = horariosState?.dias[day.id];
              const isDayEnabled = !!config;

              return (
                <div 
                  key={day.id} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    isDayEnabled 
                      ? 'bg-green-50/10 border-green-100/60 shadow-xs' 
                      : 'bg-neutral-warm-50/20 border-neutral-warm-100/40 opacity-75'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Day Selector switch/checkbox */}
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        id={`enabled-day-${day.id}`}
                        checked={isDayEnabled}
                        onChange={e => handleToggleDay(day.id, e.target.checked)}
                        className="w-4.5 h-4.5 rounded border-neutral-warm-200 text-[#1D9E75] focus:ring-[#1D9E75] cursor-pointer"
                      />
                      <label 
                        htmlFor={`enabled-day-${day.id}`} 
                        className={`text-xs font-bold cursor-pointer ${
                          isDayEnabled ? 'text-neutral-warm-900' : 'text-neutral-warm-500'
                        }`}
                      >
                        {day.name}
                      </label>
                    </div>

                    {/* Active franjas / hours editing block */}
                    {isDayEnabled ? (
                      <div className="flex-1 max-w-md space-y-2.5 sm:pl-6">
                        {/* Franja Mañana */}
                        <div className="flex items-center gap-3 bg-white p-1.5 px-2.5 rounded-lg border border-neutral-warm-100/50">
                          <input 
                            type="checkbox"
                            id={`franja-m-${day.id}`}
                            checked={!!config.manana}
                            onChange={e => handleToggleFranja(day.id, 'manana', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-neutral-warm-200 text-[#1D9E75] focus:ring-[#1D9E75] cursor-pointer"
                          />
                          <label htmlFor={`franja-m-${day.id}`} className="text-[10px] font-semibold text-neutral-warm-600 uppercase tracking-wider w-16">
                            Mañana
                          </label>

                          {config.manana ? (
                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              <input
                                type="time"
                                value={config.manana.inicio || ''}
                                onChange={e => handleChangeTime(day.id, 'manana', 'inicio', e.target.value)}
                                className="text-[11px] px-1.5 py-0.5 w-[72px] text-center rounded border border-neutral-warm-200 bg-neutral-warm-50/50 text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 cursor-pointer"
                              />
                              <span className="text-[10px] text-neutral-warm-400 font-medium">a</span>
                              <input
                                type="time"
                                value={config.manana.fin || ''}
                                onChange={e => handleChangeTime(day.id, 'manana', 'fin', e.target.value)}
                                className="text-[11px] px-1.5 py-0.5 w-[72px] text-center rounded border border-neutral-warm-200 bg-neutral-warm-50/50 text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 cursor-pointer"
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-warm-400 italic flex-1 text-right">No atiende</span>
                          )}
                        </div>

                        {/* Franja Tarde */}
                        <div className="flex items-center gap-3 bg-white p-1.5 px-2.5 rounded-lg border border-neutral-warm-100/50">
                          <input 
                            type="checkbox"
                            id={`franja-t-${day.id}`}
                            checked={!!config.tarde}
                            onChange={e => handleToggleFranja(day.id, 'tarde', e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-neutral-warm-200 text-[#1D9E75] focus:ring-[#1D9E75] cursor-pointer"
                          />
                          <label htmlFor={`franja-t-${day.id}`} className="text-[10px] font-semibold text-neutral-warm-600 uppercase tracking-wider w-16">
                            Tarde
                          </label>

                          {config.tarde ? (
                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              <input
                                type="time"
                                value={config.tarde.inicio || ''}
                                onChange={e => handleChangeTime(day.id, 'tarde', 'inicio', e.target.value)}
                                className="text-[11px] px-1.5 py-0.5 w-[72px] text-center rounded border border-neutral-warm-200 bg-neutral-warm-50/50 text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 cursor-pointer"
                              />
                              <span className="text-[10px] text-neutral-warm-400 font-medium">a</span>
                              <input
                                type="time"
                                value={config.tarde.fin || ''}
                                onChange={e => handleChangeTime(day.id, 'tarde', 'fin', e.target.value)}
                                className="text-[11px] px-1.5 py-0.5 w-[72px] text-center rounded border border-neutral-warm-200 bg-neutral-warm-50/50 text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 focus:border-brand-400 cursor-pointer"
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-warm-400 italic flex-1 text-right">No atiende</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-warm-400 italic pr-4">Cerrado / No atiende</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BLOQUE B: Calendario de Días No Laborables (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6 bg-white border border-neutral-warm-100/60 p-5 rounded-2xl shadow-xs">
          <div className="border-b border-neutral-warm-50 pb-3">
            <h4 className="text-sm font-bold text-neutral-warm-900 flex items-center gap-2">
              <Calendar size={16} className="text-[#3B82F6]" />
              <span>Días No Laborables (Feriados, Licencias)</span>
            </h4>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-neutral-warm-900 uppercase tracking-wide">
              {formatMonthYearSpanish(currentMonth)}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-neutral-warm-100 hover:bg-neutral-warm-50 text-neutral-warm-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Color Guides */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-warm-50/40 border border-neutral-warm-100/30 rounded-xl text-[10px]">
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-3 h-3 rounded bg-green-50 border border-green-200 block shrink-0" />
              <span className="text-neutral-warm-600 font-medium">Laborable normal</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-200 block shrink-0" />
              <span className="text-neutral-warm-600 font-medium font-bold text-red-600">Exceptuado</span>
            </div>
          </div>

          {/* Standard Calendar Grid */}
          <div className="space-y-2">
            {/* Weekdays header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-warm-500 py-1 border-b border-neutral-warm-50 uppercase tracking-wider">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {gridDays.map((day, idx) => {
                const isException = excepcionesState.includes(day.dateStr);

                let cellStyles = "";
                let isClickable = false;

                if (!day.isCurrentMonth) {
                  cellStyles = "text-neutral-warm-300 opacity-30 cursor-not-allowed";
                } else if (isException) {
                  cellStyles = "bg-red-50 text-red-700 border border-red-200 cursor-pointer font-bold hover:bg-red-100/80 transition-colors shadow-xs hover:shadow-md hover:scale-102 transform duration-100";
                  isClickable = true;
                } else {
                  cellStyles = "bg-green-50/70 text-green-700 border border-green-200 cursor-pointer font-medium hover:bg-green-100/80 transition-colors shadow-xs hover:shadow-md hover:scale-102 transform duration-100";
                  isClickable = true;
                }

                return (
                  <button
                    key={`${day.dateStr}-${idx}`}
                    onClick={() => isClickable && handleToggleExcepcion(day.dateStr)}
                    disabled={!isClickable}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs relative ${cellStyles}`}
                  >
                    <span>{day.dayNum}</span>
                    {day.isCurrentMonth && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isException ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <div className="pt-3 border-t border-neutral-warm-100/60 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="bg-neutral-warm-900 hover:bg-neutral-warm-800 text-white px-5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-xs"
        >
          Finalizar y Cerrar
        </button>
      </div>
    </div>
  );
}
