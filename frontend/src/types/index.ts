export type Moneda = 'ARS' | 'USD';

export interface Paciente {
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  obra_social?: string;
}

export interface Doctor {
  id: number;
  nombre: string;
  color_agenda?: string;
}

export interface Turno {
  id: number;
  fecha_hora: string;
  duracion_minutos?: number;
  motivo?: string;
  estado: string;
  dni_paciente: string;
  id_doctor: number;
  paciente?: Paciente;
  doctor?: Doctor;
}

export interface Pago {
  id: number;
  monto: number;
  metodo_pago: string;
  id_turno: number;
  moneda: Moneda;
  fecha_pago: string;
}

export interface ResumenCaja {
  turnos_realizados: number;
  turnos_pendientes: number;
  turnos_cancelados: number;
  ingresos_ars: number;
  ingresos_usd: number;
  total_ingresos: number;
}

export interface Deudor {
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  saldo_ars: number;
  saldo_usd: number;
  obra_social?: string;
}

export interface CerrarTurnoInput {
  tratamientos: TratamientoInput[];
  pagos: PagoInput[];
  comentarios?: string;
}

export interface TratamientoInput {
  nombre: string;
  cantidad: number;
  precio_ars?: number;
  precio_usd?: number;
}

export interface PagoInput {
  monto: number;
  moneda: Moneda;
  metodo_pago: string;
}

export interface CuentaCorrienteResponse {
  paciente: Paciente;
  saldo_ars: number;
  saldo_usd: number;
  movimientos: Array<{
    fecha: string;
    concepto: string;
    tipo: 'debito' | 'credito';
    monto_ars?: number;
    monto_usd?: number;
  }>;
}

export interface CerrarTurnoResponse {
  turno_id: number;
  estado: string;
  total_ars: number;
  total_usd: number;
  pagado_ars: number;
  pagado_usd: number;
  deuda_ars: number;
  deuda_usd: number;
}

export interface TratamientoFormItem {
  nombre: string;
  precio: number;
  moneda: Moneda;
}

export interface PagoFormItem {
  monto: number;
  moneda: Moneda;
  metodo: string;
}

export interface HistorialTratamientoResponse {
  nombre: string;
  cantidad: number;
  precio_ars?: number;
  precio_usd?: number;
}

export interface PagoEnHistorialResponse {
  id: number;
  fecha: string;
  monto: number;
  moneda: string;
  metodo_pago: string;
}

export interface HistorialTurnoItemResponse {
  id: number;
  fecha_hora: string;
  estado: string;
  doctor: { id: number; nombre: string };
  tratamientos: HistorialTratamientoResponse[];
  total_ars: number;
  total_usd: number;
  pagos: PagoEnHistorialResponse[];
  total_pagado_ars: number;
  total_pagado_usd: number;
  saldo_ars: number;
  saldo_usd: number;
  motivo?: string;
}

export interface TotalesHistorial {
  total_tratamientos_ars: number;
  total_tratamientos_usd: number;
  total_pagado_ars: number;
  total_pagado_usd: number;
  saldo_ars: number;
  saldo_usd: number;
}

export interface HistorialPacienteResponse {
  dni_paciente: string;
  nombre: string;
  apellido: string;
  saldo_ars: number;
  saldo_usd: number;
  turnos: HistorialTurnoItemResponse[];
  totales: TotalesHistorial;
}

export interface PagoContextoResponse {
  id: number;
  fecha_pago: string;
  monto: number;
  moneda: string;
  metodo_pago: string;
  id_turno: number | null;
  dni_paciente: string | null;
  paciente: { dni: string; nombre: string; apellido: string; obra_social?: string } | null;
  doctor: { id: number; nombre: string } | null;
  notas?: string;
}

export interface TratamientoCatalogo {
  id: number;
  nombre: string;
  precio_ars?: number;
  precio_usd?: number;
  duracion_minutos: number;
  categoria?: string;
  activo: boolean;
}

export interface ObraSocial {
  id: number;
  nombre: string;
  activo: boolean;
}