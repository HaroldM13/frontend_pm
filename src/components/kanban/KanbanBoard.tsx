import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext, closestCenter,
  MouseSensor, TouchSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import type { Tarea, Usuario, Sprint, Epica, ColumnaCustom } from '../../interfaces';
import { tareasApi, epicasApi, sprintsApi, proyectosApi, mensajeError } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import KanbanColumna from './KanbanColumna';
import type { ColumnaConfig } from './KanbanColumna';
import ModalTarea from './ModalTarea';
import CompartirTareaModal from '../chat/CompartirTareaModal';
import FiltrosTablero from './FiltrosTablero';
import type { FiltrosActivos } from './FiltrosTablero';
import { FILTROS_VACIOS } from './FiltrosTablero';

const SPRINT_COLOR_HEX: Record<string, string> = {
  indigo: '#6366f1', violet: '#8b5cf6', blue: '#3b82f6', cyan: '#06b6d4',
  teal: '#14b8a6', green: '#22c55e', amber: '#f59e0b', orange: '#f97316',
  rose: '#f43f5e', pink: '#ec4899', slate: '#64748b', purple: '#a855f7',
};

const COLOR_MAP: Record<string, { dot: string; bg: string }> = {
  slate:  { dot: 'bg-slate-400',   bg: 'bg-slate-50 dark:bg-slate-800/40' },
  blue:   { dot: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  amber:  { dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  purple: { dot: 'bg-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
  green:  { dot: 'bg-green-500',   bg: 'bg-green-50 dark:bg-green-900/20' },
  violet: { dot: 'bg-violet-500',  bg: 'bg-violet-50 dark:bg-violet-900/20' },
  pink:   { dot: 'bg-pink-500',    bg: 'bg-pink-50 dark:bg-pink-900/20' },
  orange: { dot: 'bg-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
  teal:   { dot: 'bg-teal-500',    bg: 'bg-teal-50 dark:bg-teal-900/20' },
  indigo: { dot: 'bg-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
};

const COLUMNAS_BASE: ColumnaConfig[] = [
  { id: 'todo',        label: 'Por hacer',    dotColor: 'bg-blue-500',   bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'in_progress', label: 'En progreso',  dotColor: 'bg-amber-500',  bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'review',      label: 'En revisión',  dotColor: 'bg-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 'done',        label: 'Completada',   dotColor: 'bg-green-500',  bgColor: 'bg-green-50 dark:bg-green-900/20' },
];

const COLORES_DISPONIBLES = ['indigo', 'violet', 'pink', 'orange', 'teal', 'amber', 'blue', 'green'];

interface KanbanBoardProps {
  proyectoId: string;
  tareas: Tarea[];
  miembros: Usuario[];
  columnasCustom: ColumnaCustom[];
  onTareasChange: (tareas: Tarea[]) => void;
  onColumnasChange: (columnas: ColumnaCustom[]) => void;
}

export default function KanbanBoard({
  proyectoId, tareas, miembros, columnasCustom, onTareasChange, onColumnasChange,
}: KanbanBoardProps) {
  const confirmar = useConfirm();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null);
  const [columnaInicial, setColumnaInicial] = useState<string>('todo');
  const [tareaParaCompartir, setTareaParaCompartir] = useState<Tarea | null>(null);
  const [filtros, setFiltros] = useState<FiltrosActivos>(FILTROS_VACIOS);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [epicas, setEpicas] = useState<Epica[]>([]);

  const sprintColorMap: Record<string, string> = useMemo(
    () => Object.fromEntries(sprints.map((s) => [s.id, SPRINT_COLOR_HEX[s.color] ?? SPRINT_COLOR_HEX.indigo])),
    [sprints],
  );

  // Nueva columna
  const [modalNuevaColumna, setModalNuevaColumna] = useState(false);
  const [nuevaColNombre, setNuevaColNombre] = useState('');
  const [nuevaColColor, setNuevaColColor] = useState('indigo');
  const [guardandoColumna, setGuardandoColumna] = useState(false);

  useEffect(() => {
    Promise.all([
      sprintsApi.listar(proyectoId),
      epicasApi.listar(proyectoId),
    ]).then(([resSprints, resEpicas]) => {
      setSprints(resSprints.data);
      setEpicas(resEpicas.data);
    }).catch(() => {});
  }, [proyectoId]);

  const columnasTodas: ColumnaConfig[] = [
    ...COLUMNAS_BASE,
    ...columnasCustom
      .sort((a, b) => a.orden - b.orden)
      .map((c): ColumnaConfig => {
        const colores = COLOR_MAP[c.color] ?? COLOR_MAP['indigo'];
        return { id: c.id, label: c.nombre, dotColor: colores.dot, bgColor: colores.bg, esCustom: true };
      }),
  ];

  const columnasParaFiltro = columnasTodas.map((c) => ({ id: c.id, nombre: c.label }));

  const tareasFiltradas = tareas.filter((t) => {
    if (t.columna === 'backlog') return false;
    if (filtros.sprintId === '__none__' && t.sprint_id) return false;
    if (filtros.sprintId && filtros.sprintId !== '__none__' && t.sprint_id !== filtros.sprintId) return false;
    if (filtros.epicaId === '__none__' && t.epica_id) return false;
    if (filtros.epicaId && filtros.epicaId !== '__none__' && t.epica_id !== filtros.epicaId) return false;
    if (filtros.etiqueta && !t.etiquetas.includes(filtros.etiqueta)) return false;
    if (filtros.prioridad && t.prioridad !== filtros.prioridad) return false;
    if (filtros.columna && t.columna !== filtros.columna) return false;
    return true;
  });

  const tareasPorColumna = useCallback(
    (colId: string) => tareasFiltradas.filter((t) => t.columna === colId),
    [tareasFiltradas],
  );

  const abrirCrear = (columna: string) => {
    setTareaSeleccionada(null);
    setColumnaInicial(columna);
    setModalAbierto(true);
  };

  const abrirEditar = (tarea: Tarea) => {
    setTareaSeleccionada(tarea);
    setColumnaInicial(tarea.columna);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setTareaSeleccionada(null);
  };

  const handleGuardar = (tareaActualizada: Tarea) => {
    if (tareaSeleccionada) {
      onTareasChange(tareas.map((t) => (t.id === tareaActualizada.id ? tareaActualizada : t)));
    } else {
      onTareasChange([tareaActualizada, ...tareas]);
    }
    cerrarModal();
  };

  const handleEliminar = (id: string) => {
    onTareasChange(tareas.filter((t) => t.id !== id));
    cerrarModal();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const tareaId = active.id as string;
    const columnaDestino = over.id as string;
    const tarea = tareas.find((t) => t.id === tareaId);
    if (!tarea || tarea.columna === columnaDestino) return;

    onTareasChange(tareas.map((t) => (t.id === tareaId ? { ...t, columna: columnaDestino } : t)));
    try {
      await tareasApi.actualizar(tareaId, { columna: columnaDestino });
    } catch (err) {
      toast.error(mensajeError(err));
      onTareasChange(tareas);
    }
  };

  const agregarColumna = async () => {
    if (!nuevaColNombre.trim()) return;
    setGuardandoColumna(true);
    const nuevaColumna: ColumnaCustom = {
      id: `col_${Date.now()}`,
      nombre: nuevaColNombre.trim(),
      orden: 10 + columnasCustom.length,
      color: nuevaColColor,
    };
    const actualizadas = [...columnasCustom, nuevaColumna];
    try {
      const { data } = await proyectosApi.gestionarColumnas(proyectoId, actualizadas);
      onColumnasChange(data.columnas_custom);
      setModalNuevaColumna(false);
      setNuevaColNombre('');
      toast.success('Columna creada');
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setGuardandoColumna(false);
    }
  };

  const eliminarColumna = async (colId: string) => {
    const ok = await confirmar({
      titulo: '¿Eliminar esta columna?',
      descripcion: 'Solo se puede eliminar si no tiene tareas asignadas.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    const actualizadas = columnasCustom.filter((c) => c.id !== colId);
    try {
      const { data } = await proyectosApi.gestionarColumnas(proyectoId, actualizadas);
      onColumnasChange(data.columnas_custom);
      toast.success('Columna eliminada');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  return (
    <>
      <FiltrosTablero
        sprints={sprints}
        epicas={epicas}
        columnas={columnasParaFiltro}
        filtros={filtros}
        onFiltrosChange={setFiltros}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-280px)] items-stretch">
          {columnasTodas.map((cfg) => (
            <KanbanColumna
              key={cfg.id}
              config={cfg}
              tareas={tareasPorColumna(cfg.id)}
              miembros={miembros}
              sprintColorMap={sprintColorMap}
              onAgregarTarea={() => abrirCrear(cfg.id)}
              onClickTarea={abrirEditar}
              onCompartirTarea={setTareaParaCompartir}
              onEliminarColumna={cfg.esCustom ? eliminarColumna : undefined}
            />
          ))}

          {/* Botón agregar columna */}
          <div className="flex flex-col min-w-[200px] w-[200px] pt-0.5">
            {modalNuevaColumna ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={nuevaColNombre}
                  onChange={(e) => setNuevaColNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') agregarColumna(); if (e.key === 'Escape') setModalNuevaColumna(false); }}
                  placeholder="Nombre de la columna"
                  className="w-full px-2.5 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLORES_DISPONIBLES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNuevaColColor(c)}
                      className={`w-5 h-5 rounded-full ${COLOR_MAP[c].dot} transition-transform ${nuevaColColor === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalNuevaColumna(false)}
                    className="flex-1 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <IconX size={12} className="inline mr-1" />Cancelar
                  </button>
                  <button
                    onClick={agregarColumna}
                    disabled={!nuevaColNombre.trim() || guardandoColumna}
                    className="flex-1 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setModalNuevaColumna(true)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                <IconPlus size={16} />
                Nueva columna
              </button>
            )}
          </div>
        </div>
      </DndContext>

      {modalAbierto && (
        <ModalTarea
          proyectoId={proyectoId}
          tarea={tareaSeleccionada}
          columnaInicial={columnaInicial}
          miembros={miembros}
          columnas={columnasTodas}
          onGuardar={handleGuardar}
          onEliminar={handleEliminar}
          onCerrar={cerrarModal}
          onCompartir={(t) => { cerrarModal(); setTareaParaCompartir(t); }}
        />
      )}

      {tareaParaCompartir && (
        <CompartirTareaModal
          tarea={tareaParaCompartir}
          onCerrar={() => setTareaParaCompartir(null)}
        />
      )}
    </>
  );
}
