import { boolean, index, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';

export const announcementLevelEnum = pgEnum('comunicado_nivel', ['INFORMATIVO', 'PREVENTIVO', 'URGENTE']);
export const announcementStatusEnum = pgEnum('comunicado_estado', ['BORRADOR', 'PUBLICADO', 'ARCHIVADO']);

export const announcements = pgTable(
  'comunicados',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('autor_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    titulo: varchar('titulo', { length: 160 }).notNull(),
    contenido: text('contenido').notNull(),
    nivel: announcementLevelEnum('nivel').notNull().default('PREVENTIVO'),
    zonaReferencia: varchar('zona_referencia', { length: 120 }),
    estado: announcementStatusEnum('estado').notNull().default('BORRADOR'),
    esDatoDemostrativo: boolean('es_dato_demostrativo').notNull().default(false),
    publishedAt: timestamp('publicado_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('comunicados_estado_idx').on(table.estado), index('comunicados_publicado_idx').on(table.publishedAt)]
);
