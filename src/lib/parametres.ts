// Server functions du module Paramètres (FEN_Param, phase 9) — CRUD
// générique des nomenclatures. Chaque liste est déclarée dans REGISTRE avec
// sa table et la liste blanche des champs modifiables (rien d'autre ne passe,
// même si le client envoie des clés supplémentaires). Réservé au service
// Administrateur (+ Comptabilité, iso-visibilité FEN_Param via la sidebar).
import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'

import {
  accordCadreAssurance,
  acquereurPlafondRessources,
  actionAlerte,
  architecte,
  archiveStadeAvancement,
  associe,
  banque,
  baremeHonoComm,
  categorieFrais,
  categorieSubvention,
  certification,
  civilite,
  commercial,
  commune,
  destination,
  domaineStadeAvancement,
  equipePersonne,
  etatStadeAvancementAlerte,
  etudeNotaire,
  fonction,
  fonctionInterlocuteurNotaire,
  interlocuteurNotaire,
  gestionnaireSccv,
  label,
  listeAvancement,
  missionMoeInterne,
  modeleMail,
  motifAnnulation,
  motifClauseParticuliere,
  motifRemunerationAssocie,
  moyenPaiement,
  natureAchat,
  organismeSubvention,
  parametreValeur,
  partenariat,
  performanceEnergetique,
  personne,
  prestataire,
  regleAlerteStadeAvancement,
  reserveEntreprise,
  reservePiece,
  reserveType,
  secteurGeographique,
  typeBatiment,
  typeBatimentStade,
  typeDateStadeAvancement,
  typeFoncier,
  typeMission,
  usageFrais,
  zonageAbc,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

const REGISTRE = {
  'plafonds-ressources': {
    table: acquereurPlafondRessources,
    champs: ['libelle'],
  },
  architectes: { table: architecte, champs: ['rs', 'commune', 'commentaire'] },
  associes: {
    table: associe,
    champs: [
      'rs',
      'formeJuridique',
      'siren',
      'adresse1',
      'adresse2',
      'cp',
      'commune',
      'tel',
      'estHlm',
      'contactNomComplet',
      'contactFonction',
      'email',
      'commentaire',
    ],
  },
  assurances: { table: accordCadreAssurance, champs: ['code'] },
  banques: {
    table: banque,
    champs: [
      'libelle',
      'ccNom',
      'ccAdresse',
      'ccCp',
      'ccCommune',
      'ccTel',
      'ccEmail',
      'pretNom',
      'pretAdresse',
      'pretCp',
      'pretCommune',
      'pretTel',
      'pretEmail',
    ],
  },
  'categories-frais': {
    table: categorieFrais,
    champs: ['libelle', 'estPublicite', 'ordre', 'usageFraisId'],
  },
  certifications: { table: certification, champs: ['libelle'] },
  civilites: { table: civilite, champs: ['libelle', 'libelleCourt'] },
  commerciaux: {
    table: commercial,
    champs: [
      'denomination',
      'prenom',
      'initiales',
      'email',
      'societe',
      'fonction',
    ],
  },
  communes: {
    table: commune,
    champs: [
      'libelle',
      'codeInsee',
      'departement',
      'codePostal',
      'zonageAbcRevise',
    ],
  },
  destinations: {
    table: destination,
    champs: ['libelle', 'libelleComm', 'commentaire'],
  },
  'equipes-personnes': { table: equipePersonne, champs: ['libelle'] },
  'etudes-notaires': {
    table: etudeNotaire,
    champs: ['nomEtude', 'adresse', 'cp', 'commune', 'email', 'commentaire'],
  },
  fonctions: { table: fonction, champs: ['libelle'] },
  'gestionnaires-sccv': {
    table: gestionnaireSccv,
    champs: [
      'libelle',
      'libelleCourt',
      'suffixeFacturationElectronique',
      'logicielFacturationElectronique',
    ],
  },
  labels: { table: label, champs: ['libelle'] },
  'missions-moe-interne': { table: missionMoeInterne, champs: ['libelle'] },
  'motifs-remuneration': {
    table: motifRemunerationAssocie,
    champs: ['libelle'],
  },
  'motifs-clauses': { table: motifClauseParticuliere, champs: ['libelle'] },
  'moyens-paiement': { table: moyenPaiement, champs: ['libelle'] },
  'natures-achat': {
    table: natureAchat,
    champs: ['libelle', 'libelleLong', 'ordreComm'],
  },
  notaires: {
    table: interlocuteurNotaire,
    champs: [
      'civilite',
      'patronyme',
      'prenom',
      'telephone',
      'email',
      'etudeNotaireId',
      'fonctionId',
    ],
  },
  'fonctions-interlocuteurs': {
    table: fonctionInterlocuteurNotaire,
    champs: ['libelle'],
  },
  partenariats: { table: partenariat, champs: ['libelle'] },
  'performances-energetiques': {
    table: performanceEnergetique,
    champs: ['libelle'],
  },
  personnes: {
    table: personne,
    champs: [
      'patronyme',
      'prenom',
      'estPresent',
      'fonctionId',
      'equipePersonneId',
      'email',
      'estExterieur',
    ],
  },
  prestataires: { table: prestataire, champs: ['libelle', 'afficherMission'] },
  'reserves-types': { table: reserveType, champs: ['libelle'] },
  'reserves-pieces': { table: reservePiece, champs: ['libelle'] },
  'reserves-entreprises': {
    table: reserveEntreprise,
    champs: [
      'rs',
      'adresse1',
      'adresse2',
      'cp',
      'commune',
      'telephone',
      'fax',
      'contact',
      'telContact',
      'corpsEtat',
      'email',
    ],
  },
  'secteurs-geographiques': { table: secteurGeographique, champs: ['libelle'] },
  'types-fonciers': { table: typeFoncier, champs: ['libelle'] },
  'usages-frais': { table: usageFrais, champs: ['libelle'] },
  'types-missions': { table: typeMission, champs: ['libelle'] },
  'domaines-stade': { table: domaineStadeAvancement, champs: ['libelle'] },
  'motifs-annulation': { table: motifAnnulation, champs: ['libelle'] },
  'baremes-hono-comm': { table: baremeHonoComm, champs: ['libelle'] },
  'zonages-abc': { table: zonageAbc, champs: ['libelle'] },
  // rubrique Stades d'avancement
  'stades-avancement': {
    table: listeAvancement,
    champs: [
      'domaine',
      'code',
      'libelle',
      'ordre',
      'avecHonoGestion',
      'pourcentageStandard',
      'avecSynchroEntreTranche',
      'inclureQuandCreationTranche',
    ],
  },
  'archives-stades': {
    table: archiveStadeAvancement,
    champs: ['dateArchivage', 'libelle'],
  },
  'etats-alerte-stade': {
    table: etatStadeAvancementAlerte,
    champs: ['libelle'],
  },
  'types-date-stade': { table: typeDateStadeAvancement, champs: ['libelle'] },
  'regles-alerte-stade': {
    table: regleAlerteStadeAvancement,
    champs: [
      'typeDate1Id',
      'stade1Id',
      'etat1Id',
      'typeDate2Id',
      'stade2Id',
      'etat2Id',
      'texteAlerte',
    ],
  },
  // rubrique Système
  actions: { table: actionAlerte, champs: ['libelle'] },
  'types-batiments': { table: typeBatiment, champs: ['libelle'] },
  'types-batiments-stades': {
    table: typeBatimentStade,
    champs: [
      'typeBatimentId',
      'listeAvancementId',
      'intervalleDureeMois',
      'intervalleDureeMoisEtage',
    ],
  },
  'valeurs-parametres': {
    table: parametreValeur,
    champs: ['param', 'typ', 'valeurD', 'valeurN', 'valeurT', 'valeurH'],
  },
  // rubrique Subventions
  'categories-subvention': { table: categorieSubvention, champs: ['libelle'] },
  'organismes-subvention': { table: organismeSubvention, champs: ['libelle'] },
  // rubrique Modèle de mail
  'modeles-mail': {
    table: modeleMail,
    champs: [
      'libelle',
      'sujet',
      'corps',
      'modeBrouillon',
      'destinataire',
      'destinataireCc',
      'destinataireCci',
    ],
  },
} as const

export type SlugNomenclature = keyof typeof REGISTRE

const entree = (slug: string) => {
  const e = (
    REGISTRE as Record<
      string,
      { table: any; champs: readonly string[] } | undefined
    >
  )[slug]
  if (!e) throw new Error(`Nomenclature inconnue : ${slug}`)
  return e
}

export const getNomenclatureFn = createServerFn({ method: 'GET' })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const { table } = entree(data.slug)
    const lignes = await db.select().from(table).orderBy(asc(table.id))
    // nomenclatures : uniquement des scalaires sérialisables
    return lignes as Array<
      Record<string, string | number | boolean | Date | null> & { id: number }
    >
  })

