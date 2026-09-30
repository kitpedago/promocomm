// Server functions du module Opérations (FEN_TABLE_Operation) — phase 1,
// fiche partielle en lecture : identité, adresse, notaires, architectes,
// tranches, lots. Les onglets Stade d'avancement / Terrain / Infos diverses
// attendent l'ETL de la phase 3 (voir docs/plan-implementation.md).
import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import {
  architecte,
  personne,
  categorieSubvention,
  certification,
  contentieux,
  etudeNotaire,
  facture,
  interlocuteurNotaire,
  label,
  listeAvancement,
  ofsNom,
  operation,
  organismeSubvention,
  performanceEnergetique,
  prestataire,
  signataire,
  stadeAvancement,
  structureJuridique,
  subvention,
  tranche,
  typeMission,
  missionMoeInterne,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { synchroniserDates } from '#/lib/operations.helpers.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'
import { recalculerStades } from '#/lib/tranche.server.ts'

const archiMandataire = alias(architecte, 'archi_mandataire')
const chargeOpe1 = alias(personne, 'charge_ope1')
const chargeOpe2 = alias(personne, 'charge_ope2')
const stadeActuel = alias(listeAvancement, 'stade_actuel')
const stadeProchain = alias(listeAvancement, 'stade_prochain')
const archiCotraitant = alias(architecte, 'archi_cotraitant')
const signataireTerrain = alias(signataire, 'signataire_terrain')
const signataireOfs = alias(signataire, 'signataire_ofs')

// Fiche d'une opération + ses tranches (libellés de nomenclature résolus).
// Les quatre notaires sont résolus en une seule requête puis rattachés en
// mémoire (plutôt que quatre jointures alias sur interlocuteur + étude).
export const getOperationFicheFn = createServerFn({ method: 'GET' })
  .validator((data: { operationId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    const fiche = (
      await db
        .select({
          id: operation.id,
          libelle: operation.libelle,
          commune: operation.commune,
          notaireVenteId: operation.notaireVenteId,
          clercVenteId: operation.clercVenteId,
          notaireFoncierId: operation.notaireFoncierId,
          clercFoncierId: operation.clercFoncierId,
          possibiliteInvestisseur: operation.possibiliteInvestisseur,
          tauxInvestisseurAutorise: operation.tauxInvestisseurAutorise,
          commentaireInvestisseur: operation.commentaireInvestisseur,
          dateAbandon: operation.dateAbandon,
          masquerCommercial: operation.masquerCommercial,
          masquerComptable: operation.masquerComptable,
          masquerPromo: operation.masquerPromo,
          synchroniserDatesEntreTranche:
            operation.synchroniserDatesEntreTranche,
          sccvHlm: structureJuridique.sccvHlm,
          // chargés d'opération (phase 3)
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
    if (!fiche) return null

    const idsNotaires = [
      fiche.notaireVenteId,
      fiche.clercVenteId,
      fiche.notaireFoncierId,
      fiche.clercFoncierId,
    ].filter((v): v is number => v != null)
    const notaires = idsNotaires.length
      ? await db
          .select({
            id: interlocuteurNotaire.id,
            etude: etudeNotaire.nomEtude,
            libelle: sql<string>`TRIM(CONCAT_WS(' ', ${interlocuteurNotaire.civilite}, ${interlocuteurNotaire.patronyme}, ${interlocuteurNotaire.prenom}))`,
            telephone: interlocuteurNotaire.telephone,
            email: interlocuteurNotaire.email,
          })
          .from(interlocuteurNotaire)
          .leftJoin(
            etudeNotaire,
            eq(interlocuteurNotaire.etudeNotaireId, etudeNotaire.id),
          )
          .where(inArray(interlocuteurNotaire.id, idsNotaires))
      : []
    const parId = new Map(notaires.map((n) => [n.id, n]))

    const tranches = await db
      .select({
        id: tranche.id,
        libelle: tranche.libelle,
        nbLogtColl: tranche.nbLogtColl,
        dontLogtCollPsla: tranche.dontLogtCollPsla,
        dontLogtCollBrs: tranche.dontLogtCollBrs,
        nbLogtIndiv: tranche.nbLogtIndiv,
        dontLogtIndivPsla: tranche.dontLogtIndivPsla,
        dontLogtIndivBrs: tranche.dontLogtIndivBrs,
        architecteMandataireId: tranche.architecteMandataireId,
        architecteCotraitantId: tranche.architecteCotraitantId,
        architecteMandataire: archiMandataire.rs,
        architecteCotraitant: archiCotraitant.rs,
        // onglet Terrain
        terrainMontantHt: tranche.terrainMontantHt,
        terrainMontantTtc: tranche.terrainMontantTtc,
        terrainPourcAcptePrevu: tranche.terrainPourcAcptePrevu,
        terrainAcompte: tranche.terrainAcompte,
        terrainSignataire: signataireTerrain.libelle,
        terrainCommentaire: tranche.terrainCommentaire,
        ofsNom: ofsNom.libelle,
        terrainOfsMontantHt: tranche.terrainOfsMontantHt,
        terrainOfsAcptePourcPrevu: tranche.terrainOfsAcptePourcPrevu,
        terrainOfsAcpteMontantVerse: tranche.terrainOfsAcpteMontantVerse,
        terrainOfsSignataire: signataireOfs.libelle,
        terrainOfsCommentaire: tranche.terrainOfsCommentaire,
        terrainOfsCompromisDatePrevi: tranche.terrainOfsCompromisDatePrevi,
        terrainOfsCompromisDateReelle: tranche.terrainOfsCompromisDateReelle,
        terrainBailOperateurDatePrevi: tranche.terrainBailOperateurDatePrevi,
        terrainBailOperateurDateReelle: tranche.terrainBailOperateurDateReelle,
        autreMontant: tranche.autreMontant,
        autreCommentaire: tranche.autreCommentaire,
        // « Date stade Compromis » : date réelle du jalon Compromis de la tranche
        dateStadeCompromis: sql<Date | null>`(
          SELECT sa.date_reelle FROM ${stadeAvancement} sa
          JOIN ${listeAvancement} la ON la.id = sa.liste_avancement_id
          WHERE sa.tranche_id = ${tranche.id} AND la.libelle ILIKE 'compromis'
          ORDER BY sa.date_reelle NULLS LAST LIMIT 1)`,
        // stades courants de la tranche (phase 3)
        stadeActuel: stadeActuel.libelle,
        stadeProchain: stadeProchain.libelle,
        // onglet Informations diverses
        certification: certification.libelle,
        label: label.libelle,
        performanceEnergetique: performanceEnergetique.libelle,
        estMoeInterne: tranche.estMoeInterne,
        missionMoeInterne: missionMoeInterne.libelle,
        commentaireAvancement: tranche.commentaireAvancement,
      })
      .from(tranche)
      .leftJoin(
        archiMandataire,
        eq(tranche.architecteMandataireId, archiMandataire.id),
      )
      .leftJoin(
        archiCotraitant,
        eq(tranche.architecteCotraitantId, archiCotraitant.id),
      )
      .leftJoin(
        signataireTerrain,
        eq(tranche.terrainSignataireId, signataireTerrain.id),
      )
      .leftJoin(
        signataireOfs,
        eq(tranche.terrainOfsSignataireId, signataireOfs.id),
      )
      .leftJoin(ofsNom, eq(tranche.ofsNomId, ofsNom.id))
      .leftJoin(
        stadeActuel,
        eq(tranche.listeAvancementActuelId, stadeActuel.id),
      )
      .leftJoin(
        stadeProchain,
        eq(tranche.listeAvancementProchainId, stadeProchain.id),
      )
      .leftJoin(certification, eq(tranche.certificationId, certification.id))
      .leftJoin(label, eq(tranche.labelId, label.id))
      .leftJoin(
        performanceEnergetique,
        eq(tranche.performanceEnergetiqueId, performanceEnergetique.id),
      )
      .leftJoin(
        missionMoeInterne,
        eq(tranche.missionMoeInterneId, missionMoeInterne.id),
      )
      .where(eq(tranche.operationId, data.operationId))
      .orderBy(asc(tranche.id))

    return {
      ...fiche,
      notaireVente: parId.get(fiche.notaireVenteId!) ?? null,
      clercVente: parId.get(fiche.clercVenteId!) ?? null,
      notaireFoncier: parId.get(fiche.notaireFoncierId!) ?? null,
      clercFoncier: parId.get(fiche.clercFoncierId!) ?? null,
      tranches,
    }
  })

// Onglet « Stade d'avancement » d'une tranche (REQ_StadeAvancement_Operation)
export const getStadesFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: stadeAvancement.id,
        listeAvancementId: stadeAvancement.listeAvancementId,
        stade: listeAvancement.libelle,
        code: listeAvancement.code,
        domaine: listeAvancement.domaine,
        datePreviComptaDebutAnnee: stadeAvancement.datePreviComptaDebutAnnee,
        datePreviMajPromo: stadeAvancement.datePreviMajPromo,
        dateReelle: stadeAvancement.dateReelle,
        pourcentageAvancementReel: stadeAvancement.pourcentageAvancementReel,
        montantPrevi: stadeAvancement.montantPrevi,
        commentaire: stadeAvancement.commentaire,
        lienHypertexte: stadeAvancement.lienHypertexte,
        avecAppelFondClientSuppl: stadeAvancement.avecAppelFondClientSuppl,
      })
      .from(stadeAvancement)
      .leftJoin(
        listeAvancement,
        eq(stadeAvancement.listeAvancementId, listeAvancement.id),
      )
      .where(eq(stadeAvancement.trancheId, data.trancheId))
      .orderBy(asc(stadeAvancement.ordre), asc(stadeAvancement.id))
  })

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// « Synchro. dates » (REQ_SynchroTrancheDate) : le même stade sur les autres
// tranches de l'opération — vide si l'opération ou le stade ne se synchronise
// pas. `exec` : la base ou la transaction en cours.
function stadesFreres(
  exec: Pick<typeof db, 'select'>,
  trancheId: number,
  listeAvancementId: number,
) {
  return exec
    .select({
      id: stadeAvancement.id,
      trancheId: tranche.id,
      tranche: tranche.libelle,
      datePreviMajPromo: stadeAvancement.datePreviMajPromo,
      dateReelle: stadeAvancement.dateReelle,
    })
    .from(stadeAvancement)
    .innerJoin(tranche, eq(tranche.id, stadeAvancement.trancheId))
    .innerJoin(operation, eq(operation.id, tranche.operationId))
    .innerJoin(
      listeAvancement,
      eq(listeAvancement.id, stadeAvancement.listeAvancementId),
    )
    .where(
      and(
        eq(stadeAvancement.listeAvancementId, listeAvancementId),
        ne(stadeAvancement.trancheId, trancheId),
        eq(
          tranche.operationId,
          sql`(SELECT t.operation_id FROM ${tranche} t WHERE t.id = ${trancheId})`,
        ),
        eq(operation.synchroniserDatesEntreTranche, true),
        eq(listeAvancement.avecSynchroEntreTranche, true),
      ),
    )
    .orderBy(asc(tranche.id))
}

// Aperçu de la synchro dans la fiche stade (TABLE_SynchorTranche)
export const getStadesFreresFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number; listeAvancementId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return stadesFreres(db, data.trancheId, data.listeAvancementId)
  })

