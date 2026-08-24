CREATE TABLE "operation_visuel" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_id" integer NOT NULL,
	"contenu" "bytea" NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"taille" integer DEFAULT 0 NOT NULL,
	"miniature" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"cree_le" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operation_visuel_operation_id_unique" UNIQUE("operation_id")
);
