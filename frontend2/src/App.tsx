import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, useToast } from './components/Toast';
import { NavigationRail } from './components/NavigationRail';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AgendaPage } from './pages/AgendaPage';
import { PagosPage } from './pages/PagosPage';
import { PacientesPage } from './pages/PacientesPage';
import { HistorialPage } from './pages/HistorialPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { DoctoresPage } from './pages/DoctoresPage';
import { CatalogoPage } from './pages/CatalogoPage';
import { IconTooth } from './components/IconTooth';
import { TooltipProvider } from './components/Tooltip';
import { Menu } from 'lucide-react';
import { apiFetch } from './lib/api';

function ProtectedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [role, setRole] = useState('secretaria');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setAuthenticated(false);
    } else {
      setAuthenticated(true);
      setRole(localStorage.getItem('user_role') || 'secretaria');
      setUsername(localStorage.getItem('user_username') || 'Usuario');
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    setAuthenticated(false);
    navigate('/login');
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const userDispName = username || localStorage.getItem('user_username') || 'Usuario';
  const hours = currentTime.getHours();
  const greeting = hours >= 9 && hours < 16 ? `Buen día, ${userDispName}` : `Buenas tardes, ${userDispName}`;

  const weekday = currentTime.toLocaleDateString('es-AR', { weekday: 'long' });
  const day = currentTime.getDate();
  const month = currentTime.toLocaleDateString('es-AR', { month: 'long' });
  const year = currentTime.getFullYear();
  const formattedDate = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} de ${month.toLowerCase()} de ${year}`;
  const formattedTime = currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  const [mobileOpen, setMobileOpen] = useState(false);

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#F1EFE8] flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-[#1D9E75]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (authenticated === false) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F1EFE8] text-neutral-warm-900 font-sans antialiased">
      {/* Sidebar Navigation Rail */}
      <NavigationRail mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={handleLogout} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar header */}
        <header className="bg-white border-b border-neutral-warm-100 min-h-16 py-3 px-4 md:px-6 sticky top-0 z-30 flex items-center">
          <div className="max-w-[1920px] w-full mx-auto flex items-center justify-between gap-3">
            {/* Left side: Hamburger, Tooth icon, and Greeting */}
            <div className="flex items-center space-x-3 min-w-0">
              {/* Hamburger menu for mobile */}
              <button
                id="btn-mobile-sidebar-toggle"
                onClick={() => setMobileOpen(prev => !prev)}
                className="md:hidden p-1.5 -ml-1 rounded-lg text-neutral-warm-600 hover:bg-neutral-warm-100 cursor-pointer transition-colors focus:outline-none flex items-center justify-center"
                aria-label="Abrir menú"
              >
                <Menu size={26} className="stroke-[2.2]" />
              </button>
              
              <div className="flex items-center space-x-2 min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-neutral-warm-900 capitalize truncate flex items-center gap-2">
                  <span>{greeting}</span>
                  <IconTooth size={20} className="text-brand-600 shrink-0" />
                </h1>
              </div>
            </div>

            {/* Right side: Combined Date and Time on the same row */}
            <div className="flex items-center space-x-2 shrink-0 text-right animate-fade-in">
              {/* Desktop Date/Time format */}
              <div className="hidden sm:flex items-center space-x-3 tracking-tight">
                <span className="text-xs md:text-sm font-medium text-neutral-warm-600">{formattedDate}</span>
                <span className="text-neutral-warm-300 select-none">•</span>
                <span className="text-sm sm:text-base md:text-lg font-bold text-neutral-warm-950 font-sans flex items-baseline">
                  {formattedTime}<span className="text-xs font-semibold text-neutral-warm-500 ml-0.5">hs</span>
                </span>
              </div>
              
              {/* Mobile Shorter Date/Time format to prevent wrapping/crowding */}
              <div className="flex sm:hidden items-center space-x-2 text-xs xs:text-sm animate-fade-in">
                <span className="font-medium text-neutral-warm-600 truncate max-w-[100px] xs:max-w-none">
                  {day} de {month.slice(0, 3)}
                </span>
                <span className="text-neutral-warm-300 select-none">•</span>
                <span className="font-bold text-neutral-warm-950 flex items-baseline">
                  {formattedTime}<span className="text-[10px] font-semibold text-neutral-warm-500 ml-0.5">hs</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content View Outlet */}
        <main className="p-4 md:p-6 max-w-[1920px] w-full mx-auto flex-1 min-w-0 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/pacientes" element={<PacientesPage />} />
            <Route path="/pacientes/:dni/historial" element={<HistorialPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/doctores" element={<DoctoresPage />} />
            <Route path="/catalogo" element={<CatalogoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ToastProvider>
  );
}
