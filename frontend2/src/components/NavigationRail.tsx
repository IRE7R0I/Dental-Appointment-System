import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  DollarSign, 
  Users, 
  ClipboardList, 
  UserCog, 
  Stethoscope, 
  LogOut, 
  PanelLeftClose,
  PanelLeft,
  X
} from 'lucide-react';
import { IconTooth } from './IconTooth';
import { Tooltip } from './Tooltip';
import { Modal } from './Modal';

interface NavigationRailProps {
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  onLogout?: () => void;
}

export function NavigationRail({ mobileOpen = false, setMobileOpen, onLogout }: NavigationRailProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [username, setUsername] = useState('Usuario');
  const [role, setRole] = useState<'admin' | 'secretaria'>('secretaria');
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedUsername = localStorage.getItem('user_username') || 'Usuario';
    const storedRole = (localStorage.getItem('user_role') || 'secretaria') as 'admin' | 'secretaria';
    setUsername(storedUsername);
    setRole(storedRole);
    
    // Listen for storage changes in case of logout/login
    const handleStorage = () => {
      setUsername(localStorage.getItem('user_username') || 'Usuario');
      setRole((localStorage.getItem('user_role') || 'secretaria') as 'admin' | 'secretaria');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  const baseLinks = [
    { to: '/', label: 'Inicio', icon: <Home size={18} /> },
    { to: '/agenda', label: 'Agenda', icon: <Calendar size={18} /> },
    { to: '/pacientes', label: 'Pacientes', icon: <Users size={18} /> },
    { to: '/pagos', label: 'Caja y Cobros', icon: <DollarSign size={18} /> },
    { to: '/catalogo', label: 'Catálogo', icon: <ClipboardList size={18} /> },
  ];

  const adminLinks = [
    { to: '/usuarios', label: 'Usuarios', icon: <UserCog size={18} />, roles: ['admin'] },
    { to: '/doctores', label: 'Odontólogos', icon: <IconTooth size={18} />, roles: ['admin', 'secretaria'] },
  ];

  const visibleAdminLinks = adminLinks.filter(link => link.roles.includes(role));

  const showCollapsed = isCollapsed && !isMobile;
  const widthStyle = isMobile ? '70%' : (showCollapsed ? '56px' : '190px');

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {mobileOpen && (
        <div 
          id="sidebar-backdrop"
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen?.(false)}
        />
      )}

      <div 
        id="navigation-rail"
        className={`bg-brand-600 text-white flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out border-r border-brand-800 overflow-hidden z-50
          fixed inset-y-0 left-0 h-[100dvh] md:sticky md:top-0 md:h-screen
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{ width: widthStyle }}
      >
        {/* Header/Logo - Pinned at top */}
        <div className="h-16 flex items-center border-b border-brand-800 shrink-0 overflow-hidden w-full relative px-3">
          {/* Logo - Smoothly slides left and fades out when collapsed */}
          <div 
            className="flex items-center space-x-2 transition-all duration-300 ease-in-out"
            style={{
              opacity: showCollapsed ? 0 : 1,
              transform: showCollapsed ? 'translateX(-20px)' : 'translateX(0)',
              pointerEvents: showCollapsed ? 'none' : 'auto'
            }}
          >
            <IconTooth size={18} className="text-brand-100 fill-brand-100 shrink-0" />
            <span className="font-semibold text-sm tracking-tight text-white">OdontoGest</span>
          </div>

          {/* Action Button - Slides to center when collapsed, pins to right when expanded or on mobile */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out flex items-center justify-center"
            style={
              isMobile 
                ? { right: '12px' } 
                : { left: showCollapsed ? '11px' : '144px' }
            }
          >
            <Tooltip content={isMobile ? "Cerrar menú" : (showCollapsed ? "Abrir barra lateral" : "Contraer barra lateral")} side="right" align="center">
              <button
                id="btn-toggle-sidebar"
                onClick={isMobile ? () => setMobileOpen?.(false) : toggleCollapse}
                className="rounded-lg border border-brand-850 bg-brand-700/50 hover:bg-brand-800 text-brand-100 hover:text-white transition-all duration-300 ease-in-out cursor-pointer flex items-center justify-center w-[34px] h-[34px] focus:outline-none"
                aria-label={isMobile ? "Cerrar menú" : (showCollapsed ? "Abrir barra lateral" : "Contraer barra lateral")}
              >
                {isMobile ? (
                  <X size={16} />
                ) : showCollapsed ? (
                  <PanelLeft size={16} />
                ) : (
                  <PanelLeftClose size={16} />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Scrollable container for links and footer */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0">
          {/* Navigation Links */}
          <nav className="p-2 space-y-1">
            {baseLinks.map(link => (
              <NavLink
                id={`nav-${link.label.toLowerCase().replace(/ /g, '-')}`}
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen?.(false)}
                className={({ isActive }) => 
                  `flex items-center h-10 rounded-lg text-xs font-medium transition-all duration-300 ease-in-out justify-start w-full px-[11px] ${
                    isActive 
                      ? 'bg-brand-50 text-brand-800' 
                      : 'text-white hover:bg-brand-800 hover:text-brand-50'
                  }`
                }
              >
                <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">{link.icon}</div>
                <span 
                  className={`inline-block overflow-hidden sentence-case transition-all duration-300 ease-in-out truncate ${
                    showCollapsed 
                      ? 'max-w-0 opacity-0 pointer-events-none ml-0' 
                      : 'max-w-[150px] opacity-100 ml-3'
                  }`}
                >
                  {link.label}
                </span>
              </NavLink>
            ))}

            {/* Admin section divider */}
            {visibleAdminLinks.length > 0 && (
              <>
                <div className="my-3 border-t border-brand-800 opacity-40 mx-2" />
                <div 
                  className={`px-3 text-[9px] uppercase tracking-wider text-brand-100 font-semibold transition-all duration-300 ease-in-out truncate overflow-hidden ${
                    showCollapsed ? 'max-h-0 opacity-0 mb-0 mt-0 py-0' : 'max-h-6 opacity-80 mb-1 mt-2'
                  }`}
                >
                  Administración
                </div>
                {visibleAdminLinks.map(link => (
                  <NavLink
                    id={`nav-${link.label.toLowerCase().replace(/ /g, '-')}`}
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen?.(false)}
                    className={({ isActive }) => 
                      `flex items-center h-10 rounded-lg text-xs font-medium transition-all duration-300 ease-in-out justify-start w-full px-[11px] ${
                        isActive 
                          ? 'bg-brand-50 text-brand-800' 
                          : 'text-white hover:bg-brand-800 hover:text-brand-50'
                      }`
                    }
                  >
                    <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">{link.icon}</div>
                    <span 
                      className={`inline-block overflow-hidden sentence-case transition-all duration-300 ease-in-out truncate ${
                        showCollapsed 
                          ? 'max-w-0 opacity-0 pointer-events-none ml-0' 
                          : 'max-w-[150px] opacity-100 ml-3'
                      }`}
                    >
                      {link.label}
                    </span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Footer / User Profile & Logout - pushed to bottom on desktop, natural flow on mobile to prevent cut-off */}
          <div className="mt-6 md:mt-auto p-2 border-t border-brand-800 bg-brand-800/40 shrink-0">
            <div 
              className={`px-3 text-[11px] font-medium text-brand-50 transition-all duration-300 ease-in-out truncate overflow-hidden ${
                showCollapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-6 opacity-100 mb-1.5'
              }`}
            >
              Usuario: {username}
            </div>
            
            <button
              id="btn-logout"
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center h-10 rounded-lg text-xs font-medium text-white hover:bg-red-900/30 hover:text-red-200 transition-all duration-300 ease-in-out cursor-pointer justify-start w-full px-[11px]"
            >
              <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]"><LogOut size={16} /></div>
              <span 
                className={`inline-block overflow-hidden sentence-case transition-all duration-300 ease-in-out truncate ${
                  showCollapsed 
                    ? 'max-w-0 opacity-0 pointer-events-none ml-0' 
                    : 'max-w-[150px] opacity-100 ml-3'
                }`}
              >
                Cerrar Sesión
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal - Centered */}
      <Modal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)}
        hideHeader
        size="sm"
        bodyClassName="p-6 flex flex-col items-center text-center space-y-4"
      >
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
          <LogOut size={22} className="stroke-[2.5]" />
        </div>
        
        <h3 className="text-base font-bold text-neutral-warm-900 sentence-case">
          ¿Cerrar Sesión?
        </h3>
        
        <p className="text-xs text-neutral-warm-500 leading-relaxed">
          ¿Estás seguro de que deseas salir de OdontoGest? Tendrás que volver a ingresar tus credenciales para acceder.
        </p>
        
        <div className="flex gap-3 w-full pt-2">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(false)}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-neutral-warm-600 hover:text-neutral-warm-800 bg-neutral-warm-50 hover:bg-neutral-warm-100 border border-neutral-warm-200 transition-colors cursor-pointer focus:outline-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-xs hover:shadow-md focus:outline-none"
          >
            Sí, Salir
          </button>
        </div>
      </Modal>
    </>
  );
}
