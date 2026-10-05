-- Factures de mission sans prestataire (tFacture.IDPrestataire = 0 dans la
-- base miroir) : rattachées à KPI. Celles déjà renseignées ne bougent pas.
UPDATE "facture" SET "prestataire_id" = (SELECT "id" FROM "prestataire" WHERE "libelle" = 'KPI')
WHERE "prestataire_id" IS NULL;
