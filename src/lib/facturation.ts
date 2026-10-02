// Server function du module Facturation électronique (sans équivalent
// WinDev) : SCCV dont la compta est tenue à l'extérieur, immatriculées, où
// l'associé KPI détient plus de 5 %, une ligne par opération (une SCCV sans
// opération garde sa ligne). Les filtres d'écran (commune, compta, recherche)
// se font côté client sur ces quelques dizaines de lignes.
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

import {
  gestionnaireSccv,
  operation,
  structureJuridique,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import {
  ASSOCIE_KPI_ID,
  COMPTABLES_EXTERIEUR,
  SEUIL_KPI,
  adresseFacturation,
  libelleCompta,
  sansPrefixeSccv,
  siren,
} from '#/lib/facturation.helpers.ts'
import { requireSession } from '#/lib/session.server.ts'

export const getFacturationFn = createServerFn({ method: 'GET' })
  .validator((d: { liquidee?: boolean }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    // pourcentage est un real : 0,05 y vaut 0,0500000007, qui passerait un
    // « > 0,05 » ; le cast en numeric rend la valeur saisie
    const partKpi = sql<number>`COALESCE((SELECT sum(p.pourcentage::numeric) FROM participation p
      WHERE p.structure_juridique_id = ${structureJuridique.id} AND p.associe_id = ${ASSOCIE_KPI_ID}), 0)`
    const lignes = await db
      .select({
        sccvId: structureJuridique.id,
        operationId: operation.id,
        commune: operation.commune,
        operation: operation.libelle,
        rs: structureJuridique.rs,
        siret: structureJuridique.siret,
        dateImmat: structureJuridique.dateImmat,
        dateLiquidation: structureJuridique.dateLiquidation,
        capital: structureJuridique.capital,
        partKpi,
        gestionnaireId: structureJuridique.gestionnaireSccvId,
        gestionnaire: gestionnaireSccv.libelle,
        gestionnaireCourt: gestionnaireSccv.libelleCourt,
        suffixe: gestionnaireSccv.suffixeFacturationElectronique,
        logiciel: gestionnaireSccv.logicielFacturationElectronique,
      })
      .from(structureJuridique)
      .leftJoin(
        gestionnaireSccv,
        eq(structureJuridique.gestionnaireSccvId, gestionnaireSccv.id),
      )
      .leftJoin(
        operation,
        eq(operation.structureJuridiqueId, structureJuridique.id),
      )
      .where(
        and(
          inArray(structureJuridique.personneComptableId, [
            ...COMPTABLES_EXTERIEUR,
          ]),
          isNotNull(structureJuridique.dateImmat),
          data.liquidee
            ? isNotNull(structureJuridique.dateLiquidation)
            : isNull(structureJuridique.dateLiquidation),
          sql`${partKpi} > ${SEUIL_KPI}`,
        ),
      )
      .orderBy(
        asc(operation.commune),
        asc(operation.libelle),
        asc(structureJuridique.rs),
      )
    return lignes.map((l) => ({
      id: `${l.sccvId}-${l.operationId ?? 0}`,
      sccvId: l.sccvId,
      gestionnaireId: l.gestionnaireId,
      commune: l.commune ?? '',
      operation: l.operation ?? '',
      sccv: sansPrefixeSccv(l.rs),
      compta: libelleCompta(l.gestionnaire, l.gestionnaireCourt),
      logiciel: l.logiciel ?? '',
      adresse: adresseFacturation(l.siret, l.suffixe),
      // détail du volet de droite (lecture seule)
      rs: l.rs,
      siret: l.siret ?? '',
      siren: siren(l.siret),
      suffixe: l.suffixe ?? '',
      gestionnaire: l.gestionnaire ?? '',
      dateImmat: l.dateImmat,
      dateLiquidation: l.dateLiquidation,
      capital: l.capital,
      // numeric Postgres : rendu en texte par le driver
      partKpi: Number(l.partKpi),
    }))
  })

export type LigneFacturation = Awaited<
  ReturnType<typeof getFacturationFn>
>[number]
