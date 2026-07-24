import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

// --- DATABASE TYPES ---
interface Usuario {
  id: number;
  username: string;
  hashed_password: string;
  rol: 'admin' | 'secretaria';
  activo: boolean;
  creado_en: string;
}

interface Paciente {
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  obra_social?: string;
  genero?: string;
  alertas?: string;
}

interface Doctor {
  id: number;
  nombre: string;
  color_agenda: string;
  activo: boolean;
}

interface Turno {
  id: number;
  fecha_hora: string; // ISO
  duracion_minutos: number;
  motivo?: string;
  estado: 'Pendiente' | 'Realizado' | 'Cancelado';
  dni_paciente: string;
  id_doctor: number;
  motivo_cancelacion?: string;
  comentarios_medicos?: string;
  pieza_dental?: number | null;
  ubicacion_lesion?: string | null;
  conformidad_paciente?: boolean | null;
}

interface TurnoTratamiento {
  id: number;
  id_turno: number;
  nombre: string;
  cantidad: number;
  precio_ars: number;
  precio_usd: number;
}

interface Pago {
  id: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  moneda: 'ARS' | 'USD';
  saldo_pendiente: number;
  dni_paciente: string;
  id_turno: number | null;
}

interface CuentaCorriente {
  id: number;
  dni_paciente: string;
  saldo_ars: number;
  saldo_usd: number;
  ultima_actualizacion: string;
}

interface MovimientoCuenta {
  id: number;
  id_cuenta: number;
  tipo: 'cargo' | 'pago';
  monto: number;
  moneda: 'ARS' | 'USD';
  descripcion: string;
  fecha: string;
}

interface HistoriaClinica {
  id: number;
  notas: string;
  ultima_actualizacion: string;
  dni_paciente: string;
}

interface EvolucionClinica {
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

interface TratamientoCatalogo {
  id: number;
  nombre: string;
  precio_ars: number;
  precio_usd: number;
  duracion_minutos: number;
  categoria: string;
  activo: boolean;
}

interface ObraSocial {
  id: number;
  nombre: string;
  activo: boolean;
}

interface SlotBloqueado {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  id_doctor: number;
  motivo: string;
  bloqueado_por_id: number;
  creado_en: string;
}

interface PacienteImagen {
  id: number;
  dni_paciente: string;
  nombre: string;
  url: string;
  carpeta: string;
  es_radiografia: boolean;
  creado_en: string;
}

interface DbState {
  usuarios: Usuario[];
  pacientes: Paciente[];
  doctores: Doctor[];
  turnos: Turno[];
  turnos_tratamientos: TurnoTratamiento[];
  pagos: Pago[];
  cuentas_corrientes: CuentaCorriente[];
  movimientos_cuenta: MovimientoCuenta[];
  historias_clinicas: HistoriaClinica[];
  tratamientos_catalogo: TratamientoCatalogo[];
  obras_sociales: ObraSocial[];
  slots_bloqueados: SlotBloqueado[];
  pacientes_imagenes?: PacienteImagen[];
  evoluciones?: EvolucionClinica[];
  horarios_doctores?: { [id_doctor: string]: any };
  dias_no_laborables_doctores?: { [id_doctor: string]: string[] };
}

let db: DbState = {
  usuarios: [],
  pacientes: [],
  doctores: [],
  turnos: [],
  turnos_tratamientos: [],
  pagos: [],
  cuentas_corrientes: [],
  movimientos_cuenta: [],
  historias_clinicas: [],
  tratamientos_catalogo: [],
  obras_sociales: [],
  slots_bloqueados: [],
  pacientes_imagenes: [],
  horarios_doctores: {},
  dias_no_laborables_doctores: {}
};

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + "odonto_salt_123").digest('hex');
}

function seedDb() {
  db = {
    usuarios: [
      {
        id: 1,
        username: "admin",
        hashed_password: hashPassword("admin123"),
        rol: "admin",
        activo: true,
        creado_en: new Date().toISOString()
      },
      {
        id: 2,
        username: "secretaria",
        hashed_password: hashPassword("sec123"),
        rol: "secretaria",
        activo: true,
        creado_en: new Date().toISOString()
      }
    ],
    pacientes: [
      {
        dni: "12345678",
        nombre: "Juan",
        apellido: "Pérez",
        fecha_nacimiento: "1985-05-12",
        telefono: "11-2233-4455",
        email: "juan.perez@example.com",
        obra_social: "OSDE"
      },
      {
        dni: "87654321",
        nombre: "María",
        apellido: "González",
        fecha_nacimiento: "1990-11-23",
        telefono: "11-9988-7766",
        email: "maria.g@example.com",
        obra_social: "Particular"
      }
    ],
    doctores: [
      { id: 1, nombre: "Dr. Darío", color_agenda: "#1D9E75", activo: true },
      { id: 2, nombre: "Dra. Fabiana", color_agenda: "#5DCAA5", activo: true },
      { id: 3, nombre: "Dr. Marcelo", color_agenda: "#9FE1CB", activo: true }
    ],
    turnos: [],
    turnos_tratamientos: [],
    pagos: [],
    cuentas_corrientes: [
      {
        id: 1,
        dni_paciente: "12345678",
        saldo_ars: 0,
        saldo_usd: 0,
        ultima_actualizacion: new Date().toISOString()
      },
      {
        id: 2,
        dni_paciente: "87654321",
        saldo_ars: 0,
        saldo_usd: 0,
        ultima_actualizacion: new Date().toISOString()
      }
    ],
    movimientos_cuenta: [],
    historias_clinicas: [
      {
        id: 1,
        notas: "Paciente asiste a consulta inicial de diagnóstico. Se observa caries en molar inferior izquierdo.",
        ultima_actualizacion: new Date().toISOString(),
        dni_paciente: "12345678"
      },
      {
        id: 2,
        notas: "Control general realizado. Encías sanas, se recomienda limpieza dental en la próxima sesión.",
        ultima_actualizacion: new Date().toISOString(),
        dni_paciente: "87654321"
      }
    ],
    tratamientos_catalogo: [
      { id: 1, nombre: "Consulta Diagnóstica", precio_ars: 5000, precio_usd: 10, duracion_minutos: 30, categoria: "General", activo: true },
      { id: 2, nombre: "Limpieza Dental y Fluoración", precio_ars: 8000, precio_usd: 15, duracion_minutos: 30, categoria: "General", activo: true },
      { id: 3, nombre: "Extracción Simple", precio_ars: 12000, precio_usd: 25, duracion_minutos: 30, categoria: "Cirugía", activo: true },
      { id: 4, nombre: "Tratamiento de Conducto (Endodoncia)", precio_ars: 25000, precio_usd: 50, duracion_minutos: 60, categoria: "Endodoncia", activo: true },
      { id: 5, nombre: "Resina Composite (Arreglo)", precio_ars: 10000, precio_usd: 20, duracion_minutos: 30, categoria: "Restauradora", activo: true },
      { id: 6, nombre: "Implante Dental", precio_ars: 150000, precio_usd: 300, duracion_minutos: 60, categoria: "Implantología", activo: true },
      { id: 7, nombre: "Ortodoncia Mensualidad", precio_ars: 15000, precio_usd: 30, duracion_minutos: 30, categoria: "Ortodoncia", activo: true }
    ],
    obras_sociales: [
      { id: 1, nombre: "Particular", activo: true },
      { id: 2, nombre: "OSDE", activo: true },
      { id: 3, ...{ nombre: "Swiss Medical", activo: true } },
      { id: 4, nombre: "Galeno", activo: true },
      { id: 5, nombre: "Medicus", activo: true },
      { id: 6, nombre: "Sancor Salud", activo: true },
      { id: 7, nombre: "OMINT", activo: true }
    ],
    slots_bloqueados: [],
    pacientes_imagenes: []
  };
  saveDb();
}

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db.pacientes_imagenes) {
        db.pacientes_imagenes = [];
      }
      if (!db.horarios_doctores) {
        db.horarios_doctores = {};
      }
      if (!db.dias_no_laborables_doctores) {
        db.dias_no_laborables_doctores = {};
      }
    } catch (e) {
      console.error("Error loading db, seeding...", e);
      seedDb();
    }
  } else {
    seedDb();
  }
  injectMockCase();
  injectTodayMockData();
}

