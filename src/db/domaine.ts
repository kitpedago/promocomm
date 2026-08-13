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

// --- module SCCV (phase 4) ---
export const structureJuridiqueStade = pgTable('structure_juridique_stade', {
  id: id(),
  libelle: text().notNull(),
})

export const gestionnaireSccv = pgTable('gestionnaire_sccv', {
  id: id(),
  libelle: text().notNull(),
})

export const partenariat = pgTable('partenariat', {
  id: id(),
  libelle: text().notNull(),
})

export const indexTaux = pgTable('index_taux', {
  id: id(),
  libelle: text().notNull(),
})

export const motifRemunerationAssocie = pgTable('motif_remuneration_associe', {
  id: id(),
  libelle: text().notNull(),
})

export const typeCompteBanque = pgTable('type_compte_banque', {
  id: id(),
  libelle: text().notNull(),
})

export const utilisationCompte = pgTable('utilisation_compte', {
  id: id(),
  libelle: text().notNull(),
})

// Service des impôts des entreprises
export const sie = pgTable('sie', {
  id: id(),
  libelle: text().notNull(),
  adresse: text(),
  cp: text(),
  commune: text(),
})

// Collaborateurs internes (legacy tPersonne) — seuls les comptables
// (fonction_id = 1) sont utilisés par le module SCCV ; fonction_id et
// equipe_personne_id repris bruts, sans table de référence (pas d'écran)
export const personne = pgTable('personne', {
  id: id(),
  patronyme: text(),
  prenom: text(),
  estPresent: boolean('est_present'),
  fonctionId: integer('fonction_id'),
  equipePersonneId: integer('equipe_personne_id'),
  email: text(),
})

// Banques (contacts Compte courant / Prêt — utilisés par la phase 6)
export const banque = pgTable('banque', {
  id: id(),
  libelle: text().notNull(),
  ccNom: text('cc_nom'),
  ccAdresse: text('cc_adresse'),
  ccCp: text('cc_cp'),
  ccCommune: text('cc_commune'),
  ccTel: text('cc_tel'),
  ccEmail: text('cc_email'),
  pretNom: text('pret_nom'),
  pretAdresse: text('pret_adresse'),
  pretCp: text('pret_cp'),
  pretCommune: text('pret_commune'),
  pretTel: text('pret_tel'),
  pretEmail: text('pret_email'),
})

// Associés des SCCV (personnes morales)
export const associe = pgTable('associe', {
  id: id(),
  rs: text().notNull(),
  formeJuridique: text('forme_juridique'),
  siren: text(),
  adresse1: text(),
  adresse2: text(),
  cp: text(),
  commune: text(),
  tel: text(),
  estHlm: boolean('est_hlm'),
  contactNomComplet: text('contact_nom_complet'),
  contactFonction: text('contact_fonction'),
  email: text(),
  commentaire: text(),
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
  // volet gestion (phase 4)
  stadeId: integer('stade_id').references(() => structureJuridiqueStade.id),
  personneComptableId: integer('personne_comptable_id').references(
    () => personne.id,
  ),
  gestionnaireSccvId: integer('gestionnaire_sccv_id').references(
    () => gestionnaireSccv.id,
  ),
  partenariatId: integer('partenariat_id').references(() => partenariat.id),
  hfsga: boolean(),
  dateBilanDebutPremierExercice: timestamp('date_bilan_debut_premier_exercice'),
  dateBilanFinPremierExercice: timestamp('date_bilan_fin_premier_exercice'),
  // texte en legacy (saisies libres), repris tels quels
  dateModifCloture: text('date_modif_cloture'),
  datePlanningCloture: text('date_planning_cloture'),
  dateLiberationCapital: timestamp('date_liberation_capital'),
  // volet Centre des impôts
  ediTva: boolean('edi_tva'),
  ediLiasse: boolean('edi_liasse'),
  cpteFiscal: boolean('cpte_fiscal'),
  sieId: integer('sie_id').references(() => sie.id),
  civiliteId: integer('civilite_id').references(() => civilite.id),
  interlocuteurSie: text('interlocuteur_sie'),
  dateMandatSie: timestamp('date_mandat_sie'),
})

