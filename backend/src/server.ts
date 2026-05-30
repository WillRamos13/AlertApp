import { createServer } from 'node:http';
import { createApp } from './app';
import { closeDatabaseConnection, verifyDatabaseConnection } from './config/database';
import { env } from './config/env';
import { closeSocketServer, configureSocketServer } from './realtime/socket';
async function startServer() {
  await verifyDatabaseConnection();
  const httpServer = createServer(createApp());
  configureSocketServer(httpServer);
  httpServer.listen(env.PORT, () => console.log(`AlertApp API ejecutándose en puerto ${env.PORT} (${env.NODE_ENV}).`));
  const shutdown = async (signal: string) => {
    console.log(`${signal} recibido. Cerrando AlertApp API...`);
    await closeSocketServer();
    httpServer.close(async () => { await closeDatabaseConnection(); process.exit(0); });
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
startServer().catch(async (error) => { console.error('No fue posible iniciar AlertApp API:', error); await closeDatabaseConnection(); process.exit(1); });
