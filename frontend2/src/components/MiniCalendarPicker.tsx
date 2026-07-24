import React, { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  buttonClassName?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

function formatDateDisplay(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatDateISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function MiniDatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  label,
  className = '',
  buttonClassName = ''
}: MiniDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Initialize view date from value or today
  const initialDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  const handleOpenChange = (open: boolean) => {
    if (open) {
      const d = value ? new Date(value + 'T00:00:00') : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setIsOpen(open);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Generate calendar grid (Monday start)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  let firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
  let startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
    days.push({ dateStr: formatDateISO(prevDate), dayNum, isCurrentMonth: false });
  }

  // Current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const currDate = new Date(viewYear, viewMonth, dayNum);
    days.push({ dateStr: formatDateISO(currDate), dayNum, isCurrentMonth: true });
  }

  // Next month padding to fill 35 cells (5 rows) or 42 cells (6 rows)
  const totalCells = days.length <= 35 ? 35 : 42;
  const remaining = totalCells - days.length;
  for (let dayNum = 1; dayNum <= remaining; dayNum++) {
    const nextDate = new Date(viewYear, viewMonth + 1, dayNum);
    days.push({ dateStr: formatDateISO(nextDate), dayNum, isCurrentMonth: false });
  }

  const todayStr = formatDateISO(new Date());

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-[9px] font-bold text-neutral-warm-600 uppercase block tracking-wider">
          {label}
        </span>
      )}

      <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={`w-full text-xs px-3 py-1.5 rounded-lg border border-neutral-warm-200 bg-[#F1EFE8] text-neutral-warm-900 hover:bg-neutral-warm-100 transition-all flex items-center justify-between gap-1.5 font-bold cursor-pointer outline-none ${buttonClassName}`}
          >
            <span className={value ? 'text-neutral-warm-900 font-mono' : 'text-neutral-warm-500 font-normal'}>
              {value ? formatDateDisplay(value) : placeholder}
            </span>
            <Calendar size={13} className="text-neutral-warm-600 shrink-0" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className="bg-white border border-neutral-warm-100 rounded-xl shadow-xl p-3 w-64 z-[9999] animate-in fade-in-80 duration-100 outline-none"
            sideOffset={4}
            align="start"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-2 mb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md hover:bg-neutral-warm-50 text-neutral-warm-900 cursor-pointer transition-colors flex items-center justify-center"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <span className="font-bold text-xs text-neutral-warm-900 tracking-tight">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md hover:bg-neutral-warm-50 text-neutral-warm-900 cursor-pointer transition-colors flex items-center justify-center"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 text-center text-[9px] font-bold text-neutral-warm-500 uppercase mb-1">
              <span>Lu</span>
              <span>Ma</span>
              <span>Mi</span>
              <span>Ju</span>
              <span>Vi</span>
              <span>Sá</span>
              <span>Do</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(({ dateStr, dayNum, isCurrentMonth }) => {
                const isSelected = value === dateStr;
                const isToday = todayStr === dateStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      onChange(dateStr);
                      setIsOpen(false);
                    }}
                    className={`h-7 w-full text-[11px] font-bold rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-warm-900 text-white shadow-xs'
                        : isToday
                        ? 'bg-brand-50 border border-brand-300 text-brand-700'
                        : isCurrentMonth
                        ? 'text-neutral-warm-800 hover:bg-neutral-warm-100'
                        : 'text-neutral-warm-300 hover:bg-neutral-warm-50'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

interface MiniMonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (monthStr: string) => void;
  timePreset: string;
  onSelectPreset: () => void;
}

export function MiniMonthPicker({
  value,
  onChange,
  timePreset,
  onSelectPreset,
}: MiniMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentYear = value ? parseInt(value.split('-')[0]) : new Date().getFullYear();
  const [viewingYear, setViewingYear] = useState(currentYear);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      const y = value ? parseInt(value.split('-')[0]) : new Date().getFullYear();
      setViewingYear(y);
    }
    setIsOpen(open);
  };

  const formatMonthLabel = (val: string) => {
    if (!val) return 'Ver otro mes...';
    const [y, m] = val.split('-');
    const mIdx = parseInt(m) - 1;
    if (isNaN(mIdx) || mIdx < 0 || mIdx > 11) return 'Ver otro mes...';
    return `${MONTH_NAMES[mIdx]} ${y}`;
  };

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={`text-[11px] px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto ${
            timePreset === 'mes-especifico'
              ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
              : 'bg-[#F1EFE8] border-neutral-warm-200 text-neutral-warm-700 hover:bg-neutral-warm-100'
          }`}
        >
          <span className="truncate">
            {timePreset === 'mes-especifico' && value
              ? formatMonthLabel(value)
              : 'Ver otro mes...'}
          </span>
          <Calendar size={12} className="opacity-70 shrink-0" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="bg-white border border-neutral-warm-100 rounded-xl shadow-xl p-3 w-64 z-[9999] animate-in fade-in-80 duration-100 outline-none"
          sideOffset={4}
          align="start"
        >
          {/* Year Navigation */}
          <div className="flex items-center justify-between border-b border-neutral-warm-100 pb-2 mb-2.5">
            <button
              type="button"
              onClick={() => setViewingYear(prev => prev - 1)}
              className="p-1 rounded-md hover:bg-neutral-warm-50 text-neutral-warm-900 cursor-pointer transition-colors flex items-center justify-center"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <span className="font-bold text-xs text-neutral-warm-900 font-mono tracking-tight">
              {viewingYear}
            </span>
            <button
              type="button"
              onClick={() => setViewingYear(prev => prev + 1)}
              className="p-1 rounded-md hover:bg-neutral-warm-50 text-neutral-warm-900 cursor-pointer transition-colors flex items-center justify-center"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Month Grid (3x4) */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT_NAMES.map((mName, mIdx) => {
              const selectedVal = `${viewingYear}-${String(mIdx + 1).padStart(2, '0')}`;
              const isSelected = timePreset === 'mes-especifico' && value === selectedVal;

              return (
                <button
                  key={mIdx}
                  type="button"
                  onClick={() => {
                    onChange(selectedVal);
                    onSelectPreset();
                    setIsOpen(false);
                  }}
                  className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer border text-center ${
                    isSelected
                      ? 'bg-neutral-warm-900 border-neutral-warm-900 text-white shadow-xs'
                      : 'bg-neutral-warm-50/50 border-neutral-warm-100/60 text-neutral-warm-700 hover:bg-[#F1EFE8] hover:text-neutral-warm-900'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
