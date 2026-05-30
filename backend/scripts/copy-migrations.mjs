import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const from = resolve('src/db/migrations');
const to = resolve('dist/src/db/migrations');
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log('Migraciones copiadas a dist/src/db/migrations.');
