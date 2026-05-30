import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { csrfProtection } from '../../middlewares/csrfProtection';
import { authLimiter } from '../../middlewares/rateLimiters';
import { validateBody } from '../../middlewares/validateRequest';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import * as controller from './auth.controller';
import { emailSchema, loginSchema, registerSchema, resetPasswordSchema, tokenSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.get('/csrf', asyncHandler(controller.getCsrf));
authRouter.post('/registro', authLimiter, csrfProtection, validateBody(registerSchema), asyncHandler(controller.register));
authRouter.post('/reenviar-verificacion', authLimiter, csrfProtection, validateBody(emailSchema), asyncHandler(controller.resendVerification));
authRouter.post('/verificar-email', authLimiter, csrfProtection, validateBody(tokenSchema), asyncHandler(controller.verifyEmail));
authRouter.post('/login', authLimiter, csrfProtection, validateBody(loginSchema), asyncHandler(controller.login));
authRouter.post('/refresh', authLimiter, csrfProtection, asyncHandler(controller.refresh));
authRouter.post('/logout', csrfProtection, asyncHandler(controller.logout));
authRouter.get('/me', authenticate, asyncHandler(controller.me));
authRouter.post('/recuperar-password', authLimiter, csrfProtection, validateBody(emailSchema), asyncHandler(controller.requestPasswordReset));
authRouter.post('/restablecer-password', authLimiter, csrfProtection, validateBody(resetPasswordSchema), asyncHandler(controller.resetPassword));
