import { useState, useEffect } from 'react';
import {
  IconPlus, IconX, IconPlayerPlay, IconCheck, IconCalendar, IconFlag,
  IconAlertTriangle, IconEdit, IconTrash, IconChevronDown, IconChevronRight,
  IconCircleCheck, IconLayoutKanban, IconLock, IconTrophy,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { sprintsApi, mensajeError } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import type { Sprint, EstadoSprint, Tarea } from '../../interfaces';

interface SprintPanelProps {
  proyectoId: string;
  tareas?: Tarea[];
  onAbrirTarea?: (tareaId: string) => void;
}

const estadoConfig: Record<EstadoSprint, { label: string; color: string; bg: string; border: string }> = {
  planificado: { label: 'Planificado', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700', border: 'border-slate-200 dark:border-slate-600' },
  activo:      { label: 'Activo',      color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700' },
  completado:  { label: 'Completado',  color: 'text-blue-700 dark:text-blue-400',  bg: 'bg-blue-100 dark:bg-blue-900/30',  border: 'border-blue-200 dark:border-blue-700'  },
};

const COLUMNA_COLOR: Record<string, string> = {
  backlog: 'bg-slate-400', todo: 'bg-blue-400', in_progress: 'bg-amber-400',
  review: 'bg-purple-400', done: 'bg-green-500',
};

const COLUMNA_LABEL: Record<string, string> = {
  backlog: 'Backlog', todo: 'Por hacer', in_progress: 'En progreso',
  review: 'En revisión', done: 'Completada',
};

const SPRINT_COLORES = [
  { key: 'indigo', hex: '#6366f1' }, { key: 'violet', hex: '#8b5cf6' },
  { key: 'blue',   hex: '#3b82f6' }, { key: 'cyan',   hex: '#06b6d4' },
  { key: 'teal',   hex: '#14b8a6' }, { key: 'green',  hex: '#22c55e' },
  { key: 'amber',  hex: '#f59e0b' }, { key: 'orange', hex: '#f97316' },
  { key: 'rose',   hex: '#f43f5e' }, { key: 'pink',   hex: '#ec4899' },
];

interface FormSprint {
  nombre: string;
  objetivo: string;
  fechaInicio: string;
  fechaFin: string;
  color: string;
}

const formVacio: FormSprint = { nombre: '', objetivo: '', fechaInicio: '', fechaFin: '', color: 'indigo' };

export default function SprintPanel({ proyectoId, tareas = [], onAbrirTarea }: SprintPanelProps) {
  const confirmar = useConfirm();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [modalCrear, setModalCrear] = useState(false);
  const [formCrear, setFormCrear] = useState<FormSprint>(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  const [sprintEditando, setSprintEditando] = useState<Sprint | null>(null);
  const [formEditar, setFormEditar] = useState<FormSprint>(formVacio);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState('');

  const [errorCompletar, setErrorCompletar] = useState<Record<string, string>>({});
  const [velocidadSprint, setVelocidadSprint] = useState<{ nombre: string; puntos: number; tareas: number } | null>(null);

  const cargar = async () => {
    try {
      const { data } = await sprintsApi.listar(proyectoId);
      setSprints(data);
      const activo = data.find((s) => s.estado === 'activo');
      if (activo) setExpandidos((prev) => new Set([...prev, activo.id]));
    } catch (err) {
      console.error(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [proyectoId]);

  const toggleExpandir = (id: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const crearSprint = async () => {
    if (!formCrear.nombre.trim() || !formCrear.fechaInicio || !formCrear.fechaFin) return;
    setErrorCrear('');
    setGuardando(true);
    try {
      const { data } = await sprintsApi.crear(proyectoId, {
        nombre: formCrear.nombre.trim(),
        objetivo: formCrear.objetivo.trim() || undefined,
        fecha_inicio: formCrear.fechaInicio,
        fecha_fin: formCrear.fechaFin,
        color: formCrear.color,
      });
      setSprints((prev) => [data, ...prev]);
      setModalCrear(false);
      setFormCrear(formVacio);
    } catch (err) {
      setErrorCrear(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const iniciarSprint = async (id: string) => {
    try {
      const { data } = await sprintsApi.iniciar(id);
      setSprints((prev) => prev.map((s) => s.id === id ? data : s));
      setExpandidos((prev) => new Set([...prev, id]));
      toast.success('Sprint iniciado');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const completarSprint = async (id: string) => {
    setErrorCompletar((prev) => ({ ...prev, [id]: '' }));
    const sprint = sprints.find((s) => s.id === id);
    try {
      const { data } = await sprintsApi.completar(id);
      setSprints((prev) => prev.map((s) => s.id === id ? data : s));
      const tareasDelSprint = tareas.filter((t) => t.sprint_id === id && t.columna === 'done');
      const puntos = tareasDelSprint.reduce((sum, t) => sum + (t.puntos_historia ?? 0), 0);
      setVelocidadSprint({ nombre: sprint?.nombre ?? '', puntos, tareas: tareasDelSprint.length });
    } catch (err) {
      setErrorCompletar((prev) => ({ ...prev, [id]: mensajeError(err) }));
    }
  };

  const abrirEditar = (sprint: Sprint) => {
    setSprintEditando(sprint);
    setFormEditar({
      nombre: sprint.nombre,
      objetivo: sprint.objetivo ?? '',
      fechaInicio: sprint.fecha_inicio,
      fechaFin: sprint.fecha_fin,
      color: sprint.color ?? 'indigo',
    });
    setErrorEditar('');
  };

  const guardarEditar = async () => {
    if (!sprintEditando || !formEditar.nombre.trim()) return;
    setErrorEditar('');
    setGuardandoEditar(true);
    try {
      const { data } = await sprintsApi.actualizar(sprintEditando.id, {
        nombre: formEditar.nombre.trim(),
        objetivo: formEditar.objetivo.trim() || undefined,
        fecha_inicio: formEditar.fechaInicio,
        fecha_fin: formEditar.fechaFin,
        color: formEditar.color,
      });
      setSprints((prev) => prev.map((s) => s.id === data.id ? data : s));
      setSprintEditando(null);
    } catch (err) {
      setErrorEditar(mensajeError(err));
    } finally {
      setGuardandoEditar(false);
    }
  };

  const eliminarSprint = async (id: string) => {
    const ok = await confirmar({
      titulo: '¿Eliminar este sprint?',
      descripcion: 'Las tareas asociadas quedarán sin sprint asignado.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    try {
      await sprintsApi.eliminar(id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      toast.success('Sprint eliminado');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const formatearFecha = (f: string) => {
    if (!f) return '';
    return new Date(f + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const hayActivo = sprints.some((s) => s.estado === 'activo');

  if (cargando) {
    return <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando sprints...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Sprints</h2>
          <p className="text-xs text-slate-400 mt-0.5">{sprints.length} sprint{sprints.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setModalCrear(true); setFormCrear(formVacio); setErrorCrear(''); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <IconPlus size={15} />
          Nuevo sprint
        </button>
      </div>

      {/* Leyenda */}
      <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
        <IconLock size={14} className="flex-shrink-0 mt-0.5" />
        <span>Para completar un sprint, todas sus tareas deben estar en columna <strong>Completada</strong>. Usa el backlog para planificar tareas antes de asignarlas a un sprint.</span>
      </div>

      {/* Sprints */}
      {sprints.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center mb-4">
          <IconFlag size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-500 mb-1">Sin sprints todavía</p>
          <p className="text-sm text-slate-400">Crea el primer sprint para organizar el trabajo por ciclos.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {sprints.map((sprint) => {
            const cfg = estadoConfig[sprint.estado];
            const tareasDelSprint = tareas.filter((t) => t.sprint_id === sprint.id);
            const done = tareasDelSprint.filter((t) => t.columna === 'done');
            const pendientes = tareasDelSprint.filter((t) => t.columna !== 'done');
            const pct = tareasDelSprint.length > 0 ? Math.round((done.length / tareasDelSprint.length) * 100) : 0;
            const expandido = expandidos.has(sprint.id);

            return (
              <div
                key={sprint.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border ${cfg.border} ${sprint.estado === 'activo' ? 'shadow-sm shadow-green-100 dark:shadow-green-900/20' : ''} overflow-hidden`}
              >
                {/* Franja de color del sprint */}
                <div className="h-1 w-full" style={{ backgroundColor: SPRINT_COLORES.find((c) => c.key === sprint.color)?.hex ?? '#6366f1' }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => toggleExpandir(sprint.id)} className="flex items-start gap-2.5 flex-1 min-w-0 text-left">
                      {expandido
                        ? <IconChevronDown size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        : <IconChevronRight size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{sprint.nombre}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        {sprint.objetivo && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{sprint.objetivo}</p>}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <IconCalendar size={11} />
                          {formatearFecha(sprint.fecha_inicio)} → {formatearFecha(sprint.fecha_fin)}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {sprint.estado !== 'completado' && (
                        <button onClick={() => abrirEditar(sprint)} title="Editar sprint"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                          <IconEdit size={14} />
                        </button>
                      )}
                      {sprint.estado === 'planificado' && (
                        <button onClick={() => eliminarSprint(sprint.id)} title="Eliminar sprint"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <IconTrash size={14} />
                        </button>
                      )}
                      {sprint.estado === 'planificado' && !hayActivo && (
                        <button onClick={() => iniciarSprint(sprint.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                          <IconPlayerPlay size={12} />Iniciar
                        </button>
                      )}
                      {sprint.estado === 'planificado' && hayActivo && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Hay un sprint activo</span>
                      )}
                      {sprint.estado === 'activo' && (
                        <button onClick={() => completarSprint(sprint.id)} disabled={pendientes.length > 0}
                          title={pendientes.length > 0 ? `${pendientes.length} tareas pendientes` : 'Completar sprint'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors">
                          <IconCheck size={12} />Completar
                        </button>
                      )}
                    </div>
                  </div>

                  {tareasDelSprint.length > 0 && (
                    <div className="mt-3 pl-[22px]">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>{done.length}/{tareasDelSprint.length} completadas</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {errorCompletar[sprint.id] && (
                    <div className="mt-3 pl-[22px] flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                      <IconAlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                      {errorCompletar[sprint.id]}
                    </div>
                  )}
                </div>

                {expandido && (
                  <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-4 pt-3">
                    {tareasDelSprint.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">
                        No hay tareas asignadas.{' '}
                        <span className="text-indigo-500">Mueve tareas del backlog a este sprint.</span>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pendientes.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <IconAlertTriangle size={11} className="text-amber-500" />
                              Pendientes ({pendientes.length})
                            </p>
                            <div className="space-y-1.5">
                              {pendientes.map((t) => (
                                <button key={t.id} onClick={() => onAbrirTarea?.(t.id)}
                                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${COLUMNA_COLOR[t.columna] ?? 'bg-slate-400'}`} />
                                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{t.titulo}</span>
                                  <span className="text-xs text-slate-400 hidden group-hover:block flex-shrink-0">{COLUMNA_LABEL[t.columna] ?? t.columna}</span>
                                  <IconLayoutKanban size={12} className="text-slate-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {done.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <IconCircleCheck size={11} className="text-green-500" />
                              Completadas ({done.length})
                            </p>
                            <div className="space-y-1.5">
                              {done.map((t) => (
                                <button key={t.id} onClick={() => onAbrirTarea?.(t.id)}
                                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group">
                                  <IconCircleCheck size={14} className="text-green-500 flex-shrink-0" />
                                  <span className="text-sm text-slate-600 dark:text-slate-400 line-through flex-1 truncate">{t.titulo}</span>
                                  <IconLayoutKanban size={12} className="text-slate-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal velocidad sprint */}
      {velocidadSprint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrophy size={28} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">¡Sprint completado!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{velocidadSprint.nombre}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{velocidadSprint.tareas}</p>
                <p className="text-xs text-indigo-500 mt-0.5">Tareas completadas</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-4">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{velocidadSprint.puntos}</p>
                <p className="text-xs text-violet-500 mt-0.5">Puntos de velocidad</p>
              </div>
            </div>
            <button
              onClick={() => setVelocidadSprint(null)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal crear sprint */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuevo sprint</h2>
              <button onClick={() => setModalCrear(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><IconX size={20} /></button>
            </div>
            <SprintForm form={formCrear} onChange={setFormCrear} error={errorCrear} guardando={guardando}
              onGuardar={crearSprint} onCancelar={() => setModalCrear(false)} labelGuardar="Crear sprint" />
          </div>
        </div>
      )}

      {/* Modal editar sprint */}
      {sprintEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Editar sprint</h2>
              <button onClick={() => setSprintEditando(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><IconX size={20} /></button>
            </div>
            <SprintForm form={formEditar} onChange={setFormEditar} error={errorEditar} guardando={guardandoEditar}
              onGuardar={guardarEditar} onCancelar={() => setSprintEditando(null)} labelGuardar="Guardar cambios" />
          </div>
        </div>
      )}
    </div>
  );
}

function SprintForm({
  form, onChange, error, guardando, onGuardar, onCancelar, labelGuardar,
}: {
  form: FormSprint; onChange: (f: FormSprint) => void; error: string;
  guardando: boolean; onGuardar: () => void; onCancelar: () => void; labelGuardar: string;
}) {
  const set = (k: keyof FormSprint) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre *</label>
        <input type="text" value={form.nombre} onChange={set('nombre')} autoFocus
          placeholder="ej: Sprint 1, Sprint de lanzamiento..."
          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivo (opcional)</label>
        <textarea value={form.objetivo} onChange={set('objetivo')} rows={2}
          placeholder="¿Qué se quiere lograr en este sprint?"
          className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha inicio *</label>
          <input type="date" value={form.fechaInicio} onChange={set('fechaInicio')}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha fin *</label>
          <input type="date" value={form.fechaFin} onChange={set('fechaFin')} min={form.fechaInicio}
            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color del sprint</label>
        <div className="flex flex-wrap gap-2">
          {SPRINT_COLORES.map(({ key, hex }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...form, color: key })}
              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === key ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onCancelar} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
        <button onClick={onGuardar} disabled={!form.nombre.trim() || !form.fechaInicio || !form.fechaFin || guardando}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
          {guardando ? 'Guardando...' : labelGuardar}
        </button>
      </div>
    </div>
  );
}
