import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { IconMenu2 } from '@tabler/icons-react';
import Sidebar from './Sidebar';
import { chatApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);
  const { usuario } = useAuth();
  const location = useLocation();
  const enChat = location.pathname.startsWith('/chat');

  const fetchNoLeidos = useCallback(async () => {
    if (!usuario) return;
    try {
      const { data } = await chatApi.noLeidos();
      setNoLeidos(data.total);
    } catch {
      // silencioso
    }
  }, [usuario]);

  // Resetear badge al entrar al chat; polling fuera de él
  useEffect(() => {
    if (enChat) {
      setNoLeidos(0);
      return;
    }
    fetchNoLeidos();
    const id = setInterval(fetchNoLeidos, 30_000);
    return () => clearInterval(id);
  }, [enChat, fetchNoLeidos]);

  // Badge en el ícono PWA (Badging API)
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    if (noLeidos > 0) {
      navigator.setAppBadge(noLeidos);
    } else {
      navigator.clearAppBadge();
    }
  }, [noLeidos]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onClose={() => setSidebarAbierto(false)} noLeidos={noLeidos} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
          <button
            onClick={() => setSidebarAbierto(true)}
            className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <IconMenu2 size={22} />
            {noLeidos > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="WorkChat" className="w-7 h-7" />
            <span className="font-bold text-slate-800 dark:text-white text-sm">WorkChat</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
