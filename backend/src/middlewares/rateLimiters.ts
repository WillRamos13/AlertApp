import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' } }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 15,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, error: { code: 'AUTH_RATE_LIMIT', message: 'Demasiados intentos de autenticación. Intenta nuevamente más tarde.' } }
});
