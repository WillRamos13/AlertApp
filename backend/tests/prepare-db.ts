import { pool, closeDatabaseConnection } from '../src/config/database';
import { runMigrations } from '../src/db/migrate';
import { runSeed } from '../src/db/seed';

async function prepareTestDatabase() {
  await runMigrations();
  await pool.query(`
    TRUNCATE TABLE
      logs_actividad,
      tokens_recuperacion_password,
      tokens_verificacion_email,
      sesiones,
      usuarios,
      tipos_incidente,
      roles
    RESTART IDENTITY CASCADE;
  `);
  await runSeed();
  await closeDatabaseConnection();
  console.log('Base de datos de pruebas preparada.');
}

prepareTestDatabase().catch(async (error) => {
  console.error('No se pudo preparar la base de pruebas:', error);
  await closeDatabaseConnection();
  process.exit(1);
});
