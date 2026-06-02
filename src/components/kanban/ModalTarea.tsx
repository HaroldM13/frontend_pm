import { useState, useEffect } from 'react';
import {
  IconX, IconClock, IconCalendar, IconUser, IconTag, IconTrash, IconPlus, IconShare2,
  IconInfoCircle, IconPhoto, IconListCheck,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { tareasApi, epicasApi, sprintsApi, mensajeError } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import type { Tarea, Prioridad, TipoTarea, Usuario, Epica, Sprint } from '../../interfaces';
import type { ColumnaConfig } from './KanbanColumna';
import EvidenciasTab from '../tarea/EvidenciasTab';
import ChecklistTab from '../tarea/ChecklistTab';

type TabModal = 'info' | 'evidencias' | 'checklist';

interface ModalTareaProps {
  proyectoId: string;
  tarea?: Tarea | null;
  columnaInicial?: string;
  miembros: Usuario[];
  columnas?: ColumnaConfig[];
  onGuardar: (tarea: Tarea) => void;
  onEliminar?: (id: string) => void;
  onCerrar: () => void;
  onCompartir?: (tarea: Tarea) => void;
}

const ETIQUETAS_DISPONIBLES = ['bug', 'feature', 'hotfix', 'mejora', 'deuda técnica', 'documentación'];

const COLUMNAS_DEFAULT: ColumnaConfig[] = [
  { id: 'backlog',     label: 'Backlog',      dotColor: 'bg-slate-400',   bgColor: '' },
  { id: 'todo',        label: 'Por hacer',    dotColor: 'bg-blue-500',    bgColor: '' },
  { id: 'in_progress', label: 'En progreso',  dotColor: 'bg-amber-500',   bgColor: '' },
  { id: 'review',      label: 'En revisión',  dotColor: 'bg-purple-500',  bgColor: '' },
  { id: 'done',        label: 'Completada',   dotColor: 'bg-green-500',   bgColor: '' },
];

const PRIORIDADES: { value: Prioridad; label: string }[] = [
  { value: 'critica', label: 'Crítica' },
  { value: 'alta',    label: 'Alta' },
  { value: 'media',   label: 'Media' },
  { value: 'baja',    label: 'Baja' },
];

export default function ModalTarea({
  proyectoId, tarea, columnaInicial = 'todo', miembros, columnas,
  onGuardar, onEliminar, onCerrar, onCompartir,
}: ModalTareaProps) {
  const confirmar = useConfirm();
  const esEdicion = !!tarea;
  const [tabActiva, setTabActiva] = useState<TabModal>('info');

  const [titulo, setTitulo] = useState(tarea?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? '');
  const [columna, setColumna] = useState<string>(tarea?.columna ?? columnaInicial);
  const [prioridad, setPrioridad] = useState<Prioridad>(tarea?.prioridad ?? 'media');
  const [tipoTarea, setTipoTarea] = useState<TipoTarea>(tarea?.tipo_tarea ?? 'tarea');
  const [puntosHistoria, setPuntosHistoria] = useState<number>(tarea?.puntos_historia ?? 0);
  const [criteriosAceptacion, setCriteriosAceptacion] = useState(tarea?.criterios_aceptacion ?? '');
  const [asignadoA, setAsignadoA] = useState(tarea?.asignado_a ?? '');
  const [horasEstimadas, setHorasEstimadas] = useState(tarea?.horas_estimadas?.toString() ?? '0');
  const [fechaInicio, setFechaInicio] = useState(tarea?.fecha_inicio ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(tarea?.fecha_vencimiento ?? '');
  const [etiquetas, setEtiquetas] = useState<string[]>(tarea?.etiquetas ?? []);
  const [epicaId, setEpicaId] = useState(tarea?.epica_id ?? '');
  const [sprintId, setSprintId] = useState(tarea?.sprint_id ?? '');

  const [mostrarLogHoras, setMostrarLogHoras] = useState(false);
  const [logHoras, setLogHoras] = useState('');
  const [logDescripcion, setLogDescripcion] = useState('');
  const [logFecha, setLogFecha] = useState(new Date().toISOString().split('T')[0]);

  const [epicas, setEpicas] = useState<Epica[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardandoHoras, setGuardandoHoras] = useState(false);
  const [error, setError] = useState('');

  const columnasDisponibles = columnas && columnas.length > 0
    ? [{ id: 'backlog', label: 'Backlog', dotColor: '', bgColor: '' }, ...columnas]
    : COLUMNAS_DEFAULT;

  useEffect(() => {
    Promise.all([
      epicasApi.listar(proyectoId),
      sprintsApi.listar(proyectoId),
    ]).then(([resEpicas, resSprints]) => {
      setEpicas(resEpicas.data);
      setSprints(resSprints.data.filter((s) => s.estado !== 'completado'));
    }).catch(() => {});
  }, [proyectoId]);

  const toggleEtiqueta = (et: string) => {
    setEtiquetas((prev) => prev.includes(et) ? prev.filter((e) => e !== et) : [...prev, et]);
  };

  const handleGuardar = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setError('');
    setGuardando(true);
    const datos = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      proyecto_id: proyectoId,
      columna,
      prioridad,
      tipo_tarea: tipoTarea,
      puntos_historia: puntosHistoria,
      criterios_aceptacion: criteriosAceptacion.trim() || undefined,
      asignado_a: asignadoA || undefined,
      horas_estimadas: parseFloat(horasEstimadas) || 0,
      fecha_inicio: fechaInicio || undefined,
      fecha_vencimiento: fechaVencimiento || undefined,
      etiquetas,
      epica_id: epicaId || undefined,
      sprint_id: sprintId || undefined,
    };
    try {
      if (esEdicion && tarea) {
        const { data } = await tareasApi.actualizar(tarea.id, datos);
        onGuardar(data);
      } else {
        const { data } = await tareasApi.crear(datos);
        onGuardar(data);
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const handleLogHoras = async () => {
    if (!tarea || !logHoras || parseFloat(logHoras) <= 0) return;
    setGuardandoHoras(true);
    try {
      await tareasApi.registrarHoras(tarea.id, parseFloat(logHoras), logDescripcion, logFecha);
      const { data } = await tareasApi.actualizar(tarea.id, {});
      onGuardar(data);
      setLogHoras('');
      setLogDescripcion('');
      setMostrarLogHoras(false);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardandoHoras(false);
    }
  };

  const handleEliminar = async () => {
    if (!tarea) return;
    const ok = await confirmar({
      titulo: '¿Eliminar esta tarea?',
      descripcion: 'Esta acción no se puede deshacer.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    try {
      await tareasApi.eliminar(tarea.id);
      toast.success('Tarea eliminada');
      onEliminar?.(tarea.id);
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const porcentajeHoras = tarea && tarea.horas_estimadas > 0
    ? Math.min(100, Math.round((tarea.horas_registradas / tarea.horas_estimadas) * 100))
    : 0;

  const TABS: { id: TabModal; label: string; icon: React.ElementType; soloEdicion: boolean }[] = [
    { id: 'info',       label: 'Información', icon: IconInfoCircle, soloEdicion: false },
    { id: 'evidencias', label: 'Evidencias',  icon: IconPhoto,      soloEdicion: true },
    { id: 'checklist',  label: 'Checklist',   icon: IconListCheck,  soloEdicion: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">{esEdicion ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <div className="flex items-center gap-2">
            {esEdicion && tarea && onCompartir && (
              <button onClick={() => onCompartir(tarea)} title="Compartir en chat"
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                <IconShare2 size={16} />
              </button>
            )}
            {esEdicion && onEliminar && (
              <button onClick={handleEliminar}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <IconTrash size={16} />
              </button>
            )}
            <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Tabs (solo en edición las de evidencias/checklist) */}
        {esEdicion && (
          <div className="flex border-b border-slate-200 dark:border-slate-700 px-5 flex-shrink-0">
            {TABS.filter((t) => !t.soloEdicion || esEdicion).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tabActiva === id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tabActiva === 'info' && (
            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Título *</label>
                <input
                  type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  autoFocus={tabActiva === 'info'}
                  placeholder="¿Qué hay que hacer?"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Tipo + Puntos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Tipo</label>
                  <select value={tipoTarea} onChange={(e) => setTipoTarea(e.target.value as TipoTarea)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100">
                    <option value="tarea">Tarea</option>
                    <option value="historia">Historia de usuario</option>
                    <option value="bug">Bug</option>
                    <option value="mejora">Mejora</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Puntos de historia</label>
                  <div className="flex gap-1 flex-wrap">
                    {[0, 1, 2, 3, 5, 8, 13].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPuntosHistoria(p)}
                        className={`min-w-[32px] h-9 px-2 text-sm font-medium rounded-lg border transition-colors ${
                          puntosHistoria === p
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:bg-slate-800'
                        }`}
                      >
                        {p === 0 ? '—' : p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Descripción</label>
                <textarea
                  value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
                  placeholder="Contexto, detalles técnicos..."
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              {/* Criterios de aceptación (especialmente útil para historias) */}
              {(tipoTarea === 'historia' || criteriosAceptacion) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Criterios de aceptación</label>
                  <textarea
                    value={criteriosAceptacion} onChange={(e) => setCriteriosAceptacion(e.target.value)} rows={3}
                    placeholder={"- Dado que... cuando... entonces...\n- El sistema debe...\n- El usuario puede..."}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 resize-none font-mono text-xs"
                  />
                </div>
              )}

              {/* Estado + Prioridad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Estado</label>
                  <select value={columna} onChange={(e) => setColumna(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100">
                    {columnasDisponibles.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Prioridad</label>
                  <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as Prioridad)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100">
                    {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Asignado + Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    <IconUser size={11} className="inline mr-1" />Asignar a
                  </label>
                  <select value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100">
                    <option value="">Sin asignar</option>
                    {miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    <IconClock size={11} className="inline mr-1" />Horas estimadas
                  </label>
                  <input type="number" min="0" step="0.5" value={horasEstimadas} onChange={(e) => setHorasEstimadas(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>

              {/* Épica + Sprint */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Épica</label>
                  <select value={epicaId} onChange={(e) => setEpicaId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100">
                    <option value="">Sin épica</option>
                    {epicas.map((ep) => <option key={ep.id} value={ep.id}>{ep.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Sprint</label>
                  <select value={sprintId} onChange={(e) => setSprintId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100">
                    <option value="">Sin sprint</option>
                    {sprints.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    <IconCalendar size={11} className="inline mr-1" />Fecha inicio
                  </label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Fecha límite</label>
                  <input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
                </div>
              </div>

              {/* Etiquetas */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  <IconTag size={11} className="inline mr-1" />Etiquetas
                </label>
                <div className="flex flex-wrap gap-2">
                  {ETIQUETAS_DISPONIBLES.map((et) => (
                    <button key={et} type="button" onClick={() => toggleEtiqueta(et)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        etiquetas.includes(et)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                      }`}>
                      {et}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horas trabajadas (solo edición) */}
              {esEdicion && tarea && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Horas trabajadas</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                        {tarea.horas_registradas}h registradas
                        {tarea.horas_estimadas > 0 && ` / ${tarea.horas_estimadas}h estimadas`}
                      </p>
                      {tarea.horas_estimadas > 0 && (
                        <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full w-40 overflow-hidden">
                          <div className={`h-full rounded-full ${porcentajeHoras >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
                            style={{ width: `${porcentajeHoras}%` }} />
                        </div>
                      )}
                    </div>
                    <button onClick={() => setMostrarLogHoras(!mostrarLogHoras)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors">
                      <IconPlus size={13} />Registrar horas
                    </button>
                  </div>
                  {mostrarLogHoras && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Horas</label>
                          <input type="number" min="0.5" step="0.5" value={logHoras} onChange={(e) => setLogHoras(e.target.value)} placeholder="1.5"
                            className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
                          <input type="date" value={logFecha} onChange={(e) => setLogFecha(e.target.value)}
                            className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
                        </div>
                      </div>
                      <input type="text" value={logDescripcion} onChange={(e) => setLogDescripcion(e.target.value)} placeholder="¿Qué hiciste?"
                        className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100" />
                      <button onClick={handleLogHoras} disabled={!logHoras || guardandoHoras}
                        className="w-full py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors">
                        {guardandoHoras ? 'Guardando...' : 'Guardar horas'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-lg">{error}</div>
              )}
            </div>
          )}

          {tabActiva === 'evidencias' && tarea && (
            <EvidenciasTab tareaId={tarea.id} />
          )}

          {tabActiva === 'checklist' && tarea && (
            <ChecklistTab tareaId={tarea.id} />
          )}
        </div>

        {/* Footer solo en tab info */}
        {tabActiva === 'info' && (
          <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button onClick={onCerrar}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={!titulo.trim() || guardando}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors">
              {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
