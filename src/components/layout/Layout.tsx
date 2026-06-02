import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconMenu2, IconBriefcase } from '@tabler/icons-react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Overlay oscuro al abrir sidebar en mobile */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* Sidebar: fijo en mobile (slide), estático en desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 md:z-auto ${
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onClose={() => setSidebarAbierto(false)} />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile — solo visible en pantallas pequeñas */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
          <button
            onClick={() => setSidebarAbierto(true)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <IconMenu2 size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg">
              <IconBriefcase size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">JHT Project</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
