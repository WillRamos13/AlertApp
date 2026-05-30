import { Router } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { listPublicMapReports, getPublicReport } from '../reportes/reports.controller';
export const mapRouter = Router();
mapRouter.get('/reportes', asyncHandler(listPublicMapReports));
mapRouter.get('/reportes/:id', asyncHandler(getPublicReport));
