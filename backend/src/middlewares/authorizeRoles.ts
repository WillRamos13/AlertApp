import type { RequestHandler } from 'express';
import type { RoleCode } from '../shared/types/auth';
import { ApiError } from '../shared/errors/ApiError';

export function authorizeRoles(...allowedRoles: RoleCode[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new ApiError(401, 'Debes iniciar sesión para continuar.', 'AUTH_REQUIRED'));
      return;
    }
    if (!allowedRoles.includes(request.user.role)) {
      next(new ApiError(403, 'No tienes permisos para realizar esta acción.', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