// Parts des associés dans les SCCV (onglet Associés)
export const participation = pgTable('participation', {
  id: id(),
  structureJuridiqueId: integer('structure_juridique_id')
    .notNull()
    .references(() => structureJuridique.id),
  associeId: integer('associe_id').references(() => associe.id),
  pourcentage: real(), // fraction 0–1 (iso-legacy), affichée en %
  commentaires: text(),
  convTreso: boolean('conv_treso'),
  motifRemunerationAssocieId: integer(
    'motif_remuneration_associe_id',
  ).references(() => motifRemunerationAssocie.id),
  dateSignatureConv: timestamp('date_signature_conv'),
  dateApplication: timestamp('date_application'),
  dateFinRemuneration: timestamp('date_fin_remuneration'),
  indexTauxRemunerationId: integer('index_taux_remuneration_id').references(
    () => indexTaux.id,
  ),
  infoTauxRemuneration: text('info_taux_remuneration'),
  // legacy IDPeriodicite_Versement : 100 % à 0 → code texte ANNUEL/TRIM
  periodiciteVersement: text('periodicite_versement'),
})

// Comptes bancaires des SCCV (onglet Comptes bancaires)
export const compteBanque = pgTable('compte_banque', {
  id: id(),
  structureJuridiqueId: integer('structure_juridique_id')
    .notNull()
    .references(() => structureJuridique.id),
  banqueId: integer('banque_id').references(() => banque.id),
  typeCompteBanqueId: integer('type_compte_banque_id').references(
    () => typeCompteBanque.id,
  ),
  utilisationCompteId: integer('utilisation_compte_id').references(
    () => utilisationCompte.id,
  ),
  numCompte: text('num_compte'),
  iban: text(),
  bic: text(),
  estCloture: boolean('est_cloture'),
  commentaires: text(),
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
  // --- Compta & Finances : Suivi résultat (grille PSLA / VEFA réduit /
  // VEFA normal / Autre — le coût VEFA est unique, cellule fusionnée WinDev)
  cahtPrevPsla: montant('caht_prev_psla'),
  cahtPrevVefaReduit: montant('caht_prev_vefa_reduit'),
  cahtPrevVefa: montant('caht_prev_vefa'),
  cahtPrevAutre: montant('caht_prev_autre'),
  cahtPrevCommentaire: text('caht_prev_commentaire'),
  cahtActua: montant('caht_actua'),
  cahtReel: montant('caht_reel'),
  subvPrevPsla: montant('subv_prev_psla'),
  subvPrevVefaReduit: montant('subv_prev_vefa_reduit'),
  subvPrevVefaNormal: montant('subv_prev_vefa_normal'),
  subvPrevAutre: montant('subv_prev_autre'),
  honoCommPsla: montant('hono_comm_psla'),
  honoCommVefaReduit: montant('hono_comm_vefa_reduit'),
  honoCommVefaNormal: montant('hono_comm_vefa_normal'),
  honoCommAutre: montant('hono_comm_autre'),
  coutPrevPsla: montant('cout_prev_psla'),
  coutPrevVefa: montant('cout_prev_vefa'),
  coutPrevAutre: montant('cout_prev_autre'),
  coutPrevCommentaire: text('cout_prev_commentaire'),
  coutReelPsla: montant('cout_reel_psla'),
  coutReelVefa: montant('cout_reel_vefa'),
  coutReelAutre: montant('cout_reel_autre'),
  coutReelCommentaire: text('cout_reel_commentaire'),
  quotePartPsla: montant('quote_part_psla'),
  quotePartVefaReduit: montant('quote_part_vefa_reduit'),
  quotePartVefaNormal: montant('quote_part_vefa_normal'),
  quotePartAutre: montant('quote_part_autre'),
  quotePartCommentaire: text('quote_part_commentaire'),
  modeRepartQuotePartId: integer('mode_repart_quote_part_id').references(
    () => modeRepartQuotePart.id,
  ),
  nbLvoPrev: integer('nb_lvo_prev'),
  nbLvoPrevAnnee: integer('nb_lvo_prev_annee'),
  // --- Compta & Finances : Suivi détaillé frais / budget
  fraisBudgetDate: timestamp('frais_budget_date'),
  fraisBudgetCommentaire: text('frais_budget_commentaire'),
  fraisActuaDate: timestamp('frais_actua_date'),
  fraisActuaCommentaire: text('frais_actua_commentaire'),
  fraisConsommeDate: timestamp('frais_consomme_date'),
  fraisConsommeCommentaire: text('frais_consomme_commentaire'),
  fraisReelDate: timestamp('frais_reel_date'),
  fraisReelCommentaire: text('frais_reel_commentaire'),
  listeBudgetFraisStadeId: integer('liste_budget_frais_stade_id').references(
    () => listeBudget.id,
  ),
  typeMissionBudgetArchitecteId: integer(
    'type_mission_budget_architecte_id',
  ).references(() => typeMissionBudgetArchitecte.id),
  dateContratArchitecte: timestamp('date_contrat_architecte'),
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

// ---------------------------------------------------------------------------
// Dimension financière (phase 6 — FEN_Compta) : nomenclatures
// ---------------------------------------------------------------------------

// (banque et indexTaux sont définis plus haut avec le module SCCV)

export const typeFinancement = pgTable('type_financement', {
  id: id(),
  libelle: text().notNull(),
  categorie: text(),
})

export const finPret = pgTable('fin_pret', {
  id: id(),
  libelle: text().notNull(),
})

export const statutPartSociale = pgTable('statut_part_sociale', {
  id: id(),
  libelle: text().notNull(),
})

export const actionAlerte = pgTable('action_alerte', {
  id: id(),
  libelle: text().notNull(),
})

export const statutApport = pgTable('statut_apport', {
  id: id(),
  libelle: text().notNull(),
})

export const mandatHypothequer = pgTable('mandat_hypothequer', {
  id: id(),
  libelle: text().notNull(),
})

export const statutCoutMandat = pgTable('statut_cout_mandat', {
  id: id(),
  libelle: text().notNull(),
})

export const periodeTauxGfa = pgTable('periode_taux_gfa', {
  id: id(),
  libelle: text().notNull(),
})

export const actionFinGfaType = pgTable('action_fin_gfa_type', {
  id: id(),
  libelle: text().notNull(),
})

export const statutApportPromoteurGfa = pgTable('statut_apport_promoteur_gfa', {
  id: id(),
  libelle: text().notNull(),
})

export const banqueActionType = pgTable('banque_action_type', {
  id: id(),
  libelle: text().notNull(),
})

export const garantieEmpruntActionType = pgTable(
  'garantie_emprunt_action_type',
  {
    id: id(),
    libelle: text().notNull(),
  },
)

export const organismeAgrement = pgTable('organisme_agrement', {
  id: id(),
  libelle: text().notNull(),
})

export const organismeGarantieEmprunt = pgTable('organisme_garantie_emprunt', {
  id: id(),
  libelle: text().notNull(),
})

export const modeRepartQuotePart = pgTable('mode_repart_quote_part', {
  id: id(),
  libelle: text().notNull(),
})

export const listeBudget = pgTable('liste_budget', {
  id: id(),
  libelle: text().notNull(),
})

export const usageFrais = pgTable('usage_frais', {
  id: id(),
  libelle: text().notNull(),
})

export const categorieFrais = pgTable('categorie_frais', {
  id: id(),
  libelle: text().notNull(),
  estPublicite: boolean('est_publicite'),
  ordre: integer(),
  usageFraisId: integer('usage_frais_id').references(() => usageFrais.id),
})

export const typeMissionBudgetArchitecte = pgTable(
  'type_mission_budget_architecte',
  {
    id: id(),
    libelle: text().notNull(),
  },
)

// ---------------------------------------------------------------------------
// Dimension financière : tables métier
// ---------------------------------------------------------------------------

// Déblocages d'une subvention (accordéon Subventions de FEN_Compta)
export const deblocageSubvention = pgTable('deblocage_subvention', {
  id: id(),
  subventionId: integer('subvention_id').references(() => subvention.id),
  dateDemande: timestamp('date_demande'),
  montant: montant('montant'),
  datePaiement: timestamp('date_paiement'),
  commentaire: text(),
})

// Suivi détaillé frais/budget par catégorie (legacy FraisFinancierPub)
export const fraisFinancier = pgTable('frais_financier', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  categorieFraisId: integer('categorie_frais_id').references(
    () => categorieFrais.id,
  ),
  budgetMontant: montant('budget_montant'),
  actuaMontant: montant('actua_montant'),
  consommeMontant: montant('consomme_montant'),
  reelMontant: montant('reel_montant'),
  ordre: integer(),
})

// Validations de budget de la tranche (legacy tBudget — pas d'écran dans
// FEN_Compta, repris pour l'ETL phase 6)
export const budget = pgTable('budget', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  listeBudgetId: integer('liste_budget_id').references(() => listeBudget.id),
  dateValidation: timestamp('date_validation'),
  dateSaisiePromoges: timestamp('date_saisie_promoges'),
  commentaire: text(),
})

