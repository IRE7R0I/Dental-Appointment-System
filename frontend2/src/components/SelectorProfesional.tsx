import React from 'react';
import { Doctor } from '../types';
import { CustomSelect, SelectOption } from './CustomSelect';

interface SelectorProfesionalProps {
  doctores: Doctor[];
  selectedId: number | null;
  onChange: (id: number) => void;
  label?: string;
  allowAll?: boolean;
  onAllChange?: () => void;
}

export function SelectorProfesional({ 
  doctores, 
  selectedId, 
  onChange, 
  label = "Profesional",
  allowAll = false,
  onAllChange
}: SelectorProfesionalProps) {
  const options: SelectOption[] = [];
  
  if (allowAll) {
    options.push({ value: 'all', label: 'Todos los profesionales' });
  }

  doctores.forEach(doc => {
    options.push({
      value: doc.id,
      label: doc.nombre,
      color: doc.color_agenda
    });
  });

  const currentValue = selectedId === null && allowAll ? 'all' : (selectedId || '');

  const handleChange = (val: any) => {
    if (val === 'all') {
      if (onAllChange) onAllChange();
    } else if (val === '') {
      // do nothing or optional
    } else {
      onChange(Number(val));
    }
  };

  return (
    <CustomSelect
      label={label}
      value={currentValue}
      onChange={handleChange}
      options={options}
      placeholder={allowAll ? "Todos los profesionales" : "Seleccione un profesional"}
    />
  );
}

