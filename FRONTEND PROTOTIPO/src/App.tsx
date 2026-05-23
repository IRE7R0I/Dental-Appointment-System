import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X, 
  ChevronDown, 
  Download, 
  CalendarPlus, 
  Sparkles, 
  FileText,
  UserCheck,
  CheckCircle2,
  PhoneCall
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Service {
  id: string;
  name: string;
  duration: string;
  description: string;
  price: string;
}

interface Booking {
  id: string;
  service: Service;
  date: string; // YYYY-MM-DD
  time: string;
  patientName: string;
  patientEmail: string;
  patientPhonePrefix: string;
  patientPhone: string;
  patientNotes?: string;
  doctorName: string;
  specialty: string;
  location: string;
  createdAt: string;
}

const DENTAL_SERVICES: Service[] = [
  {
    id: "serv-1",
    name: "CONSULTA",
    duration: "15min",
    description: "Revisión general diagnóstica para evaluar la salud oral actual y determinar tratamientos ideales.",
    price: "$5.000"
  },
  {
    id: "serv-2",
    name: "CONSULTA + LIMPIEZA DENTAL",
    duration: "30min",
    description: "Examen de control con remoción de sarro y placa mediante ultrasonido para una sonrisa radiante.",
    price: "$12.000"
  },
  {
    id: "serv-3",
    name: "TRATAMIENTO DE CONDUCTO",
    duration: "45min",
    description: "Intervención dental precisa para salvar piezas dañadas de forma indolora y segura.",
    price: "$28.000"
  },
  {
    id: "serv-4",
    name: "RADIOGRAFÍA DENTAL digital",
    duration: "15min",
    description: "Captura instantánea de imágenes óseas para diagnóstico temprano de caries o anomalías.",
    price: "$4.000"
  }
];

