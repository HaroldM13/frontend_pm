import { NavLink, useNavigate } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconBuilding,
  IconFolder,
  IconMessage2,
  IconUsers,
  IconLogout,
  IconX,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { useTema } from '../../context/TemaContext';
import { authApi } from '../../services/api';

interface SidebarProps {
  onClose?: () => void;
  noLeidos?: number;
}

const navItems = [
  { to: '/dashboard', icon: IconLayoutDashboard, label: 'Dashboard' },
  { to: '/areas', icon: IconBuilding, label: 'Áreas' },
  { to: '/proyectos', icon: IconFolder, label: 'Proyectos' },
  { to: '/chat', icon: IconMessage2, label: 'Chat', badge: true },
  { to: '/usuarios', icon: IconUsers, label: 'Usuarios' },
];

export default function Sidebar({ onClose, noLeidos = 0 }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const { tema, toggleTema } = useTema();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Si falla el endpoint igual limpiamos localmente
    }
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    // Cerrar sidebar al navegar en mobile
    onClose?.();
  };

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100">
      {/* Logo + botón cerrar en mobile */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="WorkChat" className="w-9 h-9 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm text-white leading-tight">WorkChat</p>
            <p className="text-xs text-slate-400 leading-tight">by JHT</p>
          </div>
        </div>
        {/* Solo visible en mobile para cerrar el sidebar */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <IconX size={18} />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`
            }
          >
            <div className="relative flex-shrink-0">
              <Icon size={18} />
              {badge && noLeidos > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {noLeidos > 99 ? '99+' : noLeidos}
                </span>
              )}
            </div>
            <span className="flex-1">{label}</span>
            {badge && noLeidos > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {noLeidos > 99 ? '99+' : noLeidos}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {usuario?.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-100 truncate">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400 truncate">{usuario?.email}</p>
          </div>
        </div>

        <button
          onClick={toggleTema}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
        >
          {tema === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          {tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <IconLogout size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
