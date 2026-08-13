// Paramètres > « Opérations, tranches et lots » (FEN_Param, phase 9) —
// gestion directe : création/édition/suppression des trois niveaux de la
// colonne vertébrale. Les suppressions s'appuient sur les FK Postgres : une
// opération avec tranches, une tranche avec lots ou un lot déjà commercialisé
// sont refusés avec le message de contrainte (pas de cascade silencieuse).
// L'import Excel de lots WinDev repose sur la table ChampImportLot, absente
// du .bak importé — reporté (voir docs/plan-implementation.md).
import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'

import {
  architecte,
  certification,
  destination,
  etudeNotaire,
  interlocuteurNotaire,
  label,
  lot,
  missionMoeInterne,
  ofsNom,
  operation,
  performanceEnergetique,
  secteurGeographique,
  signataire,
  structureJuridique,
  tranche,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// Options des fiches (une requête groupée, cache client)
export const getOtlOptionsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    const [
      structures,
      secteurs,
      notaires,
      architectes,
      certifications,
      labels,
      performances,
      missionsMoe,
      signataires,
      ofs,
      destinations,
    ] = await Promise.all([
      db
        .select({ id: structureJuridique.id, libelle: structureJuridique.rs })
        .from(structureJuridique)
        .orderBy(asc(structureJuridique.rs)),
      db
        .select()
        .from(secteurGeographique)
        .orderBy(asc(secteurGeographique.libelle)),
      db
        .select({
          id: interlocuteurNotaire.id,
          libelle: interlocuteurNotaire.patronyme,
          etude: etudeNotaire.nomEtude,
        })
        .from(interlocuteurNotaire)
        .leftJoin(
          etudeNotaire,
          eq(interlocuteurNotaire.etudeNotaireId, etudeNotaire.id),
        )
        .orderBy(asc(interlocuteurNotaire.patronyme)),
      db
        .select({ id: architecte.id, libelle: architecte.rs })
        .from(architecte)
        .orderBy(asc(architecte.rs)),
      db.select().from(certification).orderBy(asc(certification.libelle)),
      db.select().from(label).orderBy(asc(label.libelle)),
      db
        .select()
        .from(performanceEnergetique)
        .orderBy(asc(performanceEnergetique.libelle)),
      db
        .select()
        .from(missionMoeInterne)
        .orderBy(asc(missionMoeInterne.libelle)),
      db.select().from(signataire).orderBy(asc(signataire.libelle)),
      db.select().from(ofsNom).orderBy(asc(ofsNom.libelle)),
      db
        .select({ id: destination.id, libelle: destination.libelle })
        .from(destination)
        .orderBy(asc(destination.libelle)),
    ])
    return {
      structures,
      secteurs,
      notaires: notaires.map((n) => ({
        id: n.id,
        libelle: `${n.libelle ?? ''}${n.etude ? ` (${n.etude})` : ''}`,
      })),
      architectes,
      certifications,
      labels,
      performances,
      missionsMoe,
      signataires,
      ofs,
      destinations,
    }
  },
)

// Lignes brutes des trois niveaux (les champs des fiches, pas de libellés
// résolus : les tables OTL en affichent peu et les modales veulent les ids)
export const getOperationsOtlFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    return db
      .select({
        id: operation.id,
        libelle: operation.libelle,
        structureJuridiqueId: operation.structureJuridiqueId,
        sccv: structureJuridique.rs,
        adresse: operation.adresse,
        cp: operation.cp,
        commune: operation.commune,
        nomZac: operation.nomZac,
        secteurGeographiqueId: operation.secteurGeographiqueId,
        surRennesMetropole: operation.surRennesMetropole,
        anru: operation.anru,
        anruCommentaire: operation.anruCommentaire,
        abreviationCodeReserve: operation.abreviationCodeReserve,
        notaireVenteId: operation.notaireVenteId,
        clercVenteId: operation.clercVenteId,
        notaireFoncierId: operation.notaireFoncierId,
        clercFoncierId: operation.clercFoncierId,
        possibiliteInvestisseur: operation.possibiliteInvestisseur,
        tauxInvestisseurAutorise: operation.tauxInvestisseurAutorise,
        commentaireInvestisseur: operation.commentaireInvestisseur,
        dateValidationEngagement: operation.dateValidationEngagement,
        dateAbandon: operation.dateAbandon,
        commentairesAbandon: operation.commentairesAbandon,
        masquerCommercial: operation.masquerCommercial,
        masquerComptable: operation.masquerComptable,
        masquerPromo: operation.masquerPromo,
        commentaire: operation.commentaire,
      })
      .from(operation)
      .leftJoin(
        structureJuridique,
        eq(operation.structureJuridiqueId, structureJuridique.id),
      )
      .orderBy(asc(operation.libelle))
  },
)

