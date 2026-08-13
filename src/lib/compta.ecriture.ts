// Écriture du module Compta & Finances (phase 6) : CRUD des subventions et
// déblocages, frais financiers, financements, PSLA (+ déblocages),
// remboursements anticipés, GFA (+ réductions). Le module n'est visible que
// des services Comptabilité et Administrateur (pas de droits fins dans la
// table legacy Droit pour ces contrôles) : requireEcriture suffit.
import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'

import {
  actionAlerte,
  actionFinGfaType,
  banque,
  banqueActionType,
  categorieFrais,
  categorieSubvention,
  deblocagePsla,
  deblocageSubvention,
  financement,
  finPret,
  fraisFinancier,
  garantieEmpruntActionType,
  gfa,
  indexTaux,
  mandatHypothequer,
  organismeAgrement,
  organismeGarantieEmprunt,
  organismeSubvention,
  periodeTauxGfa,
  psla,
  reducGfa,
  remboursementAnticipe,
  statutApport,
  statutApportPromoteurGfa,
  statutCoutMandat,
  statutPartSociale,
  subvention,
  typeFinancement,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// Nomenclatures des modales du module (une seule requête groupée, mise en
// cache côté client)
export const getComptaNomenclaturesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireSession()
  const [
    categoriesSubvention,
    organismesSubvention,
    categoriesFrais,
    banques,
    typesFinancement,
    finsPret,
    indexTauxListe,
    actionsAlerte,
    statutsPartSociale,
    statutsApport,
    mandatsHypothequer,
    statutsCoutMandat,
    organismesAgrement,
    organismesGarantie,
    periodesTauxGfa,
    actionsFinGfa,
    statutsApportPromoteur,
    actionsBanque,
    actionsGarantieEmprunt,
  ] = await Promise.all([
    db
      .select()
      .from(categorieSubvention)
      .orderBy(asc(categorieSubvention.libelle)),
    db
      .select()
      .from(organismeSubvention)
      .orderBy(asc(organismeSubvention.libelle)),
    db
      .select({ id: categorieFrais.id, libelle: categorieFrais.libelle })
      .from(categorieFrais)
      .orderBy(asc(categorieFrais.ordre)),
    db
      .select({ id: banque.id, libelle: banque.libelle })
      .from(banque)
      .orderBy(asc(banque.libelle)),
    db
      .select({ id: typeFinancement.id, libelle: typeFinancement.libelle })
      .from(typeFinancement)
      .orderBy(asc(typeFinancement.libelle)),
    db.select().from(finPret).orderBy(asc(finPret.libelle)),
    db.select().from(indexTaux).orderBy(asc(indexTaux.libelle)),
    db.select().from(actionAlerte).orderBy(asc(actionAlerte.libelle)),
    db.select().from(statutPartSociale).orderBy(asc(statutPartSociale.libelle)),
    db.select().from(statutApport).orderBy(asc(statutApport.libelle)),
    db.select().from(mandatHypothequer).orderBy(asc(mandatHypothequer.libelle)),
    db.select().from(statutCoutMandat).orderBy(asc(statutCoutMandat.libelle)),
    db.select().from(organismeAgrement).orderBy(asc(organismeAgrement.libelle)),
    db
      .select()
      .from(organismeGarantieEmprunt)
      .orderBy(asc(organismeGarantieEmprunt.libelle)),
    db.select().from(periodeTauxGfa).orderBy(asc(periodeTauxGfa.libelle)),
    db.select().from(actionFinGfaType).orderBy(asc(actionFinGfaType.libelle)),
    db
      .select()
      .from(statutApportPromoteurGfa)
      .orderBy(asc(statutApportPromoteurGfa.libelle)),
    db.select().from(banqueActionType).orderBy(asc(banqueActionType.libelle)),
    db
      .select()
      .from(garantieEmpruntActionType)
      .orderBy(asc(garantieEmpruntActionType.libelle)),
  ])
  return {
    categoriesSubvention,
    organismesSubvention,
    categoriesFrais,
    banques,
    typesFinancement,
    finsPret,
    indexTauxListe,
    actionsAlerte,
    statutsPartSociale,
    statutsApport,
    mandatsHypothequer,
    statutsCoutMandat,
    organismesAgrement,
    organismesGarantie,
    periodesTauxGfa,
    actionsFinGfa,
    statutsApportPromoteur,
    actionsBanque,
    actionsGarantieEmprunt,
  }
})

