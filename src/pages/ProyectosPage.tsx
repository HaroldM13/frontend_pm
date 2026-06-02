import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconFolder, IconPlus, IconUsers, IconMessage2, IconTrash, IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { proyectosApi, areasApi, mensajeError } from '../services/api';
import type { Proyecto, Area } from '../interfaces';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

export default function ProyectosPage() {
  const confirmar = useConfirm();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [areaId, setAreaId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const cargar = async () => {
    try {
      const [resProyectos, resAreas] = await Promise.all([
        proyectosApi.listar(),
        areasApi.listar(),
      ]);
      setProyectos(resProyectos.data);
      setAreas(resAreas.data);
      if (resAreas.data.length > 0) setAreaId(resAreas.data[0].id);
    } catch (err) {
      console.error(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crearProyecto = async () => {
    if (!nombre.trim() || !areaId) return;
    setError('');
    setGuardando(true);

    try {
      const { data } = await proyectosApi.crear(nombre.trim(), areaId, descripcion.trim() || undefined);
      setProyectos((prev) => [data, ...prev]);
      setMostrarModal(false);
      setNombre('');
      setDescripcion('');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmar({
      titulo: '¿Eliminar este proyecto?',
      descripcion: 'Se eliminarán todas sus tareas, sprints y épicas.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    try {
      await proyectosApi.eliminar(id);
      setProyectos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Proyecto eliminado');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const areaNombre = (id: string) => areas.find((a) => a.id === id)?.nombre ?? '';

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Proyectos</h1>
          <p className="text-slate-500 mt-1 text-sm">Todos los proyectos donde participas</p>
        </div>
        <button
          onClick={() => { if (areas.length === 0) { toast.info('Crea un área primero'); return; } setMostrarModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <IconPlus size={16} />
          Nuevo proyecto
        </button>
      </div>

      {proyectos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <IconFolder size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 mb-1">Sin proyectos todavía</h3>
          <p className="text-slate-400 text-sm mb-4">
            Crea un proyecto dentro de un área. Cada proyecto tiene su propio tablero y canal de chat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proyectos.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/proyectos/${p.id}`)}
              className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IconFolder size={20} className="text-green-600" />
                </div>
                {p.creador_id === usuario?.id && (
                  <button
                    onClick={(e) => eliminar(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>

              <h3 className="font-semibold text-slate-800 mb-1">{p.nombre}</h3>
              <p className="text-xs text-slate-400 mb-2">Área: {areaNombre(p.area_id)}</p>
              {p.descripcion && (
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.descripcion}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-auto">
                <span className="flex items-center gap-1">
                  <IconUsers size={13} />
                  {p.miembros.length} miembro{p.miembros.length !== 1 ? 's' : ''}
                </span>
                {p.chat_grupo_id && (
                  <span className="flex items-center gap-1 text-green-600">
                    <IconMessage2 size={13} />
                    Canal activo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal — bottom-sheet en mobile, centrado en desktop */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Nuevo proyecto</h2>
              <button onClick={() => { setMostrarModal(false); setError(''); }} className="text-slate-400 hover:text-slate-600">
                <IconX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Área *</label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del proyecto *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej: Sistema POS, App móvil..."
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  placeholder="¿De qué trata este proyecto?"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700 flex items-center gap-2">
                <IconMessage2 size={14} />
                Se creará automáticamente un canal de chat para este proyecto
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setMostrarModal(false); setError(''); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={crearProyecto}
                  disabled={!nombre.trim() || !areaId || guardando}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {guardando ? 'Creando...' : 'Crear proyecto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
