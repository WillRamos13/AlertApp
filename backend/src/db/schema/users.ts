import { index, integer, pgEnum, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';
import { roles } from './roles';

export const userStatusEnum = pgEnum('usuario_estado', ['ACTIVO', 'INACTIVO', 'BLOQUEADO']);

export const users = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: integer('rol_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
    nombres: varchar('nombres', { length: 100 }).notNull(),
    apellidos: varchar('apellidos', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    estado: userStatusEnum('estado').notNull().default('ACTIVO'),
    emailVerifiedAt: timestamp('email_verificado_at', { withTimezone: true }),
    ultimoAccesoAt: timestamp('ultimo_acceso_at', { withTimezone: true }),
    intentosFallidos: integer('intentos_fallidos').notNull().default(0),
    bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('usuarios_rol_idx').on(table.roleId),
    index('usuarios_estado_idx').on(table.estado),
    index('usuarios_created_at_idx').on(table.createdAt)
  ]
);
