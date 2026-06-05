import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  IconMessage2, IconSend, IconPaperclip, IconPhoto, IconArrowLeft,
  IconPlus, IconX, IconSearch, IconUsers, IconHash, IconCornerUpLeft,
  IconLayoutKanban, IconCheck, IconMicrophone, IconMicrophoneOff,
  IconExternalLink, IconClock, IconAlertCircle, IconZoomIn,
} from '@tabler/icons-react';
import { chatApi, usuariosApi, tareasApi, mensajeError } from '../services/api';
import type { SalaChat, Mensaje, Usuario, HorarioTrabajo } from '../interfaces';
import { useAuth } from '../context/AuthContext';
import BarraEstados from '../components/chat/BarraEstados';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8001';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

type Tab = 'directo' | 'grupos' | 'canales';
type VistaMovil = 'lista' | 'mensajes';

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

export default function ChatPage() {
  const [todasLasSalas, setTodasLasSalas] = useState<SalaChat[]>([]);
  const [salaActiva, setSalaActiva] = useState<SalaChat | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [hayMasMensajes, setHayMasMensajes] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<Tab>('directo');
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('lista');

  // Miembros de la sala activa (para @menciones)
  const [miembrosSala, setMiembrosSala] = useState<Usuario[]>([]);
  // @menciones
  const [menciones, setMenciones] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  // Reply
  const [replyTo, setReplyTo] = useState<Mensaje | null>(null);

  // Modal nuevo DM
  const [modalDM, setModalDM] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Usuario[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Modal nuevo grupo
  const [modalGrupo, setModalGrupo] = useState(false);
  const [grupoNombre, setGrupoNombre] = useState('');
  const [grupoMiembros, setGrupoMiembros] = useState<Usuario[]>([]);
  const [busquedaGrupo, setBusquedaGrupo] = useState('');
  const [resultadosGrupo, setResultadosGrupo] = useState<Usuario[]>([]);
  const [buscandoGrupo, setBuscandoGrupo] = useState(false);
  const [creandoGrupo, setCreandoGrupo] = useState(false);

  // Tareas eliminadas (IDs conocidos)
  const [tareasEliminadas, setTareasEliminadas] = useState<Set<string>>(new Set());
  const [verificandoTarea, setVerificandoTarea] = useState<string | null>(null);

  // Horario laboral — otro usuario en DM
  const [disponibilidadOtro, setDisponibilidadOtro] = useState<{
    disponible: boolean;
    nombre: string;
    horario: HorarioTrabajo | null;
  } | null>(null);
  const [confirmarEnvioFueraHorario, setConfirmarEnvioFueraHorario] = useState(false);

  // Modal configuración horario propio
  const [modalHorario, setModalHorario] = useState(false);
  const [horarioForm, setHorarioForm] = useState<HorarioTrabajo>({
    activo: false,
    dias: [0, 1, 2, 3, 4],
    hora_inicio: '09:00',
    hora_fin: '18:00',
    disponible_manual: false,
  });
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  // Grabación de audio
  const [grabando, setGrabando] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const mensajesRef = useRef<HTMLDivElement>(null);
  const esScrollInicial = useRef(true);
  const busquedaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busquedaGrupoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { usuario } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    chatApi.listarSalas()
      .then(({ data }) => {
        setTodasLasSalas(data);
        const primera = data.find((s) => s.tipo === 'directo');
        if (primera) setSalaActiva(primera);
      })
      .catch((err) => console.error(mensajeError(err)))
      .finally(() => setCargando(false));
  }, []);

  // Salas filtradas por tab
  const salas = useMemo(
    () => todasLasSalas.filter((s) => {
      if (tab === 'directo') return s.tipo === 'directo';
      if (tab === 'grupos') return s.tipo === 'grupo';
      return s.tipo === 'area' || s.tipo === 'proyecto';
    }),
    [todasLasSalas, tab],
  );

  // Al cambiar tab, seleccionar primera sala disponible
  useEffect(() => {
    const primera = salas[0] ?? null;
    setSalaActiva(primera);
    setVistaMovil('lista');
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Conectar WebSocket cuando cambia la sala activa
  useEffect(() => {
    if (!salaActiva || !usuario) return;

    wsRef.current?.close();
    setMensajes([]);
    setHayMasMensajes(false);
    setReplyTo(null);
    setMenciones([]);
    setMentionQuery(null);
    esScrollInicial.current = true;
    setTexto(borradores[salaActiva.id] ?? '');

    chatApi.historial(salaActiva.id)
      .then(({ data }) => {
        setMensajes(data);
        setHayMasMensajes(data.length === 50);
      })
      .catch(() => {});
    chatApi.marcarLeida(salaActiva.id).catch(() => {});

    const token = localStorage.getItem('token') ?? '';
    const ws = new WebSocket(`${WS_URL}/chat/ws/${salaActiva.id}?token=${token}`);

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data) as Mensaje;
      setMensajes((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    };

    wsRef.current = ws;
    return () => { ws.close(); };
  }, [salaActiva, usuario]);

  // Cargar miembros de la sala activa
  useEffect(() => {
    if (!salaActiva) { setMiembrosSala([]); return; }
    chatApi.miembrosDeUnaSala(salaActiva.id)
      .then(({ data }) => setMiembrosSala(data))
      .catch(() => setMiembrosSala([]));
  }, [salaActiva]);

  // Verificar disponibilidad del otro usuario en DM
  useEffect(() => {
    setDisponibilidadOtro(null);
    if (!salaActiva || salaActiva.tipo !== 'directo' || !usuario) return;
    const otroId = salaActiva.miembros.find((id) => id !== usuario.id);
    if (!otroId) return;
    usuariosApi.disponibilidad(otroId)
      .then(({ data }) => setDisponibilidadOtro({
        disponible: data.disponible,
        nombre: data.nombre,
        horario: data.horario_trabajo,
      }))
      .catch(() => setDisponibilidadOtro(null));
  }, [salaActiva, usuario]);

  // Cargar horario propio al abrir modal
  useEffect(() => {
    if (!modalHorario) return;
    usuariosApi.perfil().then(({ data }) => {
      if (data.horario_trabajo) setHorarioForm(data.horario_trabajo);
    }).catch(() => {});
  }, [modalHorario]);

  useEffect(() => {
    const scrollAlFondo = () => {
      if (mensajesRef.current) {
        mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
      }
    };
    if (esScrollInicial.current && mensajes.length > 0) {
      scrollAlFondo();
      // Segunda pasada para cuando las imágenes terminen de cargar
      setTimeout(scrollAlFondo, 300);
      esScrollInicial.current = false;
    } else if (!esScrollInicial.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

  // IntersectionObserver: cargar más cuando el tope es visible
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) cargarMasMensajes(); },
      { threshold: 1.0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayMasMensajes, mensajes]);

  // Búsqueda de usuarios DM con debounce
  useEffect(() => {
    if (!busqueda.trim()) { setResultados([]); return; }
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    busquedaTimer.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const { data } = await usuariosApi.buscar(busqueda.trim());
        setResultados(data);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 400);
  }, [busqueda]);

  // Búsqueda para grupo con debounce
  useEffect(() => {
    if (!busquedaGrupo.trim()) { setResultadosGrupo([]); return; }
    if (busquedaGrupoTimer.current) clearTimeout(busquedaGrupoTimer.current);
    busquedaGrupoTimer.current = setTimeout(async () => {
      setBuscandoGrupo(true);
      try {
        const { data } = await usuariosApi.buscar(busquedaGrupo.trim());
        // Excluir los ya seleccionados
        setResultadosGrupo(data.filter((u) => !grupoMiembros.some((m) => m.id === u.id)));
      } catch { setResultadosGrupo([]); }
      finally { setBuscandoGrupo(false); }
    }, 400);
  }, [busquedaGrupo, grupoMiembros]);

  const seleccionarSala = (sala: SalaChat) => {
    setSalaActiva(sala);
    setVistaMovil('mensajes');
  };

  const cargarMasMensajes = async () => {
    if (!salaActiva || cargandoMas || !hayMasMensajes || mensajes.length === 0) return;
    setCargandoMas(true);
    const primerIdActual = mensajes[0].id;
    const alturaAntes = mensajesRef.current?.scrollHeight ?? 0;
    try {
      const { data } = await chatApi.historial(salaActiva.id, primerIdActual);
      if (data.length === 0) { setHayMasMensajes(false); return; }
      setHayMasMensajes(data.length === 50);
      setMensajes((prev) => [...data, ...prev]);
      // Mantener posición de scroll tras prepend
      requestAnimationFrame(() => {
        if (mensajesRef.current) {
          mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight - alturaAntes;
        }
      });
    } catch { /* silencioso */ }
    finally { setCargandoMas(false); }
  };

  const verTarea = async (tareaId: string, proyectoId: string) => {
    if (tareasEliminadas.has(tareaId)) return;
    setVerificandoTarea(tareaId);
    try {
      await tareasApi.obtener(tareaId);
      navigate(`/proyectos/${proyectoId}`, { state: { abrirTareaId: tareaId } });
    } catch {
      setTareasEliminadas((prev) => new Set([...prev, tareaId]));
    } finally {
      setVerificandoTarea(null);
    }
  };

  const guardarHorario = async () => {
    setGuardandoHorario(true);
    try {
      await usuariosApi.actualizarHorario(horarioForm);
      setModalHorario(false);
      toast.success('Horario laboral actualizado');
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setGuardandoHorario(false);
    }
  };

  const toggleDisponibleManual = async () => {
    if (!usuario) return;
    const nuevo = !(horarioForm.disponible_manual);
    try {
      const { data } = await usuariosApi.toggleDisponible(nuevo);
      if (data.horario_trabajo) setHorarioForm(data.horario_trabajo);
      toast.success(nuevo ? 'Ahora estás disponible' : 'Disponibilidad manual desactivada');
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const iniciarDM = async (dest: Usuario) => {
    try {
      const { data: sala } = await chatApi.crearDirecto(dest.id);
      setTodasLasSalas((prev) => prev.some((s) => s.id === sala.id) ? prev : [sala, ...prev]);
      setTab('directo');
      seleccionarSala(sala);
      setModalDM(false);
      setBusqueda('');
      setResultados([]);
    } catch (err) {
      toast.error(mensajeError(err));
    }
  };

  const agregarMiembroGrupo = (u: Usuario) => {
    setGrupoMiembros((prev) => prev.some((m) => m.id === u.id) ? prev : [...prev, u]);
    setBusquedaGrupo('');
    setResultadosGrupo([]);
  };

  const crearGrupo = async () => {
    if (!grupoNombre.trim()) return;
    setCreandoGrupo(true);
    try {
      const { data: sala } = await chatApi.crearGrupo(grupoNombre.trim(), grupoMiembros.map((m) => m.id));
      setTodasLasSalas((prev) => [sala, ...prev]);
      setTab('grupos');
      seleccionarSala(sala);
      setModalGrupo(false);
      setGrupoNombre('');
      setGrupoMiembros([]);
    } catch (err) {
      toast.error(mensajeError(err));
    } finally {
      setCreandoGrupo(false);
    }
  };

  // Detectar @mención en el texto
  const handleTextoChange = (value: string) => {
    setTexto(value);
    if (salaActiva) {
      setBorradores((prev) => ({ ...prev, [salaActiva.id]: value }));
    }
    const palabras = value.split(/\s/);
    const ultima = palabras[palabras.length - 1];
    if (ultima.startsWith('@') && ultima.length >= 1) {
      setMentionQuery(ultima.slice(1));
    } else {
      setMentionQuery(null);
    }
  };

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return miembrosSala
      .filter((m) => m.nombre.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 5);
  }, [mentionQuery, miembrosSala]);

  const seleccionarMencion = (m: Usuario) => {
    const palabras = texto.split(/\s/);
    palabras[palabras.length - 1] = `@${m.nombre} `;
    setTexto(palabras.join(' '));
    setMenciones((prev) => prev.includes(m.id) ? prev : [...prev, m.id]);
    setMentionQuery(null);
  };

  const enviarMensajeReal = () => {
    if (!texto.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      contenido: texto.trim(),
      menciones,
      reply_to_id: replyTo?.id ?? null,
    }));
    setTexto('');
    if (salaActiva) setBorradores((prev) => ({ ...prev, [salaActiva.id]: '' }));
    setReplyTo(null);
    setMenciones([]);
    setMentionQuery(null);
    setConfirmarEnvioFueraHorario(false);
  };

  const enviarMensaje = () => {
    if (!texto.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // Si el otro está fuera de horario en un DM, pedir confirmación
    if (salaActiva?.tipo === 'directo' && disponibilidadOtro && !disponibilidadOtro.disponible) {
      setConfirmarEnvioFueraHorario(true);
      return;
    }
    enviarMensajeReal();
  };

  const enviarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo || !salaActiva) return;
    setEnviando(true);
    try { await chatApi.enviarImagen(salaActiva.id, archivo, menciones); }
    catch (err) { toast.error(mensajeError(err)); }
    finally { setEnviando(false); e.target.value = ''; }
  };

  const comprimirImagenCliente = (archivo: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(archivo);
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas no disponible')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('No se pudo procesar la imagen')); return; }
          resolve(new File([blob], 'foto.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('No se pudo leer la imagen')); };
      img.src = objectUrl;
    });

  const enviarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo || !salaActiva) return;
    setEnviando(true);
    try {
      const nombre = archivo.name.toLowerCase();
      const esVideoFile = archivo.type.startsWith('video/') ||
        /\.(mp4|mov|avi|mkv|webm|3gp|m4v)$/.test(nombre);
      // Imagen: tipo explícito, extensión conocida, o tipo vacío (fotos de cámara en algunos Android)
      // Si tipo vacío resulta ser video, comprimirImagenCliente fallará y el catch lo envía como archivo
      const esImagen = !esVideoFile && (
        archivo.type.startsWith('image/') ||
        archivo.type === '' ||
        /\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff)$/.test(nombre)
      );
      if (esImagen) {
        try {
          const comprimido = await comprimirImagenCliente(archivo);
          await chatApi.enviarImagen(salaActiva.id, comprimido, menciones);
        } catch {
          // Canvas no pudo procesarlo — enviar como archivo directamente
          await chatApi.enviarArchivo(salaActiva.id, archivo);
        }
      } else {
        await chatApi.enviarArchivo(salaActiva.id, archivo);
      }
    }
    catch (err) { toast.error(mensajeError(err)); }
    finally { setEnviando(false); e.target.value = ''; }
  };

  const iniciarGrabacion = async () => {
    if (!salaActiva) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType: tipo });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: tipo });
        const ext = tipo.includes('webm') ? 'webm' : 'ogg';
        const archivo = new File([blob], `audio-${Date.now()}.${ext}`, { type: tipo });
        setEnviando(true);
        try { await chatApi.enviarArchivo(salaActiva.id, archivo); }
        catch (err) { toast.error(mensajeError(err)); }
        finally { setEnviando(false); }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setGrabando(true);
    } catch {
      toast.error('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  const esAudio = (nombre?: string) =>
    /\.(webm|ogg|mp3|m4a|wav|opus)$/i.test(nombre ?? '');

  const esVideo = (nombre?: string) =>
    /\.(mp4|mov|avi|mkv|webm|3gp|m4v)$/i.test(nombre ?? '');

  // Nombre visible para una sala
  const nombreSala = (sala: SalaChat) => {
    if (sala.tipo === 'directo') {
      const parts = sala.nombre.split(' · ');
      if (parts.length === 2) return parts[0] === usuario?.nombre ? parts[1] : parts[0];
      return sala.nombre;
    }
    if (sala.tipo === 'grupo') return sala.nombre;
    return sala.nombre;
  };

  const inicialAvatar = (sala: SalaChat) => nombreSala(sala).charAt(0).toUpperCase();

  if (cargando) {
    return <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">Cargando...</div>;
  }

  const tabsConfig: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'directo', label: 'Directo', icon: IconMessage2 },
    { key: 'grupos', label: 'Grupos', icon: IconUsers },
    { key: 'canales', label: 'Canales', icon: IconHash },
  ];

  // ── Panel lateral ─────────────────────────────────────────────────────────
  const panelLateral = (
    <aside
      className={`w-full md:w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0
        ${vistaMovil === 'lista' ? 'flex' : 'hidden'} md:flex`}
    >
      {/* Estados / Stories */}
      <BarraEstados />

      {/* Tabs */}
      <div className="px-2 pt-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1">
          {tabsConfig.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-t-lg text-xs font-medium transition-colors ${
                tab === key
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Acción según tab */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
        {tab === 'directo' && (
          <button
            onClick={() => setModalDM(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors font-medium"
          >
            <IconPlus size={15} />
            Nueva conversación
          </button>
        )}
        {tab === 'grupos' && (
          <button
            onClick={() => setModalGrupo(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors font-medium"
          >
            <IconPlus size={15} />
            Nuevo grupo
          </button>
        )}
        {tab === 'canales' && (
          <p className="text-xs text-slate-400 dark:text-slate-500 px-1 py-1">
            Los canales se crean automáticamente con cada área y proyecto.
          </p>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {salas.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500 text-xs text-center py-8 px-4">
            {tab === 'directo' ? 'Sin conversaciones directas.' : tab === 'grupos' ? 'Sin grupos aún.' : 'Sin canales.'}
          </p>
        )}
        {salas.map((sala) => (
          <button
            key={sala.id}
            onClick={() => seleccionarSala(sala)}
            className={`w-full text-left px-3 py-3 transition-colors flex items-center gap-3 ${
              salaActiva?.id === sala.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-l-indigo-600'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700 border-l-2 border-l-transparent'
            }`}
          >
            {sala.tipo === 'directo' ? (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {inicialAvatar(sala)}
              </div>
            ) : sala.tipo === 'grupo' ? (
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                <IconUsers size={15} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                <IconHash size={15} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{nombreSala(sala)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                {sala.tipo === 'directo' ? 'Mensaje directo' : sala.tipo === 'grupo' ? 'Grupo' : sala.tipo}
              </p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );

  // ── Panel de mensajes ─────────────────────────────────────────────────────
  const panelMensajes = (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-800
        ${vistaMovil === 'mensajes' ? 'flex' : 'hidden'} md:flex`}
    >
      {salaActiva ? (
        <>
          {/* Header */}
          <div className="px-4 py-3.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 sticky top-0 z-10">
            <button
              onClick={() => setVistaMovil('lista')}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <IconArrowLeft size={18} />
            </button>
            {salaActiva.tipo === 'directo' ? (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {inicialAvatar(salaActiva)}
              </div>
            ) : salaActiva.tipo === 'grupo' ? (
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                <IconUsers size={16} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                <IconHash size={16} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{nombreSala(salaActiva)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                {salaActiva.tipo === 'directo' && disponibilidadOtro ? (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${disponibilidadOtro.disponible ? 'bg-green-500' : 'bg-slate-400'}`} />
                    {disponibilidadOtro.disponible ? 'En horario laboral' : 'Fuera de horario'}
                  </>
                ) : salaActiva.tipo === 'directo' ? 'Mensaje directo'
                  : salaActiva.tipo === 'grupo' ? `Grupo · ${salaActiva.miembros.length} miembros`
                  : salaActiva.tipo}
              </p>
            </div>
            {/* Botón configurar horario propio */}
            <button
              onClick={() => setModalHorario(true)}
              title="Configurar mi horario laboral"
              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            >
              <IconClock size={16} />
            </button>
            {/* Miembros del grupo/canal como avatares */}
            {(salaActiva.tipo === 'grupo' || salaActiva.tipo === 'area' || salaActiva.tipo === 'proyecto') && miembrosSala.length > 0 && (
              <div className="hidden md:flex -space-x-1.5">
                {miembrosSala.slice(0, 4).map((m) => (
                  <div key={m.id} title={m.nombre} className="w-6 h-6 rounded-full bg-slate-400 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {m.nombre.charAt(0).toUpperCase()}
                  </div>
                ))}
                {miembrosSala.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 text-[9px] font-bold">
                    +{miembrosSala.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Área de mensajes */}
          <div ref={mensajesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-slate-50 dark:bg-slate-900">
            {/* Sensor de scroll al tope + spinner */}
            <div ref={topRef} className="h-1" />
            {cargandoMas && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-400 dark:text-slate-500">
                <svg className="animate-spin w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Cargando mensajes anteriores...
              </div>
            )}
            {mensajes.map((msg) => {
              const esMio = msg.remitente_id === usuario?.id;
              const esSistema = msg.remitente_id === 'sistema';

              if (esSistema) {
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span className="text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full max-w-xs text-center">
                      {msg.contenido}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`group flex flex-col ${esMio ? 'items-end' : 'items-start'} py-0.5`}>
                  {!esMio && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 mb-1 px-1">{msg.nombre_remitente}</span>
                  )}

                  <div className="flex items-end gap-1.5">
                    {/* Botón reply — izquierda para mensajes míos, derecha para ajenos */}
                    {esMio && (
                      <button
                        onClick={() => setReplyTo(msg)}
                        title="Responder"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all flex-shrink-0"
                      >
                        <IconCornerUpLeft size={13} />
                      </button>
                    )}

                    <div className={`max-w-[72%] md:max-w-sm`}>
                      {/* Cita del mensaje respondido */}
                      {msg.reply_to_id && msg.reply_to_preview && (
                        <div className={`mb-1 px-3 py-1.5 rounded-xl border-l-2 ${
                          esMio
                            ? 'border-indigo-300 bg-indigo-500/20 dark:bg-indigo-500/10'
                            : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700'
                        }`}>
                          <p className={`text-xs font-semibold mb-0.5 ${esMio ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>
                            {msg.reply_to_remitente}
                          </p>
                          <p className={`text-xs line-clamp-1 ${esMio ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {msg.reply_to_preview}
                          </p>
                        </div>
                      )}

                      {/* Burbuja del mensaje */}
                      {msg.subtipo === 'tarea' ? (
                        // Tarjeta de tarea compartida
                        <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                          esMio ? 'rounded-tr-sm border-indigo-300 dark:border-indigo-600' : 'rounded-tl-sm border-slate-200 dark:border-slate-600'
                        }`}>
                          <div className="bg-indigo-600 dark:bg-indigo-700 px-3 py-2 flex items-center gap-2">
                            <IconLayoutKanban size={13} className="text-indigo-200" />
                            <span className="text-xs text-indigo-100 font-medium">Tarea compartida</span>
                          </div>
                          <div className={`px-3 py-2.5 ${esMio ? 'bg-indigo-700 dark:bg-indigo-800' : 'bg-white dark:bg-slate-800'}`}>
                            <p className={`text-sm font-semibold mb-1.5 leading-snug ${esMio ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                              {msg.tarea_titulo}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              {msg.tarea_columna && (
                                <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                  esMio ? 'border-indigo-400 text-indigo-200 bg-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700'
                                }`}>
                                  {COLUMNAS_LABELS[msg.tarea_columna] ?? msg.tarea_columna}
                                </span>
                              )}
                              {msg.tarea_prioridad && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  esMio ? 'bg-indigo-600 text-indigo-100' : (PRIORIDAD_COLORS[msg.tarea_prioridad] ?? 'bg-slate-100 text-slate-600')
                                }`}>
                                  {msg.tarea_prioridad}
                                </span>
                              )}
                            </div>
                            {msg.contenido && (
                              <p className={`text-xs ${esMio ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                {msg.contenido}
                              </p>
                            )}
                            {msg.tarea_id && tareasEliminadas.has(msg.tarea_id) ? (
                              <p className="mt-2 flex items-center gap-1 text-xs text-red-400 dark:text-red-400">
                                <IconAlertCircle size={12} />
                                Esta tarea fue eliminada
                              </p>
                            ) : msg.tarea_proyecto_id && msg.tarea_id ? (
                              <button
                                onClick={() => verTarea(msg.tarea_id!, msg.tarea_proyecto_id!)}
                                disabled={verificandoTarea === msg.tarea_id}
                                className={`mt-2 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                  esMio
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                }`}
                              >
                                <IconExternalLink size={12} />
                                {verificandoTarea === msg.tarea_id ? 'Verificando...' : 'Ver tarea'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : msg.subtipo === 'imagen' && msg.archivo_url ? (
                        <div className={`rounded-2xl overflow-hidden relative group/img ${esMio ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                          <img
                            src={`${API_URL}${msg.archivo_url}`}
                            alt="imagen"
                            className="max-w-full rounded-lg cursor-zoom-in hover:opacity-95 transition-opacity"
                            onClick={() => setLightboxUrl(`${API_URL}${msg.archivo_url}`)}
                          />
                          <button
                            onClick={() => setLightboxUrl(`${API_URL}${msg.archivo_url}`)}
                            className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-1"
                          >
                            <IconZoomIn size={14} />
                          </button>
                        </div>
                      ) : msg.subtipo === 'archivo' && esAudio(msg.archivo_nombre) ? (
                        <div className={`rounded-2xl px-3 py-2.5 ${esMio ? 'bg-indigo-600 rounded-tr-sm' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-tl-sm'}`}>
                          <audio
                            controls
                            src={`${API_URL}${msg.archivo_url}`}
                            className="max-w-full rounded-lg"
                            style={{ height: '36px', minWidth: '200px' }}
                          />
                        </div>
                      ) : msg.subtipo === 'archivo' && esVideo(msg.archivo_nombre) ? (
                        <div className={`rounded-2xl overflow-hidden ${esMio ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                          <video
                            controls
                            src={`${API_URL}${msg.archivo_url}`}
                            className="max-w-full rounded-2xl"
                            style={{ maxHeight: '320px' }}
                            playsInline
                          />
                        </div>
                      ) : msg.subtipo === 'archivo' ? (
                        <div className={`rounded-2xl px-4 py-2.5 ${esMio ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-tl-sm'}`}>
                          <a
                            href={`${API_URL}${msg.archivo_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center gap-2 text-sm underline break-all ${esMio ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}
                          >
                            <IconPaperclip size={14} className="flex-shrink-0" />
                            {msg.archivo_nombre ?? msg.contenido}
                          </a>
                        </div>
                      ) : (
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          esMio
                            ? 'bg-indigo-600 text-white rounded-tr-sm'
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                        }`}>
                          <p className="text-sm break-words">{msg.contenido}</p>
                        </div>
                      )}
                    </div>

                    {!esMio && (
                      <button
                        onClick={() => setReplyTo(msg)}
                        title="Responder"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all flex-shrink-0"
                      >
                        <IconCornerUpLeft size={13} />
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 dark:text-slate-600 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            {/* Banner fuera de horario */}
            {salaActiva.tipo === 'directo' && disponibilidadOtro && !disponibilidadOtro.disponible && (
              <div className="flex items-start gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/40">
                <IconClock size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                  <span className="font-semibold">{disponibilidadOtro.nombre}</span> no se encuentra en su horario laboral.
                  {' '}Tu mensaje se entregará cuando esté disponible.
                </p>
              </div>
            )}
            {/* Reply preview */}
            {replyTo && (
              <div className="flex items-start gap-3 px-4 py-2 border-b border-slate-100 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 truncate">
                    Respondiendo a {replyTo.nombre_remitente}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{replyTo.contenido}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0">
                  <IconX size={14} />
                </button>
              </div>
            )}

            {/* @mention picker */}
            {filteredMentions.length > 0 && (
              <div className="px-4 py-1 border-b border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-1.5">
                  {filteredMentions.map((m) => (
                    <button
                      key={m.id}
                      onMouseDown={(e) => { e.preventDefault(); seleccionarMencion(m); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium transition-colors"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                        {m.nombre.charAt(0).toUpperCase()}
                      </span>
                      {m.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Menciones activas */}
            {menciones.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-400 dark:text-slate-500">Etiquetando:</span>
                {menciones.map((id) => {
                  const m = miembrosSala.find((u) => u.id === id);
                  return m ? (
                    <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                      @{m.nombre.split(' ')[0]}
                      <button onClick={() => setMenciones((prev) => prev.filter((x) => x !== id))} className="hover:text-red-500">
                        <IconX size={10} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}

            <div className="px-4 py-3">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2">
                <label className="cursor-pointer text-slate-400 hover:text-indigo-600 p-1 flex-shrink-0">
                  <IconPhoto size={18} />
                  <input type="file" accept="image/*" className="hidden" onChange={enviarImagen} disabled={enviando} />
                </label>
                <label className="cursor-pointer text-slate-400 hover:text-indigo-600 p-1 flex-shrink-0">
                  <IconPaperclip size={18} />
                  <input type="file" className="hidden" onChange={enviarArchivo} disabled={enviando} />
                </label>
                <input
                  type="text"
                  value={texto}
                  onChange={(e) => handleTextoChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); }
                    if (e.key === 'Escape') { setReplyTo(null); setMentionQuery(null); }
                  }}
                  placeholder={miembrosSala.length > 0 ? 'Escribe un mensaje o @ para mencionar...' : 'Escribe un mensaje...'}
                  disabled={enviando}
                  className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none min-w-0"
                />
                <button
                  onClick={grabando ? detenerGrabacion : iniciarGrabacion}
                  disabled={enviando}
                  title={grabando ? 'Detener grabación' : 'Grabar mensaje de voz'}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                    grabando
                      ? 'text-red-500 bg-red-50 dark:bg-red-900/30 animate-pulse'
                      : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {grabando ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
                </button>
                <button
                  onClick={enviarMensaje}
                  disabled={!texto.trim() || enviando}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors flex-shrink-0"
                >
                  <IconSend size={16} />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center px-4">
            <IconMessage2 size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              {tab === 'directo' ? 'Selecciona o inicia una conversación directa'
                : tab === 'grupos' ? 'Selecciona o crea un grupo'
                : 'Selecciona un canal'}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex h-[calc(100vh-57px)] md:h-screen overflow-hidden bg-white dark:bg-slate-800">
        {panelLateral}
        {panelMensajes}
      </div>

      {/* Modal nuevo DM */}
      {modalDM && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-xl p-5 w-full md:max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Nueva conversación</h2>
              <button onClick={() => { setModalDM(false); setBusqueda(''); setResultados([]); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <IconX size={20} />
              </button>
            </div>
            <div className="relative mb-3">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, email o teléfono..."
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="min-h-[80px] max-h-52 overflow-y-auto">
              {buscando && <p className="text-xs text-slate-400 text-center py-4">Buscando...</p>}
              {!buscando && busqueda && resultados.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>}
              {!buscando && !busqueda && <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Escribe para buscar usuarios</p>}
              {resultados.map((u) => (
                <button key={u.id} onClick={() => iniciarDM(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.nombre}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirmación envío fuera de horario */}
      {confirmarEnvioFueraHorario && disponibilidadOtro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <IconClock size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Fuera de horario laboral</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              Lo sentimos, <span className="font-semibold">{disponibilidadOtro.nombre}</span> no se encuentra
              en su horario laboral en este momento. Apenas esté disponible, este mensaje le será entregado.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmarEnvioFueraHorario(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={enviarMensajeReal}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Enviar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal configuración horario laboral */}
      {modalHorario && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-xl p-5 w-full md:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <IconClock size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Mi horario laboral</h2>
              </div>
              <button onClick={() => setModalHorario(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <IconX size={20} />
              </button>
            </div>

            {/* Toggle activo */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Activar horario laboral</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Tus compañeros verán aviso fuera de tu horario</p>
              </div>
              <button
                onClick={() => setHorarioForm((p) => ({ ...p, activo: !p.activo }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${horarioForm.activo ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${horarioForm.activo ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {horarioForm.activo && (
              <div className="space-y-4">
                {/* Días */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Días laborales</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setHorarioForm((p) => ({
                          ...p,
                          dias: p.dias.includes(i) ? p.dias.filter((x) => x !== i) : [...p.dias, i],
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          horarioForm.dias.includes(i)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Entrada</label>
                    <input
                      type="time"
                      value={horarioForm.hora_inicio}
                      onChange={(e) => setHorarioForm((p) => ({ ...p, hora_inicio: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Salida</label>
                    <input
                      type="time"
                      value={horarioForm.hora_fin}
                      onChange={(e) => setHorarioForm((p) => ({ ...p, hora_fin: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Disponible manual */}
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Disponible ahora</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Actívate manualmente fuera de horario (urgencias)</p>
                  </div>
                  <button
                    onClick={toggleDisponibleManual}
                    className={`relative w-11 h-6 rounded-full transition-colors ${horarioForm.disponible_manual ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${horarioForm.disponible_manual ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalHorario(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={guardarHorario}
                disabled={guardandoHorario}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {guardandoHorario ? 'Guardando...' : 'Guardar horario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo grupo */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 md:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl md:rounded-2xl shadow-xl p-5 w-full md:max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Nuevo grupo</h2>
              <button onClick={() => { setModalGrupo(false); setGrupoNombre(''); setGrupoMiembros([]); setBusquedaGrupo(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <IconX size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nombre del grupo *</label>
                <input
                  type="text"
                  value={grupoNombre}
                  onChange={(e) => setGrupoNombre(e.target.value)}
                  placeholder="ej: Equipo frontend, Sprint 2..."
                  autoFocus
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Miembros seleccionados */}
              {grupoMiembros.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {grupoMiembros.map((m) => (
                    <span key={m.id} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
                      {m.nombre.split(' ')[0]}
                      <button onClick={() => setGrupoMiembros((prev) => prev.filter((x) => x.id !== m.id))} className="hover:text-red-500">
                        <IconX size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Buscar miembros */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Agregar miembros</label>
                <div className="relative">
                  <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busquedaGrupo}
                    onChange={(e) => setBusquedaGrupo(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="mt-1.5 max-h-32 overflow-y-auto space-y-0.5">
                  {buscandoGrupo && <p className="text-xs text-slate-400 text-center py-2">Buscando...</p>}
                  {!buscandoGrupo && busquedaGrupo && resultadosGrupo.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">Sin resultados</p>
                  )}
                  {resultadosGrupo.map((u) => (
                    <button key={u.id} onClick={() => agregarMiembroGrupo(u)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-left transition-colors">
                      <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.nombre}</p>
                      </div>
                      <IconCheck size={14} className="text-indigo-500 ml-auto flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setModalGrupo(false); setGrupoNombre(''); setGrupoMiembros([]); }}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={crearGrupo}
                  disabled={!grupoNombre.trim() || creandoGrupo}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {creandoGrupo ? 'Creando...' : 'Crear grupo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox de imágenes */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80]"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <IconX size={22} />
          </button>
          <div className="max-w-4xl max-h-[90vh] px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="imagen"
              className="max-h-[90vh] max-w-full object-contain rounded-lg select-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
