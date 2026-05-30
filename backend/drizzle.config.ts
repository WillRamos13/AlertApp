import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: process.env.ENV_FILE ?? '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definido. Copia .env.example como .env.');
}

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL
  },
  strict: true,
  verbose: true
});
