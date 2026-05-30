CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

DO $$ BEGIN
  CREATE TYPE "usuario_estado" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "log_resultado" AS ENUM ('EXITO', 'ERROR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "roles" (
  "id" smallserial PRIMARY KEY,
  "codigo" varchar(30) NOT NULL UNIQUE,
  "nombre" varchar(60) NOT NULL,
  "descripcion" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rol_id" integer NOT NULL REFERENCES "roles"("id") ON DELETE RESTRICT,
  "nombres" varchar(100) NOT NULL,
  "apellidos" varchar(120) NOT NULL,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "estado" "usuario_estado" NOT NULL DEFAULT 'ACTIVO',
  "email_verificado_at" timestamptz,
  "ultimo_acceso_at" timestamptz,
  "intentos_fallidos" integer NOT NULL DEFAULT 0,
  "bloqueado_hasta" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "usuarios_rol_idx" ON "usuarios" ("rol_id");
CREATE INDEX IF NOT EXISTS "usuarios_estado_idx" ON "usuarios" ("estado");
CREATE INDEX IF NOT EXISTS "usuarios_created_at_idx" ON "usuarios" ("created_at");

CREATE TABLE IF NOT EXISTS "sesiones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "refresh_token_hash" text NOT NULL UNIQUE,
  "user_agent" varchar(255),
  "ip_hash" varchar(128),
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sesiones_usuario_idx" ON "sesiones" ("usuario_id");
CREATE INDEX IF NOT EXISTS "sesiones_expira_idx" ON "sesiones" ("expires_at");

CREATE TABLE IF NOT EXISTS "tokens_verificacion_email" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "token_email_usuario_idx" ON "tokens_verificacion_email" ("usuario_id");
CREATE INDEX IF NOT EXISTS "token_email_expira_idx" ON "tokens_verificacion_email" ("expires_at");

CREATE TABLE IF NOT EXISTS "tokens_recuperacion_password" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "token_password_usuario_idx" ON "tokens_recuperacion_password" ("usuario_id");
CREATE INDEX IF NOT EXISTS "token_password_expira_idx" ON "tokens_recuperacion_password" ("expires_at");

CREATE TABLE IF NOT EXISTS "logs_actividad" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_usuario_id" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "accion" varchar(100) NOT NULL,
  "entidad" varchar(60) NOT NULL,
  "entidad_id" uuid,
  "resultado" "log_resultado" NOT NULL,
  "detalle_seguro" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ip_hash" varchar(128),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "logs_actor_idx" ON "logs_actividad" ("actor_usuario_id");
CREATE INDEX IF NOT EXISTS "logs_accion_idx" ON "logs_actividad" ("accion");
CREATE INDEX IF NOT EXISTS "logs_fecha_idx" ON "logs_actividad" ("created_at");

CREATE TABLE IF NOT EXISTS "tipos_incidente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "codigo" varchar(50) NOT NULL UNIQUE,
  "nombre" varchar(100) NOT NULL,
  "descripcion" text NOT NULL,
  "icono" varchar(60) NOT NULL,
  "color_marcador" varchar(20) NOT NULL,
  "activo" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
