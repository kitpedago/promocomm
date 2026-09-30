-- Caches d'avancement de la tranche (trigger WinDev StadeAvancement_update) :
-- l'application les recalcule désormais à chaque écriture d'un stade
-- (recalculerStades, règles dans cachesStades). Ici, le recalcul initial de
-- toutes les tranches, valeurs reprises du legacy comprises — le « prochain »
-- de WinDev était faux (date passée dans le mauvais paramètre de requête).
WITH sa AS (
  SELECT s."id", s."tranche_id", s."liste_avancement_id", s."ordre",
         s."date_previ_maj_promo", s."date_reelle", l."code", l."avec_suivi"
    FROM "stade_avancement" s
    JOIN "liste_avancement" l ON l."id" = s."liste_avancement_id"
), c AS (
  SELECT t."id",
    (SELECT max(sa."date_reelle") FROM sa WHERE sa."tranche_id" = t."id" AND sa."code" = 'COM') AS com,
    (SELECT max(sa."date_reelle") FROM sa WHERE sa."tranche_id" = t."id" AND sa."code" = 'OS') AS os,
    (SELECT max(sa."date_reelle") FROM sa WHERE sa."tranche_id" = t."id" AND sa."code" = 'LIV') AS liv,
    (SELECT max(sa."date_reelle") FROM sa WHERE sa."tranche_id" = t."id" AND sa."code" = 'SAV') AS sav,
    -- dernier stade réalisé : tous les stades, puis les seuls stades suivis
    (SELECT max(sa."date_reelle") FROM sa WHERE sa."tranche_id" = t."id") AS dernier,
    (SELECT max(sa."date_reelle") FROM sa WHERE sa."tranche_id" = t."id" AND sa."avec_suivi") AS dernier_suivi
  FROM "tranche" t
), s AS (
  SELECT c.*,
    CASE WHEN c.sav IS NOT NULL THEN 4
         WHEN c.os IS NOT NULL AND c.liv IS NOT NULL THEN 3
         WHEN c.os IS NOT NULL THEN 2
         WHEN c.liv IS NULL THEN 1
    END AS situation
  FROM c
)
UPDATE "tranche" t SET
  "stade_com" = s.com,
  -- livré sans OS (situation NULL) : laissée en l'état, comme WinDev
  "situation_id" = CASE WHEN s.situation IS NULL THEN t."situation_id"
    ELSE (SELECT si."id" FROM "situation" si WHERE si."id" = s.situation) END,
  "situation_depuis_le" = CASE s.situation
    WHEN 4 THEN s.sav WHEN 3 THEN s.liv WHEN 2 THEN s.os WHEN 1 THEN NULL
    ELSE t."situation_depuis_le" END,
  "liste_avancement_actuel_id" = (
    SELECT sa."liste_avancement_id" FROM sa
     WHERE sa."tranche_id" = t."id" AND sa."date_reelle" = s.dernier
     ORDER BY sa."ordre", sa."id" LIMIT 1),
  "liste_avancement_prochain_id" = (
    SELECT sa."liste_avancement_id" FROM sa
     WHERE sa."tranche_id" = t."id" AND sa."date_reelle" IS NULL
       AND (sa."date_previ_maj_promo" > s.dernier
            OR (s.dernier IS NULL AND sa."date_previ_maj_promo" IS NOT NULL))
     ORDER BY sa."date_previ_maj_promo", sa."ordre", sa."id" LIMIT 1),
  "liste_avancement_suivi_actuel_id" = (
    SELECT sa."liste_avancement_id" FROM sa
     WHERE sa."tranche_id" = t."id" AND sa."avec_suivi"
       AND sa."date_reelle" = s.dernier_suivi
     ORDER BY sa."ordre", sa."id" LIMIT 1),
  "liste_avancement_suivi_prochain_id" = (
    SELECT sa."liste_avancement_id" FROM sa
     WHERE sa."tranche_id" = t."id" AND sa."avec_suivi" AND sa."date_reelle" IS NULL
       AND (sa."date_previ_maj_promo" > s.dernier_suivi
            OR (s.dernier_suivi IS NULL AND sa."date_previ_maj_promo" IS NOT NULL))
     ORDER BY sa."date_previ_maj_promo", sa."ordre", sa."id" LIMIT 1)
FROM s
WHERE s."id" = t."id";
