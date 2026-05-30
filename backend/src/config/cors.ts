import cors, { type CorsOptions } from 'cors';
import { allowedOrigins } from './env';
import { ApiError } from '../shared/errors/ApiError';

const corsOptions: CorsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ApiError(403, 'Origen no permitido por CORS.', 'CORS_FORBIDDEN'));
  }
};

export const corsMiddleware = cors(corsOptions);