export const getTranchesOtlFn = createServerFn({ method: 'GET' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select({
        id: tranche.id,
        libelle: tranche.libelle,
        adresse: tranche.adresse,
        nbLogtIndiv: tranche.nbLogtIndiv,
        nbLogtColl: tranche.nbLogtColl,
        nbAutresLocaux: tranche.nbAutresLocaux,
        nbTerrain: tranche.nbTerrain,
        dontLogtCollPsla: tranche.dontLogtCollPsla,
        dontLogtIndivPsla: tranche.dontLogtIndivPsla,
        dontLogtCollBrs: tranche.dontLogtCollBrs,
        dontLogtIndivBrs: tranche.dontLogtIndivBrs,
        nbEtage: tranche.nbEtage,
        nbLvoPrev: tranche.nbLvoPrev,
        dureeChantierMois: tranche.dureeChantierMois,
        dateConvention: tranche.dateConvention,
        dateLivraisonContractuelle: tranche.dateLivraisonContractuelle,
        architecteMandataireId: tranche.architecteMandataireId,
        architecteCotraitantId: tranche.architecteCotraitantId,
        certificationId: tranche.certificationId,
        labelId: tranche.labelId,
        performanceEnergetiqueId: tranche.performanceEnergetiqueId,
        estMoeInterne: tranche.estMoeInterne,
        missionMoeInterneId: tranche.missionMoeInterneId,
        terrainMontantHt: tranche.terrainMontantHt,
        terrainMontantTtc: tranche.terrainMontantTtc,
        terrainPourcAcptePrevu: tranche.terrainPourcAcptePrevu,
        terrainAcompte: tranche.terrainAcompte,
        terrainSignataireId: tranche.terrainSignataireId,
        terrainCommentaire: tranche.terrainCommentaire,
        ofsNomId: tranche.ofsNomId,
        terrainOfsMontantHt: tranche.terrainOfsMontantHt,
        terrainOfsSignataireId: tranche.terrainOfsSignataireId,
        commentaire: tranche.commentaire,
      })
      .from(tranche)
      .where(eq(tranche.operationId, data.operationId))
      .orderBy(asc(tranche.id))
  })

