import axios from 'axios';
import type {
  Paciente, Turno, Doctor, ResumenCaja, Deudor,
  CerrarTurnoInput, CerrarTurnoResponse, CuentaCorrienteResponse
} from '../types';

const api = axios.create({ baseURL: '/api' });

export const getPacientes = () => api.get<Paciente[]>('/pacientes/').then(r => r.data);
export const getPaciente = (dni: string) => api.get<Paciente>(`/pacientes/${dni}`).then(r => r.data);
export const crearPaciente = (data: Partial<Paciente>) => api.post<Paciente>('/pacientes/', data).then(r => r.data);
export const actualizarPaciente = (dni: string, data: Partial<Paciente>) => api.put<Paciente>(`/pacientes/${dni}`, data).then(r => r.data);
export const getDeudores = () => api.get<Deudor[]>('/pacientes/deudores').then(r => r.data);

export const getTurnos = (params?: { fecha?: string; id_doctor?: number; paciente_dni?: string }) =>
  api.get<Turno[]>('/turnos/', { params }).then(r => r.data);
export const getTurnosHoy = () => api.get<Turno[]>('/turnos/hoy').then(r => r.data);
export const crearTurno = (data: { fecha_hora: string; motivo?: string; dni_paciente: string; id_doctor: number }) =>
  api.post<Turno>('/turnos/', data).then(r => r.data);
export const cerrarTurno = (id: number, data: CerrarTurnoInput) =>
  api.put<CerrarTurnoResponse>(`/turnos/${id}/cerrar`, data).then(r => r.data);

export const cancelarTurno = (id: number) =>
  api.patch<Turno>(`/turnos/${id}/cancelar`).then(r => r.data);

export const getDoctores = () => api.get<Doctor[]>('/doctores/').then(r => r.data);

export const getCajaHoy = () => api.get<ResumenCaja>('/finanzas/caja/hoy').then(r => r.data);

export const getCuentaCorriente = (dni: string) =>
  api.get(`/pacientes/${dni}/cuenta`).then(r => r.data as CuentaCorrienteResponse);

export const registrarPago = (data: { monto: number; moneda: string; metodo_pago: string; id_turno?: number; notas?: string }) =>
  api.post('/finanzas/pagos', data).then(r => r.data);

export default api;