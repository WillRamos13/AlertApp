import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { overview } from './statistics.controller';
export const statisticsRouter=Router();
statisticsRouter.get('/resumen',authenticate,authorizeRoles('AGENTE','ADMIN'),asyncHandler(overview));