// upsert générique : update si id, insert sinon (toutes les tables du module
// ont une PK `id` identity)
async function upsert(
  table: any,
  data: { id?: number },
  valeurs: Record<string, unknown>,
) {
  if (data.id) {
    const touchees = await db
      .update(table)
      .set(valeurs)
      .where(eq(table.id, data.id))
      .returning({ id: table.id })
    if (touchees.length === 0) throw new Error('Ligne introuvable')
    return { id: data.id }
  }
  const [cree] = await db
    .insert(table)
    .values(valeurs)
    .returning({ id: table.id })
  return { id: cree.id as number }
}

// --- Subventions et déblocages ---

interface FicheSubvention {
  id?: number
  trancheId: number
  categorieId?: number | null
  organismeId?: number | null
  numConvention?: string | null
  dateConvention?: string | null
  dateCaducite?: string | null
  montantAgrement?: number | null
  montantProvisoire?: number | null
  montantDefinitif?: number | null
  budgetPreviMontant?: number | null
  budgetPreviCommentaire?: string | null
  finDeSuivi?: boolean | null
  commentaire?: string | null
}

export const saveSubventionFn = createServerFn({ method: 'POST' })
  .validator((d: FicheSubvention) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(subvention, data, {
      trancheId: data.trancheId,
      categorieId: data.categorieId ?? null,
      organismeId: data.organismeId ?? null,
      numConvention: data.numConvention || null,
      dateConvention: versDate(data.dateConvention),
      dateCaducite: versDate(data.dateCaducite),
      montantAgrement: data.montantAgrement ?? null,
      montantProvisoire: data.montantProvisoire ?? null,
      montantDefinitif: data.montantDefinitif ?? null,
      budgetPreviMontant: data.budgetPreviMontant ?? null,
      budgetPreviCommentaire: data.budgetPreviCommentaire || null,
      finDeSuivi: data.finDeSuivi ?? null,
      commentaire: data.commentaire || null,
    })
  })

export const deleteSubventionFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    // les déblocages liés suivent (iso-WinDev : suppression en cascade)
    await db
      .delete(deblocageSubvention)
      .where(eq(deblocageSubvention.subventionId, data.id))
    await db.delete(subvention).where(eq(subvention.id, data.id))
  })

interface FicheDeblocageSubvention {
  id?: number
  subventionId: number
  dateDemande?: string | null
  montant?: number | null
  datePaiement?: string | null
  commentaire?: string | null
}

export const saveDeblocageSubventionFn = createServerFn({ method: 'POST' })
  .validator((d: FicheDeblocageSubvention) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(deblocageSubvention, data, {
      subventionId: data.subventionId,
      dateDemande: versDate(data.dateDemande),
      montant: data.montant ?? null,
      datePaiement: versDate(data.datePaiement),
      commentaire: data.commentaire || null,
    })
  })

export const deleteDeblocageSubventionFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db
      .delete(deblocageSubvention)
      .where(eq(deblocageSubvention.id, data.id))
  })

// --- Frais financiers (suivi détaillé) ---

interface FicheFrais {
  id?: number
  trancheId: number
  categorieFraisId?: number | null
  budgetMontant?: number | null
  actuaMontant?: number | null
  consommeMontant?: number | null
  reelMontant?: number | null
  ordre?: number | null
}

