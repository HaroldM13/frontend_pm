import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { IconPlus, IconX, IconClock } from '@tabler/icons-react';
import { estadosApi, mensajeError } from '../../services/api';
import type { Estado } from '../../interfaces';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';
const DURACION_VISOR_SEG = 15;

interface VisorProps {
  estado: Estado;
  onCerrar: () => void;
  onEliminar?: (id: string) => void;
}

function VisorEstado({ estado, onCerrar, onEliminar }: VisorProps) {
  const [progreso, setProgreso] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tiempoRestante = () => {
    const exp = new Date(estado.expira_at).getTime();
    const seg = Math.max(0, Math.floor((exp - Date.now()) / 1000));
    return seg;
  };

  useEffect(() => {
    const inicio = Date.now();
    timerRef.current = setInterval(() => {
      const transcurrido = (Date.now() - inicio) / 1000;
      const pct = Math.min(100, (transcurrido / DURACION_VISOR_SEG) * 100);
      setProgreso(pct);
      if (pct >= 100) onCerrar();
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sysRestante = tiempoRestante();

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Barra de progreso */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-10">
        <div className="h-full bg-white transition-none" style={{ width: `${progreso}%` }} />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            {estado.nombre_usuario.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{estado.nombre_usuario}</p>
            <p className="text-white/60 text-xs flex items-center gap-1">
              <IconClock size={11} />
              {sysRestante}s restantes en el sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {estado.es_propio && onEliminar && (
            <button onClick={() => { onEliminar(estado.id); onCerrar(); }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors text-xs px-2 py-1">
              Eliminar
            </button>
          )}
          <button onClick={onCerrar} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <IconX size={20} />
          </button>
        </div>
      </div>

      {/* Imagen */}
      <div className="flex-1 flex items-center justify-center">
        <img src={`${BASE_URL}${estado.url_imagen}`} alt="estado" className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  );
}

export default function BarraEstados() {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [viendo, setViendo] = useState<Estado | null>(null);
  const { usuario } = useAuth();

  const cargar = async () => {
    try {
      const { data } = await estadosApi.listar();
      setEstados(data);
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 30_000);
    return () => clearInterval(intervalo);
  }, []);

  const subirEstado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    try {
      const { data } = await estadosApi.crear(archivo);
      setEstados((prev) => [data, ...prev.filter((es) => es.usuario_id !== usuario?.id)]);
    } catch (err) {
      toast.error(mensajeError(err));
    }
    e.target.value = '';
  };

  const eliminarEstado = async (id: string) => {
    try {
      await estadosApi.eliminar(id);
      setEstados((prev) => prev.filter((e) => e.id !== id));
    } catch { /* silencioso */ }
  };

  const miEstado = estados.find((e) => e.es_propio);
  const otrosEstados = estados.filter((e) => !e.es_propio);

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 overflow-x-auto border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        {/* Mi estado */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <label className="cursor-pointer relative">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors ${
              miEstado
                ? 'border-indigo-500'
                : 'border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400'
            }`}>
              {miEstado ? (
                <img src={`${BASE_URL}${miEstado.url_imagen}`} alt="mi estado"
                  className="w-full h-full rounded-full object-cover" onClick={(e) => { e.preventDefault(); setViendo(miEstado); }} />
              ) : (
                <IconPlus size={16} className="text-slate-400 dark:text-slate-500" />
              )}
            </div>
            {!miEstado && (
              <input type="file" accept="image/*" className="hidden" onChange={subirEstado} />
            )}
          </label>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[44px]">
            {miEstado ? 'Mi estado' : 'Subir'}
          </span>
        </div>

        {/* Estados de otros */}
        {otrosEstados.map((es) => (
          <button key={es.id} onClick={() => setViendo(es)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-11 h-11 rounded-full border-2 border-indigo-400 dark:border-indigo-500 overflow-hidden">
              <img src={`${BASE_URL}${es.url_imagen}`} alt={es.nombre_usuario}
                className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[44px]">
              {es.nombre_usuario.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {viendo && (
        <VisorEstado
          estado={viendo}
          onCerrar={() => setViendo(null)}
          onEliminar={eliminarEstado}
        />
      )}
    </>
  );
}