interface FicheStade {
  id?: number
  trancheId: number
  listeAvancementId: number | null
  datePreviComptaDebutAnnee?: string | null
  datePreviMajPromo?: string | null
  dateReelle?: string | null
  commentaire?: string | null
  lienHypertexte?: string | null
  avecAppelFondClientSuppl?: boolean | null
}

// Bouton Valider de FEN_Fiche_StadeAvancement
export const saveStadeFn = createServerFn({ method: 'POST' })
  .validator((d: FicheStade) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      datePreviComptaDebutAnnee: versDate(data.datePreviComptaDebutAnnee),
      datePreviMajPromo: versDate(data.datePreviMajPromo),
      dateReelle: versDate(data.dateReelle),
      commentaire: data.commentaire || null,
      lienHypertexte: data.lienHypertexte || null,
      avecAppelFondClientSuppl: data.avecAppelFondClientSuppl ?? null,
    }
    return db.transaction(async (tx) => {
      let cible: { id: number; trancheId: number; listeAvancementId: number }
      if (data.id) {
        // le stade ne change pas en modification (combo grisée dans WinDev)
        const touchees = await tx
          .update(stadeAvancement)
          .set(valeurs)
          .where(eq(stadeAvancement.id, data.id))
          .returning({
            id: stadeAvancement.id,
            trancheId: stadeAvancement.trancheId,
            listeAvancementId: stadeAvancement.listeAvancementId,
          })
        if (touchees.length === 0) throw new Error('Ligne introuvable')
        const touchee = touchees[0]
        // jalon legacy sans tranche ou sans stade : rien à synchroniser
        if (touchee.trancheId == null || touchee.listeAvancementId == null)
          return { id: touchee.id, tranchesSynchronisees: 0 }
        cible = {
          id: touchee.id,
          trancheId: touchee.trancheId,
          listeAvancementId: touchee.listeAvancementId,
        }
      } else {
        if (data.listeAvancementId == null)
          throw new Error("Sélectionnez un stade d'avancement")
        const refs = await tx
          .select({ ordre: listeAvancement.ordre })
          .from(listeAvancement)
          .where(eq(listeAvancement.id, data.listeAvancementId))
        if (refs.length === 0) throw new Error("Stade d'avancement introuvable")
        const doublon = await tx
          .select({ id: stadeAvancement.id })
          .from(stadeAvancement)
          .where(
            and(
              eq(stadeAvancement.trancheId, data.trancheId),
              eq(stadeAvancement.listeAvancementId, data.listeAvancementId),
            ),
          )
          .limit(1)
        if (doublon.length > 0)
          throw new Error('Ce stade existe déjà pour cette tranche.')
        const [cree] = await tx
          .insert(stadeAvancement)
          .values({
            ...valeurs,
            trancheId: data.trancheId,
            listeAvancementId: data.listeAvancementId,
            ordre: refs[0].ordre,
          })
          .returning({ id: stadeAvancement.id })
        cible = {
          id: cree.id,
          trancheId: data.trancheId,
          listeAvancementId: data.listeAvancementId,
        }
      }

      const freres = await stadesFreres(
        tx,
        cible.trancheId,
        cible.listeAvancementId,
      )
      for (const f of synchroniserDates(valeurs, freres))
        await tx
          .update(stadeAvancement)
          .set({
            datePreviMajPromo: f.datePreviMajPromo,
            dateReelle: f.dateReelle,
          })
          .where(eq(stadeAvancement.id, f.id))
      await recalculerStades(tx, [
        cible.trancheId,
        ...freres.map((f) => f.trancheId),
      ])
      // annoncé par la saisie en ligne, qui n'a pas l'aperçu de la fiche
      return { id: cible.id, tranchesSynchronisees: freres.length }
    })
  })

