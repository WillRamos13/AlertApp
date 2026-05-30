import { boolean, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const systemParameters = pgTable('parametros_sistema', {
  id: uuid('id').primaryKey().defaultRandom(),
  clave: varchar('clave', { length: 100 }).notNull().unique(),
  valor: jsonb('valor').$type<unknown>().notNull(),
  descripcion: text('descripcion').notNull(),
  editable: boolean('editable').notNull().default(true),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
