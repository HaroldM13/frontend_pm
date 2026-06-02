import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  IconArrowLeft, IconUsers, IconPlus, IconX, IconChartBar, IconLayoutKanban,
  IconFlag, IconClock, IconTag, IconInbox,
} from '@tabler/icons-react';
import { proyectosApi, areasApi, usuariosApi, tareasApi, mensajeError } from '../services/api';
import type { Proyecto, Area, Usuario, Tarea, ColumnaCustom } from '../interfaces';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/kanban/KanbanBoard';
import FloatingChat from '../components/chat/FloatingChat';
import SprintPanel from '../components/proyecto/SprintPanel';
import EpicasPanel from '../components/proyecto/EpicasPanel';
import BacklogPanel from '../components/proyecto/BacklogPanel';
import ReporteCalendario from '../components/proyecto/ReporteCalendario';
import ModalTarea from '../components/kanban/ModalTarea';

type Pestaña = 'tablero' | 'backlog' | 'resumen' | 'reporte' | 'sprints' | 'epicas';

const COLUMNAS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'En revisión',
  done: 'Completada',
};

const COLUMNAS_ORDEN: string[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

export default function ProyectoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();

  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [miembros, setMiembros] = useState<Usuario[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [pestañaActiva, setPestañaActiva] = useState<Pestaña>('tablero');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Modal de tarea abierto desde el reporte (para ver/editar sin ir al tablero)
  const [tareaModalAbierta, setTareaModalAbierta] = useState<Tarea | null>(null);
  const [mostrarModalTarea, setMostrarModalTarea] = useState(false);
  const [columnaParaNuevaTarea, setColumnaParaNuevaTarea] = useState<string>('backlog');

  const abrirTareaDesdeReporte = (tareaId: string) => {
    const tarea = tareas.find((t) => t.id === tareaId);
    if (tarea) { setTareaModalAbierta(tarea); setMostrarModalTarea(true); }
  };

  const abrirModalNuevaTareaBacklog = () => {
    setColumnaParaNuevaTarea('backlog');
    setTareaModalAbierta(null);
    setMostrarModalTarea(true);
  };

  const cerrarModalTarea = () => {
    setMostrarModalTarea(false);
    setTareaModalAbierta(null);
  };

  // Modal agregar miembro
  const [modalMiembro, setModalMiembro] = useState(false);
  const [emailMiembro, setEmailMiembro] = useState('');
  const [agregandoMiembro, setAgregandoMiembro] = useState(false);
  const [errorMiembro, setErrorMiembro] = useState('');

  useEffect(() => {
    if (!id) return;
    const cargar = async () => {
      try {
        const { data: proy } = await proyectosApi.obtener(id);
        setProyecto(proy);

        // Usar allSettled para que un área inaccesible no rompa todo el proyecto
        const [resArea, resUsuarios, resTareas] = await Promise.allSettled([
          areasApi.obtener(proy.area_id),
          usuariosApi.listar(),
          tareasApi.listarPorProyecto(id),
        ]);

        if (resArea.status === 'fulfilled') setArea(resArea.value.data);

        const usuariosData = resUsuarios.status === 'fulfilled' ? resUsuarios.value.data : [];
        setMiembros(usuariosData.filter((u) => proy.miembros.includes(u.id)));

        const tareasData = resTareas.status === 'fulfilled' ? resTareas.value.data : [];
        setTareas(tareasData);

        // Abrir tarea si viene desde el chat (location.state.abrirTareaId)
        const state = location.state as { abrirTareaId?: string } | null;
        if (state?.abrirTareaId) {
          const tarea = tareasData.find((t) => t.id === state.abrirTareaId);
          if (tarea) setTareaModalAbierta(tarea);
          // Limpiar el state para que no re-abra al refrescar
          navigate(location.pathname, { replace: true, state: null });
        }
      } catch (err) {
        setError(mensajeError(err));
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id]);

  const agregarMiembro = async () => {
    if (!id || !emailMiembro.trim()) return;
    setErrorMiembro('');
    setAgregandoMiembro(true);
    try {
      const { data: proyActualizado } = await proyectosApi.agregarMiembro(id, emailMiembro.trim());
      setProyecto(proyActualizado);
      // Recargar miembros
      const { data: todos } = await usuariosApi.listar();
      setMiembros(todos.filter((u) => proyActualizado.miembros.includes(u.id)));
      setEmailMiembro('');
      setModalMiembro(false);
    } catch (err) {
      setErrorMiembro(mensajeError(err));
    } finally {
      setAgregandoMiembro(false);
    }
  };

  // ── Cálculos para Resumen ──────────────────────────────────────────────────

  const resumen = useMemo(() => {
    const colsCustomLabels: Record<string, string> = {};
    (proyecto?.columnas_custom ?? []).forEach((c) => { colsCustomLabels[c.id] = c.nombre; });
    const todasColumnas = [
      ...COLUMNAS_ORDEN,
      ...(proyecto?.columnas_custom ?? []).map((c) => c.id),
    ];
    const porColumna = todasColumnas.map((col) => ({
      columna: col,
      label: COLUMNAS_LABELS[col] ?? colsCustomLabels[col] ?? col,
      count: tareas.filter((t) => t.columna === col).length,
    }));
    const totalHorasEstimadas = tareas.reduce((s, t) => s + t.horas_estimadas, 0);
    const totalHorasRegistradas = tareas.reduce((s, t) => s + t.horas_registradas, 0);
    const completadas = tareas.filter((t) => t.columna === 'done').length;
    const porcentaje = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0;
    return { porColumna, totalHorasEstimadas, totalHorasRegistradas, completadas, porcentaje };
  }, [tareas]);


  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">Cargando...</div>
    );
  }

  if (error || !proyecto) {
    return (
      <div className="p-8 text-center text-red-500">{error || 'Proyecto no encontrado'}</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header del proyecto */}
      <div className="px-4 md:px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/proyectos')}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <IconArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">{proyecto.nombre}</h1>
            <p className="text-xs text-slate-400">
              {area?.nombre} · {tareas.length} tarea{tareas.length !== 1 ? 's' : ''}
            </p>
          </div>
          {proyecto.creador_id === usuario?.id && (
            <button
              onClick={() => setModalMiembro(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <IconPlus size={14} />
              <span className="hidden sm:inline">Miembro</span>
            </button>
          )}
        </div>

        {/* Avatares de miembros */}
        {miembros.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <IconUsers size={13} className="text-slate-400" />
            <div className="flex -space-x-1.5 ml-1">
              {miembros.slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  title={m.nombre}
                  className="w-6 h-6 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                >
                  {m.nombre.charAt(0).toUpperCase()}
                </div>
              ))}
              {miembros.length > 6 && (
                <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-slate-600 text-[10px] font-bold">
                  +{miembros.length - 6}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pestañas */}
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'tablero', label: 'Tablero',  icon: IconLayoutKanban },
            { key: 'backlog', label: 'Backlog',  icon: IconInbox },
            { key: 'sprints', label: 'Sprints',  icon: IconFlag },
            { key: 'epicas',  label: 'Épicas',   icon: IconTag },
            { key: 'resumen', label: 'Resumen',  icon: IconChartBar },
            { key: 'reporte', label: 'Reporte',  icon: IconClock },
          ] as { key: Pestaña; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPestañaActiva(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pestañaActiva === key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="flex-1 overflow-auto">
        {pestañaActiva === 'tablero' && (
          <div className="p-4 md:p-6">
            <KanbanBoard
              proyectoId={proyecto.id}
              tareas={tareas}
              miembros={miembros}
              columnasCustom={proyecto.columnas_custom ?? []}
              onTareasChange={setTareas}
              onColumnasChange={(cols: ColumnaCustom[]) => setProyecto((p) => p ? { ...p, columnas_custom: cols } : p)}
            />
          </div>
        )}

        {pestañaActiva === 'resumen' && (
          <div className="p-4 md:p-6">
            {/* Progreso general */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <h3 className="font-semibold text-slate-700 mb-4">Progreso general</h3>
              <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                <span>{resumen.completadas} de {tareas.length} tareas completadas</span>
                <span className="font-semibold text-slate-700">{resumen.porcentaje}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${resumen.porcentaje}%` }}
                />
              </div>
            </div>

            {/* Tareas por columna */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <IconLayoutKanban size={16} className="text-indigo-500" />
                Tareas por estado
              </h3>
              <div className="space-y-3">
                {resumen.porColumna.map(({ columna, label, count }) => (
                  <div key={columna} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-28 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: tareas.length > 0 ? `${(count / tareas.length) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Horas */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <IconClock size={16} className="text-amber-500" />
                Horas del proyecto
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{resumen.totalHorasEstimadas}h</p>
                  <p className="text-xs text-blue-500 mt-1">Estimadas</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{resumen.totalHorasRegistradas}h</p>
                  <p className="text-xs text-green-500 mt-1">Registradas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {pestañaActiva === 'backlog' && (
          <BacklogPanel
            proyectoId={proyecto.id}
            tareas={tareas}
            epicas={[]}
            onTareasChange={setTareas}
            onAbrirTarea={abrirTareaDesdeReporte}
            onCrearTarea={abrirModalNuevaTareaBacklog}
          />
        )}

        {pestañaActiva === 'sprints' && (
          <SprintPanel
            proyectoId={proyecto.id}
            tareas={tareas}
            onAbrirTarea={abrirTareaDesdeReporte}
          />
        )}

        {pestañaActiva === 'epicas' && (
          <EpicasPanel
            proyectoId={proyecto.id}
            tareas={tareas}
            onAbrirTarea={abrirTareaDesdeReporte}
          />
        )}

        {pestañaActiva === 'reporte' && (
          <ReporteCalendario
            proyectoId={proyecto.id}
            miembros={miembros}
            onAbrirTarea={abrirTareaDesdeReporte}
          />
        )}
      </div>

      {/* Chat flotante — solo si el proyecto tiene sala */}
      {proyecto.chat_grupo_id && (
        <FloatingChat salaId={proyecto.chat_grupo_id} nombreSala={`# ${proyecto.nombre}`} />
      )}

      {/* Modal agregar miembro */}
      {modalMiembro && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-6 w-full md:max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Agregar miembro</h2>
              <button onClick={() => { setModalMiembro(false); setErrorMiembro(''); }} className="text-slate-400 hover:text-slate-600">
                <IconX size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email del usuario</label>
                <input
                  type="email"
                  value={emailMiembro}
                  onChange={(e) => setEmailMiembro(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && agregarMiembro()}
                  placeholder="correo@ejemplo.com"
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {errorMiembro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{errorMiembro}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setModalMiembro(false); setErrorMiembro(''); }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={agregarMiembro}
                  disabled={!emailMiembro.trim() || agregandoMiembro}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {agregandoMiembro ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de tarea — edición o creación desde backlog/reporte/sprints/épicas */}
      {mostrarModalTarea && (
        <ModalTarea
          proyectoId={proyecto.id}
          tarea={tareaModalAbierta}
          columnaInicial={columnaParaNuevaTarea}
          miembros={miembros}
          onGuardar={(tareaActualizada) => {
            setTareas((prev) => {
              const existe = prev.some((t) => t.id === tareaActualizada.id);
              return existe
                ? prev.map((t) => t.id === tareaActualizada.id ? tareaActualizada : t)
                : [tareaActualizada, ...prev];
            });
            cerrarModalTarea();
          }}
          onEliminar={(tareaId) => {
            setTareas((prev) => prev.filter((t) => t.id !== tareaId));
            cerrarModalTarea();
          }}
          onCerrar={cerrarModalTarea}
        />
      )}
    </div>
  );
}
