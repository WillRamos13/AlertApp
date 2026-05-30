import type { Request, Response } from 'express';
import { and, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db, pool } from '../../config/database';
import { activityLogs, evidences, reportValidations, roles, users } from '../../db/schema';
import { ApiError } from '../../shared/errors/ApiError';
import { hashPassword } from '../../shared/security/password';
import { writeAuditLog } from '../audit/audit.service';
import { adminReportsQuerySchema, createAgentSchema, logsQuerySchema, updateReportVisibilitySchema, updateUserSchema, usersQuerySchema } from './admin.schemas';
function idFrom(request:Request){const id=Array.isArray(request.params.id)?request.params.id[0]:request.params.id;if(!id)throw new ApiError(400,'Identificador inválido.','INVALID_ID');return id;}
export async function dashboard(_request: Request, response: Response): Promise<void> {
  const summary=await pool.query(`SELECT (SELECT COUNT(*) FROM usuarios u JOIN roles ro ON ro.id=u.rol_id WHERE ro.codigo='CIUDADANO')::int as ciudadanos, (SELECT COUNT(*) FROM usuarios u JOIN roles ro ON ro.id=u.rol_id WHERE ro.codigo='AGENTE')::int as agentes, (SELECT COUNT(*) FROM reportes)::int as reportes, (SELECT COUNT(*) FROM reportes WHERE estado='PENDIENTE')::int as pendientes, (SELECT COUNT(*) FROM reportes WHERE estado='VALIDADO')::int as validados, (SELECT COUNT(*) FROM comunicados WHERE estado='PUBLICADO')::int as comunicados`);
  const recent=await db.select({id:activityLogs.id,accion:activityLogs.accion,entidad:activityLogs.entidad,resultado:activityLogs.resultado,createdAt:activityLogs.createdAt}).from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(8);
  response.json({ok:true,data:{...summary.rows[0],actividadReciente:recent}});
}
async function listUsersByRole(request: Request, response: Response, forcedRole: 'CIUDADANO' | 'AGENTE'): Promise<void> {
  const query = usersQuerySchema.omit({ rol: true }).safeParse(request.query);
  if (!query.success) throw new ApiError(422, 'Filtros inválidos.', 'VALIDATION_ERROR', query.error.flatten());
  const { page, limit, search, estado } = query.data;
  const filters: SQL[] = [eq(roles.codigo, forcedRole)];
  if (search) filters.push(or(ilike(users.nombres, `%${search}%`), ilike(users.apellidos, `%${search}%`), ilike(users.email, `%${search}%`))!);
  if (estado) filters.push(eq(users.estado, estado));
  const condition = and(...filters);
  const data = await db.select({ id: users.id, nombres: users.nombres, apellidos: users.apellidos, email: users.email, estado: users.estado, rol: roles.codigo, emailVerificadoAt: users.emailVerifiedAt, ultimoAccesoAt: users.ultimoAccesoAt, createdAt: users.createdAt }).from(users).innerJoin(roles, eq(users.roleId, roles.id)).where(condition).orderBy(desc(users.createdAt)).limit(limit).offset((page - 1) * limit);
  const totals = await db.select({ value: count() }).from(users).innerJoin(roles, eq(users.roleId, roles.id)).where(condition);
  response.json({ ok: true, data, pagination: { page, limit, total: totals[0]?.value ?? 0 } });
}
export async function listCitizens(request: Request, response: Response): Promise<void> { await listUsersByRole(request, response, 'CIUDADANO'); }
export async function listAgents(request: Request, response: Response): Promise<void> { await listUsersByRole(request, response, 'AGENTE'); }
export async function createAgent(request:Request,response:Response):Promise<void>{ if(!request.user)throw new ApiError(401,'Debes iniciar sesión.','AUTH_REQUIRED'); const parsed=createAgentSchema.safeParse(request.body); if(!parsed.success)throw new ApiError(422,'Datos de agente inválidos.','VALIDATION_ERROR',parsed.error.flatten()); const agentRole=await db.select({id:roles.id}).from(roles).where(eq(roles.codigo,'AGENTE')).limit(1); if(!agentRole[0])throw new ApiError(500,'Rol agente no inicializado.','ROLE_NOT_FOUND'); const passwordHash=await hashPassword(parsed.data.password); const rows=await db.insert(users).values({roleId:agentRole[0].id,nombres:parsed.data.nombres,apellidos:parsed.data.apellidos,email:parsed.data.email,passwordHash,emailVerifiedAt:new Date()}).returning({id:users.id,nombres:users.nombres,apellidos:users.apellidos,email:users.email,estado:users.estado}); await writeAuditLog({actorUserId:request.user.id,accion:'AGENTE_CREADO',entidad:'USUARIO',entidadId:rows[0].id,resultado:'EXITO',ip:request.ip}); response.status(201).json({ok:true,data:rows[0],message:'Agente operativo creado. Entrega la contraseña por un canal seguro y solicita su cambio inmediato.'}); }
export async function updateUser(request:Request,response:Response):Promise<void>{ if(!request.user)throw new ApiError(401,'Debes iniciar sesión.','AUTH_REQUIRED'); const id=idFrom(request); const parsed=updateUserSchema.safeParse(request.body); if(!parsed.success)throw new ApiError(422,'Datos inválidos.','VALIDATION_ERROR',parsed.error.flatten()); const rows=await db.update(users).set({...parsed.data,updatedAt:new Date()}).where(eq(users.id,id)).returning({id:users.id,nombres:users.nombres,apellidos:users.apellidos,email:users.email,estado:users.estado}); if(!rows[0])throw new ApiError(404,'Usuario no encontrado.','USER_NOT_FOUND'); await writeAuditLog({actorUserId:request.user.id,accion:'USUARIO_EDITADO',entidad:'USUARIO',entidadId:id,resultado:'EXITO',ip:request.ip}); response.json({ok:true,data:rows[0],message:'Información actualizada.'}); }
export async function updateUserStatus(request: Request, response: Response): Promise<void> { if(!request.user)throw new ApiError(401,'Debes iniciar sesión.','AUTH_REQUIRED'); const userId=idFrom(request); if(userId===request.user.id&&request.body.estado!=='ACTIVO')throw new ApiError(400,'No puedes desactivar tu cuenta administrativa.','SELF_DISABLE_NOT_ALLOWED'); const updated=await db.update(users).set({estado:request.body.estado,updatedAt:new Date()}).where(eq(users.id,userId)).returning({id:users.id,estado:users.estado}); if(!updated[0])throw new ApiError(404,'Usuario no encontrado.','USER_NOT_FOUND'); await writeAuditLog({actorUserId:request.user.id,accion:'ESTADO_USUARIO_ACTUALIZADO',entidad:'USUARIO',entidadId:userId,resultado:'EXITO',detalleSeguro:{estado:request.body.estado,motivo:request.body.motivo},ip:request.ip}); response.json({ok:true,data:updated[0],message:'Estado del usuario actualizado.'}); }
export async function listLogs(request: Request, response: Response): Promise<void> {
  const query=logsQuerySchema.safeParse(request.query);
  if(!query.success) throw new ApiError(422,'Filtros inválidos.','VALIDATION_ERROR',query.error.flatten());
  const {page,limit,accion,entidad,actor,desde,hasta}=query.data; const values: unknown[]=[]; const filters:string[]=[];
  if(accion){values.push(`%${accion}%`);filters.push(`l.accion ILIKE $${values.length}`);}
  if(entidad){values.push(`%${entidad}%`);filters.push(`l.entidad ILIKE $${values.length}`);}
  if(actor){values.push(`%${actor}%`);filters.push(`(u.nombres ILIKE $${values.length} OR u.apellidos ILIKE $${values.length} OR u.email ILIKE $${values.length})`);}
  if(desde){values.push(desde);filters.push(`l.created_at >= $${values.length}`);}
  if(hasta){values.push(hasta);filters.push(`l.created_at <= $${values.length}`);}
  const where=filters.length?`WHERE ${filters.join(' AND ')}`:'';
  const countValues=[...values]; values.push(limit,(page-1)*limit);
  const data=await pool.query(`SELECT l.id,l.accion,l.entidad,l.entidad_id as "entidadId",l.resultado,l.detalle_seguro as "detalleSeguro",l.created_at as "createdAt",u.nombres || ' ' || u.apellidos as "actorNombre",u.email as "actorEmail" FROM logs_actividad l LEFT JOIN usuarios u ON u.id=l.actor_usuario_id ${where} ORDER BY l.created_at DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
  const totals=await pool.query(`SELECT COUNT(*)::int as total FROM logs_actividad l LEFT JOIN usuarios u ON u.id=l.actor_usuario_id ${where}`,countValues);
  response.json({ok:true,data:data.rows,pagination:{page,limit,total:totals.rows[0]?.total??0}});
}
export async function listReports(request: Request, response: Response): Promise<void> {
  const parsed=adminReportsQuerySchema.safeParse(request.query);
  if(!parsed.success) throw new ApiError(422,'Filtros inválidos.','VALIDATION_ERROR',parsed.error.flatten());
  const values: unknown[]=[]; const filters: string[]=[];
  if(parsed.data.estado){values.push(parsed.data.estado);filters.push(`r.estado=$${values.length}`);}
  if(parsed.data.tipo){values.push(parsed.data.tipo);filters.push(`t.codigo=$${values.length}`);}
  const where=filters.length?`WHERE ${filters.join(' AND ')}`:'';
  values.push(parsed.data.limit,(parsed.data.page-1)*parsed.data.limit);
  const data=await pool.query(`SELECT r.id,r.titulo,r.descripcion,r.estado,r.visible_publicamente as "visiblePublicamente",r.es_dato_demostrativo as "esDatoDemostrativo",r.fecha_hora_incidente as "fechaHoraIncidente",r.created_at as "createdAt",t.codigo as "tipoCodigo",t.nombre as "tipoNombre",u.nombres || ' ' || u.apellidos as "ciudadanoNombre",ST_Y(r.ubicacion_exacta::geometry) as latitud,ST_X(r.ubicacion_exacta::geometry) as longitud FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id JOIN usuarios u ON u.id=r.ciudadano_id ${where} ORDER BY r.created_at DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
  const totals=await pool.query(`SELECT COUNT(*)::int as total FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id ${where}`,values.slice(0,-2));
  response.json({ok:true,data:data.rows,pagination:{page:parsed.data.page,limit:parsed.data.limit,total:totals.rows[0]?.total??0}});
}
export async function adminReportDetail(request: Request, response: Response): Promise<void> {
  const id=idFrom(request);
  const data=await pool.query(`SELECT r.id,r.titulo,r.descripcion,r.estado,r.visible_publicamente as "visiblePublicamente",r.prioridad_reportada as "prioridadReportada",r.ubicacion_referencia as "ubicacionReferencia",r.distrito,r.fecha_hora_incidente as "fechaHoraIncidente",r.created_at as "createdAt",r.revisado_at as "revisadoAt",r.origen,r.es_dato_demostrativo as "esDatoDemostrativo",t.codigo as "tipoCodigo",t.nombre as "tipoNombre",u.nombres || ' ' || u.apellidos as "ciudadanoNombre",u.email as "ciudadanoEmail",ST_Y(r.ubicacion_exacta::geometry) as latitud,ST_X(r.ubicacion_exacta::geometry) as longitud FROM reportes r JOIN tipos_incidente t ON t.id=r.tipo_incidente_id JOIN usuarios u ON u.id=r.ciudadano_id WHERE r.id=$1 LIMIT 1`,[id]);
  if(!data.rows[0]) throw new ApiError(404,'Reporte no encontrado.','REPORT_NOT_FOUND');
  const evidence=await db.select({id:evidences.id,originalName:evidences.originalName,mimeType:evidences.mimeType,sizeBytes:evidences.sizeBytes,visiblePublicamente:evidences.visiblePublicamente}).from(evidences).where(eq(evidences.reportId,id));
  const validation=await db.select().from(reportValidations).where(eq(reportValidations.reportId,id)).orderBy(desc(reportValidations.createdAt)).limit(1);
  response.json({ok:true,data:{...data.rows[0],evidencias:evidence,validacion:validation[0]??null}});
}
export async function updateReportVisibility(request: Request, response: Response): Promise<void> {
  if(!request.user) throw new ApiError(401,'Debes iniciar sesión.','AUTH_REQUIRED');
  const id=idFrom(request); const parsed=updateReportVisibilitySchema.safeParse(request.body);
  if(!parsed.success) throw new ApiError(422,'Datos de visibilidad inválidos.','VALIDATION_ERROR',parsed.error.flatten());
  const updated=await pool.query(`UPDATE reportes SET visible_publicamente=$1,updated_at=NOW() WHERE id=$2 RETURNING id,visible_publicamente as "visiblePublicamente"`,[parsed.data.visiblePublicamente,id]);
  if(!updated.rows[0]) throw new ApiError(404,'Reporte no encontrado.','REPORT_NOT_FOUND');
  await writeAuditLog({actorUserId:request.user.id,accion:'VISIBILIDAD_REPORTE_ACTUALIZADA',entidad:'REPORTE',entidadId:id,resultado:'EXITO',detalleSeguro:{visiblePublicamente:parsed.data.visiblePublicamente,motivo:parsed.data.motivo},ip:request.ip});
  response.json({ok:true,data:updated.rows[0],message:parsed.data.visiblePublicamente?'Reporte visible en el mapa público.':'Reporte ocultado del mapa público por protección o moderación.'});
}
