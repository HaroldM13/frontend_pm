import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TemaProvider } from './context/TemaContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AreasPage from './pages/AreasPage';
import ProyectosPage from './pages/ProyectosPage';
import ProyectoPage from './pages/ProyectoPage';
import ChatPage from './pages/ChatPage';
import UsuariosPage from './pages/UsuariosPage';

// Protege rutas privadas — redirige a login si no hay sesión
function RutaPrivada({ children }: { children: React.ReactNode }) {
  const { token, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando...</div>
      </div>
    );
  }

  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

// Redirige a dashboard si ya está autenticado
function RutaPublica({ children }: { children: React.ReactNode }) {
  const { token, cargando } = useAuth();
  if (cargando) return null;
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RutaPublica><LoginPage /></RutaPublica>} />
      <Route path="/register" element={<RutaPublica><RegisterPage /></RutaPublica>} />
      <Route path="/dashboard" element={<RutaPrivada><DashboardPage /></RutaPrivada>} />
      <Route path="/areas" element={<RutaPrivada><AreasPage /></RutaPrivada>} />
      <Route path="/proyectos" element={<RutaPrivada><ProyectosPage /></RutaPrivada>} />
      <Route path="/proyectos/:id" element={<RutaPrivada><ProyectoPage /></RutaPrivada>} />
      <Route path="/chat" element={<RutaPrivada><ChatPage /></RutaPrivada>} />
      <Route path="/usuarios" element={<RutaPrivada><UsuariosPage /></RutaPrivada>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              classNames: {
                toast: 'font-sans text-sm',
              },
            }}
          />
        </ConfirmProvider>
      </AuthProvider>
    </TemaProvider>
  );
}
