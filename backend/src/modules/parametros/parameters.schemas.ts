import { z } from 'zod';

export const legalNoticeParameterSchema = z.object({
  valor: z.object({
    texto: z.string().trim().min(20, 'El aviso debe ser suficientemente claro.').max(500)
  })
});

export const toggleIncidentTypeSchema = z.object({ activo: z.boolean() });
