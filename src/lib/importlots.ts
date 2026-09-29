// Import des lots d'une tranche depuis la trame Excel (Paramètres >
// Opérations, tranches et lots — BTN_Importer_Lot de FEN_Param). Le classeur
// est lu dans le navigateur ; le serveur reçoit la matrice des cellules et
// refait toute la validation.
import { createServerFn } from '@tanstack/react-start'
import { count, eq, inArray } from 'drizzle-orm'

import {
  commVendeur,
  commercialisation,
  lot,
  reserve,
  tranche,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { preparerImportLots } from '#/lib/importlots.helpers.ts'
import { requireEcriture } from '#/lib/session.server.ts'

import type { Cellule } from '#/lib/xlsx.ts'

const LIGNES_MAX = 5000
const COLONNES_MAX = 200

function validerMatrice(lignes: unknown): Array<Array<Cellule>> {
  if (!Array.isArray(lignes) || lignes.length > LIGNES_MAX)
    throw new Error(`Trame illisible ou de plus de ${LIGNES_MAX} lignes`)
  for (const l of lignes) {
    if (!Array.isArray(l) || l.length > COLONNES_MAX)
      throw new Error('Trame illisible')
    for (const c of l)
      if (c !== null && typeof c !== 'string' && typeof c !== 'number')
        throw new Error('Trame illisible')
  }
  return lignes as Array<Array<Cellule>>
}

export const importerLotsFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      trancheId: number
      lignes: Array<Array<Cellule>>
      /** confirmé à l'écran : les lots actuels de la tranche sont remplacés */
      remplacer: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireEcriture()
    const { lots, erreurs } = preparerImportLots(validerMatrice(data.lignes))
    if (erreurs.length > 0) throw new Error(erreurs.join('\n'))

    return db.transaction(async (tx) => {
      const cible = await tx
        .select({ id: tranche.id })
        .from(tranche)
        .where(eq(tranche.id, data.trancheId))
      if (cible.length === 0) throw new Error('Tranche introuvable')

      const actuels = (
        await tx
          .select({ id: lot.id })
          .from(lot)
          .where(eq(lot.trancheId, data.trancheId))
      ).map((l) => l.id)
      if (actuels.length > 0) {
        if (!data.remplacer)
          throw new Error(
            `Il y a ${actuels.length} lots dans la tranche : confirmer leur remplacement.`,
          )
        // WinDev supprimait aussi les réservations des lots remplacés ; ici
        // une tranche déjà commercialisée (ou en SAV) n'est pas écrasée
        for (const [table, libelle] of [
          [commercialisation, 'réservation(s)'],
          [reserve, 'réserve(s) SAV'],
          [commVendeur, 'commission(s) vendeur'],
        ] as const) {
          const [{ n }] = await tx
            .select({ n: count() })
            .from(table)
            .where(inArray(table.lotId, actuels))
          if (n > 0)
            throw new Error(
              `Import refusé : les lots actuels de la tranche portent ${n} ${libelle}.`,
            )
        }
        await tx.delete(lot).where(eq(lot.trancheId, data.trancheId))
      }
      await tx
        .insert(lot)
        .values(lots.map((l) => ({ ...l, trancheId: data.trancheId })))
      return { importes: lots.length, remplaces: actuels.length }
    })
  })