// Financements de la tranche (onglets Financements / Financements PSLA /
// Suivi Prêt 1 % — colonnes *_old exclues)
export const financement = pgTable('financement', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  typeFinancementId: integer('type_financement_id').references(
    () => typeFinancement.id,
  ),
  banqueId: integer('banque_id').references(() => banque.id),
  surOpe: boolean('sur_ope'),
  montantFinancement: montant('montant_financement'),
  montantPrevi: montant('montant_previ'),
  infosPretPrevi: text('infos_pret_previ'),
  dateEnvoiDossier: timestamp('date_envoi_dossier'),
  dateSignature: timestamp('date_signature'),
  dateButoir: timestamp('date_butoir'),
  actionAlerteId: integer('action_alerte_id').references(() => actionAlerte.id),
  dateDebutMobilisation: timestamp('date_debut_mobilisation'),
  dateFinMobilisation: timestamp('date_fin_mobilisation'),
  dureeMoisMobPsla: integer('duree_mois_mob_psla'),
  finPretId: integer('fin_pret_id').references(() => finPret.id),
  indexTauxId: integer('index_taux_id').references(() => indexTaux.id),
  indexTauxFloore: boolean('index_taux_floore'),
  margeBanque: real('marge_banque'),
  tauxPret: real('taux_pret'),
  periodicite: text(),
  commissionEngagementPourc: real('commission_engagement_pourc'),
  fraisDossier: montant('frais_dossier'),
  estPrlvFraisDossier: boolean('est_prlv_frais_dossier'),
  estPhaseAmortissement: boolean('est_phase_amortissement'),
  estSolde: boolean('est_solde'),
  numContrat: text('num_contrat'),
  partSocialeMontant: montant('part_sociale_montant'),
  statutPartSocialeId: integer('statut_part_sociale_id').references(
    () => statutPartSociale.id,
  ),
  dateStatutPartSociale: timestamp('date_statut_part_sociale'),
  apportPromoteur: montant('apport_promoteur'),
  statutApportId: integer('statut_apport_id').references(() => statutApport.id),
  blocageHonoOcMontant: montant('blocage_hono_oc_montant'),
  blocageHonoOcFin: text('blocage_hono_oc_fin'),
  blocageHonoOcComment: text('blocage_hono_oc_comment'),
  estHfCautionOc: boolean('est_hf_caution_oc'),
  mandatHypothequerId: integer('mandat_hypothequer_id').references(
    () => mandatHypothequer.id,
  ),
  mandatCoutMontant: montant('mandat_cout_montant'),
  statutCoutMandatId: integer('statut_cout_mandat_id').references(
    () => statutCoutMandat.id,
  ),
  prevMtOc: integer('prev_mt_oc'),
  contratMontant: montant('contrat_montant'),
  contratNbLogt: integer('contrat_nb_logt'),
  dateDebutEcheance: timestamp('date_debut_echeance'),
  dateFinEcheance: timestamp('date_fin_echeance'),
  montantEcheance: montant('montant_echeance'),
  dateVerstPret: timestamp('date_verst_pret'),
  pretEmployeurNumeroModifEcheance: integer(
    'pret_employeur_numero_modif_echeance',
  ),
  pretEmployeurDateDebutAmort: timestamp('pret_employeur_date_debut_amort'),
  estAmortDiffere: boolean('est_amort_differe'),
  amortissementDiffereDuree: real('amortissement_differe_duree'),
  amortissementDiffereFinDate: timestamp('amortissement_differe_fin_date'),
  commentaire: text(),
})

