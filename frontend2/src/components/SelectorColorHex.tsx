import React, { useState, useEffect } from 'react';

interface SelectorColorHexProps {
  value: string;
  onChange: (hex: string) => void;
}

export function SelectorColorHex({ value, onChange }: SelectorColorHexProps) {
  const [customHex, setCustomHex] = useState(value || '');
  const [error, setError] = useState('');

  useEffect(() => {
    const val = value || '';
    if (val.toUpperCase() !== customHex.toUpperCase()) {
      setCustomHex(val);
      if (val && /^#[0-9A-Fa-f]{6}$/.test(val)) {
        setError('');
      }
    }
  }, [value]);

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(customHex);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    
    // Hex validation regex ^#[0-9A-Fa-f]{6}$
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setError('');
      onChange(val.toUpperCase());
    } else {
      setError('Formato requerido: #RRGGBB (ej: #1D9E75)');
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setCustomHex(newColor);
    setError('');
    onChange(newColor);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-neutral-warm-600 sentence-case block">
        Color de Agenda del Profesional
      </label>

      <div className="flex items-center space-x-2">
        {/* Full Native Color Selector (Hue wheel / saturation / brightness) */}
        <div className="relative shrink-0 flex items-center justify-center">
          <input
            type="color"
            value={isValidHex ? customHex : '#1D9E75'}
            onChange={handleColorPickerChange}
            className="w-9 h-9 p-0.5 rounded-lg border border-neutral-warm-200 bg-white cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-brand-400 overflow-hidden"
            title="Seleccionar color"
          />
        </div>

        {/* Manual Hex Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={customHex}
            onChange={handleCustomChange}
            placeholder="#RRGGBB"
            maxLength={7}
            className={`w-full text-xs font-mono px-3 py-2 rounded-md border bg-white text-neutral-warm-900 focus:outline-none focus:ring-1 focus:ring-brand-400 ${
              error ? 'border-[#A32D2D]' : 'border-neutral-warm-100'
            }`}
          />
        </div>

        {/* Color Preview Block */}
        <div 
          className="w-9 h-9 rounded-md border border-neutral-warm-200 shadow-xs shrink-0 transition-colors"
          style={{ backgroundColor: isValidHex ? customHex : '#FFFFFF' }}
          title={isValidHex ? `Color seleccionado: ${customHex}` : 'Color no válido'}
        />
      </div>

      {error && (
        <span className="text-[10px] text-[#A32D2D] block mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
