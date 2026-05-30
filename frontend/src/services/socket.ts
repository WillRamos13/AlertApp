import { io } from 'socket.io-client';
function socketUrl(): string {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return 'http://localhost:4000';
  throw new Error('Falta configurar VITE_SOCKET_URL para publicar AlertApp.');
}
export const socket = io(socketUrl(), { autoConnect: false, withCredentials: true });
