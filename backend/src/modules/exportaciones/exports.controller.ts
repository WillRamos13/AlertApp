import type { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db, pool } from '../../config/database';
import { exportsHistory } from '../../db/schema';
import { ApiError } from '../../shared/errors/ApiError';
import { writeAuditLog } from '../audit/audit.service';

function csvEscape(value: unknown): string {
  let str = value == null ? '' : String(value);
  if (/^[=+@-]/.test(str)) str = `'${str}`;
  return `"${str.replaceAll('"', '""')}"`;
}
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  return [keys.map(csvEscape).join(','), ...rows.map((row) => keys.map((key) => csvEscape(row[key])).join(','))].join('\n');
}
function sendCsv(response: Response, filename: string, csv: string): void {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.send('\uFEFF' + csv);
}
export async function listExports(_req: Request, res: Response): Promise<void> {
  const data = await db.select().from(exportsHistory).orderBy(desc(exportsHistory.startedAt)).limit(50);
  res.json({ ok: true, data });
}
export async function exportReports(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const created = await db.insert(exportsHistory).values({ requestedBy: req.user.id, tipo: 'CSV_REPORTES' }).returning();
  try {
    const result = await pool.query(`SELECT r.id,t.nombre as tipo,r.titulo,r.descripcion,r.estado,r.prioridad_reportada,r.distrito,r.fecha_hora_incidente,r.origen,r.es_dato_demostrativo,r.created_at,r.revisado_at FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id ORDER BY r.created_at DESC`);
    const csv = toCsv(result.rows);
    await db.update(exportsHistory).set({ estado: 'COMPLETADO', finishedAt: new Date(), detalle: `${result.rows.length} reportes exportados` }).where(eq(exportsHistory.id, created[0].id));
    await writeAuditLog({ actorUserId: req.user.id, accion: 'EXPORTACION_REPORTES_GENERADA', entidad: 'EXPORTACION', entidadId: created[0].id, resultado: 'EXITO', detalleSeguro: { filas: result.rows.length }, ip: req.ip });
    sendCsv(res, 'alertapp-reportes.csv', csv);
  } catch (error) {
    await db.update(exportsHistory).set({ estado: 'FALLIDO', finishedAt: new Date(), detalle: 'No se pudo generar la exportación.' }).where(eq(exportsHistory.id, created[0].id));
    throw error;
  }
}
export async function exportLogs(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new ApiError(401, 'Debes iniciar sesión.', 'AUTH_REQUIRED');
  const created = await db.insert(exportsHistory).values({ requestedBy: req.user.id, tipo: 'CSV_AUDITORIA' }).returning();
  try {
    const result = await pool.query(`SELECT id,accion,entidad,resultado,created_at FROM logs_actividad ORDER BY created_at DESC`);
    const csv = toCsv(result.rows);
    await db.update(exportsHistory).set({ estado: 'COMPLETADO', finishedAt: new Date(), detalle: `${result.rows.length} registros exportados` }).where(eq(exportsHistory.id, created[0].id));
    await writeAuditLog({ actorUserId: req.user.id, accion: 'EXPORTACION_LOGS_GENERADA', entidad: 'EXPORTACION', entidadId: created[0].id, resultado: 'EXITO', detalleSeguro: { filas: result.rows.length }, ip: req.ip });
    sendCsv(res, 'alertapp-auditoria.csv', csv);
  } catch (error) {
    await db.update(exportsHistory).set({ estado: 'FALLIDO', finishedAt: new Date(), detalle: 'No se pudo generar la exportación.' }).where(eq(exportsHistory.id, created[0].id));
    throw error;
  }
}
export async function backupStatus(_req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: { applicationExports: true, databaseBackupManagedByHosting: true, message: 'La aplicación genera exportaciones auditadas. El respaldo integral y recuperación de PostgreSQL deben configurarse en Render para producción.' } });
}
