// Schéma métier cible (tranche 1 : colonne vertébrale + dimension commerciale).
// Mapping depuis le schéma "legacy" documenté dans docs/schema-cible.md :
// préfixe "t" abandonné, colonnes caches (cur*, Nb* recalculables), imports
// (Import*, *_orig, PromoGes*) et *_old exclues. IDs legacy préservés par
// scripts/transform-legacy.ts (identity BY DEFAULT → l'app génère les suivants).
import {
  boolean,
  integer,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

const id = () => integer().primaryKey().generatedByDefaultAsIdentity()
const montant = (name: string) => numeric(name, { mode: 'number' })

// ---------------------------------------------------------------------------
// Nomenclatures (tables de référence)
// ---------------------------------------------------------------------------

export const civilite = pgTable('civilite', {
  id: id(),
  libelle: text().notNull(),
  libelleCourt: text('libelle_court'),
})

export const csp = pgTable('csp', {
  id: id(),
  numero: integer(),
  libelle: text().notNull(),
})

export const situationFamiliale = pgTable('situation_familiale', {
  id: id(),
  libelle: text().notNull(),
})

// Distincte de situation_familiale (héritage : les deux coexistent sur l'acquéreur)
export const situationFamille = pgTable('situation_famille', {
  id: id(),
  libelle: text().notNull(),
})

export const typeMenage = pgTable('type_menage', {
  id: id(),
  libelle: text().notNull(),
})

export const typeLogementActuel = pgTable('type_logement_actuel', {
  id: id(),
  libelle: text().notNull(),
  numRm: integer('num_rm'),
})

export const acquereurTrancheAge = pgTable('acquereur_tranche_age', {
  id: id(),
  libelle: text().notNull(),
  borneMax: integer('borne_max'),
})

export const acquereurPlafondRessources = pgTable(
  'acquereur_plafond_ressources',
  {
    id: id(),
    libelle: text().notNull(),
  },
)

export const acquereurRevenuQuartile = pgTable('acquereur_revenu_quartile', {
  id: id(),
  libelle: text().notNull(),
  borneMax: integer('borne_max'),
})

export const natureJuridique = pgTable('nature_juridique', {
  id: id(),
  libelle: text().notNull(),
})

export const typeAcquereur = pgTable('type_acquereur', {
  id: id(),
  libelle: text().notNull(),
})

export const fiscaliteAcquereur = pgTable('fiscalite_acquereur', {
  id: id(),
  libelle: text().notNull(),
  libelleCourt: text('libelle_court'),
})

export const natureAchat = pgTable('nature_achat', {
  id: id(),
  libelle: text().notNull(),
  libelleLong: text('libelle_long'),
  ordreComm: integer('ordre_comm'),
})

export const moyenPaiement = pgTable('moyen_paiement', {
  id: id(),
  libelle: text().notNull(),
})

export const motifClauseParticuliere = pgTable('motif_clause_particuliere', {
  id: id(),
  libelle: text().notNull(),
})

export const banqueCourtage = pgTable('banque_courtage', {
  id: id(),
  libelle: text().notNull(),
})

export const destination = pgTable('destination', {
  id: id(),
  libelle: text().notNull(),
  libelleComm: text('libelle_comm'),
  commentaire: text(),
})

export const concept = pgTable('concept', {
  id: id(),
  libelle: text().notNull(),
  commentaire: text(),
})

export const secteurGeographique = pgTable('secteur_geographique', {
  id: id(),
  libelle: text().notNull(),
})

// Situation d'une tranche (legacy tListeSituation : ÉTUDE / TRAVAUX / LIVRÉ / Fin SAV)
export const situation = pgTable('situation', {
  id: id(),
  libelle: text().notNull(),
})

// Nomenclatures des onglets Terrain / Informations diverses de la fiche opération
export const signataire = pgTable('signataire', {
  id: id(),
  libelle: text().notNull(),
})

// Organismes de foncier solidaire (BRS)
export const ofsNom = pgTable('ofs_nom', {
  id: id(),
  libelle: text().notNull(),
})

export const certification = pgTable('certification', {
  id: id(),
  libelle: text().notNull(),
})

export const label = pgTable('label', {
  id: id(),
  libelle: text().notNull(),
})

export const performanceEnergetique = pgTable('performance_energetique', {
  id: id(),
  libelle: text().notNull(),
})

// Mission de maîtrise d'œuvre interne (OPC + DET, OPC, Economie, DET)
export const missionMoeInterne = pgTable('mission_moe_interne', {
  id: id(),
  libelle: text().notNull(),
})

export const categorieSubvention = pgTable('categorie_subvention', {
  id: id(),
  libelle: text().notNull(),
})

export const organismeSubvention = pgTable('organisme_subvention', {
  id: id(),
  libelle: text().notNull(),
})

// Stades d'avancement de référence (65 jalons, domaine Chantier ou
// Commercialisation — DomaineStadeAvancement n'est qu'une liste de codes texte,
// non reprise en table)
export const listeAvancement = pgTable('liste_avancement', {
  id: id(),
  domaine: text(),
  code: text(),
  libelle: text().notNull(),
  ordre: integer(),
})

// ---------------------------------------------------------------------------
// Colonne vertébrale : structure juridique > opération > tranche > lot
// ---------------------------------------------------------------------------

export const structureJuridique = pgTable('structure_juridique', {
  id: id(),
  rs: text().notNull(), // raison sociale
  numTvaIntra: text('num_tva_intra'),
  siret: text(),
  dateDebutActivite: timestamp('date_debut_activite'),
  dateImmat: timestamp('date_immat'),
  dateLiquidation: timestamp('date_liquidation'),
  capital: integer(),
  nbPart: integer('nb_part'),
  montantPart: integer('montant_part'),
  sccvHf: boolean('sccv_hf'),
  sccvHlm: boolean('sccv_hlm'),
})

// Interlocuteurs externes d'une opération : études notaires (et leurs
// interlocuteurs, notaires ou clercs) et architectes (attachés à la tranche)
export const etudeNotaire = pgTable('etude_notaire', {
  id: id(),
  nomEtude: text('nom_etude').notNull(),
  adresse: text(),
  cp: text(),
  commune: text(),
  email: text(),
  commentaire: text(),
})

export const fonctionInterlocuteurNotaire = pgTable(
  'fonction_interlocuteur_notaire',
  {
    id: id(),
    libelle: text().notNull(),
  },
)

export const interlocuteurNotaire = pgTable('interlocuteur_notaire', {
  id: id(),
  etudeNotaireId: integer('etude_notaire_id').references(() => etudeNotaire.id),
  fonctionId: integer('fonction_id').references(
    () => fonctionInterlocuteurNotaire.id,
  ),
  civilite: text(),
  patronyme: text(),
  prenom: text(),
  telephone: text(),
  email: text(),
})

export const architecte = pgTable('architecte', {
  id: id(),
  rs: text().notNull(),
  commune: text(),
  commentaire: text(),
})

export const operation = pgTable('operation', {
  id: id(),
  structureJuridiqueId: integer('structure_juridique_id').references(
    () => structureJuridique.id,
  ),
  libelle: text().notNull(),
  adresse: text(),
  cp: text(),
  commune: text(),
  nomZac: text('nom_zac'),
  secteurGeographiqueId: integer('secteur_geographique_id').references(
    () => secteurGeographique.id,
  ),
  surRennesMetropole: boolean('sur_rennes_metropole'),
  anru: boolean(),
  anruCommentaire: text('anru_commentaire'),
  indivColl: integer('indiv_coll'), // code hérité individuel/collectif
  anneeDgd: integer('annee_dgd'),
  abreviationCodeReserve: text('abreviation_code_reserve'),
  notaireVenteId: integer('notaire_vente_id').references(
    () => interlocuteurNotaire.id,
  ),
  clercVenteId: integer('clerc_vente_id').references(
    () => interlocuteurNotaire.id,
  ),
  notaireFoncierId: integer('notaire_foncier_id').references(
    () => interlocuteurNotaire.id,
  ),
  clercFoncierId: integer('clerc_foncier_id').references(
    () => interlocuteurNotaire.id,
  ),
  possibiliteInvestisseur: boolean('possibilite_investisseur'),
  tauxInvestisseurAutorise: real('taux_investisseur_autorise'),
  commentaireInvestisseur: text('commentaire_investisseur'),
  dateValidationEngagement: timestamp('date_validation_engagement'),
  dateAbandon: timestamp('date_abandon'),
  commentairesAbandon: text('commentaires_abandon'),
  masquerCommercial: boolean('masquer_commercial'),
  masquerComptable: boolean('masquer_comptable'),
  masquerPromo: boolean('masquer_promo'),
  commentaire: text(),
})

export const tranche = pgTable('tranche', {
  id: id(),
  operationId: integer('operation_id')
    .notNull()
    .references(() => operation.id),
  libelle: text(),
  conceptId: integer('concept_id').references(() => concept.id),
  architecteMandataireId: integer('architecte_mandataire_id').references(
    () => architecte.id,
  ),
  architecteCotraitantId: integer('architecte_cotraitant_id').references(
    () => architecte.id,
  ),
  adresse: text(),
  nbLogtIndiv: integer('nb_logt_indiv'),
  nbLogtColl: integer('nb_logt_coll'),
  nbAutresLocaux: integer('nb_autres_locaux'),
  nbTerrain: integer('nb_terrain'),
  dontLogtCollPsla: integer('dont_logt_coll_psla'),
  dontLogtIndivPsla: integer('dont_logt_indiv_psla'),
  dontLogtCollBrs: integer('dont_logt_coll_brs'),
  dontLogtIndivBrs: integer('dont_logt_indiv_brs'),
  nbEtage: integer('nb_etage'),
  dureeChantierMois: integer('duree_chantier_mois'),
  dateConvention: timestamp('date_convention'),
  dateLivraisonContractuelle: timestamp('date_livraison_contractuelle'),
  pasDeCommercialisation: boolean('pas_de_commercialisation'),
  // synthèse d'avancement (legacy StadeCOM / StadeIDSituation / StadeDepuisLe,
  // caches entretenus par WinDev depuis tStadeAvancement — repris tels quels,
  // utilisés par les widgets du tableau de bord)
  stadeCom: timestamp('stade_com'),
  situationId: integer('situation_id').references(() => situation.id),
  situationDepuisLe: timestamp('situation_depuis_le'),
  commentaire: text(),
  // onglet Terrain : bilan opérateur (charge foncière hors BRS)
  terrainMontantHt: montant('terrain_montant_ht'),
  terrainMontantTtc: montant('terrain_montant_ttc'),
  terrainPourcAcptePrevu: real('terrain_pourc_acpte_prevu'),
  terrainAcompte: montant('terrain_acompte'),
  terrainSignataireId: integer('terrain_signataire_id').references(
    () => signataire.id,
  ),
  terrainCommentaire: text('terrain_commentaire'),
  // … bilan OFS (charge foncière BRS)
  ofsNomId: integer('ofs_nom_id').references(() => ofsNom.id),
  terrainOfsMontantHt: montant('terrain_ofs_montant_ht'),
  terrainOfsAcptePourcPrevu: real('terrain_ofs_acpte_pourc_prevu'),
  terrainOfsAcpteMontantVerse: real('terrain_ofs_acpte_montant_verse'),
  terrainOfsSignataireId: integer('terrain_ofs_signataire_id').references(
    () => signataire.id,
  ),
  terrainOfsCompromisDatePrevi: timestamp('terrain_ofs_compromis_date_previ'),
  terrainOfsCompromisDateReelle: timestamp('terrain_ofs_compromis_date_reelle'),
  // … bail opérateur et bloc « Autre » (legacy DroitAppuiAutre*)
  terrainBailOperateurDatePrevi: timestamp('terrain_bail_operateur_date_previ'),
  terrainBailOperateurDateReelle: timestamp(
    'terrain_bail_operateur_date_reelle',
  ),
  autreMontant: montant('autre_montant'),
  autreCommentaire: text('autre_commentaire'),
  // onglet Informations diverses
  certificationId: integer('certification_id').references(
    () => certification.id,
  ),
  labelId: integer('label_id').references(() => label.id),
  performanceEnergetiqueId: integer('performance_energetique_id').references(
    () => performanceEnergetique.id,
  ),
  estMoeInterne: boolean('est_moe_interne'),
  missionMoeInterneId: integer('mission_moe_interne_id').references(
    () => missionMoeInterne.id,
  ),
  commentaireAvancement: text('commentaire_avancement'),
})

// Onglet « Stade d'avancement » : un jalon daté par tranche (6 935 lignes).
// La facture liée (tFacture) viendra avec le module Honoraires.
export const stadeAvancement = pgTable('stade_avancement', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  listeAvancementId: integer('liste_avancement_id').references(
    () => listeAvancement.id,
  ),
  datePreviComptaDebutAnnee: timestamp('date_previ_compta_debut_annee'),
  datePreviMajPromo: timestamp('date_previ_maj_promo'),
  dateReelle: timestamp('date_reelle'),
  ordre: integer(),
  pourcentageAvancementReel: real('pourcentage_avancement_reel'),
  montantPrevi: montant('montant_previ'),
  commentaire: text(),
})

