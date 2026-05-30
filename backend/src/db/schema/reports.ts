import { sql } from 'drizzle-orm';
import { boolean, check, geometry, index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';
import { incidentTypes } from './incidentTypes';

export const reportStatusEnum = pgEnum('reporte_estado', ['PENDIENTE', 'VALIDADO', 'RECHAZADO', 'RETIRADO']);
export const reportPriorityEnum = pgEnum('reporte_prioridad', ['BAJA', 'MEDIA', 'ALTA']);
export const reportOriginEnum = pgEnum('reporte_origen', ['CIUDADANO', 'DEMO', 'OFICIAL_AUTORIZADO']);

export const reports = pgTable(
  'reportes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    citizenId: uuid('ciudadano_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    incidentTypeId: uuid('tipo_incidente_id').notNull().references(() => incidentTypes.id, { onDelete: 'restrict' }),
    titulo: varchar('titulo', { length: 150 }).notNull(),
    descripcion: text('descripcion').notNull(),
    ubicacionExacta: geometry('ubicacion_exacta', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    ubicacionReferencia: varchar('ubicacion_referencia', { length: 255 }),
    distrito: varchar('distrito', { length: 100 }).notNull().default('Ica'),
    fechaHoraIncidente: timestamp('fecha_hora_incidente', { withTimezone: true }).notNull(),
    prioridadReportada: reportPriorityEnum('prioridad_reportada').notNull().default('MEDIA'),
    estado: reportStatusEnum('estado').notNull().default('PENDIENTE'),
    visiblePublicamente: boolean('visible_publicamente').notNull().default(true),
    origen: reportOriginEnum('origen').notNull().default('CIUDADANO'),
    esDatoDemostrativo: boolean('es_dato_demostrativo').notNull().default(false),
    revisadoAt: timestamp('revisado_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('reportes_ubicacion_gist_idx').using('gist', table.ubicacionExacta),
    index('reportes_estado_idx').on(table.estado),
    index('reportes_tipo_idx').on(table.incidentTypeId),
    index('reportes_ciudadano_idx').on(table.citizenId),
    index('reportes_created_at_idx').on(table.createdAt),
    index('reportes_fecha_incidente_idx').on(table.fechaHoraIncidente),
    index('reportes_distrito_idx').on(table.distrito),
    check('reportes_revision_estado_chk', sql`((${table.estado} IN ('PENDIENTE', 'RETIRADO')) AND ${table.revisadoAt} IS NULL) OR ((${table.estado} IN ('VALIDADO', 'RECHAZADO')) AND ${table.revisadoAt} IS NOT NULL)` )
  ]
);
