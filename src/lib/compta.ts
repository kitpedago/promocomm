// Server functions du module Compta & Finances (FEN_Compta, phase 6) —
// lecture par tranche : subventions/déblocages, suivi résultat + frais,
// financements (PSLA / autres / Prêt 1 %), PSLA, GFA.
// Captures : migration_windev/captures_ecrans/ComptaFinances_*.png.
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, isNull, notInArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import {
  actionAlerte,
  actionFinGfaType,
  banque,
  banqueActionType,
  categorieFrais,
  deblocagePsla,
  deblocageSubvention,
  financement,
  finPret,
  fraisFinancier,
  garantieEmpruntActionType,
  gfa,
  indexTaux,
  listeBudget,
  mandatHypothequer,
  modeRepartQuotePart,
  organismeAgrement,
  organismeGarantieEmprunt,
  periodeTauxGfa,
  psla,
  reducGfa,
  remboursementAnticipe,
  statutApport,
  statutApportPromoteurGfa,
  statutCoutMandat,
  statutPartSociale,
  tranche,
  typeFinancement,
  typeMissionBudgetArchitecte,
  usageFrais,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireSession } from '#/lib/session.server.ts'

// Accordéon « Suivi évolution de dépenses et budget » : blocs financiers de la
// tranche (Suivi résultat + en-tête du suivi détaillé frais) et lignes de frais.
export const getSuiviTrancheFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const suivi = (
      await db
        .select({
          // Suivi résultat (grille PSLA / VEFA réduit / VEFA normal / Autre)
          cahtPrevPsla: tranche.cahtPrevPsla,
          cahtPrevVefaReduit: tranche.cahtPrevVefaReduit,
          cahtPrevVefa: tranche.cahtPrevVefa,
          cahtPrevAutre: tranche.cahtPrevAutre,
          cahtPrevCommentaire: tranche.cahtPrevCommentaire,
          subvPrevPsla: tranche.subvPrevPsla,
          subvPrevVefaReduit: tranche.subvPrevVefaReduit,
          subvPrevVefaNormal: tranche.subvPrevVefaNormal,
          subvPrevAutre: tranche.subvPrevAutre,
          honoCommPsla: tranche.honoCommPsla,
          honoCommVefaReduit: tranche.honoCommVefaReduit,
          honoCommVefaNormal: tranche.honoCommVefaNormal,
          honoCommAutre: tranche.honoCommAutre,
          coutPrevPsla: tranche.coutPrevPsla,
          coutPrevVefa: tranche.coutPrevVefa,
          coutPrevAutre: tranche.coutPrevAutre,
          coutPrevCommentaire: tranche.coutPrevCommentaire,
          coutReelPsla: tranche.coutReelPsla,
          coutReelVefa: tranche.coutReelVefa,
          coutReelAutre: tranche.coutReelAutre,
          coutReelCommentaire: tranche.coutReelCommentaire,
          quotePartPsla: tranche.quotePartPsla,
          quotePartVefaReduit: tranche.quotePartVefaReduit,
          quotePartVefaNormal: tranche.quotePartVefaNormal,
          quotePartAutre: tranche.quotePartAutre,
          quotePartCommentaire: tranche.quotePartCommentaire,
          modeRepartQuotePart: modeRepartQuotePart.libelle,
          nbLvoPrev: tranche.nbLvoPrev,
          nbLvoPrevAnnee: tranche.nbLvoPrevAnnee,
          // Suivi détaillé frais / budget (en-tête)
          fraisBudgetDate: tranche.fraisBudgetDate,
          fraisBudgetCommentaire: tranche.fraisBudgetCommentaire,
          fraisActuaDate: tranche.fraisActuaDate,
          fraisActuaCommentaire: tranche.fraisActuaCommentaire,
          fraisConsommeDate: tranche.fraisConsommeDate,
          fraisConsommeCommentaire: tranche.fraisConsommeCommentaire,
          fraisReelDate: tranche.fraisReelDate,
          fraisReelCommentaire: tranche.fraisReelCommentaire,
          stadeBudget: listeBudget.libelle,
          typeMissionBudgetArchitecte: typeMissionBudgetArchitecte.libelle,
          dateContratArchitecte: tranche.dateContratArchitecte,
        })
        .from(tranche)
        .leftJoin(
          modeRepartQuotePart,
          eq(tranche.modeRepartQuotePartId, modeRepartQuotePart.id),
        )
        .leftJoin(listeBudget, eq(tranche.listeBudgetFraisStadeId, listeBudget.id))
        .leftJoin(
          typeMissionBudgetArchitecte,
          eq(
            tranche.typeMissionBudgetArchitecteId,
            typeMissionBudgetArchitecte.id,
          ),
        )
        .where(eq(tranche.id, data.trancheId))
    ).at(0)

    const frais = await db
      .select({
        id: fraisFinancier.id,
        categorie: categorieFrais.libelle,
        budgetMontant: fraisFinancier.budgetMontant,
        actuaMontant: fraisFinancier.actuaMontant,
        consommeMontant: fraisFinancier.consommeMontant,
        reelMontant: fraisFinancier.reelMontant,
        // l'Ordre affiché (et le tri) est celui de la catégorie, comme la
        // table WinDev « triée par Ordre après Ajout inexistants »
        ordre: categorieFrais.ordre,
        usageFrais: usageFrais.libelle,
      })
      .from(fraisFinancier)
      .leftJoin(
        categorieFrais,
        eq(fraisFinancier.categorieFraisId, categorieFrais.id),
      )
      .leftJoin(usageFrais, eq(categorieFrais.usageFraisId, usageFrais.id))
      .where(eq(fraisFinancier.trancheId, data.trancheId))
      .orderBy(asc(categorieFrais.ordre), asc(fraisFinancier.id))

    return suivi ? { ...suivi, frais } : null
  })

