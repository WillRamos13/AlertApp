import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { ACCESS_COOKIE_NAME } from '../config/cookies';
import { allowedOrigins } from '../config/env';
import { verifyAccessToken } from '../shared/security/tokens';

let io: Server | null = null;
function cookieValue(raw: string | undefined, name: string): string | undefined {
  return raw?.split(';').map((part) => part.trim().split('=')).find(([key]) => key === name)?.slice(1).join('=');
}
export function configureSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: allowedOrigins, credentials: true } });
  io.on('connection', (socket) => {
    socket.join('publico');
    const token = cookieValue(socket.handshake.headers.cookie, ACCESS_COOKIE_NAME);
    if (!token) return;
    try {
      const user = verifyAccessToken(decodeURIComponent(token));
      if (user.role === 'AGENTE') socket.join('agente');
      if (user.role === 'ADMIN') socket.join('admin');
      socket.data.user = { id: user.sub, role: user.role };
    } catch {
      // El canal público permanece disponible; los canales operativos exigen cookie válida.
    }
  });
  return io;
}
export function emitPublicEvent(event: string, payload: unknown): void { io?.to('publico').emit(event, payload); }
export function emitOperationsEvent(event: string, payload: unknown): void { io?.to('agente').to('admin').emit(event, payload); }
export function closeSocketServer(): Promise<void> {
  if (!io) return Promise.resolve();
  return new Promise((resolve) => io!.close(() => { io = null; resolve(); }));
}
