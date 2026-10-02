// Server function de l'onglet Facturation électronique d'Opérations (sans
// équivalent WinDev) : fiche de la SCCV de l'opération si son comptable est
// « extérieur » (personne.est_exterieur, Paramètres › Personnes), qu'elle est
// immatriculée et que l'associé KPI y détient plus de 5 % ; null sinon.
import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNotNull, sql } from 'drizzle-orm'

import {
  gestionnaireSccv,
  operation,
  personne,
  structureJuridique,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import {
  ASSOCIE_KPI_ID,
  SEUIL_KPI,
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
    // pourcentage est un real : 0,05 y vaut 0,0500000007, qui passerait un
    // « > 0,05 » ; le cast en numeric rend la valeur saisie
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
        suffixe: gestionnaireSccv.suffixeFacturationElectronique,
        logiciel: gestionnaireSccv.logicielFacturationElectronique,
      })
      .from(operation)
      .innerJoin(
        structureJuridique,
        eq(operation.structureJuridiqueId, structureJuridique.id),
      )
      .innerJoin(
        personne,
        eq(structureJuridique.personneComptableId, personne.id),
      )
      .leftJoin(
        gestionnaireSccv,
        eq(structureJuridique.gestionnaireSccvId, gestionnaireSccv.id),
      )
      .where(
        and(
          eq(operation.id, data.operationId),
          eq(personne.estExterieur, true),
          isNotNull(structureJuridique.dateImmat),
          sql`${partKpi} > ${SEUIL_KPI}`,
        ),
      )
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
      adresse: adresseFacturation(l.siret, l.suffixe),
      siret: l.siret ?? '',
      siren: siren(l.siret),
      suffixe: l.suffixe ?? '',
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
