import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { reports } from './reports';
import { users } from './users';

export const evidenceProviderEnum = pgEnum('evidencia_proveedor', ['LOCAL', 'CLOUDINARY']);

export const evidences = pgTable(
  'evidencias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reportId: uuid('reporte_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    uploadedByUserId: uuid('subido_por_usuario_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    proveedor: evidenceProviderEnum('proveedor').notNull(),
    publicId: varchar('public_id', { length: 255 }).notNull(),
    originalName: varchar('nombre_original', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 60 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageReference: text('referencia_almacenamiento').notNull(),
    visiblePublicamente: boolean('visible_publicamente').notNull().default(false),
    aprobadaPorAgente: boolean('aprobada_por_agente').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('evidencias_reporte_idx').on(table.reportId),
    check('evidencias_tamano_positivo_chk', sql`${table.sizeBytes} > 0`),
    check('evidencias_publicas_aprobadas_chk', sql`NOT ${table.visiblePublicamente} OR ${table.aprobadaPorAgente}`)
  ]
);
