import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app';
import { closeDatabaseConnection, db } from '../src/config/database';
import { activityLogs, users } from '../src/db/schema';

const app = createApp();

afterAll(async () => {
  await closeDatabaseConnection();
});

async function csrf(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get('/api/v1/auth/csrf').expect(200);
  return response.body.data.csrfToken as string;
}

async function loginAs(email: string, password: string) {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const response = await agent.post('/api/v1/auth/login').set('x-csrf-token', token).send({ email, password });
  expect(response.status).toBe(200);
  return agent;
}

describe.sequential('AlertApp API - Fase 3A', () => {
  it('conecta a PostgreSQL mediante el health check', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body.data.database).toBe('connected');
  });

  it('carga mediante seed los tres usuarios y el catálogo aprobado', async () => {
    const catalog = await request(app).get('/api/v1/catalogos/tipos-incidente').expect(200);
    expect(catalog.body.data).toHaveLength(11);
    expect(catalog.body.data.map((item: { codigo: string }) => item.codigo)).toContain('ROBO_HURTO');
    expect(catalog.body.data.map((item: { codigo: string }) => item.codigo)).toContain('CONSUMO_ALCOHOL_DROGAS');

    const seedUsers = await db.select({ email: users.email }).from(users);
    expect(seedUsers.map((user) => user.email)).toEqual(expect.arrayContaining([
      'ciudadano.demo@alertapp.local',
      'agente.demo@alertapp.local',
      'admin.demo@alertapp.local'
    ]));
  });

  it('registra un ciudadano, no guarda la contraseña en texto plano y exige verificación de correo', async () => {
    const agent = request.agent(app);
    const csrfToken = await csrf(agent);
    const password = 'RegistroSeguro2026!';
    const registration = await agent
      .post('/api/v1/auth/registro')
      .set('x-csrf-token', csrfToken)
      .send({ nombres: 'Will', apellidos: 'Prueba', email: 'nuevo.ciudadano@alertapp.local', password })
      .expect(201);

    expect(registration.body.data.devVerificationToken).toBeTruthy();
    const stored = await db.select({ hash: users.passwordHash, verifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.email, 'nuevo.ciudadano@alertapp.local')).limit(1);
    expect(stored[0].hash).not.toBe(password);
    expect(stored[0].hash.startsWith('$argon2id$')).toBe(true);
    expect(stored[0].verifiedAt).toBeNull();

    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'nuevo.ciudadano@alertapp.local', password })
      .expect(403);

    await agent
      .post('/api/v1/auth/verificar-email')
      .set('x-csrf-token', csrfToken)
      .send({ token: registration.body.data.devVerificationToken })
      .expect(200);

    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'nuevo.ciudadano@alertapp.local', password })
      .expect(200);

    await agent.get('/api/v1/auth/me').expect(200);
    await agent.post('/api/v1/auth/logout').set('x-csrf-token', csrfToken).expect(200);
    await agent.get('/api/v1/auth/me').expect(401);
  });

  it('rechaza rutas protegidas sin autenticación', async () => {
    await request(app).get('/api/v1/acceso/ciudadano').expect(401);
    await request(app).get('/api/v1/admin/usuarios').expect(401);
  });

  it('aplica autorización correcta para ciudadano, agente y administrador', async () => {
    const citizen = await loginAs('ciudadano.demo@alertapp.local', 'CiudadanoDemo2026!');
    await citizen.get('/api/v1/acceso/ciudadano').expect(200);
    await citizen.get('/api/v1/acceso/agente').expect(403);
    await citizen.get('/api/v1/admin/usuarios').expect(403);

    const agent = await loginAs('agente.demo@alertapp.local', 'AgenteDemo2026!');
    await agent.get('/api/v1/acceso/agente').expect(200);
    await agent.get('/api/v1/acceso/administrador').expect(403);

    const admin = await loginAs('admin.demo@alertapp.local', 'AdminDemo2026!');
    await admin.get('/api/v1/acceso/administrador').expect(200);
    const usersResponse = await admin.get('/api/v1/admin/usuarios').expect(200);
    expect(usersResponse.body.data.length).toBeGreaterThanOrEqual(1);
    expect(usersResponse.body.data.every((item: { rol: string }) => item.rol === 'CIUDADANO')).toBe(true);
  });

  it('restablece contraseña mediante token temporal y revoca la contraseña anterior', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const recovery = await agent
      .post('/api/v1/auth/recuperar-password')
      .set('x-csrf-token', token)
      .send({ email: 'ciudadano.demo@alertapp.local' })
      .expect(200);
    expect(recovery.body.data.devResetToken).toBeTruthy();

    await agent
      .post('/api/v1/auth/restablecer-password')
      .set('x-csrf-token', token)
      .send({ token: recovery.body.data.devResetToken, newPassword: 'NuevaClaveSegura2026!' })
      .expect(200);

    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', token)
      .send({ email: 'ciudadano.demo@alertapp.local', password: 'CiudadanoDemo2026!' })
      .expect(401);

    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', token)
      .send({ email: 'ciudadano.demo@alertapp.local', password: 'NuevaClaveSegura2026!' })
      .expect(200);
  });

  it('registra eventos de autenticación en auditoría', async () => {
    const logs = await db.select().from(activityLogs);
    expect(logs.some((log) => log.accion === 'LOGIN_EXITOSO')).toBe(true);
    expect(logs.some((log) => log.accion === 'EMAIL_VERIFICADO')).toBe(true);
  });
});