// Subventions de la tranche (volet déblocages/budget en phase 6)
export const subvention = pgTable('subvention', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  categorieId: integer('categorie_id').references(() => categorieSubvention.id),
  organismeId: integer('organisme_id').references(() => organismeSubvention.id),
  numConvention: text('num_convention'),
  dateConvention: timestamp('date_convention'),
  dateCaducite: timestamp('date_caducite'),
  montantAgrement: montant('montant_agrement'),
  montantProvisoire: montant('montant_provisoire'),
  montantDefinitif: montant('montant_definitif'),
  budgetPreviMontant: montant('budget_previ_montant'),
  budgetPreviCommentaire: text('budget_previ_commentaire'),
  finDeSuivi: boolean('fin_de_suivi'),
  commentaire: text(),
})

export const commercial = pgTable('commercial', {
  id: id(),
  denomination: text(),
  prenom: text(),
  initiales: text(),
  email: text(),
  societe: text(),
  fonction: text(),
})

export const acquereur = pgTable('acquereur', {
  id: id(),
  code: text(),
  // jusqu'à trois co-acquéreurs sur la fiche (structure héritée conservée telle quelle)
  civiliteId: integer('civilite_id').references(() => civilite.id),
  patronyme: text(),
  prenom: text(),
  civilite2Id: integer('civilite2_id').references(() => civilite.id),
  patronyme2: text(),
  prenom2: text(),
  civilite3Id: integer('civilite3_id').references(() => civilite.id),
  patronyme3: text(),
  prenom3: text(),
  nomComplet: text('nom_complet'),
  rs: text(), // raison sociale si personne morale
  natureJuridiqueId: integer('nature_juridique_id').references(
    () => natureJuridique.id,
  ),
  telephone: text(),
  portable: text(),
  email: text(),
  email2: text(),
  adresseActuelle: text('adresse_actuelle'),
  cpActuel: text('cp_actuel'),
  communeActuelle: text('commune_actuelle'),
  communeOrigine: text('commune_origine'),
  dateModifAdresse: timestamp('date_modif_adresse'),
  typeLogementActuelId: integer('type_logement_actuel_id').references(
    () => typeLogementActuel.id,
  ),
  situationFamilialeId: integer('situation_familiale_id').references(
    () => situationFamiliale.id,
  ),
  situationFamilleId: integer('situation_famille_id').references(
    () => situationFamille.id,
  ),
  typeMenageId: integer('type_menage_id').references(() => typeMenage.id),
  adulte1Age: integer('adulte1_age'),
  adulte2Age: integer('adulte2_age'),
  adulte1DateNaissance: timestamp('adulte1_date_naissance'),
  adulte2DateNaissance: timestamp('adulte2_date_naissance'),
  adulte1LieuNaissance: text('adulte1_lieu_naissance'),
  adulte2LieuNaissance: text('adulte2_lieu_naissance'),
  adulte1CspId: integer('adulte1_csp_id').references(() => csp.id),
  adulte2CspId: integer('adulte2_csp_id').references(() => csp.id),
  adulte1Metier: text('adulte1_metier'),
  adulte2Metier: text('adulte2_metier'),
  adulte1CommuneTravail: text('adulte1_commune_travail'),
  adulte2CommuneTravail: text('adulte2_commune_travail'),
  ageEnfant1: integer('age_enfant1'),
  ageEnfant2: integer('age_enfant2'),
  ageEnfant3: integer('age_enfant3'),
  ageEnfant4: integer('age_enfant4'),
  ageEnfant5: integer('age_enfant5'),
  nombreAdultes: integer('nombre_adultes'),
  nombreEnfants: integer('nombre_enfants'),
  enfantAVenir: integer('enfant_a_venir'),
  trancheAgeId: integer('tranche_age_id').references(
    () => acquereurTrancheAge.id,
  ),
  plafondRessourcesId: integer('plafond_ressources_id').references(
    () => acquereurPlafondRessources.id,
  ),
  revenuQuartileId: integer('revenu_quartile_id').references(
    () => acquereurRevenuQuartile.id,
  ),
  revenusFoyerFiscal: montant('revenus_foyer_fiscal'),
  anneeDeclaration: integer('annee_declaration'),
  revenusNetImposableNm1: montant('revenus_net_imposable_nm1'),
  revenuNetFoyerMensuel: montant('revenu_net_foyer_mensuel'),
  pensionAutresRevenus: montant('pension_autres_revenus'),
  loyerActuel: montant('loyer_actuel'),
  prixAchat: montant('prix_achat'),
  tauxTva: real('taux_tva'),
  apportReelHorsSubvention: montant('apport_reel_hors_subvention'),
  subvention: montant(),
  estPtz: boolean('est_ptz'),
  multiAccedant: boolean('multi_accedant'),
  mensualiteFinancement: montant('mensualite_financement'),
  tauxEffort: real('taux_effort'),
  dureeFinancementMois: integer('duree_financement_mois'),
  conseillerCommercialId: integer('conseiller_commercial_id').references(
    () => commercial.id,
  ),
  infoPourEntreprise: text('info_pour_entreprise'),
  commentaire: text(),
  dateCreation: timestamp('date_creation'),
  dateModification: timestamp('date_modification'),
})

