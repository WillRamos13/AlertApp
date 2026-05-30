import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../shared/errors/ApiError';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    response.status(422).json({ ok: false, error: { code: 'EVIDENCE_UPLOAD_ERROR', message: error.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el tamaño máximo permitido.' : 'No se pudo procesar la evidencia.' } });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    response.status(409).json({ ok: false, error: { code: 'CONFLICT', message: 'El registro ya existe.' } });
    return;
  }

  console.error('Error no controlado:', error);
  response.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error interno. Intenta nuevamente.',
      ...(env.NODE_ENV === 'development' ? { details: String(error) } : {})
    }
  });
};