export const deleteStadeFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    // WinDev supprimait le stade en laissant ses factures orphelines
    const [{ n }] = await db
      .select({ n: count() })
      .from(facture)
      .where(eq(facture.stadeAvancementId, data.id))
    if (n > 0)
      throw new Error(
        `Suppression impossible : ${n} facture(s) rattachée(s) à ce stade.`,
      )
    await db.transaction(async (tx) => {
      const supprimes = await tx
        .delete(stadeAvancement)
        .where(eq(stadeAvancement.id, data.id))
        .returning({ trancheId: stadeAvancement.trancheId })
      await recalculerStades(
        tx,
        supprimes.flatMap((s) => s.trancheId ?? []),
      )
    })
  })

// ---------------------------------------------------------------------------
// Table Facture de l'onglet « Stade d'avancement » — factures du jalon
// sélectionné (TABLE_Facture, tFacture)
// ---------------------------------------------------------------------------

export const getFacturesFn = createServerFn({ method: 'GET' })
  .validator((data: { stadeAvancementId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: facture.id,
        typeMissionId: facture.typeMissionId,
        typeMission: typeMission.libelle,
        prestataireId: facture.prestataireId,
        prestataire: prestataire.libelle,
        numFacture: facture.numFacture,
        dateFacture: facture.dateFacture,
        partiel: facture.partiel,
        montantHt: facture.montantHt,
        nbMois: facture.nbMois,
        commentaire: facture.commentaire,
      })
      .from(facture)
      .leftJoin(typeMission, eq(typeMission.id, facture.typeMissionId))
      .leftJoin(prestataire, eq(prestataire.id, facture.prestataireId))
      .where(eq(facture.stadeAvancementId, data.stadeAvancementId))
      .orderBy(asc(facture.dateFacture), asc(facture.id))
  })