export default function App() {
  // Global States
  const [view, setView] = useState<"home" | "booking" | "my-bookings">("home");
  const [activeStep, setActiveStep] = useState<number>(1); // Step 1 to 4 of booking
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  // Form State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(""); // e.g. "2026-05-25"
  const [selectedTime, setSelectedTime] = useState<string>(""); // e.g. "20:00"
  const [patientName, setPatientName] = useState<string>("");
  const [patientEmail, setPatientEmail] = useState<string>("");
  const [patientPhonePrefix, setPatientPhonePrefix] = useState<string>("+54");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientNotes, setPatientNotes] = useState<string>("");
  const [rememberData, setRememberData] = useState<boolean>(true);

  // Search/Lookup State for Existing booking lookup
  const [searchEmail, setSearchEmail] = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [matchedBookings, setMatchedBookings] = useState<Booking[]>([]);

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Success view state
  const [bookedData, setBookedData] = useState<Booking | null>(null);

  // Dr. Details representing constraints config
  const doctorName = "Doctor Test 1";
  const doctorSpecialty = "ODONTOLOGÍA";
  const doctorLocation = "Bolívar 450, OdontoGest Central";

  // Load bookings and remembered client data from localStorage on mount
  useEffect(() => {
    const savedBookings = localStorage.getItem("odontogest_bookings");
    if (savedBookings) {
      try {
        setBookings(JSON.parse(savedBookings));
      } catch (e) {
        console.error("Error parsing bookings", e);
      }
    }

    const savedName = localStorage.getItem("odontogest_patient_name") || "";
    const savedEmail = localStorage.getItem("odontogest_patient_email") || "";
    const savedPrefix = localStorage.getItem("odontogest_patient_prefix") || "+54";
    const savedPhone = localStorage.getItem("odontogest_patient_phone") || "";

    if (savedName) setPatientName(savedName);
    if (savedEmail) setPatientEmail(savedEmail);
    if (savedPrefix) setPatientPhonePrefix(savedPrefix);
    if (savedPhone) setPatientPhone(savedPhone);
  }, []);

  const triggerNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Helper date parsing (2026-05-21 is the current date from metadata)
  const todayISO = "2026-05-21";
  const currentYear = 2026;
  const currentMonthIdx = 4; // May is 4 (0-indexed)

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const daysOfWeek = ["LU", "MA", "MI", "JU", "VI", "SA", "DO"];

  // Days in May 2026: Friday is May 1st, 31 days total
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOffset = (year: number, month: number) => {
    // getDay() gives 0 for Sunday, 1 for Monday, etc.
    // We want 0 for Monday, 1 for Tuesday ... 6 for Sunday
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Generate calendar days for May 2026 (or whichever month)
  const offset = getFirstDayOffset(currentYear, currentMonthIdx); // Offset for May 1st 2026 (Friday, so offset = 4)
  const totalDays = getDaysInMonth(currentYear, currentMonthIdx);

  const prevMonthDays = getDaysInMonth(currentYear, currentMonthIdx - 1);

  // Time Slots definition (Argentina / local time)
  const defaultTimeSlots = ["09:00", "09:30", "10:15", "11:00", "15:30", "16:00", "16:45", "17:30", "19:45", "20:00", "20:15", "20:30"];

  // Start booking wizard
  const handleStartBooking = () => {
    // Reset wizard
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
    setEditingBookingId(null);
    setActiveStep(1);
    setView("booking");
  };

  // Select service
  const handleChooseService = (service: Service) => {
    setSelectedService(service);
    setActiveStep(2);
  };

  // Confirm date selection
  const handleSelectDate = (dayNum: number) => {
    const padded = dayNum.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${(currentMonthIdx + 1).toString().padStart(2, "0")}-${padded}`;
    setSelectedDate(dateStr);
    setSelectedTime(""); // Reset time on date change
  };

  // Move forward through manual validation
  const handleStepForward = () => {
    if (activeStep === 1) {
      if (!selectedService) {
        triggerNotification("Por favor, selecciona un servicio médico.", "error");
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (!selectedDate || !selectedTime) {
        triggerNotification("Debe seleccionar una fecha y hora válidas.", "error");
        return;
      }
      setActiveStep(3);
    } else if (activeStep === 3) {
      if (!patientName.trim()) {
        triggerNotification("El nombre completo es requerido.", "error");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!patientEmail.trim() || !emailRegex.test(patientEmail)) {
        triggerNotification("Por favor, ingrese un correo electrónico válido.", "error");
        return;
      }
      if (!patientPhone.trim() || patientPhone.length < 6) {
        triggerNotification("Por favor, ingrese un número de celular válido.", "error");
        return;
      }

      // If user selected "remember", save to localStorage
      if (rememberData) {
        localStorage.setItem("odontogest_patient_name", patientName);
        localStorage.setItem("odontogest_patient_email", patientEmail);
        localStorage.setItem("odontogest_patient_prefix", patientPhonePrefix);
        localStorage.setItem("odontogest_patient_phone", patientPhone);
      } else {
        localStorage.removeItem("odontogest_patient_name");
        localStorage.removeItem("odontogest_patient_email");
        localStorage.removeItem("odontogest_patient_prefix");
        localStorage.removeItem("odontogest_patient_phone");
      }

      setActiveStep(4);
    }
  };

  const handleStepBack = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    } else {
      setView("home");
    }
  };

  // Submit appointment creation / editing
  const handleConfirmReservation = () => {
    if (!selectedService || !selectedDate || !selectedTime || !patientName || !patientEmail || !patientPhone) {
      triggerNotification("Faltan datos obligatorios para concretar la reserva.", "error");
      return;
    }

    if (editingBookingId) {
      // Edit mode
      const updated = bookings.map(b => {
        if (b.id === editingBookingId) {
          return {
            ...b,
            service: selectedService,
            date: selectedDate,
            time: selectedTime,
            patientName,
            patientEmail,
            patientPhonePrefix,
            patientPhone,
            patientNotes,
            createdAt: new Date().toISOString()
          };
        }
        return b;
      });
      localStorage.setItem("odontogest_bookings", JSON.stringify(updated));
      setBookings(updated);
      
      const modifiedObj = updated.find(b => b.id === editingBookingId);
      if (modifiedObj) {
        setBookedData(modifiedObj);
      }
      triggerNotification("¡Su reserva de turno ha sido reprogramada con éxito en OdontoGest!");
    } else {
      // Create new booking
      const newBooking: Booking = {
        id: "book_" + Math.random().toString(36).substr(2, 9),
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        patientName,
        patientEmail,
        patientPhonePrefix,
        patientPhone,
        patientNotes,
        doctorName,
        specialty: doctorSpecialty,
        location: doctorLocation,
        createdAt: new Date().toISOString()
      };

      const updated = [newBooking, ...bookings];
      localStorage.setItem("odontogest_bookings", JSON.stringify(updated));
      setBookings(updated);
      setBookedData(newBooking);
      triggerNotification("¡Su reserva de turno ha sido confirmada con éxito en OdontoGest!");
    }

    // Go to success view (Step 5 of wizard represented as activeStep = 5)
    setActiveStep(5);
  };

  // Setup Edit flow
  const handleInitEditing = (booking: Booking) => {
    setEditingBookingId(booking.id);
    setSelectedService(booking.service);
    setSelectedDate(booking.date);
    setSelectedTime(booking.time);
    setPatientName(booking.patientName);
    setPatientEmail(booking.patientEmail);
    setPatientPhonePrefix(booking.patientPhonePrefix);
    setPatientPhone(booking.patientPhone);
    setPatientNotes(booking.patientNotes || "");
    setActiveStep(1); // start by choosing service or edit date directly
    setView("booking");
  };

  // Cancel reservation
  const handleCancelBooking = (bookingId: string) => {
    if (confirm("¿Está seguro de que desea cancelar esta reserva? No podrá deshacer esta acción.")) {
      const remaining = bookings.filter(b => b.id !== bookingId);
      localStorage.setItem("odontogest_bookings", JSON.stringify(remaining));
      setBookings(remaining);
      triggerNotification("La reserva de turno ha sido cancelada correctamente.", "success");
      
      if (view === "my-bookings") {
        // Update matchedBookings
        setMatchedBookings(prev => prev.filter(b => b.id !== bookingId));
      }
    }
  };

  const handleSearchBookings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    
    const matched = bookings.filter(b => b.patientEmail.toLowerCase().trim() === searchEmail.toLowerCase().trim());
    setMatchedBookings(matched);
    setHasSearched(true);
  };

  // Format YYYY-MM-DD back to humanist spanish string e.g. "25 de Mayo, 2026"
  const formatHumanDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return `${day} de ${monthNames[month]}, ${year}`;
  };

  return (
    <div className="min-h-screen text-slate-800 flex flex-col font-sans transition-colors duration-300 relative selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-55 p-4 rounded-xl shadow-xl border flex items-center gap-3 w-max max-w-[90%] font-bold ${
              notification.type === "error" 
                ? "bg-red-50 text-red-800 border-red-200" 
                : "bg-emerald-50 text-emerald-800 border-emerald-250"
            }`}
          >
            {notification.type === "error" ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar / Brand Top Bar */}
      <header className="bg-white/45 backdrop-blur-md border-b border-white/30 sticky top-0 z-30 transition-shadow">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("home")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight text-blue-700">OdontoGest</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] bg-white/70 text-blue-700 border border-white/40 px-2 py-0.5 rounded-full font-bold">Dental System</span>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <button 
              onClick={() => { setView("home"); setActiveStep(1); }} 
              className={`text-sm px-3 py-2 rounded-lg font-bold transition-all ${
                view === "home" ? "text-blue-700 bg-white/70 shadow-sm border border-white/40" : "text-slate-600 hover:text-gray-950 hover:bg-white/30"
              }`}
            >
              Nuevo Turno
            </button>
            <button 
              onClick={() => { setView("my-bookings"); setHasSearched(false); setSearchEmail(""); }} 
              className={`text-sm px-3 py-2 rounded-lg font-bold transition-all ${
                view === "my-bookings" ? "text-blue-700 bg-white/70 shadow-sm border border-white/40" : "text-slate-600 hover:text-gray-950 hover:bg-white/30"
              }`}
            >
              Mis Reservas
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-[1200px] w-full mx-auto p-4 sm:p-6 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          
          {/* VIEW: HOME */}
          {view === "home" && (
            <motion.div 
              key="home-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Premium Clinical Banner (Replacing 'M' logo background) */}
              <div className="relative rounded-2xl md:rounded-3xl overflow-hidden h-[240px] md:h-[320px] bg-sky-950 shadow-lg border border-white/40 shadow-xl shadow-blue-900/5">
                <img 
                  src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&h=400&q=80" 
                  alt="OdontoGest Dental Clinic" 
                  className="w-full h-full object-cover opacity-85"
                  referrerPolicy="no-referrer"
                />
                
                {/* Accent overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-900/40 to-transparent"></div>

                <div className="absolute inset-0 flex flex-col justify-end items-center text-center p-6 md:p-8">
                  {/* Circular clinic logo */}
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white/60 bg-white/70 overflow-hidden shadow-xl mb-3 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <img 
                      src="https://images.unsplash.com/photo-1629909615184-74f495363b67?auto=format&fit=crop&w=150&h=150&q=80" 
                      alt="Dental Care Logo" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <h1 className="font-display font-black text-2xl md:text-3xl lg:text-4xl text-white tracking-tight drop-shadow-md">
                    OdontoGest
                  </h1>
                  <p className="text-gray-100 text-sm md:text-base mt-1 font-bold select-none drop-shadow">
                    ¡Bienvenidos! Seleccione la agenda deseada!
                  </p>
                </div>
              </div>

              {/* Agenda list section */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-2 text-slate-600 font-bold px-1">
                  <div className="p-1 px-2 text-blue-600 bg-white/60 border border-white/50 rounded-lg shadow-sm">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-slate-800">Agendar reserva</h2>
                </div>

                {/* Doctor Selector Card */}
                <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 p-4 sm:p-6 shadow-lg shadow-blue-900/5 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 sm:gap-6 hover:shadow-xl hover:bg-white/80 hover:border-white/55 transition-all duration-300 group">
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {/* Doctor Avatar */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-100 to-sky-200 overflow-hidden relative border border-white/50 shadow-sm flex-shrink-0">
                      <img 
                        src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80" 
                        alt="Doctor Test 1" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h3 className="font-display font-black text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                          {doctorName}
                        </h3>
                        <span className="text-[11px] font-bold tracking-wide bg-amber-150 text-amber-805 px-2 py-0.5 rounded-full uppercase border border-amber-205">
                          Presencial
                        </span>
                      </div>
                      
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{doctorSpecialty}</p>
                      
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-600 font-bold">
                        <span className="inline-block w-20 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold tracking-wider text-center border border-emerald-100">
                          ● Activo
                        </span>
                        <span>Próximo disponible: Mañana</span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Trigger Button */}
                  <div className="w-full sm:w-auto flex flex-col justify-center">
                    <button 
                      onClick={handleStartBooking}
                      className="w-full sm:w-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-750 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-150 active:scale-95 group/btn"
                    >
                      <span>Reservar</span>
                      <ChevronRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </div>

                {/* Footnote stating app authorship */}
                <div className="text-center pt-8">
                  <p className="text-xs text-slate-400 font-bold select-none">
                    Hecho con <span className="font-black text-blue-600">OdontoGest</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: BOOKING WIZARD */}
          {view === "booking" && (
            <motion.div 
              key="booking-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              
              {/* LEFT COLUMN: STATIC INFO DRAWER (1/3 Width on Large Screens) */}
              <div className="lg:col-span-4 bg-white/60 backdrop-blur-md rounded-3xl border border-white/40 p-6 shadow-lg shadow-blue-900/5 space-y-6">
                
                {/* Image Gradient Doctor Box (Matches original UI concept) */}
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 shadow-inner flex items-center justify-center">
                  <img 
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=500&q=80" 
                    alt="Doctor Test 1" 
                    className="absolute inset-0 w-full h-full object-cover opacity-90 brightness-95"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle decorative tooth glow icon */}
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/35">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Clinician Title Block */}
                <div className="space-y-1 text-center lg:text-left border-b border-white/30 pb-5">
                  <h2 className="font-display font-bold text-2xl text-gray-955 tracking-tight">
                    {doctorName}
                  </h2>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    {doctorSpecialty}
                  </p>
                </div>

                {/* Location Box */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-600/10 rounded-2xl border border-white/40 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Turnos presenciales</h4>
                      <p className="text-xs font-bold text-blue-700 uppercase mt-1">Calle Bolívar 450</p>
                      <p className="text-[11px] text-gray-650 font-medium mt-0.5">Sede, OdontoGest Central - Buenos Aires</p>
                    </div>
                  </div>

                  {/* Informational item */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                      <Info className="w-4 h-4 text-gray-450" />
                      <span>Información</span>
                    </div>
                    <div className="bg-white/45 backdrop-blur-sm rounded-2xl p-4 border border-white/35">
                      <p className="text-sm font-medium text-gray-700">{doctorSpecialty}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Atención médica general y especializada para el cuidado dental preventivo, estético y restaurador.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hecho con OdontoGest */}
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-400 font-bold select-none">
                    Hecho con <span className="font-black text-blue-600">OdontoGest</span>
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: MAIN CONTENT FLOW (2/3 Width on Large Screens) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Header Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/40 shadow-lg shadow-blue-900/5">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleStepBack}
                      className="p-1 px-3 text-blue-600 hover:bg-white/40 rounded-lg hover:text-blue-700 font-bold text-sm flex items-center gap-1 border border-transparent hover:border-white/40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Atrás</span>
                    </button>
                    <span className="text-gray-300">|</span>
                    <h3 className="font-display font-bold text-gray-900 text-lg">Agendar reserva</h3>
                  </div>

                  <button 
                    onClick={() => { setView("my-bookings"); }}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 bg-white/50 border border-white/40 px-4 py-2 rounded-xl hover:bg-blue-600/10 transition-all self-start sm:self-auto shadow-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Reprogramar reserva existente</span>
                  </button>
                </div>

                {/* PROGRESS STEPPER (Steps 1, 2, 3, 4) */}
                {activeStep <= 4 && (
                  <div className="bg-white/60 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/40 shadow-lg shadow-blue-900/5">
                    <div className="relative flex items-center justify-between max-w-[500px] mx-auto">
                      
                      {/* Connection bar */}
                      <div className="absolute left-[8%] right-[8%] top-[14px] h-[3px] bg-slate-200/80 -z-10">
                        {/* Completed state colored path */}
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${(activeStep - 1) * 33.33}%` }}
                        ></div>
                      </div>

                      {[
                        { num: 1, label: "Servicio" },
                        { num: 2, label: "Fecha" },
                        { num: 3, label: "Datos" },
                        { num: 4, label: "Confirmar" }
                      ].map((s) => {
                        const isCompleted = s.num < activeStep;
                        const isActive = s.num === activeStep;

                        return (
                          <div key={s.num} className="flex flex-col items-center flex-1">
                            <button 
                              disabled={s.num > activeStep + 1}
                              onClick={() => {
                                // Enable going back directly by tapping numbered icons
                                if (s.num < activeStep) {
                                  setActiveStep(s.num);
                                }
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 relative ${
                                isCompleted 
                                  ? "bg-[#10B981] border-[#10B981] text-white shadow shadow-emerald-250" 
                                  : isActive 
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 scale-110" 
                                    : "bg-white border-slate-300 text-gray-400"
                              }`}
                            >
                              {isCompleted ? <Check className="w-4 h-4 stroke-[3px]" /> : s.num}
                            </button>
                            <span className={`text-[11px] sm:text-xs font-bold mt-2 ${
                              isActive ? "text-blue-600 font-black" : isCompleted ? "text-emerald-600" : "text-gray-405"
                            }`}>
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DYNAMIC SHADOW CARDS PER ACTIVE STEP */}
                <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/45 shadow-lg shadow-blue-900/5 overflow-hidden p-6 sm:p-8 min-h-[380px] flex flex-col justify-between">
                  <div className="space-y-6">

                    {/* STEP 1: SERVICE CHOICE */}
                    {activeStep === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="text-center space-y-1">
                          <h2 className="text-xl font-bold font-display text-gray-900">Selecciona el servicio a reservar</h2>
                          <p className="text-xs text-gray-500">Seleccione la opción ideal para iniciar su atención dental.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 pt-2">
                          {DENTAL_SERVICES.map((serv) => {
                            const isSelect = selectedService?.id === serv.id;
                            return (
                              <div 
                                key={serv.id}
                                onClick={() => handleChooseService(serv)}
                                className={`group p-4 rounded-2xl border transition-all duration-350 cursor-pointer flex items-center justify-between gap-4 ${
                                  isSelect 
                                    ? "bg-blue-600/10 border-blue-606 shadow-md shadow-blue-900/5 backdrop-blur-sm" 
                                    : "bg-white/45 border-white/40 hover:border-blue-300 hover:bg-white/70 hover:shadow-md transition-all duration-300"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-xl mt-0.5 border transition-colors ${
                                    isSelect ? "bg-blue-600/20 text-blue-700 border-blue-400" : "bg-white/50 border-white/50 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200"
                                  }`}>
                                    <Sparkles className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 group-hover:text-[#2563EB] transition-colors">{serv.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[500px] leading-relaxed font-light">{serv.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 roundedbg bg-gray-100 text-gray-600">Duración: {serv.duration}</span>
                                      <span className="text-xs text-[#2563EB] font-bold">{serv.price}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex-shrink-0 flex items-center gap-2">
                                  <span className="text-xs font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">Más info</span>
                                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 2: DATE & TIME SELECTOR */}
                    {activeStep === 2 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="text-center space-y-1">
                          <h2 className="text-xl font-bold font-display text-gray-900">Selecciona fecha y hora</h2>
                          <p className="text-xs text-gray-500">Elija un casillero disponible para programar su visita.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                          
                          {/* Calendar Picker (7 cols on grid) */}
                          <div className="md:col-span-7 border border-white/50 rounded-2xl p-4 bg-white/45 backdrop-blur-md shadow-sm">
                            <div className="flex items-center justify-between mb-4 px-1">
                              <h3 className="font-extrabold text-sm text-slate-800 font-display uppercase tracking-wider">
                                {monthNames[currentMonthIdx]} {currentYear}
                              </h3>
                              <div className="flex items-center gap-1.5">
                                <button disabled className="p-1 text-slate-300 rounded-lg border border-transparent hover:border-white/20 cursor-not-allowed">
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled className="p-1 text-slate-300 rounded-lg border border-transparent hover:border-white/20 cursor-not-allowed">
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Days of week header */}
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                              {daysOfWeek.map(d => (
                                <span key={d} className="text-[10px] font-bold text-slate-405 tracking-wider py-1">
                                  {d}
                                </span>
                              ))}
                            </div>

                            {/* Calendar Days items */}
                            <div className="grid grid-cols-7 gap-1">
                              {/* Empty padding blocks before Friday May 1st 2026 */}
                              {Array.from({ length: offset }).map((_, i) => (
                                <div key={`empty-${i}`} className="text-center py-2.5 text-xs text-slate-300 select-none">
                                  {prevMonthDays - offset + i + 1}
                                </div>
                              ))}

                              {/* Realistic Days in May */}
                              {Array.from({ length: totalDays }).map((_, i) => {
                                const dayNum = i + 1;
                                const isPast = dayNum < 21; // Today May 21st, 2026
                                const isWeekend = (dayNum + offset - 1) % 7 === 5 || (dayNum + offset - 1) % 7 === 6; // Saturday Sábado and Sunday Domingo
                                const testDateString = `${currentYear}-${(currentMonthIdx + 1).toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
                                const isSelected = selectedDate === testDateString;

                                const isDisabled = isPast || (isWeekend && dayNum !== 24); // Block past dates & some weekends, make May 24 active for testing

                                return (
                                  <button
                                    key={dayNum}
                                    onClick={() => !isDisabled && handleSelectDate(dayNum)}
                                    disabled={isDisabled}
                                    className={`relative py-2 pb-3.5 rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                        : isDisabled
                                          ? "text-slate-350 cursor-not-allowed bg-white/10 line-through opacity-45"
                                          : "text-slate-750 hover:bg-white hover:text-blue-600 hover:shadow-xs cursor-pointer"
                                    }`}
                                  >
                                    <span>{dayNum}</span>
                                    {/* Green indicator bubble representing clinic system slot availability */}
                                    {!isDisabled && !isSelected && (
                                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 block w-1 h-1 rounded-full bg-emerald-500"></span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Hourly Time Slot Selection (5 cols on grid) */}
                          <div className="md:col-span-5 flex flex-col space-y-4">
                            <div className="bg-white/45 backdrop-blur-sm rounded-2xl p-4 border border-white/40 flex-grow min-h-[220px] shadow-sm">
                              
                              {selectedDate ? (
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-1">
                                    <h4 className="text-sm font-black text-slate-800">{formatHumanDate(selectedDate)}</h4>
                                    <p className="text-xs text-slate-500">4 horarios disponibles</p>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Sparkles className="w-4 h-4 text-blue-610" />
                                    <span>Argentina, Buenos Aires</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </div>

                                  {/* Grid of time slots */}
                                  <div className="grid grid-cols-2 gap-2 pt-2">
                                    {defaultTimeSlots.slice(8).map((time) => {
                                      const isSelectTime = selectedTime === time;
                                      return (
                                        <button
                                          key={time}
                                          onClick={() => setSelectedTime(time)}
                                          className={`py-2 px-3 text-xs font-semibold rounded-xl border text-center transition-all ${
                                            isSelectTime
                                              ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-150"
                                              : "bg-white/70 text-slate-700 border-white/50 hover:bg-white hover:border-blue-300"
                                          }`}
                                        >
                                          {time}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                  <Calendar className="w-10 h-10 text-slate-350 mb-2" />
                                  <p className="text-xs font-semibold text-slate-405">Selecciona un día en el calendario para visualizar horarios.</p>
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3: PATIENT DATA INPUTS */}
                    {activeStep === 3 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="text-center space-y-1">
                          <h2 className="text-xl font-bold font-display text-gray-900">Completa los datos</h2>
                          <p className="text-xs text-gray-500">Debe ingresar los de contacto del paciente receptor del turno.</p>
                        </div>

                        <div className="space-y-4 pt-2">
                          {/* Name Input */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Nombre completo</label>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                type="text"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                placeholder="Ingrese el nombre y apellido"
                                className="w-full pl-10 pr-4 py-3 bg-white/45 backdrop-blur-sm border border-white/50 rounded-xl text-sm focus:outline-none focus:bg-white/80 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-medium text-slate-800"
                              />
                            </div>
                          </div>

                          {/* Email Input */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Correo electrónico</label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input 
                                type="email"
                                value={patientEmail}
                                onChange={(e) => setPatientEmail(e.target.value)}
                                placeholder="Ingrese su email"
                                className="w-full pl-10 pr-4 py-3 bg-white/45 backdrop-blur-sm border border-white/50 rounded-xl text-sm focus:outline-none focus:bg-white/80 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-medium text-slate-800"
                              />
                            </div>
                          </div>

                          {/* Phone Row */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Teléfono</label>
                            <div className="flex gap-2">
                              <div className="relative flex-shrink-0">
                                <select 
                                  value={patientPhonePrefix}
                                  onChange={(e) => setPatientPhonePrefix(e.target.value)}
                                  className="appearance-none bg-white/45 backdrop-blur-sm border border-white/50 rounded-xl py-3 pl-3.5 pr-8 text-sm focus:outline-none focus:bg-white/80 focus:border-blue-400 font-medium text-slate-700 h-full"
                                >
                                  <option value="+54">AR +54</option>
                                  <option value="+56">CL +56</option>
                                  <option value="+34">ES +34</option>
                                  <option value="+598">UY +598</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450 pointer-events-none" />
                              </div>

                              <div className="relative flex-grow">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                  type="tel"
                                  value={patientPhone}
                                  onChange={(e) => setPatientPhone(e.target.value)}
                                  placeholder="Ingrese su celular"
                                  className="w-full pl-10 pr-4 py-3 bg-white/45 backdrop-blur-sm border border-white/50 rounded-xl text-sm focus:outline-none focus:bg-white/80 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-medium text-slate-800"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Notes (Optional) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Nota <span className="text-slate-455 capitalize font-medium">(opcional)</span></label>
                            <textarea 
                              rows={2}
                              value={patientNotes}
                              onChange={(e) => setPatientNotes(e.target.value)}
                              placeholder="Ingresa cualquier aclaración o mensaje."
                              className="w-full p-4 bg-white/45 backdrop-blur-sm border border-white/50 rounded-xl text-sm focus:outline-none focus:bg-white/80 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-medium text-slate-800"
                            ></textarea>
                          </div>

                          {/* Remember Info Switch */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-slate-600">Recordar mis datos en el futuro</span>
                            <button 
                              onClick={() => setRememberData(!rememberData)}
                              className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                                rememberData ? "bg-[#2563EB]" : "bg-slate-300"
                              }`}
                              style={{ backgroundColor: rememberData ? "#2563EB" : "#CBD5E1" }}
                            >
                              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                rememberData ? "translate-x-5" : ""
                              }`}></span>
                            </button>
                          </div>

                        </div>
                      </motion.div>
                    )}

                    {/* STEP 4: REVIEW & CONFIRM RESUME */}
                    {activeStep === 4 && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <div className="text-center space-y-1">
                          <h2 className="text-xl font-bold font-display text-gray-900">Resumen de la reserva</h2>
                          <p className="text-xs text-gray-500">Revisa los detalles antes de confirmar tu turno.</p>
                        </div>

                        {/* Booking Summary Ticket Container */}
                        <div className="border border-white/50 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md bg-white/40">
                          
                          {/* Inner Header */}
                          <div className="p-4 bg-white/50 border-b border-white/20 flex items-center gap-3">
                            <img 
                              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=80&h=80&q=80" 
                              alt="Doctor Test 1" 
                              className="w-10 h-10 rounded-full object-cover border border-white/60 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900">{doctorName}</h4>
                              <p className="text-[11px] font-black text-blue-600 uppercase tracking-wider">{doctorSpecialty}</p>
                            </div>
                          </div>

                          {/* Grid particulars */}
                          <div className="p-5 bg-white/30 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm border-b border-white/20">
                            
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Servicio</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800">{selectedService?.name}</span>
                                <span className="text-[10px] font-bold bg-amber-100/60 text-amber-800 border border-amber-200/50 px-2 py-0.5 rounded-full">
                                  Presencial
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 block">Duración estipulada: {selectedService?.duration} ({selectedService?.price || "N/C"})</span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fecha y Hora</span>
                              <div className="flex items-center gap-2 font-extrabold text-slate-800">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span>{formatHumanDate(selectedDate)} a las {selectedTime} hs</span>
                              </div>
                            </div>

                          </div>

                          {/* Patient Data Details Box */}
                          <div className="p-5 bg-white/20 space-y-3">
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Datos del Paciente</h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="p-3 bg-white/50 rounded-xl border border-white/40 flex items-center gap-2.5">
                                <User className="w-4 h-4 text-slate-400" />
                                <div className="truncate">
                                  <span className="text-[9px] text-slate-405 block uppercase font-black">Paciente</span>
                                  <span className="text-xs font-bold text-slate-800 truncate block">{patientName}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-white/50 rounded-xl border border-white/40 flex items-center gap-2.5">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <div className="truncate">
                                  <span className="text-[9px] text-slate-405 block uppercase font-black">Email</span>
                                  <span className="text-xs font-semibold text-slate-800 truncate block">{patientEmail}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-white/50 rounded-xl border border-white/40 flex items-center gap-2.5">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <div className="truncate">
                                  <span className="text-[9px] text-slate-405 block uppercase font-black">Teléfono</span>
                                  <span className="text-xs font-semibold text-slate-800 truncate block">{patientPhonePrefix} {patientPhone}</span>
                                </div>
                              </div>
                            </div>

                            {/* Additional patient note */}
                            {patientNotes && (
                              <div className="p-3 bg-white/40 rounded-xl border border-white/30 flex gap-2">
                                <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-650 font-normal italic leading-relaxed">{patientNotes}</p>
                              </div>
                            )}

                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 5: BOOKING RESERVATION SUCCESS VIEW */}
                    {activeStep === 5 && bookedData && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6 py-6"
                      >
                        <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full border-4 border-emerald-150 animate-bounce">
                          <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                        </div>

                        <div className="space-y-2">
                          <h2 className="text-2xl font-black text-gray-900 font-display">¡Turno Reservado con Éxito!</h2>
                          <p className="text-sm text-[#10B981] font-bold">Un comprobante e información han sido asignados.</p>
                        </div>

                        {/* Receipt Container */}
                        <div className="max-w-md mx-auto bg-white/40 border border-white/50 backdrop-blur-md rounded-2xl p-5 text-left space-y-4 shadow-sm relative">
                          <div className="absolute top-4 right-4 text-[10px] bg-emerald-500/20 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-400/50">
                            CONFIRMADO
                          </div>

                          <div className="border-b border-white/20 pb-3">
                            <span className="font-extrabold text-xs text-blue-600 tracking-wide uppercase">CITA ODONTOLÓGICA</span>
                            <h4 className="font-black text-base text-slate-800 mt-0.5">{bookedData.service.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{bookedData.service.description}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs border-b border-white/20 pb-3">
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block font-bold">Profesional dental</span>
                              <span className="font-extrabold text-slate-800">{bookedData.doctorName}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block font-bold">Fecha y Hora</span>
                              <span className="font-extrabold text-slate-800">{formatHumanDate(bookedData.date)}</span>
                              <span className="block text-blue-600 font-black">{bookedData.time} hs</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block font-bold">Paciente</span>
                              <span className="font-extrabold text-slate-800">{bookedData.patientName}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-slate-400 block font-bold">Sede dental</span>
                              <span className="font-extrabold text-slate-800">Bolivar 450, Piso 1</span>
                            </div>
                          </div>
                        </div>

                        {/* Calendar integration & secondary utilities */}
                        <div className="max-w-md mx-auto pt-2 grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => triggerNotification("Sincronización simulada con Google Calendar completada.")}
                            className="inline-flex items-center justify-center gap-2 p-3 bg-white/40 border border-white/50 rounded-xl hover:bg-white/70 hover:text-blue-600 text-xs font-bold text-slate-700 transition-all shadow-sm"
                          >
                            <CalendarPlus className="w-4 h-4" />
                            <span>Añadir a Google Calendar</span>
                          </button>
                          
                          <button 
                            onClick={() => triggerNotification("¡Comprobante PDF descargado!")}
                            className="inline-flex items-center justify-center gap-2 p-3 bg-white/40 border border-white/50 rounded-xl hover:bg-white/70 hover:text-emerald-600 text-xs font-bold text-slate-700 transition-all shadow-sm"
                          >
                            <Download className="w-4 h-4" />
                            <span>Comprobante PDF</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </div>

                  {/* BOTTOM ACTION BUTTONS BAR */}
                  {activeStep <= 4 && (
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-8">
                      <button
                        onClick={handleStepBack}
                        className="py-2.5 px-5 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
                      >
                        Atrás
                      </button>

                      {activeStep < 4 ? (
                        <button
                          onClick={handleStepForward}
                          className="inline-flex items-center justify-center bg-[#2563EB] hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer shadow-blue-150"
                        >
                          <span>Continuar</span>
                          <ChevronRight className="w-4 h-4 ml-1.5" />
                        </button>
                      ) : (
                        <button
                          onClick={handleConfirmReservation}
                          className="inline-flex items-center justify-center bg-[#10B981] hover:bg-emerald-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer shadow-emerald-150 animate-pulse"
                        >
                          <span>Confirmar reserva</span>
                          <Check className="w-4 h-4 ml-1.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* SUCCESS BOTTOM CLOSE BAR */}
                  {activeStep === 5 && (
                    <div className="flex justify-center pt-6 border-t border-gray-100 mt-8">
                      <button
                        onClick={() => { setView("home"); setActiveStep(1); }}
                        className="py-2.5 px-6 rounded-xl text-sm font-bold bg-[#2563EB] text-white hover:bg-blue-700 transition-all shadow shadow-blue-200 cursor-pointer"
                      >
                        Terminar y Volver
                      </button>
                    </div>
                  )}

                </div>

              </div>

            </motion.div>
          )}

          {/* VIEW: MY BOOKINGS (LOOKUP ENDPOINT) */}
          {view === "my-bookings" && (
            <motion.div 
              key="bookings-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-white/60 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-white/45 shadow-lg shadow-blue-900/5 space-y-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    <span>Administrar mi turno</span>
                  </h2>
                  <p className="text-xs text-slate-500">Ingrese el email utilizado en la reserva para buscar y gestionar sus citas.</p>
                </div>

                {/* Email Lookup form */}
                <form onSubmit={handleSearchBookings} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-grow">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email"
                      required
                      placeholder="Ingrese su email de reserva"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/45 backdrop-blur-sm border border-white/50 rounded-xl text-sm focus:outline-none focus:bg-white/85 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-medium text-slate-800 transition-all font-semibold"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-heavy px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-blue-150 flex items-center justify-center gap-2"
                  >
                    <span>Buscar cita</span>
                  </button>
                </form>

                {/* Bookings query results */}
                {hasSearched ? (
                  <div className="space-y-4 pt-4 border-t border-white/20">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      RESULTADOS COINCIDENTES ({matchedBookings.length})
                    </h3>

                    {matchedBookings.length > 0 ? (
                      <div className="space-y-3">
                        {matchedBookings.map((bk) => (
                          <div 
                            key={bk.id}
                            className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 hover:border-blue-300 hover:shadow-md transition-all duration-305"
                          >
                            <div className="space-y-1 text-center sm:text-left">
                              <span className="text-[10px] bg-blue-600/10 text-blue-700 border border-blue-400/40 font-bold px-2 py-0.5 rounded-full select-none">{bk.service.name}</span>
                              <h4 className="font-extrabold text-sm text-slate-800 pt-1">Reservado para: {bk.patientName}</h4>
                              <p className="text-xs text-slate-500 font-semibold">Médico: {bk.doctorName} • {bk.specialty}</p>
                              
                              <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-blue-600 font-bold mt-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatHumanDate(bk.date)} a las {bk.time} hs</span>
                              </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleInitEditing(bk)}
                                className="flex-1 sm:flex-none text-xs font-bold text-blue-700 bg-white/60 hover:bg-white border border-white/60 hover:border-blue-300 px-3 py-2 rounded-xl transition-all text-center cursor-pointer"
                              >
                                Reprogramar
                              </button>
                              <button
                                onClick={() => handleCancelBooking(bk.id)}
                                className="flex-1 sm:flex-none text-xs font-bold text-red-600 bg-white/60 hover:bg-white border border-white/60 hover:border-red-300 px-3 py-2 rounded-xl transition-all text-center cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white/20 backdrop-blur-sm rounded-2xl border border-dashed border-white/50 flex flex-col items-center">
                        <AlertCircle className="w-8 h-8 text-slate-350 mb-2" />
                        <p className="text-xs font-semibold text-slate-405">No se encontraron reservas con el email proporcionado.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Initial fallback when viewing My Bookings tab having recent local list
                  bookings.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-white/20">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        TUS RESERVAS RECIENTES EN ESTE DISPOSITIVO
                      </h3>
                      <div className="space-y-3">
                        {bookings.slice(0, 3).map((bk) => (
                          <div 
                            key={bk.id}
                            className="bg-white/40 backdrop-blur-sm border border-white/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 shadow-xs"
                          >
                            <div className="space-y-1 text-center sm:text-left">
                              <span className="text-[10px] bg-blue-600/10 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{bk.service.name}</span>
                              <h4 className="font-extrabold text-sm text-slate-800 pt-1">Paciente: {bk.patientName}</h4>
                              <p className="text-xs font-semibold text-slate-400">{formatHumanDate(bk.date)} a las {bk.time} hs</p>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleInitEditing(bk)}
                                className="flex-1 sm:flex-none text-xs font-bold text-blue-700 bg-white/50 border border-white/50 hover:bg-white px-3 py-2 rounded-xl transition-all cursor-pointer"
                              >
                                Reprogramar
                              </button>
                              <button
                                onClick={() => handleCancelBooking(bk.id)}
                                className="flex-1 sm:flex-none text-xs font-bold text-red-600 bg-white/50 border border-white/50 hover:bg-white px-3 py-2 rounded-xl transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Back to welcome */}
              <div className="text-center pt-2">
                <button 
                  onClick={() => setView("home")}
                  className="text-xs font-black text-slate-500 hover:text-blue-600 underline underline-offset-4 cursor-pointer transition-colors"
                >
                  Volver al inicio
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Aesthetic Footer */}
      <footer className="bg-white/45 backdrop-blur-md border-t border-white/30 mt-12 py-6 select-none transition-all">
        <div className="max-w-[1200px] mx-auto px-4 text-center space-y-1.5">
          <p className="text-xs text-slate-500 font-extrabold">
            © {currentYear} OdontoGest. Todos los derechos reservados.
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Sistema de Reserva de Turnos Online Clínico • OdontoGest
          </p>
        </div>
      </footer>
    </div>
  );
}
