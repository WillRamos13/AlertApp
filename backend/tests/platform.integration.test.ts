import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { closeDatabaseConnection } from '../src/config/database';

const app = createApp();
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function csrf(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get('/api/v1/auth/csrf').expect(200);
  return response.body.data.csrfToken as string;
}
async function login(email: string, password: string) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  await agent.post('/api/v1/auth/login').set('x-csrf-token', token).send({ email, password }).expect(200);
  return { agent, token };
}
async function createVerifiedCitizen() {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const email = 'funcional.ciudadano@alertapp.local';
  const password = 'FuncionalSeguro2026!';
  const registration = await agent.post('/api/v1/auth/registro').set('x-csrf-token', token).send({ nombres: 'Ciudadano', apellidos: 'Funcional', email, password }).expect(201);
  await agent.post('/api/v1/auth/verificar-email').set('x-csrf-token', token).send({ token: registration.body.data.devVerificationToken }).expect(200);
  await agent.post('/api/v1/auth/login').set('x-csrf-token', token).send({ email, password }).expect(200);
  return { agent, token };
}
async function createReport(citizen: Awaited<ReturnType<typeof createVerifiedCitizen>>, title: string) {
  const types = await request(app).get('/api/v1/catalogos/tipos-incidente').expect(200);
  const typeId = types.body.data.find((item: { codigo: string }) => item.codigo === 'ROBO_HURTO').id as string;
  const result = await citizen.agent.post('/api/v1/reportes')
    .set('x-csrf-token', citizen.token)
    .field('tipoIncidenteId', typeId)
    .field('titulo', title)
    .field('descripcion', 'Reporte funcional para comprobar el flujo operativo completo.')
    .field('ubicacionReferencia', 'Plaza de Armas, Ica')
    .field('distrito', 'Ica')
    .field('fechaHoraIncidente', new Date().toISOString())
    .field('prioridadReportada', 'ALTA')
    .field('latitud', '-14.0678')
    .field('longitud', '-75.7286')
    .attach('evidencias', tinyPng, { filename: 'prueba.png', contentType: 'image/png' })
    .expect(201);
  return result.body.data.id as string;
}

