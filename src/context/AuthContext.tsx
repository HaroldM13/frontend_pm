import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Usuario } from '../interfaces';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  cargando: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
  actualizarNombre: (nombre: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<AuthState>({
    token: null,
    usuario: null,
    cargando: true,
  });

  // Restaurar sesión del localStorage al montar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioRaw = localStorage.getItem('usuario');

    if (token && usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw) as Usuario;
        setEstado({ token, usuario, cargando: false });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setEstado({ token: null, usuario: null, cargando: false });
      }
    } else {
      setEstado({ token: null, usuario: null, cargando: false });
    }
  }, []);

  const login = (token: string, usuario: Usuario) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    setEstado({ token, usuario, cargando: false });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setEstado({ token: null, usuario: null, cargando: false });
  };

  const actualizarNombre = (nombre: string) => {
    setEstado((prev) => {
      if (!prev.usuario) return prev;
      const actualizado = { ...prev.usuario, nombre };
      localStorage.setItem('usuario', JSON.stringify(actualizado));
      return { ...prev, usuario: actualizado };
    });
  };

  return (
    <AuthContext.Provider value={{ ...estado, login, logout, actualizarNombre }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
