import { config } from 'dotenv';
import { z } from 'zod';

config({ path: process.env.ENV_FILE ?? '.env' });

const booleanFromString = z.preprocess((value) => value === true || value === 'true', z.boolean());
const optionalText = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  DATABASE_SSL: booleanFromString.default(false),
  FRONTEND_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  APP_PUBLIC_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  AUTH_TOKEN_PEPPER: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN_MINUTES: z.coerce.number().int().positive().max(60).default(15),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().max(30).default(7),
  COOKIE_SECURE: booleanFromString.default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  MAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  MAIL_FROM: z.string().min(3),
  RESEND_API_KEY: optionalText,
  EXPOSE_DEV_TOKENS: booleanFromString.default(false),
  EVIDENCE_STORAGE_PROVIDER: z.enum(['local', 'cloudinary']).default('local'),
  CLOUDINARY_CLOUD_NAME: optionalText,
  CLOUDINARY_API_KEY: optionalText,
  CLOUDINARY_API_SECRET: optionalText,
  LOCAL_UPLOAD_DIR: z.string().default('uploads/evidencias'),
  MAX_EVIDENCE_SIZE_MB: z.coerce.number().int().positive().max(10).default(5),
  MAX_EVIDENCES_PER_REPORT: z.coerce.number().int().positive().max(5).default(3),
  SEED_DEMO_DATA: booleanFromString.default(false),
  SEED_CITIZEN_EMAIL: z.string().email().default('ciudadano.demo@alertapp.local'),
  SEED_CITIZEN_PASSWORD: z.string().min(12).default('CiudadanoDemo2026!'),
  SEED_AGENT_EMAIL: z.string().email().default('agente.demo@alertapp.local'),
  SEED_AGENT_PASSWORD: z.string().min(12).default('AgenteDemo2026!'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin.demo@alertapp.local'),
  SEED_ADMIN_PASSWORD: z.string().min(12).default('AdminDemo2026!'),
  INITIAL_ADMIN_EMAIL: optionalText.pipe(z.string().email().optional()),
  INITIAL_ADMIN_PASSWORD: optionalText.pipe(z.string().min(12).optional())
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
    context.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'COOKIE_SECURE debe ser true en producción.' });
  }
  if (value.NODE_ENV === 'production' && value.MAIL_PROVIDER !== 'resend') {
    context.addIssue({ code: 'custom', path: ['MAIL_PROVIDER'], message: 'MAIL_PROVIDER debe ser resend en producción.' });
  }
  if (value.MAIL_PROVIDER === 'resend' && !value.RESEND_API_KEY) {
    context.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'RESEND_API_KEY es obligatorio con MAIL_PROVIDER=resend.' });
  }
  if (value.NODE_ENV === 'production' && value.EVIDENCE_STORAGE_PROVIDER !== 'cloudinary') {
    context.addIssue({ code: 'custom', path: ['EVIDENCE_STORAGE_PROVIDER'], message: 'Cloudinary es obligatorio para evidencias en producción.' });
  }
  if (value.EVIDENCE_STORAGE_PROVIDER === 'cloudinary' && (!value.CLOUDINARY_CLOUD_NAME || !value.CLOUDINARY_API_KEY || !value.CLOUDINARY_API_SECRET)) {
    context.addIssue({ code: 'custom', path: ['CLOUDINARY_API_SECRET'], message: 'Configura Cloudinary para almacenar evidencias.' });
  }
  if (value.NODE_ENV === 'production' && value.SEED_DEMO_DATA) {
    context.addIssue({ code: 'custom', path: ['SEED_DEMO_DATA'], message: 'No se permiten usuarios o datos demo en producción.' });
  }
  const onlyOneInitialAdminField = Boolean(value.INITIAL_ADMIN_EMAIL) !== Boolean(value.INITIAL_ADMIN_PASSWORD);
  if (onlyOneInitialAdminField) {
    context.addIssue({ code: 'custom', path: ['INITIAL_ADMIN_EMAIL'], message: 'INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD deben definirse juntos.' });
  }
});
const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Variables de entorno inválidas:', z.prettifyError(result.error));
  throw new Error('Configuración de entorno inválida. Revisa .env.');
}
export const env = result.data;
export const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
