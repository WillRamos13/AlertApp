import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { incidentTypes } from '../../db/schema';
import { asyncHandler } from '../../shared/utils/asyncHandler';

export const catalogsRouter = Router();

catalogsRouter.get('/tipos-incidente', asyncHandler(async (_request, response) => {
  const data = await db
    .select({
      id: incidentTypes.id,
      codigo: incidentTypes.codigo,
      nombre: incidentTypes.nombre,
      descripcion: incidentTypes.descripcion,
      icono: incidentTypes.icono,
      colorMarcador: incidentTypes.colorMarcador,
      activo: incidentTypes.activo
    })
    .from(incidentTypes)
    .where(eq(incidentTypes.activo, true))
    .orderBy(asc(incidentTypes.nombre));
  response.json({ ok: true, data });
}));
