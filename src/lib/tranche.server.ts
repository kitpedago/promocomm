// Cycle de vie d'une tranche : ce que WinDev faisait par trigger
// (COL_Trigger.wdg) — Tranche_Ajout à la création et son pendant à la
// suppression, StadeAvancement_update à chaque écriture d'un stade.
import { and, asc, eq, isNull } from 'drizzle-orm'

import {
  categorieFrais,
  fraisFinancier,
  listeAvancement,
  stadeAvancement,
  tranche,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { cachesStades } from '#/lib/operations.helpers.ts'

// À appeler après toute écriture d'un stade : caches d'avancement des tranches
// touchées (stade COM, situation, stades actuel et prochain). `exec` : la base
// ou la transaction en cours.
export async function recalculerStades(
  exec: Pick<typeof db, 'select' | 'update'>,
  trancheIds: Iterable<number>,
) {
  for (const trancheId of new Set(trancheIds)) {
    const stades = await exec
      .select({
        id: stadeAvancement.id,
        listeAvancementId: listeAvancement.id,
        code: listeAvancement.code,
        avecSuivi: listeAvancement.avecSuivi,
        ordre: stadeAvancement.ordre,
        datePreviMajPromo: stadeAvancement.datePreviMajPromo,
        dateReelle: stadeAvancement.dateReelle,
      })
      .from(stadeAvancement)
      // comme dans WinDev, un jalon sans ligne de liste ne compte pas
      .innerJoin(
        listeAvancement,
        eq(listeAvancement.id, stadeAvancement.listeAvancementId),
      )
      .where(eq(stadeAvancement.trancheId, trancheId))
    await exec
      .update(tranche)
      .set(cachesStades(stades))
      .where(eq(tranche.id, trancheId))
  }
}

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
  await recalculerStades(db, [trancheId])
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
