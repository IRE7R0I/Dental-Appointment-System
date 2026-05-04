import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', icon: 'home', label: 'Inicio' },
  { to: '/pacientes', icon: 'group', label: 'Pacientes' },
  { to: '/agenda', icon: 'calendar_today', label: 'Agenda' },
  { to: '/pagos', icon: 'payments', label: 'Pagos' },
];

export default function NavigationRail() {
  return (
    <>
      <nav className="hidden md:flex w-[90px] bg-white flex-col items-center py-6 border-r border-slate-200 z-20 shrink-0">
        <div className="mb-10 w-12 h-12 bg-[#eaf4fe] rounded-2xl flex items-center justify-center text-[#0061a4]">
          <span className="material-symbols-rounded text-3xl filled">dentistry</span>
        </div>
        <div className="flex flex-col gap-6 w-full px-2">
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
        </div>
      </nav>

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
      </nav>
    </>
  );
}