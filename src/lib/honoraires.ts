// Server functions du module Honoraires (FEN_TABLE_Honoraire) — phase 7.
// Deux accordéons par tranche : missions suivant convention (+ grille de
// facturation par stade) et honoraires de commercialisation (barème par
// nature d'achat + factures). Volet Opérations/tranche : pattern compta.tsx.
import { createServerFn } from '@tanstack/react-start'
import { asc, eq, inArray } from 'drizzle-orm'

import {
  baremeHonoComm,
  grilleFacturation,
  honoCommFacture,
  honoCommNatureAchat,
  listeAvancement,
  mission,
  natureAchat,
  prestataire,
  typeMission,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

export const getHonorairesFn = createServerFn({ method: 'GET' })
  .validator((d: { trancheId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const [missions, natures, factures] = await Promise.all([
      db
        .select({
          id: mission.id,
          trancheId: mission.trancheId,
          dateConvention: mission.dateConvention,
          nbLogement: mission.nbLogement,
          baseHonoUnitaireHt: mission.baseHonoUnitaireHt,
          baseHonoHt: mission.baseHonoHt,
          typeMissionId: mission.typeMissionId,
          typeMission: typeMission.libelle,
          prestataireId: mission.prestataireId,
          prestataire: prestataire.libelle,
          finFacturation: mission.finFacturation,
          commentaire: mission.commentaire,
          ordre: mission.ordre,
          nbMois: mission.nbMois,
          dateFactCommKpiExtContratOfs: mission.dateFactCommKpiExtContratOfs,
        })
        .from(mission)
        .leftJoin(typeMission, eq(typeMission.id, mission.typeMissionId))
        .leftJoin(prestataire, eq(prestataire.id, mission.prestataireId))
        .where(eq(mission.trancheId, data.trancheId))
        .orderBy(asc(mission.dateConvention), asc(mission.id)),
      db
        .select({
          id: honoCommNatureAchat.id,
          trancheId: honoCommNatureAchat.trancheId,
          natureAchatId: honoCommNatureAchat.natureAchatId,
          natureAchat: natureAchat.libelle,
          montantCla: honoCommNatureAchat.montantCla,
          montantLeveeOption: honoCommNatureAchat.montantLeveeOption,
          montantResa: honoCommNatureAchat.montantResa,
          montantActe: honoCommNatureAchat.montantActe,
          pourcentageResa: honoCommNatureAchat.pourcentageResa,
          pourcentageActe: honoCommNatureAchat.pourcentageActe,
          commentaires: honoCommNatureAchat.commentaires,
        })
        .from(honoCommNatureAchat)
        .leftJoin(
          natureAchat,
          eq(natureAchat.id, honoCommNatureAchat.natureAchatId),
        )
        .where(eq(honoCommNatureAchat.trancheId, data.trancheId))
        .orderBy(asc(natureAchat.ordreComm)),
      db
        .select({
          id: honoCommFacture.id,
          trancheId: honoCommFacture.trancheId,
          prestataireId: honoCommFacture.prestataireId,
          prestataire: prestataire.libelle,
          baremeHonoCommId: honoCommFacture.baremeHonoCommId,
          bareme: baremeHonoComm.libelle,
          numFacture: honoCommFacture.numFacture,
          dateFacture: honoCommFacture.dateFacture,
          nbCla: honoCommFacture.nbCla,
          montantCla: honoCommFacture.montantCla,
          nbLeveeOption: honoCommFacture.nbLeveeOption,
          montantLeveeOption: honoCommFacture.montantLeveeOption,
          nbResa: honoCommFacture.nbResa,
          montantResa: honoCommFacture.montantResa,
          nbActe: honoCommFacture.nbActe,
          montantActe: honoCommFacture.montantActe,
          commentaires: honoCommFacture.commentaires,
        })
        .from(honoCommFacture)
        .leftJoin(
          prestataire,
          eq(prestataire.id, honoCommFacture.prestataireId),
        )
        .leftJoin(
          baremeHonoComm,
          eq(baremeHonoComm.id, honoCommFacture.baremeHonoCommId),
        )
        .where(eq(honoCommFacture.trancheId, data.trancheId))
        .orderBy(asc(honoCommFacture.dateFacture), asc(honoCommFacture.id)),
    ])
    // grilles de toutes les missions de la tranche (filtrées côté client sur
    // la mission sélectionnée, comme le GrilleFacturation.Filter de WinDev)
    const grilles =
      missions.length === 0
        ? []
        : await db
            .select({
              id: grilleFacturation.id,
              missionId: grilleFacturation.missionId,
              listeAvancementId: grilleFacturation.listeAvancementId,
              stade: listeAvancement.libelle,
              code: listeAvancement.code,
              stadeOrdre: listeAvancement.ordre,
              pourcentage: grilleFacturation.pourcentage,
              montant: grilleFacturation.montant,
            })
            .from(grilleFacturation)
            .leftJoin(
              listeAvancement,
              eq(listeAvancement.id, grilleFacturation.listeAvancementId),
            )
            .where(
              inArray(
                grilleFacturation.missionId,
                missions.map((m) => m.id),
              ),
            )
            .orderBy(asc(listeAvancement.ordre))
    return { missions, grilles, natures, factures }
  })

// Nomenclatures des modales (types de mission, prestataires, stades, natures)
export const getHonorairesNomenclaturesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireSession()
  const [
    typesMission,
    prestataires,
    stades,
    naturesAchat,
    tousPrestataires,
    baremesHonoComm,
  ] = await Promise.all([
    db.select().from(typeMission).orderBy(asc(typeMission.libelle)),
    // iso-WinDev (REQ_PrestataireMission) : seuls les prestataires
    // « AfficherMission » sont proposés sur la fiche mission
    db
      .select({ id: prestataire.id, libelle: prestataire.libelle })
      .from(prestataire)
      .where(eq(prestataire.afficherMission, true))
      .orderBy(asc(prestataire.libelle)),
    db
      .select({
        id: listeAvancement.id,
        libelle: listeAvancement.libelle,
        code: listeAvancement.code,
      })
      .from(listeAvancement)
      .orderBy(asc(listeAvancement.ordre)),
    db
      .select({ id: natureAchat.id, libelle: natureAchat.libelle })
      .from(natureAchat)
      .orderBy(asc(natureAchat.libelle)),
    // factures d'honoraires de commercialisation : tous les prestataires
    db
      .select({ id: prestataire.id, libelle: prestataire.libelle })
      .from(prestataire)
      .orderBy(asc(prestataire.libelle)),
    db.select().from(baremeHonoComm).orderBy(asc(baremeHonoComm.libelle)),
  ])
  return {
    typesMission,
    prestataires,
    stades,
    naturesAchat,
    tousPrestataires,
    baremesHonoComm,
  }
})

