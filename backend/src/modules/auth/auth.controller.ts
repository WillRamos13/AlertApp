import type { Request, Response } from 'express';
import { ACCESS_COOKIE_NAME, accessCookieOptions, REFRESH_COOKIE_NAME, refreshCookieOptions } from '../../config/cookies';
import { issueCsrfToken } from '../../middlewares/csrfProtection';
import { ApiError } from '../../shared/errors/ApiError';
import * as authService from './auth.service';

function requestMetadata(request: Request) {
  return { ip: request.ip, userAgent: request.get('user-agent') ?? null };
}

function setSessionCookies(response: Response, accessToken: string, refreshToken: string): void {
  response.cookie(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions);
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
}

function clearSessionCookies(response: Response): void {
  response.clearCookie(ACCESS_COOKIE_NAME, accessCookieOptions);
  response.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}

export async function getCsrf(_request: Request, response: Response): Promise<void> {
  const csrfToken = issueCsrfToken(response);
  response.json({ ok: true, data: { csrfToken } });
}

export async function register(request: Request, response: Response): Promise<void> {
  const result = await authService.registerCitizen(request.body, requestMetadata(request));
  response.status(201).json({
    ok: true,
    data: result,
    message: 'Cuenta registrada. Verifica tu correo antes de iniciar sesión.'
  });
}

export async function resendVerification(request: Request, response: Response): Promise<void> {
  const result = await authService.resendVerification(request.body);
  response.json({ ok: true, data: result });
}

export async function verifyEmail(request: Request, response: Response): Promise<void> {
  await authService.verifyEmail(request.body.token);
  response.json({ ok: true, message: 'Correo verificado correctamente. Ya puedes iniciar sesión.' });
}

export async function login(request: Request, response: Response): Promise<void> {
  const result = await authService.login(request.body, requestMetadata(request));
  setSessionCookies(response, result.accessToken, result.refreshToken);
  response.json({ ok: true, data: { user: result.user }, message: 'Sesión iniciada correctamente.' });
}

export async function refresh(request: Request, response: Response): Promise<void> {
  const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!refreshToken) {
    throw new ApiError(401, 'No se pudo renovar la sesión.', 'REFRESH_REQUIRED');
  }
  const result = await authService.refreshSession(refreshToken, requestMetadata(request));
  setSessionCookies(response, result.accessToken, result.refreshToken);
  response.json({ ok: true, data: { user: result.user }, message: 'Sesión renovada.' });
}

export async function logout(request: Request, response: Response): Promise<void> {
  const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logout(refreshToken);
  clearSessionCookies(response);
  response.json({ ok: true, message: 'Sesión cerrada correctamente.' });
}

export async function me(request: Request, response: Response): Promise<void> {
  if (!request.user) {
    throw new ApiError(401, 'Debes iniciar sesión para continuar.', 'AUTH_REQUIRED');
  }
  const user = await authService.getAuthenticatedUser(request.user.id);
  response.json({ ok: true, data: { user } });
}

export async function requestPasswordReset(request: Request, response: Response): Promise<void> {
  const result = await authService.requestPasswordReset(request.body);
  response.json({ ok: true, data: result });
}

export async function resetPassword(request: Request, response: Response): Promise<void> {
  await authService.resetPassword(request.body);
  clearSessionCookies(response);
  response.json({ ok: true, message: 'Contraseña restablecida. Inicia sesión nuevamente.' });
}
