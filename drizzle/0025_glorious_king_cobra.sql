CREATE TABLE "ticket" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'bug' NOT NULL,
	"gravite" text DEFAULT 'mineure' NOT NULL,
	"titre" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"page_concernee" text DEFAULT '' NOT NULL,
	"statut" text DEFAULT 'nouveau' NOT NULL,
	"ticket_doublon_id" integer,
	"avancement" integer DEFAULT 0 NOT NULL,
	"date_livraison" date,
	"cree_par_email" text DEFAULT '' NOT NULL,
	"cree_par_nom" text DEFAULT '' NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	"maj_le" timestamp DEFAULT now() NOT NULL,
	"archive_le" timestamp,
	"attente_reponse" boolean DEFAULT false NOT NULL,
	"livre_par_ia" boolean DEFAULT false NOT NULL,
	"masque_nouveautes" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_capture" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"commentaire_id" integer,
	"nom_fichier" text DEFAULT '' NOT NULL,
	"mime" text DEFAULT 'image/png' NOT NULL,
	"taille" integer DEFAULT 0 NOT NULL,
	"contenu" "bytea" NOT NULL,
	"auteur_email" text DEFAULT '' NOT NULL,
	"auteur_nom" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"miniature" text DEFAULT '' NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_commentaire" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"auteur_email" text DEFAULT '' NOT NULL,
	"auteur_nom" text DEFAULT '' NOT NULL,
	"texte" text NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_lecture" (
	"ticket_id" integer NOT NULL,
	"courriel" text NOT NULL,
	"lu_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_lecture_ticket_id_courriel_pk" PRIMARY KEY("ticket_id","courriel")
);
--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_ticket_doublon_id_ticket_id_fk" FOREIGN KEY ("ticket_doublon_id") REFERENCES "public"."ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_capture" ADD CONSTRAINT "ticket_capture_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_capture" ADD CONSTRAINT "ticket_capture_commentaire_id_ticket_commentaire_id_fk" FOREIGN KEY ("commentaire_id") REFERENCES "public"."ticket_commentaire"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_commentaire" ADD CONSTRAINT "ticket_commentaire_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_lecture" ADD CONSTRAINT "ticket_lecture_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_capture_ticket_idx" ON "ticket_capture" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_capture_commentaire_idx" ON "ticket_capture" USING btree ("commentaire_id");--> statement-breakpoint
CREATE INDEX "ticket_commentaire_ticket_idx" ON "ticket_commentaire" USING btree ("ticket_id");