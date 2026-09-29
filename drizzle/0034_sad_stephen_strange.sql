ALTER TABLE "tranche" ADD COLUMN "type_batiment_id" integer;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "avec_appel_fond_client_derogatoire" boolean;--> statement-breakpoint
ALTER TABLE "tranche" ADD CONSTRAINT "tranche_type_batiment_id_type_batiment_id_fk" FOREIGN KEY ("type_batiment_id") REFERENCES "public"."type_batiment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Reprise des valeurs depuis le dernier import legacy, s'il est encore en base
-- (type de bâtiment : seulement s'il existe encore dans la nomenclature)
DO $$ BEGIN
  IF to_regclass('legacy."tTranche"') IS NOT NULL THEN
    UPDATE "tranche" t
       SET "avec_appel_fond_client_derogatoire" = l."AvecAppelFondClientDerogatoire",
           "type_batiment_id" = (SELECT b."id" FROM "type_batiment" b WHERE b."id" = l."IDTypeBatiment")
      FROM legacy."tTranche" l
     WHERE l."IDTranche" = t."id";
  END IF;
END $$;