describe.sequential('AlertApp API - Fase 3B funcional', () => {
  let citizen: Awaited<ReturnType<typeof createVerifiedCitizen>>;
  let reportToValidate = '';
  let reportToReject = '';
  let reportConcurrent = '';
  let reportFormula = '';
  let agent: Awaited<ReturnType<typeof login>>;
  let admin: Awaited<ReturnType<typeof login>>;

  it('expone mapa público con reportes demostrativos claramente marcados', async () => {
    const map = await request(app).get('/api/v1/mapa/reportes').expect(200);
    expect(map.body.meta.warning).toContain('aún no ha sido verificado');
    expect(map.body.data.some((report: { esDatoDemostrativo: boolean }) => report.esDatoDemostrativo)).toBe(true);
  });

  it('permite al ciudadano verificado crear reportes con evidencia y consultar historial', async () => {
    citizen = await createVerifiedCitizen();
    reportToValidate = await createReport(citizen, 'Incidente para validar');
    reportToReject = await createReport(citizen, 'Incidente para rechazar');
    reportConcurrent = await createReport(citizen, 'Incidente para concurrencia');
    reportFormula = await createReport(citizen, '=SUM(1+1)');
    const pendingPublic = await request(app).get(`/api/v1/mapa/reportes/${reportToValidate}`).expect(200);
    expect(pendingPublic.body.data.estado).toBe('PENDIENTE');
    expect(pendingPublic.body.data.titulo).toContain('no verificado');
    expect(pendingPublic.body.data.titulo).not.toContain('Incidente para validar');
    expect(pendingPublic.body.data.descripcion).not.toContain('flujo operativo');
    const own = await citizen.agent.get('/api/v1/reportes/mios').expect(200);
    expect(own.body.data.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([reportToValidate, reportToReject, reportConcurrent, reportFormula]));
    const detail = await citizen.agent.get(`/api/v1/reportes/mios/${reportToValidate}`).expect(200);
    expect(detail.body.data.evidencias).toHaveLength(1);
    await citizen.agent.get(`/api/v1/reportes/evidencias/${detail.body.data.evidencias[0].id}/acceso`).expect(200);
  });

  it('rechaza evidencia cuyo contenido no corresponde al MIME declarado', async () => {
    const types = await request(app).get('/api/v1/catalogos/tipos-incidente').expect(200);
    const typeId = types.body.data.find((item: { codigo: string }) => item.codigo === 'ROBO_HURTO').id as string;
    await citizen.agent.post('/api/v1/reportes')
      .set('x-csrf-token', citizen.token)
      .field('tipoIncidenteId', typeId).field('titulo', 'Archivo inválido').field('descripcion', 'Validación de contenido real de la imagen cargada.')
      .field('distrito', 'Ica').field('fechaHoraIncidente', new Date().toISOString()).field('prioridadReportada', 'MEDIA')
      .field('latitud', '-14.0678').field('longitud', '-75.7286')
      .attach('evidencias', Buffer.from('no-es-png'), { filename: 'falso.png', contentType: 'image/png' }).expect(422);
  });

  it('permite al agente revisar evidencia, validar y rechazar reportes con observación', async () => {
    agent = await login('agente.demo@alertapp.local', 'AgenteDemo2026!');
    const pending = await agent.agent.get('/api/v1/agente/reportes/pendientes').expect(200);
    expect(pending.body.data.some((item: { id: string }) => item.id === reportToValidate)).toBe(true);
    const detail = await agent.agent.get(`/api/v1/agente/reportes/${reportToValidate}`).expect(200);
    expect(detail.body.data.evidencias).toHaveLength(1);
    await agent.agent.post(`/api/v1/agente/reportes/${reportToValidate}/validacion`).set('x-csrf-token', agent.token).send({ decision: 'VALIDADO', observaciones: 'Incidente revisado y confirmado.', evidenciaPublicable: true }).expect(200);
    await agent.agent.post(`/api/v1/agente/reportes/${reportToReject}/validacion`).set('x-csrf-token', agent.token).send({ decision: 'RECHAZADO', observaciones: 'No se cuenta con información suficiente.', evidenciaPublicable: false }).expect(200);
    const concurrentResponses = await Promise.all([
      agent.agent.post(`/api/v1/agente/reportes/${reportConcurrent}/validacion`).set('x-csrf-token', agent.token).send({ decision: 'VALIDADO', observaciones: 'Primera revisión.', evidenciaPublicable: false }),
      agent.agent.post(`/api/v1/agente/reportes/${reportConcurrent}/validacion`).set('x-csrf-token', agent.token).send({ decision: 'RECHAZADO', observaciones: 'Segunda revisión concurrente.', evidenciaPublicable: false })
    ]);
    expect(concurrentResponses.map((item) => item.status).sort()).toEqual([200, 409]);
    const validated = await citizen.agent.get(`/api/v1/reportes/mios/${reportToValidate}`).expect(200);
    const rejected = await citizen.agent.get(`/api/v1/reportes/mios/${reportToReject}`).expect(200);
    expect(validated.body.data.estado).toBe('VALIDADO');
    expect(validated.body.data.validacion.observaciones).toContain('confirmado');
    expect(rejected.body.data.estado).toBe('RECHAZADO');
  });

  it('actualiza correctamente el mapa público después de la decisión del agente', async () => {
    const validated = await request(app).get(`/api/v1/mapa/reportes/${reportToValidate}`).expect(200);
    expect(validated.body.data.estado).toBe('VALIDADO');
    expect(validated.body.data.evidencias).toHaveLength(1);
    await request(app).get(`/api/v1/mapa/reportes/${reportToReject}`).expect(404);
  });

  it('genera estadísticas reales de reportes de AlertApp y permite publicar comunicados', async () => {
    const stats = await agent.agent.get('/api/v1/estadisticas/resumen').expect(200);
    expect(stats.body.data.disclaimer).toContain('AlertApp');
    const created = await agent.agent.post('/api/v1/comunicados/gestion').set('x-csrf-token', agent.token).send({ titulo: 'Prevención para pruebas', contenido: 'Mantente atento en espacios públicos y utiliza canales oficiales ante emergencias.', nivel: 'PREVENTIVO', zonaReferencia: 'Ica' }).expect(201);
    const communicationId = created.body.data.id as string;
    await agent.agent.patch(`/api/v1/comunicados/gestion/${communicationId}`).set('x-csrf-token', agent.token).send({ titulo: 'Prevención actualizada para pruebas' }).expect(200);
    await agent.agent.post(`/api/v1/comunicados/gestion/${communicationId}/publicar`).set('x-csrf-token', agent.token).expect(200);
    const publicCommunications = await request(app).get('/api/v1/comunicados').expect(200);
    expect(publicCommunications.body.data.some((item: { id: string }) => item.id === communicationId)).toBe(true);
  });

  it('permite al administrador gestionar usuarios, agentes, reportes, logs y exportaciones', async () => {
    admin = await login('admin.demo@alertapp.local', 'AdminDemo2026!');
    const dashboard = await admin.agent.get('/api/v1/admin/dashboard').expect(200);
    expect(dashboard.body.data.reportes).toBeGreaterThanOrEqual(2);
    const users = await admin.agent.get('/api/v1/admin/usuarios').expect(200);
    expect(users.body.data.every((item: { rol: string }) => item.rol === 'CIUDADANO')).toBe(true);
    const agentsOnly = await admin.agent.get('/api/v1/admin/agentes').expect(200);
    expect(agentsOnly.body.data.every((item: { rol: string }) => item.rol === 'AGENTE')).toBe(true);
    const functionalCitizen = users.body.data.find((item: { email: string }) => item.email === 'funcional.ciudadano@alertapp.local');
    await admin.agent.patch(`/api/v1/admin/usuarios/${functionalCitizen.id}`).set('x-csrf-token', admin.token).send({ nombres: 'Ciudadano', apellidos: 'Actualizado', email: 'funcional.ciudadano@alertapp.local' }).expect(200);
    await admin.agent.patch(`/api/v1/admin/usuarios/${functionalCitizen.id}/estado`).set('x-csrf-token', admin.token).send({ estado: 'INACTIVO', motivo: 'Prueba administrativa de desactivación.' }).expect(200);
    const newAgent = await admin.agent.post('/api/v1/admin/agentes').set('x-csrf-token', admin.token).send({ nombres: 'Agente', apellidos: 'Creado', email: 'agente.nuevo@alertapp.local', password: 'AgenteNuevoSeguro2026!' }).expect(201);
    expect(newAgent.body.data.email).toBe('agente.nuevo@alertapp.local');
    const reports = await admin.agent.get('/api/v1/admin/reportes').expect(200);
    expect(reports.body.data.some((item: { id: string }) => item.id === reportToValidate)).toBe(true);
    await admin.agent.patch(`/api/v1/admin/reportes/${reportToValidate}/visibilidad`).set('x-csrf-token', admin.token).send({ visiblePublicamente: false, motivo: 'Protección de información sensible durante prueba.' }).expect(200);
    await request(app).get(`/api/v1/mapa/reportes/${reportToValidate}`).expect(404);
    const parameters = await admin.agent.get('/api/v1/admin/parametros').expect(200);
    const toggledType = parameters.body.data.incidentTypes.find((item: { codigo: string }) => item.codigo === 'OTRO');
    await admin.agent.patch(`/api/v1/admin/parametros/tipos-incidente/${toggledType.id}/estado`).set('x-csrf-token', admin.token).send({ activo: false }).expect(200);
    await admin.agent.patch(`/api/v1/admin/parametros/tipos-incidente/${toggledType.id}/estado`).set('x-csrf-token', admin.token).send({ activo: true }).expect(200);
    await admin.agent.patch('/api/v1/admin/parametros/MAX_EVIDENCIAS_POR_REPORTE').set('x-csrf-token', admin.token).send({ valor: { cantidad: 99 } }).expect(404);
    await admin.agent.patch('/api/v1/admin/parametros/AVISO_LEGAL').set('x-csrf-token', admin.token).send({ valor: { texto: 'AlertApp no reemplaza denuncias ni solicitudes de atención de emergencia.' } }).expect(200);
    const exported = await admin.agent.post('/api/v1/admin/exportaciones/reportes').set('x-csrf-token', admin.token).expect(200).expect('Content-Type', /text\/csv/);
    expect(exported.text).toContain("'=SUM(1+1)");
    const adminLogs = await admin.agent.get('/api/v1/admin/logs?actor=Administrador').expect(200);
    expect(adminLogs.body.data.some((item: { accion: string }) => item.accion === 'VISIBILIDAD_REPORTE_ACTUALIZADA')).toBe(true);
    const allLogs = await admin.agent.get('/api/v1/admin/logs').expect(200);
    expect(allLogs.body.data.some((item: { accion: string }) => item.accion === 'REPORTE_VALIDADO')).toBe(true);
  });
});

afterAll(async () => { await closeDatabaseConnection(); });
