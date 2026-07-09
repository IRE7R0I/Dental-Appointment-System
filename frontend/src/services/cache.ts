import type { ResumenCaja, Deudor, Turno, Doctor, TratamientoCatalogo, ObraSocial } from '../types';

export const globalCache = {
  pagos: {
    caja: null as ResumenCaja | null,
    deudores: [] as Deudor[],
  },
  dashboard: {
    caja: null as ResumenCaja | null,
    turnos: [] as Turno[],
    doctores: [] as Doctor[],
  },
  catalogo: {
    tratamientos: [] as TratamientoCatalogo[],
    obrasSociales: [] as ObraSocial[],
    hasLoaded: false,
  },
  clear() {
    this.pagos.caja = null;
    this.pagos.deudores = [];
    this.dashboard.caja = null;
    this.dashboard.turnos = [];
    this.dashboard.doctores = [];
    this.catalogo.tratamientos = [];
    this.catalogo.obrasSociales = [];
    this.catalogo.hasLoaded = false;
  }
};
