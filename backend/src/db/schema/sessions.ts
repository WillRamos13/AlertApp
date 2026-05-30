import { index, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';
import { users } from './users';

export const sessions = pgTable(
  'sesiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('usuario_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull().unique(),
    userAgent: varchar('user_agent', { length: 255 }),
    ipHash: varchar('ip_hash', { length: 128 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('sesiones_usuario_idx').on(table.userId), index('sesiones_expira_idx').on(table.expiresAt)]
);
