import path from 'node:path';
import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { pool, db } from '../../config/database';
import { evidences, incidentTypes, reports, reportValidations } from '../../db/schema';
import { ApiError } from '../../shared/errors/ApiError';
import { writeAuditLog } from '../audit/audit.service';
import { assertEvidenceContent, removeStoredEvidence, signedEvidenceUrl, storeEvidence, type StoredEvidence } from '../evidencias/evidence.service';
import { emitOperationsEvent, emitPublicEvent } from '../../realtime/socket';
import { createReportSchema, reportFiltersSchema } from './reports.schemas';

function parseId(request: Request): string {
  const value = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  if (!value) throw new ApiError(400, 'Identificador inválido.', 'INVALID_ID');
  return value;
}
function buildFilter(query: Record<string, unknown>, includePrivateStates = false) {
  const parsed = reportFiltersSchema.safeParse(query);
  if (!parsed.success) throw new ApiError(422, 'Filtros inválidos.', 'VALIDATION_ERROR', parsed.error.flatten());
  const { estado, tipo, distrito, desde, hasta, page, limit } = parsed.data;
  const values: unknown[] = [];
  const conditions: string[] = [];
  if (!includePrivateStates) conditions.push(`r.visible_publicamente = true AND r.estado IN ('PENDIENTE','VALIDADO')`);
  if (estado) { values.push(estado); conditions.push(`r.estado = $${values.length}`); }
  if (tipo) { values.push(tipo); conditions.push(`t.codigo = $${values.length}`); }
  if (distrito) { values.push(`%${distrito}%`); conditions.push(`r.distrito ILIKE $${values.length}`); }
  if (desde) { values.push(desde); conditions.push(`r.fecha_hora_incidente >= $${values.length}`); }
  if (hasta) { values.push(hasta); conditions.push(`r.fecha_hora_incidente <= $${values.length}`); }
  return { values, where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', page, limit };
}
const internalSelect = `r.id, r.titulo, r.descripcion, r.estado, r.prioridad_reportada as "prioridadReportada", r.ubicacion_referencia as "ubicacionReferencia", r.distrito, r.fecha_hora_incidente as "fechaHoraIncidente", r.created_at as "createdAt", r.revisado_at as "revisadoAt", r.origen, r.es_dato_demostrativo as "esDatoDemostrativo", t.id as "tipoIncidenteId", t.codigo as "tipoCodigo", t.nombre as "tipoNombre", t.icono, t.color_marcador as "colorMarcador", ST_Y(r.ubicacion_exacta::geometry) as latitud, ST_X(r.ubicacion_exacta::geometry) as longitud`;
const publicSelect = `r.id,
  CASE WHEN r.estado='PENDIENTE' THEN t.nombre || ' — reporte ciudadano no verificado' ELSE r.titulo END as titulo,
  CASE WHEN r.estado='PENDIENTE' THEN 'El detalle textual se mostrará cuando el reporte sea revisado por un agente operativo.' ELSE r.descripcion END as descripcion,
  r.estado, r.prioridad_reportada as "prioridadReportada",
  CASE WHEN r.estado='PENDIENTE' THEN 'Ubicación indicada en el mapa' ELSE r.ubicacion_referencia END as "ubicacionReferencia",
  CASE WHEN r.estado='PENDIENTE' THEN 'Ica' ELSE r.distrito END as distrito,
  r.fecha_hora_incidente as "fechaHoraIncidente", r.created_at as "createdAt", r.revisado_at as "revisadoAt", r.origen,
  r.es_dato_demostrativo as "esDatoDemostrativo", t.id as "tipoIncidenteId", t.codigo as "tipoCodigo", t.nombre as "tipoNombre", t.icono, t.color_marcador as "colorMarcador",
  ST_Y(r.ubicacion_exacta::geometry) as latitud, ST_X(r.ubicacion_exacta::geometry) as longitud`;

export async function listPublicMapReports(request: Request, response: Response): Promise<void> {
  const { values, where, page, limit } = buildFilter(request.query as Record<string, unknown>);
  values.push(limit, (page - 1) * limit);
  const result = await pool.query(`SELECT ${publicSelect} FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id ${where} ORDER BY r.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  response.json({ ok: true, data: result.rows, meta: { page, limit, warning: 'Los reportes pendientes muestran ubicación exacta por decisión del proyecto, pero su contenido aún no ha sido verificado.' } });
}
export async function getPublicReport(request: Request, response: Response): Promise<void> {
  const id = parseId(request);
  const result = await pool.query(`SELECT ${publicSelect} FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id WHERE r.id=$1 AND r.visible_publicamente=true AND r.estado IN ('PENDIENTE','VALIDADO') LIMIT 1`, [id]);
  if (!result.rows[0]) throw new ApiError(404, 'Reporte no disponible.', 'REPORT_NOT_FOUND');
  const publicEvidence = await db.select({ id: evidences.id, mimeType: evidences.mimeType }).from(evidences).where(and(eq(evidences.reportId, id), eq(evidences.visiblePublicamente, true)));
  response.json({ ok: true, data: { ...result.rows[0], evidencias: publicEvidence } });
}
export async function createReport(request: Request, response: Response): Promise<void> {
  if (!request.user || request.user.role !== 'CIUDADANO') throw new ApiError(403, 'Solo un ciudadano puede reportar incidentes.', 'FORBIDDEN');
  const parsed = createReportSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(422, 'Revisa la información del reporte.', 'VALIDATION_ERROR', parsed.error.flatten());
  if (parsed.data.fechaHoraIncidente.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new ApiError(422, 'La fecha del incidente no puede estar en el futuro.', 'INVALID_INCIDENT_DATE');
  }
  const typeExists = await db.select({ id: incidentTypes.id }).from(incidentTypes).where(and(eq(incidentTypes.id, parsed.data.tipoIncidenteId), eq(incidentTypes.activo, true))).limit(1);
  if (!typeExists[0]) throw new ApiError(422, 'Selecciona un tipo de incidente habilitado.', 'INVALID_INCIDENT_TYPE');
  const files = (request.files as Express.Multer.File[] | undefined) ?? [];
  files.forEach(assertEvidenceContent);
  const inserted = await pool.query(`INSERT INTO reportes (ciudadano_id,tipo_incidente_id,titulo,descripcion,ubicacion_exacta,ubicacion_referencia,distrito,fecha_hora_incidente,prioridad_reportada) VALUES ($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326),$7,$8,$9,$10) RETURNING id,estado,created_at as "createdAt"`, [request.user.id, parsed.data.tipoIncidenteId, parsed.data.titulo, parsed.data.descripcion, parsed.data.longitud, parsed.data.latitud, parsed.data.ubicacionReferencia || null, parsed.data.distrito, parsed.data.fechaHoraIncidente, parsed.data.prioridadReportada]);
  const report = inserted.rows[0] as { id: string; estado: string; createdAt: string };
  const stored: StoredEvidence[] = [];
  try {
    for (const file of files) {
      const result = await storeEvidence(file, report.id);
      stored.push(result);
      await db.insert(evidences).values({ reportId: report.id, uploadedByUserId: request.user.id, ...result });
    }
  } catch (error) {
    await Promise.all(stored.map((item) => removeStoredEvidence(item)));
    await db.delete(reports).where(eq(reports.id, report.id));
    await writeAuditLog({ actorUserId: request.user.id, accion: 'REPORTE_CREACION_FALLIDA', entidad: 'REPORTE', entidadId: report.id, resultado: 'ERROR', detalleSeguro: { motivo: 'Evidencia inválida o no almacenada.' }, ip: request.ip });
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'No fue posible almacenar la evidencia. El reporte no fue publicado.', 'EVIDENCE_STORAGE_ERROR');
  }
  await writeAuditLog({ actorUserId: request.user.id, accion: 'REPORTE_CREADO', entidad: 'REPORTE', entidadId: report.id, resultado: 'EXITO', detalleSeguro: { estado: 'PENDIENTE', evidencias: files.length }, ip: request.ip });
  emitPublicEvent('reporte:creado', { id: report.id, estado: 'PENDIENTE' });
  emitOperationsEvent('dashboard:actualizado', { entidad: 'REPORTE', id: report.id });
  response.status(201).json({ ok: true, data: report, message: 'Reporte publicado como pendiente de validación.' });
}
export async function listMyReports(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const parsed = reportFiltersSchema.safeParse(request.query);
  if (!parsed.success) throw new ApiError(422, 'Filtros inválidos.', 'VALIDATION_ERROR', parsed.error.flatten());
  const values: unknown[] = [request.user.id]; const conditions = ['r.ciudadano_id=$1'];
  if (parsed.data.estado) { values.push(parsed.data.estado); conditions.push(`r.estado=$${values.length}`); }
  if (parsed.data.desde) { values.push(parsed.data.desde); conditions.push(`r.created_at >= $${values.length}`); }
  if (parsed.data.hasta) { values.push(parsed.data.hasta); conditions.push(`r.created_at <= $${values.length}`); }
  values.push(parsed.data.limit, (parsed.data.page - 1) * parsed.data.limit);
  const result = await pool.query(`SELECT ${internalSelect} FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id WHERE ${conditions.join(' AND ')} ORDER BY r.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  response.json({ ok: true, data: result.rows, pagination: { page: parsed.data.page, limit: parsed.data.limit } });
}
export async function getMyReport(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const id = parseId(request);
  const result = await pool.query(`SELECT ${internalSelect} FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id WHERE r.id=$1 AND r.ciudadano_id=$2 LIMIT 1`, [id, request.user.id]);
  if (!result.rows[0]) throw new ApiError(404, 'Reporte no encontrado.', 'REPORT_NOT_FOUND');
  const evidence = await db.select({ id: evidences.id, mimeType: evidences.mimeType, originalName: evidences.originalName, createdAt: evidences.createdAt, visiblePublicamente: evidences.visiblePublicamente }).from(evidences).where(eq(evidences.reportId, id));
  const validations = await db.select({ decision: reportValidations.decision, observaciones: reportValidations.observaciones, createdAt: reportValidations.createdAt }).from(reportValidations).where(eq(reportValidations.reportId, id));
  response.json({ ok: true, data: { ...result.rows[0], evidencias: evidence, validacion: validations[0] ?? null } });
}
export async function withdrawReport(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const id = parseId(request);
  const changed = await db.update(reports).set({ estado: 'RETIRADO', visiblePublicamente: false, updatedAt: new Date() }).where(and(eq(reports.id, id), eq(reports.citizenId, request.user.id), eq(reports.estado, 'PENDIENTE'))).returning({ id: reports.id });
  if (!changed[0]) throw new ApiError(409, 'Solo puedes retirar reportes propios pendientes.', 'REPORT_CANNOT_BE_WITHDRAWN');
  await writeAuditLog({ actorUserId: request.user.id, accion: 'REPORTE_RETIRADO', entidad: 'REPORTE', entidadId: id, resultado: 'EXITO', ip: request.ip });
  emitPublicEvent('reporte:retirado', { id });
  response.json({ ok: true, message: 'Reporte retirado correctamente.' });
}
export async function accessEvidence(request: Request, response: Response): Promise<void> {
  const id = parseId(request);
  const data = await pool.query(`SELECT e.*, r.ciudadano_id, r.estado FROM evidencias e JOIN reportes r ON r.id=e.reporte_id WHERE e.id=$1 LIMIT 1`, [id]);
  const evidence = data.rows[0];
  if (!evidence) throw new ApiError(404, 'Evidencia no encontrada.', 'EVIDENCE_NOT_FOUND');
  const isPrivileged = request.user && (request.user.role === 'AGENTE' || request.user.role === 'ADMIN' || request.user.id === evidence.ciudadano_id);
  const isPublic = evidence.visible_publicamente && evidence.estado === 'VALIDADO';
  if (!isPrivileged && !isPublic) throw new ApiError(403, 'No tienes acceso a esta evidencia.', 'FORBIDDEN');
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Disposition', 'inline');
  if (evidence.proveedor === 'LOCAL') { response.type(evidence.mime_type).sendFile(path.resolve(evidence.referencia_almacenamiento)); return; }
  const remote = await fetch(signedEvidenceUrl(evidence.public_id));
  if (!remote.ok) throw new ApiError(502, 'No fue posible recuperar la evidencia protegida.', 'EVIDENCE_PROVIDER_ERROR');
  const buffer = Buffer.from(await remote.arrayBuffer());
  response.type(evidence.mime_type).send(buffer);
}
