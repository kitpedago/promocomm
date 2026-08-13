// Server functions du module Commercialisation (FEN_TABLE_Commercialisation).
// Lecture (phase 1) + écriture commerciale et droits fins (phase 2).
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import {
  acquereur,
  banqueCourtage,
  personne,
  commercial,
  commercialisation,
  destination,
  droit,
  fiscaliteAcquereur,
  lot,
  motifClauseParticuliere,
  moyenPaiement,
  natureAchat,
  operation,
  prestataire,
  structureJuridique,
  tranche,
  typeAcquereur,
  versementDepotGarantie,
} from '#/db/domaine.ts'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '#/db/index.ts'
import { construireCsv } from '#/lib/csv.ts'
import { requireDroit, requireSession } from '#/lib/session.server.ts'

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

const chargeOpe1 = alias(personne, 'charge_ope1')
const chargeOpe2 = alias(personne, 'charge_ope2')

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
          chargeOpe1: sql<
            string | null
          >`NULLIF(TRIM(CONCAT_WS(' ', ${chargeOpe1.prenom}, ${chargeOpe1.patronyme})), '')`,
          chargeOpe2: sql<
            string | null
          >`NULLIF(TRIM(CONCAT_WS(' ', ${chargeOpe2.prenom}, ${chargeOpe2.patronyme})), '')`,
        })
        .from(operation)
        .leftJoin(
          structureJuridique,
          eq(operation.structureJuridiqueId, structureJuridique.id),
        )
        .leftJoin(chargeOpe1, eq(operation.chargeOpe1Id, chargeOpe1.id))
        .leftJoin(chargeOpe2, eq(operation.chargeOpe2Id, chargeOpe2.id))
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
        .select({
          fiche: lot,
          destination: destination.libelle,
          // l'adresse complète du lot concatène le CP/commune de l'opération
          // (REQ_AcquereurAdresses, onglet Livraison)
          adresseCompleteLot: sql<string | null>`NULLIF(TRIM(CONCAT_WS(' ',
            ${lot.adresse}, ${operation.cp}, ${operation.commune})), '')`,
        })
        .from(lot)
        .leftJoin(destination, eq(lot.destinationId, destination.id))
        .leftJoin(tranche, eq(lot.trancheId, tranche.id))
        .leftJoin(operation, eq(tranche.operationId, operation.id))
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
        fiscaliteAcquereurId: commercialisation.fiscaliteAcquereurId,
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
        // ids + champs de la fiche (modale Réserver/Modifier, phase 2)
        acquereurId: commercialisation.acquereurId,
        natureAchatId: commercialisation.natureAchatId,
        moyenPaiementId: commercialisation.moyenPaiementId,
        banqueCourtageId: commercialisation.banqueCourtageId,
        prestataireComm1Id: commercialisation.prestataireComm1Id,
        prestataireComm2Id: commercialisation.prestataireComm2Id,
        motifClauseParticuliereId: commercialisation.motifClauseParticuliereId,
        dateDemandeAgrement: commercialisation.dateDemandeAgrement,
        dateAgrementObtenu: commercialisation.dateAgrementObtenu,
        dateReceptionCourrierLvo: commercialisation.dateReceptionCourrierLvo,
        avecHonoraireCourtage: commercialisation.avecHonoraireCourtage,
        montantHonoCourtageClient: commercialisation.montantHonoCourtageClient,
        montantHonoCourtageBanque: commercialisation.montantHonoCourtageBanque,
        avecSouscriptionCapitalKpi:
          commercialisation.avecSouscriptionCapitalKpi,
        pasDeSouscriptionCapital: commercialisation.pasDeSouscriptionCapital,
        dateSouscription: commercialisation.dateSouscription,
        commentairesSouscription: commercialisation.commentairesSouscription,
        estReventeBien: commercialisation.estReventeBien,
        dateButoirRevente: commercialisation.dateButoirRevente,
        avecClauseParticuliere: commercialisation.avecClauseParticuliere,
        commentaireClauseParticuliere:
          commercialisation.commentaireClauseParticuliere,
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
      adresseCompleteLot: ligne.adresseCompleteLot,
      commercialisations,
      versements,
    }
  })