// Suffixe de facturation électronique : accolé au SIREN pour former l'adresse
// de facturation (module /facturation), 25 caractères au plus et unique (index
// gestionnaire_sccv_suffixe_idx ; contrôle ici pour un message en clair).
// Vide → NULL, l'index unique laisse passer plusieurs NULL.
async function validerGestionnaireSccv(
  valeurs: Record<string, unknown>,
  id?: number,
) {
  const suffixe = String(valeurs.suffixeFacturationElectronique ?? '').trim()
  valeurs.suffixeFacturationElectronique = suffixe || null
  if (!suffixe) return
  if (suffixe.length > 25)
    throw new Error(
      'Le suffixe de facturation électronique dépasse 25 caractères',
    )
  const doublon = await db
    .select({ id: gestionnaireSccv.id, libelle: gestionnaireSccv.libelle })
    .from(gestionnaireSccv)
    .where(eq(gestionnaireSccv.suffixeFacturationElectronique, suffixe))
    .then((l) => l.find((g) => g.id !== id))
  if (doublon)
    throw new Error(
      `Suffixe de facturation électronique déjà utilisé par ${doublon.libelle}`,
    )
}

export const saveNomenclatureFn = createServerFn({ method: 'POST' })
  .validator(
    (d: { slug: string; id?: number; valeurs: Record<string, unknown> }) => d,
  )
  .handler(async ({ data }) => {
    await requireEcriture()
    const { table, champs } = entree(data.slug)
    // liste blanche : seuls les champs déclarés passent
    const valeurs: Record<string, unknown> = {}
    for (const c of champs) valeurs[c] = data.valeurs[c] ?? null
    if (data.slug === 'gestionnaires-sccv')
      await validerGestionnaireSccv(valeurs, data.id)
    if (data.id) {
      const touchees = await db
        .update(table)
        .set(valeurs)
        .where(eq(table.id, data.id))
        .returning({ id: table.id })
      if (touchees.length === 0) throw new Error('Ligne introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(table)
      .values(valeurs)
      .returning({ id: table.id })
    return { id: cree.id as number }
  })

export const deleteNomenclatureFn = createServerFn({ method: 'POST' })
  .validator((d: { slug: string; id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const { table } = entree(data.slug)
    // les FK référentes bloquent naturellement la suppression d'une valeur
    // encore utilisée (contrainte Postgres) — le message remonte tel quel
    await db.delete(table).where(eq(table.id, data.id))
  })