export const saveFraisFn = createServerFn({ method: 'POST' })
  .validator((d: FicheFrais) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(fraisFinancier, data, {
      trancheId: data.trancheId,
      categorieFraisId: data.categorieFraisId ?? null,
      budgetMontant: data.budgetMontant ?? null,
      actuaMontant: data.actuaMontant ?? null,
      consommeMontant: data.consommeMontant ?? null,
      reelMontant: data.reelMontant ?? null,
      ordre: data.ordre ?? null,
    })
  })

export const deleteFraisFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(fraisFinancier).where(eq(fraisFinancier.id, data.id))
  })

// --- Financements ---

interface FicheFinancement {
  id?: number
  trancheId: number
  typeFinancementId?: number | null
  banqueId?: number | null
  surOpe?: boolean | null
  montantFinancement?: number | null
  montantPrevi?: number | null
  infosPretPrevi?: string | null
  dateEnvoiDossier?: string | null
  dateSignature?: string | null
  dateButoir?: string | null
  actionAlerteId?: number | null
  dateDebutMobilisation?: string | null
  dateFinMobilisation?: string | null
  dureeMoisMobPsla?: number | null
  finPretId?: number | null
  indexTauxId?: number | null
  indexTauxFloore?: boolean | null
  margeBanque?: number | null
  tauxPret?: number | null
  periodicite?: string | null
  commissionEngagementPourc?: number | null
  fraisDossier?: number | null
  estPrlvFraisDossier?: boolean | null
  estPhaseAmortissement?: boolean | null
  estSolde?: boolean | null
  numContrat?: string | null
  partSocialeMontant?: number | null
  statutPartSocialeId?: number | null
  dateStatutPartSociale?: string | null
  apportPromoteur?: number | null
  statutApportId?: number | null
  blocageHonoOcMontant?: number | null
  blocageHonoOcFin?: string | null
  blocageHonoOcComment?: string | null
  estHfCautionOc?: boolean | null
  mandatHypothequerId?: number | null
  mandatCoutMontant?: number | null
  statutCoutMandatId?: number | null
  prevMtOc?: number | null
  contratMontant?: number | null
  contratNbLogt?: number | null
  dateDebutEcheance?: string | null
  dateFinEcheance?: string | null
  montantEcheance?: number | null
  dateVerstPret?: string | null
  estAmortDiffere?: boolean | null
  amortissementDiffereDuree?: number | null
  amortissementDiffereFinDate?: string | null
  commentaire?: string | null
}

