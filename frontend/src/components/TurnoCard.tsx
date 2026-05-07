import type { Turno } from '../types';

const estadoIcons: Record<string, string> = {
  realizado: 'check_circle',
  pendiente: 'schedule',
  cancelado: 'cancel',
};

const estadoColors: Record<string, string> = {
  realizado: 'text-emerald-500',
  pendiente: 'text-amber-500',
  cancelado: 'text-red-400',
};

interface TurnoCardProps {
  turno: Turno;
  doctorColor: string;
  onClick: (turno: Turno) => void;
  style?: React.CSSProperties;
}

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function TurnoCard({ turno, onClick, style }: TurnoCardProps) {
  const pacienteNombre = turno.paciente
    ? `${turno.paciente.nombre} ${turno.paciente.apellido} - DNI ${turno.paciente.dni}`
    : `DNI ${turno.dni_paciente}`;

  return (
    <button
      onClick={() => onClick(turno)}
      style={style}
      className="absolute left-1 right-1 bg-white rounded-xl border-l-[5px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-3 cursor-pointer text-left overflow-hidden group animate-fade-slide-up min-h-[60px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">
            {pacienteNombre}
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {turno.motivo || 'Sin motivo'}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {formatHour(turno.fecha_hora)}
          </p>
        </div>
        <span className={`material-symbols-rounded text-lg ${estadoColors[turno.estado] || 'text-slate-400'} shrink-0`}>
          {estadoIcons[turno.estado] || 'help'}
        </span>
      </div>
    </button>
  );
}