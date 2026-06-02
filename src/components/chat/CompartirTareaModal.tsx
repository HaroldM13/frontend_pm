import { useState, useEffect } from 'react';
import { IconX, IconShare2, IconLayoutKanban } from '@tabler/icons-react';
import { chatApi, mensajeError } from '../../services/api';
import type { Tarea, SalaChat, Usuario } from '../../interfaces';

interface CompartirTareaModalProps {
  tarea: Tarea;
  onCerrar: () => void;
}

const COLUMNAS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Por hacer',
  in_progress: 'En progreso',
  review: 'En revisión',
  done: 'Completada',
};

const PRIORIDAD_COLORS: Record<string, string> = {
  critica: 'bg-red-100 text-red-700',
  alta: 'bg-orange-100 text-orange-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-green-100 text-green-700',
};

export default function CompartirTareaModal({ tarea, onCerrar }: CompartirTareaModalProps) {
  const [salas, setSalas] = useState<SalaChat[]>([]);
  const [salaId, setSalaId] = useState('');
  const [comentario, setComentario] = useState('');
  const [miembros, setMiembros] = useState<Usuario[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  // Cargar salas al abrir
  useEffect(() => {
    chatApi.listarSalas()
      .then(({ data }) => {
        setSalas(data);
        if (data.length > 0) setSalaId(data[0].id);
      })
      .catch(() => {});
  }, []);

  // Cargar miembros cuando cambia la sala
  useEffect(() => {
    if (!salaId) { setMiembros([]); return; }
    chatApi.miembrosDeUnaSala(salaId)
      .then(({ data }) => setMiembros(data))
      .catch(() => setMiembros([]));
  }, [salaId]);

  const toggleMencion = (id: string) => {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const nombreSala = (sala: SalaChat) => {
    if (sala.tipo === 'directo') return sala.nombre;
    return `#${sala.nombre}`;
  };

  const enviar = async () => {
    if (!salaId) return;
    setError('');
    setEnviando(true);
    try {
      await chatApi.compartirTarea(salaId, {
        tarea_id: tarea.id,
        tarea_titulo: tarea.titulo,
        tarea_columna: tarea.columna,
        tarea_prioridad: tarea.prioridad,
        tarea_proyecto_id: tarea.proyecto_id,
        comentario: comentario.trim() || undefined,
        menciones: seleccionados,
      });
      setOk(true);
      setTimeout(() => onCerrar(), 1000);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[60] md:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-xl p-5 w-full md:max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconShare2 size={18} className="text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Compartir tarea</h2>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <IconX size={20} />
          </button>
        </div>

        {/* Vista previa de la tarea */}
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <IconLayoutKanban size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 truncate">{tarea.titulo}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-indigo-600 dark:text-indigo-300 bg-white dark:bg-indigo-900 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-600">
                  {COLUMNAS_LABELS[tarea.columna] ?? tarea.columna}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORIDAD_COLORS[tarea.prioridad] ?? ''}`}>
                  {tarea.prioridad}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Selector de sala */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Enviar a
            </label>
            <select
              value={salaId}
              onChange={(e) => { setSalaId(e.target.value); setSeleccionados([]); }}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            >
              {salas.length === 0 && <option value="">Sin salas disponibles</option>}
              {salas.map((s) => (
                <option key={s.id} value={s.id}>{nombreSala(s)}</option>
              ))}
            </select>
          </div>

          {/* Etiquetar miembros */}
          {miembros.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Etiquetar miembros
              </label>
              <div className="flex flex-wrap gap-2">
                {miembros.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMencion(m.id)}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      seleccionados.includes(m.id)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center font-bold text-[9px]">
                      {m.nombre.charAt(0).toUpperCase()}
                    </span>
                    {m.nombre.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comentario */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
              Comentario (opcional)
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder="ej: Tienes hasta el viernes para entregar esta tarea..."
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}

          {ok && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              ¡Tarea compartida exitosamente!
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={enviar}
              disabled={!salaId || enviando || ok}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <IconShare2 size={15} />
              {enviando ? 'Enviando...' : 'Compartir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
