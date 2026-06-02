import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { IconAlertTriangle, IconAlertCircle, IconInfoCircle, IconHelpCircle, IconX } from '@tabler/icons-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoConfirm = 'peligro' | 'advertencia' | 'info' | 'default';

export interface ConfirmOpciones {
  titulo: string;
  descripcion?: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  tipo?: TipoConfirm;
}

type ConfirmFn = (opciones: ConfirmOpciones) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// ── Hook público ──────────────────────────────────────────────────────────────

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}

// ── Estilos por tipo ──────────────────────────────────────────────────────────

const CONFIG_TIPO: Record<TipoConfirm, {
  icono: React.ElementType;
  iconoColor: string;
  iconoBg: string;
  botonColor: string;
}> = {
  peligro: {
    icono: IconAlertTriangle,
    iconoColor: 'text-red-600',
    iconoBg: 'bg-red-100 dark:bg-red-900/30',
    botonColor: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
  },
  advertencia: {
    icono: IconAlertCircle,
    iconoColor: 'text-amber-600',
    iconoBg: 'bg-amber-100 dark:bg-amber-900/30',
    botonColor: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500',
  },
  info: {
    icono: IconInfoCircle,
    iconoColor: 'text-blue-600',
    iconoBg: 'bg-blue-100 dark:bg-blue-900/30',
    botonColor: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
  },
  default: {
    icono: IconHelpCircle,
    iconoColor: 'text-indigo-600',
    iconoBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    botonColor: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500',
  },
};

// ── Estado interno ────────────────────────────────────────────────────────────

interface DialogState {
  abierto: boolean;
  opciones: ConfirmOpciones;
}

const ESTADO_VACIO: DialogState = {
  abierto: false,
  opciones: { titulo: '' },
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<DialogState>(ESTADO_VACIO);
  const resolverRef = useRef<((val: boolean) => void) | null>(null);

  const confirmar = useCallback<ConfirmFn>((opciones) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setEstado({ abierto: true, opciones });
    });
  }, []);

  const responder = (valor: boolean) => {
    setEstado((prev) => ({ ...prev, abierto: false }));
    // Pequeño delay para que la animación de cierre termine antes de limpiar
    setTimeout(() => {
      resolverRef.current?.(valor);
      resolverRef.current = null;
    }, 150);
  };

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      {estado.abierto && <ConfirmDialog opciones={estado.opciones} onRespuesta={responder} />}
    </ConfirmContext.Provider>
  );
}

// ── Diálogo ───────────────────────────────────────────────────────────────────

function ConfirmDialog({
  opciones,
  onRespuesta,
}: {
  opciones: ConfirmOpciones;
  onRespuesta: (v: boolean) => void;
}) {
  const tipo = opciones.tipo ?? 'default';
  const cfg = CONFIG_TIPO[tipo];
  const Icono = cfg.icono;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={() => onRespuesta(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Panel */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={() => onRespuesta(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <IconX size={16} />
        </button>

        {/* Ícono */}
        <div className={`w-11 h-11 rounded-xl ${cfg.iconoBg} flex items-center justify-center mb-4`}>
          <Icono size={22} className={cfg.iconoColor} />
        </div>

        {/* Texto */}
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-1">
          {opciones.titulo}
        </h3>
        {opciones.descripcion && (
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
            {opciones.descripcion}
          </p>
        )}

        {/* Botones */}
        <div className={`flex gap-3 ${opciones.descripcion ? '' : 'mt-5'}`}>
          <button
            onClick={() => onRespuesta(false)}
            className="flex-1 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {opciones.labelCancelar ?? 'Cancelar'}
          </button>
          <button
            autoFocus
            onClick={() => onRespuesta(true)}
            className={`flex-1 py-2.5 text-sm font-medium text-white rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${cfg.botonColor}`}
          >
            {opciones.labelConfirmar ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