export const lot = pgTable('lot', {
  id: id(),
  // nullable : 129 lots hérités sans tranche dans les données réelles
  trancheId: integer('tranche_id').references(() => tranche.id),
  destinationId: integer('destination_id').references(() => destination.id),
  numLot: text('num_lot'),
  lotAssocie: text('lot_associe'),
  familleDeBien: text('famille_de_bien'),
  typeDeBien: text('type_de_bien'),
  designation: text(),
  adresse: text(),
  numEtage: text('num_etage'),
  exposition: text(),
  numParcelle: text('num_parcelle'),
  numCopropriete: text('num_copropriete'),
  tantiemes: real(),
  estPartieCommune: boolean('est_partie_commune'),
  estVenteAcheve: boolean('est_vente_acheve'),
  surfHabitable: real('surf_habitable'),
  surfaceUtile: real('surface_utile'),
  surfTerrasse: real('surf_terrasse'),
  surfGarage: real('surf_garage'),
  surfCave: real('surf_cave'),
  surfBalcon: real('surf_balcon'),
  surfLoggias: real('surf_loggias'),
  surfRemise: real('surf_remise'),
  surfJardin: real('surf_jardin'),
  surfTerrain: real('surf_terrain'),
  prixOrigine: montant('prix_origine'),
  prixVenteHt: montant('prix_vente_ht'),
  prixVenteTtc: montant('prix_vente_ttc'),
  tva: text(),
  prixM2: montant('prix_m2'),
  montantHonoCom: montant('montant_hono_com'),
  commercialId: integer('commercial_id').references(() => commercial.id),
  acquereurId: integer('acquereur_id').references(() => acquereur.id),
  tauxCommResa: real('taux_comm_resa'),
  tauxCommActe: real('taux_comm_acte'),
  commVendeurAVerserResa: montant('comm_vendeur_a_verser_resa'),
  commVendeurAVerserActe: montant('comm_vendeur_a_verser_acte'),
  // locataire en place (PSLA / vente en l'état loué)
  locataireCivilite: text('locataire_civilite'),
  locatairePatronyme: text('locataire_patronyme'),
  locatairePrenom: text('locataire_prenom'),
  locataireTelephone: text('locataire_telephone'),
  locatairePortable: text('locataire_portable'),
  pdl: text(), // point de livraison électricité
  pce: text(), // point comptage estimation gaz
  dateLivraisonSccv: timestamp('date_livraison_sccv'),
  commentaire: text(),
  notes: text(),
})

