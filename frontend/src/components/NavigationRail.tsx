import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        <div className="mb-10 w-12 h-12 bg-[#eaf4fe] rounded-2xl flex items-center justify-center text-[#0061a4]">
          <span className="material-symbols-rounded text-3xl filled">dentistry</span>
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
      {showLogout && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-[24px] p-6 w-full max-w-xs shadow-xl border border-slate-100 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-rounded text-2xl text-red-500">logout</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Cerrar sesión</h2>
            <p className="text-sm text-slate-500 mb-6">¿Estás seguro de que querés salir?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogout(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors"
              >
                No
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl transition-all"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
