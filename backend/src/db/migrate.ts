import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { closeDatabaseConnection, db } from '../config/database';

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(__dirname, 'migrations');
  await migrate(db, { migrationsFolder });
  console.log('Migraciones aplicadas correctamente.');
}

if (require.main === module) {
  runMigrations()
    .then(() => closeDatabaseConnection())
    .catch(async (error) => {
      console.error('Error al ejecutar migraciones:', error);
      await closeDatabaseConnection();
      process.exit(1);
    });
}
