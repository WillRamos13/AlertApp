import { Router } from 'express';
import { verifyDatabaseConnection } from '../../config/database';
import { asyncHandler } from '../../shared/utils/asyncHandler';

export const healthRouter = Router();

healthRouter.get('/', asyncHandler(async (_request, response) => {
  await verifyDatabaseConnection();
  response.json({ ok: true, data: { service: 'alertapp-api', database: 'connected' } });
}));
