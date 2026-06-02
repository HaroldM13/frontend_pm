import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconChevronLeft, IconChevronRight, IconPhoto, IconDownload } from '@tabler/icons-react';
import { toast } from 'sonner';
import { evidenciasApi, mensajeError } from '../../services/api';
import type { Evidencia } from '../../interfaces';
import { useConfirm } from '../../context/ConfirmContext';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

interface EvidenciasTabProps {
  tareaId: string;
}

interface LightboxState {
  evidenciaId: string;
  index: number;
}

function esImagen(tipo: string) {
  return tipo.startsWith('image/');
}

export default function EvidenciasTab({ tareaId }: EvidenciasTabProps) {
  const confirmar = useConfirm();
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Estado crear
  const [modalCrear, setModalCrear] = useState(false);
  const [archivosNuevos, setArchivosNuevos] = useState<File[]>([]);
  const [comentarioNuevo, setComentarioNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Estado editar
  const [editando, setEditando] = useState<Evidencia | null>(null);
  const [comentarioEdit, setComentarioEdit] = useState('');
  const [archivosAgregar, setArchivosAgregar] = useState<File[]>([]);
  const [indicesEliminar, setIndicesEliminar] = useState<number[]>([]);
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const inputFileEditRef = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    try {
      const { data } = await evidenciasApi.listar(tareaId);
      setEvidencias(data);
    } catch {
      // silencio
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [tareaId]);

  const crearEvidencia = async () => {
    if (archivosNuevos.length === 0 && !comentarioNuevo.trim()) {
      setErrorCrear('Agrega al menos un archivo o un comentario');
      return;
    }
    setErrorCrear('');
    setGuardando(true);
    try {
      const { data } = await evidenciasApi.crear(tareaId, archivosNuevos, comentarioNuevo.trim());
      setEvidencias((prev) => [...prev, data]);
      setModalCrear(false);
      setArchivosNuevos([]);
      setComentarioNuevo('');
    } catch (err) {
      setErrorCrear(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const eliminarEvidencia = async (id: string) => {
    const ok = await confirmar({
      titulo: '¿Eliminar esta evidencia?',
      descripcion: 'Se eliminarán todos sus archivos adjuntos.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    try {
      await evidenciasApi.eliminar(id);
      setEvidencias((prev) => prev.filter((e) => e.id !== id));
      toast.success('Evidencia eliminada');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const abrirEditar = (ev: Evidencia) => {
    setEditando(ev);
    setComentarioEdit(ev.comentario);
    setArchivosAgregar([]);
    setIndicesEliminar([]);
  };

  const guardarEditar = async () => {
    if (!editando) return;
    setGuardandoEdit(true);
    try {
      const { data } = await evidenciasApi.actualizar(editando.id, {
        comentario: comentarioEdit,
        nuevosArchivos: archivosAgregar,
        indicesEliminar,
      });
      setEvidencias((prev) => prev.map((e) => e.id === data.id ? data : e));
      setEditando(null);
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setGuardandoEdit(false);
    }
  };

  const toggleIndiceEliminar = (idx: number) => {
    setIndicesEliminar((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Lightbox navigation
  const lightboxEv = lightbox ? evidencias.find((e) => e.id === lightbox.evidenciaId) : null;
  const lightboxUrls = lightboxEv?.urls ?? [];
  const lightboxNombres = lightboxEv?.nombres ?? [];
  const lightboxTipos = lightboxEv?.tipos ?? [];

  const navLightbox = (dir: 1 | -1) => {
    if (!lightbox) return;
    const total = lightboxUrls.length;
    setLightbox({ ...lightbox, index: (lightbox.index + dir + total) % total });
  };

  if (cargando) {
    return <div className="py-10 text-center text-slate-400 text-sm">Cargando evidencias...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Botón crear */}
      <button
        onClick={() => setModalCrear(true)}
        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <IconPlus size={15} />
        Agregar evidencia
      </button>

      {/* Lista de evidencias */}
      {evidencias.length === 0 ? (
        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
          <IconPhoto size={32} className="mx-auto mb-2 opacity-40" />
          Sin evidencias todavía
        </div>
      ) : (
        <div className="space-y-4">
          {evidencias.map((ev) => (
            <div key={ev.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">{ev.nombre_usuario} · {new Date(ev.created_at).toLocaleDateString('es')}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => abrirEditar(ev)} className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"><IconEdit size={13} /></button>
                  <button onClick={() => eliminarEvidencia(ev.id)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"><IconTrash size={13} /></button>
                </div>
              </div>

              {/* Archivos */}
              {ev.urls.length > 0 && (
                <div className="p-3 flex flex-wrap gap-2">
                  {ev.urls.map((url, i) => (
                    <div key={i} className="relative group">
                      {esImagen(ev.tipos[i] ?? '') ? (
                        <button onClick={() => setLightbox({ evidenciaId: ev.id, index: i })}>
                          <img
                            src={`${BASE_URL}${url}`}
                            alt={ev.nombres[i] ?? ''}
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600 hover:opacity-90 transition-opacity"
                          />
                        </button>
                      ) : (
                        <a
                          href={`${BASE_URL}${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors p-2"
                        >
                          <IconDownload size={18} className="text-slate-500 mb-1" />
                          <span className="text-[10px] text-slate-500 text-center truncate w-full">{ev.nombres[i]}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Comentario */}
              {ev.comentario && (
                <div className="px-3 pb-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{ev.comentario}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Nueva evidencia</h3>
              <button onClick={() => { setModalCrear(false); setArchivosNuevos([]); setComentarioNuevo(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><IconX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <button
                  type="button"
                  onClick={() => inputFileRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
                >
                  <IconPhoto size={16} />
                  Seleccionar imágenes o archivos
                </button>
                <input
                  ref={inputFileRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setArchivosNuevos((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
                {archivosNuevos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {archivosNuevos.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                        {f.name}
                        <button onClick={() => setArchivosNuevos((prev) => prev.filter((_, j) => j !== i))}><IconX size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Comentario</label>
                <textarea
                  value={comentarioNuevo}
                  onChange={(e) => setComentarioNuevo(e.target.value)}
                  rows={3}
                  placeholder="Describe qué muestran estas evidencias..."
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
              {errorCrear && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-lg">{errorCrear}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setModalCrear(false); setArchivosNuevos([]); setComentarioNuevo(''); }} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
                <button onClick={crearEvidencia} disabled={guardando} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg">
                  {guardando ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Editar evidencia</h3>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><IconX size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Imágenes actuales con opción de eliminar */}
              {editando.urls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Archivos actuales</p>
                  <div className="flex flex-wrap gap-2">
                    {editando.urls.map((url, i) => (
                      <div key={i} className={`relative ${indicesEliminar.includes(i) ? 'opacity-40' : ''}`}>
                        {esImagen(editando.tipos[i] ?? '') ? (
                          <img src={`${BASE_URL}${url}`} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center">
                            <span className="text-[9px] text-slate-500 text-center px-1 truncate">{editando.nombres[i]}</span>
                          </div>
                        )}
                        <button
                          onClick={() => toggleIndiceEliminar(i)}
                          className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${indicesEliminar.includes(i) ? 'bg-slate-400' : 'bg-red-500 hover:bg-red-600'}`}
                        >
                          <IconX size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {indicesEliminar.length > 0 && <p className="text-xs text-red-500 mt-1">{indicesEliminar.length} archivo(s) se eliminarán al guardar</p>}
                </div>
              )}
              {/* Nuevos archivos */}
              <div>
                <button
                  type="button"
                  onClick={() => inputFileEditRef.current?.click()}
                  className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
                >
                  <IconPlus size={14} />
                  Agregar más archivos
                </button>
                <input
                  ref={inputFileEditRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setArchivosAgregar((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
                {archivosAgregar.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {archivosAgregar.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                        {f.name}
                        <button onClick={() => setArchivosAgregar((prev) => prev.filter((_, j) => j !== i))}><IconX size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Comentario */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Comentario</label>
                <textarea
                  value={comentarioEdit}
                  onChange={(e) => setComentarioEdit(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <button onClick={() => setEditando(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={guardarEditar} disabled={guardandoEdit} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg">
                {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && lightboxUrls.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70]"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <IconX size={22} />
          </button>

          {lightboxUrls.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navLightbox(-1); }}
                className="absolute left-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <IconChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navLightbox(1); }}
                className="absolute right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <IconChevronRight size={28} />
              </button>
            </>
          )}

          <div className="max-w-4xl max-h-[80vh] px-16" onClick={(e) => e.stopPropagation()}>
            {esImagen(lightboxTipos[lightbox.index] ?? '') ? (
              <img
                src={`${BASE_URL}${lightboxUrls[lightbox.index]}`}
                alt={lightboxNombres[lightbox.index] ?? ''}
                className="max-h-[80vh] max-w-full object-contain rounded-lg"
              />
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-700 dark:text-slate-200 mb-4">{lightboxNombres[lightbox.index]}</p>
                <a
                  href={`${BASE_URL}${lightboxUrls[lightbox.index]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm mx-auto w-fit"
                >
                  <IconDownload size={15} />
                  Descargar
                </a>
              </div>
            )}
            {lightboxUrls.length > 1 && (
              <p className="text-center text-white/50 text-sm mt-3">{lightbox.index + 1} / {lightboxUrls.length}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
