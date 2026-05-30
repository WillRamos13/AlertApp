import { z } from 'zod';
export const validationSchema = z.object({
  decision: z.enum(['VALIDADO', 'RECHAZADO']),
  observaciones: z.string().trim().max(1000).optional().default(''),
  evidenciaPublicable: z.boolean().default(false)
}).superRefine((data, ctx) => {
  if (data.decision === 'RECHAZADO' && data.observaciones.length < 10) {
    ctx.addIssue({ code: 'custom', path: ['observaciones'], message: 'Explica el motivo del rechazo.' });
  }
});
