import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';

export const accessRouter = Router();

accessRouter.get('/ciudadano', authenticate, authorizeRoles('CIUDADANO'), (request, response) => {
  response.json({ ok: true, data: { role: request.user?.role }, message: 'Acceso ciudadano autorizado.' });
});

accessRouter.get('/agente', authenticate, authorizeRoles('AGENTE'), (request, response) => {
  response.json({ ok: true, data: { role: request.user?.role }, message: 'Acceso de agente autorizado.' });
});

accessRouter.get('/administrador', authenticate, authorizeRoles('ADMIN'), (request, response) => {
  response.json({ ok: true, data: { role: request.user?.role }, message: 'Acceso administrativo autorizado.' });
});
