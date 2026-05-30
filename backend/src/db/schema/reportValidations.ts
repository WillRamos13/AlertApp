import { boolean, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { reports } from './reports';
import { users } from './users';

export const validationDecisionEnum = pgEnum('validacion_decision', ['VALIDADO', 'RECHAZADO']);

export const reportValidations = pgTable(
  'validaciones_reportes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('reporte_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    agentId: uuid('agente_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    decision: validationDecisionEnum('decision').notNull(),
    observaciones: text('observaciones'),
    evidenciaPublicable: boolean('evidencia_publicable').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('validaciones_reporte_idx').on(table.reportId), index('validaciones_agente_idx').on(table.agentId)]
);
