// Server functions du module Commercialisation (FEN_TABLE_Commercialisation).
// Lecture seule en phase 1 — voir docs/plan-implementation.md.
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import {
  acquereur,
  commercialisation,
  destination,
  fiscaliteAcquereur,
  lot,
  moyenPaiement,
  natureAchat,
  operation,
  structureJuridique,
  tranche,
  typeAcquereur,
  versementDepotGarantie,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireSession } from '#/lib/session.server.ts'

// Liste maître : toutes les opérations (le filtre « Contient » et la case
// « Inclure les Masquer commercial » s'appliquent côté client, comme WinDev
// filtre en mémoire — 167 lignes). Tri alphabétique sur le libellé.
export const getOperationsCommFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    return db
      .select({
        id: operation.id,
        libelle: operation.libelle,
        commune: operation.commune,
        sccv: structureJuridique.rs,
        masquerCommercial: operation.masquerCommercial,
        masquerComptable: operation.masquerComptable,
        masquerPromo: operation.masquerPromo,
      })
      .from(operation)
      .leftJoin(
        structureJuridique,
        eq(operation.structureJuridiqueId, structureJuridique.id),
      )
      .orderBy(asc(operation.libelle))
  },
)

// En-tête d'une opération + ses tranches avec compteurs (récap du sélecteur)
export const getOperationCommFn = createServerFn({ method: 'GET' })
  .validator((data: { operationId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const op = (
      await db
        .select({
          id: operation.id,
          libelle: operation.libelle,
          commune: operation.commune,
          sccv: structureJuridique.rs,
          hlm: structureJuridique.sccvHlm,
        })
        .from(operation)
        .leftJoin(
          structureJuridique,
          eq(operation.structureJuridiqueId, structureJuridique.id),
        )
        .where(eq(operation.id, data.operationId))
    ).at(0)
    if (!op) return null
    const tranches = await db
      .select({
        id: tranche.id,
        libelle: tranche.libelle,
        adresse: tranche.adresse,
        dateLivraisonContractuelle: tranche.dateLivraisonContractuelle,
        nbLogtColl: tranche.nbLogtColl,
        nbLogtIndiv: tranche.nbLogtIndiv,
        dontLogtCollPsla: tranche.dontLogtCollPsla,
        dontLogtIndivPsla: tranche.dontLogtIndivPsla,
        dontLogtCollBrs: tranche.dontLogtCollBrs,
        dontLogtIndivBrs: tranche.dontLogtIndivBrs,
      })
      .from(tranche)
      .where(eq(tranche.operationId, data.operationId))
      .orderBy(asc(tranche.id))
    return { ...op, tranches }
  })

// Lots d'une opération (toutes tranches ou une seule) + commercialisation
// « courante » = la plus récente non annulée (le cache curIDAcquereur du
// legacy n'a pas été repris — on recalcule par jointure, cf. schema-cible.md)
export const getLotsCommFn = createServerFn({ method: 'GET' })
  .validator((data: { operationId: number; trancheId?: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()

    const commCourante = db
      .selectDistinctOn([commercialisation.lotId], {
        id: commercialisation.id,
        lotId: commercialisation.lotId,
        acquereurId: commercialisation.acquereurId,
        natureAchatId: commercialisation.natureAchatId,
        dateResa: commercialisation.dateResa,
      })
      .from(commercialisation)
      .where(isNull(commercialisation.dateAnnulation))
      .orderBy(
        asc(commercialisation.lotId),
        sql`${commercialisation.dateResa} DESC NULLS LAST`,
        desc(commercialisation.id),
      )
      .as('comm_courante')

    return db
      .select({
        id: lot.id,
        trancheId: lot.trancheId,
        commercialisationId: commCourante.id,
        numLot: lot.numLot,
        numEtage: lot.numEtage,
        designation: lot.designation,
        acquereur: sql<
          string | null
        >`COALESCE(${acquereur.nomComplet}, ${acquereur.rs})`,
        destination: destination.libelle,
        natureAchat: natureAchat.libelle,
        dateResa: commCourante.dateResa,
        familleDeBien: lot.familleDeBien,
        typeDeBien: lot.typeDeBien,
        surfHabitable: lot.surfHabitable,
        prixVenteTtc: lot.prixVenteTtc,
      })
      .from(lot)
      .innerJoin(tranche, eq(lot.trancheId, tranche.id))
      .leftJoin(commCourante, eq(commCourante.lotId, lot.id))
      .leftJoin(acquereur, eq(commCourante.acquereurId, acquereur.id))
      .leftJoin(natureAchat, eq(commCourante.natureAchatId, natureAchat.id))
      .leftJoin(destination, eq(lot.destinationId, destination.id))
      .where(
        and(
          eq(tranche.operationId, data.operationId),
          data.trancheId ? eq(lot.trancheId, data.trancheId) : undefined,
        ),
      )
      .orderBy(asc(lot.numLot))
  })

// Détail d'un lot : fiche + historique des commercialisations + dépôts de garantie
export const getLotDetailFn = createServerFn({ method: 'GET' })
  .validator((data: { lotId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const ligne = (
      await db
        .select({ fiche: lot, destination: destination.libelle })
        .from(lot)
        .leftJoin(destination, eq(lot.destinationId, destination.id))
        .where(eq(lot.id, data.lotId))
    ).at(0)
    if (!ligne) return null
    const { fiche, destination: destinationLot } = ligne

    const commercialisations = await db
      .select({
        id: commercialisation.id,
        acquereur: sql<
          string | null
        >`COALESCE(${acquereur.nomComplet}, ${acquereur.rs})`,
        typeAcquereur: typeAcquereur.libelle,
        natureAchat: natureAchat.libelle,
        fiscalite: fiscaliteAcquereur.libelle,
        moyenPaiement: moyenPaiement.libelle,
        dateResa: commercialisation.dateResa,
        datePrevueSignatureActe: commercialisation.datePrevueSignatureActe,
        datePreviActabilite: commercialisation.datePreviActabilite,
        dateSignatureActeVefa: commercialisation.dateSignatureActeVefa,
        dateSignatureContratLoc: commercialisation.dateSignatureContratLoc,
        dateResiliationContratLoc: commercialisation.dateResiliationContratLoc,
        dateLeveeOption: commercialisation.dateLeveeOption,
        dateLivraison: commercialisation.dateLivraison,
        dateAnnulation: commercialisation.dateAnnulation,
        motifAnnulation: commercialisation.motifAnnulation,
        annulationCommentaire: commercialisation.annulationCommentaire,
        prixVenteReelTtc: commercialisation.prixVenteReelTtc,
        prixVenteReelHt: commercialisation.prixVenteReelHt,
        tauxTvaReel: commercialisation.tauxTvaReel,
        remiseClientTtc: commercialisation.remiseClientTtc,
        montantDepotGarantie: commercialisation.montantDepotGarantie,
        livraisonTrimestrePrevuContrat:
          commercialisation.livraisonTrimestrePrevuContrat,
        // onglets Fiscalité / Contrat Loc. Accession / Prév. signature / Actes
        estJustifFiscal: commercialisation.estJustifFiscal,
        estFiscalite: commercialisation.estFiscalite,
        commFisca: commercialisation.commFisca,
        loyer: commercialisation.loyer,
        epargne: commercialisation.epargne,
        dateSignatureComm: commercialisation.dateSignatureComm,
        pasAideRm: commercialisation.pasAideRm,
        montantSubv: commercialisation.montantSubv,
        montantSubvAcpte: commercialisation.montantSubvAcpte,
        soldeDemande: commercialisation.soldeDemande,
        // adresse actuelle de l'acquéreur (onglet Livraison)
        adresseActuelle: sql<string | null>`NULLIF(TRIM(CONCAT_WS(' ',
          ${acquereur.adresseActuelle}, ${acquereur.cpActuel}, ${acquereur.communeActuelle})), '')`,
      })
      .from(commercialisation)
      .leftJoin(acquereur, eq(commercialisation.acquereurId, acquereur.id))
      .leftJoin(
        typeAcquereur,
        eq(commercialisation.typeAcquereurId, typeAcquereur.id),
      )
      .leftJoin(
        natureAchat,
        eq(commercialisation.natureAchatId, natureAchat.id),
      )
      .leftJoin(
        fiscaliteAcquereur,
        eq(commercialisation.fiscaliteAcquereurId, fiscaliteAcquereur.id),
      )
      .leftJoin(
        moyenPaiement,
        eq(commercialisation.moyenPaiementId, moyenPaiement.id),
      )
      .where(eq(commercialisation.lotId, data.lotId))
      .orderBy(
        sql`${commercialisation.dateResa} DESC NULLS LAST`,
        desc(commercialisation.id),
      )

    const versements = commercialisations.length
      ? await db
          .select({
            id: versementDepotGarantie.id,
            commercialisationId: versementDepotGarantie.commercialisationId,
            montantVerse: versementDepotGarantie.montantVerse,
            dateRemise: versementDepotGarantie.dateRemise,
            dateCreation: versementDepotGarantie.dateCreation,
            commentaire: versementDepotGarantie.commentaire,
          })
          .from(versementDepotGarantie)
          .where(
            inArray(
              versementDepotGarantie.commercialisationId,
              commercialisations.map((c) => c.id),
            ),
          )
          .orderBy(asc(versementDepotGarantie.dateRemise))
      : []

    return {
      fiche,
      destination: destinationLot,
      commercialisations,
      versements,
    }
  })