function injectMockCase() {
  if (!db.pacientes) db.pacientes = [];
  if (!db.cuentas_corrientes) db.cuentas_corrientes = [];
  if (!db.turnos) db.turnos = [];
  if (!db.turnos_tratamientos) db.turnos_tratamientos = [];
  if (!db.pagos) db.pagos = [];
  if (!db.movimientos_cuenta) db.movimientos_cuenta = [];
  if (!db.historias_clinicas) db.historias_clinicas = [];

  const targetDni = "45123890";
  if (!db.pacientes.some(p => p.dni === targetDni)) {
    // 1. Patient Info
    db.pacientes.push({
      dni: targetDni,
      nombre: "Carlos Eduardo",
      apellido: "de la Vega",
      fecha_nacimiento: "1994-08-14",
      telefono: "11-5462-8899",
      email: "carlos.delavega@example.com",
      obra_social: "Particular"
    });

    // 2. Account Current Setup (Outstanding balance of $15,000 ARS and U$S 30)
    const ccId = db.cuentas_corrientes.length ? Math.max(...db.cuentas_corrientes.map(c => c.id)) + 1 : 1;
    db.cuentas_corrientes.push({
      id: ccId,
      dni_paciente: targetDni,
      saldo_ars: 15000,
      saldo_usd: 30,
      ultima_actualizacion: "2026-07-01T15:30:00.000Z"
    });

    // 3. Completed Appointment (Turno)
    const tId = db.turnos.length ? Math.max(...db.turnos.map(x => x.id)) + 1 : 100;
    db.turnos.push({
      id: tId,
      fecha_hora: "2026-07-01T13:00:00.000Z",
      duracion_minutos: 60,
      motivo: "Tratamiento de Conducto y Restauración",
      estado: "Realizado",
      id_doctor: 1,
      dni_paciente: targetDni
    });

    // 4. Treatments performed in that session
    const ttId1 = db.turnos_tratamientos.length ? Math.max(...db.turnos_tratamientos.map(x => x.id)) + 1 : 200;
    db.turnos_tratamientos.push({
      id: ttId1,
      id_turno: tId,
      nombre: "Tratamiento de Conducto (Endodoncia)",
      cantidad: 1,
      precio_ars: 25000,
      precio_usd: 50
    });

    const ttId2 = ttId1 + 1;
    db.turnos_tratamientos.push({
      id: ttId2,
      id_turno: tId,
      nombre: "Resina Composite (Arreglo)",
      cantidad: 1,
      precio_ars: 10000,
      precio_usd: 20
    });

    // 5. Registered Payments (Abonos)
    const pId1 = db.pagos.length ? Math.max(...db.pagos.map(x => x.id)) + 1 : 300;
    db.pagos.push({
      id: pId1,
      monto: 20000,
      fecha_pago: "2026-07-01T14:15:00.000Z",
      metodo_pago: "Efectivo",
      moneda: "ARS",
      saldo_pendiente: 0,
      dni_paciente: targetDni,
      id_turno: tId
    });

    const pId2 = pId1 + 1;
    db.pagos.push({
      id: pId2,
      monto: 40,
      fecha_pago: "2026-07-01T14:18:00.000Z",
      metodo_pago: "Transferencia",
      moneda: "USD",
      saldo_pendiente: 0,
      dni_paciente: targetDni,
      id_turno: tId
    });

    // 6. Account ledger movements (Cargos and Pagos)
    const mId1 = db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 400;
    db.movimientos_cuenta.push({
      id: mId1,
      id_cuenta: ccId,
      tipo: "cargo",
      monto: 35000,
      moneda: "ARS",
      descripcion: `Cargo por tratamientos en turno cerrado (ID: ${tId})`,
      fecha: "2026-07-01T14:10:00.000Z"
    });

    const mId2 = mId1 + 1;
    db.movimientos_cuenta.push({
      id: mId2,
      id_cuenta: ccId,
      tipo: "pago",
      monto: 20000,
      moneda: "ARS",
      descripcion: `Abono imputado a turno ID: ${tId}`,
      fecha: "2026-07-01T14:15:00.000Z"
    });

    const mId3 = mId1 + 2;
    db.movimientos_cuenta.push({
      id: mId3,
      id_cuenta: ccId,
      tipo: "cargo",
      monto: 70,
      moneda: "USD",
      descripcion: `Cargo por tratamientos en turno cerrado (ID: ${tId})`,
      fecha: "2026-07-01T14:10:00.000Z"
    });

    const mId4 = mId1 + 3;
    db.movimientos_cuenta.push({
      id: mId4,
      id_cuenta: ccId,
      tipo: "pago",
      monto: 40,
      moneda: "USD",
      descripcion: `Abono imputado a turno ID: ${tId}`,
      fecha: "2026-07-01T14:18:00.000Z"
    });

    // 7. Clinical history entries
    const hId = db.historias_clinicas.length ? Math.max(...db.historias_clinicas.map(x => x.id)) + 1 : 300;
    db.historias_clinicas.push({
      id: hId,
      notas: "Tratamiento de conducto realizado con éxito en pieza 46 (molar inferior derecho). Se coloca perno de resina composite provisoria. Paciente refiere excelente tolerancia. Queda pendiente el control de la endodoncia y colocación de corona definitiva.",
      ultima_actualizacion: "2026-07-01T15:00:00.000Z",
      dni_paciente: targetDni
    });

    saveDb();
    console.log("Mock clinical case for Carlos Eduardo de la Vega generated successfully!");
  }
}

