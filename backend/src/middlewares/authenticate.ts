import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { ACCESS_COOKIE_NAME } from '../config/cookies';
import { db } from '../config/database';
import { roles, users } from '../db/schema';
import { ApiError } from '../shared/errors/ApiError';
import { verifyAccessToken } from '../shared/security/tokens';

function extractAccessToken(authorization: string | undefined, cookieToken: string | undefined): string | null {
  if (cookieToken) return cookieToken;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return null;
}

export const authenticate: RequestHandler = async (request, _response, next) => {
  try {
    const token = extractAccessToken(request.get('authorization'), request.cookies?.[ACCESS_COOKIE_NAME]);
    if (!token) {
      next(new ApiError(401, 'Debes iniciar sesión para continuar.', 'AUTH_REQUIRED'));
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      next(new ApiError(401, 'La sesión no es válida o expiró.', 'INVALID_SESSION'));
      return;
    }

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        nombres: users.nombres,
        apellidos: users.apellidos,
        status: users.estado,
        emailVerifiedAt: users.emailVerifiedAt,
        role: roles.codigo
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, payload.sub))
      .limit(1);

    const user = result[0];
    if (!user || user.status !== 'ACTIVO') {
      next(new ApiError(401, 'La sesión no está disponible.', 'INVALID_SESSION'));
      return;
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