// ---------------------------------------------------------------------------
// Phase 2 — écriture commerciale et droits fins
// ---------------------------------------------------------------------------

const FEN_COMM = 'FEN_TABLE_Commercialisation'

// Restrictions du service courant pour une fenêtre WinDev (type 1 = lecture
// seule, 2 = masqué) — le client masque/grise ses zones, le serveur regarde
// requireDroit
export const getDroitsFn = createServerFn({ method: 'GET' })
  .validator((d: { fenetre: string }) => d)
  .handler(async ({ data }) => {
    const session = await requireSession()
    return db
      .select({
        controle: droit.controle,
        indice: droit.indice,
        type: droit.type,
      })
      .from(droit)
      .where(
        and(
          eq(droit.fenetre, data.fenetre),
          eq(droit.service, session.user.service ?? ''),
        ),
      )
  })

// Nomenclatures de la fiche commercialisation (FEN_Fiche_Commercialisation)
export const getCommNomenclaturesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireSession()
  const [
    acquereurs,
    naturesAchat,
    moyensPaiement,
    banquesCourtage,
    motifsClause,
    prestataires,
    fiscalitesAcquereur,
  ] = await Promise.all([
    db
      .select({
        id: acquereur.id,
        libelle: sql<string>`COALESCE(${acquereur.nomComplet}, ${acquereur.rs}, '')`,
      })
      .from(acquereur)
      .orderBy(sql`COALESCE(${acquereur.nomComplet}, ${acquereur.rs}, '')`),
    db.select().from(natureAchat).orderBy(asc(natureAchat.ordreComm)),
    db.select().from(moyenPaiement).orderBy(asc(moyenPaiement.libelle)),
    db.select().from(banqueCourtage).orderBy(asc(banqueCourtage.libelle)),
    db
      .select()
      .from(motifClauseParticuliere)
      .orderBy(asc(motifClauseParticuliere.libelle)),
    db
      .select({ id: prestataire.id, libelle: prestataire.libelle })
      .from(prestataire)
      .orderBy(asc(prestataire.libelle)),
    db
      .select({
        id: fiscaliteAcquereur.id,
        libelle: fiscaliteAcquereur.libelle,
      })
      .from(fiscaliteAcquereur)
      .orderBy(asc(fiscaliteAcquereur.libelle)),
  ])
  return {
    acquereurs,
    naturesAchat,
    moyensPaiement,
    banquesCourtage,
    motifsClause,
    prestataires,
    fiscalitesAcquereur,
  }
})

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// Fiche commercialisation (Réserver = création, Modifier = mise à jour)
interface FicheCommercialisation {
  id?: number
  lotId: number
  acquereurId?: number | null
  natureAchatId?: number | null
  dateResa?: string | null
  montantDepotGarantie?: number | null
  livraisonTrimestrePrevuContrat?: string | null
  prestataireComm1Id?: number | null
  prestataireComm2Id?: number | null
  prixVenteReelTtc?: number | null
  tauxTvaReel?: number | null
  prixVenteReelHt?: number | null
  remiseClientTtc?: number | null
  dateDemandeAgrement?: string | null
  dateAgrementObtenu?: string | null
  dateReceptionCourrierLvo?: string | null
  avecHonoraireCourtage?: boolean | null
  montantHonoCourtageClient?: number | null
  montantHonoCourtageBanque?: number | null
  banqueCourtageId?: number | null
  avecSouscriptionCapitalKpi?: boolean | null
  pasDeSouscriptionCapital?: boolean | null
  dateSouscription?: string | null
  commentairesSouscription?: string | null
  moyenPaiementId?: number | null
  estReventeBien?: boolean | null
  dateButoirRevente?: string | null
  avecClauseParticuliere?: boolean | null
  motifClauseParticuliereId?: number | null
  commentaireClauseParticuliere?: string | null
  // zones jaunes WinDev (saisie en ligne) des onglets Fiscalité / Contrat
  // Loc. Accession / Prév. signature actes / Actes
  estJustifFiscal?: boolean | null
  estFiscalite?: boolean | null
  commFisca?: string | null
  fiscaliteAcquereurId?: number | null
  dateSignatureContratLoc?: string | null
  loyer?: number | null
  epargne?: number | null
  datePrevueSignatureActe?: string | null
  dateSignatureComm?: string | null
  dateSignatureActeVefa?: string | null
  dateLeveeOption?: string | null
  pasAideRm?: boolean | null
  montantSubv?: number | null
  montantSubvAcpte?: number | null
  soldeDemande?: boolean | null
}

