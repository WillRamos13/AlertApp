import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../shared/errors/ApiError';

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new ApiError(422, 'Los datos enviados no son válidos.', 'VALIDATION_ERROR', result.error.flatten()));
      return;
    }
    request.body = result.data;
    next();
  };
}