// Déblocages d'une subvention (table basse de l'accordéon Subventions)
export const getDeblocagesSubventionFn = createServerFn({ method: 'GET' })
  .validator((data: { subventionId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: deblocageSubvention.id,
        dateDemande: deblocageSubvention.dateDemande,
        montant: deblocageSubvention.montant,
        datePaiement: deblocageSubvention.datePaiement,
        commentaire: deblocageSubvention.commentaire,
      })
      .from(deblocageSubvention)
      .where(eq(deblocageSubvention.subventionId, data.subventionId))
      .orderBy(asc(deblocageSubvention.dateDemande), asc(deblocageSubvention.id))
  })

const banqueOperateur = alias(banque, 'banque_operateur')
const banqueClient = alias(banque, 'banque_client')

// Onglets Admin PSLA & Contrats PSLA : dossiers PSLA de la tranche
export const getPslaFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: psla.id,
        estimPsla: psla.estimPsla,
        montantPsla: psla.montantPsla,
        coutTotal: psla.coutTotal,
        nbLogtAgrement: psla.nbLogtAgrement,
        numAgrement: psla.numAgrement,
        dateAgrementProvisoire: psla.dateAgrementProvisoire,
        dureeAnneePsla: psla.dureeAnneePsla,
        organismeAgrement: organismeAgrement.libelle,
        previAgrement: psla.previAgrement,
        dateDepotDossierAgrement: psla.dateDepotDossierAgrement,
        dateReceptionAgrement: psla.dateReceptionAgrement,
        dateDecisionAgrement: psla.dateDecisionAgrement,
        dateConventionEngagementReciproque:
          psla.dateConventionEngagementReciproque,
        cffFiClient: psla.cffFiClient,
        banqueOperateur: banqueOperateur.libelle,
        banqueOperateurDate: psla.banqueOperateurDate,
        banqueClient: banqueClient.libelle,
        banqueClientDate: psla.banqueClientDate,
        organismeGarantieEmprunt: organismeGarantieEmprunt.libelle,
        dateDeliberationGarantie: psla.dateDeliberationGarantie,
        numBureauGarantie: psla.numBureauGarantie,
        numConventionGarantie: psla.numConventionGarantie,
        garantieEmpruntActionDate: psla.garantieEmpruntActionDate,
        garantieEmpruntActionType: garantieEmpruntActionType.libelle,
        banqueActionDate: psla.banqueActionDate,
        banqueActionType: banqueActionType.libelle,
        dateInfoAnnuelle: psla.dateInfoAnnuelle,
        dateInfoFin: psla.dateInfoFin,
        finSuivi: psla.finSuivi,
        commentaires: psla.commentaires,
      })
      .from(psla)
      .leftJoin(
        organismeAgrement,
        eq(psla.organismeAgrementId, organismeAgrement.id),
      )
      .leftJoin(banqueOperateur, eq(psla.banqueOperateurId, banqueOperateur.id))
      .leftJoin(banqueClient, eq(psla.banqueClientId, banqueClient.id))
      .leftJoin(
        organismeGarantieEmprunt,
        eq(psla.organismeGarantieEmpruntId, organismeGarantieEmprunt.id),
      )
      .leftJoin(
        garantieEmpruntActionType,
        eq(psla.garantieEmpruntActionTypeId, garantieEmpruntActionType.id),
      )
      .leftJoin(
        banqueActionType,
        eq(psla.banqueActionTypeId, banqueActionType.id),
      )
      .where(eq(psla.trancheId, data.trancheId))
      .orderBy(asc(psla.id))
  })

