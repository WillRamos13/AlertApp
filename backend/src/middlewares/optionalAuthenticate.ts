import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { ACCESS_COOKIE_NAME } from '../config/cookies';
import { db } from '../config/database';
import { roles, users } from '../db/schema';
import { verifyAccessToken } from '../shared/security/tokens';

export const optionalAuthenticate: RequestHandler = async (request, _response, next) => {
  try {
    const header = request.get('authorization');
    const token = (request.cookies?.[ACCESS_COOKIE_NAME] as string | undefined) ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) return next();
    try {
      const payload = verifyAccessToken(token);
      const result = await db.select({ id: users.id, email: users.email, nombres: users.nombres, apellidos: users.apellidos, status: users.estado, emailVerifiedAt: users.emailVerifiedAt, role: roles.codigo })
        .from(users).innerJoin(roles, eq(users.roleId, roles.id)).where(eq(users.id, payload.sub)).limit(1);
      if (result[0]?.status === 'ACTIVO') request.user = result[0];
    } catch { /* La consulta pública no falla por sesión expirada. */ }
    next();
  } catch (error) { next(error); }
};