interface FicheFacture {
  id?: number
  stadeAvancementId: number
  typeMissionId?: number | null
  prestataireId?: number | null
  numFacture?: number | null
  dateFacture?: string | null
  partiel?: boolean | null
  montantHt?: number | null
  nbMois?: number | null
  commentaire?: string | null
}

export const saveFactureFn = createServerFn({ method: 'POST' })
  .validator((d: FicheFacture) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      stadeAvancementId: data.stadeAvancementId,
      typeMissionId: data.typeMissionId ?? null,
      prestataireId: data.prestataireId ?? null,
      numFacture: data.numFacture ?? null,
      dateFacture: versDate(data.dateFacture),
      partiel: data.partiel ?? null,
      montantHt: data.montantHt ?? null,
      nbMois: data.nbMois ?? null,
      commentaire: data.commentaire || null,
    }
    if (data.id) {
      const touchees = await db
        .update(facture)
        .set(valeurs)
        .where(eq(facture.id, data.id))
        .returning({ id: facture.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(facture)
      .values(valeurs)
      .returning({ id: facture.id })
    return { id: cree.id }
  })

export const deleteFactureFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(facture).where(eq(facture.id, data.id))
  })

// Bloc « Subventions de la tranche » de l'onglet Informations diverses
// (déblocages et suivi budgétaire en phase 6)
export const getSubventionsFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: subvention.id,
        categorieId: subvention.categorieId,
        organismeId: subvention.organismeId,
        categorie: categorieSubvention.libelle,
        organisme: organismeSubvention.libelle,
        numConvention: subvention.numConvention,
        dateConvention: subvention.dateConvention,
        dateCaducite: subvention.dateCaducite,
        budgetPreviMontant: subvention.budgetPreviMontant,
        budgetPreviCommentaire: subvention.budgetPreviCommentaire,
        montantAgrement: subvention.montantAgrement,
        montantProvisoire: subvention.montantProvisoire,
        montantDefinitif: subvention.montantDefinitif,
        finDeSuivi: subvention.finDeSuivi,
        commentaire: subvention.commentaire,
      })
      .from(subvention)
      .leftJoin(
        categorieSubvention,
        eq(subvention.categorieId, categorieSubvention.id),
      )
      .leftJoin(
        organismeSubvention,
        eq(subvention.organismeId, organismeSubvention.id),
      )
      .where(eq(subvention.trancheId, data.trancheId))
      .orderBy(asc(subvention.dateConvention))
  })

