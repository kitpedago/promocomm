ALTER TABLE "type_mission" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "type_mission" CASCADE;--> statement-breakpoint
ALTER TABLE "tranche" DROP CONSTRAINT IF EXISTS "tranche_mission_moe_interne_id_type_mission_id_fk";
