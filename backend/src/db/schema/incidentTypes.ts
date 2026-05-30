import { boolean, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';

export const incidentTypes = pgTable('tipos_incidente', {
  id: uuid('id').primaryKey().defaultRandom(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion').notNull(),
  icono: varchar('icono', { length: 60 }).notNull(),
  colorMarcador: varchar('color_marcador', { length: 20 }).notNull(),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
