// Server function de l'onglet Facturation électronique d'Opérations (sans
// équivalent WinDev) : fiche de la SCCV de l'opération, hors périmètre si elle
// n'est pas immatriculée ou est liquidée ; null si l'opération n'a pas de SCCV.
import { createServerFn } from '@tanstack/react-start'
import { eq, sql } from 'drizzle-orm'

import {
  gestionnaireSccv,
  operation,
  structureJuridique,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import {
  ASSOCIE_KPI_ID,
  adresseFacturation,
  libelleCompta,
  sansPrefixeSccv,
  siren,
} from '#/lib/facturation.helpers.ts'
import { requireSession } from '#/lib/session.server.ts'

export const getFacturationFn = createServerFn({ method: 'GET' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    // pourcentage est un real : le cast en numeric rend la valeur saisie
    const partKpi = sql<number>`COALESCE((SELECT sum(p.pourcentage::numeric) FROM participation p
      WHERE p.structure_juridique_id = ${structureJuridique.id} AND p.associe_id = ${ASSOCIE_KPI_ID}), 0)`
    const [l] = await db
      .select({
        commune: operation.commune,
        operation: operation.libelle,
        rs: structureJuridique.rs,
        siret: structureJuridique.siret,
        dateImmat: structureJuridique.dateImmat,
        dateLiquidation: structureJuridique.dateLiquidation,
        capital: structureJuridique.capital,
        partKpi,
        gestionnaire: gestionnaireSccv.libelle,
        gestionnaireCourt: gestionnaireSccv.libelleCourt,
        suffixe: structureJuridique.suffixeFacturationElectronique,
        logiciel: structureJuridique.logicielFacturationElectronique,
      })
      .from(operation)
      .innerJoin(
        structureJuridique,
        eq(operation.structureJuridiqueId, structureJuridique.id),
      )
      .leftJoin(
        gestionnaireSccv,
        eq(structureJuridique.gestionnaireSccvId, gestionnaireSccv.id),
      )
      .where(eq(operation.id, data.operationId))
      .limit(1)
    if (!l) return null
    return {
      rs: l.rs,
      sccv: sansPrefixeSccv(l.rs),
      commune: l.commune ?? '',
      operation: l.operation ?? '',
      compta: libelleCompta(l.gestionnaire, l.gestionnaireCourt),
      gestionnaire: l.gestionnaire ?? '',
      logiciel: l.logiciel ?? '',
      horsPerimetre: !l.dateImmat || !!l.dateLiquidation,
      adresse: adresseFacturation(l.siret, l.suffixe),
      siret: l.siret ?? '',
      siren: siren(l.siret),
      dateImmat: l.dateImmat,
      dateLiquidation: l.dateLiquidation,
      capital: l.capital,
      // numeric Postgres : rendu en texte par le driver
      partKpi: Number(l.partKpi),
    }
  })

export type FicheFacturation = NonNullable<
  Awaited<ReturnType<typeof getFacturationFn>>
>
