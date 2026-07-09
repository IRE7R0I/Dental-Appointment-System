import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';

const links = [
  { to: '/', icon: 'home', label: 'Inicio' },
  { to: '/pacientes', icon: 'group', label: 'Pacientes' },
  { to: '/agenda', icon: 'calendar_today', label: 'Agenda' },
  { to: '/pagos', icon: 'payments', label: 'Pagos' },
  { to: '/catalogo', icon: 'list_alt', label: 'Catálogo' },
];

export default function NavigationRail() {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const isAdmin = user?.rol === 'admin';

  const handleLogout = () => {
    setShowLogout(false);
    logout();
  };

  return (
    <>
      <nav className="hidden md:flex w-[90px] bg-white flex-col items-center py-6 border-r border-slate-200 z-20 shrink-0">
        <div className="mb-10 w-[76px] h-[76px] bg-[#eaf4fe] rounded-2xl flex items-center justify-center text-[#0061a4]">
          <span className="material-symbols-rounded text-[56px] filled">dentistry</span>
        </div>
        <div className="flex flex-col gap-6 w-full px-2 flex-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center group cursor-pointer ${isActive ? '' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#c2e7ff] text-[#001d35]'
                        : 'text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    <span className={`material-symbols-rounded ${isActive ? 'filled' : ''}`}>
                      {link.icon}
                    </span>
                  </div>
                  <span
                    className={`text-[12px] font-medium mt-1.5 ${
                      isActive ? 'text-[#001d35]' : 'text-slate-600'
                    }`}
                  >
                    {link.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) =>
                `flex flex-col items-center group cursor-pointer ${isActive ? '' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    <span className={`material-symbols-rounded ${isActive ? 'filled' : ''}`}>
                      admin_panel_settings
                    </span>
                  </div>
                  <span
                    className={`text-[12px] font-medium mt-1.5 ${
                      isActive ? 'text-amber-800' : 'text-slate-600'
                    }`}
                  >
                    Admin
                  </span>
                </>
              )}
            </NavLink>
          )}
        </div>

        {/* Separador + Logout */}
        <div className="w-8 h-px bg-slate-200 my-3" />
        <button
          onClick={() => setShowLogout(true)}
          className="flex flex-col items-center group cursor-pointer w-full px-2"
        >
          <div className="w-14 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-500 transition-all">
            <span className="material-symbols-rounded">logout</span>
          </div>
          <span className="text-[12px] font-medium mt-1.5 text-slate-400 group-hover:text-red-500 transition-colors">
            Salir
          </span>
        </button>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 flex justify-around items-center py-2 px-2 safe-area-bottom">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-[#0061a4]' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-rounded text-2xl ${isActive ? 'filled' : ''}`}>
                  {link.icon}
                </span>
                <span className="text-[10px] font-medium mt-0.5">{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin/usuarios"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-amber-600' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-rounded text-2xl ${isActive ? 'filled' : ''}`}>
                  admin_panel_settings
                </span>
                <span className="text-[10px] font-medium mt-0.5">Admin</span>
              </>
            )}
          </NavLink>
        )}
        <button
          onClick={() => setShowLogout(true)}
          className="flex flex-col items-center py-1 px-3 rounded-xl text-slate-400"
        >
          <span className="material-symbols-rounded text-2xl">logout</span>
          <span className="text-[10px] font-medium mt-0.5">Salir</span>
        </button>
      </nav>

      {/* Modal confirmación logout */}
      <ConfirmModal
        isOpen={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleLogout}
        title="Cerrar sesión"
        message="¿Estás seguro de que querés salir?"
        confirmText="Sí, salir"
        icon="logout"
      />
    </>
  );
}