export const saveCommercialisationFn = createServerFn({ method: 'POST' })
  .validator((d: FicheCommercialisation) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'SC_Reservation')
    // iso-WinDev : pas de réservation sans acquéreur
    if (data.acquereurId == null) throw new Error('Sélectionner un acquéreur')
    const valeurs = {
      lotId: data.lotId,
      acquereurId: data.acquereurId,
      natureAchatId: data.natureAchatId ?? null,
      dateResa: versDate(data.dateResa),
      montantDepotGarantie: data.montantDepotGarantie ?? null,
      livraisonTrimestrePrevuContrat:
        data.livraisonTrimestrePrevuContrat || null,
      prestataireComm1Id: data.prestataireComm1Id ?? null,
      prestataireComm2Id: data.prestataireComm2Id ?? null,
      prixVenteReelTtc: data.prixVenteReelTtc ?? null,
      tauxTvaReel: data.tauxTvaReel ?? null,
      prixVenteReelHt: data.prixVenteReelHt ?? null,
      remiseClientTtc: data.remiseClientTtc ?? null,
      dateDemandeAgrement: versDate(data.dateDemandeAgrement),
      dateAgrementObtenu: versDate(data.dateAgrementObtenu),
      dateReceptionCourrierLvo: versDate(data.dateReceptionCourrierLvo),
      avecHonoraireCourtage: data.avecHonoraireCourtage ?? null,
      montantHonoCourtageClient: data.montantHonoCourtageClient ?? null,
      montantHonoCourtageBanque: data.montantHonoCourtageBanque ?? null,
      banqueCourtageId: data.banqueCourtageId ?? null,
      avecSouscriptionCapitalKpi: data.avecSouscriptionCapitalKpi ?? null,
      pasDeSouscriptionCapital: data.pasDeSouscriptionCapital ?? null,
      dateSouscription: versDate(data.dateSouscription),
      commentairesSouscription: data.commentairesSouscription || null,
      moyenPaiementId: data.moyenPaiementId ?? null,
      // int 0/1 iso-legacy
      estReventeBien:
        data.estReventeBien == null ? null : data.estReventeBien ? 1 : 0,
      dateButoirRevente: versDate(data.dateButoirRevente),
      avecClauseParticuliere:
        data.avecClauseParticuliere == null
          ? null
          : data.avecClauseParticuliere
            ? 1
            : 0,
      motifClauseParticuliereId: data.motifClauseParticuliereId ?? null,
      commentaireClauseParticuliere: data.commentaireClauseParticuliere || null,
      estJustifFiscal: data.estJustifFiscal ?? null,
      estFiscalite: data.estFiscalite ?? null,
      commFisca: data.commFisca || null,
      fiscaliteAcquereurId: data.fiscaliteAcquereurId ?? null,
      dateSignatureContratLoc: versDate(data.dateSignatureContratLoc),
      loyer: data.loyer ?? null,
      epargne: data.epargne ?? null,
      datePrevueSignatureActe: versDate(data.datePrevueSignatureActe),
      dateSignatureComm: data.dateSignatureComm || null,
      dateSignatureActeVefa: versDate(data.dateSignatureActeVefa),
      dateLeveeOption: versDate(data.dateLeveeOption),
      pasAideRm: data.pasAideRm ?? null,
      montantSubv: data.montantSubv ?? null,
      montantSubvAcpte: data.montantSubvAcpte ?? null,
      soldeDemande: data.soldeDemande ?? null,
    }
    if (data.id) {
      const touchees = await db
        .update(commercialisation)
        .set(valeurs)
        .where(eq(commercialisation.id, data.id))
        .returning({ id: commercialisation.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    // iso-WinDev (btn Réserver) : une seule réservation active par lot
    const deja = await db
      .select({ id: commercialisation.id })
      .from(commercialisation)
      .where(
        and(
          eq(commercialisation.lotId, data.lotId),
          isNull(commercialisation.dateAnnulation),
        ),
      )
      .limit(1)
    if (deja.length > 0)
      throw new Error(
        "Ce lot est déjà réservé. Vous devez d'abord annuler la réservation.",
      )
    const [cree] = await db
      .insert(commercialisation)
      .values(valeurs)
      .returning({ id: commercialisation.id })
    return { id: cree.id }
  })

// Annulation d'une réservation (FEN_Commercialisation_Annulation) — la ligne
// reste dans l'historique du lot, iso-WinDev (pas de suppression)
export const annulerCommercialisationFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      id: number
      dateAnnulation: string
      motifAnnulation?: string | null
      annulationCommentaire?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'SC_Reservation')
    const touchees = await db
      .update(commercialisation)
      .set({
        dateAnnulation: versDate(data.dateAnnulation),
        motifAnnulation: data.motifAnnulation || null,
        annulationCommentaire: data.annulationCommentaire || null,
      })
      .where(eq(commercialisation.id, data.id))
      .returning({ id: commercialisation.id })
    if (touchees.length === 0) throw new Error('Ligne introuvable')
  })