// ---------------------------------------------------------------------------
// Onglet « Contentieux » — table par opération (FEN_Table_Contentieux)
// ---------------------------------------------------------------------------

export const getContentieuxFn = createServerFn({ method: 'GET' })
  .validator((data: { operationId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select()
      .from(contentieux)
      .where(eq(contentieux.operationId, data.operationId))
      .orderBy(asc(contentieux.dateDebut), asc(contentieux.id))
  })

interface FicheContentieux {
  id?: number
  operationId: number
  objet?: string | null
  dateDebut?: string | null
  dateFin?: string | null
  avocats?: string | null
  commentaires?: string | null
}

export const saveContentieuxFn = createServerFn({ method: 'POST' })
  .validator((d: FicheContentieux) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      operationId: data.operationId,
      objet: data.objet || null,
      dateDebut: versDate(data.dateDebut),
      dateFin: versDate(data.dateFin),
      avocats: data.avocats || null,
      commentaires: data.commentaires || null,
    }
    if (data.id) {
      const touchees = await db
        .update(contentieux)
        .set(valeurs)
        .where(eq(contentieux.id, data.id))
        .returning({ id: contentieux.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(contentieux)
      .values(valeurs)
      .returning({ id: contentieux.id })
    return { id: cree.id }
  })

export const deleteContentieuxFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(contentieux).where(eq(contentieux.id, data.id))
  })

// Bouton « Modifier » du bloc Détails opération → modale Operation_Simple
// WinDev : investisseur + masquages + notaires (opération), architectes
// (tranche). Les listes viennent de getOtlOptionsFn (Paramètres > OTL).
export const saveOperationSimpleFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      operationId: number
      trancheId: number
      possibiliteInvestisseur: boolean | null
      tauxInvestisseurAutorise: number | null
      commentaireInvestisseur: string | null
      masquerCommercial: boolean | null
      masquerComptable: boolean | null
      masquerPromo: boolean | null
      notaireVenteId: number | null
      clercVenteId: number | null
      notaireFoncierId: number | null
      clercFoncierId: number | null
      architecteMandataireId: number | null
      architecteCotraitantId: number | null
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireEcriture()
    const touchees = await db
      .update(operation)
      .set({
        possibiliteInvestisseur: data.possibiliteInvestisseur,
        tauxInvestisseurAutorise: data.tauxInvestisseurAutorise,
        commentaireInvestisseur: data.commentaireInvestisseur || null,
        masquerCommercial: data.masquerCommercial,
        masquerComptable: data.masquerComptable,
        masquerPromo: data.masquerPromo,
        notaireVenteId: data.notaireVenteId,
        clercVenteId: data.clercVenteId,
        notaireFoncierId: data.notaireFoncierId,
        clercFoncierId: data.clercFoncierId,
      })
      .where(eq(operation.id, data.operationId))
      .returning({ id: operation.id })
    if (touchees.length === 0) throw new Error('Opération introuvable')
    await db
      .update(tranche)
      .set({
        architecteMandataireId: data.architecteMandataireId,
        architecteCotraitantId: data.architecteCotraitantId,
      })
      .where(eq(tranche.id, data.trancheId))
  })