// ---------------------------------------------------------------------------
// Dimension commerciale
// ---------------------------------------------------------------------------

export const commercialisation = pgTable('commercialisation', {
  id: id(),
  lotId: integer('lot_id')
    .notNull()
    .references(() => lot.id),
  acquereurId: integer('acquereur_id').references(() => acquereur.id),
  typeAcquereurId: integer('type_acquereur_id').references(
    () => typeAcquereur.id,
  ),
  natureAchatId: integer('nature_achat_id').references(() => natureAchat.id),
  fiscaliteAcquereurId: integer('fiscalite_acquereur_id').references(
    () => fiscaliteAcquereur.id,
  ),
  moyenPaiementId: integer('moyen_paiement_id').references(
    () => moyenPaiement.id,
  ),
  banqueCourtageId: integer('banque_courtage_id').references(
    () => banqueCourtage.id,
  ),
  // cycle de vie de la vente
  dateResa: timestamp('date_resa'),
  datePrevueSignatureActe: timestamp('date_prevue_signature_acte'),
  dateSignatureActeVefa: timestamp('date_signature_acte_vefa'),
  dateSignatureContratLoc: timestamp('date_signature_contrat_loc'),
  dateResiliationContratLoc: timestamp('date_resiliation_contrat_loc'),
  dateLeveeOption: timestamp('date_levee_option'),
  dateLivraison: timestamp('date_livraison'),
  dateAnnulation: timestamp('date_annulation'),
  motifAnnulation: text('motif_annulation'),
  annulationCommentaire: text('annulation_commentaire'),
  datePreviActabilite: timestamp('date_previ_actabilite'),
  // texte malgré le nom hérité : commentaire de l'onglet « Prév. signature actes »
  dateSignatureComm: text('date_signature_comm'),
  // prix réel de la vente
  prixVenteReelTtc: montant('prix_vente_reel_ttc'),
  prixVenteReelHt: montant('prix_vente_reel_ht'),
  tauxTvaReel: real('taux_tva_reel'),
  remiseClientTtc: montant('remise_client_ttc'),
  montantDepotGarantie: real('montant_depot_garantie'),
  // commissions
  tauxCommResa: real('taux_comm_resa'),
  tauxCommActe: real('taux_comm_acte'),
  commVendeurAVerserResa: montant('comm_vendeur_a_verser_resa'),
  commVendeurAVerserActe: montant('comm_vendeur_a_verser_acte'),
  // fiscalité / aides
  estFiscalite: boolean('est_fiscalite'),
  commFisca: text('comm_fisca'),
  estJustifFiscal: boolean('est_justif_fiscal'),
  loyer: montant(),
  epargne: montant(),
  pasAideRm: boolean('pas_aide_rm'),
  montantSubv: montant('montant_subv'),
  montantSubvAcpte: montant('montant_subv_acpte'),
  soldeDemande: boolean('solde_demande'),
  // courtage du financement acquéreur
  avecHonoraireCourtage: boolean('avec_honoraire_courtage'),
  montantHonoCourtageClient: montant('montant_hono_courtage_client'),
  montantHonoCourtageBanque: montant('montant_hono_courtage_banque'),
  // souscription au capital (SCCV)
  avecSouscriptionCapitalKpi: boolean('avec_souscription_capital_kpi'),
  pasDeSouscriptionCapital: boolean('pas_de_souscription_capital'),
  dateSouscription: timestamp('date_souscription'),
  commentairesSouscription: text('commentaires_souscription'),
  // clause particulière
  avecClauseParticuliere: integer('avec_clause_particuliere'),
  motifClauseParticuliereId: integer('motif_clause_particuliere_id').references(
    () => motifClauseParticuliere.id,
  ),
  commentaireClauseParticuliere: text('commentaire_clause_particuliere'),
  // TMA (travaux modificatifs acquéreur)
  avecTma: boolean('avec_tma'),
  tmaMontantOuvertureDossier: montant('tma_montant_ouverture_dossier'),
  tmaDateEnvoiCourrier: timestamp('tma_date_envoi_courrier'),
  tmaDatePaiementSolde: timestamp('tma_date_paiement_solde'),
  tmaPmrMontant: montant('tma_pmr_montant'),
  tmaPmrContratSigne: boolean('tma_pmr_contrat_signe'),
  tmaPmrDateRemisNotaire: timestamp('tma_pmr_date_remis_notaire'),
  tmaCommentaire: text('tma_commentaire'),
  // parcours client (courriers / RDV jusqu'à la livraison)
  courrierInfoDemarrageDateEnvoi: timestamp(
    'courrier_info_demarrage_date_envoi',
  ),
  planTechniqueDateEnvoi: timestamp('plan_technique_date_envoi'),
  choixMateriauxDateEnvoi: timestamp('choix_materiaux_date_envoi'),
  choixMateriauxDateValide: timestamp('choix_materiaux_date_valide'),
  placoDateEnvoi: timestamp('placo_date_envoi'),
  placoRdvDate: timestamp('placo_rdv_date'),
  placoRdvHeure: timestamp('placo_rdv_heure'),
  troisMoisAvantLivraisonDateEnvoi: timestamp(
    'trois_mois_avant_livraison_date_envoi',
  ),
  troisMoisAvantLivraisonPeriode: text('trois_mois_avant_livraison_periode'),
  livraisonDateEnvoiCourrier: timestamp('livraison_date_envoi_courrier'),
  livraisonRdvDate: timestamp('livraison_rdv_date'),
  livraisonRdvHeure: timestamp('livraison_rdv_heure'),
  livraisonTrimestrePrevuContrat: text('livraison_trimestre_prevu_contrat'),
  livraisonTrimestreDecale: text('livraison_trimestre_decale'),
  dateEtatSortieLieux: timestamp('date_etat_sortie_lieux'),
  // agrément (PSLA) et levée d'option
  dateDemandeAgrement: timestamp('date_demande_agrement'),
  dateAgrementObtenu: timestamp('date_agrement_obtenu'),
  dateReceptionCourrierLvo: timestamp('date_reception_courrier_lvo'),
  // revente
  estReventeBien: integer('est_revente_bien'),
  dateButoirRevente: timestamp('date_butoir_revente'),
  cdvTechnique: text('cdv_technique'),
  cdvPromo: text('cdv_promo'),
})

