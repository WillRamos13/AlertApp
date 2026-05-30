import { index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const exportTypeEnum = pgEnum('exportacion_tipo', ['CSV_REPORTES', 'CSV_AUDITORIA']);
export const exportStatusEnum = pgEnum('exportacion_estado', ['PENDIENTE', 'COMPLETADO', 'FALLIDO']);

export const exportsHistory = pgTable(
  'exportaciones_respaldo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestedBy: uuid('solicitado_por').notNull().references(() => users.id, { onDelete: 'restrict' }),
    tipo: exportTypeEnum('tipo').notNull(),
    estado: exportStatusEnum('estado').notNull().default('PENDIENTE'),
    fileReference: text('archivo_referencia'),
    startedAt: timestamp('fecha_inicio', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('fecha_fin', { withTimezone: true }),
    detalle: text('detalle'),
    mimeType: varchar('mime_type', { length: 60 }).notNull().default('text/csv')
  },
  (table) => [index('exportaciones_usuario_idx').on(table.requestedBy), index('exportaciones_fecha_idx').on(table.startedAt)]
);
