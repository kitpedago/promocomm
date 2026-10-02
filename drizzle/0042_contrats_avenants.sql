CREATE TABLE "contrat" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'contrat' NOT NULL,
	"num_ref" text NOT NULL,
	"date_signature" date,
	"description" text DEFAULT '' NOT NULL,
	"nb_heures_facturees" numeric(7, 2) DEFAULT 0 NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "contrat_id" integer;--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "nb_heures" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "ticket" ADD COLUMN "heures_non_imputables" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_contrat_id_contrat_id_fk" FOREIGN KEY ("contrat_id") REFERENCES "public"."contrat"("id") ON DELETE no action ON UPDATE no action;