import { useState, useEffect, useMemo, useRef } from 'react';
import {
  IconChevronLeft, IconChevronRight, IconClock, IconCheck,
  IconX, IconExternalLink,
} from '@tabler/icons-react';
import { tareasApi, mensajeError } from '../../services/api';
import type { Usuario, ActividadMensual, SprintActividad, EntradaHoraActividad, TareaCompletadaActividad } from '../../interfaces';

interface ReporteCalendarioProps {
  proyectoId: string;
  miembros: Usuario[];
  onAbrirTarea: (tareaId: string) => void;
}

interface DatoDia {
  horas: number;
  entradas: EntradaHoraActividad[];
  completadas: TareaCompletadaActividad[];
}

interface PopoverInfo {
  fecha: string;
  miembro: Usuario;
  datos: DatoDia;
  rect: DOMRect;
}

const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function colorCelda(horas: number): string {
  if (horas === 0) return '';
  if (horas <= 2)  return 'bg-blue-100 text-blue-700';
  if (horas <= 4)  return 'bg-blue-300 text-blue-900';
  if (horas <= 6)  return 'bg-blue-500 text-white';
  return 'bg-blue-700 text-white';
}

function sprintEnFecha(fecha: string, sprints: SprintActividad[]): SprintActividad | undefined {
  return sprints.find((s) => fecha >= s.fecha_inicio && fecha <= s.fecha_fin);
}

