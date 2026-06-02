import { useState, useRef, useEffect } from 'react';
import { IconFilter, IconX, IconChevronDown } from '@tabler/icons-react';
import type { Sprint, Epica } from '../../interfaces';

export interface FiltrosActivos {
  sprintId: string;
  epicaId: string;
  etiqueta: string;
  prioridad: string;
  columna: string;
}

export const FILTROS_VACIOS: FiltrosActivos = {
  sprintId: '',
  epicaId: '',
  etiqueta: '',
  prioridad: '',
  columna: '',
};

const ETIQUETAS = ['bug', 'feature', 'hotfix', 'mejora', 'deuda técnica', 'documentación'];

const PRIORIDADES = [
  { value: 'critica', label: 'Crítica', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'media', label: 'Media', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'baja', label: 'Baja', color: 'bg-green-100 text-green-700 border-green-200' },
];

interface ColumnaOpc {
  id: string;
  nombre: string;
}

interface FiltrosTableroProps {
  sprints: Sprint[];
  epicas: Epica[];
  columnas: ColumnaOpc[];
  filtros: FiltrosActivos;
  onFiltrosChange: (f: FiltrosActivos) => void;
}

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, fn: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fn();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, fn]);
}

function DropdownFiltro({
  label,
  activo,
  children,
}: {
  label: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          activo
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
        }`}
      >
        {label}
        <IconChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg min-w-[180px] py-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

function OpcionFiltro({
  label,
  seleccionado,
  onClick,
  colorClass,
}: {
  label: string;
  seleccionado: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
        seleccionado
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      {colorClass && <span className={`w-2 h-2 rounded-full ${colorClass}`} />}
      {label}
    </button>
  );
}

export default function FiltrosTablero({ sprints, epicas, columnas, filtros, onFiltrosChange }: FiltrosTableroProps) {
  const set = (k: keyof FiltrosActivos) => (v: string) =>
    onFiltrosChange({ ...filtros, [k]: filtros[k] === v ? '' : v });

  const activos = Object.values(filtros).filter(Boolean).length;
  const limpiar = () => onFiltrosChange(FILTROS_VACIOS);

  const sprintActivo = sprints.find((s) => s.id === filtros.sprintId);
  const epicaActiva = epicas.find((e) => e.id === filtros.epicaId);
  const columnaActiva = columnas.find((c) => c.id === filtros.columna);
  const prioridadActiva = PRIORIDADES.find((p) => p.value === filtros.prioridad);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Icono filtros */}
      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 mr-1">
        <IconFilter size={15} />
        {activos > 0 && (
          <span className="text-xs font-bold bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
            {activos}
          </span>
        )}
      </div>

      {/* Sprint */}
      <DropdownFiltro label={sprintActivo ? `Sprint: ${sprintActivo.nombre}` : 'Sprint'} activo={!!filtros.sprintId}>
        <OpcionFiltro label="Todos los sprints" seleccionado={!filtros.sprintId} onClick={() => onFiltrosChange({ ...filtros, sprintId: '' })} />
        <OpcionFiltro label="Sin sprint" seleccionado={filtros.sprintId === '__none__'} onClick={() => set('sprintId')('__none__')} />
        {sprints.map((s) => (
          <OpcionFiltro key={s.id} label={s.nombre} seleccionado={filtros.sprintId === s.id} onClick={() => set('sprintId')(s.id)} />
        ))}
      </DropdownFiltro>

      {/* Épica */}
      <DropdownFiltro label={epicaActiva ? `Épica: ${epicaActiva.nombre}` : 'Épica'} activo={!!filtros.epicaId}>
        <OpcionFiltro label="Todas las épicas" seleccionado={!filtros.epicaId} onClick={() => onFiltrosChange({ ...filtros, epicaId: '' })} />
        <OpcionFiltro label="Sin épica" seleccionado={filtros.epicaId === '__none__'} onClick={() => set('epicaId')('__none__')} />
        {epicas.map((e) => (
          <OpcionFiltro
            key={e.id}
            label={e.nombre}
            seleccionado={filtros.epicaId === e.id}
            onClick={() => set('epicaId')(e.id)}
            colorClass={`bg-[${e.color}]`}
          />
        ))}
      </DropdownFiltro>

      {/* Etiqueta */}
      <DropdownFiltro label={filtros.etiqueta ? `Etiqueta: ${filtros.etiqueta}` : 'Etiqueta'} activo={!!filtros.etiqueta}>
        <OpcionFiltro label="Todas" seleccionado={!filtros.etiqueta} onClick={() => onFiltrosChange({ ...filtros, etiqueta: '' })} />
        {ETIQUETAS.map((et) => (
          <OpcionFiltro key={et} label={et} seleccionado={filtros.etiqueta === et} onClick={() => set('etiqueta')(et)} />
        ))}
      </DropdownFiltro>

      {/* Prioridad */}
      <DropdownFiltro label={prioridadActiva ? `Prioridad: ${prioridadActiva.label}` : 'Prioridad'} activo={!!filtros.prioridad}>
        <OpcionFiltro label="Todas" seleccionado={!filtros.prioridad} onClick={() => onFiltrosChange({ ...filtros, prioridad: '' })} />
        {PRIORIDADES.map((p) => (
          <OpcionFiltro key={p.value} label={p.label} seleccionado={filtros.prioridad === p.value} onClick={() => set('prioridad')(p.value)} />
        ))}
      </DropdownFiltro>

      {/* Estado (columna) */}
      <DropdownFiltro label={columnaActiva ? `Estado: ${columnaActiva.nombre}` : 'Estado'} activo={!!filtros.columna}>
        <OpcionFiltro label="Todos" seleccionado={!filtros.columna} onClick={() => onFiltrosChange({ ...filtros, columna: '' })} />
        {columnas.map((c) => (
          <OpcionFiltro key={c.id} label={c.nombre} seleccionado={filtros.columna === c.id} onClick={() => set('columna')(c.id)} />
        ))}
      </DropdownFiltro>

      {/* Limpiar */}
      {activos > 0 && (
        <button
          onClick={limpiar}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <IconX size={12} />
          Limpiar
        </button>
      )}
    </div>
  );
}