// --- Missions suivant convention ---

interface FicheMission {
  id?: number
  trancheId: number
  dateConvention?: string | null
  nbLogement?: number | null
  baseHonoUnitaireHt?: number | null
  baseHonoHt?: number | null
  typeMissionId?: number | null
  prestataireId?: number | null
  finFacturation?: boolean | null
  commentaire?: string | null
  ordre?: number | null
  nbMois?: number | null
  dateFactCommKpiExtContratOfs?: string | null
}

export const saveMissionFn = createServerFn({ method: 'POST' })
  .validator((d: FicheMission) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    // iso-WinDev : « Sélectionner un type de mission » bloquant
    if (data.typeMissionId == null)
      throw new Error('Sélectionner un type de mission')
    const valeurs = {
      trancheId: data.trancheId,
      dateConvention: versDate(data.dateConvention),
      nbLogement: data.nbLogement ?? null,
      baseHonoUnitaireHt: data.baseHonoUnitaireHt ?? null,
      baseHonoHt: data.baseHonoHt ?? null,
      typeMissionId: data.typeMissionId,
      prestataireId: data.prestataireId ?? null,
      finFacturation: data.finFacturation ?? null,
      commentaire: data.commentaire || null,
      ordre: data.ordre ?? null,
      nbMois: data.nbMois ?? null,
      dateFactCommKpiExtContratOfs: versDate(data.dateFactCommKpiExtContratOfs),
    }
    if (data.id) {
      const touchees = await db
        .update(mission)
        .set(valeurs)
        .where(eq(mission.id, data.id))
        .returning({ id: mission.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(mission)
      .values(valeurs)
      .returning({ id: mission.id })
    return { id: cree.id }
  })

export const deleteMissionFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    // la grille de facturation suit (FK on delete cascade)
    await db.delete(mission).where(eq(mission.id, data.id))
  })

// --- Grille de facturation ---

interface FicheGrille {
  id?: number
  missionId: number
  listeAvancementId?: number | null
  /** fraction 0–1 (la conversion % ↔ fraction est faite côté client) */
  pourcentage?: number | null
  montant?: number | null
}

