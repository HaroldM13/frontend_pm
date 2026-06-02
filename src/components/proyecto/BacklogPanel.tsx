import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  IconPlus, IconInbox, IconBook, IconBug, IconCheckbox, IconArrowUp,
  IconArrowRight, IconFilter, IconX,
} from '@tabler/icons-react';
import { tareasApi, sprintsApi, mensajeError } from '../../services/api';
import type { Tarea, Sprint, Epica, Prioridad, TipoTarea } from '../../interfaces';

interface BacklogPanelProps {
  proyectoId: string;
  tareas: Tarea[];
  epicas: Epica[];
  onTareasChange: (tareas: Tarea[]) => void;
  onAbrirTarea: (tareaId: string) => void;
  onCrearTarea: () => void;
}

const TIPO_ICON: Record<TipoTarea, { icon: React.ElementType; label: string; color: string }> = {
  historia: { icon: IconBook,     label: 'Historia', color: 'text-violet-500' },
  bug:      { icon: IconBug,      label: 'Bug',      color: 'text-red-500' },
  tarea:    { icon: IconCheckbox, label: 'Tarea',    color: 'text-slate-400' },
  mejora:   { icon: IconArrowUp,  label: 'Mejora',   color: 'text-blue-500' },
};

const PRIORIDAD_COLOR: Record<Prioridad, string> = {
  critica: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  alta:    'bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400',
  media:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  baja:    'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
};

export default function BacklogPanel({
  proyectoId, tareas, epicas, onTareasChange, onAbrirTarea, onCrearTarea,
}: BacklogPanelProps) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [sprintsLoaded, setSprintsLoaded] = useState(false);
  const [sprintSeleccionado, setSprintSeleccionado] = useState<Record<string, string>>({});
  const [moviendo, setMoviendo] = useState<string | null>(null);

  // Filtros
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEpica, setFiltroEpica] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const tareasBacklog = useMemo(
    () => tareas.filter((t) => t.columna === 'backlog'),
    [tareas],
  );

  const tareasFiltradas = useMemo(() => {
    return tareasBacklog.filter((t) => {
      if (filtroPrioridad && t.prioridad !== filtroPrioridad) return false;
      if (filtroTipo && t.tipo_tarea !== filtroTipo) return false;
      if (filtroEpica === '__none__' && t.epica_id) return false;
      if (filtroEpica && filtroEpica !== '__none__' && t.epica_id !== filtroEpica) return false;
      return true;
    });
  }, [tareasBacklog, filtroPrioridad, filtroTipo, filtroEpica]);

  const filtrosActivos = [filtroPrioridad, filtroTipo, filtroEpica].filter(Boolean).length;

  const limpiarFiltros = () => {
    setFiltroPrioridad('');
    setFiltroTipo('');
    setFiltroEpica('');
  };

  const cargarSprints = async () => {
    if (sprintsLoaded) return;
    try {
      const { data } = await sprintsApi.listar(proyectoId);
      setSprints(data.filter((s) => s.estado !== 'completado'));
      setSprintsLoaded(true);
    } catch { /* silencio */ }
  };

  const moverAlSprint = async (tareaId: string) => {
    const destino = sprintSeleccionado[tareaId];
    if (!destino) return;
    setMoviendo(tareaId);
    try {
      const { data } = await tareasApi.actualizar(tareaId, { sprint_id: destino, columna: 'todo' });
      onTareasChange(tareas.map((t) => t.id === tareaId ? data : t));
      setSprintSeleccionado((prev) => { const n = { ...prev }; delete n[tareaId]; return n; });
      toast.success('Tarea asignada al sprint');
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setMoviendo(null);
    }
  };

  const epicaById = (id?: string) => epicas.find((e) => e.id === id);

  return (
    <div className="p-4 md:p-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <IconInbox size={18} className="text-slate-500" />
            Product Backlog
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tareasBacklog.length} tarea{tareasBacklog.length !== 1 ? 's' : ''} sin sprint asignado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMostrarFiltros((v) => !v); if (!sprintsLoaded) cargarSprints(); }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              mostrarFiltros || filtrosActivos > 0
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <IconFilter size={14} />
            Filtrar
            {filtrosActivos > 0 && (
              <span className="bg-indigo-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {filtrosActivos}
              </span>
            )}
          </button>
          <button
            onClick={onCrearTarea}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <IconPlus size={15} />
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      {mostrarFiltros && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200"
          >
            <option value="">Todas las prioridades</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200"
          >
            <option value="">Todos los tipos</option>
            <option value="historia">Historia de usuario</option>
            <option value="bug">Bug</option>
            <option value="tarea">Tarea</option>
            <option value="mejora">Mejora</option>
          </select>
          <select
            value={filtroEpica}
            onChange={(e) => setFiltroEpica(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200"
          >
            <option value="">Todas las épicas</option>
            <option value="__none__">Sin épica</option>
            {epicas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          {filtrosActivos > 0 && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <IconX size={12} />Limpiar
            </button>
          )}
        </div>
      )}

      {/* Tabla de tareas */}
      {tareasBacklog.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <IconInbox size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-medium text-slate-500 dark:text-slate-400 mb-1">Backlog vacío</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
            Las tareas sin sprint asignado aparecerán aquí.
          </p>
          <button onClick={onCrearTarea} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            Crear primera tarea
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header tabla */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Tarea</span>
            <span className="text-center w-16">Puntos</span>
            <span className="text-center w-20">Prioridad</span>
            <span className="w-36">Épica</span>
            <span className="w-40">Mover a sprint</span>
          </div>

          {tareasFiltradas.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No hay tareas con esos filtros.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {tareasFiltradas.map((t) => {
                const tipoConf = TIPO_ICON[t.tipo_tarea ?? 'tarea'];
                const TipoIcon = tipoConf.icon;
                const epica = epicaById(t.epica_id);

                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    {/* Título */}
                    <button
                      onClick={() => onAbrirTarea(t.id)}
                      className="flex items-center gap-2.5 text-left min-w-0"
                    >
                      <TipoIcon size={14} className={`flex-shrink-0 ${tipoConf.color}`} title={tipoConf.label} />
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{t.titulo}</span>
                    </button>

                    {/* Puntos */}
                    <div className="text-center w-16">
                      {t.puntos_historia > 0 ? (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                          {t.puntos_historia}pt
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </div>

                    {/* Prioridad */}
                    <div className="w-20 text-center">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORIDAD_COLOR[t.prioridad]}`}>
                        {t.prioridad}
                      </span>
                    </div>

                    {/* Épica */}
                    <div className="w-36">
                      {epica ? (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full text-white truncate block max-w-full"
                          style={{ backgroundColor: epica.color }}
                        >
                          {epica.nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </div>

                    {/* Mover a sprint */}
                    <div className="w-40 flex items-center gap-1">
                      <select
                        value={sprintSeleccionado[t.id] ?? ''}
                        onChange={(e) => setSprintSeleccionado((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        onFocus={() => { if (!sprintsLoaded) cargarSprints(); }}
                        className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-200 flex-1 min-w-0"
                      >
                        <option value="">Sprint...</option>
                        {sprints.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                      <button
                        onClick={() => moverAlSprint(t.id)}
                        disabled={!sprintSeleccionado[t.id] || moviendo === t.id}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex-shrink-0"
                        title="Mover al sprint"
                      >
                        {moviendo === t.id
                          ? <span className="text-[10px] px-0.5">...</span>
                          : <IconArrowRight size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
