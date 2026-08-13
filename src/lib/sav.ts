// Server functions du module SAV Promotion (FEN_SAV_Promotion) — phase 5.
// Lots par opération/tranche (fn partagée getLotsCommFn) ; réserves du lot
// sélectionné avec code auto-calculé (NextCodeReserve). Mails et import
// Air-Bat : phase 9.
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, isNull, or } from 'drizzle-orm'

import {
  reserve,
  reserveEntreprise,
  reservePiece,
  reserveType,
  stadeAvancement,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { nextCodeReserve } from '#/lib/sav.helpers.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// Dates Livraison / Réception de la tranche : dates réelles des jalons
// LIV (35) et RECEP (39) — iso-DLookup de FEN_SAV_Promotion
export const getSavTrancheFn = createServerFn({ method: 'GET' })
  .validator((d: { trancheId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const jalon = (listeAvancementId: number) =>
      db
        .select({ dateReelle: stadeAvancement.dateReelle })
        .from(stadeAvancement)
        .where(
          and(
            eq(stadeAvancement.trancheId, data.trancheId),
            eq(stadeAvancement.listeAvancementId, listeAvancementId),
          ),
        )
    const [livraison, reception] = await Promise.all([jalon(35), jalon(39)])
    return {
      livraison: livraison[0]?.dateReelle ?? null,
      reception: reception[0]?.dateReelle ?? null,
    }
  })

export const getReservesFn = createServerFn({ method: 'GET' })
  .validator((d: { lotId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: reserve.id,
        lotId: reserve.lotId,
        code: reserve.code,
        typeId: reserve.typeId,
        type: reserveType.libelle,
        travauxEffectues: reserve.travauxEffectues,
        reserve: reserve.reserve,
        pieceId: reserve.pieceId,
        piece: reservePiece.libelle,
        entrepriseId: reserve.entrepriseId,
        entreprise: reserveEntreprise.rs,
        dateReclamation: reserve.dateReclamation,
        dateIntervention: reserve.dateIntervention,
        envoyerMail: reserve.envoyerMail,
        envoyerMailDate: reserve.envoyerMailDate,
        estVerrouille: reserve.estVerrouille,
      })
      .from(reserve)
      .leftJoin(reserveType, eq(reserveType.id, reserve.typeId))
      .leftJoin(reservePiece, eq(reservePiece.id, reserve.pieceId))
      .leftJoin(
        reserveEntreprise,
        eq(reserveEntreprise.id, reserve.entrepriseId),
      )
      .where(eq(reserve.lotId, data.lotId))
      .orderBy(asc(reserve.code), asc(reserve.id))
  })

// Nomenclatures des modales + prochain code proposé pour le lot
export const getSavNomenclaturesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireSession()
  const [types, pieces, entreprises] = await Promise.all([
    db.select().from(reserveType).orderBy(asc(reserveType.libelle)),
    db.select().from(reservePiece).orderBy(asc(reservePiece.libelle)),
    db
      .select({ id: reserveEntreprise.id, libelle: reserveEntreprise.rs })
      .from(reserveEntreprise)
      .orderBy(asc(reserveEntreprise.rs)),
  ])
  return { types, pieces, entreprises }
})

export const getProchainCodeFn = createServerFn({ method: 'GET' })
  .validator((d: { lotId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const codes = await db
      .select({ code: reserve.code })
      .from(reserve)
      .where(eq(reserve.lotId, data.lotId))
    return { code: nextCodeReserve(codes.map((c) => c.code)) }
  })

interface FicheReserve {
  id?: number
  lotId: number
  code?: string | null
  typeId?: number | null
  pieceId?: number | null
  entrepriseId?: number | null
  travauxEffectues?: boolean | null
  reserve?: string | null
  dateReclamation?: string | null
  dateIntervention?: string | null
  envoyerMail?: boolean | null
}

export const saveReserveFn = createServerFn({ method: 'POST' })
  .validator((d: FicheReserve) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      lotId: data.lotId,
      code: data.code || null,
      typeId: data.typeId ?? null,
      pieceId: data.pieceId ?? null,
      entrepriseId: data.entrepriseId ?? null,
      travauxEffectues: data.travauxEffectues ?? null,
      reserve: data.reserve || null,
      dateReclamation: versDate(data.dateReclamation),
      dateIntervention: versDate(data.dateIntervention),
      envoyerMail: data.envoyerMail ?? null,
    }
    if (data.id) {
      // une ligne verrouillée par l'import Air-Bat ne se modifie pas (iso-WinDev)
      const touchees = await db
        .update(reserve)
        .set(valeurs)
        .where(
          and(
            eq(reserve.id, data.id),
            or(isNull(reserve.estVerrouille), eq(reserve.estVerrouille, false)),
          ),
        )
        .returning({ id: reserve.id })
      if (touchees.length === 0)
        throw new Error('Ligne introuvable ou verrouillée (import Air-Bat)')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(reserve)
      .values(valeurs)
      .returning({ id: reserve.id })
    return { id: cree.id }
  })

export const deleteReserveFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const touchees = await db
      .delete(reserve)
      .where(
        and(
          eq(reserve.id, data.id),
          or(isNull(reserve.estVerrouille), eq(reserve.estVerrouille, false)),
        ),
      )
      .returning({ id: reserve.id })
    if (touchees.length === 0)
      throw new Error('Ligne introuvable ou verrouillée (import Air-Bat)')
  })
