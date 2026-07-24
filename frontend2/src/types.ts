export interface Usuario {
  id: number;
  username: string;
  rol: 'admin' | 'secretaria';
  activo: boolean;
  creado_en: string;
}

export interface Paciente {
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  obra_social?: string;
  genero?: string; // e.g. 'Femenino', 'Masculino', 'Otro'
  alertas?: string; // Comma separated alerts
}

export interface EvolucionClinica {
  id: number;
  dni_paciente: string;
  fecha: string;
  id_turno?: number | null;
  pieza_dental?: number | null;
  ubicacion_lesion?: string | null;
  observaciones: string;
  conformidad_paciente?: boolean;
  creado_en?: string;
}

export interface Doctor {
  id: number;
  nombre: string;
  color_agenda: string;
  activo: boolean;
  matricula?: string;
  telefono?: string;
  email?: string;
}

export interface Turno {
  id: number;
  fecha_hora: string; // ISO
  duracion_minutos: number;
  motivo?: string;
  estado: 'Pendiente' | 'Realizado' | 'Cancelado';
  dni_paciente: string;
  id_doctor: number;
  paciente?: string; // mapped in API
  doctor_nombre?: string; // mapped in API
  doctor_color?: string; // mapped in API
  tratamientos?: TurnoTratamiento[];
  pagos?: Pago[];
  motivo_cancelacion?: string;
  comentarios_medicos?: string;
  pieza_dental?: number | null;
  ubicacion_lesion?: string | null;
  conformidad_paciente?: boolean | null;
}

export interface TurnoTratamiento {
  id: number;
  id_turno: number;
  nombre: string;
  cantidad: number;
  precio_ars: number;
  precio_usd: number;
}

export interface Pago {
  id: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  moneda: 'ARS' | 'USD';
  saldo_pendiente: number;
  dni_paciente: string;
  id_turno: number | null;
  paciente_nombre?: string; // mapped in API
  constancia_turno?: string; // mapped in API
}

export interface CuentaCorriente {
  id: number;
  dni_paciente: string;
  saldo_ars: number;
  saldo_usd: number;
  ultima_actualizacion: string;
}

export interface MovimientoCuenta {
  id: number;
  id_cuenta: number;
  tipo: 'cargo' | 'pago';
  monto: number;
  moneda: 'ARS' | 'USD';
  descripcion: string;
  fecha: string;
}

export interface HistoriaClinica {
  id: number;
  notas: string;
  ultima_actualizacion: string;
  dni_paciente: string;
}

export interface TratamientoCatalogo {
  id: number;
  nombre: string;
  precio_ars: number;
  precio_usd: number;
  duracion_minutos: number;
  categoria: string;
  activo: boolean;
}

export interface ObraSocial {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface SlotBloqueado {
  id: number;
  fecha: string;
  hora: string;
  id_doctor: number;
  motivo: string;
  bloqueado_por_id: number;
  creado_en: string;
}

export interface SlotResponse {
  hora: string;
  estado: 'libre' | 'ocupado' | 'bloqueado';
  slot_bloqueado_id?: number;
  turno_id?: number;
  paciente?: string;
  motivo?: string;
}
