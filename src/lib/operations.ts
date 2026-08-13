// Server functions du module Opérations (FEN_TABLE_Operation) — phase 1,
// fiche partielle en lecture : identité, adresse, notaires, architectes,
// tranches, lots. Les onglets Stade d'avancement / Terrain / Infos diverses
// attendent l'ETL de la phase 3 (voir docs/plan-implementation.md).
import { createServerFn } from '@tanstack/react-start'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import {
  architecte,
  personne,
  categorieSubvention,
  certification,
  etudeNotaire,
  interlocuteurNotaire,
  label,
  listeAvancement,
  ofsNom,
  operation,
  organismeSubvention,
  performanceEnergetique,
  signataire,
  stadeAvancement,
  structureJuridique,
  subvention,
  tranche,
  missionMoeInterne,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireSession } from '#/lib/session.server.ts'

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

// Onglet « Stade d'avancement » d'une tranche. La facture liée (colonne Num
// Facture de la capture) attend le module Honoraires (phase 7).
export const getStadesFn = createServerFn({ method: 'GET' })
  .validator((data: { trancheId: number }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: stadeAvancement.id,
        stade: listeAvancement.libelle,
        code: listeAvancement.code,
        domaine: listeAvancement.domaine,
        datePreviComptaDebutAnnee: stadeAvancement.datePreviComptaDebutAnnee,
        datePreviMajPromo: stadeAvancement.datePreviMajPromo,
        dateReelle: stadeAvancement.dateReelle,
        pourcentageAvancementReel: stadeAvancement.pourcentageAvancementReel,
        montantPrevi: stadeAvancement.montantPrevi,
        commentaire: stadeAvancement.commentaire,
      })
      .from(stadeAvancement)
      .leftJoin(
        listeAvancement,
        eq(stadeAvancement.listeAvancementId, listeAvancement.id),
      )
      .where(eq(stadeAvancement.trancheId, data.trancheId))
      .orderBy(asc(stadeAvancement.ordre), asc(stadeAvancement.id))
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
