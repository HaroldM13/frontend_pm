import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconCheck, IconListCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import { checklistsApi, mensajeError } from '../../services/api';
import type { Checklist, ChecklistItem } from '../../interfaces';
import { useConfirm } from '../../context/ConfirmContext';

interface ChecklistTabProps {
  tareaId: string;
}

export default function ChecklistTab({ tareaId }: ChecklistTabProps) {
  const confirmar = useConfirm();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [cargando, setCargando] = useState(true);

  // Crear
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [creando, setCreando] = useState(false);
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  // Renombrar checklist
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [nombreRename, setNombreRename] = useState('');

  // Nuevo ítem por checklist
  const [textoNuevoItem, setTextoNuevoItem] = useState<Record<string, string>>({});

  const cargar = async () => {
    try {
      const { data } = await checklistsApi.listar(tareaId);
      setChecklists(data);
    } catch {
      // silencio
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [tareaId]);

  const crearChecklist = async () => {
    if (!nombreNuevo.trim()) return;
    setGuardandoCrear(true);
    try {
      const { data } = await checklistsApi.crear(tareaId, nombreNuevo.trim());
      setChecklists((prev) => [...prev, data]);
      setNombreNuevo('');
      setCreando(false);
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setGuardandoCrear(false);
    }
  };

  const eliminarChecklist = async (id: string) => {
    const ok = await confirmar({
      titulo: '¿Eliminar este checklist?',
      descripcion: 'Se eliminarán todos sus ítems.',
      labelConfirmar: 'Eliminar',
      tipo: 'peligro',
    });
    if (!ok) return;
    try {
      await checklistsApi.eliminar(id);
      setChecklists((prev) => prev.filter((c) => c.id !== id));
      toast.success('Checklist eliminado');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const renombrarChecklist = async (cl: Checklist) => {
    if (!nombreRename.trim() || nombreRename === cl.nombre) { setRenombrando(null); return; }
    try {
      const { data } = await checklistsApi.actualizar(cl.id, { nombre: nombreRename.trim() });
      setChecklists((prev) => prev.map((c) => c.id === data.id ? data : c));
      setRenombrando(null);
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const toggleItem = async (cl: Checklist, itemId: string) => {
    const nuevosItems = cl.items.map((it) =>
      it.id === itemId ? { ...it, completado: !it.completado } : it
    );
    setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: nuevosItems } : c));
    try {
      await checklistsApi.actualizar(cl.id, { items: nuevosItems });
    } catch (err) {
      toast.error(mensajeError(err));
      setChecklists((prev) => prev.map((c) => c.id === cl.id ? cl : c));
    }
  };

  const agregarItem = async (cl: Checklist) => {
    const texto = (textoNuevoItem[cl.id] ?? '').trim();
    if (!texto) return;
    const nuevosItems: ChecklistItem[] = [
      ...cl.items,
      { id: `tmp_${Date.now()}`, texto, completado: false },
    ];
    try {
      const { data } = await checklistsApi.actualizar(cl.id, { items: nuevosItems });
      setChecklists((prev) => prev.map((c) => c.id === data.id ? data : c));
      setTextoNuevoItem((prev) => ({ ...prev, [cl.id]: '' }));
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const eliminarItem = async (cl: Checklist, itemId: string) => {
    const nuevosItems = cl.items.filter((it) => it.id !== itemId);
    try {
      const { data } = await checklistsApi.actualizar(cl.id, { items: nuevosItems });
      setChecklists((prev) => prev.map((c) => c.id === data.id ? data : c));
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  if (cargando) {
    return <div className="py-10 text-center text-slate-400 text-sm">Cargando checklists...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Botón crear */}
      {!creando ? (
        <button
          onClick={() => setCreando(true)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <IconPlus size={15} />
          Nuevo checklist
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') crearChecklist(); if (e.key === 'Escape') setCreando(false); }}
            placeholder="Nombre del checklist..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100"
          />
          <button onClick={crearChecklist} disabled={!nombreNuevo.trim() || guardandoCrear}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg">
            {guardandoCrear ? '...' : 'Crear'}
          </button>
          <button onClick={() => setCreando(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <IconX size={16} />
          </button>
        </div>
      )}

      {checklists.length === 0 && !creando && (
        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
          <IconListCheck size={32} className="mx-auto mb-2 opacity-40" />
          Sin checklists todavía
        </div>
      )}

      {/* Checklists */}
      {checklists.map((cl) => {
        const completados = cl.items.filter((it) => it.completado).length;
        const pct = cl.items.length > 0 ? Math.round((completados / cl.items.length) * 100) : 0;

        return (
          <div key={cl.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800">
              {renombrando === cl.id ? (
                <input
                  autoFocus
                  type="text"
                  value={nombreRename}
                  onChange={(e) => setNombreRename(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') renombrarChecklist(cl); if (e.key === 'Escape') setRenombrando(null); }}
                  onBlur={() => renombrarChecklist(cl)}
                  className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{cl.nombre}</p>
                  {cl.items.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden max-w-[120px]">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{completados}/{cl.items.length}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => { setRenombrando(cl.id); setNombreRename(cl.nombre); }}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                >
                  <IconEdit size={13} />
                </button>
                <button
                  onClick={() => eliminarChecklist(cl.id)}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="px-4 py-2 space-y-1">
              {cl.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 group py-1">
                  <button
                    onClick={() => toggleItem(cl, item.id)}
                    className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      item.completado
                        ? 'bg-green-500 border-green-500'
                        : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
                    }`}
                  >
                    {item.completado && <IconCheck size={10} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={`flex-1 text-sm transition-colors ${item.completado ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {item.texto}
                  </span>
                  <button
                    onClick={() => eliminarItem(cl, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 rounded transition-all"
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ))}

              {/* Agregar ítem */}
              <div className="flex items-center gap-2 pt-1 pb-2">
                <div className="w-4 h-4 rounded border-2 border-slate-200 dark:border-slate-600 flex-shrink-0" />
                <input
                  type="text"
                  value={textoNuevoItem[cl.id] ?? ''}
                  onChange={(e) => setTextoNuevoItem((prev) => ({ ...prev, [cl.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') agregarItem(cl); }}
                  placeholder="Agregar ítem..."
                  className="flex-1 text-sm text-slate-500 dark:text-slate-400 bg-transparent focus:outline-none placeholder-slate-300 dark:placeholder-slate-600"
                />
                {(textoNuevoItem[cl.id] ?? '').trim() && (
                  <button
                    onClick={() => agregarItem(cl)}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                  >
                    <IconPlus size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
