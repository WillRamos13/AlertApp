import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

function requiredApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return 'http://localhost:4000/api/v1';
  throw new Error('Falta configurar VITE_API_URL para publicar AlertApp.');
}
const api = axios.create({ baseURL: requiredApiBase(), withCredentials: true });
let csrfToken = '';
export async function ensureCsrf(): Promise<string> { if (csrfToken) return csrfToken; const { data } = await api.get('/auth/csrf'); csrfToken = data.data.csrfToken; return csrfToken; }
api.interceptors.request.use(async (config) => { const method = (config.method ?? 'get').toLowerCase(); if (!['get', 'head', 'options'].includes(method)) { config.headers['x-csrf-token'] = await ensureCsrf(); } return config; });
api.interceptors.response.use((response) => response, async (error: AxiosError) => { const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined; if (error.response?.status === 401 && config && !config._retry && !String(config.url).includes('/auth/')) { config._retry = true; try { await ensureCsrf(); await api.post('/auth/refresh'); return api.request(config); } catch { /* la protección de ruta dirigirá al login */ } } throw error; });
export function apiMessage(error: unknown): string { if (axios.isAxiosError(error)) { const payload = error.response?.data as { error?: { message?: string } } | undefined; return payload?.error?.message ?? 'No se pudo completar la acción.'; } return error instanceof Error ? error.message : 'No se pudo completar la acción.'; }
export async function downloadPost(path: string, filename: string): Promise<void> { const response = await api.post(path, {}, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
export default api;
