ALTER TABLE "gestionnaire_sccv" ADD COLUMN "libelle_court" text;--> statement-breakpoint
ALTER TABLE "gestionnaire_sccv" ADD COLUMN "suffixe_facturation_electronique" text;--> statement-breakpoint
ALTER TABLE "gestionnaire_sccv" ADD COLUMN "logiciel_facturation_electronique" text;--> statement-breakpoint
CREATE UNIQUE INDEX "gestionnaire_sccv_suffixe_idx" ON "gestionnaire_sccv" USING btree ("suffixe_facturation_electronique");