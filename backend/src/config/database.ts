import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from './env';
import * as schema from '../db/schema';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: env.NODE_ENV === 'test' ? 4 : 10
});

export const db = drizzle(pool, { schema });

export async function verifyDatabaseConnection(): Promise<void> {
  await pool.query('select 1 as ok');
}

export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}
