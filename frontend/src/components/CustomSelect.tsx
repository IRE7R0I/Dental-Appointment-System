import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
  color?: string; // Optional circle color (for doctors)
  subtitle?: string; // Optional secondary label
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: any) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-2xl text-sm focus:outline-none transition-all duration-200 cursor-pointer ${
          disabled
            ? 'bg-slate-50 border-slate-205 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/10 text-slate-800 shadow-sm'
            : 'border-slate-200 text-slate-700 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption?.color && (
            <span
              className="w-3 h-3 rounded-full shrink-0 animate-pulse-soft"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="font-medium truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-250 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="absolute left-0 right-0 z-[100] bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto mt-1"
          >
            <div className="p-1.5 flex flex-col gap-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 text-blue-700 font-semibold font-[family-name:var(--font-sans)]'
                        : 'text-slate-700 hover:bg-slate-50 font-[family-name:var(--font-sans)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {option.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                      )}
                      <div className="flex flex-col truncate">
                        <span className="truncate leading-normal">{option.label}</span>
                        {option.subtitle && (
                          <span className="text-[10px] text-slate-400 font-bold leading-none mt-0.5 uppercase tracking-wider">
                            {option.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