// Financements de la tranche. Découpage WinDev (REQ_Financement*) :
// psla = type 1, pret1 = type 5, autres = ni 1 ni 5 (type absent inclus).
export type VueFinancement = 'psla' | 'autres' | 'pret1'

export const getFinancementsFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number; vue: VueFinancement }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const parVue = {
      psla: eq(financement.typeFinancementId, 1),
      pret1: eq(financement.typeFinancementId, 5),
      autres: or(
        isNull(financement.typeFinancementId),
        notInArray(financement.typeFinancementId, [1, 5]),
      ),
    }[data.vue]
    return db
      .select({
        id: financement.id,
        typeFinancement: typeFinancement.libelle,
        banque: banque.libelle,
        surOpe: financement.surOpe,
        montantFinancement: financement.montantFinancement,
        montantPrevi: financement.montantPrevi,
        infosPretPrevi: financement.infosPretPrevi,
        prevMtOc: financement.prevMtOc,
        dateEnvoiDossier: financement.dateEnvoiDossier,
        dateSignature: financement.dateSignature,
        dateButoir: financement.dateButoir,
        actionAlerte: actionAlerte.libelle,
        dateDebutMobilisation: financement.dateDebutMobilisation,
        dateFinMobilisation: financement.dateFinMobilisation,
        dureeMoisMobPsla: financement.dureeMoisMobPsla,
        finPret: finPret.libelle,
        indexTaux: indexTaux.libelle,
        indexTauxFloore: financement.indexTauxFloore,
        margeBanque: financement.margeBanque,
        tauxPret: financement.tauxPret,
        periodicite: financement.periodicite,
        commissionEngagementPourc: financement.commissionEngagementPourc,
        fraisDossier: financement.fraisDossier,
        estPrlvFraisDossier: financement.estPrlvFraisDossier,
        estPhaseAmortissement: financement.estPhaseAmortissement,
        estSolde: financement.estSolde,
        numContrat: financement.numContrat,
        partSocialeMontant: financement.partSocialeMontant,
        statutPartSociale: statutPartSociale.libelle,
        dateStatutPartSociale: financement.dateStatutPartSociale,
        apportPromoteur: financement.apportPromoteur,
        statutApport: statutApport.libelle,
        blocageHonoOcMontant: financement.blocageHonoOcMontant,
        blocageHonoOcFin: financement.blocageHonoOcFin,
        blocageHonoOcComment: financement.blocageHonoOcComment,
        estHfCautionOc: financement.estHfCautionOc,
        mandatHypothequer: mandatHypothequer.libelle,
        mandatCoutMontant: financement.mandatCoutMontant,
        statutCoutMandat: statutCoutMandat.libelle,
        contratMontant: financement.contratMontant,
        contratNbLogt: financement.contratNbLogt,
        dateDebutEcheance: financement.dateDebutEcheance,
        dateFinEcheance: financement.dateFinEcheance,
        montantEcheance: financement.montantEcheance,
        dateVerstPret: financement.dateVerstPret,
        pretEmployeurNumeroModifEcheance:
          financement.pretEmployeurNumeroModifEcheance,
        pretEmployeurDateDebutAmort: financement.pretEmployeurDateDebutAmort,
        estAmortDiffere: financement.estAmortDiffere,
        amortissementDiffereDuree: financement.amortissementDiffereDuree,
        amortissementDiffereFinDate: financement.amortissementDiffereFinDate,
        commentaire: financement.commentaire,
      })
      .from(financement)
      .leftJoin(
        typeFinancement,
        eq(financement.typeFinancementId, typeFinancement.id),
      )
      .leftJoin(banque, eq(financement.banqueId, banque.id))
      .leftJoin(actionAlerte, eq(financement.actionAlerteId, actionAlerte.id))
      .leftJoin(finPret, eq(financement.finPretId, finPret.id))
      .leftJoin(indexTaux, eq(financement.indexTauxId, indexTaux.id))
      .leftJoin(
        statutPartSociale,
        eq(financement.statutPartSocialeId, statutPartSociale.id),
      )
      .leftJoin(statutApport, eq(financement.statutApportId, statutApport.id))
      .leftJoin(
        mandatHypothequer,
        eq(financement.mandatHypothequerId, mandatHypothequer.id),
      )
      .leftJoin(
        statutCoutMandat,
        eq(financement.statutCoutMandatId, statutCoutMandat.id),
      )
      .where(and(eq(financement.trancheId, data.trancheId), parVue))
      .orderBy(asc(financement.id))
  })

