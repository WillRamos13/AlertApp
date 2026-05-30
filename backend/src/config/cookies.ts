import type { CookieOptions } from 'express';
import { env } from './env';
export const ACCESS_COOKIE_NAME = 'alertapp_access';
export const REFRESH_COOKIE_NAME = 'alertapp_refresh';
export const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const baseOptions: CookieOptions = { secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SAME_SITE };
export const accessCookieOptions: CookieOptions = { ...baseOptions, httpOnly: true, path: '/', maxAge: env.ACCESS_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000 };
export const refreshCookieOptions: CookieOptions = { ...baseOptions, httpOnly: true, path: '/api/v1/auth', maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000 };
export const csrfCookieOptions: CookieOptions = { ...baseOptions, httpOnly: false, path: '/', maxAge: env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000 };