export const saveFinancementFn = createServerFn({ method: 'POST' })
  .validator((d: FicheFinancement) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(financement, data, {
      trancheId: data.trancheId,
      typeFinancementId: data.typeFinancementId ?? null,
      banqueId: data.banqueId ?? null,
      surOpe: data.surOpe ?? null,
      montantFinancement: data.montantFinancement ?? null,
      montantPrevi: data.montantPrevi ?? null,
      infosPretPrevi: data.infosPretPrevi || null,
      dateEnvoiDossier: versDate(data.dateEnvoiDossier),
      dateSignature: versDate(data.dateSignature),
      dateButoir: versDate(data.dateButoir),
      actionAlerteId: data.actionAlerteId ?? null,
      dateDebutMobilisation: versDate(data.dateDebutMobilisation),
      dateFinMobilisation: versDate(data.dateFinMobilisation),
      dureeMoisMobPsla: data.dureeMoisMobPsla ?? null,
      finPretId: data.finPretId ?? null,
      indexTauxId: data.indexTauxId ?? null,
      indexTauxFloore: data.indexTauxFloore ?? null,
      margeBanque: data.margeBanque ?? null,
      tauxPret: data.tauxPret ?? null,
      periodicite: data.periodicite || null,
      commissionEngagementPourc: data.commissionEngagementPourc ?? null,
      fraisDossier: data.fraisDossier ?? null,
      estPrlvFraisDossier: data.estPrlvFraisDossier ?? null,
      estPhaseAmortissement: data.estPhaseAmortissement ?? null,
      estSolde: data.estSolde ?? null,
      numContrat: data.numContrat || null,
      partSocialeMontant: data.partSocialeMontant ?? null,
      statutPartSocialeId: data.statutPartSocialeId ?? null,
      dateStatutPartSociale: versDate(data.dateStatutPartSociale),
      apportPromoteur: data.apportPromoteur ?? null,
      statutApportId: data.statutApportId ?? null,
      blocageHonoOcMontant: data.blocageHonoOcMontant ?? null,
      blocageHonoOcFin: versDate(data.blocageHonoOcFin),
      blocageHonoOcComment: data.blocageHonoOcComment || null,
      estHfCautionOc: data.estHfCautionOc ?? null,
      mandatHypothequerId: data.mandatHypothequerId ?? null,
      mandatCoutMontant: data.mandatCoutMontant ?? null,
      statutCoutMandatId: data.statutCoutMandatId ?? null,
      prevMtOc: data.prevMtOc ?? null,
      contratMontant: data.contratMontant ?? null,
      contratNbLogt: data.contratNbLogt ?? null,
      dateDebutEcheance: versDate(data.dateDebutEcheance),
      dateFinEcheance: versDate(data.dateFinEcheance),
      montantEcheance: data.montantEcheance ?? null,
      dateVerstPret: versDate(data.dateVerstPret),
      estAmortDiffere: data.estAmortDiffere ?? null,
      amortissementDiffereDuree: data.amortissementDiffereDuree ?? null,
      amortissementDiffereFinDate: versDate(data.amortissementDiffereFinDate),
      commentaire: data.commentaire || null,
    })
  })

export const deleteFinancementFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    // mouvements liés d'abord (déblocages PSLA, remboursements anticipés)
    await db
      .delete(deblocagePsla)
      .where(eq(deblocagePsla.financementId, data.id))
    await db
      .delete(remboursementAnticipe)
      .where(eq(remboursementAnticipe.financementId, data.id))
    await db.delete(financement).where(eq(financement.id, data.id))
  })

// --- PSLA (admin + contrats) ---

interface FichePsla {
  id?: number
  trancheId: number
  estimPsla?: number | null
  montantPsla?: number | null
  coutTotal?: number | null
  nbLogtAgrement?: number | null
  numAgrement?: string | null
  dateAgrementProvisoire?: string | null
  dureeAnneePsla?: number | null
  organismeAgrementId?: number | null
  previAgrement?: string | null
  dateDepotDossierAgrement?: string | null
  dateReceptionAgrement?: string | null
  dateDecisionAgrement?: string | null
  dateConventionEngagementReciproque?: string | null
  cffFiClient?: string | null
  banqueOperateurId?: number | null
  banqueOperateurDate?: string | null
  banqueClientId?: number | null
  banqueClientDate?: string | null
  organismeGarantieEmpruntId?: number | null
  dateDeliberationGarantie?: string | null
  numBureauGarantie?: string | null
  numConventionGarantie?: string | null
  dateSignatureGarant?: string | null
  garantieEmpruntActionDate?: string | null
  garantieEmpruntActionTypeId?: number | null
  banqueActionDate?: string | null
  banqueActionTypeId?: number | null
  dateInfoAnnuelle?: string | null
  dateInfoFin?: string | null
  finSuivi?: boolean | null
  commentaire?: string | null
  commentaires?: string | null
}

