import type { Request, Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { incidentTypes, systemParameters } from '../../db/schema';
import { ApiError } from '../../shared/errors/ApiError';
import { writeAuditLog } from '../audit/audit.service';
import { legalNoticeParameterSchema, toggleIncidentTypeSchema } from './parameters.schemas';

function idFrom(request: Request): string {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  if (!id) throw new ApiError(400, 'Identificador inválido.', 'INVALID_ID');
  return id;
}
export async function listParameters(_req: Request, res: Response): Promise<void> {
  const parameters = await db.select().from(systemParameters).orderBy(asc(systemParameters.clave));
  const types = await db.select().from(incidentTypes).orderBy(asc(incidentTypes.nombre));
  res.json({ ok: true, data: { parameters, incidentTypes: types } });
}
export async function updateParameter(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const clave = Array.isArray(req.params.clave) ? req.params.clave[0] : req.params.clave;
  if (!clave) throw new ApiError(400, 'Clave inválida.', 'INVALID_KEY');
  const current = await db.select().from(systemParameters).where(eq(systemParameters.clave, clave)).limit(1);
  if (!current[0] || !current[0].editable) throw new ApiError(404, 'Parámetro no editable desde la aplicación.', 'PARAMETER_NOT_EDITABLE');
  if (clave !== 'AVISO_LEGAL') throw new ApiError(403, 'Este parámetro requiere configuración de despliegue.', 'PARAMETER_PROTECTED');
  const parsed = legalNoticeParameterSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'Valor de parámetro inválido.', 'VALIDATION_ERROR', parsed.error.flatten());
  const rows = await db.update(systemParameters).set({ valor: parsed.data.valor, updatedBy: req.user.id, updatedAt: new Date() }).where(eq(systemParameters.clave, clave)).returning();
  await writeAuditLog({ actorUserId: req.user.id, accion: 'PARAMETRO_ACTUALIZADO', entidad: 'PARAMETRO', entidadId: rows[0].id, resultado: 'EXITO', detalleSeguro: { clave }, ip: req.ip });
  res.json({ ok: true, data: rows[0], message: 'Parámetro actualizado.' });
}
export async function toggleIncidentType(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const id = idFrom(req);
  const parsed = toggleIncidentTypeSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(422, 'Indica si el tipo estará activo.', 'VALIDATION_ERROR', parsed.error.flatten());
  const rows = await db.update(incidentTypes).set({ activo: parsed.data.activo }).where(eq(incidentTypes.id, id)).returning();
  if (!rows[0]) throw new ApiError(404, 'Tipo no encontrado.', 'INCIDENT_TYPE_NOT_FOUND');
  await writeAuditLog({ actorUserId: req.user.id, accion: 'TIPO_INCIDENTE_ACTUALIZADO', entidad: 'TIPO_INCIDENTE', entidadId: id, resultado: 'EXITO', detalleSeguro: { activo: parsed.data.activo }, ip: req.ip });
  res.json({ ok: true, data: rows[0], message: 'Tipo de incidente actualizado.' });
}