// --- Onglet Livraison (contrôles SAI_Date_livraison / BTN_Appliquer_l_adresse) ---

// BTN_Enregistrer : date de livraison de la réservation sélectionnée
export const updateDateLivraisonFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number; dateLivraison: string | null }) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'TABLE_REQ_Livraison')
    const touchees = await db
      .update(commercialisation)
      .set({ dateLivraison: versDate(data.dateLivraison) })
      .where(eq(commercialisation.id, data.id))
      .returning({ id: commercialisation.id })
    if (touchees.length === 0) throw new Error('Ligne introuvable')
  })

// BTN_Appliquer_l_adresse : recopie l'adresse du lot (+ CP/commune de
// l'opération) comme adresse actuelle de l'acquéreur, gardes iso-WinDev
export const appliquerAdresseLotFn = createServerFn({ method: 'POST' })
  .validator((d: { commercialisationId: number }) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'TABLE_REQ_Livraison')
    const ligne = (
      await db
        .select({
          acquereurId: acquereur.id,
          adresseLot: lot.adresse,
          cp: operation.cp,
          commune: operation.commune,
          adresseActuelle: acquereur.adresseActuelle,
          cpActuel: acquereur.cpActuel,
          communeActuelle: acquereur.communeActuelle,
        })
        .from(commercialisation)
        .innerJoin(lot, eq(commercialisation.lotId, lot.id))
        .leftJoin(tranche, eq(lot.trancheId, tranche.id))
        .leftJoin(operation, eq(tranche.operationId, operation.id))
        .innerJoin(acquereur, eq(commercialisation.acquereurId, acquereur.id))
        .where(eq(commercialisation.id, data.commercialisationId))
    ).at(0)
    if (!ligne) throw new Error('Ligne introuvable')
    if (!ligne.adresseLot) throw new Error("Le lot n'a pas d'adresse !")
    if (
      ligne.adresseActuelle === ligne.adresseLot &&
      ligne.cpActuel === ligne.cp &&
      ligne.communeActuelle === ligne.commune
    )
      throw new Error('Les adresses sont les mêmes')
    await db
      .update(acquereur)
      .set({
        adresseActuelle: ligne.adresseLot,
        cpActuel: ligne.cp,
        communeActuelle: ligne.commune,
      })
      .where(eq(acquereur.id, ligne.acquereurId))
  })