export const savePslaFn = createServerFn({ method: 'POST' })
  .validator((d: FichePsla) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(psla, data, {
      trancheId: data.trancheId,
      estimPsla: data.estimPsla ?? null,
      montantPsla: data.montantPsla ?? null,
      coutTotal: data.coutTotal ?? null,
      nbLogtAgrement: data.nbLogtAgrement ?? null,
      numAgrement: data.numAgrement || null,
      dateAgrementProvisoire: versDate(data.dateAgrementProvisoire),
      dureeAnneePsla: data.dureeAnneePsla ?? null,
      organismeAgrementId: data.organismeAgrementId ?? null,
      previAgrement: versDate(data.previAgrement),
      dateDepotDossierAgrement: versDate(data.dateDepotDossierAgrement),
      dateReceptionAgrement: versDate(data.dateReceptionAgrement),
      dateDecisionAgrement: versDate(data.dateDecisionAgrement),
      dateConventionEngagementReciproque: versDate(
        data.dateConventionEngagementReciproque,
      ),
      cffFiClient: versDate(data.cffFiClient),
      banqueOperateurId: data.banqueOperateurId ?? null,
      banqueOperateurDate: versDate(data.banqueOperateurDate),
      banqueClientId: data.banqueClientId ?? null,
      banqueClientDate: versDate(data.banqueClientDate),
      organismeGarantieEmpruntId: data.organismeGarantieEmpruntId ?? null,
      dateDeliberationGarantie: versDate(data.dateDeliberationGarantie),
      numBureauGarantie: data.numBureauGarantie || null,
      numConventionGarantie: data.numConventionGarantie || null,
      dateSignatureGarant: versDate(data.dateSignatureGarant),
      garantieEmpruntActionDate: versDate(data.garantieEmpruntActionDate),
      garantieEmpruntActionTypeId: data.garantieEmpruntActionTypeId ?? null,
      banqueActionDate: versDate(data.banqueActionDate),
      banqueActionTypeId: data.banqueActionTypeId ?? null,
      dateInfoAnnuelle: versDate(data.dateInfoAnnuelle),
      dateInfoFin: versDate(data.dateInfoFin),
      finSuivi: data.finSuivi ?? null,
      commentaire: data.commentaire || null,
      commentaires: data.commentaires || null,
    })
  })

export const deletePslaFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(deblocagePsla).where(eq(deblocagePsla.pslaId, data.id))
    await db.delete(psla).where(eq(psla.id, data.id))
  })

// --- Déblocages PSLA et remboursements anticipés (mouvements d'un financement) ---

interface FicheDeblocagePsla {
  id?: number
  financementId: number
  pslaId?: number | null
  numero?: number | null
  montant?: number | null
  dateDemande?: string | null
  dateVersement?: string | null
  commentaire?: string | null
}

export const saveDeblocagePslaFn = createServerFn({ method: 'POST' })
  .validator((d: FicheDeblocagePsla) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(deblocagePsla, data, {
      financementId: data.financementId,
      pslaId: data.pslaId ?? null,
      numero: data.numero ?? null,
      montant: data.montant ?? null,
      dateDemande: versDate(data.dateDemande),
      dateVersement: versDate(data.dateVersement),
      commentaire: data.commentaire || null,
    })
  })

export const deleteDeblocagePslaFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(deblocagePsla).where(eq(deblocagePsla.id, data.id))
  })

interface FicheRemboursement {
  id?: number
  financementId: number
  numero?: number | null
  montant?: number | null
  date?: string | null
  nbLogt?: number | null
  commentaire?: string | null
}

export const saveRemboursementFn = createServerFn({ method: 'POST' })
  .validator((d: FicheRemboursement) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(remboursementAnticipe, data, {
      financementId: data.financementId,
      numero: data.numero ?? null,
      montant: data.montant ?? null,
      date: versDate(data.date),
      nbLogt: data.nbLogt ?? null,
      commentaire: data.commentaire || null,
    })
  })

export const deleteRemboursementFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db
      .delete(remboursementAnticipe)
      .where(eq(remboursementAnticipe.id, data.id))
  })

// --- GFA (admin + conditions) et réductions ---