// Tables basses des onglets Financements PSLA / Suivi Prêt 1 % :
// déblocages et remboursements anticipés du financement sélectionné
export const getMouvementsFinancementFn = createServerFn({ method: 'GET' })
  .validator((data: { financementId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const [deblocages, remboursements] = await Promise.all([
      db
        .select({
          id: deblocagePsla.id,
          numero: deblocagePsla.numero,
          montant: deblocagePsla.montant,
          dateDemande: deblocagePsla.dateDemande,
          dateVersement: deblocagePsla.dateVersement,
          commentaire: deblocagePsla.commentaire,
        })
        .from(deblocagePsla)
        .where(eq(deblocagePsla.financementId, data.financementId))
        .orderBy(asc(deblocagePsla.numero), asc(deblocagePsla.id)),
      db
        .select({
          id: remboursementAnticipe.id,
          numero: remboursementAnticipe.numero,
          montant: remboursementAnticipe.montant,
          date: remboursementAnticipe.date,
          nbLogt: remboursementAnticipe.nbLogt,
          commentaire: remboursementAnticipe.commentaire,
        })
        .from(remboursementAnticipe)
        .where(eq(remboursementAnticipe.financementId, data.financementId))
        .orderBy(asc(remboursementAnticipe.numero), asc(remboursementAnticipe.id)),
    ])
    return { deblocages, remboursements }
  })

// Onglet GFA : garanties de la tranche (admin + conditions financières)
export const getGfaFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: gfa.id,
        surOpe: gfa.surOpe,
        banque: banque.libelle,
        estIntrinseque: gfa.estIntrinseque,
        dateValidation: gfa.dateValidation,
        commentaires: gfa.commentaires,
        dateDossier: gfa.dateDossier,
        dateAccord: gfa.dateAccord,
        dateAttestation: gfa.dateAttestation,
        apportPromoteur: gfa.apportPromoteur,
        statutApportPromoteur: statutApportPromoteurGfa.libelle,
        actionFinDate: gfa.actionFinDate,
        actionFinType: actionFinGfaType.libelle,
        finGfa: gfa.finGfa,
        fondsGarantieMontant: gfa.fondsGarantieMontant,
        fondsGarantieDateDemandeRemb: gfa.fondsGarantieDateDemandeRemb,
        fondsGarantieDateRemb: gfa.fondsGarantieDateRemb,
        partSocialeMontant: gfa.partSocialeMontant,
        partSocialeDateDemandeRemb: gfa.partSocialeDateDemandeRemb,
        partSocialeDateRemb: gfa.partSocialeDateRemb,
        partSocialeCommentaire: gfa.partSocialeCommentaire,
        hfCaution: gfa.hfCaution,
        taux: gfa.taux,
        periodeTaux: periodeTauxGfa.libelle,
        dureeMois: gfa.dureeMois,
        commentaireTaux: gfa.commentaireTaux,
        baseInitiale: gfa.baseInitiale,
        commissionCautionMontant: gfa.commissionCautionMontant,
        datePremierPrlvt: gfa.datePremierPrlvt,
        fraisDossier: gfa.fraisDossier,
        precomPourc: gfa.precomPourc,
        caTtcMin: gfa.caTtcMin,
        commentaireConditions: gfa.commentaireConditions,
      })
      .from(gfa)
      .leftJoin(banque, eq(gfa.banqueId, banque.id))
      .leftJoin(
        statutApportPromoteurGfa,
        eq(gfa.statutApportPromoteurGfaId, statutApportPromoteurGfa.id),
      )
      .leftJoin(actionFinGfaType, eq(gfa.actionFinTypeId, actionFinGfaType.id))
      .leftJoin(periodeTauxGfa, eq(gfa.periodeTauxGfaId, periodeTauxGfa.id))
      .where(eq(gfa.trancheId, data.trancheId))
      .orderBy(asc(gfa.id))
  })

// Réductions de la GFA sélectionnée
export const getReducsGfaFn = createServerFn({ method: 'GET' })
  .validator((data: { gfaId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: reducGfa.id,
        montant: reducGfa.montant,
        dateReduc: reducGfa.dateReduc,
        commentaire: reducGfa.commentaire,
      })
      .from(reducGfa)
      .where(eq(reducGfa.gfaId, data.gfaId))
      .orderBy(asc(reducGfa.dateReduc), asc(reducGfa.id))
  })
