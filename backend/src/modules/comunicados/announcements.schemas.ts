import { z } from 'zod';
export const announcementBodySchema = z.object({
  titulo: z.string().trim().min(5).max(160),
  contenido: z.string().trim().min(15).max(3000),
  nivel: z.enum(['INFORMATIVO','PREVENTIVO','URGENTE']).default('PREVENTIVO'),
  zonaReferencia: z.string().trim().max(120).optional().default(''),
  expiresAt: z.string().datetime().nullable().optional()
});
export const announcementUpdateSchema = announcementBodySchema.partial();
