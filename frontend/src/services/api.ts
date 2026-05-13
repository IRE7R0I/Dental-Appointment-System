import axios from 'axios';
import type {
  Paciente, Turno, Doctor, ResumenCaja, Deudor,
  CerrarTurnoInput, CerrarTurnoResponse, CuentaCorrienteResponse,
  HistorialPacienteResponse, PagoContextoResponse, TratamientoCatalogo, ObraSocial
} from '../types';
import { requestInterceptor, responseErrorInterceptor } from './interceptors';

const api = axios.create({ baseURL: '/api' });

// ── Interceptores JWT (CHANGE-009) ────────────────────────
api.interceptors.request.use(requestInterceptor);
api.interceptors.response.use(undefined, responseErrorInterceptor);

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

export const registrarPago = (data: { monto: number; moneda: string; metodo_pago: string; id_turno?: number; dni_paciente?: string; notas?: string }) =>
  api.post('/finanzas/pagos', data).then(r => r.data);

export const getHistorialPaciente = (
  dni: string,
  params?: { fecha_desde?: string; fecha_hasta?: string }
) => {
  const searchParams = new URLSearchParams();
  searchParams.append('dni', dni);
  if (params?.fecha_desde) searchParams.append('fecha_desde', params.fecha_desde);
  if (params?.fecha_hasta) searchParams.append('fecha_hasta', params.fecha_hasta);
  return api.get<HistorialPacienteResponse>(`/pacientes/historial?${searchParams.toString()}`).then(r => r.data);
};

export const getPagos = (params?: {
  fecha_desde?: string;
  fecha_hasta?: string;
  metodo_pago?: string;
  dni_paciente?: string;
  id_doctor?: number;
  solo_deudores?: boolean;
}) => api.get<PagoContextoResponse[]>('/finanzas/pagos', { params }).then(r => r.data);

export const getTratamientosCatalogo = () =>
  api.get<TratamientoCatalogo[]>('/catalogo/tratamientos').then(r => r.data);

export const getObrasSociales = () =>
  api.get<ObraSocial[]>('/catalogo/obras-sociales').then(r => r.data);

export default api;