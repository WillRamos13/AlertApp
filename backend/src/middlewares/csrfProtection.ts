import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import { CSRF_COOKIE_NAME, csrfCookieOptions } from '../config/cookies';
import { ApiError } from '../shared/errors/ApiError';

export function issueCsrfToken(response: Response): string {
  const token = randomBytes(32).toString('base64url');
  response.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
  return token;
}

export const csrfProtection: RequestHandler = (request, _response, next) => {
  const headerToken = request.get('x-csrf-token');
  const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  if (!headerToken || !cookieToken) {
    next(new ApiError(403, 'Token CSRF faltante o inválido.', 'CSRF_INVALID'));
    return;
  }
  const header = Buffer.from(headerToken);
  const cookie = Buffer.from(cookieToken);
  if (header.length !== cookie.length || !timingSafeEqual(header, cookie)) {
    next(new ApiError(403, 'Token CSRF faltante o inválido.', 'CSRF_INVALID'));
    return;
  }
  next();
};
