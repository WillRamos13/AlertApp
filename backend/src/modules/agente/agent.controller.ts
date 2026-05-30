import type { Request, Response } from 'express';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db, pool } from '../../config/database';
import { evidences, reports, reportValidations } from '../../db/schema';
import { ApiError } from '../../shared/errors/ApiError';
import { emitOperationsEvent, emitPublicEvent } from '../../realtime/socket';
import { writeAuditLog } from '../audit/audit.service';
import { reportFiltersSchema } from '../reportes/reports.schemas';
import { validationSchema } from './agent.schemas';
const detailSelect = `r.id, r.titulo, r.descripcion, r.estado, r.prioridad_reportada as "prioridadReportada", r.ubicacion_referencia as "ubicacionReferencia", r.distrito, r.fecha_hora_incidente as "fechaHoraIncidente", r.created_at as "createdAt", r.revisado_at as "revisadoAt", r.origen, r.es_dato_demostrativo as "esDatoDemostrativo", t.id as "tipoIncidenteId", t.codigo as "tipoCodigo", t.nombre as "tipoNombre", t.color_marcador as "colorMarcador", ST_Y(r.ubicacion_exacta::geometry) as latitud, ST_X(r.ubicacion_exacta::geometry) as longitud`;
function idFrom(request: Request) { const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id; if (!id) throw new ApiError(400, 'Identificador inválido.', 'INVALID_ID'); return id; }
export async function dashboard(_request: Request, response: Response): Promise<void> {
  const totals = await pool.query(`SELECT COUNT(*) FILTER (WHERE estado='PENDIENTE')::int as pendientes, COUNT(*) FILTER (WHERE estado='VALIDADO')::int as validados, COUNT(*) FILTER (WHERE estado='RECHAZADO')::int as rechazados, COUNT(*) FILTER (WHERE estado='VALIDADO' AND revisado_at::date=current_date)::int as "validadosHoy" FROM reportes`);
  const recent = await pool.query(`SELECT r.id,r.titulo,r.estado,r.created_at as "createdAt",t.nombre as "tipoNombre" FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id ORDER BY r.created_at DESC LIMIT 6`);
  response.json({ ok: true, data: { ...totals.rows[0], actividadReciente: recent.rows } });
}
export async function pendingReports(request: Request, response: Response): Promise<void> {
  const parsed = reportFiltersSchema.safeParse(request.query);
  if (!parsed.success) throw new ApiError(422, 'Filtros inválidos.', 'VALIDATION_ERROR', parsed.error.flatten());
  const values: unknown[] = []; const filters = [`r.estado='PENDIENTE'`];
  if (parsed.data.tipo) { values.push(parsed.data.tipo); filters.push(`t.codigo=$${values.length}`); }
  if (parsed.data.desde) { values.push(parsed.data.desde); filters.push(`r.created_at >= $${values.length}`); }
  if (parsed.data.hasta) { values.push(parsed.data.hasta); filters.push(`r.created_at <= $${values.length}`); }
  values.push(parsed.data.limit, (parsed.data.page-1)*parsed.data.limit);
  const data = await pool.query(`SELECT ${detailSelect} FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id WHERE ${filters.join(' AND ')} ORDER BY r.created_at ASC LIMIT $${values.length-1} OFFSET $${values.length}`, values);
  response.json({ ok: true, data: data.rows });
}
export async function reportDetail(request: Request, response: Response): Promise<void> {
  const id=idFrom(request);
  const data=await pool.query(`SELECT ${detailSelect}, u.nombres || ' ' || u.apellidos as "ciudadanoNombre" FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id JOIN usuarios u ON u.id=r.ciudadano_id WHERE r.id=$1 LIMIT 1`,[id]);
  if(!data.rows[0]) throw new ApiError(404,'Reporte no encontrado.','REPORT_NOT_FOUND');
  const evidence = await db.select({ id:evidences.id, originalName:evidences.originalName, mimeType:evidences.mimeType, sizeBytes:evidences.sizeBytes, visiblePublicamente:evidences.visiblePublicamente }).from(evidences).where(eq(evidences.reportId,id));
  const validation = await db.select().from(reportValidations).where(eq(reportValidations.reportId,id)).orderBy(desc(reportValidations.createdAt)).limit(1);
  response.json({ok:true,data:{...data.rows[0],evidencias:evidence,validacion:validation[0]??null}});
}
export async function decideReport(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const id = idFrom(request);
  const parsed = validationSchema.safeParse(request.body);
  if (!parsed.success) throw new ApiError(422, 'Datos de validación inválidos.', 'VALIDATION_ERROR', parsed.error.flatten());
  const publicEvidence = parsed.data.decision === 'VALIDADO' && parsed.data.evidenciaPublicable;
  await db.transaction(async (tx) => {
    const updated = await tx.update(reports).set({
      estado: parsed.data.decision,
      revisadoAt: new Date(),
      visiblePublicamente: parsed.data.decision === 'VALIDADO',
      updatedAt: new Date()
    }).where(and(eq(reports.id, id), eq(reports.estado, 'PENDIENTE'))).returning({ id: reports.id });
    if (!updated[0]) {
      const exists = await tx.select({ id: reports.id }).from(reports).where(eq(reports.id, id)).limit(1);
      if (!exists[0]) throw new ApiError(404, 'Reporte no encontrado.', 'REPORT_NOT_FOUND');
      throw new ApiError(409, 'Este reporte ya fue revisado por otro agente.', 'REPORT_ALREADY_REVIEWED');
    }
    await tx.insert(reportValidations).values({
      reportId: id,
      agentId: request.user!.id,
      decision: parsed.data.decision,
      observaciones: parsed.data.observaciones || null,
      evidenciaPublicable: publicEvidence
    });
    if (publicEvidence) {
      await tx.update(evidences).set({ visiblePublicamente: true, aprobadaPorAgente: true }).where(eq(evidences.reportId, id));
    }
  });
  await writeAuditLog({ actorUserId: request.user.id, accion: parsed.data.decision === 'VALIDADO' ? 'REPORTE_VALIDADO' : 'REPORTE_RECHAZADO', entidad: 'REPORTE', entidadId: id, resultado: 'EXITO', detalleSeguro: { evidenciaPublicable: publicEvidence }, ip: request.ip });
  emitPublicEvent(parsed.data.decision === 'VALIDADO' ? 'reporte:validado' : 'reporte:rechazado', { id, estado: parsed.data.decision });
  emitOperationsEvent('dashboard:actualizado', { entidad: 'REPORTE', id });
  response.json({ ok: true, data: { id, estado: parsed.data.decision }, message: `Reporte ${parsed.data.decision.toLowerCase()} correctamente.` });
}
