ALTER TABLE "liste_avancement" ADD COLUMN "inclure_quand_creation_tranche" boolean;--> statement-breakpoint
-- Stades ajoutés d'office à une nouvelle tranche : repris du dernier import
-- legacy s'il est encore en base, sinon de la liste relevée dans le back du
-- 2026-09-08 (réglable ensuite dans Paramètres > Stades d'avancement)
DO $$ BEGIN
  IF to_regclass('legacy."tListeAvancement"') IS NOT NULL THEN
    UPDATE "liste_avancement" t
       SET "inclure_quand_creation_tranche" = l."InclureQuandCreationTranche"
      FROM legacy."tListeAvancement" l
     WHERE l."IDListeAvancement" = t."id";
  ELSE
    UPDATE "liste_avancement"
       SET "inclure_quand_creation_tranche" = "id" IN (
         24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 43, 44, 45,
         49, 50, 51, 54, 60, 62, 63, 65, 68, 69, 70, 75, 81, 82, 86, 88, 89, 90,
         91, 92, 93, 94, 95, 97, 98, 99, 100, 102, 103, 105);
  END IF;
END $$;--> statement-breakpoint
-- Droits fins : l'ETL lisait IDService dans l'ordre de la liste de connexion
-- (Promotion, Comptabilité) alors que WinDev numérote COMPTA = 1, PROMO = 2 :
-- les restrictions des deux services étaient interverties. Le garde reconnaît
-- l'état fautif (Promotion bridée sur son propre écran SAV Promotion).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "droit"
              WHERE "service" = 'promo' AND "fenetre" = 'FEN_SAV_Promotion') THEN
    UPDATE "droit"
       SET "service" = CASE "service" WHEN 'promo' THEN 'compta' ELSE 'promo' END
     WHERE "service" IN ('promo', 'compta');
  END IF;
END $$;--> statement-breakpoint
-- Coordonnées des acquéreurs : 0 initial des téléphones perdu par le legacy,
-- séparateurs, « 0 » pour « pas de numéro », emails en minuscules sans espaces
-- (mêmes règles que l'ETL et la fiche, cf. NORMALISER_ACQUEREURS)
UPDATE "acquereur" SET
    "telephone" = CASE
      WHEN regexp_replace(regexp_replace(replace("telephone", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0') ~ '^0*$' THEN NULL
      WHEN regexp_replace(regexp_replace(replace("telephone", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0') ~ '^[1-9][0-9]{8}$' THEN '0' || regexp_replace(regexp_replace(replace("telephone", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0')
      WHEN regexp_replace(regexp_replace(replace("telephone", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0') ~ '^0[0-9]{9}$' THEN regexp_replace(regexp_replace(replace("telephone", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0')
      ELSE btrim(replace("telephone", chr(160), ' ')) END,
    "portable" = CASE
      WHEN regexp_replace(regexp_replace(replace("portable", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0') ~ '^0*$' THEN NULL
      WHEN regexp_replace(regexp_replace(replace("portable", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0') ~ '^[1-9][0-9]{8}$' THEN '0' || regexp_replace(regexp_replace(replace("portable", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0')
      WHEN regexp_replace(regexp_replace(replace("portable", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0') ~ '^0[0-9]{9}$' THEN regexp_replace(regexp_replace(replace("portable", chr(160), ' '), '[[:space:]./-]', '', 'g'), '^([+]|00)33[(]?0?[)]?', '0')
      ELSE btrim(replace("portable", chr(160), ' ')) END,
    "email" = NULLIF(lower(regexp_replace(replace("email", chr(160), ' '), '[[:space:]]+', '', 'g')), ''),
    "email2" = NULLIF(lower(regexp_replace(replace("email2", chr(160), ' '), '[[:space:]]+', '', 'g')), '');
