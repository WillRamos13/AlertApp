import { z } from 'zod';
export const createReportSchema = z.object({
  tipoIncidenteId: z.string().uuid(),
  titulo: z.string().trim().min(5, 'Ingresa un título descriptivo.').max(150),
  descripcion: z.string().trim().min(15, 'Describe el incidente con mayor detalle.').max(1500),
  latitud: z.coerce.number().min(-90).max(90),
  longitud: z.coerce.number().min(-180).max(180),
  ubicacionReferencia: z.string().trim().max(255).optional().default(''),
  distrito: z.string().trim().min(2).max(100).default('Ica'),
  fechaHoraIncidente: z.coerce.date(),
  prioridadReportada: z.enum(['BAJA', 'MEDIA', 'ALTA']).default('MEDIA')
});
export const reportFiltersSchema = z.object({
  estado: z.enum(['PENDIENTE', 'VALIDADO', 'RECHAZADO', 'RETIRADO']).optional(),
  tipo: z.string().max(50).optional(),
  distrito: z.string().max(100).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30)
});
export const uuidParamSchema = z.object({ id: z.string().uuid() });
