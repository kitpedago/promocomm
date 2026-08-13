// Server functions du module Déclarations (FEN_Declaration) — phase 8.
// Trois saisies par tranche : Assurance DO/MRH, SGA, Déclaration 940 & LASM.
// Le volet Opérations et le sélecteur de tranche réutilisent le module
// Commercialisation (pattern compta.tsx).
import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'

import {
  accordCadreAssurance,
  assuranceDoMrh,
  declaration940,
  listeBudget,
  sga,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

export const getDeclarationsFn = createServerFn({ method: 'GET' })
  .validator((d: { trancheId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const [assurances, sgas, declarations940] = await Promise.all([
      db
        .select()
        .from(assuranceDoMrh)
        .where(eq(assuranceDoMrh.trancheId, data.trancheId))
        .orderBy(asc(assuranceDoMrh.dateSouscription)),
      db
        .select({
          id: sga.id,
          trancheId: sga.trancheId,
          numFiche: sga.numFiche,
          estPsla: sga.estPsla,
          dateCreation: sga.dateCreation,
          dateSortie: sga.dateSortie,
          prixTerrainHt: sga.prixTerrainHt,
          prixFraisAnnexeHt: sga.prixFraisAnnexeHt,
          prixRevientBudget: sga.prixRevientBudget,
          prixVenteBudget: sga.prixVenteBudget,
          listeBudgetId: sga.listeBudgetId,
          budget: listeBudget.libelle,
          commentaire: sga.commentaire,
          surfaceUtile: sga.surfaceUtile,
        })
        .from(sga)
        .leftJoin(listeBudget, eq(listeBudget.id, sga.listeBudgetId))
        .where(eq(sga.trancheId, data.trancheId))
        .orderBy(asc(sga.numFiche)),
      db
        .select()
        .from(declaration940)
        .where(eq(declaration940.trancheId, data.trancheId))
        .orderBy(asc(declaration940.date940)),
    ])
    return { assurances, sgas, declarations940 }
  })

// Nomenclatures des modales (accords cadres + budgets)
export const getDeclarationsNomenclaturesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireSession()
  const [accords, budgets] = await Promise.all([
    db
      .select()
      .from(accordCadreAssurance)
      .orderBy(asc(accordCadreAssurance.code)),
    db.select().from(listeBudget).orderBy(asc(listeBudget.libelle)),
  ])
  return { accords, budgets }
})

// --- Assurance DO/MRH ---

interface FicheAssurance {
  id?: number
  trancheId: number
  numContrat?: string | null
  typeContrat?: string | null
  dateSouscription?: string | null
  dateDgd?: string | null
  dateResiliation?: string | null
  dateFinTrc?: string | null
  accordCadre?: string | null
  coutOperation?: number | null
  montantCotisation?: number | null
  commentaire?: string | null
  surOpe?: boolean | null
}

export const saveAssuranceFn = createServerFn({ method: 'POST' })
  .validator((d: FicheAssurance) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      trancheId: data.trancheId,
      numContrat: data.numContrat || null,
      typeContrat: data.typeContrat || null,
      dateSouscription: versDate(data.dateSouscription),
      dateDgd: versDate(data.dateDgd),
      dateResiliation: versDate(data.dateResiliation),
      dateFinTrc: versDate(data.dateFinTrc),
      accordCadre: data.accordCadre || null,
      coutOperation: data.coutOperation ?? null,
      montantCotisation: data.montantCotisation ?? null,
      commentaire: data.commentaire || null,
      surOpe: data.surOpe ?? null,
    }
    if (data.id) {
      const touchees = await db
        .update(assuranceDoMrh)
        .set(valeurs)
        .where(eq(assuranceDoMrh.id, data.id))
        .returning({ id: assuranceDoMrh.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(assuranceDoMrh)
      .values(valeurs)
      .returning({ id: assuranceDoMrh.id })
    return { id: cree.id }
  })

export const deleteAssuranceFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(assuranceDoMrh).where(eq(assuranceDoMrh.id, data.id))
  })

// --- SGA ---

interface FicheSga {
  id?: number
  trancheId: number
  numFiche?: number | null
  estPsla?: boolean | null
  dateCreation?: string | null
  dateSortie?: string | null
  prixTerrainHt?: number | null
  prixFraisAnnexeHt?: number | null
  prixRevientBudget?: number | null
  prixVenteBudget?: number | null
  listeBudgetId?: number | null
  commentaire?: string | null
  surfaceUtile?: number | null
}

export const saveSgaFn = createServerFn({ method: 'POST' })
  .validator((d: FicheSga) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      trancheId: data.trancheId,
      numFiche: data.numFiche ?? null,
      estPsla: data.estPsla ?? null,
      dateCreation: versDate(data.dateCreation),
      dateSortie: versDate(data.dateSortie),
      prixTerrainHt: data.prixTerrainHt ?? null,
      prixFraisAnnexeHt: data.prixFraisAnnexeHt ?? null,
      prixRevientBudget: data.prixRevientBudget ?? null,
      prixVenteBudget: data.prixVenteBudget ?? null,
      listeBudgetId: data.listeBudgetId ?? null,
      commentaire: data.commentaire || null,
      surfaceUtile: data.surfaceUtile ?? null,
    }
    if (data.id) {
      const touchees = await db
        .update(sga)
        .set(valeurs)
        .where(eq(sga.id, data.id))
        .returning({ id: sga.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(sga)
      .values(valeurs)
      .returning({ id: sga.id })
    return { id: cree.id }
  })

export const deleteSgaFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(sga).where(eq(sga.id, data.id))
  })

// --- Déclaration 940 & LASM ---

interface FicheDeclaration940 {
  id?: number
  trancheId: number
  date940?: string | null
  stockLogtDat?: number | null
  dateTvaLasm?: string | null
  surOpe?: boolean | null
  finSuivi?: boolean | null
  commentaires?: string | null
}

export const saveDeclaration940Fn = createServerFn({ method: 'POST' })
  .validator((d: FicheDeclaration940) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      trancheId: data.trancheId,
      date940: versDate(data.date940),
      stockLogtDat: data.stockLogtDat ?? null,
      dateTvaLasm: versDate(data.dateTvaLasm),
      surOpe: data.surOpe ?? null,
      finSuivi: data.finSuivi ?? null,
      commentaires: data.commentaires || null,
    }
    if (data.id) {
      const touchees = await db
        .update(declaration940)
        .set(valeurs)
        .where(eq(declaration940.id, data.id))
        .returning({ id: declaration940.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(declaration940)
      .values(valeurs)
      .returning({ id: declaration940.id })
    return { id: cree.id }
  })

export const deleteDeclaration940Fn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(declaration940).where(eq(declaration940.id, data.id))
  })
