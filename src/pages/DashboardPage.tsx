import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconFolder, IconBuilding, IconClipboardList, IconFlag,
  IconAlertTriangle, IconCircleCheck, IconClock, IconArrowRight,
  IconLayoutKanban, IconChartBar, IconTrendingUp,
} from '@tabler/icons-react';
import { areasApi, proyectosApi, tareasApi, mensajeError } from '../services/api';
import type { Area, Proyecto, Tarea } from '../interfaces';
import { useAuth } from '../context/AuthContext';

const COLUMNA_LABEL: Record<string, string> = {
  backlog: 'Backlog', todo: 'Por hacer', in_progress: 'En progreso',
  review: 'En revisión', done: 'Completada',
};

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  critica: { label: 'Crítica', color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800', dot: 'bg-red-500' },
  alta:    { label: 'Alta',    color: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  media:   { label: 'Media',   color: 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500' },
  baja:    { label: 'Baja',    color: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800', dot: 'bg-green-500' },
};

const COLUMNA_COLOR: Record<string, string> = {
  backlog: 'bg-slate-400', todo: 'bg-blue-400',
  in_progress: 'bg-amber-400', review: 'bg-purple-400', done: 'bg-green-500',
};

export default function DashboardPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [areas, setAreas] = useState<Area[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [todasLasTareas, setTodasLasTareas] = useState<Tarea[]>([]);
  const [proyectoNombre, setProyectoNombre] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [resAreas, resProyectos] = await Promise.all([
          areasApi.listar(),
          proyectosApi.listar(),
        ]);
        setAreas(resAreas.data);
        setProyectos(resProyectos.data);

        const nomMap: Record<string, string> = {};
        resProyectos.data.forEach((p) => { nomMap[p.id] = p.nombre; });
        setProyectoNombre(nomMap);

        if (resProyectos.data.length > 0) {
          const resultados = await Promise.all(
            resProyectos.data.slice(0, 8).map((p) => tareasApi.listarPorProyecto(p.id))
          );
          setTodasLasTareas(resultados.flatMap((r) => r.data));
        }
      } catch (err) {
        console.error(mensajeError(err));
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [usuario]);

  const misTareasPendientes = useMemo(
    () => todasLasTareas
      .filter((t) => t.asignado_a === usuario?.id && t.columna !== 'done')
      .sort((a, b) => {
        const ord = { critica: 0, alta: 1, media: 2, baja: 3 };
        return (ord[a.prioridad] ?? 9) - (ord[b.prioridad] ?? 9);
      }),
    [todasLasTareas, usuario],
  );

  const sprintsActivos = useMemo(
    () => proyectos.filter((p) => !!p.sprint_activo_id).length,
    [proyectos],
  );

  // Distribución global de tareas por columna
  const distribucion = useMemo(() => {
    const total = todasLasTareas.length;
    const cols = ['backlog', 'todo', 'in_progress', 'review', 'done'] as const;
    return cols.map((col) => {
      const count = todasLasTareas.filter((t) => t.columna === col).length;
      return { col, label: COLUMNA_LABEL[col], count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    });
  }, [todasLasTareas]);

  // Resumen por proyecto (para la tabla)
  const resumenProyectos = useMemo(() => {
    return proyectos.slice(0, 6).map((p) => {
      const tareas = todasLasTareas.filter((t) => t.proyecto_id === p.id);
      const completadas = tareas.filter((t) => t.columna === 'done').length;
      const total = tareas.length;
      const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
      return { proyecto: p, total, completadas, pct };
    });
  }, [proyectos, todasLasTareas]);

  // Tareas con vencimiento próximo (próximos 7 días)
  const proximasVencer = useMemo(() => {
    const hoy = new Date();
    const en7 = new Date(); en7.setDate(hoy.getDate() + 7);
    return todasLasTareas
      .filter((t) => t.fecha_vencimiento && t.columna !== 'done')
      .filter((t) => {
        const d = new Date(t.fecha_vencimiento! + 'T00:00:00');
        return d >= hoy && d <= en7;
      })
      .sort((a, b) => (a.fecha_vencimiento! > b.fecha_vencimiento! ? 1 : -1))
      .slice(0, 5);
  }, [todasLasTareas]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 dark:text-slate-500 text-sm">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
          Hola, {usuario?.nombre.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
          {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Link to="/areas" className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
              <IconBuilding size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Áreas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{areas.length}</p>
        </Link>

        <Link to="/proyectos" className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
              <IconFolder size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Proyectos</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{proyectos.length}</p>
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <IconClipboardList size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Mis pendientes</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{misTareasPendientes.length}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <IconFlag size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sprints activos</span>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{sprintsActivos}</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* Mis tareas — 2 columnas */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
              <IconClipboardList size={16} className="text-amber-500" />
              Mis tareas asignadas
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">{misTareasPendientes.length} pendiente{misTareasPendientes.length !== 1 ? 's' : ''}</span>
          </div>

          {misTareasPendientes.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <IconCircleCheck size={36} className="text-green-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">¡Al día! No tienes tareas pendientes asignadas.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50 max-h-72 overflow-y-auto">
              {misTareasPendientes.slice(0, 10).map((tarea) => {
                const pCfg = PRIORIDAD_CONFIG[tarea.prioridad];
                return (
                  <button
                    key={tarea.id}
                    onClick={() => navigate(`/proyectos/${tarea.proyecto_id}`)}
                    className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pCfg?.dot ?? 'bg-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{tarea.titulo}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{proyectoNombre[tarea.proyecto_id] ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${pCfg?.color ?? ''}`}>
                        {pCfg?.label}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                        {COLUMNA_LABEL[tarea.columna]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribución de tareas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
              <IconChartBar size={16} className="text-indigo-500" />
              Tareas por estado
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{todasLasTareas.length} total</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {distribucion.map(({ col, label, count, pct }) => (
              <div key={col}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{label}</span>
                  <span className="text-slate-400 dark:text-slate-500">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${COLUMNA_COLOR[col]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
            {todasLasTareas.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Sin tareas registradas</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Progreso de proyectos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
              <IconTrendingUp size={16} className="text-emerald-500" />
              Progreso de proyectos
            </h2>
            <Link to="/proyectos" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              Ver todos <IconArrowRight size={12} />
            </Link>
          </div>
          {resumenProyectos.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <IconFolder size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Sin proyectos todavía</p>
              <Link to="/proyectos" className="mt-3 inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Crear proyecto →</Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {resumenProyectos.map(({ proyecto, total, completadas, pct }) => (
                <button
                  key={proyecto.id}
                  onClick={() => navigate(`/proyectos/${proyecto.id}`)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{proyecto.nombre}</span>
                      {proyecto.sprint_activo_id && (
                        <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium flex-shrink-0">
                          Sprint activo
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">{completadas}/{total}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Próximas a vencer / Empty state */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
              <IconAlertTriangle size={16} className="text-amber-500" />
              Vencen en los próximos 7 días
            </h2>
          </div>
          {proximasVencer.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <IconClock size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {todasLasTareas.some((t) => t.fecha_vencimiento)
                  ? 'No hay vencimientos en los próximos 7 días'
                  : 'Las tareas con fecha límite aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {proximasVencer.map((tarea) => {
                const fecha = new Date(tarea.fecha_vencimiento! + 'T00:00:00');
                const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
                const diff = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
                const urgente = diff <= 1;
                return (
                  <button
                    key={tarea.id}
                    onClick={() => navigate(`/proyectos/${tarea.proyecto_id}`)}
                    className="w-full text-left px-5 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <IconLayoutKanban size={14} className={`mt-0.5 flex-shrink-0 ${urgente ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-medium">{tarea.titulo}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{proyectoNombre[tarea.proyecto_id] ?? '—'}</p>
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 px-2 py-0.5 rounded-full ${
                      urgente ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : `${diff} días`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Empty state — sin áreas */}
      {areas.length === 0 && (
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
          <IconBuilding size={40} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Comienza creando un área</h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
            Las áreas organizan a tu equipo. Cada área tiene su propio canal de chat.
          </p>
          <Link to="/areas" className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
            Crear primera área
          </Link>
        </div>
      )}
    </div>
  );
}
