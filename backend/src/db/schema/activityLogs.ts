import { index, jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const logResultEnum = pgEnum('log_resultado', ['EXITO', 'ERROR']);

export const activityLogs = pgTable(
  'logs_actividad',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_usuario_id').references(() => users.id, { onDelete: 'set null' }),
    accion: varchar('accion', { length: 100 }).notNull(),
    entidad: varchar('entidad', { length: 60 }).notNull(),
    entidadId: uuid('entidad_id'),
    resultado: logResultEnum('resultado').notNull(),
    detalleSeguro: jsonb('detalle_seguro').$type<Record<string, unknown>>().notNull().default({}),
    ipHash: varchar('ip_hash', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('logs_actor_idx').on(table.actorUserId),
    index('logs_accion_idx').on(table.accion),
    index('logs_fecha_idx').on(table.createdAt)
  ]
);
