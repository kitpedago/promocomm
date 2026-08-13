// Server functions du module Bilan par SCCV (FEN_TABLE_Bilan) — phase 8.
// Trois saisies annuelles (Stock, CA HT, Résultats) ; l'accordéon IS - Non IS
// est une seconde vue de bilan_resultat (colonnes calculées côté client,
// cf. bilan.helpers.ts). La liste SCCV du volet réutilise getSccvListeFn.
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'

import {
  bilanCaht,
  bilanResultat,
  bilanStock,
  participation,
  structureJuridique,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { anneeInvalide } from '#/lib/bilan.helpers.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

const ASSOCIE_KPI = 1 // KEREDES PROMOTION IMMOBILIERE (DLookup WinDev IDAssocie=1)

export const getBilanFn = createServerFn({ method: 'GET' })
  .validator((d: { sccvId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const [ficheRows, stock, caht, resultats, participationKpiRows] =
      await Promise.all([
        db
          .select({
            id: structureJuridique.id,
            rs: structureJuridique.rs,
            dateLiquidation: structureJuridique.dateLiquidation,
          })
          .from(structureJuridique)
          .where(eq(structureJuridique.id, data.sccvId))
          .limit(1),
        db
          .select()
          .from(bilanStock)
          .where(eq(bilanStock.structureJuridiqueId, data.sccvId))
          .orderBy(asc(bilanStock.annee)),
        db
          .select()
          .from(bilanCaht)
          .where(eq(bilanCaht.structureJuridiqueId, data.sccvId))
          .orderBy(asc(bilanCaht.annee)),
        db
          .select()
          .from(bilanResultat)
          .where(eq(bilanResultat.structureJuridiqueId, data.sccvId))
          .orderBy(asc(bilanResultat.annee)),
        db
          .select({ pourcentage: participation.pourcentage })
          .from(participation)
          .where(
            and(
              eq(participation.structureJuridiqueId, data.sccvId),
              eq(participation.associeId, ASSOCIE_KPI),
            ),
          )
          .limit(1),
      ])
    const fiche = ficheRows.at(0)
    if (!fiche) return null
    return {
      fiche,
      stock,
      caht,
      resultats,
      // « Rappel % KPI actuel » — fraction 0–1, participation vivante de KPI
      pourcKpiActuel: participationKpiRows.at(0)?.pourcentage ?? null,
    }
  })

// --- Stock ---

interface FicheBilanStock {
  id?: number
  structureJuridiqueId: number
  annee: number | null
  stockTotalDebit33a35?: number | null
  stockTotalCredit33a35?: number | null
  stockCredit713300?: number | null
  stockPslaPhaseLocNb?: number | null
  stockPslaPhaseLocCout?: number | null
  stockInvenduNb?: number | null
  stockInvenduCout?: number | null
}

export const saveBilanStockFn = createServerFn({ method: 'POST' })
  .validator((d: FicheBilanStock) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    if (anneeInvalide(data.annee))
      throw new Error('Saisissez une année entre 2001 et 2099.')
    const valeurs = {
      structureJuridiqueId: data.structureJuridiqueId,
      annee: data.annee,
      stockTotalDebit33a35: data.stockTotalDebit33a35 ?? null,
      stockTotalCredit33a35: data.stockTotalCredit33a35 ?? null,
      stockCredit713300: data.stockCredit713300 ?? null,
      stockPslaPhaseLocNb: data.stockPslaPhaseLocNb ?? null,
      stockPslaPhaseLocCout: data.stockPslaPhaseLocCout ?? null,
      stockInvenduNb: data.stockInvenduNb ?? null,
      stockInvenduCout: data.stockInvenduCout ?? null,
    }
    if (data.id) {
      const touchees = await db
        .update(bilanStock)
        .set(valeurs)
        .where(eq(bilanStock.id, data.id))
        .returning({ id: bilanStock.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(bilanStock)
      .values(valeurs)
      .returning({ id: bilanStock.id })
    return { id: cree.id }
  })

export const deleteBilanStockFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(bilanStock).where(eq(bilanStock.id, data.id))
  })

// --- CA HT ---

interface FicheBilanCaht {
  id?: number
  structureJuridiqueId: number
  annee: number | null
  cahtVefa?: number | null
  cahtLvPsla?: number | null
  cahtLoyers?: number | null
  cahtTma?: number | null
  cahtTerrain?: number | null
  cahtAutres?: number | null
  cahtCommentaire?: string | null
  nbLotVefa?: number | null
  nbLotLvPsla?: number | null
  nbLotAutre?: number | null
  nbLotCommentaire?: string | null
}

export const saveBilanCahtFn = createServerFn({ method: 'POST' })
  .validator((d: FicheBilanCaht) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    if (anneeInvalide(data.annee))
      throw new Error('Saisissez une année entre 2001 et 2099.')
    const valeurs = {
      structureJuridiqueId: data.structureJuridiqueId,
      annee: data.annee,
      cahtVefa: data.cahtVefa ?? null,
      cahtLvPsla: data.cahtLvPsla ?? null,
      cahtLoyers: data.cahtLoyers ?? null,
      cahtTma: data.cahtTma ?? null,
      cahtTerrain: data.cahtTerrain ?? null,
      cahtAutres: data.cahtAutres ?? null,
      cahtCommentaire: data.cahtCommentaire || null,
      nbLotVefa: data.nbLotVefa ?? null,
      nbLotLvPsla: data.nbLotLvPsla ?? null,
      nbLotAutre: data.nbLotAutre ?? null,
      nbLotCommentaire: data.nbLotCommentaire || null,
    }
    if (data.id) {
      const touchees = await db
        .update(bilanCaht)
        .set(valeurs)
        .where(eq(bilanCaht.id, data.id))
        .returning({ id: bilanCaht.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(bilanCaht)
      .values(valeurs)
      .returning({ id: bilanCaht.id })
    return { id: cree.id }
  })

export const deleteBilanCahtFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(bilanCaht).where(eq(bilanCaht.id, data.id))
  })

// --- Résultats (mêmes lignes pour l'accordéon IS - Non IS) ---

interface FicheBilanResultat {
  id?: number
  structureJuridiqueId: number
  annee: number | null
  resultCptaSccvTotal?: number | null
  ranSccv?: number | null
  cpteCourantSccv?: number | null
  datePvag?: string | null
  resultAcompteMontant?: number | null
  resultAcompteDateVersement?: string | null
  reintegrationFiscaleSccv?: number | null
  deductionFiscaleSccv?: number | null
  reintegrationFiscaleComm?: string | null
  deductionFiscaleComm?: string | null
  pourcHfAnnee?: number | null // fraction 0–1 (l'UI convertit depuis %)
  commentairePourcHf?: string | null
  resultFiscaSccvIs?: number | null
  resultFiscaSccvNonIs?: number | null
  ranSccvIs?: number | null
  ranSccvNonIs?: number | null
  ranSccvTotal?: number | null
  quotePartHfRanIs?: number | null
  quotePartHfRanNonIs?: number | null
  quotePartHfRanTotal?: number | null
}

export const saveBilanResultatFn = createServerFn({ method: 'POST' })
  .validator((d: FicheBilanResultat) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    if (anneeInvalide(data.annee))
      throw new Error('Saisissez une année entre 2001 et 2099.')
    const valeurs = {
      structureJuridiqueId: data.structureJuridiqueId,
      annee: data.annee,
      resultCptaSccvTotal: data.resultCptaSccvTotal ?? null,
      ranSccv: data.ranSccv ?? null,
      cpteCourantSccv: data.cpteCourantSccv ?? null,
      datePvag: versDate(data.datePvag),
      resultAcompteMontant: data.resultAcompteMontant ?? null,
      resultAcompteDateVersement: versDate(data.resultAcompteDateVersement),
      reintegrationFiscaleSccv: data.reintegrationFiscaleSccv ?? null,
      deductionFiscaleSccv: data.deductionFiscaleSccv ?? null,
      reintegrationFiscaleComm: data.reintegrationFiscaleComm || null,
      deductionFiscaleComm: data.deductionFiscaleComm || null,
      pourcHfAnnee: data.pourcHfAnnee ?? null,
      commentairePourcHf: data.commentairePourcHf || null,
      resultFiscaSccvIs: data.resultFiscaSccvIs ?? null,
      resultFiscaSccvNonIs: data.resultFiscaSccvNonIs ?? null,
      ranSccvIs: data.ranSccvIs ?? null,
      ranSccvNonIs: data.ranSccvNonIs ?? null,
      ranSccvTotal: data.ranSccvTotal ?? null,
      quotePartHfRanIs: data.quotePartHfRanIs ?? null,
      quotePartHfRanNonIs: data.quotePartHfRanNonIs ?? null,
      quotePartHfRanTotal: data.quotePartHfRanTotal ?? null,
    }
    if (data.id) {
      const touchees = await db
        .update(bilanResultat)
        .set(valeurs)
        .where(eq(bilanResultat.id, data.id))
        .returning({ id: bilanResultat.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(bilanResultat)
      .values(valeurs)
      .returning({ id: bilanResultat.id })
    return { id: cree.id }
  })

export const deleteBilanResultatFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(bilanResultat).where(eq(bilanResultat.id, data.id))
  })