// --- Versements de dépôt de garantie ---

interface FicheVersement {
  id?: number
  commercialisationId: number
  montantVerse?: number | null
  dateRemise?: string | null
  commentaire?: string | null
}

export const saveVersementFn = createServerFn({ method: 'POST' })
  .validator((d: FicheVersement) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'TABLE_VersementDepotGarantie')
    const valeurs = {
      commercialisationId: data.commercialisationId,
      montantVerse: data.montantVerse ?? null,
      dateRemise: versDate(data.dateRemise),
      commentaire: data.commentaire || null,
    }
    if (data.id) {
      const touchees = await db
        .update(versementDepotGarantie)
        .set(valeurs)
        .where(eq(versementDepotGarantie.id, data.id))
        .returning({ id: versementDepotGarantie.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(versementDepotGarantie)
      .values({ ...valeurs, dateCreation: new Date() })
      .returning({ id: versementDepotGarantie.id })
    return { id: cree.id }
  })

export const deleteVersementFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'BTN_VersementDepotGarantie_Supprimer')
    await db
      .delete(versementDepotGarantie)
      .where(eq(versementDepotGarantie.id, data.id))
  })

// --- Propagation tranche → lots (BTN_Propager_*) ---
// Lots concernés : ceux dont une commercialisation n'est pas investisseur
// (natures 2 INVEST, 9 INV PLS, 10 INV NP exclues — iso-REQ_Lot_Adresse_SelonNatureAchat)

const NATURES_INVESTISSEUR = [2, 9, 10]

const lotsPropagation = (trancheId: number) =>
  db
    .selectDistinct({ id: lot.id, adresse: lot.adresse })
    .from(lot)
    .innerJoin(commercialisation, eq(commercialisation.lotId, lot.id))
    .where(
      and(
        eq(lot.trancheId, trancheId),
        sql`${commercialisation.natureAchatId} NOT IN (${sql.join(
          NATURES_INVESTISSEUR.map((n) => sql`${n}`),
          sql`, `,
        )})`,
      ),
    )

export const propagerAdresseFn = createServerFn({ method: 'POST' })
  .validator(
    (d: { trancheId: number; adresse: string; remplacerNonVides: boolean }) =>
      d,
  )
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'BTN_Propager_aux_lots')
    if (!data.adresse.trim())
      throw new Error("Indiquez d'abord une adresse pour cette tranche")
    const cibles = await lotsPropagation(data.trancheId)
    const aModifier = cibles.filter(
      (l) => data.remplacerNonVides || !l.adresse?.trim(),
    )
    if (aModifier.length > 0)
      await db
        .update(lot)
        .set({ adresse: data.adresse })
        .where(
          inArray(
            lot.id,
            aModifier.map((l) => l.id),
          ),
        )
    return { modifies: aModifier.length }
  })

export const propagerDateLivraisonFn = createServerFn({ method: 'POST' })
  .validator((d: { trancheId: number; date: string }) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'BTN_Propager_aux_lots')
    const cibles = await lotsPropagation(data.trancheId)
    if (cibles.length === 0) return { modifies: 0 }
    // iso-WinDev : les dates de livraison déjà renseignées ne sont PAS remplacées
    const touchees = await db
      .update(commercialisation)
      .set({ dateLivraison: versDate(data.date) })
      .where(
        and(
          inArray(
            commercialisation.lotId,
            cibles.map((l) => l.id),
          ),
          isNull(commercialisation.dateLivraison),
        ),
      )
      .returning({ id: commercialisation.id })
    return { modifies: touchees.length }
  })

// --- Adresse de la tranche (BTN_Modifier_adresse_tranche / FEN_Fiche_Tranche_Adresse) ---

export const updateTrancheAdresseFn = createServerFn({ method: 'POST' })
  .validator((d: { trancheId: number; adresse: string }) => d)
  .handler(async ({ data }) => {
    await requireDroit(FEN_COMM, 'BTN_Modifier_adresse_tranche')
    await db
      .update(tranche)
      .set({ adresse: data.adresse.trim() || null })
      .where(eq(tranche.id, data.trancheId))
  })

