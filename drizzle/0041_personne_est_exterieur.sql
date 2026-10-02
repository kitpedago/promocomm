ALTER TABLE "personne" ADD COLUMN "est_exterieur" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- comptable « EXTERIEUR » : les deux fiches legacy codées en dur jusqu'ici
UPDATE "personne" SET "est_exterieur" = true WHERE "id" IN (19, 22);