// Déblocages d'un financement / PSLA (onglets Financements PSLA & Suivi Prêt 1 %)
export const deblocagePsla = pgTable('deblocage_psla', {
  id: id(),
  financementId: integer('financement_id').references(() => financement.id),
  pslaId: integer('psla_id').references(() => psla.id),
  numero: integer(),
  montant: montant('montant'),
  dateDemande: timestamp('date_demande'),
  dateVersement: timestamp('date_versement'),
  commentaire: text(),
})

export const remboursementAnticipe = pgTable('remboursement_anticipe', {
  id: id(),
  financementId: integer('financement_id').references(() => financement.id),
  numero: integer(),
  montant: montant('montant'),
  date: timestamp('date'),
  nbLogt: integer('nb_logt'),
  commentaire: text(),
})

// Dossier PSLA de la tranche (onglets Admin PSLA & Contrats PSLA —
// colonnes old_* exclues)
export const psla = pgTable('psla', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  estimPsla: integer('estim_psla'),
  montantPsla: montant('montant_psla'),
  coutTotal: montant('cout_total'),
  nbLogtAgrement: integer('nb_logt_agrement'),
  numAgrement: text('num_agrement'),
  dateAgrementProvisoire: timestamp('date_agrement_provisoire'),
  dureeAnneePsla: integer('duree_annee_psla'),
  organismeAgrementId: integer('organisme_agrement_id').references(
    () => organismeAgrement.id,
  ),
  previAgrement: timestamp('previ_agrement'),
  dateDepotDossierAgrement: timestamp('date_depot_dossier_agrement'),
  dateReceptionAgrement: timestamp('date_reception_agrement'),
  dateDecisionAgrement: timestamp('date_decision_agrement'),
  dateConventionEngagementReciproque: timestamp(
    'date_convention_engagement_reciproque',
  ),
  cffFiClient: timestamp('cff_fi_client'),
  banqueOperateurId: integer('banque_operateur_id').references(() => banque.id),
  banqueOperateurDate: timestamp('banque_operateur_date'),
  banqueClientId: integer('banque_client_id').references(() => banque.id),
  banqueClientDate: timestamp('banque_client_date'),
  organismeGarantieEmpruntId: integer(
    'organisme_garantie_emprunt_id',
  ).references(() => organismeGarantieEmprunt.id),
  dateDeliberationGarantie: timestamp('date_deliberation_garantie'),
  numBureauGarantie: text('num_bureau_garantie'),
  numConventionGarantie: text('num_convention_garantie'),
  dateSignatureGarant: timestamp('date_signature_garant'),
  garantieEmpruntActionDate: timestamp('garantie_emprunt_action_date'),
  garantieEmpruntActionTypeId: integer(
    'garantie_emprunt_action_type_id',
  ).references(() => garantieEmpruntActionType.id),
  banqueActionDate: timestamp('banque_action_date'),
  banqueActionTypeId: integer('banque_action_type_id').references(
    () => banqueActionType.id,
  ),
  dateInfoAnnuelle: timestamp('date_info_annuelle'),
  dateInfoFin: timestamp('date_info_fin'),
  finSuivi: boolean('fin_suivi'),
  commentaire: text(),
  // « Commemtaires » legacy (sic) — second champ libre, affiché sur Contrats PSLA
  commentaires: text(),
})

