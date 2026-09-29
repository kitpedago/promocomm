// Cycle de vie d'une tranche : ce que WinDev faisait par trigger
// (COL_Trigger.wdg, Tranche_Ajout) à la création, et son pendant à la
// suppression.
import { and, asc, eq, isNull } from 'drizzle-orm'

import {
  categorieFrais,
  fraisFinancier,
  listeAvancement,
  stadeAvancement,
  tranche,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'

// Nouvelle tranche : ses stades d'avancement (ceux marqués « Inclure à la
// création d'une tranche », dans l'ordre de la liste) — la base du planning —
// et une ligne de suivi des frais par catégorie.
export async function initialiserTranche(trancheId: number) {
  const stades = await db
    .select({ id: listeAvancement.id, ordre: listeAvancement.ordre })
    .from(listeAvancement)
    .where(eq(listeAvancement.inclureQuandCreationTranche, true))
    .orderBy(asc(listeAvancement.ordre))
  if (stades.length > 0)
    await db.insert(stadeAvancement).values(
      stades.map((s) => ({
        trancheId,
        listeAvancementId: s.id,
        ordre: s.ordre,
      })),
    )
  const categories = await db
    .select({ id: categorieFrais.id })
    .from(categorieFrais)
  if (categories.length > 0)
    await db
      .insert(fraisFinancier)
      .values(categories.map((c) => ({ trancheId, categorieFraisId: c.id })))
  return { stades: stades.length, frais: categories.length }
}

// Les stades et frais créés d'office partent avec la tranche tant qu'ils sont
// vierges. Tout le reste (stade daté, frais chiffrés, lots, subventions…)
// bloque toujours la suppression par sa clé étrangère, et la transaction
// annule alors l'ensemble.
export async function supprimerTranche(trancheId: number) {
  await db.transaction(async (tx) => {
    await tx
      .delete(stadeAvancement)
      .where(
        and(
          eq(stadeAvancement.trancheId, trancheId),
          isNull(stadeAvancement.datePreviComptaDebutAnnee),
          isNull(stadeAvancement.datePreviMajPromo),
          isNull(stadeAvancement.dateReelle),
          isNull(stadeAvancement.commentaire),
        ),
      )
    await tx
      .delete(fraisFinancier)
      .where(
        and(
          eq(fraisFinancier.trancheId, trancheId),
          isNull(fraisFinancier.budgetMontant),
          isNull(fraisFinancier.actuaMontant),
          isNull(fraisFinancier.consommeMontant),
          isNull(fraisFinancier.reelMontant),
        ),
      )
    await tx.delete(tranche).where(eq(tranche.id, trancheId))
  })
}
