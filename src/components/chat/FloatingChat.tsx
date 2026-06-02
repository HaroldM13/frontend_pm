import { useState, useEffect, useRef } from 'react';
import { IconMessageCircle, IconX, IconSend, IconPaperclip } from '@tabler/icons-react';
import { chatApi } from '../../services/api';
import type { Mensaje } from '../../interfaces';

interface FloatingChatProps {
  salaId: string;
  nombreSala: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';
// Convertir URL HTTP a WS
const WS_BASE = BASE_URL.replace(/^http/, 'ws');

export default function FloatingChat({ salaId, nombreSala }: FloatingChatProps) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const usuarioId = localStorage.getItem('usuario_id') ?? '';

  // Cargar historial y conectar WS al abrir
  useEffect(() => {
    if (!abierto) return;

    const cargarHistorial = async () => {
      setCargando(true);
      try {
        const { data } = await chatApi.historial(salaId);
        setMensajes(data);
      } catch {
        // silencioso — el chat se puede usar sin historial
      } finally {
        setCargando(false);
      }
    };

    const conectarWs = () => {
      const token = localStorage.getItem('token') ?? '';
      const ws = new WebSocket(`${WS_BASE}/chat/ws/${salaId}?token=${token}`);

      ws.onmessage = (e) => {
        try {
          const msg: Mensaje = JSON.parse(e.data);
          setMensajes((prev) => {
            // evitar duplicados por id
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } catch {
          // ignorar mensajes malformados
        }
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    };

    cargarHistorial();
    conectarWs();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [abierto, salaId]);

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Foco al input al abrir
  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 100);
  }, [abierto]);

  const enviar = () => {
    const contenido = texto.trim();
    if (!contenido || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ contenido, menciones: [] }));
    setTexto('');
  };

  const formatearHora = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel del chat */}
      {abierto && (
        <div className="w-80 md:w-96 h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <IconMessageCircle size={18} />
              <span className="text-sm font-semibold truncate">{nombreSala}</span>
            </div>
            <button onClick={() => setAbierto(false)} className="p-1 hover:bg-indigo-700 rounded-lg">
              <IconX size={16} />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {cargando && (
              <p className="text-xs text-slate-400 text-center py-4">Cargando historial...</p>
            )}
            {!cargando && mensajes.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Sin mensajes aún</p>
            )}
            {mensajes.map((m) => {
              const esMio = m.remitente_id === usuarioId;
              return (
                <div key={m.id} className={`flex flex-col ${esMio ? 'items-end' : 'items-start'}`}>
                  {!esMio && (
                    <span className="text-xs text-slate-400 mb-0.5 px-1">{m.nombre_remitente}</span>
                  )}
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-sm break-words ${
                      esMio
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {m.subtipo === 'imagen' ? (
                      <a href={`${BASE_URL}${m.archivo_url}`} target="_blank" rel="noreferrer">
                        <img
                          src={`${BASE_URL}${m.archivo_url}`}
                          alt="imagen"
                          className="rounded-lg max-w-full max-h-40 object-cover"
                        />
                      </a>
                    ) : m.subtipo === 'archivo' ? (
                      <a
                        href={`${BASE_URL}${m.archivo_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-1.5 underline text-xs ${esMio ? 'text-indigo-200' : 'text-indigo-600'}`}
                      >
                        <IconPaperclip size={13} />
                        {m.archivo_nombre ?? m.contenido}
                      </a>
                    ) : (
                      m.contenido
                    )}
                  </div>
                  <span className={`text-[10px] text-slate-400 mt-0.5 px-1`}>
                    {formatearHora(m.created_at)}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 bg-white">
            <input
              ref={inputRef}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder="Escribe un mensaje..."
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={enviar}
              disabled={!texto.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
            >
              <IconSend size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
      >
        {abierto ? <IconX size={22} /> : <IconMessageCircle size={22} />}
      </button>
    </div>
  );
}
