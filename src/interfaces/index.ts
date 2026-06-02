// ─── Auth ───────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  avatar_url?: string;
  created_at: string;
}

export interface TokenResponse {
  token: string;
  usuario: Usuario;
}

// ─── Áreas ──────────────────────────────────────────────────────────────────

export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  creador_id: string;
  miembros: string[];
  chat_grupo_id?: string;
  created_at: string;
}

// ─── Proyectos ───────────────────────────────────────────────────────────────

export interface ColumnaCustom {
  id: string;
  nombre: string;
  orden: number;
  color: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion?: string;
  area_id: string;
  creador_id: string;
  miembros: string[];
  chat_grupo_id?: string;
  sprint_activo_id?: string;
  columnas_custom: ColumnaCustom[];
  created_at: string;
}

// ─── Tareas ──────────────────────────────────────────────────────────────────

export type ColumnaBase = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type Columna = ColumnaBase | string;
export type Prioridad = 'critica' | 'alta' | 'media' | 'baja';
export type TipoTarea = 'historia' | 'bug' | 'tarea' | 'mejora';

export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string;
  proyecto_id: string;
  epica_id?: string;
  sprint_id?: string;
  columna: Columna;
  asignado_a?: string;
  creado_por: string;
  prioridad: Prioridad;
  horas_estimadas: number;
  horas_registradas: number;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  etiquetas: string[];
  completada_en?: string;
  created_at: string;
  tipo_tarea: TipoTarea;
  puntos_historia: number;
  criterios_aceptacion?: string;
}

// ─── Actividad mensual ────────────────────────────────────────────────────────

export interface EntradaHoraActividad {
  fecha: string;
  usuario_id: string;
  horas: number;
  tarea_id: string;
  tarea_titulo: string;
  descripcion: string;
}

export interface TareaCompletadaActividad {
  fecha: string;
  usuario_id: string;
  tarea_id: string;
  titulo: string;
}

export interface SprintActividad {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export interface ActividadMensual {
  horas: EntradaHoraActividad[];
  completadas: TareaCompletadaActividad[];
  sprints: SprintActividad[];
}

export interface HoraLog {
  id: string;
  tarea_id: string;
  usuario_id: string;
  horas: number;
  descripcion: string;
  fecha: string;
  created_at: string;
}

// ─── Sprints ─────────────────────────────────────────────────────────────────

export type EstadoSprint = 'planificado' | 'activo' | 'completado';

export interface Sprint {
  id: string;
  proyecto_id: string;
  nombre: string;
  objetivo?: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoSprint;
  color: string;
  created_at: string;
}

// ─── Épicas ──────────────────────────────────────────────────────────────────

export interface Epica {
  id: string;
  proyecto_id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  created_at: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type SubtipoMensaje = 'texto' | 'imagen' | 'archivo' | 'tarea';

export interface Mensaje {
  id: string;
  sala_id: string;
  remitente_id: string;
  nombre_remitente: string;
  contenido: string;
  subtipo: SubtipoMensaje;
  archivo_url?: string;
  archivo_nombre?: string;
  archivo_tamano?: number;
  menciones: string[];
  reply_to_id?: string;
  reply_to_preview?: string;
  reply_to_remitente?: string;
  tarea_id?: string;
  tarea_titulo?: string;
  tarea_columna?: string;
  tarea_prioridad?: string;
  tarea_proyecto_id?: string;
  created_at: string;
}

export interface SalaChat {
  id: string;
  nombre: string;
  tipo: 'area' | 'proyecto' | 'directo' | 'grupo';
  referencia_id?: string;
  miembros: string[];
  created_at: string;
}

// ─── Estados (stories) ───────────────────────────────────────────────────────

export interface Estado {
  id: string;
  usuario_id: string;
  nombre_usuario: string;
  url_imagen: string;
  created_at: string;
  expira_at: string;
  es_propio: boolean;
}

// ─── Evidencias ──────────────────────────────────────────────────────────────

export interface Evidencia {
  id: string;
  tarea_id: string;
  usuario_id: string;
  nombre_usuario: string;
  urls: string[];
  nombres: string[];
  tipos: string[];
  comentario: string;
  created_at: string;
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  texto: string;
  completado: boolean;
}

export interface Checklist {
  id: string;
  tarea_id: string;
  nombre: string;
  items: ChecklistItem[];
  created_at: string;
}

// ─── API errors ──────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}
