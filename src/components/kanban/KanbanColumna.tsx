import { useDroppable } from '@dnd-kit/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { Tarea, Usuario } from '../../interfaces';
import TareaCard from './TareaCard';

export interface ColumnaConfig {
  id: string;
  label: string;
  dotColor: string;
  bgColor: string;
  esCustom?: boolean;
}

interface KanbanColumnaProps {
  config: ColumnaConfig;
  tareas: Tarea[];
  miembros: Usuario[];
  sprintColorMap: Record<string, string>;
  onAgregarTarea: () => void;
  onClickTarea: (tarea: Tarea) => void;
  onCompartirTarea?: (tarea: Tarea) => void;
  onEliminarColumna?: (id: string) => void;
}

export default function KanbanColumna({
  config,
  tareas,
  miembros,
  sprintColorMap,
  onAgregarTarea,
  onClickTarea,
  onCompartirTarea,
  onEliminarColumna,
}: KanbanColumnaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: config.id });

  return (
    <div className="flex flex-col min-w-[272px] w-[272px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{config.label}</span>
          <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 w-5 h-5 rounded-full flex items-center justify-center">
            {tareas.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {config.esCustom && onEliminarColumna && tareas.length === 0 && (
            <button
              onClick={() => onEliminarColumna(config.id)}
              title="Eliminar columna"
              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <IconTrash size={13} />
            </button>
          )}
          <button
            onClick={onAgregarTarea}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title="Agregar tarea"
          >
            <IconPlus size={16} />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2.5 min-h-[120px] transition-colors ${
          isOver ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-300 ring-dashed' : config.bgColor
        }`}
      >
        {tareas.map((tarea) => (
          <TareaCard
            key={tarea.id}
            tarea={tarea}
            miembros={miembros}
            sprintColorHex={tarea.sprint_id ? sprintColorMap[tarea.sprint_id] : undefined}
            onClick={() => onClickTarea(tarea)}
            onCompartir={onCompartirTarea}
          />
        ))}

        {tareas.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-300 dark:text-slate-600">
            <p className="text-xs">Sin tareas</p>
          </div>
        )}
      </div>
    </div>
  );
}
