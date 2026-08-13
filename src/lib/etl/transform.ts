// Transformation legacy → public (tranche 1 : backbone + dimension commerciale).
// Relançable après chaque import .bak : vide les tables du domaine puis recopie
// depuis le schéma "legacy" en préservant les IDs (les séquences sont recalées).
// Appelée par le pipeline d'import (/admin/import) et par npm run db:transform.
import { db } from '#/db/index.ts'

// NULLIF(col,0) : WinDev encode « pas de référence » par 0
const fk = (col: string) => `NULLIF(s."${col}", 0)`
// Variante blindée pour les références jamais validées par une contrainte SQL Server :
// on ne recopie la valeur que si la cible existe (sinon NULL), pour ne pas violer la FK.
const fkSafe = (col: string, refTable: string, refPk: string) =>
  `(SELECT s."${col}" WHERE EXISTS (SELECT 1 FROM legacy."${refTable}" r WHERE r."${refPk}" = s."${col}"))`

interface Copy {
  target: string
  cols: string // liste des colonnes cibles
  select: string // SELECT ... FROM legacy."..." s
}

const nomenclature = (
  target: string,
  source: string,
  pk: string,
  extra = '',
): Copy => ({
  target,
  cols: `(id, libelle${extra ? ', ' + extra.split(':')[0] : ''})`,
  select: `SELECT s."${pk}", COALESCE(s."Libelle", '')${extra ? ', ' + extra.split(':')[1] : ''} FROM legacy."${source}" s`,
})

