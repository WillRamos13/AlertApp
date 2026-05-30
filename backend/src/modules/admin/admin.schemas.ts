import { z } from 'zod';
const strongPassword=z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
export const updateUserStatusSchema=z.object({estado:z.enum(['ACTIVO','INACTIVO','BLOQUEADO']),motivo:z.string().trim().min(4).max(250)});
export const updateUserSchema=z.object({nombres:z.string().trim().min(2).max(100),apellidos:z.string().trim().min(2).max(120),email:z.string().trim().toLowerCase().email().max(255)});
export const createAgentSchema=z.object({nombres:z.string().trim().min(2).max(100),apellidos:z.string().trim().min(2).max(120),email:z.string().trim().toLowerCase().email().max(255),password:strongPassword});
export const usersQuerySchema=z.object({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().positive().max(50).default(10),search:z.string().trim().max(100).optional(),rol:z.enum(['CIUDADANO','AGENTE','ADMIN']).optional(),estado:z.enum(['ACTIVO','INACTIVO','BLOQUEADO']).optional()});
export const logsQuerySchema=z.object({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().positive().max(100).default(20),accion:z.string().trim().max(100).optional(),entidad:z.string().trim().max(60).optional(),actor:z.string().trim().max(100).optional(),desde:z.coerce.date().optional(),hasta:z.coerce.date().optional()});
export const adminReportsQuerySchema=z.object({page:z.coerce.number().int().positive().default(1),limit:z.coerce.number().int().positive().max(100).default(20),estado:z.enum(['PENDIENTE','VALIDADO','RECHAZADO','RETIRADO']).optional(),tipo:z.string().trim().max(50).optional()});
export const updateReportVisibilitySchema=z.object({visiblePublicamente:z.boolean(),motivo:z.string().trim().min(6).max(250)});
