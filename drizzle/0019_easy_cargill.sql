ALTER TABLE "operation" ADD COLUMN "charge_ope1_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "charge_ope2_id" integer;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "liste_avancement_actuel_id" integer;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "liste_avancement_prochain_id" integer;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "liste_avancement_suivi_actuel_id" integer;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "liste_avancement_suivi_prochain_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD CONSTRAINT "operation_charge_ope1_id_personne_id_fk" FOREIGN KEY ("charge_ope1_id") REFERENCES "public"."personne"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation" ADD CONSTRAINT "operation_charge_ope2_id_personne_id_fk" FOREIGN KEY ("charge_ope2_id") REFERENCES "public"."personne"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tranche" ADD CONSTRAINT "tranche_liste_avancement_actuel_id_liste_avancement_id_fk" FOREIGN KEY ("liste_avancement_actuel_id") REFERENCES "public"."liste_avancement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tranche" ADD CONSTRAINT "tranche_liste_avancement_prochain_id_liste_avancement_id_fk" FOREIGN KEY ("liste_avancement_prochain_id") REFERENCES "public"."liste_avancement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tranche" ADD CONSTRAINT "tranche_liste_avancement_suivi_actuel_id_liste_avancement_id_fk" FOREIGN KEY ("liste_avancement_suivi_actuel_id") REFERENCES "public"."liste_avancement"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tranche" ADD CONSTRAINT "tranche_liste_avancement_suivi_prochain_id_liste_avancement_id_fk" FOREIGN KEY ("liste_avancement_suivi_prochain_id") REFERENCES "public"."liste_avancement"("id") ON DELETE no action ON UPDATE no action;