// Garantie financière d'achèvement de la tranche (onglet GFA)
export const gfa = pgTable('gfa', {
  id: id(),
  trancheId: integer('tranche_id').references(() => tranche.id),
  surOpe: boolean('sur_ope'),
  banqueId: integer('banque_id').references(() => banque.id),
  estIntrinseque: boolean('est_intrinseque'),
  dateValidation: timestamp('date_validation'),
  dateDossier: timestamp('date_dossier'),
  dateAccord: timestamp('date_accord'),
  dateAttestation: timestamp('date_attestation'),
  apportPromoteur: montant('apport_promoteur'),
  statutApportPromoteurGfaId: integer(
    'statut_apport_promoteur_gfa_id',
  ).references(() => statutApportPromoteurGfa.id),
  actionFinDate: timestamp('action_fin_date'),
  actionFinTypeId: integer('action_fin_type_id').references(
    () => actionFinGfaType.id,
  ),
  finGfa: boolean('fin_gfa'),
  fondsGarantieMontant: montant('fonds_garantie_montant'),
  fondsGarantieDateDemandeRemb: timestamp('fonds_garantie_date_demande_remb'),
  fondsGarantieDateRemb: timestamp('fonds_garantie_date_remb'),
  partSocialeMontant: montant('part_sociale_montant'),
  partSocialeDateDemandeRemb: timestamp('part_sociale_date_demande_remb'),
  partSocialeDateRemb: timestamp('part_sociale_date_remb'),
  partSocialeCommentaire: text('part_sociale_commentaire'),
  // conditions financières
  hfCaution: boolean('hf_caution'),
  taux: real(),
  periodeTauxGfaId: integer('periode_taux_gfa_id').references(
    () => periodeTauxGfa.id,
  ),
  dureeMois: integer('duree_mois'),
  commentaireTaux: text('commentaire_taux'),
  baseInitiale: montant('base_initiale'),
  commissionCautionMontant: montant('commission_caution_montant'),
  datePremierPrlvt: timestamp('date_premier_prlvt'),
  fraisDossier: montant('frais_dossier'),
  precomPourc: real('precom_pourc'),
  caTtcMin: montant('ca_ttc_min'),
  commentaireConditions: text('commentaire_conditions'),
  commentaires: text(),
})

