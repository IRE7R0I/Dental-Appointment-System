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
}

export interface CerrarTurnoInput {
  tratamientos: TratamientoInput[];
  pagos: PagoInput[];
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