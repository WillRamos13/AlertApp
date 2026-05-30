import type { RequestHandler } from 'express';
import { ApiError } from '../shared/errors/ApiError';

export const notFound: RequestHandler = (_request, _response, next) => {
  next(new ApiError(404, 'La ruta solicitada no existe.', 'NOT_FOUND'));
};
