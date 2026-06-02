import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuilding, IconPlus, IconUsers, IconMessage2, IconTrash,
  IconX, IconFolder, IconSearch, IconUserPlus, IconUserMinus,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { areasApi, usuariosApi, mensajeError } from '../services/api';
import type { Area, Usuario } from '../interfaces';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

export default function AreasPage() {
  const confirmar = useConfirm();
  const [areas, setAreas] = useState<Area[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Modal de miembros
  const [areaGestionando, setAreaGestionando] = useState<Area | null>(null);
  const [miembrosDetalle, setMiembrosDetalle] = useState<Usuario[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const [emailAgregar, setEmailAgregar] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [errorMiembro, setErrorMiembro] = useState('');

  const { usuario } = useAuth();
  const navigate = useNavigate();

  const cargar = async () => {
    try {
      const { data } = await areasApi.listar();
      setAreas(data);
    } catch (err) {
      console.error(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crearArea = async () => {
    if (!nombre.trim()) return;
    setError('');
    setGuardando(true);
    try {
      const { data } = await areasApi.crear(nombre.trim(), descripcion.trim() || undefined);
      setAreas((prev) => [data, ...prev]);
      setMostrarModal(false);
      setNombre('');
      setDescripcion('');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarArea = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmar({
      titulo: '¿Eliminar esta área?',
      descripcion: 'Se eliminará el área y su canal de chat.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    try {
      await areasApi.eliminar(id);
      setAreas((prev) => prev.filter((a) => a.id !== id));
      toast.success('Área eliminada');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const abrirGestionMiembros = async (area: Area, e: React.MouseEvent) => {
    e.stopPropagation();
    setAreaGestionando(area);
    setErrorMiembro('');
    setEmailAgregar('');
    setCargandoMiembros(true);
    try {
      const { data } = await usuariosApi.listar();
      setMiembrosDetalle(data.filter((u) => area.miembros.includes(u.id)));
    } catch {
      setMiembrosDetalle([]);
    } finally {
      setCargandoMiembros(false);
    }
  };

  const agregarMiembro = async () => {
    if (!areaGestionando || !emailAgregar.trim()) return;
    setErrorMiembro('');
    setAgregando(true);
    try {
      const { data: areaActualizada } = await areasApi.agregarMiembro(areaGestionando.id, emailAgregar.trim());
      setAreas((prev) => prev.map((a) => a.id === areaActualizada.id ? areaActualizada : a));
      setAreaGestionando(areaActualizada);
      // Recargar detalles de miembros
      const { data: todos } = await usuariosApi.listar();
      setMiembrosDetalle(todos.filter((u) => areaActualizada.miembros.includes(u.id)));
      setEmailAgregar('');
    } catch (err) {
      setErrorMiembro(mensajeError(err));
    } finally {
      setAgregando(false);
    }
  };

  const removerMiembro = async (miembroId: string) => {
    if (!areaGestionando) return;
    const ok = await confirmar({
      titulo: '¿Remover a este miembro?',
      descripcion: 'Se le quitará el acceso al área y su canal de chat.',
      labelConfirmar: 'Remover',
      tipo: 'advertencia',
    });
    if (!ok) return;
    try {
      const { data: areaActualizada } = await areasApi.removerMiembro(areaGestionando.id, miembroId);
      setAreas((prev) => prev.map((a) => a.id === areaActualizada.id ? areaActualizada : a));
      setAreaGestionando(areaActualizada);
      setMiembrosDetalle((prev) => prev.filter((u) => u.id !== miembroId));
      toast.success('Miembro removido');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">Áreas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Organiza tu equipo por áreas de trabajo</p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <IconPlus size={16} />
          Nueva área
        </button>
      </div>

      {areas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <IconBuilding size={48} className="text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Sin áreas todavía</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
            Crea tu primera área. Al crearla, se genera automáticamente un canal de chat para el equipo.
          </p>
          <button onClick={() => setMostrarModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            Crear área
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => (
            <div
              key={area.id}
              onClick={() => navigate(`/proyectos?area=${area.id}`)}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all cursor-pointer p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <IconBuilding size={20} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Gestionar miembros */}
                  <button
                    onClick={(e) => abrirGestionMiembros(area, e)}
                    title="Gestionar miembros"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    <IconUserPlus size={15} />
                  </button>
                  {area.creador_id === usuario?.id && (
                    <button
                      onClick={(e) => eliminarArea(area.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <IconTrash size={15} />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{area.nombre}</h3>
              {area.descripcion && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{area.descripcion}</p>
              )}

              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 mt-3">
                <span className="flex items-center gap-1">
                  <IconUsers size={13} />
                  {area.miembros.length} miembro{area.miembros.length !== 1 ? 's' : ''}
                </span>
                {area.chat_grupo_id && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <IconMessage2 size={13} />
                    Canal activo
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                  <IconFolder size={13} />
                  Ver proyectos →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear área */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nueva área</h2>
              <button onClick={() => { setMostrarModal(false); setError(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <IconX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del área *</label>
                <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej: Desarrollo, Marketing, Soporte..."
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  rows={3} placeholder="¿Qué hace este equipo?"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <IconMessage2 size={14} />
                Se creará automáticamente un canal de chat para esta área
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setMostrarModal(false); setError(''); }}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                  Cancelar
                </button>
                <button onClick={crearArea} disabled={!nombre.trim() || guardando}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {guardando ? 'Creando...' : 'Crear área'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestionar miembros */}
      {areaGestionando && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-xl p-5 w-full md:max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Miembros — {areaGestionando.nombre}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Los cambios se sincronizan automáticamente con el canal de chat
                </p>
              </div>
              <button onClick={() => setAreaGestionando(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
                <IconX size={20} />
              </button>
            </div>

            {/* Buscar y agregar por email */}
            <div className="flex gap-2 mb-4 flex-shrink-0">
              <div className="relative flex-1">
                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={emailAgregar}
                  onChange={(e) => setEmailAgregar(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarMiembro()}
                  placeholder="Email del usuario a agregar..."
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>
              <button
                onClick={agregarMiembro}
                disabled={!emailAgregar.trim() || agregando}
                className="flex-shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <IconUserPlus size={14} />
                {agregando ? '...' : 'Agregar'}
              </button>
            </div>

            {errorMiembro && (
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-3 py-1.5 rounded-lg mb-3 flex-shrink-0">{errorMiembro}</p>
            )}

            {/* Lista de miembros */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {cargandoMiembros ? (
                <p className="text-xs text-slate-400 text-center py-4">Cargando miembros...</p>
              ) : miembrosDetalle.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Sin miembros cargados</p>
              ) : (
                miembrosDetalle.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {m.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {m.nombre}
                        {m.id === areaGestionando.creador_id && (
                          <span className="ml-1.5 text-xs text-indigo-500 font-normal">creador</span>
                        )}
                        {m.id === usuario?.id && (
                          <span className="ml-1.5 text-xs text-slate-400 font-normal">tú</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{m.email}</p>
                    </div>
                    {/* Solo el creador puede remover, y no puede removerse a sí mismo */}
                    {areaGestionando.creador_id === usuario?.id && m.id !== usuario?.id && (
                      <button
                        onClick={() => removerMiembro(m.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                        title="Remover del área"
                      >
                        <IconUserMinus size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <IconMessage2 size={13} />
                Al agregar/remover miembros aquí, el canal de chat se actualiza automáticamente
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
