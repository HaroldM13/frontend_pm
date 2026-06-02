import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  IconPlus, IconX, IconTag, IconTrash, IconChevronDown, IconChevronRight,
  IconBook, IconBug, IconCheckbox, IconArrowUp, IconCircleCheck,
} from '@tabler/icons-react';
import { epicasApi, mensajeError } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import type { Epica, Tarea, TipoTarea } from '../../interfaces';

interface EpicasPanelProps {
  proyectoId: string;
  tareas?: Tarea[];
  onAbrirTarea?: (tareaId: string) => void;
}

const COLORES_PRESET = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#06B6D4', '#64748B', '#78716C',
];

const TIPO_ICON: Record<TipoTarea, React.ElementType> = {
  historia: IconBook, bug: IconBug, tarea: IconCheckbox, mejora: IconArrowUp,
};

export default function EpicasPanel({ proyectoId, tareas = [], onAbrirTarea }: EpicasPanelProps) {
  const confirmar = useConfirm();
  const [epicas, setEpicas] = useState<Epica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState(COLORES_PRESET[0]);

  const cargar = async () => {
    try {
      const { data } = await epicasApi.listar(proyectoId);
      setEpicas(data);
    } catch (err) {
      console.error(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [proyectoId]);

  const crearEpica = async () => {
    if (!nombre.trim()) return;
    setError('');
    setGuardando(true);
    try {
      const { data } = await epicasApi.crear(proyectoId, nombre.trim(), color, descripcion.trim() || undefined);
      setEpicas((prev) => [...prev, data]);
      cerrarModal();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEpica = async (id: string, cantTareas: number) => {
    const ok = await confirmar({
      titulo: '¿Eliminar esta épica?',
      descripcion: cantTareas > 0
        ? `${cantTareas} tarea(s) quedarán sin épica asignada.`
        : 'Esta épica no tiene tareas asociadas.',
      labelConfirmar: 'Eliminar',
      tipo: cantTareas > 0 ? 'advertencia' : 'peligro',
    });
    if (!ok) return;
    try {
      await epicasApi.eliminar(id);
      setEpicas((prev) => prev.filter((e) => e.id !== id));
      toast.success('Épica eliminada');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const cerrarModal = () => {
    setModal(false);
    setNombre('');
    setDescripcion('');
    setColor(COLORES_PRESET[0]);
    setError('');
  };

  const toggleExpandir = (id: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (cargando) {
    return <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando épicas...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Épicas</h2>
          <p className="text-xs text-slate-400 mt-0.5">Agrupa tareas relacionadas bajo un mismo tema o módulo</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <IconPlus size={15} />
          Nueva épica
        </button>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg px-4 py-2.5 mb-5 text-xs text-indigo-700 dark:text-indigo-300">
        <strong>¿Para qué sirven?</strong> Son temas grandes que agrupan varias tareas. Ej: "Módulo de ventas", "Autenticación".
      </div>

      {epicas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
          <IconTag size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Sin épicas todavía</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Crea épicas para organizar el backlog por módulos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {epicas.map((epica) => {
            const tareasEpica = tareas.filter((t) => t.epica_id === epica.id);
            const completadas = tareasEpica.filter((t) => t.columna === 'done').length;
            const pct = tareasEpica.length > 0 ? Math.round((completadas / tareasEpica.length) * 100) : 0;
            const expandida = expandidas.has(epica.id);

            return (
              <div key={epica.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header de la épica */}
                <div className="flex items-center gap-3 px-4 py-3.5 group">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: epica.color }} />

                  <button
                    onClick={() => toggleExpandir(epica.id)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    {expandida
                      ? <IconChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                      : <IconChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: epica.color }}>
                          {epica.nombre}
                        </span>
                        {tareasEpica.length > 0 && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {completadas}/{tareasEpica.length} completadas
                          </span>
                        )}
                      </div>
                      {epica.descripcion && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{epica.descripcion}</p>
                      )}
                      {tareasEpica.length > 0 && (
                        <div className="mt-1.5 h-1 bg-slate-100 dark:bg-slate-700 rounded-full w-32 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: epica.color }} />
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => eliminarEpica(epica.id, tareasEpica.length)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex-shrink-0"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>

                {/* Lista de tareas expandibles */}
                {expandida && (
                  <div className="border-t border-slate-100 dark:border-slate-700">
                    {tareasEpica.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                        Sin tareas asociadas a esta épica.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {tareasEpica.map((t) => {
                          const TipoIcon = TIPO_ICON[t.tipo_tarea ?? 'tarea'];
                          return (
                            <button
                              key={t.id}
                              onClick={() => onAbrirTarea?.(t.id)}
                              className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group/tarea"
                            >
                              {t.columna === 'done'
                                ? <IconCircleCheck size={14} className="text-green-500 flex-shrink-0" />
                                : <TipoIcon size={14} className="text-slate-400 flex-shrink-0" />}
                              <span className={`flex-1 text-sm truncate ${t.columna === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                {t.titulo}
                              </span>
                              {t.puntos_historia > 0 && (
                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {t.puntos_historia}pt
                                </span>
                              )}
                              <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                                t.prioridad === 'critica' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                t.prioridad === 'alta' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400' :
                                t.prioridad === 'media' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              }`}>
                                {t.prioridad}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear épica */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nueva épica</h2>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <IconX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
                <input
                  type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="ej: Módulo de ventas, Autenticación..."
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
                <textarea
                  value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
                  placeholder="¿Qué abarca esta épica?"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORES_PRESET.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
                    {nombre || 'Vista previa'}
                  </span>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button onClick={cerrarModal} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={crearEpica} disabled={!nombre.trim() || guardando}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
                  {guardando ? 'Creando...' : 'Crear épica'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
