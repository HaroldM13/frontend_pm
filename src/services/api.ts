import axios, { AxiosError } from 'axios';
import type { TokenResponse, Usuario, Area, Proyecto, Tarea, HoraLog, Sprint, Epica, Mensaje, SalaChat, ActividadMensual, Estado, Evidencia, Checklist, ColumnaCustom } from '../interfaces';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001';

const api = axios.create({ baseURL: BASE_URL });

// Inyectar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → limpiar sesión y redirigir a login
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Helper para extraer mensaje de error de forma legible
export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detalle = error.response?.data?.detail;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle)) return detalle[0]?.msg ?? 'Error de validación';
  }
  return 'Ocurrió un error inesperado';
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  enviarCodigo: (email: string, telefono: string) =>
    api.post<{ mensaje: string }>('/auth/enviar-codigo', { email, telefono }),

  registro: (datos: {
    nombre: string;
    email: string;
    telefono: string;
    password: string;
    confirmar_password: string;
    codigo: string;
  }) => api.post<TokenResponse>('/auth/registro', datos),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),
};

// ─── Usuarios ────────────────────────────────────────────────────────────────

export const usuariosApi = {
  listar: () => api.get<Usuario[]>('/usuarios/'),
  buscar: (q: string) => api.get<Usuario[]>('/usuarios/buscar', { params: { q } }),
  perfil: () => api.get<Usuario>('/usuarios/perfil'),
  actualizar: (nombre: string) => api.patch<Usuario>('/usuarios/perfil', { nombre }),
  eliminar: () => api.delete('/usuarios/perfil'),
};

// ─── Áreas ───────────────────────────────────────────────────────────────────

export const areasApi = {
  listar: () => api.get<Area[]>('/areas/'),
  crear: (nombre: string, descripcion?: string) => api.post<Area>('/areas/', { nombre, descripcion }),
  obtener: (id: string) => api.get<Area>(`/areas/${id}`),
  actualizar: (id: string, nombre: string, descripcion?: string) =>
    api.patch<Area>(`/areas/${id}`, { nombre, descripcion }),
  eliminar: (id: string) => api.delete(`/areas/${id}`),
  agregarMiembro: (id: string, email?: string, telefono?: string) =>
    api.post<Area>(`/areas/${id}/miembros`, { email, telefono }),
  removerMiembro: (id: string, miembroId: string) =>
    api.delete<Area>(`/areas/${id}/miembros/${miembroId}`),
};

// ─── Proyectos ───────────────────────────────────────────────────────────────

export const proyectosApi = {
  listar: (areaId?: string) => api.get<Proyecto[]>('/proyectos/', { params: { area_id: areaId } }),
  crear: (nombre: string, area_id: string, descripcion?: string) =>
    api.post<Proyecto>('/proyectos/', { nombre, area_id, descripcion }),
  obtener: (id: string) => api.get<Proyecto>(`/proyectos/${id}`),
  actualizar: (id: string, nombre: string, descripcion?: string) =>
    api.patch<Proyecto>(`/proyectos/${id}`, { nombre, descripcion }),
  eliminar: (id: string) => api.delete(`/proyectos/${id}`),
  agregarMiembro: (id: string, email?: string, telefono?: string) =>
    api.post<Proyecto>(`/proyectos/${id}/miembros`, { email, telefono }),
  gestionarColumnas: (id: string, columnas: ColumnaCustom[]) =>
    api.patch<Proyecto>(`/proyectos/${id}/columnas`, { columnas }),
};

// ─── Tareas ──────────────────────────────────────────────────────────────────

export const tareasApi = {
  listarPorProyecto: (proyectoId: string) => api.get<Tarea[]>(`/tareas/proyecto/${proyectoId}`),
  crear: (datos: Partial<Tarea> & { titulo: string; proyecto_id: string }) =>
    api.post<Tarea>('/tareas/', datos),
  actualizar: (id: string, cambios: Partial<Tarea>) => api.patch<Tarea>(`/tareas/${id}`, cambios),
  eliminar: (id: string) => api.delete(`/tareas/${id}`),
  registrarHoras: (id: string, horas: number, descripcion: string, fecha: string) =>
    api.post<HoraLog>(`/tareas/${id}/horas`, { horas, descripcion, fecha }),
  listarHoras: (id: string) => api.get<HoraLog[]>(`/tareas/${id}/horas`),
  actividad: (proyectoId: string, anio: number, mes: number) =>
    api.get<ActividadMensual>(`/tareas/proyecto/${proyectoId}/actividad`, { params: { anio, mes } }),
};

// ─── Sprints ─────────────────────────────────────────────────────────────────