export const getLotsOtlFn = createServerFn({ method: 'GET' })
  .validator((d: { trancheId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    return db
      .select()
      .from(lot)
      .where(eq(lot.trancheId, data.trancheId))
      .orderBy(asc(lot.numLot))
  })

async function upsert(
  table: any,
  id: number | undefined,
  valeurs: Record<string, unknown>,
) {
  if (id) {
    const touchees = await db
      .update(table)
      .set(valeurs)
      .where(eq(table.id, id))
      .returning({ id: table.id })
    if (touchees.length === 0) throw new Error('Ligne introuvable')
    return { id }
  }
  const [cree] = await db
    .insert(table)
    .values(valeurs)
    .returning({ id: table.id })
  return { id: cree.id as number }
}

// --- Opération ---

interface FicheOperation {
  id?: number
  libelle?: string | null
  structureJuridiqueId?: number | null
  adresse?: string | null
  cp?: string | null
  commune?: string | null
  nomZac?: string | null
  secteurGeographiqueId?: number | null
  surRennesMetropole?: boolean | null
  anru?: boolean | null
  anruCommentaire?: string | null
  abreviationCodeReserve?: string | null
  notaireVenteId?: number | null
  clercVenteId?: number | null
  notaireFoncierId?: number | null
  clercFoncierId?: number | null
  possibiliteInvestisseur?: boolean | null
  tauxInvestisseurAutorise?: number | null
  commentaireInvestisseur?: string | null
  dateValidationEngagement?: string | null
  dateAbandon?: string | null
  commentairesAbandon?: string | null
  masquerCommercial?: boolean | null
  masquerComptable?: boolean | null
  masquerPromo?: boolean | null
  commentaire?: string | null
}

export const saveOperationOtlFn = createServerFn({ method: 'POST' })
  .validator((d: FicheOperation) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    if (!data.libelle?.trim()) throw new Error('Le libellé est obligatoire')
    return upsert(operation, data.id, {
      libelle: data.libelle.trim(),
      structureJuridiqueId: data.structureJuridiqueId ?? null,
      adresse: data.adresse || null,
      cp: data.cp || null,
      commune: data.commune || null,
      nomZac: data.nomZac || null,
      secteurGeographiqueId: data.secteurGeographiqueId ?? null,
      surRennesMetropole: data.surRennesMetropole ?? null,
      anru: data.anru ?? null,
      anruCommentaire: data.anruCommentaire || null,
      abreviationCodeReserve: data.abreviationCodeReserve || null,
      notaireVenteId: data.notaireVenteId ?? null,
      clercVenteId: data.clercVenteId ?? null,
      notaireFoncierId: data.notaireFoncierId ?? null,
      clercFoncierId: data.clercFoncierId ?? null,
      possibiliteInvestisseur: data.possibiliteInvestisseur ?? null,
      tauxInvestisseurAutorise: data.tauxInvestisseurAutorise ?? null,
      commentaireInvestisseur: data.commentaireInvestisseur || null,
      dateValidationEngagement: versDate(data.dateValidationEngagement),
      dateAbandon: versDate(data.dateAbandon),
      commentairesAbandon: data.commentairesAbandon || null,
      masquerCommercial: data.masquerCommercial ?? null,
      masquerComptable: data.masquerComptable ?? null,
      masquerPromo: data.masquerPromo ?? null,
      commentaire: data.commentaire || null,
    })
  })

export const deleteOperationOtlFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(operation).where(eq(operation.id, data.id))
  })

// --- Tranche ---

interface FicheTranche {
  id?: number
  operationId: number
  libelle?: string | null
  adresse?: string | null
  nbLogtIndiv?: number | null
  nbLogtColl?: number | null
  nbAutresLocaux?: number | null
  nbTerrain?: number | null
  dontLogtCollPsla?: number | null
  dontLogtIndivPsla?: number | null
  dontLogtCollBrs?: number | null
  dontLogtIndivBrs?: number | null
  nbEtage?: number | null
  nbLvoPrev?: number | null
  dureeChantierMois?: number | null
  dateConvention?: string | null
  dateLivraisonContractuelle?: string | null
  architecteMandataireId?: number | null
  architecteCotraitantId?: number | null
  certificationId?: number | null
  labelId?: number | null
  performanceEnergetiqueId?: number | null
  estMoeInterne?: boolean | null
  missionMoeInterneId?: number | null
  terrainMontantHt?: number | null
  terrainMontantTtc?: number | null
  terrainPourcAcptePrevu?: number | null
  terrainAcompte?: number | null
  terrainSignataireId?: number | null
  terrainCommentaire?: string | null
  ofsNomId?: number | null
  terrainOfsMontantHt?: number | null
  terrainOfsSignataireId?: number | null
  commentaire?: string | null
}

