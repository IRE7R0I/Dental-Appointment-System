import React from 'react';

interface KPICardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  theme?: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'lg';
}

export function KPICard({ icon, value, label, theme = 'info', size = 'sm' }: KPICardProps) {
  // Theme styling based on Section 2 of Diseñio Consolidado
  const themeClasses = {
    success: {
      bg: 'bg-[#EAF3DE]',
      text: 'text-[#3B6D11]'
    },
    warning: {
      bg: 'bg-[#FAEEDA]',
      text: 'text-[#854F0B]'
    },
    error: {
      bg: 'bg-[#FCEBEB]',
      text: 'text-[#A32D2D]'
    },
    info: {
      bg: 'bg-[#F1EFE8]',
      text: 'text-[#5F5E5A]'
    }
  };

  const selectedTheme = themeClasses[theme];

  return (
    <div className="bg-white border border-neutral-warm-100 rounded-2xl p-4.5 flex flex-col justify-between min-h-[124px] transition-all hover:shadow-md hover:border-neutral-warm-100/80">
      {/* Icon block: 32px rounded-xl, semantic tint background */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedTheme.bg} ${selectedTheme.text} shadow-2xs`}>
        {icon}
      </div>
      
      <div className="mt-3">
        {/* Value: bold, premium Outfit look */}
        <div className={`font-bold text-neutral-warm-900 leading-none tracking-tight font-sans ${size === 'lg' ? 'text-clamp-kpi-lg' : 'text-clamp-kpi-sm'}`}>
          {value}
        </div>
        
        {/* Label: smaller text secondary, sentence case */}
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-warm-600 mt-1.5 font-sans">
          {label}
        </div>
      </div>
    </div>
  );
}
