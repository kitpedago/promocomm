ALTER TABLE "liste_avancement" ADD COLUMN "avec_synchro_entre_tranche" boolean;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "synchroniser_dates_entre_tranche" boolean;--> statement-breakpoint
ALTER TABLE "stade_avancement" ADD COLUMN "lien_hypertexte" text;--> statement-breakpoint
ALTER TABLE "stade_avancement" ADD COLUMN "avec_appel_fond_client_suppl" boolean;--> statement-breakpoint
-- Reprise des valeurs depuis le dernier import legacy, s'il est encore en base
DO $$ BEGIN
  IF to_regclass('legacy."tListeAvancement"') IS NOT NULL THEN
    UPDATE "liste_avancement" t
       SET "avec_synchro_entre_tranche" = l."AvecSynchroEntreTranche"
      FROM legacy."tListeAvancement" l
     WHERE l."IDListeAvancement" = t."id";
  END IF;
  IF to_regclass('legacy."tOperation"') IS NOT NULL THEN
    UPDATE "operation" t
       SET "synchroniser_dates_entre_tranche" = l."SynchroniserDatesEntreTranche"
      FROM legacy."tOperation" l
     WHERE l."IDOperation" = t."id";
  END IF;
  IF to_regclass('legacy."tStadeAvancement"') IS NOT NULL THEN
    UPDATE "stade_avancement" t
       SET "lien_hypertexte" = l."LienHypertexte",
           "avec_appel_fond_client_suppl" = l."AvecAppelFondClientSuppl"
      FROM legacy."tStadeAvancement" l
     WHERE l."IDStadeAvancement" = t."id";
  END IF;
END $$;