function injectTodayMockData() {
  const todayStr = getTodayArgentinaDateStr(); // YYYY-MM-DD
  const hasTodayTurnos = db.turnos.some(t => t.fecha_hora && t.fecha_hora.startsWith(todayStr));
  if (!hasTodayTurnos) {
    console.log(`No appointments found for today (${todayStr}). Injecting fresh mock appointments for today...`);
    
    // Ensure we have patients
    if (!db.pacientes.some(p => p.dni === "12345678")) {
      db.pacientes.push({
        dni: "12345678",
        nombre: "Juan",
        apellido: "Pérez",
        fecha_nacimiento: "1985-05-12",
        telefono: "11-2233-4455",
        email: "juan.perez@example.com",
        obra_social: "OSDE"
      });
    }
    if (!db.pacientes.some(p => p.dni === "87654321")) {
      db.pacientes.push({
        dni: "87654321",
        nombre: "María",
        apellido: "González",
        fecha_nacimiento: "1990-11-23",
        telefono: "11-9988-7766",
        email: "maria.g@example.com",
        obra_social: "Particular"
      });
    }
    if (!db.pacientes.some(p => p.dni === "45123890")) {
      db.pacientes.push({
        dni: "45123890",
        nombre: "Carlos Eduardo",
        apellido: "de la Vega",
        fecha_nacimiento: "1994-08-14",
        telefono: "11-5462-8899",
        email: "carlos.delavega@example.com",
        obra_social: "Particular"
      });
    }

    // 1. Inject: 09:30 - Carlos Eduardo (Realizado)
    const tId1 = db.turnos.length ? Math.max(...db.turnos.map(x => x.id)) + 1 : 1000;
    db.turnos.push({
      id: tId1,
      fecha_hora: `${todayStr}T09:30:00.000Z`,
      duracion_minutos: 30,
      motivo: "Limpieza Dental y Fluoración",
      estado: "Realizado",
      id_doctor: 1,
      dni_paciente: "45123890"
    });
    
    // Add treatment
    const ttId1 = db.turnos_tratamientos.length ? Math.max(...db.turnos_tratamientos.map(x => x.id)) + 1 : 2000;
    db.turnos_tratamientos.push({
      id: ttId1,
      id_turno: tId1,
      nombre: "Limpieza Dental y Fluoración",
      cantidad: 1,
      precio_ars: 8000,
      precio_usd: 15
    });
    
    // Add payment
    const payId1 = db.pagos.length ? Math.max(...db.pagos.map(x => x.id)) + 1 : 3000;
    db.pagos.push({
      id: payId1,
      monto: 8000,
      fecha_pago: `${todayStr}T09:50:00.000Z`,
      metodo_pago: "Efectivo",
      moneda: "ARS",
      saldo_pendiente: 0,
      dni_paciente: "45123890",
      id_turno: tId1
    });
    
    // Add ledger account
    let acc = db.cuentas_corrientes.find(c => c.dni_paciente === "45123890");
    if (!acc) {
      const ccId = db.cuentas_corrientes.length ? Math.max(...db.cuentas_corrientes.map(c => c.id)) + 1 : 1;
      acc = {
        id: ccId,
        dni_paciente: "45123890",
        saldo_ars: 0,
        saldo_usd: 0,
        ultima_actualizacion: new Date().toISOString()
      };
      db.cuentas_corrientes.push(acc);
    }
    
    const mId1 = db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 4000;
    db.movimientos_cuenta.push({
      id: mId1,
      id_cuenta: acc.id,
      tipo: "cargo",
      monto: 8000,
      moneda: "ARS",
      descripcion: `Cargo por Limpieza Dental en turno cerrado (ID: ${tId1})`,
      fecha: `${todayStr}T09:40:00.000Z`
    });
    db.movimientos_cuenta.push({
      id: mId1 + 1,
      id_cuenta: acc.id,
      tipo: "pago",
      monto: 8000,
      moneda: "ARS",
      descripcion: `Abono imputado a turno ID: ${tId1}`,
      fecha: `${todayStr}T09:50:00.000Z`
    });

    // 2. Inject: 11:30 - Juan Pérez (Pendiente) with Dra. Fabiana (id: 2)
    const tId2 = tId1 + 1;
    db.turnos.push({
      id: tId2,
      fecha_hora: `${todayStr}T11:30:00.000Z`,
      duracion_minutos: 30,
      motivo: "Ortodoncia Control",
      estado: "Pendiente",
      id_doctor: 2,
      dni_paciente: "12345678"
    });
    
    // 3. Inject: 16:00 - María González (Pendiente) with Dr. Darío (id: 1)
    const tId3 = tId1 + 2;
    db.turnos.push({
      id: tId3,
      fecha_hora: `${todayStr}T16:00:00.000Z`,
      duracion_minutos: 30,
      motivo: "Consulta Diagnóstica",
      estado: "Pendiente",
      id_doctor: 1,
      dni_paciente: "87654321"
    });
    
    saveDb();
    console.log("Mock appointments for today injected successfully!");
  }
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

loadDb();

// --- AUTH & JWT SECURITY ---
const JWT_SECRET = process.env.GEMINI_API_KEY || "odonto_secret_key_998877";

function createToken(payload: any, expiryDays: number = 7): string {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + (expiryDays * 24 * 60 * 60);
  const fullPayload = { ...payload, exp };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${encodedHeader}.${encodedPayload}`);
  const signature = hmac.digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(`${header}.${payload}`);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decodedPayload;
  } catch (e) {
    return null;
  }
}

function requireAuth(roles: string[] = ["admin", "secretaria"]) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No autorizado. Token inexistente o inválido." });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Token inválido o expirado." });
    }
    
    const user = db.usuarios.find(u => u.username === payload.sub && u.activo);
    if (!user) {
      return res.status(401).json({ error: "Usuario inactivo o inexistente." });
    }
    
    if (!roles.includes(user.rol)) {
      return res.status(403).json({ error: "Acceso denegado. Permisos insuficientes." });
    }
    
    req.user = user;
    next();
  };
}

// --- TIMEZONE & SLOTS UTILITIES ---
function getARTime(fechaHoraStr: string) {
  if (!fechaHoraStr || typeof fechaHoraStr !== 'string') {
    return { year: 2026, month: 1, day: 1, hour: 0, minute: 0, dayOfWeek: 0 };
  }

  try {
    const hasTZ = fechaHoraStr.endsWith('Z') || fechaHoraStr.includes('+') || (fechaHoraStr.includes('-') && fechaHoraStr.split('T')[1]?.includes('-'));
    if (!hasTZ) {
      // Local ISO string without offset (e.g. "2026-07-20T08:30:00")
      // Split parts directly to stay independent of server timezone.
      const [datePart, timePart] = fechaHoraStr.split('T');
      if (!datePart || !timePart) {
        const date = new Date(fechaHoraStr);
        if (isNaN(date.getTime())) {
          return { year: 2026, month: 1, day: 1, hour: 0, minute: 0, dayOfWeek: 0 };
        }
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hour = date.getHours();
        const minute = date.getMinutes();
        const dayOfWeek = date.getDay();
        return { year, month, day, hour, minute, dayOfWeek };
      }
      
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      const dUTC = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = dUTC.getUTCDay();
      return { year, month, day, hour, minute, dayOfWeek };
    }

    const date = new Date(fechaHoraStr);
    if (isNaN(date.getTime())) {
      return { year: 2026, month: 1, day: 1, hour: 0, minute: 0, dayOfWeek: 0 };
    }
    // Adjust UTC timestamp to Buenos Aires time (UTC-3)
    const arTimestamp = date.getTime() - (3 * 60 * 60 * 1000);
    const arDate = new Date(arTimestamp);
    
    const year = arDate.getUTCFullYear();
    const month = arDate.getUTCMonth() + 1;
    const day = arDate.getUTCDate();
    const hour = arDate.getUTCHours();
    const minute = arDate.getUTCMinutes();
    const dayOfWeek = arDate.getUTCDay();
    
    return { year, month, day, hour, minute, dayOfWeek };
  } catch (e) {
    console.error("Error formatting getARTime:", e);
    return { year: 2026, month: 1, day: 1, hour: 0, minute: 0, dayOfWeek: 0 };
  }
}

function getTodayArgentinaDateStr(): string {
  try {
    const ar = getARTime(new Date().toISOString());
    return `${ar.year}-${String(ar.month).padStart(2, '0')}-${String(ar.day).padStart(2, '0')}`;
  } catch (e) {
    console.error("Error formatting Argentina date:", e);
  }
  return new Date().toISOString().split('T')[0];
}

function obtener_slots_doctor(idDoc: number, dateStr: string): string[] {
  if (db.dias_no_laborables_doctores && db.dias_no_laborables_doctores[String(idDoc)]) {
    if (db.dias_no_laborables_doctores[String(idDoc)].includes(dateStr)) {
      return [];
    }
  }

  const defaultSchedule = {
    dias: {
      "lunes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "martes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "miercoles": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "jueves": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "viernes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "sabado": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "domingo": null
    },
    duracion_turno: 30
  };

  const schedule = (db.horarios_doctores && db.horarios_doctores[String(idDoc)]) || defaultSchedule;
  
  // Clean timezone-independent weekday extraction from dateStr (YYYY-MM-DD)
  const [yr, mn, dy] = dateStr.split('-').map(Number);
  const dUTC = new Date(Date.UTC(yr, mn - 1, dy));
  const dayNum = dUTC.getUTCDay();
  const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dayName = dayNames[dayNum];

  const dayConfig = schedule.dias ? (schedule.dias[dayName] !== undefined ? schedule.dias[dayName] : schedule.dias[String(dayNum)]) : null;
  if (!dayConfig) {
    return [];
  }

  const slots: string[] = [];
  const duracion = schedule.duracion_turno || 30;

  const procesarFranja = (rango: any) => {
    if (!rango) return;
    let startStr = "";
    let endStr = "";
    if (Array.isArray(rango)) {
      startStr = rango[0];
      endStr = rango[1];
    } else if (typeof rango === 'object') {
      startStr = rango.inicio;
      endStr = rango.fin;
    }
    if (!startStr || !endStr) return;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    
    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    
    while (currentMin < endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      currentMin += duracion;
    }
  };

  procesarFranja(dayConfig.manana || dayConfig.mañana);
  procesarFranja(dayConfig.tarde);

  return slots;
}

function es_hora_valida(fechaHoraStr: string, duracionMinutos: number = 30, idDoctor?: number) {
  const dateStr = fechaHoraStr.split('T')[0];
  const ar = getARTime(fechaHoraStr);
  const { dayOfWeek, hour, minute } = ar;
  const dayOfWeekStr = String(dayOfWeek);

  if (idDoctor && db.dias_no_laborables_doctores && db.dias_no_laborables_doctores[String(idDoctor)]) {
    if (db.dias_no_laborables_doctores[String(idDoctor)].includes(dateStr)) {
      return { valida: false, motivo: "El doctor no atiende en la fecha seleccionada por licencia o día no laborable." };
    }
  }

  const defaultSchedule = {
    dias: {
      "lunes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "martes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "miercoles": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "jueves": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "viernes": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "sabado": { "manana": { "inicio": "08:00", "fin": "21:00" }, "tarde": null },
      "domingo": null
    },
    duracion_turno: 30
  };

  const schedule = (idDoctor && db.horarios_doctores && db.horarios_doctores[String(idDoctor)]) || defaultSchedule;
  const dayNames = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const dayName = dayNames[dayOfWeek];
  const dayConfig = schedule.dias ? (schedule.dias[dayName] !== undefined ? schedule.dias[dayName] : schedule.dias[dayOfWeekStr]) : null;

  if (!dayConfig) {
    return { valida: false, motivo: "El doctor no atiende en el día de la semana seleccionado." };
  }

  const duracionTurno = schedule.duracion_turno || 30;
  if (minute % duracionTurno !== 0) {
    return { valida: false, motivo: `Los turnos deben agendarse con granularidad de ${duracionTurno} minutos.` };
  }

  const totalMinutosInicio = hour * 60 + minute;
  const totalMinutosFin = totalMinutosInicio + duracionMinutos;

  const comprobarFranja = (rango: [string, string] | null) => {
    if (!rango) return false;
    const [startStr, endStr] = rango;
    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    return (totalMinutosInicio >= startMin && totalMinutosFin <= endMin);
  };

  const enMañana = comprobarFranja(dayConfig.mañana);
  const enTarde = comprobarFranja(dayConfig.tarde);

  if (!enMañana && !enTarde) {
    return { valida: false, motivo: "El horario seleccionado está fuera de la franja de atención del doctor." };
  }

  return { valida: true };
}

// --- API ENDPOINTS ---

// 1. --- AUTHENTICATION ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(401).json({ error: "Debe ingresar usuario y contraseña." });
  }
  const user = db.usuarios.find(u => u.username === username);
  if (!user || user.hashed_password !== hashPassword(password) || !user.activo) {
    return res.status(401).json({ error: "Credenciales inválidas." });
  }
  
  const tokenPayload = { sub: user.username, rol: user.rol };
  const access_token = createToken(tokenPayload, 1);
  const refresh_token = createToken(tokenPayload, 7);
  
  res.json({
    access_token,
    refresh_token,
    token_type: "bearer"
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(401).json({ error: "Refresh token requerido." });
  }
  const payload = verifyToken(refresh_token);
  if (!payload) {
    return res.status(401).json({ error: "Refresh token inválido o expirado." });
  }
  const user = db.usuarios.find(u => u.username === payload.sub && u.activo);
  if (!user) {
    return res.status(401).json({ error: "Usuario inactivo o inexistente." });
  }
  
  const tokenPayload = { sub: user.username, rol: user.rol };
  const access_token = createToken(tokenPayload, 1);
  const new_refresh_token = createToken(tokenPayload, 7);
  
  res.json({
    access_token,
    refresh_token: new_refresh_token,
    token_type: "bearer"
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ mensaje: "Sesión cerrada correctamente" });
});

app.get('/api/auth/me', requireAuth(), (req: any, res) => {
  const { id, username, rol, activo, creado_en } = req.user;
  res.json({ id, username, rol, activo, creado_en });
});

// 2. --- ADMIN MANAGEMENT ---
app.get('/api/admin/usuarios', requireAuth(["admin"]), (req, res) => {
  const list = db.usuarios.map(({ id, username, rol, activo, creado_en }) => ({ id, username, rol, activo, creado_en }));
  res.json(list);
});

app.post('/api/admin/usuarios', requireAuth(["admin"]), (req, res) => {
  const { username, password, rol } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  if (rol && rol !== "secretaria") {
    return res.status(400).json({ error: "Solo se puede crear rol secretaria" });
  }
  if (db.usuarios.some(u => u.username === username)) {
    return res.status(400).json({ error: "El nombre de usuario ya existe." });
  }
  const newUser: Usuario = {
    id: db.usuarios.length ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1,
    username,
    hashed_password: hashPassword(password),
    rol: "secretaria",
    activo: true,
    creado_en: new Date().toISOString()
  };
  db.usuarios.push(newUser);
  saveDb();
  
  const { id, rol: r, activo, creado_en } = newUser;
  res.status(201).json({ id, username, rol: r, activo, creado_en });
});

app.put('/api/admin/usuarios/:user_id/toggle-activo', requireAuth(["admin"]), (req, res) => {
  const userId = parseInt(req.params.user_id);
  const user = db.usuarios.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }
  if (user.rol === "admin") {
    return res.status(400).json({ error: "No se puede desactivar un administrador." });
  }
  user.activo = !user.activo;
  saveDb();
  const { id, username, rol, activo, creado_en } = user;
  res.json({ id, username, rol, activo, creado_en });
});

app.delete('/api/admin/usuarios/:user_id', requireAuth(["admin"]), (req, res) => {
  const userId = parseInt(req.params.user_id);
  const userIndex = db.usuarios.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }
  const user = db.usuarios[userIndex];
  if (user.rol === "admin") {
    return res.status(400).json({ error: "No se puede eliminar un admin." });
  }
  db.usuarios.splice(userIndex, 1);
  saveDb();
  res.json({ mensaje: `Usuario ${user.username} eliminado` });
});

app.put('/api/admin/usuarios/:user_id', requireAuth(["admin"]), (req: any, res) => {
  const userId = parseInt(req.params.user_id);
  const { username, password, current_password } = req.body;
  const user = db.usuarios.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }
  
  // If editing self
  if (req.user.id === userId) {
    if (!current_password) {
      return res.status(400).json({ error: "Debe ingresar la contraseña actual para realizar cambios en su propio usuario." });
    }
    if (user.hashed_password !== hashPassword(current_password)) {
      return res.status(403).json({ error: "Contraseña actual incorrecta." });
    }
  }
  
  if (username) {
    if (db.usuarios.some(u => u.username === username && u.id !== userId)) {
      return res.status(400).json({ error: "El nombre de usuario ya existe." });
    }
    user.username = username;
  }
  if (password) {
    user.hashed_password = hashPassword(password);
  }
  saveDb();
  const { id, username: u, rol, activo, creado_en } = user;
  res.json({ id, username: u, rol, activo, creado_en });
});

// 3. --- DOCTORS ---
app.get('/api/doctores', requireAuth(), (req, res) => {
  res.json(db.doctores);
});

app.post('/api/doctores', requireAuth(["admin"]), (req, res) => {
  const { nombre, color_agenda } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio." });
  }
  if (color_agenda && !/^#[0-9A-Fa-f]{6}$/.test(color_agenda)) {
    return res.status(422).json({ error: "Formato hex de color inválido. Debe ser #RRGGBB." });
  }
  const newDoc: Doctor = {
    id: db.doctores.length ? Math.max(...db.doctores.map(d => d.id)) + 1 : 1,
    nombre,
    color_agenda: color_agenda || "#1D9E75",
    activo: true
  };
  db.doctores.push(newDoc);
  saveDb();
  res.status(201).json(newDoc);
});

app.get('/api/doctores/:id', requireAuth(), (req, res) => {
  const doc = db.doctores.find(d => d.id === parseInt(req.params.id));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });
  res.json(doc);
});

app.put('/api/doctores/:id', requireAuth(["admin"]), (req, res) => {
  const { nombre, color_agenda, activo } = req.body;
  const doc = db.doctores.find(d => d.id === parseInt(req.params.id));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });
  
  if (nombre) doc.nombre = nombre;
  if (color_agenda) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color_agenda)) {
      return res.status(422).json({ error: "Formato hex de color inválido." });
    }
    doc.color_agenda = color_agenda;
  }
  if (activo !== undefined) doc.activo = activo;
  
  saveDb();
  res.json(doc);
});

app.delete('/api/doctores/:id', requireAuth(["admin"]), (req, res) => {
  const doc = db.doctores.find(d => d.id === parseInt(req.params.id));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });
  doc.activo = false; // Soft-delete
  saveDb();
  res.json(doc);
});

// --- DOCTOR WEEKLY PATTERNS AND EXCEPTIONS ---

// GET /api/doctores/:id/horarios
app.get('/api/doctores/:id/horarios', requireAuth(), (req, res) => {
  const docId = req.params.id;
  const doc = db.doctores.find(d => d.id === parseInt(docId));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });

  if (!db.horarios_doctores) db.horarios_doctores = {};
  
  // Return stored value or default
  const saved = db.horarios_doctores[docId];
  if (saved) {
    return res.json(saved);
  }

  // Fallback default schedule
  const defaultSchedule = {
    dias: {
      "lunes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "martes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "miercoles": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "jueves": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "viernes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "sabado": null,
      "domingo": null
    },
    duracion_turno: 30,
    horizonte_dias: 180
  };
  res.json(defaultSchedule);
});

// PUT /api/doctores/:id/horarios
app.put('/api/doctores/:id/horarios', requireAuth(["admin", "secretaria"]), (req, res) => {
  const docId = req.params.id;
  const doc = db.doctores.find(d => d.id === parseInt(docId));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });

  if (!db.horarios_doctores) db.horarios_doctores = {};
  
  db.horarios_doctores[docId] = req.body;
  saveDb();
  res.json({ success: true, horarios: db.horarios_doctores[docId] });
});

// GET /api/doctores/:id/dias-no-laborables
app.get('/api/doctores/:id/dias-no-laborables', requireAuth(), (req, res) => {
  const docId = req.params.id;
  const doc = db.doctores.find(d => d.id === parseInt(docId));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });

  if (!db.dias_no_laborables_doctores) db.dias_no_laborables_doctores = {};
  
  const dates = db.dias_no_laborables_doctores[docId] || [];
  res.json(dates);
});

// POST /api/doctores/:id/dias-no-laborables
app.post('/api/doctores/:id/dias-no-laborables', requireAuth(["admin", "secretaria"]), (req, res) => {
  const docId = req.params.id;
  const doc = db.doctores.find(d => d.id === parseInt(docId));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });

  const { fecha } = req.body;
  if (!fecha) return res.status(400).json({ error: "La fecha es requerida" });

  if (!db.dias_no_laborables_doctores) db.dias_no_laborables_doctores = {};
  if (!db.dias_no_laborables_doctores[docId]) db.dias_no_laborables_doctores[docId] = [];

  if (!db.dias_no_laborables_doctores[docId].includes(fecha)) {
    db.dias_no_laborables_doctores[docId].push(fecha);
    saveDb();
  }

  res.json({ success: true, fechas: db.dias_no_laborables_doctores[docId] });
});

// DELETE /api/doctores/:id/dias-no-laborables
app.delete('/api/doctores/:id/dias-no-laborables', requireAuth(["admin", "secretaria"]), (req, res) => {
  const docId = req.params.id;
  const doc = db.doctores.find(d => d.id === parseInt(docId));
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });

  const fecha = req.body.fecha || req.query.fecha;
  if (!fecha) return res.status(400).json({ error: "La fecha es requerida" });

  if (!db.dias_no_laborables_doctores) db.dias_no_laborables_doctores = {};
  if (db.dias_no_laborables_doctores[docId]) {
    db.dias_no_laborables_doctores[docId] = db.dias_no_laborables_doctores[docId].filter(f => f !== fecha);
    saveDb();
  }

  res.json({ success: true, fechas: db.dias_no_laborables_doctores[docId] || [] });
});

// 4. --- PACIENTES ---
app.get('/api/pacientes', requireAuth(), (req, res) => {
  const { buscar, limit } = req.query;
  if (buscar !== undefined && typeof buscar === 'string') {
    const term = buscar.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (term.length === 0) {
      return res.json([]);
    }
    const filtered = db.pacientes.filter(p => {
      const full = `${p.nombre || ''} ${p.apellido || ''} ${p.dni || ''}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const fullRev = `${p.apellido || ''} ${p.nombre || ''} ${p.dni || ''}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return full.includes(term) || fullRev.includes(term);
    });
    const max = limit ? parseInt(limit as string, 10) : 20;
    return res.json(filtered.slice(0, max));
  }
  res.json(db.pacientes);
});

app.get('/api/pacientes/deudores', requireAuth(), (req, res) => {
  const { orden } = req.query; // e.g. "antiguedad_desc" or "antiguedad_asc"
  
  const deudoresList = db.pacientes.map(p => {
    const acc = db.cuentas_corrientes.find(cc => cc.dni_paciente === p.dni);
    const saldo_ars = acc ? acc.saldo_ars : 0;
    const saldo_usd = acc ? acc.saldo_usd : 0;
    
    // Find all turnos with debt for this patient to compute dias_antiguedad
    const turnosRealizados = db.turnos.filter(t => t.dni_paciente === p.dni && t.estado === "Realizado");
    const turnosConDeuda = turnosRealizados.map(t => {
      const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
      const paymentsArs = db.pagos.filter(pay => pay.id_turno === t.id && pay.moneda === 'ARS');
      const paymentsUsd = db.pagos.filter(pay => pay.id_turno === t.id && pay.moneda === 'USD');
      
      const costArs = treatments.reduce((sum, tt) => sum + tt.precio_ars * tt.cantidad, 0);
      const costUsd = treatments.reduce((sum, tt) => sum + tt.precio_usd * tt.cantidad, 0);
      
      const paidArs = paymentsArs.reduce((sum, pay) => sum + pay.monto, 0);
      const paidUsd = paymentsUsd.reduce((sum, pay) => sum + pay.monto, 0);
      
      return {
        fecha_hora: t.fecha_hora,
        saldo_pendiente_ars: Math.max(0, costArs - paidArs),
        saldo_pendiente_usd: Math.max(0, costUsd - paidUsd)
      };
    }).filter(t => t.saldo_pendiente_ars > 0 || t.saldo_pendiente_usd > 0);
    
    let dias_antiguedad = 0;
    if (turnosConDeuda.length > 0) {
      // Find oldest turno with debt
      const dates = turnosConDeuda.map(t => new Date(t.fecha_hora).getTime());
      const oldestTime = Math.min(...dates);
      const diffTime = Math.abs(Date.now() - oldestTime);
      dias_antiguedad = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else if (saldo_ars > 0 || saldo_usd > 0) {
      // If there's CC balance but no specific turnos, fall back to oldest cargo movement
      const movimientos = db.movimientos_cuenta.filter(m => acc && m.id_cuenta === acc.id && m.tipo === 'cargo');
      if (movimientos.length > 0) {
        const dates = movimientos.map(m => new Date(m.fecha).getTime());
        const oldestTime = Math.min(...dates);
        const diffTime = Math.abs(Date.now() - oldestTime);
        dias_antiguedad = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else {
        // Simple fallback
        dias_antiguedad = 10; // default for mock/migrated balances
      }
    }
    
    return {
      dni: p.dni,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      saldo_ars,
      saldo_usd,
      dias_antiguedad
    };
  }).filter(p => p.saldo_ars > 0 || p.saldo_usd > 0);
  
  // Sort by default: de mayor a menor antigüedad (antiguedad_desc)
  const sortOrder = orden || 'antiguedad_desc';
  if (sortOrder === 'antiguedad_desc') {
    deudoresList.sort((a, b) => b.dias_antiguedad - a.dias_antiguedad);
  } else if (sortOrder === 'antiguedad_asc') {
    deudoresList.sort((a, b) => a.dias_antiguedad - b.dias_antiguedad);
  }
  
  res.json(deudoresList);
});

app.get('/api/pacientes/:dni/turnos-con-deuda', requireAuth(), (req, res) => {
  const { dni } = req.params;
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  
  const turnosRealizados = db.turnos.filter(t => t.dni_paciente === dni && t.estado === "Realizado");
  const turnosConDeuda = turnosRealizados.map(t => {
    const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
    const paymentsArs = db.pagos.filter(pay => pay.id_turno === t.id && pay.moneda === 'ARS');
    const paymentsUsd = db.pagos.filter(pay => pay.id_turno === t.id && pay.moneda === 'USD');
    
    const costArs = treatments.reduce((sum, tt) => sum + tt.precio_ars * tt.cantidad, 0);
    const costUsd = treatments.reduce((sum, tt) => sum + tt.precio_usd * tt.cantidad, 0);
    
    const paidArs = paymentsArs.reduce((sum, pay) => sum + pay.monto, 0);
    const paidUsd = paymentsUsd.reduce((sum, pay) => sum + pay.monto, 0);
    
    const doc = db.doctores.find(d => d.id === t.id_doctor);
    
    return {
      id: t.id,
      fecha_hora: t.fecha_hora,
      motivo: t.motivo || "Tratamiento Odontológico",
      doctor_nombre: doc ? doc.nombre : "Desconocido",
      saldo_pendiente_ars: Math.max(0, costArs - paidArs),
      saldo_pendiente_usd: Math.max(0, costUsd - paidUsd),
      tratamientos: treatments
    };
  }).filter(t => t.saldo_pendiente_ars > 0 || t.saldo_pendiente_usd > 0);
  
  res.json(turnosConDeuda);
});

app.get('/api/pacientes/historial', requireAuth(), (req, res) => {
  const { dni, fecha_desde, fecha_hasta } = req.query;
  if (!dni) return res.status(400).json({ error: "DNI requerido." });
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado." });
  
  let turnosFiltrados = db.turnos.filter(t => t.dni_paciente === dni);
  if (fecha_desde) {
    turnosFiltrados = turnosFiltrados.filter(t => new Date(t.fecha_hora) >= new Date(fecha_desde as string));
  }
  if (fecha_hasta) {
    turnosFiltrados = turnosFiltrados.filter(t => new Date(t.fecha_hora) <= new Date(fecha_hasta as string));
  }
  
  // Map turnos with their treatments and payments
  const turnosConDetalle = turnosFiltrados.map(t => {
    const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
    const payments = db.pagos.filter(p => p.id_turno === t.id);
    const doctor = db.doctores.find(d => d.id === t.id_doctor);
    return {
      ...t,
      doctor_nombre: doctor ? doctor.nombre : "Desconocido",
      doctor_color: doctor ? doctor.color_agenda : "#1D9E75",
      tratamientos: treatments,
      pagos: payments
    };
  }).sort((a,b) => b.fecha_hora.localeCompare(a.fecha_hora));
  
  res.json({
    paciente: pac,
    historial: turnosConDetalle
  });
});

app.get('/api/pacientes/:dni', requireAuth(), (req, res) => {
  const pac = db.pacientes.find(p => p.dni === req.params.dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  res.json(pac);
});

app.post('/api/pacientes', requireAuth(), (req, res) => {
  const { dni, nombre, apellido, fecha_nacimiento, telefono, email, obra_social, genero, alertas } = req.body;
  if (!dni || !nombre || !apellido) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  if (db.pacientes.some(p => p.dni === dni)) {
    return res.status(400).json({ error: "El DNI ya está registrado." });
  }
  const newPac: Paciente = { dni, nombre, apellido, fecha_nacimiento, telefono, email, obra_social, genero, alertas };
  db.pacientes.push(newPac);
  
  // Create Cuenta Corriente
  db.cuentas_corrientes.push({
    id: db.cuentas_corrientes.length ? Math.max(...db.cuentas_corrientes.map(c => c.id)) + 1 : 1,
    dni_paciente: dni,
    saldo_ars: 0,
    saldo_usd: 0,
    ultima_actualizacion: new Date().toISOString()
  });
  
  saveDb();
  res.status(201).json(newPac);
});

app.put('/api/pacientes/:dni', requireAuth(), (req, res) => {
  const pac = db.pacientes.find(p => p.dni === req.params.dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  
  const { nombre, apellido, fecha_nacimiento, telefono, email, obra_social, genero, alertas } = req.body;
  if (nombre) pac.nombre = nombre;
  if (apellido) pac.apellido = apellido;
  if (fecha_nacimiento !== undefined) pac.fecha_nacimiento = fecha_nacimiento;
  if (telefono !== undefined) pac.telefono = telefono;
  if (email !== undefined) pac.email = email;
  if (obra_social !== undefined) pac.obra_social = obra_social;
  if (genero !== undefined) pac.genero = genero;
  if (alertas !== undefined) pac.alertas = alertas;
  
  saveDb();
  res.json(pac);
});

app.get('/api/pacientes/:dni/cuenta', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  
  let acc = db.cuentas_corrientes.find(cc => cc.dni_paciente === dni);
  if (!acc) {
    acc = {
      id: db.cuentas_corrientes.length ? Math.max(...db.cuentas_corrientes.map(c => c.id)) + 1 : 1,
      dni_paciente: dni,
      saldo_ars: 0,
      saldo_usd: 0,
      ultima_actualizacion: new Date().toISOString()
    };
    db.cuentas_corrientes.push(acc);
    saveDb();
  }
  
  const movimientos = db.movimientos_cuenta
    .filter(m => m.id_cuenta === acc!.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
    
  res.json({
    dni_paciente: dni,
    saldo_ars: acc.saldo_ars,
    saldo_usd: acc.saldo_usd,
    ultima_actualizacion: acc.ultima_actualizacion,
    movimientos
  });
});

// ALERTAS & EVOLUCIONES ENDPOINTS
app.get('/api/pacientes/:dni/alertas', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  res.json({ alertas: pac.alertas || "" });
});

app.post('/api/pacientes/:dni/alertas', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const { alertas } = req.body;
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  pac.alertas = alertas || "";
  saveDb();
  res.json({ alertas: pac.alertas });
});

app.get('/api/pacientes/:dni/evoluciones', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  if (!db.evoluciones) db.evoluciones = [];
  const list = db.evoluciones.filter(e => e.dni_paciente === dni);
  res.json(list);
});

app.post('/api/pacientes/:dni/evoluciones', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const pac = db.pacientes.find(p => p.dni === dni);
  if (!pac) return res.status(404).json({ error: "Paciente no encontrado" });
  if (!db.evoluciones) db.evoluciones = [];

  const { fecha, id_turno, pieza_dental, ubicacion_lesion, observaciones, conformidad_paciente } = req.body;
  if (!observaciones) return res.status(400).json({ error: "observaciones es obligatorio" });

  const newEvo: EvolucionClinica = {
    id: db.evoluciones.length ? Math.max(...db.evoluciones.map(e => e.id)) + 1 : 1,
    dni_paciente: dni,
    fecha: fecha || new Date().toISOString().split('T')[0],
    id_turno: id_turno ? Number(id_turno) : null,
    pieza_dental: pieza_dental ? Number(pieza_dental) : null,
    ubicacion_lesion: ubicacion_lesion || null,
    observaciones,
    conformidad_paciente: conformidad_paciente !== undefined ? !!conformidad_paciente : true,
    creado_en: new Date().toISOString()
  };

  db.evoluciones.push(newEvo);
  saveDb();
  res.status(201).json(newEvo);
});

app.put('/api/pacientes/:dni/evoluciones/:id', requireAuth(), (req, res) => {
  const { dni, id } = req.params;
  if (!db.evoluciones) db.evoluciones = [];
  const evo = db.evoluciones.find(e => e.id === Number(id) && e.dni_paciente === dni);
  if (!evo) return res.status(404).json({ error: "Evolución no encontrada" });

  const { fecha, id_turno, pieza_dental, ubicacion_lesion, observaciones, conformidad_paciente } = req.body;
  if (fecha !== undefined) evo.fecha = fecha;
  if (id_turno !== undefined) evo.id_turno = id_turno ? Number(id_turno) : null;
  if (pieza_dental !== undefined) evo.pieza_dental = pieza_dental ? Number(pieza_dental) : null;
  if (ubicacion_lesion !== undefined) evo.ubicacion_lesion = ubicacion_lesion;
  if (observaciones !== undefined) evo.observaciones = observaciones;
  if (conformidad_paciente !== undefined) evo.conformidad_paciente = !!conformidad_paciente;

  saveDb();
  res.json(evo);
});

// --- IMAGES AND RESUMEN ENDPOINTS ---
app.get('/api/pacientes/:dni/resumen', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const countImgs = db.pacientes_imagenes ? db.pacientes_imagenes.filter(img => img.dni_paciente === dni).length : 0;
  res.json({
    conteo_imagenes: countImgs,
    conteo_hallazgos: 0
  });
});

app.get('/api/pacientes/:dni/imagenes', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const list = db.pacientes_imagenes ? db.pacientes_imagenes.filter(img => img.dni_paciente === dni) : [];
  res.json(list);
});

// CARPETAS & IMAGENES POR CARPETA ENDPOINTS
app.get('/api/pacientes/:dni/carpetas', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const imgs = db.pacientes_imagenes ? db.pacientes_imagenes.filter(img => img.dni_paciente === dni) : [];
  const defaultCarpetas = ['Radiografías', 'Fotos intraorales', 'Estudios'];
  const customCarpetas = Array.from(new Set(imgs.map(i => i.carpeta).filter(Boolean)));
  const allCarpetas = Array.from(new Set([...defaultCarpetas, ...customCarpetas]));
  res.json(allCarpetas.map(c => ({ id: c, nombre: c })));
});

app.get('/api/pacientes/:dni/carpetas/:id_carpeta/imagenes', requireAuth(), (req, res) => {
  const { dni, id_carpeta } = req.params;
  const list = db.pacientes_imagenes 
    ? db.pacientes_imagenes.filter(img => img.dni_paciente === dni && img.carpeta === id_carpeta) 
    : [];
  res.json(list);
});

app.post('/api/pacientes/:dni/carpetas/:id_carpeta/imagenes', requireAuth(), (req, res) => {
  const { dni, id_carpeta } = req.params;
  const { nombre, url, es_radiografia } = req.body;
  if (!nombre || !url) {
    return res.status(400).json({ error: "Faltan datos de la imagen (nombre o url)." });
  }
  if (!db.pacientes_imagenes) db.pacientes_imagenes = [];
  const newImg: PacienteImagen = {
    id: db.pacientes_imagenes.length ? Math.max(...db.pacientes_imagenes.map(i => i.id)) + 1 : 1,
    dni_paciente: dni,
    nombre,
    url,
    carpeta: id_carpeta,
    es_radiografia: !!es_radiografia,
    creado_en: new Date().toISOString()
  };
  db.pacientes_imagenes.push(newImg);
  saveDb();
  res.status(201).json(newImg);
});

app.get('/api/imagenes/:id/contenido', requireAuth(), (req, res) => {
  const idNum = parseInt(req.params.id);
  const img = db.pacientes_imagenes ? db.pacientes_imagenes.find(i => i.id === idNum) : null;
  if (!img) return res.status(404).json({ error: "Imagen no encontrada." });
  res.json({ id: img.id, nombre: img.nombre, url: img.url, contenido_base64: img.url });
});

app.post('/api/pacientes/:dni/imagenes', requireAuth(), (req, res) => {
  const dni = req.params.dni;
  const { nombre, url, carpeta, es_radiografia } = req.body;
  if (!nombre || !url || !carpeta) {
    return res.status(400).json({ error: "Faltan datos de la imagen." });
  }
  if (!db.pacientes_imagenes) {
    db.pacientes_imagenes = [];
  }
  const newImg: PacienteImagen = {
    id: db.pacientes_imagenes.length ? Math.max(...db.pacientes_imagenes.map(i => i.id)) + 1 : 1,
    dni_paciente: dni,
    nombre,
    url,
    carpeta,
    es_radiografia: !!es_radiografia,
    creado_en: new Date().toISOString()
  };
  db.pacientes_imagenes.push(newImg);
  saveDb();
  res.status(201).json(newImg);
});

app.delete('/api/pacientes/:dni/imagenes/:id', requireAuth(), (req, res) => {
  const { dni, id } = req.params;
  const idNum = parseInt(id);
  if (!db.pacientes_imagenes) {
    db.pacientes_imagenes = [];
  }
  const idx = db.pacientes_imagenes.findIndex(img => img.dni_paciente === dni && img.id === idNum);
  if (idx === -1) {
    return res.status(404).json({ error: "Imagen no encontrada." });
  }
  db.pacientes_imagenes.splice(idx, 1);
  saveDb();
  res.json({ success: true });
});


// 5. --- TURNOS (APPOINTMENTS) ---
app.get('/api/turnos', requireAuth(), (req, res) => {
  const { fecha, id_doctor, paciente_dni } = req.query;
  let list = db.turnos;
  
  if (fecha) {
    // Standard ISO string checks
    const targetDate = (fecha as string).split('T')[0];
    list = list.filter(t => t.fecha_hora.startsWith(targetDate));
  }
  if (id_doctor) {
    list = list.filter(t => t.id_doctor === parseInt(id_doctor as string));
  }
  if (paciente_dni) {
    list = list.filter(t => t.dni_paciente === (paciente_dni as string));
  }
  
  const formatted = list.map(t => {
    const pac = db.pacientes.find(p => p.dni === t.dni_paciente);
    const doc = db.doctores.find(d => d.id === t.id_doctor);
    const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
    const payments = db.pagos.filter(p => p.id_turno === t.id);
    return {
      ...t,
      paciente: pac ? `${pac.nombre} ${pac.apellido}` : "Desconocido",
      doctor_nombre: doc ? doc.nombre : "Desconocido",
      doctor_color: doc ? doc.color_agenda : "#1D9E75",
      tratamientos: treatments,
      pagos: payments
    };
  });
  
  res.json(formatted);
});

app.get('/api/turnos/hoy', requireAuth(), (req, res) => {
  const dateStr = getTodayArgentinaDateStr();
  
  const list = db.turnos.filter(t => t.fecha_hora && typeof t.fecha_hora === 'string' && t.fecha_hora.startsWith(dateStr));
  const formatted = list.map(t => {
    const pac = db.pacientes.find(p => p.dni === t.dni_paciente);
    const doc = db.doctores.find(d => d.id === t.id_doctor);
    const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
    const payments = db.pagos.filter(p => p.id_turno === t.id);
    return {
      ...t,
      paciente: pac ? `${pac.nombre} ${pac.apellido}` : "Desconocido",
      doctor_nombre: doc ? doc.nombre : "Desconocido",
      doctor_color: doc ? doc.color_agenda : "#1D9E75",
      tratamientos: treatments,
      pagos: payments
    };
  });
  res.json(formatted);
});

app.post('/api/turnos', requireAuth(), (req: any, res) => {
  const { fecha_hora, duracion_minutos, motivo, dni_paciente, id_doctor } = req.body;
  if (!fecha_hora || !dni_paciente || !id_doctor) {
    return res.status(400).json({ error: "Faltan campos requeridos." });
  }
  
  const duracion = duracion_minutos || 30;
  
  // Validate time
  const val = es_hora_valida(fecha_hora, duracion, parseInt(id_doctor));
  if (!val.valida) {
    return res.status(400).json({ error: val.motivo });
  }
  
  // Check if patient exists
  if (!db.pacientes.some(p => p.dni === dni_paciente)) {
    return res.status(404).json({ error: "Paciente no encontrado. Créelo primero." });
  }
  
  // Check doctor overlap
  const date = new Date(fecha_hora);
  const startMs = date.getTime();
  const endMs = startMs + duracion * 60 * 1000;
  
  const overlap = db.turnos.some(t => {
    if (t.id_doctor !== id_doctor || t.estado === "Cancelado") return false;
    const tStart = new Date(t.fecha_hora).getTime();
    const tEnd = tStart + (t.duracion_minutos || 30) * 60 * 1000;
    return (startMs < tEnd && endMs > tStart);
  });
  
  if (overlap) {
    return res.status(400).json({ error: "El doctor ya tiene un turno que se solapa en ese horario." });
  }
  
  // Check slot blocked in any 30-min slot spanned by duration
  const ar = getARTime(fecha_hora);
  const datePart = fecha_hora.split('T')[0];
  const startMins = ar.hour * 60 + ar.minute;
  const endMins = startMins + duracion;

  for (let m = startMins; m < endMins; m += 30) {
    const slotH = Math.floor(m / 60);
    const slotM = m % 60;
    const hStr = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
    const isBlocked = db.slots_bloqueados.some(sb => sb.fecha === datePart && sb.hora === hStr && sb.id_doctor === id_doctor);
    if (isBlocked) {
      return res.status(400).json({ error: "El horario solicitado se superpone con un bloqueo manual." });
    }
  }
  
  const newTurno: Turno = {
    id: db.turnos.length ? Math.max(...db.turnos.map(t => t.id)) + 1 : 1,
    fecha_hora,
    duracion_minutos: duracion,
    motivo,
    estado: 'Pendiente',
    dni_paciente,
    id_doctor
  };
  
  db.turnos.push(newTurno);
  saveDb();
  res.status(201).json(newTurno);
});

app.patch('/api/turnos/:turno_id/cancelar', requireAuth(), (req, res) => {
  const id = parseInt(req.params.turno_id);
  const t = db.turnos.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: "Turno no encontrado." });
  
  if (t.estado === 'Realizado') {
    return res.status(400).json({ error: "No se puede cancelar un turno que ya ha sido Realizado." });
  }
  if (t.estado === 'Cancelado') {
    return res.status(400).json({ error: "El turno ya se encuentra Cancelado." });
  }
  
  const motivo = req.body.motivo_cancelacion || req.body.motivo;
  if (!motivo || !motivo.trim()) {
    return res.status(400).json({ error: "El motivo de cancelación es obligatorio." });
  }
  
  t.estado = 'Cancelado';
  t.motivo_cancelacion = motivo;
  saveDb();
  res.json(t);
});

app.put('/api/turnos/:turno_id/cerrar', requireAuth(), (req, res) => {
  const turnoId = parseInt(req.params.turno_id);
  const t = db.turnos.find(x => x.id === turnoId);
  if (!t) return res.status(404).json({ error: "Turno no encontrado." });
  
  const { comentarios, comentarios_medicos, tratamientos, pagos, pieza_dental, ubicacion_lesion, conformidad_paciente } = req.body;
  const commentText = comentarios !== undefined ? comentarios : (comentarios_medicos || "");
  
  t.estado = 'Realizado';
  t.comentarios_medicos = commentText;
  t.pieza_dental = pieza_dental;
  t.ubicacion_lesion = ubicacion_lesion;
  t.conformidad_paciente = conformidad_paciente;
  
  // Record clinical notes
  if (commentText) {
    let hc = db.historias_clinicas.find(h => h.dni_paciente === t.dni_paciente);
    const dateFormatted = new Date().toLocaleDateString('es-AR');
    const commentLine = `[${dateFormatted}] Cerrado Turno: ${commentText}\n`;
    if (!hc) {
      db.historias_clinicas.push({
        id: db.historias_clinicas.length ? Math.max(...db.historias_clinicas.map(h => h.id)) + 1 : 1,
        notas: commentLine,
        ultima_actualizacion: new Date().toISOString(),
        dni_paciente: t.dni_paciente
      });
    } else {
      hc.notas = (hc.notas || "") + commentLine;
      hc.ultima_actualizacion = new Date().toISOString();
    }
  }
  
  // Record treatments for this turn
  let totalCostArs = 0;
  let totalCostUsd = 0;
  
  if (Array.isArray(tratamientos)) {
    tratamientos.forEach(tr => {
      const pArs = tr.precio_ars || 0;
      const pUsd = tr.precio_usd || 0;
      const cant = tr.cantidad || 1;
      
      totalCostArs += pArs * cant;
      totalCostUsd += pUsd * cant;
      
      db.turnos_tratamientos.push({
        id: db.turnos_tratamientos.length ? Math.max(...db.turnos_tratamientos.map(tt => tt.id)) + 1 : 1,
        id_turno: turnoId,
        nombre: tr.nombre,
        cantidad: cant,
        precio_ars: pArs,
        precio_usd: pUsd
      });
    });
  }
  
  // Record payments
  let totalPaidArs = 0;
  let totalPaidUsd = 0;
  
  const recordedPayments: Pago[] = [];
  
  if (Array.isArray(pagos)) {
    pagos.forEach(p => {
      const monto = p.monto || 0;
      const moneda = p.moneda || 'ARS';
      if (moneda === 'ARS') {
        totalPaidArs += monto;
      } else {
        totalPaidUsd += monto;
      }
      
      const newPago: Pago = {
        id: db.pagos.length ? Math.max(...db.pagos.map(x => x.id)) + 1 : 1,
        monto,
        fecha_pago: new Date().toISOString(),
        metodo_pago: p.metodo_pago || 'Efectivo',
        moneda,
        saldo_pendiente: 0, // Assigned later
        dni_paciente: t.dni_paciente,
        id_turno: turnoId
      };
      
      db.pagos.push(newPago);
      recordedPayments.push(newPago);
    });
  }
  
  // Update checking accounts
  let acc = db.cuentas_corrientes.find(cc => cc.dni_paciente === t.dni_paciente);
  if (!acc) {
    acc = {
      id: db.cuentas_corrientes.length ? Math.max(...db.cuentas_corrientes.map(c => c.id)) + 1 : 1,
      dni_paciente: t.dni_paciente,
      saldo_ars: 0,
      saldo_usd: 0,
      ultima_actualizacion: new Date().toISOString()
    };
    db.cuentas_corrientes.push(acc);
  }
  
  // ARS Account calculation
  if (totalCostArs > 0 || totalPaidArs > 0) {
    if (totalPaidArs < totalCostArs) {
      // Underpaid -> Increase debt
      const diff = totalCostArs - totalPaidArs;
      acc.saldo_ars += diff;
      db.movimientos_cuenta.push({
        id: db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 1,
        id_cuenta: acc.id,
        tipo: 'cargo',
        monto: diff,
        moneda: 'ARS',
        descripcion: `Cargo remanente de turno cerrado (ID: ${turnoId})`,
        fecha: new Date().toISOString()
      });
    } else if (totalPaidArs > totalCostArs) {
      // Overpaid -> Reduce debt (could create credit)
      const diff = totalPaidArs - totalCostArs;
      acc.saldo_ars -= diff;
      db.movimientos_cuenta.push({
        id: db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 1,
        id_cuenta: acc.id,
        tipo: 'pago',
        monto: diff,
        moneda: 'ARS',
        descripcion: `Excedente abono en cierre de turno (ID: ${turnoId})`,
        fecha: new Date().toISOString()
      });
    }
  }
  
  // USD Account calculation
  if (totalCostUsd > 0 || totalPaidUsd > 0) {
    if (totalPaidUsd < totalCostUsd) {
      const diff = totalCostUsd - totalPaidUsd;
      acc.saldo_usd += diff;
      db.movimientos_cuenta.push({
        id: db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 1,
        id_cuenta: acc.id,
        tipo: 'cargo',
        monto: diff,
        moneda: 'USD',
        descripcion: `Cargo remanente de turno cerrado (ID: ${turnoId})`,
        fecha: new Date().toISOString()
      });
    } else if (totalPaidUsd > totalCostUsd) {
      const diff = totalPaidUsd - totalCostUsd;
      acc.saldo_usd -= diff;
      db.movimientos_cuenta.push({
        id: db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 1,
        id_cuenta: acc.id,
        tipo: 'pago',
        monto: diff,
        moneda: 'USD',
        descripcion: `Excedente abono en cierre de turno (ID: ${turnoId})`,
        fecha: new Date().toISOString()
      });
    }
  }
  
  acc.ultima_actualizacion = new Date().toISOString();
  saveDb();
  
  res.json({
    turno: t,
    tratamientos_registrados: db.turnos_tratamientos.filter(x => x.id_turno === turnoId),
    pagos_registrados: recordedPayments
  });
});

app.put('/api/turnos/:turno_id/clinical-details', requireAuth(), (req, res) => {
  const turnoId = parseInt(req.params.turno_id);
  const t = db.turnos.find(x => x.id === turnoId);
  if (!t) return res.status(404).json({ error: "Turno no encontrado." });
  
  const { comentarios_medicos, pieza_dental, ubicacion_lesion, conformidad_paciente } = req.body;
  
  t.comentarios_medicos = comentarios_medicos || "";
  t.pieza_dental = pieza_dental !== undefined && pieza_dental !== null && pieza_dental !== "" ? Number(pieza_dental) : null;
  t.ubicacion_lesion = ubicacion_lesion || null;
  t.conformidad_paciente = conformidad_paciente !== undefined ? !!conformidad_paciente : null;
  
  saveDb();
  res.json(t);
});

app.get('/api/turnos/slots', requireAuth(), (req, res) => {
  const { fecha, id_doctor } = req.query;
  if (!fecha || !id_doctor) {
    return res.status(400).json({ error: "Faltan parámetros fecha e id_doctor." });
  }
  
  const idDoc = parseInt(id_doctor as string);
  const dateStr = fecha as string; // YYYY-MM-DD
  
  // Define slots dynamically using the doctor's configuration
  const slots = obtener_slots_doctor(idDoc, dateStr);
  
  const output = slots.map(timeStr => {
    const fullDateTimeStr = `${dateStr}T${timeStr}:00`;
    
    // Check if blocked
    const block = db.slots_bloqueados.find(sb => sb.fecha === dateStr && sb.hora === timeStr && sb.id_doctor === idDoc);
    if (block) {
      return {
        hora: timeStr,
        estado: "bloqueado",
        slot_bloqueado_id: block.id,
        motivo: block.motivo
      };
    }
    
    // Check if occupied
    const activeTurnos = db.turnos.filter(t => t.id_doctor === idDoc && t.estado !== "Cancelado");
    const matchedTurno = activeTurnos.find(t => {
      const tStartStr = t.fecha_hora;
      if (!tStartStr || typeof tStartStr !== 'string') return false;
      const tAr = getARTime(tStartStr);
      const tStartMins = tAr.hour * 60 + tAr.minute;
      const duration = t.duracion_minutos || 30;
      const tEndMins = tStartMins + duration;
      const tDateStr = tStartStr.split('T')[0];

      if (tDateStr !== dateStr) return false;

      const [sH, sM] = timeStr.split(':').map(Number);
      const slotMins = sH * 60 + sM;

      return slotMins >= tStartMins && slotMins < tEndMins;
    });
    
    if (matchedTurno) {
      const p = db.pacientes.find(pac => pac.dni === matchedTurno.dni_paciente);
      return {
        hora: timeStr,
        estado: "ocupado",
        turno_id: matchedTurno.id,
        paciente: p ? p.apellido : "Paciente"
      };
    }
    
    return {
      hora: timeStr,
      estado: "libre"
    };
  });
  
  res.json(output);
});

app.get('/api/turnos/slots/bulk', requireAuth(), (req, res) => {
  const { fecha_desde, fecha_hasta, fechas, id_doctor } = req.query;
  if (!id_doctor || (!fechas && (!fecha_desde || !fecha_hasta))) {
    return res.status(400).json({ error: "Faltan parámetros de fecha e id_doctor." });
  }
  
  let dates: string[] = [];
  if (fecha_desde && fecha_hasta) {
    const start = new Date((fecha_desde as string) + 'T00:00:00');
    const end = new Date((fecha_hasta as string) + 'T00:00:00');
    const curr = new Date(start);
    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      curr.setDate(curr.getDate() + 1);
    }
  } else if (fechas) {
    dates = (fechas as string).split(',');
  }

  const docIds = (id_doctor as string).split(',').map(id => parseInt(id.trim())).filter(Boolean);
  
  const diasResult: {
    [dateStr: string]: {
      total: number;
      libres: number;
      ocupados: number;
      bloqueados: number;
      por_doctor: {
        [docId: string]: { total: number; libres: number; ocupados: number; bloqueados: number }
      }
    }
  } = {};
  
  for (const dateStr of dates) {
    let dayTotal = 0;
    let dayLibres = 0;
    let dayOcupados = 0;
    let dayBloqueados = 0;

    const porDoctor: { [docId: string]: { total: number; libres: number; ocupados: number; bloqueados: number } } = {};

    for (const idDoc of docIds) {
      let docTotal = 0;
      let docLibres = 0;
      let docOcupados = 0;
      let docBloqueados = 0;

      const slots = obtener_slots_doctor(idDoc, dateStr);
      const activeTurnos = db.turnos.filter(t => t.id_doctor === idDoc && t.estado !== "Cancelado");

      for (const timeStr of slots) {
        docTotal++;
        const isBlocked = db.slots_bloqueados.some(sb => sb.fecha === dateStr && sb.hora === timeStr && sb.id_doctor === idDoc);
        if (isBlocked) {
          docBloqueados++;
          continue;
        }

        const matchedTurno = activeTurnos.some(t => {
          const tStartStr = t.fecha_hora;
          if (!tStartStr || typeof tStartStr !== 'string') return false;
          const tAr = getARTime(tStartStr);
          const tStartMins = tAr.hour * 60 + tAr.minute;
          const duration = t.duracion_minutos || 30;
          const tEndMins = tStartMins + duration;
          const tDateStr = tStartStr.split('T')[0];

          if (tDateStr !== dateStr) return false;

          const [sH, sM] = timeStr.split(':').map(Number);
          const slotMins = sH * 60 + sM;

          return slotMins >= tStartMins && slotMins < tEndMins;
        });

        if (matchedTurno) {
          docOcupados++;
        } else {
          docLibres++;
        }
      }

      porDoctor[String(idDoc)] = {
        total: docTotal,
        libres: docLibres,
        ocupados: docOcupados,
        bloqueados: docBloqueados
      };

      dayTotal += docTotal;
      dayLibres += docLibres;
      dayOcupados += docOcupados;
      dayBloqueados += docBloqueados;
    }

    diasResult[dateStr] = {
      total: dayTotal,
      libres: dayLibres,
      ocupados: dayOcupados,
      bloqueados: dayBloqueados,
      por_doctor: porDoctor
    };
  }
  
  res.json({
    fecha_desde: fecha_desde || (dates[0] || ""),
    fecha_hasta: fecha_hasta || (dates[dates.length - 1] || ""),
    doctores: docIds,
    dias: diasResult
  });
});

app.get('/api/turnos/:id', requireAuth(), (req, res) => {
  const id = parseInt(req.params.id);
  const t = db.turnos.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: "Turno no encontrado" });
  
  const pac = db.pacientes.find(p => p.dni === t.dni_paciente);
  const doc = db.doctores.find(d => d.id === t.id_doctor);
  const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
  const payments = db.pagos.filter(p => p.id_turno === t.id);
  
  res.json({
    ...t,
    paciente: pac ? `${pac.nombre} ${pac.apellido}` : "Desconocido",
    doctor_nombre: doc ? doc.nombre : "Desconocido",
    doctor_color: doc ? doc.color_agenda : "#1D9E75",
    tratamientos: treatments,
    pagos: payments
  });
});

app.post('/api/turnos/slots/bloquear', requireAuth(), (req: any, res) => {
  const { fecha, hora, id_doctor, motivo } = req.body;
  if (!fecha || !hora || !id_doctor) {
    return res.status(400).json({ error: "Faltan parámetros fecha, hora e id_doctor." });
  }
  
  const idDoc = parseInt(id_doctor);
  
  // Verify valid time
  const fullIso = `${fecha}T${hora}:00`;
  const val = es_hora_valida(fullIso, 30, idDoc);
  if (!val.valida) {
    return res.status(400).json({ error: val.motivo });
  }
  
  // Check overlap with turnos
  const hasTurno = db.turnos.some(t => {
    if (t.id_doctor !== idDoc || t.estado === "Cancelado") return false;
    const tStartStr = t.fecha_hora;
    if (!tStartStr || typeof tStartStr !== 'string') return false;
    const tAr = getARTime(tStartStr);
    const tTime = `${String(tAr.hour).padStart(2, '0')}:${String(tAr.minute).padStart(2, '0')}`;
    const tDate = tStartStr.split('T')[0];
    return tDate === fecha && tTime === hora;
  });
  
  if (hasTurno) {
    return res.status(409).json({ error: "El slot ya tiene un turno asignado." });
  }
  
  // Check already blocked
  const isBlocked = db.slots_bloqueados.some(sb => sb.fecha === fecha && sb.hora === hora && sb.id_doctor === idDoc);
  if (isBlocked) {
    return res.status(409).json({ error: "El slot ya está bloqueado." });
  }
  
  const newBlock: SlotBloqueado = {
    id: db.slots_bloqueados.length ? Math.max(...db.slots_bloqueados.map(x => x.id)) + 1 : 1,
    fecha,
    hora,
    id_doctor: idDoc,
    motivo: motivo || "Bloqueo administrativo",
    bloqueado_por_id: req.user.id,
    creado_en: new Date().toISOString()
  };
  
  db.slots_bloqueados.push(newBlock);
  saveDb();
  res.status(201).json(newBlock);
});

app.delete('/api/turnos/slots/:slot_id/desbloquear', requireAuth(), (req, res) => {
  const id = parseInt(req.params.slot_id);
  const index = db.slots_bloqueados.findIndex(sb => sb.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Slot bloqueado no encontrado." });
  }
  db.slots_bloqueados.splice(index, 1);
  saveDb();
  res.json({ mensaje: "Slot desbloqueado correctamente" });
});

// 6. --- FINANCES ---
app.post('/api/finanzas/pagos', requireAuth(), (req, res) => {
  const { dni_paciente, monto, metodo_pago, moneda, id_turno } = req.body;
  if (!dni_paciente || monto === undefined || !moneda) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios." });
  }
  
  const numericMonto = parseFloat(monto);
  const targetTurnoId = id_turno ? parseInt(id_turno) : null;
  
  let acc = db.cuentas_corrientes.find(cc => cc.dni_paciente === dni_paciente);
  if (!acc) {
    acc = {
      id: db.cuentas_corrientes.length ? Math.max(...db.cuentas_corrientes.map(c => c.id)) + 1 : 1,
      dni_paciente,
      saldo_ars: 0,
      saldo_usd: 0,
      ultima_actualizacion: new Date().toISOString()
    };
    db.cuentas_corrientes.push(acc);
  }
  
  // Calculate dynamic constancia_turno
  let constancia: string | null = null;
  if (targetTurnoId) {
    const t = db.turnos.find(x => x.id === targetTurnoId);
    if (t && t.fecha_hora && typeof t.fecha_hora === 'string') {
      const p = db.pacientes.find(pac => pac.dni === t.dni_paciente);
      const tAr = getARTime(t.fecha_hora);
      const dateFormatted = `${String(tAr.day).padStart(2, '0')}/${String(tAr.month).padStart(2, '0')}`;
      const timeFormatted = `${String(tAr.hour).padStart(2, '0')}:${String(tAr.minute).padStart(2, '0')}`;
      constancia = `${dateFormatted} - ${p ? p.apellido : "Paciente"} (${timeFormatted})`;
    }
  }
  
  const newPago: Pago = {
    id: db.pagos.length ? Math.max(...db.pagos.map(x => x.id)) + 1 : 1,
    monto: numericMonto,
    fecha_pago: new Date().toISOString(),
    metodo_pago: metodo_pago || 'Efectivo',
    moneda,
    saldo_pendiente: 0,
    dni_paciente,
    id_turno: targetTurnoId
  };
  
  // Record transaction in ledger
  db.pagos.push(newPago);
  
  if (moneda === 'ARS') {
    acc.saldo_ars -= numericMonto;
  } else {
    acc.saldo_usd -= numericMonto;
  }
  
  db.movimientos_cuenta.push({
    id: db.movimientos_cuenta.length ? Math.max(...db.movimientos_cuenta.map(m => m.id)) + 1 : 1,
    id_cuenta: acc.id,
    tipo: 'pago',
    monto: numericMonto,
    moneda,
    descripcion: targetTurnoId ? `Abono imputado a turno ID: ${targetTurnoId}` : `Abono general registrado a cuenta`,
    fecha: new Date().toISOString()
  });
  
  // If general payment, try to amortize outstanding turnos
  if (!targetTurnoId) {
    let remainder = numericMonto;
    const unpaidTurnos = db.turnos.filter(t => t.dni_paciente === dni_paciente && t.estado === "Realizado").sort((a,b) => a.fecha_hora.localeCompare(b.fecha_hora));
    
    for (const t of unpaidTurnos) {
      const treatments = db.turnos_tratamientos.filter(tt => tt.id_turno === t.id);
      const prevPayments = db.pagos.filter(p => p.id_turno === t.id && p.moneda === moneda);
      
      const cost = treatments.reduce((sum, tt) => sum + (moneda === 'ARS' ? tt.precio_ars : tt.precio_usd) * tt.cantidad, 0);
      const paid = prevPayments.reduce((sum, p) => sum + p.monto, 0);
      
      const pending = cost - paid;
      if (pending > 0) {
        const applied = Math.min(remainder, pending);
        // Link this general payment partial amount to the turno implicitly by creating a sub-record or tracking
        // (For simplicity we just reduce remainder, and we can link the Pago record directly to that Turno if applicable!)
        remainder -= applied;
        if (applied === pending) {
          // Turno fully paid in this currency
        }
        if (remainder <= 0) break;
      }
    }
  }
  
  acc.ultima_actualizacion = new Date().toISOString();
  saveDb();
  
  res.status(201).json({
    ...newPago,
    constancia_turno: constancia
  });
});

app.get('/api/finanzas/pagos', requireAuth(), (req, res) => {
  const { fecha_desde, fecha_hasta, metodo_pago, dni_paciente, id_doctor, solo_deudores, moneda } = req.query;
  let list = db.pagos;
  
  if (fecha_desde) {
    list = list.filter(p => new Date(p.fecha_pago) >= new Date(fecha_desde as string));
  }
  if (fecha_hasta) {
    list = list.filter(p => new Date(p.fecha_pago) <= new Date(fecha_hasta as string));
  }
  if (metodo_pago) {
    list = list.filter(p => p.metodo_pago === metodo_pago);
  }
  if (moneda) {
    list = list.filter(p => p.moneda === moneda);
  }
  if (dni_paciente) {
    list = list.filter(p => p.dni_paciente === dni_paciente);
  }
  if (id_doctor) {
    const docId = parseInt(id_doctor as string);
    list = list.filter(p => {
      if (!p.id_turno) return false;
      const t = db.turnos.find(x => x.id === p.id_turno);
      return t ? t.id_doctor === docId : false;
    });
  }
  if (solo_deudores === "true") {
    list = list.filter(p => {
      const cc = db.cuentas_corrientes.find(c => c.dni_paciente === p.dni_paciente);
      return cc ? (cc.saldo_ars > 0 || cc.saldo_usd > 0) : false;
    });
  }
  
  const mapped = list.map(p => {
    const pac = db.pacientes.find(x => x.dni === p.dni_paciente);
    
    // Calculate dynamic constancia_turno
    let constancia: string | null = null;
    if (p.id_turno) {
      const t = db.turnos.find(x => x.id === p.id_turno);
      if (t && t.fecha_hora && typeof t.fecha_hora === 'string') {
        const tAr = getARTime(t.fecha_hora);
        const dateFormatted = `${String(tAr.day).padStart(2, '0')}/${String(tAr.month).padStart(2, '0')}`;
        const timeFormatted = `${String(tAr.hour).padStart(2, '0')}:${String(tAr.minute).padStart(2, '0')}`;
        constancia = `${dateFormatted} - ${pac ? pac.apellido : "Paciente"} (${timeFormatted})`;
      }
    }
    
    return {
      ...p,
      paciente_nombre: pac ? `${pac.nombre} ${pac.apellido}` : "Desconocido",
      constancia_turno: constancia
    };
  }).sort((a, b) => b.fecha_pago.localeCompare(a.fecha_pago));
  
  res.json(mapped);
});

app.get('/api/finanzas/caja/hoy', requireAuth(), (req, res) => {
  const dateStr = getTodayArgentinaDateStr();
  
  // Collection of today's payments in ARS and USD
  const todayPayments = db.pagos.filter(p => p.fecha_pago && typeof p.fecha_pago === 'string' && p.fecha_pago.startsWith(dateStr));
  
  const totalArs = todayPayments.filter(p => p.moneda === 'ARS').reduce((sum, p) => sum + p.monto, 0);
  const totalUsd = todayPayments.filter(p => p.moneda === 'USD').reduce((sum, p) => sum + p.monto, 0);
  
  // Count turnos hoy
  const todayTurnos = db.turnos.filter(t => t.fecha_hora && typeof t.fecha_hora === 'string' && t.fecha_hora.startsWith(dateStr));
  const realizados = todayTurnos.filter(t => t.estado === 'Realizado').length;
  const pendientes = todayTurnos.filter(t => t.estado === 'Pendiente').length;
  
  res.json({
    ingresos_ars: totalArs,
    ingresos_usd: totalUsd,
    turnos_realizados: realizados,
    turnos_pendientes: pendientes
  });
});

// 7. --- CATALOG & OBRAS SOCIALES ---
app.get('/api/catalogo/tratamientos', (req, res) => {
  const { categoria } = req.query;
  let list = db.tratamientos_catalogo.filter(t => t.activo);
  if (categoria) {
    list = list.filter(t => t.categoria === categoria);
  }
  res.json(list);
});

app.post('/api/catalogo/tratamientos', requireAuth(["admin", "secretaria"]), (req, res) => {
  const { nombre, precio_ars, precio_usd, duracion_minutos, categoria } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es requerido." });
  }
  if (precio_ars === undefined && precio_usd === undefined) {
    return res.status(400).json({ error: "Debe ingresar al menos un precio en ARS o USD." });
  }
  
  const newT: TratamientoCatalogo = {
    id: db.tratamientos_catalogo.length ? Math.max(...db.tratamientos_catalogo.map(x => x.id)) + 1 : 1,
    nombre,
    precio_ars: precio_ars || 0,
    precio_usd: precio_usd || 0,
    duracion_minutos: duracion_minutos || 30,
    categoria: categoria || "General",
    activo: true
  };
  db.tratamientos_catalogo.push(newT);
  saveDb();
  res.status(201).json(newT);
});

app.put('/api/catalogo/tratamientos/:id', requireAuth(["admin", "secretaria"]), (req, res) => {
  const id = parseInt(req.params.id);
  const t = db.tratamientos_catalogo.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: "Tratamiento no encontrado." });
  
  const { nombre, precio_ars, precio_usd, duracion_minutos, categoria } = req.body;
  if (nombre) t.nombre = nombre;
  if (precio_ars !== undefined) t.precio_ars = precio_ars;
  if (precio_usd !== undefined) t.precio_usd = precio_usd;
  if (duracion_minutos !== undefined) t.duracion_minutos = duracion_minutos;
  if (categoria) t.categoria = categoria;
  
  saveDb();
  res.json(t);
});

app.delete('/api/catalogo/tratamientos/:id', requireAuth(["admin", "secretaria"]), (req, res) => {
  const id = parseInt(req.params.id);
  const t = db.tratamientos_catalogo.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: "Tratamiento no encontrado." });
  t.activo = false; // Soft-delete
  saveDb();
  res.json(t);
});

// Obras sociales
app.get('/api/catalogo/obras-sociales', (req, res) => {
  res.json(db.obras_sociales.filter(os => os.activo));
});

app.post('/api/catalogo/obras-sociales', requireAuth(["admin", "secretaria"]), (req, res) => {
  const { nombre } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio." });
  }
  if (db.obras_sociales.some(os => os.nombre.toLowerCase() === nombre.toLowerCase() && os.activo)) {
    return res.status(400).json({ error: "La obra social ya se encuentra registrada." });
  }
  const newOs = {
    id: db.obras_sociales.length ? Math.max(...db.obras_sociales.map(x => x.id)) + 1 : 1,
    nombre,
    activo: true
  };
  db.obras_sociales.push(newOs);
  saveDb();
  res.status(201).json(newOs);
});

app.delete('/api/catalogo/obras-sociales/:id', requireAuth(["admin", "secretaria"]), (req, res) => {
  const id = parseInt(req.params.id);
  const os = db.obras_sociales.find(x => x.id === id);
  if (!os) return res.status(404).json({ error: "Obra social no encontrada." });
  os.activo = false; // Soft-delete
  saveDb();
  res.json(os);
});

// 8. --- CLINIC CONFIG ---
app.get('/api/config/horarios', (req, res) => {
  res.json({
    zona_horaria: "America/Argentina/Buenos_Aires",
    granularidad_minutos: 30,
    dias: {
      "lunes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "martes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "miercoles": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "jueves": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "viernes": { "manana": { "inicio": "08:00", "fin": "13:00" }, "tarde": { "inicio": "16:00", "fin": "20:00" } },
      "sabado": null,
      "domingo": null
    }
  });
});

// --- MAIN SERVER STARTUP WITH VITE INTEGRATION ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
