import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string | number | null;
  onChange: (val: any) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción',
  label,
  disabled = false,
  className = '',
}: CustomSelectProps) {
  // Find selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleValueChange = (valString: string) => {
    // Find original option to preserve type (string vs number)
    const originalOption = options.find((opt) => String(opt.value) === valString);
    if (originalOption) {
      onChange(originalOption.value);
    } else {
      onChange(valString);
    }
  };

  const stringValue = value !== null && value !== undefined ? String(value) : '';

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
          {label}
        </label>
      )}

      <SelectPrimitive.Root
        value={stringValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "w-full text-xs px-3 py-2 rounded-xl border border-neutral-warm-100 bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 flex items-center justify-between cursor-pointer transition-all hover:border-neutral-warm-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-neutral-warm-50/50",
            "outline-none text-left"
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder}>
            {selectedOption && (
              <div className="flex items-center gap-2 min-w-0">
                {selectedOption.color && (
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs shrink-0"
                    style={{ backgroundColor: selectedOption.color }}
                  />
                )}
                {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                <span className="truncate">{selectedOption.label}</span>
              </div>
            )}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <ChevronDown size={14} className="text-neutral-warm-600 shrink-0 ml-1" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="bg-white border border-neutral-warm-100/60 rounded-xl shadow-lg max-h-60 overflow-hidden z-[9999] min-w-[var(--radix-select-trigger-width)] animate-in fade-in-80 duration-100"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.length === 0 ? (
                <div className="text-xs text-neutral-warm-400 px-3 py-2 italic text-center">
                  Sin opciones disponibles
                </div>
              ) : (
                options.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <SelectPrimitive.Item
                      key={String(opt.value)}
                      value={String(opt.value)}
                      className={cn(
                        "w-full text-left text-xs px-3 py-2 flex items-center justify-between hover:bg-neutral-warm-50 transition-colors cursor-pointer outline-none select-none text-neutral-warm-900 rounded-lg",
                        "focus:bg-neutral-warm-50 focus:text-brand-400 data-[highlighted]:bg-neutral-warm-50 data-[highlighted]:text-brand-400 data-[highlighted]:outline-none",
                        isSelected && "bg-neutral-warm-50/80 text-brand-400 font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {opt.color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white shadow-2xs shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <SelectPrimitive.ItemText>
                          <span className="truncate">{opt.label}</span>
                        </SelectPrimitive.ItemText>
                      </div>
                      <SelectPrimitive.ItemIndicator>
                        <Check size={12} className="text-brand-400 shrink-0 ml-2" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  );
                })
              )}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
