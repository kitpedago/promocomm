// Widgets du tableau de bord — transposition des requêtes WinDev de FEN_Menu
// (REQ_Tranche_Situation_DernierMois_LancementCom / _TRAVAUX / _LIV,
// REQ_SCCV_Creation_DernierMois, REQ_SCCV_Liquidation_DernierMois).
// Fenêtres identiques à WinDev : 90 jours pour les tranches, 1 an pour les SCCV.
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'

import { operation, structureJuridique, tranche } from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireSession } from '#/lib/session.server.ts'

// situation.id (legacy tListeSituation) : 1 ÉTUDE, 2 TRAVAUX, 3 LIVRÉ, 4 Fin SAV
const SITUATION_TRAVAUX = 2
const SITUATION_LIVRE = 3

const nbLogt =
  sql<number>`coalesce(${tranche.nbLogtIndiv}, 0) + coalesce(${tranche.nbLogtColl}, 0)`.as(
    'nb_logt',
  )

const trancheParSituation = (situationId: number, depuis: Date) =>
  db
    .select({
      operation: operation.libelle,
      commune: operation.commune,
      tranche: tranche.libelle,
      nbLogt,
      depuisLe: tranche.situationDepuisLe,
    })
    .from(tranche)
    .innerJoin(operation, eq(tranche.operationId, operation.id))
    .where(
      and(
        eq(tranche.situationId, situationId),
        gte(tranche.situationDepuisLe, depuis),
      ),
    )
    .orderBy(desc(tranche.situationDepuisLe))

export const getDashboardFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()

    const depuis90Jours = new Date(Date.now() - 90 * 24 * 3600 * 1000)
    const depuis1An = new Date(Date.now() - 365 * 24 * 3600 * 1000)

    // une ligne par tranche, comme les requêtes WinDev (jointure SCCV > op > tranche)
    const sccvParDate = (
      depuisLe:
        | typeof structureJuridique.dateImmat
        | typeof structureJuridique.dateLiquidation,
    ) =>
      db
        .select({
          commune: operation.commune,
          sccv: structureJuridique.rs,
          operation: operation.libelle,
          nbLogt,
          depuisLe,
        })
        .from(structureJuridique)
        .innerJoin(
          operation,
          eq(operation.structureJuridiqueId, structureJuridique.id),
        )
        .innerJoin(tranche, eq(tranche.operationId, operation.id))

    const [lancementsCom, enTravaux, livraisons, sccvCreees, sccvLiquidees] =
      await Promise.all([
        db
          .select({
            operation: operation.libelle,
            commune: operation.commune,
            tranche: tranche.libelle,
            nbLogt,
            depuisLe: tranche.stadeCom,
          })
          .from(tranche)
          .innerJoin(operation, eq(tranche.operationId, operation.id))
          .where(gte(tranche.stadeCom, depuis90Jours))
          .orderBy(desc(tranche.stadeCom)),
        trancheParSituation(SITUATION_TRAVAUX, depuis90Jours),
        trancheParSituation(SITUATION_LIVRE, depuis90Jours),
        sccvParDate(structureJuridique.dateImmat)
          .where(
            and(
              isNull(structureJuridique.dateLiquidation),
              gte(structureJuridique.dateImmat, depuis1An),
            ),
          )
          .orderBy(desc(structureJuridique.dateImmat)),
        sccvParDate(structureJuridique.dateLiquidation)
          .where(gte(structureJuridique.dateLiquidation, depuis1An))
          .orderBy(desc(structureJuridique.dateLiquidation)),
      ])

    return { lancementsCom, enTravaux, livraisons, sccvCreees, sccvLiquidees }
  },
)

export type DashboardData = Awaited<ReturnType<typeof getDashboardFn>>
