import { eq } from 'drizzle-orm';
import { db, closeDatabaseConnection, pool } from '../config/database';
import { env } from '../config/env';
import { announcements, incidentTypes, roles, systemParameters, users } from './schema';
import { hashPassword } from '../shared/security/password';
import type { RoleCode } from '../shared/types/auth';
const roleSeed=[
  {codigo:'CIUDADANO' as RoleCode,nombre:'Ciudadano',descripcion:'Persona registrada que consulta y publica reportes ciudadanos.'},
  {codigo:'AGENTE' as RoleCode,nombre:'Agente operativo',descripcion:'Personal autorizado que revisa y valida reportes.'},
  {codigo:'ADMIN' as RoleCode,nombre:'Administrador',descripcion:'Responsable de gestión, auditoría y configuración del sistema.'}
];
const incidentTypeSeed=[
 ['ROBO_HURTO','Robo o hurto','Sustracción de pertenencias en un lugar determinado.','shield-alert','#DC2626'],
 ['ASALTO','Asalto o amenaza','Situación con amenaza o agresión para sustraer pertenencias.','shield-x','#991B1B'],
 ['ACTIVIDAD_SOSPECHOSA','Actividad sospechosa','Acciones inusuales que podrían representar un riesgo.','eye','#F59E0B'],
 ['VANDALISMO','Vandalismo o daños','Daño intencional a bienes o espacios públicos.','triangle-alert','#F97316'],
 ['PELEA_AGRESION','Pelea o agresión en la vía pública','Conflicto o agresión ocurrido en un espacio público.','users-round','#DC2626'],
 ['ACOSO_CALLEJERO','Acoso callejero','Situación de acoso ocurrida en calles o espacios públicos.','user-shield','#BE123C'],
 ['ACCIDENTE_VIAL','Accidente de tránsito','Choque, atropello u otro evento vial de riesgo.','car-front','#EA580C'],
 ['ZONA_OSCURA','Zona con poca iluminación','Espacio con iluminación deficiente que genera inseguridad.','lightbulb-off','#475569'],
 ['CONSUMO_ALCOHOL_DROGAS','Consumo o venta sospechosa en vía pública','Reporte preventivo de una situación observada; no confirma un hecho delictivo.','circle-alert','#D97706'],
 ['EMERGENCIA_COMUNITARIA','Emergencia en espacio público','Situación urgente que afecta la seguridad de personas en una zona.','siren','#B91C1C'],
 ['OTRO','Otro incidente de seguridad','Reporte de seguridad ciudadana que no corresponde a otra categoría.','info','#64748B']
] as const;
async function upsertBaseData():Promise<Record<RoleCode,number>>{
 for(const role of roleSeed) await db.insert(roles).values(role).onConflictDoUpdate({target:roles.codigo,set:{nombre:role.nombre,descripcion:role.descripcion}});
 for(const [codigo,nombre,descripcion,icono,colorMarcador] of incidentTypeSeed) await db.insert(incidentTypes).values({codigo,nombre,descripcion,icono,colorMarcador}).onConflictDoUpdate({target:incidentTypes.codigo,set:{nombre,descripcion,icono,colorMarcador,activo:true}});
 const parameters=[
  {clave:'AVISO_LEGAL',valor:{texto:'AlertApp no reemplaza una denuncia formal ni una llamada a servicios de emergencia.'},descripcion:'Aviso visible de responsabilidad.',editable:true},
  {clave:'MAX_EVIDENCIAS_POR_REPORTE',valor:{cantidad:3},descripcion:'Cantidad máxima recomendada de evidencias, administrada por variables de entorno.',editable:false},
  {clave:'MOSTRAR_UBICACION_EXACTA_PUBLICA',valor:{activo:true},descripcion:'Decisión aprobada para el mapa público; modificarla requiere revisión de privacidad.',editable:false}
 ];
 for(const parameter of parameters) await db.insert(systemParameters).values(parameter).onConflictDoUpdate({target:systemParameters.clave,set:{valor:parameter.valor,descripcion:parameter.descripcion,editable:parameter.editable}});
 const rows=await db.select({id:roles.id,codigo:roles.codigo}).from(roles); return rows.reduce((map,role)=>({...map,[role.codigo]:role.id}),{} as Record<RoleCode,number>);
}
async function upsertVerifiedUser(input:{roleId:number;nombres:string;apellidos:string;email:string;password:string}):Promise<string>{
 const email=input.email.toLowerCase().trim(); const passwordHash=await hashPassword(input.password); const existing=await db.select({id:users.id}).from(users).where(eq(users.email,email)).limit(1);
 if(existing[0]){ await db.update(users).set({roleId:input.roleId,nombres:input.nombres,apellidos:input.apellidos,passwordHash,estado:'ACTIVO',emailVerifiedAt:new Date(),updatedAt:new Date()}).where(eq(users.email,email)); return existing[0].id; }
 const inserted=await db.insert(users).values({roleId:input.roleId,nombres:input.nombres,apellidos:input.apellidos,email,passwordHash,estado:'ACTIVO',emailVerifiedAt:new Date()}).returning({id:users.id}); return inserted[0].id;
}
async function seedDemonstrationData(roleIds:Record<RoleCode,number>):Promise<void>{
 const citizenId=await upsertVerifiedUser({roleId:roleIds.CIUDADANO,nombres:'Ciudadano',apellidos:'Demo',email:env.SEED_CITIZEN_EMAIL,password:env.SEED_CITIZEN_PASSWORD});
 const agentId=await upsertVerifiedUser({roleId:roleIds.AGENTE,nombres:'Agente',apellidos:'Demo',email:env.SEED_AGENT_EMAIL,password:env.SEED_AGENT_PASSWORD});
 await upsertVerifiedUser({roleId:roleIds.ADMIN,nombres:'Administrador',apellidos:'Demo',email:env.SEED_ADMIN_EMAIL,password:env.SEED_ADMIN_PASSWORD});
 const types=await db.select({id:incidentTypes.id,codigo:incidentTypes.codigo}).from(incidentTypes); const ids=Object.fromEntries(types.map(t=>[t.codigo,t.id]));
 const exists=await pool.query(`SELECT id FROM reportes WHERE es_dato_demostrativo=true LIMIT 1`);
 if(!exists.rows[0]){
  await pool.query(`INSERT INTO reportes(ciudadano_id,tipo_incidente_id,titulo,descripcion,ubicacion_exacta,ubicacion_referencia,distrito,fecha_hora_incidente,prioridad_reportada,estado,origen,es_dato_demostrativo,revisado_at) VALUES
  ($1,$2,'Zona con iluminación limitada','Dato demostrativo para verificar la visualización del mapa. No representa información oficial.',ST_SetSRID(ST_MakePoint(-75.7285,-14.0678),4326),'Cercado de Ica','Ica',now()-interval '2 days','MEDIA','VALIDADO','DEMO',true,now()-interval '1 day'),
  ($1,$3,'Actividad observada pendiente','Reporte de demostración pendiente de revisión para probar el flujo operativo.',ST_SetSRID(ST_MakePoint(-75.735,-14.071),4326),'Zona de prueba','Ica',now()-interval '3 hours','MEDIA','PENDIENTE','DEMO',true,NULL)`,[citizenId,ids.ZONA_OSCURA,ids.ACTIVIDAD_SOSPECHOSA]);
 }
 const existingAnnouncement=await db.select({id:announcements.id}).from(announcements).where(eq(announcements.esDatoDemostrativo,true)).limit(1);
 if(!existingAnnouncement[0]) await db.insert(announcements).values({authorId:agentId,titulo:'Recomendación preventiva de demostración',contenido:'Mantente atento al entorno y utiliza canales oficiales ante una emergencia. Este comunicado es de prueba.',nivel:'PREVENTIVO',zonaReferencia:'Ica',estado:'PUBLICADO',esDatoDemostrativo:true,publishedAt:new Date()});
 console.log('Usuarios y contenido de demostración creados. No deben utilizarse en producción.');
}
export async function runSeed():Promise<void>{ const roleIds=await upsertBaseData(); if(env.SEED_DEMO_DATA) await seedDemonstrationData(roleIds); if(env.INITIAL_ADMIN_EMAIL&&env.INITIAL_ADMIN_PASSWORD){ await upsertVerifiedUser({roleId:roleIds.ADMIN,nombres:'Administrador',apellidos:'Inicial',email:env.INITIAL_ADMIN_EMAIL,password:env.INITIAL_ADMIN_PASSWORD}); console.log('Administrador inicial creado. Retira sus variables secretas después del aprovisionamiento.'); } console.log('Roles, parámetros y catálogo de incidentes cargados correctamente.'); }
if(require.main===module){ runSeed().then(()=>closeDatabaseConnection()).catch(async(error)=>{console.error('Error al ejecutar seed:',error); await closeDatabaseConnection(); process.exit(1);}); }