export const reducGfa = pgTable('reduc_gfa', {
  id: id(),
  gfaId: integer('gfa_id').references(() => gfa.id),
  montant: montant('montant'),
  dateReduc: timestamp('date_reduc'),
  commentaire: text(),
})

// ---------------------------------------------------------------------------
// Bilan par SCCV (phase 8) — saisie annuelle Stock / CA HT / Résultats
// (FEN_TABLE_Bilan ; l'accordéon IS - Non IS lit bilan_resultat)
// ---------------------------------------------------------------------------

export const bilanStock = pgTable('bilan_stock', {
  id: id(),
  structureJuridiqueId: integer('structure_juridique_id')
    .notNull()
    .references(() => structureJuridique.id),
  annee: integer(),
  stockTotalDebit33a35: montant('stock_total_debit_33a35'),
  stockTotalCredit33a35: montant('stock_total_credit_33a35'),
  stockCredit713300: montant('stock_credit_713300'),
  stockPslaPhaseLocNb: integer('stock_psla_phase_loc_nb'),
  stockPslaPhaseLocCout: montant('stock_psla_phase_loc_cout'),
  stockInvenduNb: integer('stock_invendu_nb'),
  stockInvenduCout: montant('stock_invendu_cout'),
})

export const bilanCaht = pgTable('bilan_caht', {
  id: id(),
  structureJuridiqueId: integer('structure_juridique_id')
    .notNull()
    .references(() => structureJuridique.id),
  annee: integer(),
  cahtVefa: montant('caht_vefa'),
  cahtLvPsla: montant('caht_lv_psla'),
  cahtLoyers: montant('caht_loyers'),
  cahtTma: montant('caht_tma'),
  cahtTerrain: montant('caht_terrain'),
  cahtAutres: montant('caht_autres'),
  cahtCommentaire: text('caht_commentaire'),
  nbLotVefa: integer('nb_lot_vefa'),
  nbLotLvPsla: integer('nb_lot_lv_psla'),
  nbLotAutre: integer('nb_lot_autre'),
  nbLotCommentaire: text('nb_lot_commentaire'),
})

export const bilanResultat = pgTable('bilan_resultat', {
  id: id(),
  structureJuridiqueId: integer('structure_juridique_id')
    .notNull()
    .references(() => structureJuridique.id),
  annee: integer(),
  // accordéon Résultats
  resultCptaSccvTotal: montant('result_cpta_sccv_total'),
  ranSccv: montant('ran_sccv'),
  cpteCourantSccv: montant('cpte_courant_sccv'),
  datePvag: timestamp('date_pvag'),
  resultAcompteMontant: montant('result_acompte_montant'),
  resultAcompteDateVersement: timestamp('result_acompte_date_versement'),
  reintegrationFiscaleSccv: montant('reintegration_fiscale_sccv'),
  deductionFiscaleSccv: montant('deduction_fiscale_sccv'),
  reintegrationFiscaleComm: text('reintegration_fiscale_comm'),
  deductionFiscaleComm: text('deduction_fiscale_comm'),
  // héritage : ventilations comptables IS/non-IS conservées mais non affichées
  resultCptaSccvIs: montant('result_cpta_sccv_is'),
  resultCptaSccvNonIs: montant('result_cpta_sccv_non_is'),
  reintHfResultFiscal: montant('reint_hf_result_fiscal'),
  deducHfPerteFiscale: montant('deduc_hf_perte_fiscale'),
  reintHfPerteComptable: montant('reint_hf_perte_comptable'),
  deducHfResultComptable: montant('deduc_hf_result_comptable'),
  // accordéon IS - Non IS
  pourcHfAnnee: real('pourc_hf_annee'), // fraction 0–1 (iso-legacy), « % KPI de l'année »
  commentairePourcHf: text('commentaire_pourc_hf'),
  resultFiscaSccvIs: montant('result_fisca_sccv_is'),
  resultFiscaSccvNonIs: montant('result_fisca_sccv_non_is'),
  ranSccvIs: montant('ran_sccv_is'),
  ranSccvNonIs: montant('ran_sccv_non_is'),
  ranSccvTotal: montant('ran_sccv_total'),
  quotePartHfRanIs: montant('quote_part_hf_ran_is'),
  quotePartHfRanNonIs: montant('quote_part_hf_ran_non_is'),
  quotePartHfRanTotal: montant('quote_part_hf_ran_total'),
})