function formatFecha(f: string): string {
  const [y, m, d] = f.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function ReporteCalendario({ proyectoId, miembros, onAbrirTarea }: ReporteCalendarioProps) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [actividad, setActividad] = useState<ActividadMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [popover, setPopover] = useState<PopoverInfo | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCargando(true);
    tareasApi.actividad(proyectoId, anio, mes)
      .then(({ data }) => setActividad(data))
      .catch((err) => console.error(mensajeError(err)))
      .finally(() => setCargando(false));
  }, [proyectoId, anio, mes]);

  // Cerrar popover al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const irMesAnterior = () => {
    if (mes === 1) { setMes(12); setAnio((a) => a - 1); }
    else setMes((m) => m - 1);
  };

  const irMesSiguiente = () => {
    if (mes === 12) { setMes(1); setAnio((a) => a + 1); }
    else setMes((m) => m + 1);
  };

  const diasDelMes = useMemo(() => {
    const total = new Date(anio, mes, 0).getDate();
    return Array.from({ length: total }, (_, i) => {
      const num = i + 1;
      const fechaStr = `${anio}-${String(mes).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
      const diaSemana = new Date(anio, mes - 1, num).getDay();
      return { num, fechaStr, diaSemana };
    });
  }, [anio, mes]);

  // Índice: uid → fecha → DatoDia
  const indiceActividad = useMemo(() => {
    const mapa = new Map<string, Map<string, DatoDia>>();
    if (!actividad) return mapa;

    for (const miembro of miembros) {
      const porFecha = new Map<string, DatoDia>();

      for (const h of actividad.horas.filter((e) => e.usuario_id === miembro.id)) {
        const d = porFecha.get(h.fecha) ?? { horas: 0, entradas: [], completadas: [] };
        d.horas += h.horas;
        d.entradas.push(h);
        porFecha.set(h.fecha, d);
      }

      for (const c of actividad.completadas.filter((e) => e.usuario_id === miembro.id)) {
        const d = porFecha.get(c.fecha) ?? { horas: 0, entradas: [], completadas: [] };
        d.completadas.push(c);
        porFecha.set(c.fecha, d);
      }

      mapa.set(miembro.id, porFecha);
    }
    return mapa;
  }, [actividad, miembros]);

  const totalesPorDia = useMemo(() => {
    const totales = new Map<string, number>();
    if (!actividad) return totales;
    for (const h of actividad.horas) {
      totales.set(h.fecha, (totales.get(h.fecha) ?? 0) + h.horas);
    }
    return totales;
  }, [actividad]);

  const totalMiembro = (uid: string) => {
    let sum = 0;
    indiceActividad.get(uid)?.forEach((v) => { sum += v.horas; });
    return Math.round(sum * 10) / 10;
  };

  const abrirPopover = (e: React.MouseEvent<HTMLDivElement>, miembro: Usuario, fechaStr: string, datos: DatoDia) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ fecha: fechaStr, miembro, datos, rect });
  };

  if (cargando) {
    return <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Cargando actividad...</div>;
  }

  const sprints = actividad?.sprints ?? [];

  return (
    <div className="p-4 md:p-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-800">{MESES[mes - 1]} {anio}</h2>
        <div className="flex items-center gap-1">
          <button onClick={irMesAnterior} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
            <IconChevronLeft size={18} />
          </button>
          <button
            onClick={() => { setAnio(hoy.getFullYear()); setMes(hoy.getMonth() + 1); }}
            className="px-2.5 py-1 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium"
          >
            Hoy
          </button>
          <button onClick={irMesSiguiente} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Leyenda sprints */}
      {sprints.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {sprints.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs">
              <span className={`w-3 h-3 rounded-sm ${
                s.estado === 'activo' ? 'bg-green-400' : s.estado === 'completado' ? 'bg-blue-400' : 'bg-slate-300'
              }`} />
              <span className="text-slate-600 font-medium">{s.nombre}</span>
              <span className="text-slate-400">{s.fecha_inicio} → {s.fecha_fin}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leyenda horas */}
      <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 flex-wrap">
        <span>Horas:</span>
        {[
          { cls: 'bg-slate-100 border border-slate-200', label: '0' },
          { cls: 'bg-blue-100', label: '1-2h' },
          { cls: 'bg-blue-300', label: '3-4h' },
          { cls: 'bg-blue-500', label: '5-6h' },
          { cls: 'bg-blue-700', label: '7h+' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className={`w-5 h-4 rounded inline-block ${cls}`} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1 ml-2">
          <IconCheck size={12} className="text-green-600" />
          completada
        </span>
        <span className="text-slate-400 ml-2">· Click en celda para ver detalle</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Banda de sprint */}
            {sprints.length > 0 && (
              <tr>
                <th className="sticky left-0 bg-white z-10 border-b border-slate-200 px-3 py-1 text-left text-slate-400 font-normal min-w-[130px]">Sprint</th>
                <th className="border-b border-slate-200 px-1 py-1 min-w-[44px]" />
                {diasDelMes.map(({ num, fechaStr, diaSemana }) => {
                  const sprint = sprintEnFecha(fechaStr, sprints);
                  return (
                    <th key={num} className={`border-b border-slate-200 px-0 py-1 min-w-[28px] ${diaSemana === 0 || diaSemana === 6 ? 'bg-slate-50' : ''}`}>
                      {sprint ? (
                        <div className={`mx-0.5 h-2 rounded-sm ${
                          sprint.estado === 'activo' ? 'bg-green-400' : sprint.estado === 'completado' ? 'bg-blue-400' : 'bg-slate-300'
                        }`} title={sprint.nombre} />
                      ) : <div className="h-2" />}
                    </th>
                  );
                })}
              </tr>
            )}

            {/* Fila de días */}
            <tr className="bg-slate-50">
              <th className="sticky left-0 bg-slate-50 z-10 border-b border-slate-200 px-3 py-2 text-left text-slate-500 font-semibold min-w-[130px]">Miembro</th>
              <th className="border-b border-slate-200 px-2 py-2 text-center text-slate-500 font-semibold min-w-[44px]">Total</th>
              {diasDelMes.map(({ num, diaSemana }) => {
                const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1 && num === hoy.getDate();
                return (
                  <th key={num} className={`border-b border-slate-200 px-0 py-1.5 text-center font-medium min-w-[28px] ${
                    diaSemana === 0 || diaSemana === 6 ? 'bg-slate-100 text-slate-400' : 'text-slate-600'
                  } ${esHoy ? 'bg-indigo-100 text-indigo-700' : ''}`}>
                    <div>{num}</div>
                    <div className="text-[9px] font-normal opacity-60">{DIAS_SEMANA[diaSemana]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {miembros.length === 0 && (
              <tr>
                <td colSpan={diasDelMes.length + 2} className="px-4 py-8 text-center text-slate-400">Sin miembros en el proyecto</td>
              </tr>
            )}
            {miembros.map((miembro, idx) => {
              const porFecha = indiceActividad.get(miembro.id) ?? new Map<string, DatoDia>();
              const totalH = totalMiembro(miembro.id);
              return (
                <tr key={miembro.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className={`sticky left-0 z-10 border-b border-slate-100 px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: '10px' }}>
                        {miembro.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-700 font-medium truncate max-w-[80px]">{miembro.nombre.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2 text-center">
                    <span className={`font-semibold ${totalH > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                      {totalH > 0 ? `${totalH}h` : '—'}
                    </span>
                  </td>
                  {diasDelMes.map(({ num, fechaStr, diaSemana }) => {
                    const dato = porFecha.get(fechaStr);
                    const horas = dato?.horas ?? 0;
                    const completadas = dato?.completadas ?? [];
                    const tieneActividad = horas > 0 || completadas.length > 0;
                    const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1 && num === hoy.getDate();
                    return (
                      <td key={num} className={`border-b border-slate-100 p-0.5 ${diaSemana === 0 || diaSemana === 6 ? 'opacity-60' : ''}`}>
                        <div
                          onClick={tieneActividad ? (e) => abrirPopover(e, miembro, fechaStr, dato!) : undefined}
                          className={`relative flex flex-col items-center justify-center rounded h-7 min-w-[24px] transition-all
                            ${tieneActividad ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1' : ''}
                            ${esHoy ? 'ring-1 ring-indigo-300' : ''}
                            ${tieneActividad ? colorCelda(horas) : 'bg-transparent'}
                          `}
                        >
                          {horas > 0 && (
                            <span className="text-[9px] font-semibold leading-none">
                              {horas % 1 === 0 ? horas : horas.toFixed(1)}
                            </span>
                          )}
                          {completadas.length > 0 && (
                            <IconCheck size={8} className={horas > 0 ? 'opacity-80' : 'text-green-600'} />
                          )}
                          {!tieneActividad && (
                            <span className="text-slate-200 text-[9px]">·</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Fila totales por día */}
            {miembros.length > 0 && (
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="sticky left-0 bg-slate-50 z-10 px-3 py-2">
                  <span className="text-slate-500 font-semibold text-xs flex items-center gap-1">
                    <IconClock size={12} /> Total día
                  </span>
                </td>
                <td className="px-2 py-2 text-center text-slate-500 font-semibold text-xs">
                  {[...totalesPorDia.values()].reduce((a, b) => a + b, 0).toFixed(1)}h
                </td>
                {diasDelMes.map(({ num, fechaStr, diaSemana }) => {
                  const total = totalesPorDia.get(fechaStr) ?? 0;
                  return (
                    <td key={num} className={`px-0.5 py-2 text-center text-[10px] font-semibold ${
                      diaSemana === 0 || diaSemana === 6 ? 'text-slate-300' : total > 0 ? 'text-blue-600' : 'text-slate-300'
                    }`}>
                      {total > 0 ? (total % 1 === 0 ? total : total.toFixed(1)) : ''}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Popover de detalle del día */}
      {popover && (
        <div className="fixed inset-0 z-40" onClick={() => setPopover(null)}>
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 bg-white rounded-xl shadow-2xl border border-slate-200 w-72 overflow-hidden"
            style={{
              // Posicionar cerca de la celda sin salirse de la pantalla
              left: Math.min(popover.rect.left + popover.rect.width / 2 - 144, window.innerWidth - 290),
              top: popover.rect.bottom + 8 > window.innerHeight - 200
                ? popover.rect.top - 8
                : popover.rect.bottom + 8,
              transform: popover.rect.bottom + 8 > window.innerHeight - 200 ? 'translateY(-100%)' : 'none',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div>
                <p className="font-semibold text-slate-800 text-sm capitalize">{formatFecha(popover.fecha)}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0" style={{ fontSize: '8px' }}>
                    {popover.miembro.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-500">{popover.miembro.nombre}</span>
                </div>
              </div>
              <button onClick={() => setPopover(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
                <IconX size={16} />
              </button>
            </div>

            {/* Horas registradas */}
            {popover.datos.entradas.length > 0 && (
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <IconClock size={11} className="inline mr-1" />
                  Horas registradas — {popover.datos.horas.toFixed(1)}h total
                </p>
                <div className="space-y-2">
                  {popover.datos.entradas.map((entrada, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => { onAbrirTarea(entrada.tarea_id); setPopover(null); }}
                          className="text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline text-left leading-tight flex items-center gap-1"
                        >
                          {entrada.tarea_titulo}
                          <IconExternalLink size={11} className="flex-shrink-0 opacity-60" />
                        </button>
                        <span className="text-xs font-bold text-blue-600 flex-shrink-0 bg-blue-100 px-1.5 py-0.5 rounded">
                          {entrada.horas}h
                        </span>
                      </div>
                      {entrada.descripcion && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{entrada.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tareas completadas ese día */}
            {popover.datos.completadas.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <IconCheck size={11} className="inline mr-1 text-green-600" />
                  Completadas este día
                </p>
                <div className="space-y-1.5">
                  {popover.datos.completadas.map((c) => (
                    <button
                      key={c.tarea_id}
                      onClick={() => { onAbrirTarea(c.tarea_id); setPopover(null); }}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <IconCheck size={13} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm text-slate-700 hover:text-indigo-700 hover:underline flex-1">{c.titulo}</span>
                      <IconExternalLink size={11} className="text-slate-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