// --- Export CSV de l'opération (BTN_Exporter / REQ_InterfaceCommercialisation_Lot) ---
// Iso-WinDev : toutes les tranches de l'opération, familles de bien hors
// « AUTRES », colonnes et intitulés du fichier d'interface conservés. Les
// champs cur* du lot legacy (cache de la commercialisation courante, non
// repris) sont recalculés par la même jointure que getLotsCommFn.

const prestataireComm1 = alias(prestataire, 'prestataire_comm1')
const prestataireComm2 = alias(prestataire, 'prestataire_comm2')

export const getExportCommFn = createServerFn({ method: 'GET' })
  .validator((data: { operationId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const op = (
      await db
        .select({ libelle: operation.libelle })
        .from(operation)
        .where(eq(operation.id, data.operationId))
    ).at(0)
    if (!op) throw new Error('Opération introuvable')

    const comm = db
      .selectDistinctOn([commercialisation.lotId], {
        id: commercialisation.id,
        lotId: commercialisation.lotId,
        acquereurId: commercialisation.acquereurId,
        natureAchatId: commercialisation.natureAchatId,
        fiscaliteAcquereurId: commercialisation.fiscaliteAcquereurId,
        banqueCourtageId: commercialisation.banqueCourtageId,
        prestataireComm1Id: commercialisation.prestataireComm1Id,
        prestataireComm2Id: commercialisation.prestataireComm2Id,
        dateResa: commercialisation.dateResa,
        dateSignatureActeVefa: commercialisation.dateSignatureActeVefa,
        dateSignatureContratLoc: commercialisation.dateSignatureContratLoc,
        dateLeveeOption: commercialisation.dateLeveeOption,
        dateLivraison: commercialisation.dateLivraison,
        estJustifFiscal: commercialisation.estJustifFiscal,
        estFiscalite: commercialisation.estFiscalite,
        commFisca: commercialisation.commFisca,
        pasAideRm: commercialisation.pasAideRm,
        loyer: commercialisation.loyer,
        epargne: commercialisation.epargne,
        prixVenteReelHt: commercialisation.prixVenteReelHt,
        prixVenteReelTtc: commercialisation.prixVenteReelTtc,
        tauxTvaReel: commercialisation.tauxTvaReel,
        remiseClientTtc: commercialisation.remiseClientTtc,
        avecHonoraireCourtage: commercialisation.avecHonoraireCourtage,
        montantHonoCourtageBanque: commercialisation.montantHonoCourtageBanque,
        montantHonoCourtageClient: commercialisation.montantHonoCourtageClient,
        avecTma: commercialisation.avecTma,
      })
      .from(commercialisation)
      .where(isNull(commercialisation.dateAnnulation))
      .orderBy(
        asc(commercialisation.lotId),
        sql`${commercialisation.dateResa} DESC NULLS LAST`,
        desc(commercialisation.id),
      )
      .as('comm_courante')

    // clés = intitulés de colonnes du fichier exporté (aliases WinDev)
    const colonnes = {
      IDOperation: operation.id,
      Operation: operation.libelle,
      IDTranche: lot.trancheId,
      Tranche: tranche.libelle,
      IDlot: lot.id,
      Numlot: lot.numLot,
      NomComplet: sql<
        string | null
      >`COALESCE(${acquereur.nomComplet}, ${acquereur.rs})`,
      curPrixDeVenteReelHT: comm.prixVenteReelHt,
      Destination: destination.libelle,
      LotAssocie: lot.lotAssocie,
      FamilleDeBien: lot.familleDeBien,
      TypeDeBien: lot.typeDeBien,
      PrixDeVenteHT: lot.prixVenteHt,
      TVA: lot.tva,
      PrixDeVenteTTC: lot.prixVenteTtc,
      curDateLivraison: comm.dateLivraison,
      Commentaire: lot.commentaire,
      NumEtage: lot.numEtage,
      Exposition: lot.exposition,
      NumParcelle: lot.numParcelle,
      Tantiemes: lot.tantiemes,
      PrixM2: lot.prixM2,
      Adresse: lot.adresse,
      CommVendeurAVerserResa: lot.commVendeurAVerserResa,
      CommVendeurAVerserActe: lot.commVendeurAVerserActe,
      TauxCommActe: lot.tauxCommActe,
      TauxCommResa: lot.tauxCommResa,
      curIDAcquereur: comm.acquereurId,
      curDateResa: comm.dateResa,
      curIDNatureAchat: comm.natureAchatId,
      curIDCommercialisation: comm.id,
      IDCommercialisation: comm.id,
      DateSignatureActeVEFA: comm.dateSignatureActeVefa,
      DateSignatureContratLoc: comm.dateSignatureContratLoc,
      DateLeveeOption: comm.dateLeveeOption,
      LibellePrestataireComm1: prestataireComm1.libelle,
      LibellePrestataireComm2: prestataireComm2.libelle,
      EstJustifFiscal: comm.estJustifFiscal,
      EstFiscalite: comm.estFiscalite,
      MotifFisca: comm.commFisca,
      PasAideRM: comm.pasAideRm,
      Loyer: comm.loyer,
      Epargne: comm.epargne,
      ConseillerCommercial: sql<
        string | null
      >`NULLIF(TRIM(CONCAT_WS(' ', ${commercial.prenom}, ${commercial.denomination})), '')`,
      LivraisonAdresse: lot.adresse,
      LivraisonCP: operation.cp,
      LivraisonCommune: operation.commune,
      IDFiscaliteAcquereur: comm.fiscaliteAcquereurId,
      curTauxTVAReel: comm.tauxTvaReel,
      curPrixDeVenteReelTTC: comm.prixVenteReelTtc,
      curRemiseClientTTC: comm.remiseClientTtc,
      DateLivraison: comm.dateLivraison,
      AvecHonoraireCourtage: comm.avecHonoraireCourtage,
      MontantHonoraireCourtageBanque: comm.montantHonoCourtageBanque,
      MontantHonoraireCourtageClient: comm.montantHonoCourtageClient,
      IDBanqueCourtage: comm.banqueCourtageId,
      AvecTMA: comm.avecTma,
      AdresseActuelle: acquereur.adresseActuelle,
      CPActuel: acquereur.cpActuel,
      Communeactuelle: acquereur.communeActuelle,
      CP: operation.cp,
      Commune: operation.commune,
    }
    const lignes = await db
      .select(colonnes)
      .from(lot)
      .innerJoin(tranche, eq(lot.trancheId, tranche.id))
      .innerJoin(operation, eq(tranche.operationId, operation.id))
      .leftJoin(comm, eq(comm.lotId, lot.id))
      .leftJoin(acquereur, eq(comm.acquereurId, acquereur.id))
      .leftJoin(commercial, eq(acquereur.conseillerCommercialId, commercial.id))
      .leftJoin(destination, eq(lot.destinationId, destination.id))
      .leftJoin(
        prestataireComm1,
        eq(comm.prestataireComm1Id, prestataireComm1.id),
      )
      .leftJoin(
        prestataireComm2,
        eq(comm.prestataireComm2Id, prestataireComm2.id),
      )
      .where(
        and(
          eq(operation.id, data.operationId),
          // HFSQL sans NULL : un lot à famille vide passe le <> 'AUTRES'
          sql`COALESCE(${lot.familleDeBien}, '') <> 'AUTRES'`,
        ),
      )
      .orderBy(asc(tranche.libelle), asc(lot.numLot))

    const entetes = Object.keys(colonnes) as Array<keyof typeof colonnes>
    return {
      nomFichier: `${op.libelle}_Commercialisation_${new Date()
        .toLocaleDateString('fr-FR')
        .replaceAll('/', '-')}.csv`.replaceAll(/[\\/]/g, '-'),
      csv: construireCsv([
        entetes,
        ...lignes.map((l) => entetes.map((e) => l[e])),
      ]),
    }
  })