interface FicheGfa {
  id?: number
  trancheId: number
  surOpe?: boolean | null
  banqueId?: number | null
  estIntrinseque?: boolean | null
  dateValidation?: string | null
  dateDossier?: string | null
  dateAccord?: string | null
  dateAttestation?: string | null
  apportPromoteur?: number | null
  statutApportPromoteurGfaId?: number | null
  actionFinDate?: string | null
  actionFinTypeId?: number | null
  finGfa?: boolean | null
  fondsGarantieMontant?: number | null
  fondsGarantieDateDemandeRemb?: string | null
  fondsGarantieDateRemb?: string | null
  partSocialeMontant?: number | null
  partSocialeDateDemandeRemb?: string | null
  partSocialeDateRemb?: string | null
  partSocialeCommentaire?: string | null
  hfCaution?: boolean | null
  taux?: number | null
  periodeTauxGfaId?: number | null
  dureeMois?: number | null
  commentaireTaux?: string | null
  baseInitiale?: number | null
  commissionCautionMontant?: number | null
  datePremierPrlvt?: string | null
  fraisDossier?: number | null
  precomPourc?: number | null
  caTtcMin?: number | null
  commentaireConditions?: string | null
  commentaires?: string | null
}

export const saveGfaFn = createServerFn({ method: 'POST' })
  .validator((d: FicheGfa) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(gfa, data, {
      trancheId: data.trancheId,
      surOpe: data.surOpe ?? null,
      banqueId: data.banqueId ?? null,
      estIntrinseque: data.estIntrinseque ?? null,
      dateValidation: versDate(data.dateValidation),
      dateDossier: versDate(data.dateDossier),
      dateAccord: versDate(data.dateAccord),
      dateAttestation: versDate(data.dateAttestation),
      apportPromoteur: data.apportPromoteur ?? null,
      statutApportPromoteurGfaId: data.statutApportPromoteurGfaId ?? null,
      actionFinDate: versDate(data.actionFinDate),
      actionFinTypeId: data.actionFinTypeId ?? null,
      finGfa: data.finGfa ?? null,
      fondsGarantieMontant: data.fondsGarantieMontant ?? null,
      fondsGarantieDateDemandeRemb: versDate(data.fondsGarantieDateDemandeRemb),
      fondsGarantieDateRemb: versDate(data.fondsGarantieDateRemb),
      partSocialeMontant: data.partSocialeMontant ?? null,
      partSocialeDateDemandeRemb: versDate(data.partSocialeDateDemandeRemb),
      partSocialeDateRemb: versDate(data.partSocialeDateRemb),
      partSocialeCommentaire: data.partSocialeCommentaire || null,
      hfCaution: data.hfCaution ?? null,
      taux: data.taux ?? null,
      periodeTauxGfaId: data.periodeTauxGfaId ?? null,
      dureeMois: data.dureeMois ?? null,
      commentaireTaux: data.commentaireTaux || null,
      baseInitiale: data.baseInitiale ?? null,
      commissionCautionMontant: data.commissionCautionMontant ?? null,
      datePremierPrlvt: versDate(data.datePremierPrlvt),
      fraisDossier: data.fraisDossier ?? null,
      precomPourc: data.precomPourc ?? null,
      caTtcMin: data.caTtcMin ?? null,
      commentaireConditions: data.commentaireConditions || null,
      commentaires: data.commentaires || null,
    })
  })

export const deleteGfaFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(reducGfa).where(eq(reducGfa.gfaId, data.id))
    await db.delete(gfa).where(eq(gfa.id, data.id))
  })

interface FicheReducGfa {
  id?: number
  gfaId: number
  montant?: number | null
  dateReduc?: string | null
  commentaire?: string | null
}

export const saveReducGfaFn = createServerFn({ method: 'POST' })
  .validator((d: FicheReducGfa) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(reducGfa, data, {
      gfaId: data.gfaId,
      montant: data.montant ?? null,
      dateReduc: versDate(data.dateReduc),
      commentaire: data.commentaire || null,
    })
  })

export const deleteReducGfaFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(reducGfa).where(eq(reducGfa.id, data.id))
  })
