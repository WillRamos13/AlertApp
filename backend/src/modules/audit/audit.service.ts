import { db } from '../../config/database';
import { activityLogs } from '../../db/schema';
import { hashNetworkValue } from '../../shared/security/network';

interface AuditInput {
  actorUserId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  resultado: 'EXITO' | 'ERROR';
  detalleSeguro?: Record<string, unknown>;
  ip?: string | null;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      actorUserId: input.actorUserId ?? null,
      accion: input.accion,
      entidad: input.entidad,
      entidadId: input.entidadId ?? null,
      resultado: input.resultado,
      detalleSeguro: input.detalleSeguro ?? {},
      ipHash: hashNetworkValue(input.ip)
    });
  } catch (error) {
    console.error('No se pudo registrar auditoría:', error);
  }
}
