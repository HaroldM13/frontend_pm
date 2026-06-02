import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  IconClock, IconCalendar, IconUser, IconShare2,
  IconBook, IconBug, IconCheckbox, IconArrowUp, IconPointFilled,
} from '@tabler/icons-react';
import type { Tarea, Prioridad, TipoTarea, Usuario } from '../../interfaces';

interface TareaCardProps {
  tarea: Tarea;
  miembros: Usuario[];
  sprintColorHex?: string;
  onClick: () => void;
  onCompartir?: (tarea: Tarea) => void;
}

const colorPrioridad: Record<Prioridad, string> = {
  critica: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  alta:    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  media:   'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  baja:    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
};

const dotPrioridad: Record<Prioridad, string> = {
  critica: 'bg-red-500',
  alta:    'bg-orange-400',
  media:   'bg-yellow-400',
  baja:    'bg-green-400',
};

const labelPrioridad: Record<Prioridad, string> = {
  critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja',
};

const tipoConfig: Record<TipoTarea, { icon: React.ElementType; label: string; color: string }> = {
  historia: { icon: IconBook,      label: 'Historia', color: 'text-violet-500' },
  bug:      { icon: IconBug,       label: 'Bug',      color: 'text-red-500' },
  tarea:    { icon: IconCheckbox,  label: 'Tarea',    color: 'text-slate-400' },
  mejora:   { icon: IconArrowUp,   label: 'Mejora',   color: 'text-blue-500' },
};

export default function TareaCard({ tarea, miembros, sprintColorHex, onClick, onCompartir }: TareaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tarea.id,
    data: { columnaActual: tarea.columna },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const asignado = miembros.find((m) => m.id === tarea.asignado_a);
  const porcentajeHoras = tarea.horas_estimadas > 0
    ? Math.min(100, Math.round((tarea.horas_registradas / tarea.horas_estimadas) * 100))
    : 0;

  const fechaVence = tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento) : null;
  const hoy = new Date();
  const vencida = fechaVence && fechaVence < hoy && tarea.columna !== 'done';

  const tipo = tipoConfig[tarea.tipo_tarea ?? 'tarea'];
  const TipoIcon = tipo.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`relative group rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow select-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${
        isDragging ? 'shadow-xl border-indigo-300' : ''
      }`}
    >
      {/* Borde izquierdo de color sprint */}
      {sprintColorHex && (
        <div
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
          style={{ backgroundColor: sprintColorHex }}
        />
      )}

      {/* Botón compartir */}
      {onCompartir && (
        <button
          onClick={(e) => { e.stopPropagation(); onCompartir(tarea); }}
          title="Compartir tarea en chat"
          className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 rounded-md transition-all shadow-sm"
        >
          <IconShare2 size={12} />
        </button>
      )}

      {/* Tipo + prioridad */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TipoIcon size={13} className={tipo.color} />
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotPrioridad[tarea.prioridad]}`} />
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md border ${colorPrioridad[tarea.prioridad]}`}>
            {labelPrioridad[tarea.prioridad]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {tarea.puntos_historia > 0 && (
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md">
              {tarea.puntos_historia}pt
            </span>
          )}
          {tarea.etiquetas.length > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
              {tarea.etiquetas[0]}
            </span>
          )}
        </div>
      </div>

      {/* Título */}
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2.5 leading-snug line-clamp-2">
        {tarea.titulo}
      </p>

      {/* Barra de horas */}
      {tarea.horas_estimadas > 0 && (
        <div className="mb-2.5">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <IconClock size={11} />
              {tarea.horas_registradas}h / {tarea.horas_estimadas}h
            </span>
            <span>{porcentajeHoras}%</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${porcentajeHoras >= 100 ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${porcentajeHoras}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {asignado ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {asignado.nombre.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
              {asignado.nombre.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-slate-300 dark:text-slate-600">
            <IconUser size={13} />
            <span className="text-xs">Sin asignar</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {tarea.criterios_aceptacion && (
            <IconPointFilled size={8} className="text-green-400" title="Tiene criterios de aceptación" />
          )}
          {fechaVence && (
            <span className={`flex items-center gap-1 text-xs ${vencida ? 'text-red-500 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
              <IconCalendar size={11} />
              {fechaVence.toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