export const commVendeur = pgTable('comm_vendeur', {
  id: id(),
  commercialisationId: integer('commercialisation_id').references(
    () => commercialisation.id,
  ),
  lotId: integer('lot_id').references(() => lot.id),
  commercialId: integer('commercial_id').references(() => commercial.id),
  pourcentage: real(),
  evenement: integer(), // code hérité (jalons résa/acte)
  txCommVendeur: real('tx_comm_vendeur'),
  mntCommVendeur: montant('mnt_comm_vendeur'),
  dateReglement: timestamp('date_reglement'),
  dateValidation: timestamp('date_validation'),
  commentaire: text(),
})

export const versementDepotGarantie = pgTable('versement_depot_garantie', {
  id: id(),
  // nullable : 26 versements hérités sans commercialisation
  commercialisationId: integer('commercialisation_id').references(
    () => commercialisation.id,
  ),
  montantVerse: real('montant_verse'),
  dateRemise: timestamp('date_remise'),
  dateCreation: timestamp('date_creation'),
  commentaire: text(),
})

export const tma = pgTable('tma', {
  id: id(),
  commercialisationId: integer('commercialisation_id')
    .notNull()
    .references(() => commercialisation.id),
  refDevis: text('ref_devis'),
  dateDevis: timestamp('date_devis'),
  objetDevis: text('objet_devis'),
  dateSignatureDevis: timestamp('date_signature_devis'),
  montantDevis: montant('montant_devis'),
  montantVersement1: montant('montant_versement1'),
  montantVersement2: montant('montant_versement2'),
  commentaires: text(),
})
