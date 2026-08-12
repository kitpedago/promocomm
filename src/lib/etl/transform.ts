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
    cols: '(id, domaine, code, libelle, ordre)',
    select: `SELECT s."IDListeAvancement", s."Domaine", s."Code", COALESCE(s."Libelle", ''), s."Ordre"
      FROM legacy."tListeAvancement" s`,
  },

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

  // --- colonne vertébrale ---
  {
    target: 'structure_juridique',
    cols: `(id, rs, num_tva_intra, siret, date_debut_activite, date_immat, date_liquidation,
            capital, nb_part, montant_part, sccv_hf, sccv_hlm)`,
    select: `SELECT s."IDStructureJuridique", s."RS", s."NumTVAIntra",
        NULLIF(s."Siret", 0)::bigint::text,
        s."DateDebutActivite", s."DateImmat", s."DateLiquidation",
        s."CapitalSCCV", s."NbPart", s."MontantPart", s."SCCV_HF", s."SCCV_HLM"
      FROM legacy."tStructureJuridique" s`,
  },
  {
    target: 'operation',
    cols: `(id, structure_juridique_id, libelle, adresse, cp, commune, nom_zac, secteur_geographique_id,
            sur_rennes_metropole, anru, anru_commentaire, indiv_coll, annee_dgd, abreviation_code_reserve,
            notaire_vente_id, clerc_vente_id, notaire_foncier_id, clerc_foncier_id,
            possibilite_investisseur, taux_investisseur_autorise, commentaire_investisseur,
            date_validation_engagement, date_abandon, commentaires_abandon,
            masquer_commercial, masquer_comptable, masquer_promo, commentaire)`,
    select: `SELECT s."IDOperation", ${fk('IDStructureJuridique')}, s."Libelle", s."Adresse", s."CP", s."Commune",
        s."NomZAC", ${fk('IDSecteurGeographiqueDeveloppement')},
        s."SurRennesMetropole", s."ANRU", s."ANRUComment", s."IndivColl", s."AnneeDGD", s."AbreviationPourCodeReserve",
        ${fkSafe('IDInterlocuteurNotaire_Notaire_Vente', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        ${fkSafe('IDInterlocuteurNotaire_Clerc_Vente', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        ${fkSafe('IDInterlocuteurNotaire_Notaire_Foncier', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        ${fkSafe('IDInterlocuteurNotaire_Clerc_Foncier', 'InterlocuteurNotaire', 'IDInterlocuteurNotaire')},
        s."PossibiliteInvestisseur", s."TauxInvestisseurAutorise", s."CommentaireInvestisseur",
        s."DateValidationEngagement", s."DateAbandon", s."CommentairesAbandon",
        s."MasquerCommercial", s."MasquerComptable", s."MasquerPromo", s."Commentaire"
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
            est_moe_interne, mission_moe_interne_id, commentaire_avancement)`,
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
        s."CommentaireAvancement"
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
            conseiller_commercial_id, info_pour_entreprise, commentaire, date_creation, date_modification)`,
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
        ${fk('IDConseillerCommercial')}, s."InfoPourEntreprise", s."Commentaire", s."DateCreation", s."DateModification"
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
