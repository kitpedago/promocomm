CREATE TABLE "user_pref" (
	"user_id" text NOT NULL,
	"cle" text NOT NULL,
	"valeur" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_pref_user_id_cle_pk" PRIMARY KEY("user_id","cle")
);
--> statement-breakpoint
ALTER TABLE "user_pref" ADD CONSTRAINT "user_pref_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;