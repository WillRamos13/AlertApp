DO $$ BEGIN
  CREATE TYPE "reporte_estado" AS ENUM ('PENDIENTE', 'VALIDADO', 'RECHAZADO', 'RETIRADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "reporte_prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "reporte_origen" AS ENUM ('CIUDADANO', 'DEMO', 'OFICIAL_AUTORIZADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "evidencia_proveedor" AS ENUM ('LOCAL', 'CLOUDINARY');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "validacion_decision" AS ENUM ('VALIDADO', 'RECHAZADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "comunicado_nivel" AS ENUM ('INFORMATIVO', 'PREVENTIVO', 'URGENTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "comunicado_estado" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "exportacion_tipo" AS ENUM ('CSV_REPORTES', 'CSV_AUDITORIA');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  CREATE TYPE "exportacion_estado" AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "reportes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ciudadano_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "tipo_incidente_id" uuid NOT NULL REFERENCES "tipos_incidente"("id") ON DELETE RESTRICT,
  "titulo" varchar(150) NOT NULL,
  "descripcion" text NOT NULL,
  "ubicacion_exacta" geometry(Point,4326) NOT NULL,
  "ubicacion_referencia" varchar(255),
  "distrito" varchar(100) NOT NULL DEFAULT 'Ica',
  "fecha_hora_incidente" timestamptz NOT NULL,
  "prioridad_reportada" "reporte_prioridad" NOT NULL DEFAULT 'MEDIA',
  "estado" "reporte_estado" NOT NULL DEFAULT 'PENDIENTE',
  "visible_publicamente" boolean NOT NULL DEFAULT true,
  "origen" "reporte_origen" NOT NULL DEFAULT 'CIUDADANO',
  "es_dato_demostrativo" boolean NOT NULL DEFAULT false,
  "revisado_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "reportes_ubicacion_gist_idx" ON "reportes" USING gist ("ubicacion_exacta");
CREATE INDEX IF NOT EXISTS "reportes_estado_idx" ON "reportes" ("estado");
CREATE INDEX IF NOT EXISTS "reportes_tipo_idx" ON "reportes" ("tipo_incidente_id");
CREATE INDEX IF NOT EXISTS "reportes_ciudadano_idx" ON "reportes" ("ciudadano_id");
CREATE INDEX IF NOT EXISTS "reportes_created_at_idx" ON "reportes" ("created_at");
CREATE INDEX IF NOT EXISTS "reportes_fecha_incidente_idx" ON "reportes" ("fecha_hora_incidente");
CREATE INDEX IF NOT EXISTS "reportes_distrito_idx" ON "reportes" ("distrito");

CREATE TABLE IF NOT EXISTS "evidencias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporte_id" uuid NOT NULL REFERENCES "reportes"("id") ON DELETE CASCADE,
  "subido_por_usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "proveedor" "evidencia_proveedor" NOT NULL,
  "public_id" varchar(255) NOT NULL,
  "nombre_original" varchar(255) NOT NULL,
  "mime_type" varchar(60) NOT NULL,
  "size_bytes" integer NOT NULL,
  "referencia_almacenamiento" text NOT NULL,
  "visible_publicamente" boolean NOT NULL DEFAULT false,
  "aprobada_por_agente" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "evidencias_reporte_idx" ON "evidencias" ("reporte_id");

CREATE TABLE IF NOT EXISTS "validaciones_reportes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporte_id" uuid NOT NULL REFERENCES "reportes"("id") ON DELETE CASCADE,
  "agente_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "decision" "validacion_decision" NOT NULL,
  "observaciones" text,
  "evidencia_publicable" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "validaciones_reporte_unica_idx" ON "validaciones_reportes" ("reporte_id");
CREATE INDEX IF NOT EXISTS "validaciones_agente_idx" ON "validaciones_reportes" ("agente_id");

CREATE TABLE IF NOT EXISTS "comunicados" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "autor_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "titulo" varchar(160) NOT NULL,
  "contenido" text NOT NULL,
  "nivel" "comunicado_nivel" NOT NULL DEFAULT 'PREVENTIVO',
  "zona_referencia" varchar(120),
  "estado" "comunicado_estado" NOT NULL DEFAULT 'BORRADOR',
  "es_dato_demostrativo" boolean NOT NULL DEFAULT false,
  "publicado_at" timestamptz,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "comunicados_estado_idx" ON "comunicados" ("estado");
CREATE INDEX IF NOT EXISTS "comunicados_publicado_idx" ON "comunicados" ("publicado_at");

CREATE TABLE IF NOT EXISTS "parametros_sistema" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clave" varchar(100) NOT NULL UNIQUE,
  "valor" jsonb NOT NULL,
  "descripcion" text NOT NULL,
  "editable" boolean NOT NULL DEFAULT true,
  "updated_by" uuid REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "exportaciones_respaldo" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "solicitado_por" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "tipo" "exportacion_tipo" NOT NULL,
  "estado" "exportacion_estado" NOT NULL DEFAULT 'PENDIENTE',
  "archivo_referencia" text,
  "fecha_inicio" timestamptz NOT NULL DEFAULT now(),
  "fecha_fin" timestamptz,
  "detalle" text,
  "mime_type" varchar(60) NOT NULL DEFAULT 'text/csv'
);
CREATE INDEX IF NOT EXISTS "exportaciones_usuario_idx" ON "exportaciones_respaldo" ("solicitado_por");
CREATE INDEX IF NOT EXISTS "exportaciones_fecha_idx" ON "exportaciones_respaldo" ("fecha_inicio");