export const saveTrancheOtlFn = createServerFn({ method: 'POST' })
  .validator((d: FicheTranche) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    return upsert(tranche, data.id, {
      operationId: data.operationId,
      libelle: data.libelle || null,
      adresse: data.adresse || null,
      nbLogtIndiv: data.nbLogtIndiv ?? null,
      nbLogtColl: data.nbLogtColl ?? null,
      nbAutresLocaux: data.nbAutresLocaux ?? null,
      nbTerrain: data.nbTerrain ?? null,
      dontLogtCollPsla: data.dontLogtCollPsla ?? null,
      dontLogtIndivPsla: data.dontLogtIndivPsla ?? null,
      dontLogtCollBrs: data.dontLogtCollBrs ?? null,
      dontLogtIndivBrs: data.dontLogtIndivBrs ?? null,
      nbEtage: data.nbEtage ?? null,
      nbLvoPrev: data.nbLvoPrev ?? null,
      dureeChantierMois: data.dureeChantierMois ?? null,
      dateConvention: versDate(data.dateConvention),
      dateLivraisonContractuelle: versDate(data.dateLivraisonContractuelle),
      architecteMandataireId: data.architecteMandataireId ?? null,
      architecteCotraitantId: data.architecteCotraitantId ?? null,
      certificationId: data.certificationId ?? null,
      labelId: data.labelId ?? null,
      performanceEnergetiqueId: data.performanceEnergetiqueId ?? null,
      estMoeInterne: data.estMoeInterne ?? null,
      missionMoeInterneId: data.missionMoeInterneId ?? null,
      terrainMontantHt: data.terrainMontantHt ?? null,
      terrainMontantTtc: data.terrainMontantTtc ?? null,
      terrainPourcAcptePrevu: data.terrainPourcAcptePrevu ?? null,
      terrainAcompte: data.terrainAcompte ?? null,
      terrainSignataireId: data.terrainSignataireId ?? null,
      terrainCommentaire: data.terrainCommentaire || null,
      ofsNomId: data.ofsNomId ?? null,
      terrainOfsMontantHt: data.terrainOfsMontantHt ?? null,
      terrainOfsSignataireId: data.terrainOfsSignataireId ?? null,
      commentaire: data.commentaire || null,
    })
  })

export const deleteTrancheOtlFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(tranche).where(eq(tranche.id, data.id))
  })

// --- Lot ---

interface FicheLot {
  id?: number
  trancheId: number
  numLot?: string | null
  destinationId?: number | null
  lotAssocie?: string | null
  familleDeBien?: string | null
  typeDeBien?: string | null
  designation?: string | null
  adresse?: string | null
  numEtage?: string | null
  exposition?: string | null
  numParcelle?: string | null
  numCopropriete?: string | null
  tantiemes?: number | null
  estPartieCommune?: boolean | null
  surfHabitable?: number | null
  surfaceUtile?: number | null
  surfTerrasse?: number | null
  surfGarage?: number | null
  surfCave?: number | null
  surfBalcon?: number | null
  surfLoggias?: number | null
  surfRemise?: number | null
  surfJardin?: number | null
  surfTerrain?: number | null
  prixOrigine?: number | null
  prixVenteHt?: number | null
  prixVenteTtc?: number | null
  tva?: number | null
  prixM2?: number | null
  commentaire?: string | null
  notes?: string | null
}

export const saveLotOtlFn = createServerFn({ method: 'POST' })
  .validator((d: FicheLot) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    if (!data.numLot?.trim())
      throw new Error('Le numéro de lot est obligatoire')
    return upsert(lot, data.id, {
      trancheId: data.trancheId,
      numLot: data.numLot.trim(),
      destinationId: data.destinationId ?? null,
      lotAssocie: data.lotAssocie || null,
      familleDeBien: data.familleDeBien || null,
      typeDeBien: data.typeDeBien || null,
      designation: data.designation || null,
      adresse: data.adresse || null,
      numEtage: data.numEtage || null,
      exposition: data.exposition || null,
      numParcelle: data.numParcelle || null,
      numCopropriete: data.numCopropriete || null,
      tantiemes: data.tantiemes ?? null,
      estPartieCommune: data.estPartieCommune ?? null,
      surfHabitable: data.surfHabitable ?? null,
      surfaceUtile: data.surfaceUtile ?? null,
      surfTerrasse: data.surfTerrasse ?? null,
      surfGarage: data.surfGarage ?? null,
      surfCave: data.surfCave ?? null,
      surfBalcon: data.surfBalcon ?? null,
      surfLoggias: data.surfLoggias ?? null,
      surfRemise: data.surfRemise ?? null,
      surfJardin: data.surfJardin ?? null,
      surfTerrain: data.surfTerrain ?? null,
      prixOrigine: data.prixOrigine ?? null,
      prixVenteHt: data.prixVenteHt ?? null,
      prixVenteTtc: data.prixVenteTtc ?? null,
      tva: data.tva ?? null,
      prixM2: data.prixM2 ?? null,
      commentaire: data.commentaire || null,
      notes: data.notes || null,
    })
  })

export const deleteLotOtlFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(lot).where(eq(lot.id, data.id))
  })
