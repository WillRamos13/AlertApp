import type { Request, Response } from 'express';
import { pool } from '../../config/database';
export async function overview(request: Request, response: Response): Promise<void> {
  const desde = typeof request.query.desde === 'string' ? request.query.desde : null;
  const hasta = typeof request.query.hasta === 'string' ? request.query.hasta : null;
  const values: unknown[]=[]; const conditions: string[]=[];
  if(desde){ values.push(desde); conditions.push(`r.created_at >= $${values.length}`); }
  if(hasta){ values.push(hasta); conditions.push(`r.created_at <= $${values.length}`); }
  const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
  const byType=await pool.query(`SELECT t.nombre as label, COUNT(r.id)::int as value FROM tipos_incidente t LEFT JOIN reportes r ON r.tipo_incidente_id=t.id ${where} GROUP BY t.id,t.nombre ORDER BY value DESC`,values);
  const byStatus=await pool.query(`SELECT estado as label, COUNT(*)::int as value FROM reportes r ${where} GROUP BY estado ORDER BY value DESC`,values);
  const trend=await pool.query(`SELECT to_char(date_trunc('day',r.created_at),'YYYY-MM-DD') as label, COUNT(*)::int as value FROM reportes r ${where} GROUP BY date_trunc('day',r.created_at) ORDER BY date_trunc('day',r.created_at)`,values);
  response.json({ok:true,data:{byType:byType.rows,byStatus:byStatus.rows,trend:trend.rows,disclaimer:'Estadísticas de reportes registrados en AlertApp; no constituyen datos oficiales de criminalidad.'}});
}
