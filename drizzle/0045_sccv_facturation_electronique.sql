DROP INDEX "gestionnaire_sccv_suffixe_idx";--> statement-breakpoint
ALTER TABLE "structure_juridique" ADD COLUMN "suffixe_facturation_electronique" text;--> statement-breakpoint
ALTER TABLE "structure_juridique" ADD COLUMN "logiciel_facturation_electronique" text;--> statement-breakpoint
ALTER TABLE "structure_juridique" ADD COLUMN "commentaire_facturation_electronique" text;--> statement-breakpoint
CREATE UNIQUE INDEX "structure_juridique_suffixe_idx" ON "structure_juridique" USING btree ("suffixe_facturation_electronique");--> statement-breakpoint
-- facturation électronique saisie par SCCV : le logiciel du gestionnaire passe
-- à ses SCCV ; son suffixe (unique) seulement s'il n'a qu'une SCCV
UPDATE "structure_juridique" s SET "logiciel_facturation_electronique" = g."logiciel_facturation_electronique"
  FROM "gestionnaire_sccv" g WHERE g."id" = s."gestionnaire_sccv_id";--> statement-breakpoint
UPDATE "structure_juridique" s SET "suffixe_facturation_electronique" = g."suffixe_facturation_electronique"
  FROM "gestionnaire_sccv" g WHERE g."id" = s."gestionnaire_sccv_id"
  AND (SELECT count(*) FROM "structure_juridique" x WHERE x."gestionnaire_sccv_id" = g."id") = 1;--> statement-breakpoint
ALTER TABLE "gestionnaire_sccv" DROP COLUMN "suffixe_facturation_electronique";--> statement-breakpoint
ALTER TABLE "gestionnaire_sccv" DROP COLUMN "logiciel_facturation_electronique";