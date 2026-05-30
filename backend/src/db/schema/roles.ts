import { smallserial, timestamp, varchar, text, pgTable } from 'drizzle-orm/pg-core';
import type { RoleCode } from '../../shared/types/auth';

export const roles = pgTable('roles', {
  id: smallserial('id').primaryKey(),
  codigo: varchar('codigo', { length: 30 }).$type<RoleCode>().notNull().unique(),
  nombre: varchar('nombre', { length: 60 }).notNull(),
  descripcion: text('descripcion').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
