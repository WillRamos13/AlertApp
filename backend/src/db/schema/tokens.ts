import { index, pgTable, timestamp, uuid, text } from 'drizzle-orm/pg-core';
import { users } from './users';

export const emailVerificationTokens = pgTable(
  'tokens_verificacion_email',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('usuario_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('token_email_usuario_idx').on(table.userId), index('token_email_expira_idx').on(table.expiresAt)]
);

export const passwordResetTokens = pgTable(
  'tokens_recuperacion_password',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('usuario_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('token_password_usuario_idx').on(table.userId), index('token_password_expira_idx').on(table.expiresAt)]
);
