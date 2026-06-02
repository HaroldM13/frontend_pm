import { useEffect, useState } from 'react';
import { IconUsers } from '@tabler/icons-react';
import { usuariosApi, mensajeError } from '../services/api';
import type { Usuario } from '../interfaces';
import { useAuth } from '../context/AuthContext';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const { usuario: yo } = useAuth();

  useEffect(() => {
    usuariosApi.listar()
      .then(({ data }) => setUsuarios(data))
      .catch((err) => console.error(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Usuarios</h1>
        <p className="text-slate-500 mt-1">{usuarios.length} usuarios registrados en la plataforma</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {u.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 text-sm flex items-center gap-2">
                {u.nombre}
                {u.id === yo?.id && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Tú</span>
                )}
              </p>
              <p className="text-slate-400 text-xs">{u.email}</p>
            </div>
            <p className="text-slate-400 text-xs flex-shrink-0">{u.telefono}</p>
          </div>
        ))}

        {usuarios.length === 0 && (
          <div className="px-5 py-12 text-center">
            <IconUsers size={40} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Sin usuarios registrados</p>
          </div>
        )}
      </div>
    </div>
  );
}
