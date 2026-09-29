ALTER TABLE "bilan_caht" ADD COLUMN "id_bilan_caht" integer;--> statement-breakpoint
ALTER TABLE "bilan_resultat" ADD COLUMN "id_bilan_resultat" integer;--> statement-breakpoint
ALTER TABLE "budget" ADD COLUMN "sur_ope" boolean;--> statement-breakpoint
ALTER TABLE "civilite" ADD COLUMN "client" text;--> statement-breakpoint
ALTER TABLE "commercialisation" ADD COLUMN "promo_ges_nom" text;--> statement-breakpoint
ALTER TABLE "commercialisation" ADD COLUMN "tma_mailing_liste_devis" text;--> statement-breakpoint
ALTER TABLE "commercialisation" ADD COLUMN "tma_mailing_solde" text;--> statement-breakpoint
ALTER TABLE "commercialisation" ADD COLUMN "nb_tma" integer;--> statement-breakpoint
ALTER TABLE "concept" ADD COLUMN "architecte_id" integer;--> statement-breakpoint
ALTER TABLE "deblocage_psla" ADD COLUMN "deblocage_financement_id" integer;--> statement-breakpoint
ALTER TABLE "droit" ADD COLUMN "commentaires" text;--> statement-breakpoint
ALTER TABLE "interlocuteur_notaire" ADD COLUMN "fonction_legacy" text;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "libelle_mission" text;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "avec_appel_fond_client" boolean;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "avec_equiv_lgt" boolean;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "pourcentage_avancement" real;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "avec_archive" boolean;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "avec_suivi" boolean;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "ne_pas_decaler_auto" boolean;--> statement-breakpoint
ALTER TABLE "liste_avancement" ADD COLUMN "date_previ_promo_auto_decalage_unite_temps_id" integer;--> statement-breakpoint
ALTER TABLE "mission" ADD COLUMN "grille_specifique" boolean;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "certification_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "label_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "performance_energetique_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "est_moe_interne" boolean;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "type_foncier_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "apporteur_foncier_id" integer;--> statement-breakpoint
ALTER TABLE "operation" ADD COLUMN "pourcentage_kpi" real;--> statement-breakpoint
ALTER TABLE "prestataire" ADD COLUMN "afficher_operation" boolean;--> statement-breakpoint
ALTER TABLE "prestataire" ADD COLUMN "masquer_comm2" boolean;--> statement-breakpoint
ALTER TABLE "psla" ADD COLUMN "banque_id" integer;--> statement-breakpoint
ALTER TABLE "reserve" ADD COLUMN "windows_user" text;--> statement-breakpoint
ALTER TABLE "situation_famille" ADD COLUMN "id_situation_de_famille" integer;--> statement-breakpoint
ALTER TABLE "structure_juridique" ADD COLUMN "gestionnaire_sccv_legacy" text;--> statement-breakpoint
ALTER TABLE "subvention" ADD COLUMN "premier_deblocage_avancement" integer;--> statement-breakpoint
ALTER TABLE "subvention" ADD COLUMN "solde_deblocage_avancement" integer;--> statement-breakpoint
ALTER TABLE "subvention" ADD COLUMN "premier_deblocage_pourcentage" real;--> statement-breakpoint
ALTER TABLE "subvention" ADD COLUMN "solde_deblocage_pourcentage" real;--> statement-breakpoint
ALTER TABLE "subvention" ADD COLUMN "sur_ope" boolean;--> statement-breakpoint
ALTER TABLE "tranche" ADD COLUMN "montant_hono_par_logt" numeric;--> statement-breakpoint
-- Reprise des valeurs depuis le dernier import legacy, s'il est encore en base.
-- Colonne par colonne : une colonne absente du legacy en place est sautée.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('droit', 'Droit', 'IDDroit', 'commentaires', 'Commentaires', false),
    ('interlocuteur_notaire', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire', 'fonction_legacy', 'Fonction', false),
    ('situation_famille', 'SituationFamille', 'IDSituationFamille', 'id_situation_de_famille', 'IDSituationDeFamille', false),
    ('bilan_caht', 'tBilan_CAHT', 'IDBilanCAHT', 'id_bilan_caht', 'IDBilan_CAHT', false),
    ('bilan_resultat', 'tBilan_Resultat', 'IDBilanResultat', 'id_bilan_resultat', 'IDBilan_Resultat', false),
    ('budget', 'tBudget', 'IDBudget', 'sur_ope', 'SurOpe', true),
    ('civilite', 'tCivilite', 'IDCivilite', 'client', 'Client', false),
    ('commercialisation', 'tCommercialisation', 'IDCommercialisation', 'promo_ges_nom', 'PromoGesNom', false),
    ('commercialisation', 'tCommercialisation', 'IDCommercialisation', 'tma_mailing_liste_devis', 'TMAMailingListeDevis', false),
    ('commercialisation', 'tCommercialisation', 'IDCommercialisation', 'tma_mailing_solde', 'TMAMailingSolde', false),
    ('commercialisation', 'tCommercialisation', 'IDCommercialisation', 'nb_tma', 'NbTMA', false),
    ('concept', 'tConcept', 'IDConcept', 'architecte_id', 'IDArchitecte', false),
    ('deblocage_psla', 'tDeblocagePSLA', 'IDDeblocagePSLA', 'deblocage_financement_id', 'IDDeblocageFinancement', false),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'libelle_mission', 'LibelleMission', false),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'avec_appel_fond_client', 'AvecAppelFondClient', true),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'avec_equiv_lgt', 'AvecEquivLgt', true),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'pourcentage_avancement', 'PourcentageAvancement', false),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'avec_archive', 'AvecArchive', true),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'avec_suivi', 'AvecSuivi', true),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'ne_pas_decaler_auto', 'NePasDecalerAuto', true),
    ('liste_avancement', 'tListeAvancement', 'IDListeAvancement', 'date_previ_promo_auto_decalage_unite_temps_id', 'DatePreviPromoAuto_IDDecalageUniteTemps', false),
    ('prestataire', 'tListePrestataire', 'IDPrestataire', 'afficher_operation', 'AfficherOperation', true),
    ('prestataire', 'tListePrestataire', 'IDPrestataire', 'masquer_comm2', 'MasquerComm2', true),
    ('mission', 'tMission', 'IDMission', 'grille_specifique', 'GrilleSpecifique', true),
    ('operation', 'tOperation', 'IDOperation', 'certification_id', 'IDCertification', false),
    ('operation', 'tOperation', 'IDOperation', 'label_id', 'IDLabel', false),
    ('operation', 'tOperation', 'IDOperation', 'performance_energetique_id', 'IDPerformanceEnergetique', false),
    ('operation', 'tOperation', 'IDOperation', 'est_moe_interne', 'EstMOEInterne', true),
    ('operation', 'tOperation', 'IDOperation', 'type_foncier_id', 'IDTypeFoncier', false),
    ('operation', 'tOperation', 'IDOperation', 'apporteur_foncier_id', 'IDApporteurFoncier', false),
    ('operation', 'tOperation', 'IDOperation', 'pourcentage_kpi', 'PourcentageKPI', false),
    ('psla', 'tPSLA', 'IDPSLA', 'banque_id', 'IDBanque', false),
    ('reserve', 'tReserve', 'IDReserve', 'windows_user', 'WindowsUser', false),
    ('structure_juridique', 'tStructureJuridique', 'IDStructureJuridique', 'gestionnaire_sccv_legacy', 'GestionnaireSCCV', false),
    ('subvention', 'tSubvention', 'IDSubvention', 'premier_deblocage_avancement', 'PremierDeblocageAvancement', false),
    ('subvention', 'tSubvention', 'IDSubvention', 'solde_deblocage_avancement', 'SoldeDeblocageAvancement', false),
    ('subvention', 'tSubvention', 'IDSubvention', 'premier_deblocage_pourcentage', 'PremierDeblocagePoucentage', false),
    ('subvention', 'tSubvention', 'IDSubvention', 'solde_deblocage_pourcentage', 'SoldeDeblocagePoucentage', false),
    ('subvention', 'tSubvention', 'IDSubvention', 'sur_ope', 'SurOpe', true),
    ('tranche', 'tTranche', 'IDTranche', 'montant_hono_par_logt', 'MontantHonoParLogt', false)
  ) AS v(cible, source, cle, col, col_legacy, booleen) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'legacy' AND table_name = r.source
                  AND column_name = r.col_legacy) THEN
      EXECUTE format(
        'UPDATE %I t SET %I = ' || CASE WHEN r.booleen THEN '(l.%I::int <> 0)' ELSE 'l.%I' END
          || ' FROM legacy.%I l WHERE l.%I = t.id',
        r.cible, r.col, r.col_legacy, r.source, r.cle);
    END IF;
  END LOOP;
END $$;
