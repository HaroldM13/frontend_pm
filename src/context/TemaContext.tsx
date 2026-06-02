import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Tema = 'light' | 'dark';

interface TemaContextType {
  tema: Tema;
  toggleTema: () => void;
}

const TemaContext = createContext<TemaContextType | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    return (localStorage.getItem('tema') as Tema) ?? 'light';
  });

  useEffect(() => {
    if (tema === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('tema', tema);
  }, [tema]);

  const toggleTema = () => setTema((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <TemaContext.Provider value={{ tema, toggleTema }}>
      {children}
    </TemaContext.Provider>
  );
}

export function useTema(): TemaContextType {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema debe usarse dentro de TemaProvider');
  return ctx;
}