const copies: Array<Copy> = [
  // --- nomenclatures ---
  nomenclature(
    'civilite',
    'tCivilite',
    'IDCivilite',
    'libelle_court:s."LibelleCourt"',
  ),
  nomenclature('csp', 'CSP', 'IDCSP', 'numero:s."Numero"'),
  nomenclature(
    'situation_familiale',
    'SituationFamiliale',
    'IDSituationFamiliale',
  ),
  nomenclature('situation_famille', 'SituationFamille', 'IDSituationFamille'),
  nomenclature('type_menage', 'TypeDeMenage', 'IDTypeDeMenage'),
  nomenclature(
    'type_logement_actuel',
    'TypeLogementActuel',
    'IDTypeLogementActuel',
    'num_rm:s."NumRM"',
  ),
  nomenclature(
    'acquereur_tranche_age',
    'tAcquereurTrancheAge',
    'IDAcquereurTrancheAge',
    'borne_max:s."BorneMax"',
  ),
  nomenclature(
    'acquereur_plafond_ressources',
    'tAcquereurPlafondRessources',
    'IDAcquereurPlafondRessources',
  ),
  nomenclature(
    'acquereur_revenu_quartile',
    'tAcquereurRevenuFoyerFiscalParQuartile',
    'IDAcquereurRevenuFoyerFiscalParQuartile',
    'borne_max:s."BorneMax"',
  ),
  nomenclature('nature_juridique', 'NatureJuridique', 'IDNatureJuridique'),
  nomenclature('type_acquereur', 'tListeTypeAcquereur', 'IDListeTypeAcquereur'),
  nomenclature(
    'fiscalite_acquereur',
    'tListeFiscaliteAcquereur',
    'IDFiscaliteAcquereur',
    'libelle_court:s."LibelleCourt"',
  ),
  {
    target: 'nature_achat',
    cols: '(id, libelle, libelle_long, ordre_comm)',
    select: `SELECT s."IDNatureAchat", COALESCE(s."Libelle", ''), s."LibelleLong", s."OrdreComm" FROM legacy."tListeNatureAchat" s`,
  },
  nomenclature('moyen_paiement', 'MoyenDePaiement', 'IDMoyenDePaiement'),
  nomenclature(
    'motif_clause_particuliere',
    'MotifClauseParticuliereComm',
    'IDMotifClauseParticuliereComm',
  ),
  nomenclature('banque_courtage', 'BanqueCourtage', 'IDBanqueCourtage'),
  {
    target: 'destination',
    cols: '(id, libelle, libelle_comm, commentaire)',
    select: `SELECT s."IDDestination", COALESCE(s."Libelle", ''), s."LibelleComm", s."Commentaire" FROM legacy."tDestination" s`,
  },
  {
    target: 'concept',
    cols: '(id, libelle, commentaire)',
    select: `SELECT s."IDConcept", COALESCE(s."Libelle", ''), s."Commentaire" FROM legacy."tConcept" s`,
  },
  nomenclature(
    'secteur_geographique',
    'SecteurGeographiqueDeveloppement',
    'IDSecteurGeographiqueDeveloppement',
  ),
  nomenclature('situation', 'tListeSituation', 'IDSituation'),
  nomenclature('signataire', 'Signataire', 'IDSignataire'),
  nomenclature('ofs_nom', 'OFSNom', 'IDOFSNom'),
  nomenclature('certification', 'Certification', 'IDCertification'),
  nomenclature('label', 'Label', 'IDLabel'),
  nomenclature(
    'performance_energetique',
    'PerformanceEnergetique',
    'IDPerformanceEnergetique',
  ),
  nomenclature(
    'mission_moe_interne',
    'MissionMOEInterne',
    'IDMissionMOEInterne',
  ),
  nomenclature(
    'categorie_subvention',
    'tCategorieSubvention',
    'IDCategorieSubvention',
  ),
  nomenclature(
    'organisme_subvention',
    'OrganismeSubvention',
    'IDOrganismeSubvention',
  ),
  {
    // DomaineStadeAvancement n'est qu'une liste de deux codes texte
    // (Chantier / Commercialisation) : le domaine reste une colonne texte
    target: 'liste_avancement',
    cols: '(id, domaine, code, libelle, ordre, avec_hono_gestion, pourcentage_standard)',
    select: `SELECT s."IDListeAvancement", s."Domaine", s."Code", COALESCE(s."Libelle", ''), s."Ordre",
        s."AvecHonoGestion", s."PourcentageStandard"
      FROM legacy."tListeAvancement" s`,
  },
  nomenclature('type_mission', 'tListeTypeMission', 'IDTypeMission'),
  // --- paramètres (phase 9) ---
  {
    target: 'commune',
    cols: '(id, libelle, code_insee, departement, code_postal, zonage_abc_revise)',
    select: `SELECT s."IDCommune", COALESCE(s."Libelle", ''), s."CodeINSEE",
        s."Departement", s."CodePostal", s."ZonageABCRevise"
      FROM legacy."Commune" s`,
  },
  nomenclature('type_foncier', 'TypeFoncier', 'IDTypeFoncier'),
  nomenclature('equipe_personne', 'EquipePersonne', 'IDEquipePersonne'),
  nomenclature(
    'prestataire',
    'tListePrestataire',
    'IDPrestataire',
    'afficher_mission:s."AfficherMission"',
  ),

  // --- interlocuteurs externes (notaires, architectes) ---
  nomenclature(
    'fonction_interlocuteur_notaire',
    'FonctionInterlocuteurNotaire',
    'IDFonctionInterlocuteurNotaire',
  ),
  {
    target: 'etude_notaire',
    cols: '(id, nom_etude, adresse, cp, commune, email, commentaire)',
    select: `SELECT s."IDEtudeNotaire", COALESCE(s."NomEtude", ''), s."Adresse", s."CP",
        s."Commune", s."Email", s."Commentaire"
      FROM legacy."EtudeNotaire" s`,
  },
  {
    // la colonne texte "Fonction" du legacy ne contient que des codes ('1') —
    // seule la FK IDFonctionInterlocuteurNotaire est reprise
    target: 'interlocuteur_notaire',
    cols: '(id, etude_notaire_id, fonction_id, civilite, patronyme, prenom, telephone, email)',
    select: `SELECT s."IDInterlocuteurNotaire", ${fk('IDEtudeNotaire')},
        ${fk('IDFonctionInterlocuteurNotaire')},
        s."Civilite", s."Patronyme", s."Prenom", s."Telephone", s."Email"
      FROM legacy."InterlocuteurNotaire" s`,
  },
  {
    target: 'architecte',
    cols: '(id, rs, commune, commentaire)',
    select: `SELECT s."IDArchitecte", COALESCE(s."RS", ''), s."Commune", s."Commentaires"
      FROM legacy."tArchitecte" s`,
  },

  // --- dimension financière (phase 6) : nomenclatures ---
  // (banque et index_taux sont copiées par le bloc SCCV, plus bas)
  nomenclature(
    'type_financement',
    'tListeTypeFinancement',
    'IDTypeFinancement',
    'categorie:s."Categorie"',
  ),
  nomenclature('fin_pret', 'tListeFinPret', 'IDFinPret'),
  nomenclature(
    'statut_part_sociale',
    'tListeStatutPartSociale',
    'IDStatutPartSociale',
  ),
  nomenclature('action_alerte', 'tListeActionAlerte', 'IDActionAlerte'),
  nomenclature('statut_apport', 'StatutApport', 'IDStatutApport'),
  nomenclature(
    'mandat_hypothequer',
    'MandatHypothequer',
    'IDMandatHypothequer',
  ),
  nomenclature('statut_cout_mandat', 'StatutCoutMandat', 'IDStatutCoutMandat'),
  nomenclature('periode_taux_gfa', 'PeriodeTauxGFA', 'IDPeriodeTauxGFA'),
  nomenclature('action_fin_gfa_type', 'ActionFinGFAType', 'IDActionFinGFAType'),
  nomenclature(
    'statut_apport_promoteur_gfa',
    'StatutApportPromoteurGFA',
    'IDStatutApportPromoteurGFA',
  ),
  nomenclature('banque_action_type', 'BanqueActionType', 'IDBanqueActionType'),
  nomenclature(
    'garantie_emprunt_action_type',
    'GarantieEmpruntActionType',
    'IDGarantieEmpruntActionType',
  ),
  nomenclature(
    'organisme_agrement',
    'tListeOrganismeAgrement',
    'IDOrganismeAgrement',
  ),
  nomenclature(
    'organisme_garantie_emprunt',
    'tListeOrganismeGarantieEmprunt',
    'IDOrganismeGarantieEmprunt',
  ),
  nomenclature(
    'mode_repart_quote_part',
    'tListeModeRepartQuotePart',
    'IDModeRepartQuotePart',
  ),
  nomenclature('liste_budget', 'tListeBudget', 'IDListeBudget'),
  nomenclature('usage_frais', 'UsageFrais', 'IDUsageFrais'),
  {
    target: 'categorie_frais',
    cols: '(id, libelle, est_publicite, ordre, usage_frais_id)',
    select: `SELECT s."IDCategorieFrais", COALESCE(s."Libelle", ''), s."EstPublicite", s."Ordre",
        ${fkSafe('IDUsageFrais', 'UsageFrais', 'IDUsageFrais')}
      FROM legacy."CategorieFrais" s`,
  },
  nomenclature(
    'type_mission_budget_architecte',
    'TypeMissionBudgetArchitecte',
    'IDTypeMissionBudgetArchitecte',
  ),

  // --- colonne vertébrale ---
  // --- module SCCV (phase 4) : référentiels ---
  nomenclature(
    'structure_juridique_stade',
    'tStructureJuridique_Stade',
    'IDStructureJuridique_Stade',
  ),
  nomenclature('gestionnaire_sccv', 'GestionnaireSCCV', 'IDGestionnaireSCCV'),
  nomenclature('partenariat', 'Partenariat', 'IDPartenariat'),
  nomenclature('index_taux', 'tIndextaux', 'IDIndextaux'),
  nomenclature(
    'motif_remuneration_associe',
    'MotifRemunerationAssocie',
    'IDMotifRemunerationAssocie',
  ),
  nomenclature(
    'type_compte_banque',
    'tListeTypeCompteBanque',
    'IDTypeCompteBanque',
  ),
  nomenclature(
    'utilisation_compte',
    'tListeUtilisationCompte',
    'IDUtilisationCompte',
  ),
  {
    target: 'sie',
    cols: '(id, libelle, adresse, cp, commune)',
    select: `SELECT s."IDSIE", COALESCE(s."Libelle", ''), s."Adresse", s."CP", s."Commune"
      FROM legacy."tSIE" s`,
  },
  nomenclature('fonction', 'tFonction', 'IDFonction'),
  {
    target: 'personne',
    cols: '(id, patronyme, prenom, est_present, fonction_id, equipe_personne_id, email)',
    select: `SELECT s."IDPersonne", s."Patronyme", s."Prenom", s."EstPresent",
        ${fk('IDFonction')}, ${fk('IDEquipePersonne')}, s."EMail"
      FROM legacy."tPersonne" s`,
  },
  {
    target: 'banque',
    cols: `(id, libelle, cc_nom, cc_adresse, cc_cp, cc_commune, cc_tel, cc_email,
            pret_nom, pret_adresse, pret_cp, pret_commune, pret_tel, pret_email)`,
    select: `SELECT s."IDBanque", COALESCE(s."Libelle", ''), s."CCNom", s."CCAdresse",
        s."CCCP", s."CCCommune", s."CCTel", s."CCEMail",
        s."PretNom", s."PretAdresse", s."PretCP", s."PretCommune", s."PretTel", s."PretEMail"
      FROM legacy."tBanque" s`,
  },
  {
    target: 'associe',
    cols: `(id, rs, forme_juridique, siren, adresse1, adresse2, cp, commune, tel,
            est_hlm, contact_nom_complet, contact_fonction, email, commentaire)`,
    select: `SELECT s."IDAssocie", COALESCE(s."RS", ''), s."FormeJuridique", s."SIREN",
        s."Adresse1", s."Adresse2", s."CP", s."Commune", s."Tel",
        s."EstHLM", s."ContactNomComplet", s."ContactFonction", s."EMail", s."Commentaire"
      FROM legacy."tAssocie" s`,
  },
  {
    target: 'structure_juridique',
    cols: `(id, rs, num_tva_intra, siret, date_debut_activite, date_immat, date_liquidation,
            capital, nb_part, montant_part, sccv_hf, sccv_hlm,
            stade_id, personne_comptable_id, gestionnaire_sccv_id, partenariat_id, hfsga,
            date_bilan_debut_premier_exercice, date_bilan_fin_premier_exercice,
            date_modif_cloture, date_planning_cloture, date_liberation_capital,
            edi_tva, edi_liasse, cpte_fiscal, sie_id, civilite_id, interlocuteur_sie, date_mandat_sie)`,
    select: `SELECT s."IDStructureJuridique", s."RS", s."NumTVAIntra",
        NULLIF(s."Siret", 0)::bigint::text,
        s."DateDebutActivite", s."DateImmat", s."DateLiquidation",
        s."CapitalSCCV", s."NbPart", s."MontantPart", s."SCCV_HF", s."SCCV_HLM",
        ${fkSafe('Stade', 'tStructureJuridique_Stade', 'IDStructureJuridique_Stade')},
        ${fkSafe('IDPersonneComptable', 'tPersonne', 'IDPersonne')},
        ${fkSafe('IDGestionnaireSCCV', 'GestionnaireSCCV', 'IDGestionnaireSCCV')},
        ${fkSafe('IDPartenariat', 'Partenariat', 'IDPartenariat')},
        s."HFSGA",
        s."DateBilanDebutPremierExercice", s."DateBilanFinPremierExercice",
        s."DateModifCloture", s."DatePlanningCloture", s."DateLiberationCapital",
        s."EDI_TVA", s."EDI_Liasse", s."CpteFiscal",
        ${fkSafe('IDSIE', 'tSIE', 'IDSIE')},
        ${fkSafe('IDCivilite', 'tCivilite', 'IDCivilite')},
        s."InterlocuteurSIE", s."DateMandatSIE"
      FROM legacy."tStructureJuridique" s`,
  },
  {
    target: 'participation',
    cols: `(id, structure_juridique_id, associe_id, pourcentage, commentaires, conv_treso,
            motif_remuneration_associe_id, date_signature_conv, date_application,
            date_fin_remuneration, index_taux_remuneration_id, info_taux_remuneration)`,
    select: `SELECT s."IDParticipation", s."IDStructureJuridique",
        ${fkSafe('IDAssocie', 'tAssocie', 'IDAssocie')},
        s."Pourcentage", s."Commmentaires", s."ConvTreso",
        ${fkSafe('IDMotifRemunerationAssocie', 'MotifRemunerationAssocie', 'IDMotifRemunerationAssocie')},
        s."DateSignatureConv", s."DateApplication", s."DateFinRemuneration",
        ${fkSafe('IDIndexTaux_Remuneration', 'tIndextaux', 'IDIndextaux')},
        s."InfoTauxRemuneration"
      FROM legacy."tParticipation" s
      WHERE EXISTS (SELECT 1 FROM legacy."tStructureJuridique" r
                    WHERE r."IDStructureJuridique" = s."IDStructureJuridique")`,
  },
  {
    target: 'compte_banque',
    cols: `(id, structure_juridique_id, banque_id, type_compte_banque_id,
            utilisation_compte_id, num_compte, iban, bic, est_cloture, commentaires)`,
    select: `SELECT s."IDCompteBanque", s."IDStructureJuridique",
        ${fkSafe('IDBanque', 'tBanque', 'IDBanque')},
        ${fkSafe('IDTypeCompteBanque', 'tListeTypeCompteBanque', 'IDTypeCompteBanque')},
        ${fkSafe('IDUtilisationCompte', 'tListeUtilisationCompte', 'IDUtilisationCompte')},
        s."NumCompte", s."IBAN", s."BIC", s."EstCloture", s."Commentaires"
      FROM legacy."tCompteBanque" s
      WHERE EXISTS (SELECT 1 FROM legacy."tStructureJuridique" r
                    WHERE r."IDStructureJuridique" = s."IDStructureJuridique")`,
  },
  {
    target: 'operation',
    cols: `(id, structure_juridique_id, libelle, adresse, cp, commune, nom_zac, secteur_geographique_id,
            sur_rennes_metropole, anru, anru_commentaire, indiv_coll, annee_dgd, abreviation_code_reserve,
            notaire_vente_id, clerc_vente_id, notaire_foncier_id, clerc_foncier_id,
            possibilite_investisseur, taux_investisseur_autorise, commentaire_investisseur,
            date_validation_engagement, date_abandon, commentaires_abandon,
            masquer_commercial, masquer_comptable, masquer_promo, commentaire,
            charge_ope1_id, charge_ope2_id)`,
    select: `SELECT s."IDOperation", ${fk('IDStructureJuridique')}, s."Libelle", s."Adresse", s."CP", s."Commune",
        s."NomZAC", ${fk('IDSecteurGeographiqueDeveloppement')},
        s."SurRennesMetropole", s."ANRU", s."ANRUComment", s."IndivColl", s."AnneeDGD", s."AbreviationPourCodeReserve",
        ${fkSafe('IDInterlocuteurNotaire_Notaire_Vente', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        ${fkSafe('IDInterlocuteurNotaire_Clerc_Vente', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        ${fkSafe('IDInterlocuteurNotaire_Notaire_Foncier', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        ${fkSafe('IDInterlocuteurNotaire_Clerc_Foncier', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        s."PossibiliteInvestisseur", s."TauxInvestisseurAutorise", s."CommentaireInvestisseur",
        s."DateValidationEngagement", s."DateAbandon", s."CommentairesAbandon",
        s."MasquerCommercial", s."MasquerComptable", s."MasquerPromo", s."Commentaire",
        ${fkSafe('curIDPersonne_ChargeOpe1', 'tPersonne', 'IDPersonne')},
        ${fkSafe('curIDPersonne_ChargeOpe2', 'tPersonne', 'IDPersonne')}
      FROM legacy."tOperation" s`,
  },
  {
    target: 'tranche',
    cols: `(id, operation_id, libelle, concept_id, architecte_mandataire_id, architecte_cotraitant_id,
            adresse, nb_logt_indiv, nb_logt_coll, nb_autres_locaux,
            nb_terrain, dont_logt_coll_psla, dont_logt_indiv_psla, dont_logt_coll_brs, dont_logt_indiv_brs,
            nb_etage, duree_chantier_mois, date_convention, date_livraison_contractuelle,
            pas_de_commercialisation, stade_com, situation_id, situation_depuis_le, commentaire,
            terrain_montant_ht, terrain_montant_ttc, terrain_pourc_acpte_prevu, terrain_acompte,
            terrain_signataire_id, terrain_commentaire,
            ofs_nom_id, terrain_ofs_montant_ht, terrain_ofs_acpte_pourc_prevu,
            terrain_ofs_acpte_montant_verse, terrain_ofs_signataire_id,
            terrain_ofs_compromis_date_previ, terrain_ofs_compromis_date_reelle,
            terrain_bail_operateur_date_previ, terrain_bail_operateur_date_reelle,
            autre_montant, autre_commentaire,
            certification_id, label_id, performance_energetique_id,
            est_moe_interne, mission_moe_interne_id, commentaire_avancement,
            caht_prev_psla, caht_prev_vefa_reduit, caht_prev_vefa, caht_prev_autre,
            caht_prev_commentaire, caht_actua, caht_reel,
            subv_prev_psla, subv_prev_vefa_reduit, subv_prev_vefa_normal, subv_prev_autre,
            hono_comm_psla, hono_comm_vefa_reduit, hono_comm_vefa_normal, hono_comm_autre,
            cout_prev_psla, cout_prev_vefa, cout_prev_autre, cout_prev_commentaire,
            cout_reel_psla, cout_reel_vefa, cout_reel_autre, cout_reel_commentaire,
            quote_part_psla, quote_part_vefa_reduit, quote_part_vefa_normal, quote_part_autre,
            quote_part_commentaire, mode_repart_quote_part_id, nb_lvo_prev, nb_lvo_prev_annee,
            frais_budget_date, frais_budget_commentaire, frais_actua_date, frais_actua_commentaire,
            frais_consomme_date, frais_consomme_commentaire, frais_reel_date, frais_reel_commentaire,
            liste_budget_frais_stade_id, type_mission_budget_architecte_id, date_contrat_architecte,
            liste_avancement_actuel_id, liste_avancement_prochain_id,
            liste_avancement_suivi_actuel_id, liste_avancement_suivi_prochain_id)`,
    select: `SELECT s."IDTranche", s."IDOperation", s."Libelle", ${fk('IDConcept')},
        ${fkSafe('IDArchitecte_Mandataire', 'tArchitecte', 'IDArchitecte')},
        ${fkSafe('IDArchitecte_CoTraitant', 'tArchitecte', 'IDArchitecte')},
        s."Adresse",
        s."NbLogtIndiv", s."NbLogtColl", s."NbAutresLocaux", s."NbTerrain",
        s."DontLogtCollPSLA", s."DontLogtIndivPSLA", s."DontLogtCollBRS", s."DontLogtIndivBRS",
        s."NbEtage", s."DureeChantierMois", s."DateConvention", s."DateLivraisonContractuelle",
        s."PasDeCommercialisation", s."StadeCOM", ${fk('StadeIDSituation')}, s."StadeDepuisLe", s."Commentaire",
        s."TerrainMontantHT", s."TerrainMontantTTC", s."TerrainPourcAcptePrevu", s."TerrainAcompte",
        ${fkSafe('TerrainCompromis_IDSignataire', 'Signataire', 'IDSignataire')}, s."TerrainComm",
        ${fkSafe('IDOFSNom', 'OFSNom', 'IDOFSNom')}, s."TerrainOFSMontantHT", s."TerrainOFSAcptePourcPrevu",
        s."TerrainOFSAcpteMontantVerse", ${fkSafe('TerrainOFSCompromis_IDSignataire', 'Signataire', 'IDSignataire')},
        s."TerrainOFSCompromisDatePrevi", s."TerrainOFSCompromisDateReele",
        s."TerrainBailOperateurDatePrevi", s."TerrainBailOperateurDateReelle",
        s."DroitAppuiAutreMnt", s."DroitAppuiAutreComment",
        ${fkSafe('IDCertification', 'Certification', 'IDCertification')},
        ${fkSafe('IDLabel', 'Label', 'IDLabel')},
        ${fkSafe('IDPerformanceEnergetique', 'PerformanceEnergetique', 'IDPerformanceEnergetique')},
        s."EstMOEInterne", ${fkSafe('IDMissionMOEInterne', 'MissionMOEInterne', 'IDMissionMOEInterne')},
        s."CommentaireAvancement",
        s."CAHTPrevPSLA", s."CAHTPrevVEFA_Reduit", s."CAHTPrevVEFA", s."CAHTPrevAutre",
        s."CAHTPrevCommentaire", s."CAHTActua", s."CAHTReel",
        s."SubvPrevPSLA", s."SubvPrevVEFA_Reduit", s."SubvPrevVEFA_Normal", s."SubvPrevAutre",
        s."HonoCommPSLA", s."HonoCommVEFA_Reduit", s."HonoCommVEFA_Normal", s."HonoCommVEFA_Autre",
        s."CoutPrevPSLA", s."CoutPrevVEFA", s."CoutPrevAutre", s."CoutPrevCommentaire",
        s."CoutReelPSLA", s."CoutReelVEFA", s."CoutReelAutre", s."CoutReelCommentaire",
        s."QuotePartPSLA", s."QuotePartVEFA_Reduit", s."QuotePartVEFA_Normal", s."QuotePartAutre",
        s."QuotePartCommentaire",
        ${fkSafe('IDModeRepartQuotePart', 'tListeModeRepartQuotePart', 'IDModeRepartQuotePart')},
        s."NbLVOPrev", s."NbLVOPrevAnnee",
        s."FraisBudgetDate", s."FraisBudgetCommentaire", s."FraisActuaDate", s."FraisActuaCommentaire",
        s."FraisConsommeDate", s."FraisConsommeCommentaire", s."FraisReelDate", s."FraisReelCommentaire",
        ${fkSafe('IDListeBudget_FraisStade', 'tListeBudget', 'IDListeBudget')},
        ${fkSafe('IDTypeMissionBudgetArchitecte', 'TypeMissionBudgetArchitecte', 'IDTypeMissionBudgetArchitecte')},
        s."DateContratArchitecte",
        ${fkSafe('IDListeAvancement_actuel', 'tListeAvancement', 'IDListeAvancement')},
        ${fkSafe('IDListeAvancement_prochain', 'tListeAvancement', 'IDListeAvancement')},
        ${fkSafe('IDListeAvancement_suivi_actuel', 'tListeAvancement', 'IDListeAvancement')},
        ${fkSafe('IDListeAvancement_suivi_prochain', 'tListeAvancement', 'IDListeAvancement')}
      FROM legacy."tTranche" s`,
  },
  {
    target: 'stade_avancement',
    cols: `(id, tranche_id, liste_avancement_id, date_previ_compta_debut_annee, date_previ_maj_promo,
            date_reelle, ordre, pourcentage_avancement_reel, montant_previ, commentaire)`,
    select: `SELECT s."IDStadeAvancement",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        ${fkSafe('IDListeAvancement', 'tListeAvancement', 'IDListeAvancement')},
        s."DatePrevComptaDebutAnnee", s."DatePrevMAJPromo", s."DateReelle",
        s."Ordre", s."PourcentageAvancementReel", s."MontantPrevi", s."Commentaire"
      FROM legacy."tStadeAvancement" s`,
  },
  {
    target: 'subvention',
    cols: `(id, tranche_id, categorie_id, organisme_id, num_convention, date_convention, date_caducite,
            montant_agrement, montant_provisoire, montant_definitif,
            budget_previ_montant, budget_previ_commentaire, fin_de_suivi, commentaire)`,
    select: `SELECT s."IDSubvention",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        ${fkSafe('IDCategorieSubvention', 'tCategorieSubvention', 'IDCategorieSubvention')},
        ${fkSafe('IDOrganismeSubvention', 'OrganismeSubvention', 'IDOrganismeSubvention')},
        s."NumConvention", s."DateConvention", s."DateCaducite",
        s."MontantAgrement", s."MontantProvisoire", s."MontantDefinitif",
        s."BudgetPreviMontant", s."BudgetPreviCommentaire", s."FinDeSuivi", s."Commentaire"
      FROM legacy."tSubvention" s`,
  },
  {
    target: 'contentieux',
    cols: '(id, operation_id, objet, date_debut, date_fin, avocats, commentaires)',
    select: `SELECT s."IDContentieux",
        ${fkSafe('IDOperation', 'tOperation', 'IDOperation')},
        s."Objet", s."DateDebut", s."DateFin", s."Avocats", s."Commentaires"
      FROM legacy."Contentieux" s`,
  },
  // --- dimension financière : tables métier ---
  {
    target: 'deblocage_subvention',
    cols: '(id, subvention_id, date_demande, montant, date_paiement, commentaire)',
    select: `SELECT s."IDDeblocationSubvention",
        ${fkSafe('IDSubvention', 'tSubvention', 'IDSubvention')},
        s."DateDemande", s."Montant", s."DatePaiement", s."Commentaire"
      FROM legacy."tDeblocageSubvention" s`,
  },
  {
    target: 'frais_financier',
    cols: `(id, tranche_id, categorie_frais_id, budget_montant, actua_montant,
            consomme_montant, reel_montant, ordre)`,
    select: `SELECT s."IDFraisFinancierPub",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        ${fkSafe('IDCategorieFrais', 'CategorieFrais', 'IDCategorieFrais')},
        s."BudgetMontant", s."ActuaMontant", s."ConsommeMontant", s."ReelMontant", s."Ordre"
      FROM legacy."FraisFinancierPub" s`,
  },
  {
    target: 'budget',
    cols: '(id, tranche_id, liste_budget_id, date_validation, date_saisie_promoges, commentaire)',
    select: `SELECT s."IDBudget",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        ${fkSafe('IDListeBudget', 'tListeBudget', 'IDListeBudget')},
        s."DateValidation", s."DateSaisiePromoges", s."Commentaire"
      FROM legacy."tBudget" s`,
  },
  {
    target: 'financement',
    cols: `(id, tranche_id, type_financement_id, banque_id, sur_ope,
            montant_financement, montant_previ, infos_pret_previ,
            date_envoi_dossier, date_signature, date_butoir, action_alerte_id,
            date_debut_mobilisation, date_fin_mobilisation, duree_mois_mob_psla,
            fin_pret_id, index_taux_id, index_taux_floore, marge_banque, taux_pret,
            periodicite, commission_engagement_pourc, frais_dossier, est_prlv_frais_dossier,
            est_phase_amortissement, est_solde, num_contrat,
            part_sociale_montant, statut_part_sociale_id, date_statut_part_sociale,
            apport_promoteur, statut_apport_id,
            blocage_hono_oc_montant, blocage_hono_oc_fin, blocage_hono_oc_comment, est_hf_caution_oc,
            mandat_hypothequer_id, mandat_cout_montant, statut_cout_mandat_id,
            prev_mt_oc, contrat_montant, contrat_nb_logt,
            date_debut_echeance, date_fin_echeance, montant_echeance, date_verst_pret,
            pret_employeur_numero_modif_echeance, pret_employeur_date_debut_amort,
            est_amort_differe, amortissement_differe_duree, amortissement_differe_fin_date,
            commentaire)`,
    select: `SELECT s."IDFinancement",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        ${fkSafe('IDTypeFinancement', 'tListeTypeFinancement', 'IDTypeFinancement')},
        ${fkSafe('IDBanque', 'tBanque', 'IDBanque')},
        s."SurOpe",
        s."MontantFinancement", s."MontantPrevi", s."InfosPretprevi",
        s."DateEnvoiDossier", s."DateSignature", s."DateButoir",
        ${fkSafe('IDActionAlerte', 'tListeActionAlerte', 'IDActionAlerte')},
        s."DateDebutMobilisation", s."DateFinMobilisation", s."DureeMoisMobPSLA",
        ${fkSafe('IDListeFinPret', 'tListeFinPret', 'IDFinPret')},
        ${fkSafe('IndexTaux', 'tIndextaux', 'IDIndextaux')},
        s."IndexTauxFloore", s."MargeBanque", s."TauxPret",
        s."Periodicite", s."CommissionEngagementPourc", s."FraisDossier", s."EstPrlvFraisDossier",
        s."EstPhaseAmortissement", s."EstSolde", s."NumContrat",
        s."PartSocialeMontant",
        ${fkSafe('IDListeStatutPartSociale', 'tListeStatutPartSociale', 'IDStatutPartSociale')},
        s."DateStatutPartSociale",
        s."ApportPromoteur",
        ${fkSafe('IDStatutApport', 'StatutApport', 'IDStatutApport')},
        s."BlocageHonoOCMontant", s."BlocageHonoOCFin", s."BlocageHonoOCComment", s."EstHFCautionOC",
        ${fkSafe('IDMandatHypothequer', 'MandatHypothequer', 'IDMandatHypothequer')},
        s."MandatCoutMontant",
        ${fkSafe('IDStatutCoutMandat', 'StatutCoutMandat', 'IDStatutCoutMandat')},
        s."PrevMtOC", s."ContratMontant", s."ContratNbLogt",
        s."DateDebutEcheance", s."DateFinEcheance", s."MontantEcheance", s."DateVerstPret",
        s."PretEmployeurNumeroModifEcheance", s."PretEmployeurDateDebutAmort",
        s."EstAmortDiffére", s."AmortissementDiffereDuree", s."AmortissementDiffereFinDate",
        s."Commentaire"
      FROM legacy."tFinancement" s`,
  },
  {
    target: 'psla',
    cols: `(id, tranche_id, estim_psla, montant_psla, cout_total, nb_logt_agrement,
            num_agrement, date_agrement_provisoire, duree_annee_psla,
            organisme_agrement_id, previ_agrement, date_depot_dossier_agrement,
            date_reception_agrement, date_decision_agrement, date_convention_engagement_reciproque,
            cff_fi_client, banque_operateur_id, banque_operateur_date, banque_client_id, banque_client_date,
            organisme_garantie_emprunt_id, date_deliberation_garantie,
            num_bureau_garantie, num_convention_garantie, date_signature_garant,
            garantie_emprunt_action_date, garantie_emprunt_action_type_id,
            banque_action_date, banque_action_type_id,
            date_info_annuelle, date_info_fin, fin_suivi, commentaire, commentaires)`,
    select: `SELECT s."IDPSLA",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        s."EstimPSLA", s."MontantPSLA", s."CoutTotal", s."NbLogtAgrement",
        s."NumAgrement", s."DateAgrementProvisoire", s."DureeAnneePSLA",
        ${fkSafe('OrganismeAgrément', 'tListeOrganismeAgrement', 'IDOrganismeAgrement')},
        s."PreviAgrement", s."DateDepotDossierAgrement",
        s."DateReceptionAgrement", s."DateDecisionAgrement", s."DateConventionEngagementReciproque",
        s."CFF_FI_Client",
        ${fkSafe('BanqueOperateur', 'tBanque', 'IDBanque')}, s."BanqueOperateurDate",
        ${fkSafe('BanqueClient', 'tBanque', 'IDBanque')}, s."BanqueClientDate",
        ${fkSafe('OrganismeGarantieEmprunt', 'tListeOrganismeGarantieEmprunt', 'IDOrganismeGarantieEmprunt')},
        s."DateDeliberationGarantie",
        s."NumBureauGarantie", s."NumConventionGarantie", s."DateSignatureGarant",
        s."GarantieEmpruntActionDate",
        ${fkSafe('IDGarantieEmpruntActionType', 'GarantieEmpruntActionType', 'IDGarantieEmpruntActionType')},
        s."BanqueActionDate",
        ${fkSafe('IDBanqueActionType', 'BanqueActionType', 'IDBanqueActionType')},
        s."DateInfoAnnuelle", s."DateInfoFin", s."FinSuivi", s."Commentaire", s."Commemtaires"
      FROM legacy."tPSLA" s`,
  },
  {
    target: 'deblocage_psla',
    cols: '(id, financement_id, psla_id, numero, montant, date_demande, date_versement, commentaire)',
    select: `SELECT s."IDDeblocagePSLA",
        ${fkSafe('IDFinancement', 'tFinancement', 'IDFinancement')},
        ${fkSafe('IDPSLA', 'tPSLA', 'IDPSLA')},
        s."Numero", s."Montant", s."DateDemande", s."DateVersement", s."Commentaire"
      FROM legacy."tDeblocagePSLA" s`,
  },
  {
    target: 'remboursement_anticipe',
    cols: '(id, financement_id, numero, montant, date, nb_logt, commentaire)',
    select: `SELECT s."IDRemboursementAnticipe",
        ${fkSafe('IDFinancement', 'tFinancement', 'IDFinancement')},
        s."Numero", s."Montant", s."Dat", s."NbLgt", s."Commentaire"
      FROM legacy."tRemboursementAnticipe" s`,
  },
  {
    target: 'gfa',
    cols: `(id, tranche_id, sur_ope, banque_id, est_intrinseque, date_validation,
            date_dossier, date_accord, date_attestation,
            apport_promoteur, statut_apport_promoteur_gfa_id, action_fin_date, action_fin_type_id,
            fin_gfa, fonds_garantie_montant, fonds_garantie_date_demande_remb, fonds_garantie_date_remb,
            part_sociale_montant, part_sociale_date_demande_remb, part_sociale_date_remb, part_sociale_commentaire,
            hf_caution, taux, periode_taux_gfa_id, duree_mois, commentaire_taux,
            base_initiale, commission_caution_montant, date_premier_prlvt, frais_dossier,
            precom_pourc, ca_ttc_min, commentaire_conditions, commentaires)`,
    select: `SELECT s."IDGFA",
        ${fkSafe('IDTranche', 'tTranche', 'IDTranche')},
        s."SurOpe",
        ${fkSafe('IDBanque', 'tBanque', 'IDBanque')},
        s."EstIntrinseque", s."DateValidation",
        s."DateDossierGFA", s."DateAccord", s."DateAttestation",
        s."ApportPromoteurGFA",
        ${fkSafe('IDStatutApportPromoteurGFA', 'StatutApportPromoteurGFA', 'IDStatutApportPromoteurGFA')},
        s."ActionFinGFADate",
        ${fkSafe('IDActionFinGFAType', 'ActionFinGFAType', 'IDActionFinGFAType')},
        s."FinGFA", s."FondsGarantieMt", s."FondsGarantieDateDemandeRemb", s."FondsGarantieDateRemb",
        s."PartSocialeMt", s."PartSocialeDateDemandeRemb", s."PartSocialeDateRemb", s."PartSocialeComm",
        s."HFCautionGFA", s."Taux",
        ${fkSafe('IDPeriodeTauxGFA', 'PeriodeTauxGFA', 'IDPeriodeTauxGFA')},
        s."DureeMoisGFA", s."CommGFA",
        s."BaseInitialeGFA", s."CommissionCautionMontant", s."DatePremierPrlevtGFA", s."FraisDossier",
        s."PrecomGFAPourc", s."CATTCminGFA", s."CommCondGFA", s."Commentaires"
      FROM legacy."tGFA" s`,
  },
  {
    target: 'reduc_gfa',
    cols: '(id, gfa_id, montant, date_reduc, commentaire)',
    select: `SELECT s."IDReducGFA",
        ${fkSafe('IDGFA', 'tGFA', 'IDGFA')},
        s."Montant", s."DateReduc", s."Comm"
      FROM legacy."ReducGFA" s`,
  },

  // --- bilan par SCCV (phase 8) ---
  {
    target: 'bilan_stock',
    cols: `(id, structure_juridique_id, annee, stock_total_debit_33a35, stock_total_credit_33a35,
            stock_credit_713300, stock_psla_phase_loc_nb, stock_psla_phase_loc_cout,
            stock_invendu_nb, stock_invendu_cout)`,
    select: `SELECT s."IDBilanStock", s."IDStructureJuridique", s."Annee",
        s."StockTotalDebit33a35", s."StockTotalCredit33a35", s."StockCredit713300",
        s."StockPSLAPhaseLocNb", s."StockPSLAPhaseLocCout", s."StockInvenduNb", s."StockInvenduCout"
      FROM legacy."tBilan_Stock" s`,
  },
  {
    target: 'bilan_caht',
    cols: `(id, structure_juridique_id, annee, caht_vefa, caht_lv_psla, caht_loyers,
            caht_tma, caht_terrain, caht_autres, caht_commentaire,
            nb_lot_vefa, nb_lot_lv_psla, nb_lot_autre, nb_lot_commentaire)`,
    select: `SELECT s."IDBilanCAHT", s."IDStructureJuridique", s."Annee",
        s."CAHT_VEFA", s."CAHT_LV_PSLA", s."CAHT_Loyers", s."CAHT_TMA", s."CAHT_Terrain",
        s."CAHT_Autres", s."CAHT_Commentaire",
        s."NbLot_VEFA", s."NbLot_LV_PSLA", s."NbLot_Autre", s."NbLot_Commentaire"
      FROM legacy."tBilan_CAHT" s`,
  },
  {
    // colonnes *_old (QuotePartHF_ResultCpta_*) exclues, convention schéma cible
    target: 'bilan_resultat',
    cols: `(id, structure_juridique_id, annee, result_cpta_sccv_total, ran_sccv, cpte_courant_sccv,
            date_pvag, result_acompte_montant, result_acompte_date_versement,
            reintegration_fiscale_sccv, deduction_fiscale_sccv,
            reintegration_fiscale_comm, deduction_fiscale_comm,
            result_cpta_sccv_is, result_cpta_sccv_non_is,
            reint_hf_result_fiscal, deduc_hf_perte_fiscale, reint_hf_perte_comptable, deduc_hf_result_comptable,
            pourc_hf_annee, commentaire_pourc_hf,
            result_fisca_sccv_is, result_fisca_sccv_non_is,
            ran_sccv_is, ran_sccv_non_is, ran_sccv_total,
            quote_part_hf_ran_is, quote_part_hf_ran_non_is, quote_part_hf_ran_total)`,
    select: `SELECT s."IDBilanResultat", s."IDStructureJuridique", s."Annee",
        s."ResultCpta_SCCV_Total", s."RAN_SCCV", s."CpteCourant_SCCV",
        s."DatePVAG", s."ResultAcompteMontant", s."ResultAcompteDateVersement",
        s."ReintegrationFiscale_SCCV", s."DeductionFiscale_SCCV",
        s."ReintegrationFiscaleComm", s."DeductionFiscaleCOmm",
        s."ResultCpta_SCCV_IS", s."ResultCpta_SCCV_NonIS",
        s."ReintHF_ResultFiscal", s."DeducHF_PerteFiscale", s."ReintHF_PerteComptable", s."DeducHF_ResultComptable",
        s."PourcHFAnnee", s."CommentairePourcHF",
        s."ResultFisca_SCCV_IS", s."ResultFisca_SCCV_NonIS",
        s."RAN_SCCV_IS", s."RAN_SCCV_NonIS", s."RAN_SCCV_Total",
        s."QuotePartHF_RAN_IS", s."QuotePartHF_RAN_NonIS", s."QuotePartHF_RAN_Total"
      FROM legacy."tBilan_Resultat" s`,
  },

  // --- déclarations (phase 8) ---
  {
    // le legacy n'a que la colonne Code — l'id est généré à la copie
    target: 'accord_cadre_assurance',
    cols: '(code)',
    select: `SELECT s."Code" FROM legacy."AccordCadreAssurance" s`,
  },
  {
    target: 'assurance_do_mrh',
    cols: `(id, tranche_id, num_contrat, type_contrat, date_souscription, date_dgd,
            date_resiliation, date_fin_trc, accord_cadre, cout_operation,
            montant_cotisation, commentaire, sur_ope)`,
    select: `SELECT s."IDAssuranceDoMrH", s."IDTranche", s."NumContrat", s."TypeContrat",
        s."DateSouscription", s."DateDGD", s."DateResiliation", s."DateFinTRC",
        s."AccordCadre", s."CoutOperation", s."MontantCotisation", s."Commentaire", s."SurOpe"
      FROM legacy."tAssuranceDoMrH" s`,
  },
  {
    // Commentaire : HTML brut dans le legacy (WinDev riche) → balises retirées
    target: 'sga',
    cols: `(id, tranche_id, num_fiche, est_psla, date_creation, date_sortie,
            prix_terrain_ht, prix_frais_annexe_ht, prix_revient_budget, prix_vente_budget,
            liste_budget_id, commentaire, surface_utile)`,
    select: `SELECT s."IDSGA", s."IDTranche", s."NumFiche", s."EstPSLA",
        s."DateCreation", s."DateSortie",
        s."PrixTerrainHT", s."PrixFraisAnnexeHT", s."PrixRevientBudget", s."PrixVenteBudget",
        ${fkSafe('IDBudget', 'tListeBudget', 'IDListeBudget')},
        NULLIF(TRIM(regexp_replace(COALESCE(s."Commentaire", ''), '<[^>]*>', '', 'g')), ''),
        s."SurfaceUtile"
      FROM legacy."tSGA" s`,
  },
  {
    target: 'declaration_940',
    cols: `(id, tranche_id, date_940, stock_logt_dat, date_tva_lasm, sur_ope,
            fin_suivi, commentaires)`,
    select: `SELECT s."IDDeclaration940", s."IDTranche", s."Dat", s."StockLogtDAT",
        s."DateTvaLASM", s."SurOpe", s."FinSuivi", s."Commentaires"
      FROM legacy."tDeclaration940" s`,
  },

  // --- honoraires (phase 7) ---
  {
    // GrilleSpecifique/PourCoPromotion/PourPromotion/DateFactCommKPI non
    // repris (cf. commentaire du schéma cible)
    target: 'mission',
    cols: `(id, tranche_id, date_convention, base_hono_unitaire_ht, base_hono_ht,
            type_mission_id, prestataire_id, fin_facturation, commentaire, ordre,
            nb_mois, nb_logement)`,
    select: `SELECT s."IDMission", s."IDTranche", s."DateConvention",
        s."BaseHonoUnitaireHT", s."BaseHonoHT",
        ${fk('IDTypeMission')}, ${fk('IDPrestataire')},
        s."FinFacturation", s."Commentaire", s."Ordre", s."NbMois", s."NbLogement"
      FROM legacy."tMission" s`,
  },
  {
    // IDStadeAvancement référence tListeAvancement (piège docs/modele-legacy.md)
    target: 'grille_facturation',
    cols: '(id, mission_id, liste_avancement_id, pourcentage, montant)',
    select: `SELECT s."IDGrilleFacturation", s."IDMission",
        ${fkSafe('IDStadeAvancement', 'tListeAvancement', 'IDListeAvancement')},
        s."Pourcentage", s."Montant"
      FROM legacy."tGrilleFacturation" s`,
  },
  {
    target: 'hono_comm_nature_achat',
    cols: `(id, tranche_id, nature_achat_id, montant_cla, montant_levee_option,
            montant_resa, montant_acte, pourcentage_resa, pourcentage_acte, commentaires)`,
    select: `SELECT s."IDHonoCommHFNatureAchat", s."IDTranche", ${fk('IDNatureAchat')},
        s."MontantCLA", s."MontantLeveeOption", s."MontantResa", s."MontantActe",
        s."PourcentageResa", s."PourcentageActe", s."Commentaires"
      FROM legacy."tHonoCommHFNatureAchat" s`,
  },
  {
    target: 'facture',
    cols: `(id, stade_avancement_id, type_mission_id, num_facture, date_facture,
            partiel, montant_ht, nb_mois, commentaire)`,
    select: `SELECT s."IDFacture", s."IDStadeAvancement", ${fk('IDTypeMission')},
        s."NumFacture", s."DateFacture", s."Partiel", s."MontantHT", s."NbMois", s."Commentaire"
      FROM legacy."tFacture" s`,
  },
  {
    // colonnes *_old exclues ; IDPrestataire/IDBaremeHonoComm absents du .bak
    target: 'hono_comm_facture',
    cols: `(id, tranche_id, num_facture, date_facture, nb_cla, montant_cla,
            nb_levee_option, montant_levee_option, nb_resa, montant_resa,
            nb_acte, montant_acte, commentaires)`,
    select: `SELECT s."IDHonoCommHFFacture", s."IDTranche", s."NumFacture", s."DateFacture",
        s."NbCLA", s."MontantCLA", s."NbLeveeOption", s."MontantLeveeOption",
        s."NbResa", s."MontantResa", s."NbActe", s."MontantActe", s."Commentaires"
      FROM legacy."tHonoCommHFFacture" s`,
  },

  {
    target: 'commercial',
    cols: '(id, denomination, prenom, initiales, email, societe, fonction)',
    select: `SELECT s."IDCommercial", s."Denomination", s."Prenom", s."Initiales", s."EMail", s."Societe", s."Fonction"
      FROM legacy."tCommercial" s`,
  },
  {
    target: 'acquereur',
    cols: `(id, code, civilite_id, patronyme, prenom, civilite2_id, patronyme2, prenom2,
            civilite3_id, patronyme3, prenom3, nom_complet, rs, nature_juridique_id,
            telephone, portable, email, email2,
            adresse_actuelle, cp_actuel, commune_actuelle, commune_origine, date_modif_adresse,
            type_logement_actuel_id, situation_familiale_id, situation_famille_id, type_menage_id,
            adulte1_age, adulte2_age, adulte1_date_naissance, adulte2_date_naissance,
            adulte1_lieu_naissance, adulte2_lieu_naissance, adulte1_csp_id, adulte2_csp_id,
            adulte1_metier, adulte2_metier, adulte1_commune_travail, adulte2_commune_travail,
            age_enfant1, age_enfant2, age_enfant3, age_enfant4, age_enfant5,
            nombre_adultes, nombre_enfants, enfant_a_venir,
            tranche_age_id, plafond_ressources_id, revenu_quartile_id,
            revenus_foyer_fiscal, annee_declaration, revenus_net_imposable_nm1, revenu_net_foyer_mensuel,
            pension_autres_revenus, loyer_actuel, prix_achat, taux_tva, apport_reel_hors_subvention, subvention,
            est_ptz, multi_accedant, mensualite_financement, taux_effort, duree_financement_mois,
            conseiller_commercial_id, primo_accedant, etape, enquete_a, enquete_b, enquete_c,
            info_pour_entreprise, commentaire, date_creation, date_modification)`,
    select: `SELECT s."IDAcquereur", s."Code", ${fk('IDCivilite')}, s."Patronyme", s."Prenom",
        ${fk('IDCivilite2')}, s."Patronyme2", s."Prenom2", ${fk('IDCivilite3')}, s."Patronyme3", s."Prenom3",
        s."NomComplet", s."RS", ${fk('NatureJuridique')},
        s."Téléphone", s."Portable", s."Email", s."Email2",
        s."AdresseActuelle", s."CPActuel", s."Communeactuelle", s."CommuneOrigine", s."DateModifAdresse",
        ${fk('IDTypeLogementActuel')}, ${fk('SituationFamiliale')}, ${fk('IDSituationFamille')}, ${fk('TypeDeMenage')},
        s."Adulte1Age", s."Adulte2Age", s."Adulte1DateNaissance", s."Adulte2DateNaissance",
        s."Adulte1LieuDeNaissance", s."Adulte2LieuDeNaissance", ${fk('Adulte1CSP')}, ${fk('Adulte2CSP')},
        s."Adulte1Metier", s."Adulte2Metier", s."Adulte1CommuneTravail", s."Adulte2CommuneTravail",
        s."AgeEnfant1", s."AgeEnfant2", s."AgeEnfant3", s."AgeEnfant4", s."AgeEnfant5",
        s."NombreAdultes", s."NombreEnfants", s."EnfantAVenir",
        ${fk('IDAcquereurTrancheAge')}, ${fk('IDAcquereurPlafondRessources')}, ${fk('IDAcquereurRevenuFoyerFiscalParQuartile')},
        s."RevenusFoyerFiscal", s."AnneeDeDeclaration", s."RevenusNetImposableNMoins1", s."RevenuNetFoyerMensuel",
        s."PensionEtAutresRevenus", s."LoyerActuel", s."PrixDAchat", s."TauxTVA", s."ApportReelADateHorsSubvention", s."Subvention",
        s."EstPTZ", s."MultiAccedant", s."MensualiteDuFinancementClient", s."TauxEffort", s."DureeFinancementEnMois",
        ${fk('IDConseillerCommercial')}, s."PrimoAccedant", s."Etape", s."EnqueteA", s."EnqueteB", s."EnqueteC",
        s."InfoPourEntreprise", s."Commentaire", s."DateCreation", s."DateModification"
      FROM legacy."tAcquereur" s`,
  },
  {
    target: 'lot',
    cols: `(id, tranche_id, destination_id, num_lot, lot_associe, famille_de_bien, type_de_bien,
            designation, adresse, num_etage, exposition, num_parcelle, num_copropriete, tantiemes,
            est_partie_commune, est_vente_acheve,
            surf_habitable, surface_utile, surf_terrasse, surf_garage, surf_cave, surf_balcon,
            surf_loggias, surf_remise, surf_jardin, surf_terrain,
            prix_origine, prix_vente_ht, prix_vente_ttc, tva, prix_m2, montant_hono_com,
            commercial_id, acquereur_id, taux_comm_resa, taux_comm_acte,
            comm_vendeur_a_verser_resa, comm_vendeur_a_verser_acte,
            locataire_civilite, locataire_patronyme, locataire_prenom, locataire_telephone, locataire_portable,
            pdl, pce, date_livraison_sccv, commentaire, notes)`,
    select: `SELECT s."IDlot", ${fk('IDTranche')}, ${fk('IDDestination')}, s."Numlot", s."LotAssocie",
        s."FamilleDeBien", s."TypeDeBien", s."Designation", s."Adresse", s."NumEtage", s."Exposition",
        s."NumParcelle", s."NumCopropriete", s."Tantiemes", s."EstPartieCommune", s."EstVenteAcheve",
        s."SurfHabitable", s."SurfaceUtile", s."SurfTerrasse", s."SurfGarage", s."SurfCave", s."SurfBalcon",
        s."SurfLoggias", s."SurfRemise", s."SurfJardin", s."SurfTerrain",
        s."PrixOrigine", s."PrixDeVenteHT", s."PrixDeVenteTTC", s."TVA", s."PrixM2", s."MontantHonoCom",
        ${fk('IDCommercial')}, ${fk('IDAcquereur')}, s."TauxCommResa", s."TauxCommActe",
        s."CommVendeurAVerserResa", s."CommVendeurAVerserActe",
        s."LocataireCivilite", s."LocatairePatronyme", s."LocatairePrenom", s."LocataireTelephone", s."LocatairePortable",
        s."PDL", s."PCE", s."DateLivraisonSCCV", s."Commentaire", s."Notes"
      FROM legacy."tLot" s`,
  },

  // --- dimension commerciale ---
  {
    target: 'commercialisation',
    cols: `(id, lot_id, acquereur_id, type_acquereur_id, nature_achat_id, fiscalite_acquereur_id,
            moyen_paiement_id, banque_courtage_id,
            date_resa, date_prevue_signature_acte, date_signature_acte_vefa, date_signature_contrat_loc,
            date_resiliation_contrat_loc, date_levee_option, date_livraison, date_annulation,
            motif_annulation, annulation_commentaire, date_previ_actabilite, date_signature_comm,
            prix_vente_reel_ttc, prix_vente_reel_ht, taux_tva_reel, remise_client_ttc, montant_depot_garantie,
            taux_comm_resa, taux_comm_acte, comm_vendeur_a_verser_resa, comm_vendeur_a_verser_acte,
            est_fiscalite, comm_fisca, est_justif_fiscal, loyer, epargne, pas_aide_rm,
            montant_subv, montant_subv_acpte, solde_demande,
            avec_honoraire_courtage, montant_hono_courtage_client, montant_hono_courtage_banque,
            avec_souscription_capital_kpi, pas_de_souscription_capital, date_souscription, commentaires_souscription,
            prestataire_comm1_id, prestataire_comm2_id,
            avec_clause_particuliere, motif_clause_particuliere_id, commentaire_clause_particuliere,
            avec_tma, tma_montant_ouverture_dossier, tma_date_envoi_courrier, tma_date_paiement_solde,
            tma_pmr_montant, tma_pmr_contrat_signe, tma_pmr_date_remis_notaire, tma_commentaire,
            courrier_info_demarrage_date_envoi, plan_technique_date_envoi,
            choix_materiaux_date_envoi, choix_materiaux_date_valide,
            placo_date_envoi, placo_rdv_date, placo_rdv_heure,
            trois_mois_avant_livraison_date_envoi, trois_mois_avant_livraison_periode,
            livraison_date_envoi_courrier, livraison_rdv_date, livraison_rdv_heure,
            livraison_trimestre_prevu_contrat, livraison_trimestre_decale, date_etat_sortie_lieux,
            date_demande_agrement, date_agrement_obtenu, date_reception_courrier_lvo,
            est_revente_bien, date_butoir_revente, cdv_technique, cdv_promo)`,
    select: `SELECT s."IDCommercialisation", s."IDLot", ${fk('IDAcquereur')},
        ${fkSafe('IDListeTypeAcquereur', 'tListeTypeAcquereur', 'IDListeTypeAcquereur')},
        ${fkSafe('IDNatureAchat', 'tListeNatureAchat', 'IDNatureAchat')},
        ${fk('IDFiscaliteAcquereur')}, ${fk('IDMoyenDePaiement')}, ${fk('IDBanqueCourtage')},
        s."DateResa", s."DatePrevueSignatureActe", s."DateSignatureActeVEFA", s."DateSignatureContratLoc",
        s."DateResiliationContratLoc", s."DateLeveeOption", s."DateLivraison", s."DateAnnulation",
        s."MotifAnnulation", s."AnnulationCommentaire", s."DatePreviActabilite", s."DateSignatureComm",
        s."PrixDeVenteReelTTC", s."PrixDeVenteReelHT", s."TauxTVAReel", s."RemiseClientTTC", s."MontantDepotGarantie",
        s."TauxCommResa", s."TauxCommActe", s."CommVendeurAVerserResa", s."CommVendeurAVerserActe",
        s."EstFiscalite", s."CommFisca", s."EstJustifFiscal", s."Loyer", s."Epargne", s."PasAideRM",
        s."MontantSubv", s."MontantSubvAcpte", s."SoldeDemande",
        s."AvecHonoraireCourtage", s."MontantHonoraireCourtageClient", s."MontantHonoraireCourtageBanque",
        s."AvecSouscriptionCapitalKPI", s."PasDeSouscriptionAuCapital", s."DateSouscription", s."CommentairesSouscription",
        ${fk('PrestataireComm1')}, ${fk('PrestataireComm2')},
        s."AvecClauseParticuliereComm", ${fkSafe('IDMotifClauseParticuliereComm', 'MotifClauseParticuliereComm', 'IDMotifClauseParticuliereComm')}, s."CommentaireClauseParticuliereComm",
        s."AvecTMA", s."TMAMontantOuvertureDossier", s."TMADateEnvoiCourrier", s."TMADatePaiementSolde",
        s."TMA_PMR_Montant", s."TMA_PMR_ContratSigne", s."TMA_PMR_DateRemisNotaireContratEtPlanVEFA", s."TMACommentaire",
        s."CourrierInfoDemarrageDateEnvoiCourrier", s."PlanTechniqueDateEnvoiCourrier",
        s."ChoixMateriauxDateEnvoiCourrier", s."ChoixMateriauxDateChoixValide",
        s."PlacoDateEnvoiCourrier", s."PlacoRDVDate", s."PlacoRDVHeure",
        s."TroisMoisAvantLivraisonDateEnvoiCourrier", s."TroisMoisAvantLivraisonPeriode",
        s."LivraisonDateEnvoiCourrier", s."LivraisonRDVDate", s."LivraisonRDVHeure",
        s."LivraisonTrimestrePrevueAuContrat", s."LivraisonTrimestreDecale", s."DateEtatSortieLieux",
        s."DateDemandeAgrement", s."DateAgrementObtenuEtEnvoiNotaire", s."DateReceptionCourrierLVO",
        s."EstReventeBien", s."DateButoirRevente", s."CDVTechnique", s."CDVPromo"
      FROM legacy."tCommercialisation" s`,
  },
  {
    target: 'comm_vendeur',
    cols: `(id, commercialisation_id, lot_id, commercial_id, pourcentage, evenement,
            tx_comm_vendeur, mnt_comm_vendeur, date_reglement, date_validation, commentaire)`,
    select: `SELECT s."IDCommVendeur",
        ${fkSafe('IDCommercialisation', 'tCommercialisation', 'IDCommercialisation')},
        ${fk('IDLot')}, ${fk('IDCommercial')}, s."Pourcentage", s."Evenement",
        s."TxCommVendeur", s."MntCommVendeur", s."DateRglt", s."DateValidation", s."Commentaire"
      FROM legacy."tCommVendeur" s`,
  },
  {
    target: 'versement_depot_garantie',
    cols: '(id, commercialisation_id, montant_verse, date_remise, date_creation, commentaire)',
    select: `SELECT s."IDVersementDepotGarantie", ${fk('IDCommercialisation')},
        s."MontantVerse", s."DateRemise", s."DateCreation", s."Commentaire"
      FROM legacy."tVersementDepotGarantie" s`,
  },
  {
    target: 'tma',
    cols: `(id, commercialisation_id, ref_devis, date_devis, objet_devis, date_signature_devis,
            montant_devis, montant_versement1, montant_versement2, commentaires)`,
    select: `SELECT s."IDTMA", s."IDCommercialisation", s."RefDevis", s."DateDevis", s."ObjetDevis",
        s."DateSignatureDevis", s."MontantDevis", s."MontantVersement1", s."MontantVersement2", s."Commentaires"
      FROM legacy."tTMA" s`,
  },

  {
    // droits fins (phase 2) : IDService legacy = ordre de la liste FEN_Login
    target: 'droit',
    cols: '(id, fenetre, controle, indice, service, type)',
    select: `SELECT s."IDDroit", s."Fenetre", s."Controle", s."Indice",
        CASE s."IDService"
          WHEN 1 THEN 'promo' WHEN 2 THEN 'compta' WHEN 3 THEN 'consultation'
          WHEN 4 THEN 'dcial' WHEN 5 THEN 'admin' WHEN 6 THEN 'juridique'
          WHEN 7 THEN 'direction-promo' END,
        s."IDTypeDroit"
      FROM legacy."Droit" s
      WHERE s."IDService" BETWEEN 1 AND 7`,
  },

  // --- SAV Promotion (phase 5) ---
  nomenclature('reserve_type', 'tReserveType', 'IDReserveType'),
  nomenclature('reserve_piece', 'tReservePiece', 'IDReservePiece'),
  {
    target: 'reserve_entreprise',
    cols: `(id, rs, adresse1, adresse2, cp, commune, telephone, fax, contact,
            tel_contact, corps_etat, email)`,
    select: `SELECT s."IDReserveEntreprise", COALESCE(s."RS", ''), s."Adresse1", s."Adresse2",
        s."CP", s."Commune", s."Telephone", s."Fax", s."Contact", s."TelContact",
        s."CorpsDEtat", s."EMail"
      FROM legacy."tReserveEntreprise" s`,
  },
  {
    // Ancien*/WindowsUser non repris (reprise d'un ancien logiciel, convention
    // schéma cible) ; les 16 439 lignes sans IDLot ne vivent que par ces
    // colonnes Ancien* et ne sont affichables nulle part (l'écran WinDev
    // filtre par lot) → non copiées. IDPiece orphelin à 97 % (tReservePiece
    // vidée dans le legacy) → fkSafe
    target: 'reserve',
    cols: `(id, lot_id, code, type_id, piece_id, entreprise_id, travaux_effectues,
            reserve, date_reclamation, date_intervention, envoyer_mail,
            envoyer_mail_date, est_verrouille, id_air_bat)`,
    select: `SELECT s."IDReserve", s."IDLot", s."ReserveCode",
        ${fk('IDTypeReserve')},
        ${fkSafe('IDPiece', 'tReservePiece', 'IDReservePiece')},
        ${fk('IDEntreprise')},
        s."TravauxEffectues", s."Reserve", s."DateReclamation", s."DateDIntervention",
        s."EnvoyerMail", s."EnvoyerMailDate", s."EstVerrouille", ${fk('IDAirBat')}
      FROM legacy."tReserve" s
      WHERE s."IDLot" IS NOT NULL AND s."IDLot" <> 0`,
  },
]

const targets = copies.map((c) => `"${c.target}"`)

export async function runTransform(
  log: (line: string) => Promise<void> | void,
) {
  const pg = db.$client
  await pg.query('BEGIN')
  try {
    await pg.query(`TRUNCATE ${targets.join(', ')} CASCADE`)
    for (const c of copies) {
      const res = await pg.query(
        `INSERT INTO "${c.target}" ${c.cols} ${c.select}`,
      )
      await log(`${c.target}: ${res.rowCount} lignes`)
      await pg.query(
        `SELECT setval(pg_get_serial_sequence('"${c.target}"','id'), COALESCE((SELECT MAX(id) FROM "${c.target}"), 0) + 1, false)`,
      )
    }
    await pg.query('COMMIT')
  } catch (err) {
    await pg.query('ROLLBACK')
    throw err
  }
}
