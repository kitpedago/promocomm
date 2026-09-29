ALTER TABLE "acquereur" ADD COLUMN "identifiant" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "etage" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "type_programme" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "type_acquisition" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "modifications" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "reserves_de" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "date_previsionnelle_livraison" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "date_reelle_livraison" text;--> statement-breakpoint
ALTER TABLE "acquereur" ADD COLUMN "conseiller_technique_id" integer;--> statement-breakpoint
ALTER TABLE "acquereur" ADD CONSTRAINT "acquereur_conseiller_technique_id_personne_id_fk" FOREIGN KEY ("conseiller_technique_id") REFERENCES "public"."personne"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Reprise des valeurs depuis le dernier import legacy, s'il est encore en base.
-- Colonne par colonne : une colonne absente du legacy en place est sautée.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('identifiant', 'Identifiant'),
    ('etage', 'Etage'),
    ('type_programme', 'Type de programme'),
    ('type_acquisition', 'Type d''acquisition'),
    ('modifications', 'Modifications'),
    ('reserves_de', 'ReservesDE'),
    ('date_previsionnelle_livraison', 'Date prévisionnelle livraison'),
    ('date_reelle_livraison', 'Date réelle livraison')
  ) AS v(col, col_legacy) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'legacy' AND table_name = 'tAcquereur'
                  AND column_name = r.col_legacy) THEN
      EXECUTE format(
        'UPDATE "acquereur" t SET %I = l.%I FROM legacy."tAcquereur" l WHERE l."IDAcquereur" = t.id',
        r.col, r.col_legacy);
    END IF;
  END LOOP;
  -- référence jamais validée côté SQL Server : reprise si la personne existe
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'legacy' AND table_name = 'tAcquereur'
                AND column_name = 'IDConseillerTechnique') THEN
    UPDATE "acquereur" t SET "conseiller_technique_id" = l."IDConseillerTechnique"
      FROM legacy."tAcquereur" l
     WHERE l."IDAcquereur" = t.id
       AND EXISTS (SELECT 1 FROM "personne" p WHERE p.id = l."IDConseillerTechnique");
  END IF;
END $$;
