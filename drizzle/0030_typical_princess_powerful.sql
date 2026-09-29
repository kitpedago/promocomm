ALTER TABLE "tranche" ADD COLUMN "fin_commercialisation" boolean;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "fin_tabbor_annuel" boolean;--> statement-breakpoint
-- Reprise des valeurs depuis le dernier import legacy, s'il est encore en base
DO $$ BEGIN
  IF to_regclass('legacy."tTranche"') IS NOT NULL THEN
    UPDATE "tranche" t
       SET "fin_commercialisation" = l."FinCommercialisation",
           "fin_tabbor_annuel" = l."FinTabborAnnuel"
      FROM legacy."tTranche" l
     WHERE l."IDTranche" = t."id";
  END IF;
END $$;