export const sprintsApi = {
  listar: (proyectoId: string) => api.get<Sprint[]>(`/sprints/proyecto/${proyectoId}`),
  crear: (proyectoId: string, datos: Omit<Sprint, 'id' | 'proyecto_id' | 'estado' | 'created_at'>) =>
    api.post<Sprint>(`/sprints/proyecto/${proyectoId}`, datos),
  iniciar: (id: string) => api.post<Sprint>(`/sprints/${id}/iniciar`),
  completar: (id: string) => api.post<Sprint>(`/sprints/${id}/completar`),
  actualizar: (id: string, datos: Partial<Pick<Sprint, 'nombre' | 'objetivo' | 'fecha_inicio' | 'fecha_fin' | 'color'>>) =>
    api.patch<Sprint>(`/sprints/${id}`, datos),
  eliminar: (id: string) => api.delete(`/sprints/${id}`),
};

// ─── Épicas ──────────────────────────────────────────────────────────────────

export const epicasApi = {
  listar: (proyectoId: string) => api.get<Epica[]>(`/epicas/proyecto/${proyectoId}`),
  crear: (proyectoId: string, nombre: string, color?: string, descripcion?: string) =>
    api.post<Epica>(`/epicas/proyecto/${proyectoId}`, { nombre, color, descripcion }),
  actualizar: (id: string, datos: Partial<Epica>) => api.patch<Epica>(`/epicas/${id}`, datos),
  eliminar: (id: string) => api.delete(`/epicas/${id}`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
  listarSalas: () => api.get<SalaChat[]>('/chat/salas'),
  crearDirecto: (destinatarioId: string) =>
    api.post<SalaChat>('/chat/directo', { destinatario_id: destinatarioId }),
  crearGrupo: (nombre: string, miembroIds: string[]) =>
    api.post<SalaChat>('/chat/grupos', { nombre, miembro_ids: miembroIds }),
  historial: (salaId: string) => api.get<Mensaje[]>(`/chat/salas/${salaId}/mensajes`),
  miembrosDeUnaSala: (salaId: string) => api.get<Usuario[]>(`/chat/salas/${salaId}/miembros`),
  compartirTarea: (salaId: string, datos: {
    tarea_id: string;
    tarea_titulo: string;
    tarea_columna: string;
    tarea_prioridad: string;
    tarea_proyecto_id?: string;
    comentario?: string;
    menciones: string[];
  }) => api.post<Mensaje>(`/chat/salas/${salaId}/tarea`, datos),
  enviarImagen: (salaId: string, archivo: File, menciones?: string[]) => {
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('menciones', JSON.stringify(menciones ?? []));
    return api.post<Mensaje>(`/chat/salas/${salaId}/imagen`, form);
  },
  enviarArchivo: (salaId: string, archivo: File) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post<Mensaje>(`/chat/salas/${salaId}/archivo`, form);
  },
};

// ─── Estados (stories) ───────────────────────────────────────────────────────

export const estadosApi = {
  listar: () => api.get<Estado[]>('/estados/'),
  crear: (archivo: File) => {
    const form = new FormData();
    form.append('archivo', archivo);
    return api.post<Estado>('/estados/', form);
  },
  eliminar: (id: string) => api.delete(`/estados/${id}`),
};

// ─── Evidencias ──────────────────────────────────────────────────────────────

export const evidenciasApi = {
  listar: (tareaId: string) => api.get<Evidencia[]>(`/evidencias/tarea/${tareaId}`),

  crear: (tareaId: string, archivos: File[], comentario: string) => {
    const form = new FormData();
    form.append('comentario', comentario);
    archivos.forEach((f) => form.append('archivos', f));
    return api.post<Evidencia>(`/evidencias/tarea/${tareaId}`, form);
  },

  actualizar: (evidenciaId: string, datos: {
    comentario: string;
    nuevosArchivos: File[];
    indicesEliminar: number[];
  }) => {
    const form = new FormData();
    form.append('comentario', datos.comentario);
    form.append('indices_eliminar', JSON.stringify(datos.indicesEliminar));
    datos.nuevosArchivos.forEach((f) => form.append('nuevos_archivos', f));
    return api.patch<Evidencia>(`/evidencias/${evidenciaId}`, form);
  },

  eliminar: (evidenciaId: string) => api.delete(`/evidencias/${evidenciaId}`),
};

// ─── Checklists ──────────────────────────────────────────────────────────────

export const checklistsApi = {
  listar: (tareaId: string) => api.get<Checklist[]>(`/checklists/tarea/${tareaId}`),

  crear: (tareaId: string, nombre: string) =>
    api.post<Checklist>(`/checklists/tarea/${tareaId}`, { nombre, items: [] }),

  actualizar: (checklistId: string, datos: {
    nombre?: string;
    items?: Array<{ id: string; texto: string; completado: boolean }>;
  }) => api.patch<Checklist>(`/checklists/${checklistId}`, datos),

  eliminar: (checklistId: string) => api.delete(`/checklists/${checklistId}`),
};

export default api;
