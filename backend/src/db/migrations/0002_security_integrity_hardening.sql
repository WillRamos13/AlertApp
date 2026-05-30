ALTER TABLE "evidencias"
  ADD CONSTRAINT "evidencias_tamano_positivo_chk" CHECK ("size_bytes" > 0),
  ADD CONSTRAINT "evidencias_publicas_aprobadas_chk" CHECK (NOT "visible_publicamente" OR "aprobada_por_agente");

ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_revision_estado_chk" CHECK (
    ("estado" IN ('PENDIENTE', 'RETIRADO') AND "revisado_at" IS NULL)
    OR ("estado" IN ('VALIDADO', 'RECHAZADO') AND "revisado_at" IS NOT NULL)
  );