export const saveGrilleFn = createServerFn({ method: 'POST' })
  .validator((d: FicheGrille) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      missionId: data.missionId,
      listeAvancementId: data.listeAvancementId ?? null,
      pourcentage: data.pourcentage ?? null,
      montant: data.montant ?? null,
    }
    if (data.id) {
      const touchees = await db
        .update(grilleFacturation)
        .set(valeurs)
        .where(eq(grilleFacturation.id, data.id))
        .returning({ id: grilleFacturation.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(grilleFacturation)
      .values(valeurs)
      .returning({ id: grilleFacturation.id })
    return { id: cree.id }
  })

export const deleteGrilleFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(grilleFacturation).where(eq(grilleFacturation.id, data.id))
  })

// Bouton « Importer » : recopie les stades « Avec hono Gestion » avec leur
// % standard (grisé côté client si la mission a déjà une grille)
export const importerGrilleFn = createServerFn({ method: 'POST' })
  .validator((d: { missionId: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const existantes = await db
      .select({ id: grilleFacturation.id })
      .from(grilleFacturation)
      .where(eq(grilleFacturation.missionId, data.missionId))
    if (existantes.length > 0)
      throw new Error('La mission a déjà une grille de facturation')
    const stades = await db
      .select()
      .from(listeAvancement)
      .where(eq(listeAvancement.avecHonoGestion, true))
      .orderBy(asc(listeAvancement.ordre))
    if (stades.length > 0)
      await db.insert(grilleFacturation).values(
        stades.map((s) => ({
          missionId: data.missionId,
          listeAvancementId: s.id,
          pourcentage: s.pourcentageStandard,
        })),
      )
    return { inserees: stades.length }
  })

// --- Barème de commercialisation par nature d'achat ---

interface FicheNature {
  id?: number
  trancheId: number
  natureAchatId?: number | null
  montantCla?: number | null
  montantLeveeOption?: number | null
  montantResa?: number | null
  montantActe?: number | null
  /** fractions 0–1 (conversion % ↔ fraction côté client) */
  pourcentageResa?: number | null
  pourcentageActe?: number | null
  commentaires?: string | null
}

export const saveNatureFn = createServerFn({ method: 'POST' })
  .validator((d: FicheNature) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      trancheId: data.trancheId,
      natureAchatId: data.natureAchatId ?? null,
      montantCla: data.montantCla ?? null,
      montantLeveeOption: data.montantLeveeOption ?? null,
      montantResa: data.montantResa ?? null,
      montantActe: data.montantActe ?? null,
      pourcentageResa: data.pourcentageResa ?? null,
      pourcentageActe: data.pourcentageActe ?? null,
      commentaires: data.commentaires || null,
    }
    if (data.id) {
      const touchees = await db
        .update(honoCommNatureAchat)
        .set(valeurs)
        .where(eq(honoCommNatureAchat.id, data.id))
        .returning({ id: honoCommNatureAchat.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(honoCommNatureAchat)
      .values(valeurs)
      .returning({ id: honoCommNatureAchat.id })
    return { id: cree.id }
  })

export const deleteNatureFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db
      .delete(honoCommNatureAchat)
      .where(eq(honoCommNatureAchat.id, data.id))
  })

// --- Factures d'honoraires de commercialisation ---

interface FicheFacture {
  id?: number
  trancheId: number
  prestataireId?: number | null
  baremeHonoCommId?: number | null
  numFacture?: number | null
  dateFacture?: string | null
  nbCla?: number | null
  montantCla?: number | null
  nbLeveeOption?: number | null
  montantLeveeOption?: number | null
  nbResa?: number | null
  montantResa?: number | null
  nbActe?: number | null
  montantActe?: number | null
  commentaires?: string | null
}

export const saveFactureFn = createServerFn({ method: 'POST' })
  .validator((d: FicheFacture) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      trancheId: data.trancheId,
      prestataireId: data.prestataireId ?? null,
      baremeHonoCommId: data.baremeHonoCommId ?? null,
      numFacture: data.numFacture ?? null,
      dateFacture: versDate(data.dateFacture),
      nbCla: data.nbCla ?? null,
      montantCla: data.montantCla ?? null,
      nbLeveeOption: data.nbLeveeOption ?? null,
      montantLeveeOption: data.montantLeveeOption ?? null,
      nbResa: data.nbResa ?? null,
      montantResa: data.montantResa ?? null,
      nbActe: data.nbActe ?? null,
      montantActe: data.montantActe ?? null,
      commentaires: data.commentaires || null,
    }
    if (data.id) {
      const touchees = await db
        .update(honoCommFacture)
        .set(valeurs)
        .where(eq(honoCommFacture.id, data.id))
        .returning({ id: honoCommFacture.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(honoCommFacture)
      .values(valeurs)
      .returning({ id: honoCommFacture.id })
    return { id: cree.id }
  })

export const deleteFactureFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(honoCommFacture).where(eq(honoCommFacture.id, data.id))
  })
