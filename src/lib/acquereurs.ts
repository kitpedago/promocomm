// Server function du module Acquéreurs (FEN_Table_Acquereur) — phase 1, lecture.
// Comme WinDev, la liste complète est chargée puis filtrée côté client
// (arbre opérations + recherche nom/email/téléphones) — 2 929 lignes.
import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import {
  acquereur,
  civilite,
  commercialisation,
  lot,
  operation,
  tranche,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireSession } from '#/lib/session.server.ts'

export const getAcquereursFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()

    // « lot courant » = commercialisation active (non annulée) la plus récente,
    // affiché « OPÉRATION COMMUNE | num lot » comme dans WinDev (le cache
    // curIDLot/DescriptionLotCourant du legacy n'a pas été repris)
    const lotCourant = db
      .selectDistinctOn([commercialisation.acquereurId], {
        acquereurId: commercialisation.acquereurId,
        lotCourant: sql<string>`
          ${operation.libelle} || COALESCE(' ' || ${operation.commune}, '')
          || ' | ' || COALESCE(${lot.numLot}, '')`.as('lot_courant'),
      })
      .from(commercialisation)
      .innerJoin(lot, eq(commercialisation.lotId, lot.id))
      .innerJoin(tranche, eq(lot.trancheId, tranche.id))
      .innerJoin(operation, eq(tranche.operationId, operation.id))
      .where(isNull(commercialisation.dateAnnulation))
      .orderBy(
        asc(commercialisation.acquereurId),
        sql`${commercialisation.dateResa} DESC NULLS LAST`,
        desc(commercialisation.id),
      )
      .as('lot_courant')

    // opérations où l'acquéreur a (eu) une commercialisation — pour l'arbre de filtre
    const opsAcquereur = db
      .select({
        acquereurId: commercialisation.acquereurId,
        // typé nullable : le LEFT JOIN de la requête principale peut ne rien apporter
        operationIds: sql<
          Array<number> | null
        >`array_agg(DISTINCT ${tranche.operationId})`.as('operation_ids'),
      })
      .from(commercialisation)
      .innerJoin(lot, eq(commercialisation.lotId, lot.id))
      .innerJoin(tranche, eq(lot.trancheId, tranche.id))
      .groupBy(commercialisation.acquereurId)
      .as('ops_acquereur')

    const civ2 = alias(civilite, 'civ2')
    const civ3 = alias(civilite, 'civ3')

    return db
      .select({
        id: acquereur.id,
        nomComplet: sql<
          string | null
        >`COALESCE(${acquereur.nomComplet}, ${acquereur.rs})`,
        lotCourant: lotCourant.lotCourant,
        civilite: sql<string>`concat_ws(', ', ${civilite.libelle}, ${civ2.libelle}, ${civ3.libelle})`,
        prenoms: sql<string>`concat_ws(', ', ${acquereur.prenom}, ${acquereur.prenom2}, ${acquereur.prenom3})`,
        email: acquereur.email,
        email2: acquereur.email2,
        telephone: acquereur.telephone,
        portable: acquereur.portable,
        communeActuelle: acquereur.communeActuelle,
        operationIds: opsAcquereur.operationIds,
      })
      .from(acquereur)
      .leftJoin(civilite, eq(acquereur.civiliteId, civilite.id))
      .leftJoin(civ2, eq(acquereur.civilite2Id, civ2.id))
      .leftJoin(civ3, eq(acquereur.civilite3Id, civ3.id))
      .leftJoin(lotCourant, eq(lotCourant.acquereurId, acquereur.id))
      .leftJoin(opsAcquereur, eq(opsAcquereur.acquereurId, acquereur.id))
      .orderBy(sql`COALESCE(${acquereur.nomComplet}, ${acquereur.rs}) ASC`)
  },
)

export type LigneAcquereur = Awaited<
  ReturnType<typeof getAcquereursFn>
>[number]
