// Server functions du module SCCV (FEN_TABLE_StructureJuridique +
// FEN_Fiche_StructureJuridique) — phase 4, premier module en CRUD complet.
import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ilike, isNotNull, isNull, sql } from 'drizzle-orm'

import {
  associe,
  banque,
  civilite,
  compteBanque,
  gestionnaireSccv,
  indexTaux,
  motifRemunerationAssocie,
  operation,
  participation,
  partenariat,
  personne,
  sie,
  structureJuridique,
  structureJuridiqueStade,
  typeCompteBanque,
  utilisationCompte,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import { enFraction, enPourcent, normaliserSiret } from '#/lib/sccv.helpers.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

// Transpose REQ_StructureJuridique : liste filtrée. Défaut iso-WinDev :
// seules les non-liquidées (liquidee=false). Tri RS (le legacy n'a aucun
// ORDER BY — tri explicite ajouté à la réécriture).
export const getSccvListeFn = createServerFn({ method: 'GET' })
  .validator(
    (d: {
      stadeId?: number
      comptableId?: number
      gestionnaireId?: number
      liquidee?: boolean
      contient?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireSession()
    const conditions = [
      data.liquidee
        ? isNotNull(structureJuridique.dateLiquidation)
        : isNull(structureJuridique.dateLiquidation),
    ]
    if (data.stadeId) conditions.push(eq(structureJuridique.stadeId, data.stadeId))
    if (data.comptableId)
      conditions.push(eq(structureJuridique.personneComptableId, data.comptableId))
    if (data.gestionnaireId)
      conditions.push(eq(structureJuridique.gestionnaireSccvId, data.gestionnaireId))
    if (data.contient && data.contient.length >= 3)
      conditions.push(ilike(structureJuridique.rs, `%${data.contient}%`))
    return db
      .select({
        id: structureJuridique.id,
        rs: structureJuridique.rs,
        numTvaIntra: structureJuridique.numTvaIntra,
        siret: structureJuridique.siret,
        sccvHf: structureJuridique.sccvHf,
        sccvHlm: structureJuridique.sccvHlm,
        dateDebutActivite: structureJuridique.dateDebutActivite,
        dateImmat: structureJuridique.dateImmat,
        dateBilanDebutPremierExercice:
          structureJuridique.dateBilanDebutPremierExercice,
        dateBilanFinPremierExercice:
          structureJuridique.dateBilanFinPremierExercice,
        dateModifCloture: structureJuridique.dateModifCloture,
        datePlanningCloture: structureJuridique.datePlanningCloture,
        dateLiquidation: structureJuridique.dateLiquidation,
        dateLiberationCapital: structureJuridique.dateLiberationCapital,
        comptable: sql<string | null>`${personne.patronyme} || ' ' || COALESCE(${personne.prenom}, '')`,
        stade: structureJuridiqueStade.libelle,
        hfsga: structureJuridique.hfsga,
        capital: structureJuridique.capital,
        cpteFiscal: structureJuridique.cpteFiscal,
        nbPart: structureJuridique.nbPart,
        montantPart: structureJuridique.montantPart,
        gestionnaire: gestionnaireSccv.libelle,
      })
      .from(structureJuridique)
      .leftJoin(personne, eq(structureJuridique.personneComptableId, personne.id))
      .leftJoin(
        structureJuridiqueStade,
        eq(structureJuridique.stadeId, structureJuridiqueStade.id),
      )
      .leftJoin(
        gestionnaireSccv,
        eq(structureJuridique.gestionnaireSccvId, gestionnaireSccv.id),
      )
      .where(and(...conditions))
      .orderBy(asc(structureJuridique.rs))
  })

// Fiche + les 4 onglets (Associés / Opérations / Comptes / Centre des impôts)
export const getSccvDetailFn = createServerFn({ method: 'GET' })
  .validator((d: { sccvId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const fiche = (
      await db
        .select()
        .from(structureJuridique)
        .where(eq(structureJuridique.id, data.sccvId))
    ).at(0)
    if (!fiche) return null
    const [participations, operations, comptes] = await Promise.all([
      db
        .select({
          id: participation.id,
          associeId: participation.associeId,
          // libellé combo WinDev : « RS (HLM|Non HLM) »
          associe: sql<string | null>`${associe.rs} || CASE WHEN ${associe.estHlm} THEN ' (HLM)' ELSE ' (Non HLM)' END`,
          pourcentage: participation.pourcentage,
          convTreso: participation.convTreso,
          motifRemunerationAssocieId: participation.motifRemunerationAssocieId,
          motif: motifRemunerationAssocie.libelle,
          dateSignatureConv: participation.dateSignatureConv,
          dateApplication: participation.dateApplication,
          dateFinRemuneration: participation.dateFinRemuneration,
          indexTauxRemunerationId: participation.indexTauxRemunerationId,
          indexTaux: indexTaux.libelle,
          infoTauxRemuneration: participation.infoTauxRemuneration,
          periodiciteVersement: participation.periodiciteVersement,
          commentaires: participation.commentaires,
        })
        .from(participation)
        .leftJoin(associe, eq(participation.associeId, associe.id))
        .leftJoin(
          motifRemunerationAssocie,
          eq(
            participation.motifRemunerationAssocieId,
            motifRemunerationAssocie.id,
          ),
        )
        .leftJoin(
          indexTaux,
          eq(participation.indexTauxRemunerationId, indexTaux.id),
        )
        .where(eq(participation.structureJuridiqueId, data.sccvId))
        .orderBy(asc(participation.id)),
      db
        .select({
          id: operation.id,
          libelle: operation.libelle,
          cp: operation.cp,
          commune: operation.commune,
          surRennesMetropole: operation.surRennesMetropole,
          anru: operation.anru,
          anneeDgd: operation.anneeDgd,
          adresse: operation.adresse,
          nomZac: operation.nomZac,
        })
        .from(operation)
        .where(eq(operation.structureJuridiqueId, data.sccvId))
        .orderBy(asc(operation.libelle)),
      db
        .select({
          id: compteBanque.id,
          banqueId: compteBanque.banqueId,
          banque: banque.libelle,
          typeCompteBanqueId: compteBanque.typeCompteBanqueId,
          typeCompte: typeCompteBanque.libelle,
          utilisationCompteId: compteBanque.utilisationCompteId,
          utilisation: utilisationCompte.libelle,
          numCompte: compteBanque.numCompte,
          iban: compteBanque.iban,
          bic: compteBanque.bic,
          estCloture: compteBanque.estCloture,
          commentaires: compteBanque.commentaires,
        })
        .from(compteBanque)
        .leftJoin(banque, eq(compteBanque.banqueId, banque.id))
        .leftJoin(
          typeCompteBanque,
          eq(compteBanque.typeCompteBanqueId, typeCompteBanque.id),
        )
        .leftJoin(
          utilisationCompte,
          eq(compteBanque.utilisationCompteId, utilisationCompte.id),
        )
        .where(eq(compteBanque.structureJuridiqueId, data.sccvId))
        .orderBy(asc(compteBanque.id)),
    ])
    return {
      fiche,
      participations: participations.map((p) => ({
        ...p,
        pourcentage: enPourcent(p.pourcentage),
      })),
      operations,
      comptes,
    }
  })

// Toutes les listes des combos (fiche, participation, compte, centre des
// impôts, filtres). Comptables : fonction 1 ET présents (REQ_Comptable) —
// l'UI rajoute la valeur courante de la fiche si le comptable est parti.
export const getSccvNomenclaturesFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    const [
      stades,
      comptables,
      gestionnaires,
      partenariats,
      associes,
      banques,
      typesCompte,
      utilisations,
      sies,
      civilites,
      motifs,
      indexTauxListe,
      interlocuteursSie,
    ] = await Promise.all([
      db.select().from(structureJuridiqueStade).orderBy(asc(structureJuridiqueStade.libelle)),
      db
        .select({
          id: personne.id,
          libelle: sql<string>`${personne.patronyme} || ' ' || COALESCE(${personne.prenom}, '')`,
        })
        .from(personne)
        .where(and(eq(personne.fonctionId, 1), eq(personne.estPresent, true)))
        .orderBy(asc(personne.patronyme)),
      db.select().from(gestionnaireSccv).orderBy(asc(gestionnaireSccv.libelle)),
      db.select().from(partenariat).orderBy(asc(partenariat.libelle)),
      db
        .select({
          id: associe.id,
          libelle: sql<string>`${associe.rs} || CASE WHEN ${associe.estHlm} THEN ' (HLM)' ELSE ' (Non HLM)' END`,
        })
        .from(associe)
        .orderBy(asc(associe.rs)),
      db.select({ id: banque.id, libelle: banque.libelle }).from(banque).orderBy(asc(banque.libelle)),
      db.select().from(typeCompteBanque).orderBy(asc(typeCompteBanque.libelle)),
      db.select().from(utilisationCompte).orderBy(asc(utilisationCompte.libelle)),
      db.select({ id: sie.id, libelle: sie.libelle }).from(sie).orderBy(asc(sie.libelle)),
      db.select({ id: civilite.id, libelle: civilite.libelle }).from(civilite).orderBy(asc(civilite.libelle)),
      db.select().from(motifRemunerationAssocie).orderBy(asc(motifRemunerationAssocie.libelle)),
      db.select().from(indexTaux).orderBy(asc(indexTaux.libelle)),
      // REQ_InterlocuteurSIE : suggestions = valeurs distinctes existantes
      db
        .selectDistinct({ valeur: structureJuridique.interlocuteurSie })
        .from(structureJuridique)
        .where(isNotNull(structureJuridique.interlocuteurSie))
        .orderBy(asc(structureJuridique.interlocuteurSie)),
    ])
    return {
      stades,
      comptables,
      gestionnaires,
      partenariats,
      associes,
      banques,
      typesCompte,
      utilisations,
      sies,
      civilites,
      motifs,
      indexTaux: indexTauxListe,
      interlocuteursSie: interlocuteursSie.map((i) => i.valeur).filter(Boolean),
      // legacy Periodicite : codes texte sans ID
      periodicites: ['ANNUEL', 'TRIM'],
    }
  },
)

// --- écriture (rejetée pour le service Consultation) ---

interface FicheSccv {
  id?: number
  rs: string
  siret?: string | null
  numTvaIntra?: string | null
  gestionnaireSccvId?: number | null
  partenariatId?: number | null
  dateDebutActivite?: string | null
  dateImmat?: string | null
  dateBilanDebutPremierExercice?: string | null
  dateBilanFinPremierExercice?: string | null
  dateModifCloture?: string | null
  datePlanningCloture?: string | null
  dateLiquidation?: string | null
  personneComptableId?: number | null
  stadeId?: number | null
  hfsga?: boolean | null
  sccvHlm?: boolean | null
  sccvHf?: boolean | null
  capital?: number | null
  nbPart?: number | null
  montantPart?: number | null
  dateLiberationCapital?: string | null
  // volet Centre des impôts (modale de l'onglet 4, même server function)
  ediTva?: boolean | null
  ediLiasse?: boolean | null
  cpteFiscal?: boolean | null
  sieId?: number | null
  civiliteId?: number | null
  interlocuteurSie?: string | null
  dateMandatSie?: string | null
}

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// Create/update de la fiche SCCV (un seul UPSERT — pas le double Save()
// legacy, dont le seul but était de dénormaliser le libellé gestionnaire).
// Validation réactivée (commentée dans le legacy) : RS obligatoire.
export const saveSccvFn = createServerFn({ method: 'POST' })
  .validator((d: FicheSccv) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    if (!data.rs.trim()) throw new Error('La raison sociale est obligatoire')
    const valeurs = {
      rs: data.rs.trim(),
      siret: normaliserSiret(data.siret),
      numTvaIntra: data.numTvaIntra || null,
      gestionnaireSccvId: data.gestionnaireSccvId ?? null,
      partenariatId: data.partenariatId ?? null,
      dateDebutActivite: versDate(data.dateDebutActivite),
      dateImmat: versDate(data.dateImmat),
      dateBilanDebutPremierExercice: versDate(data.dateBilanDebutPremierExercice),
      dateBilanFinPremierExercice: versDate(data.dateBilanFinPremierExercice),
      dateModifCloture: data.dateModifCloture || null,
      datePlanningCloture: data.datePlanningCloture || null,
      dateLiquidation: versDate(data.dateLiquidation),
      personneComptableId: data.personneComptableId ?? null,
      stadeId: data.stadeId ?? null,
      hfsga: data.hfsga ?? null,
      sccvHlm: data.sccvHlm ?? null,
      sccvHf: data.sccvHf ?? null,
      capital: data.capital ?? null,
      nbPart: data.nbPart ?? null,
      montantPart: data.montantPart ?? null,
      dateLiberationCapital: versDate(data.dateLiberationCapital),
      ediTva: data.ediTva ?? null,
      ediLiasse: data.ediLiasse ?? null,
      cpteFiscal: data.cpteFiscal ?? null,
      sieId: data.sieId ?? null,
      civiliteId: data.civiliteId ?? null,
      interlocuteurSie: data.interlocuteurSie || null,
      dateMandatSie: versDate(data.dateMandatSie),
    }
    if (data.id) {
      const touchees = await db
        .update(structureJuridique)
        .set(valeurs)
        .where(eq(structureJuridique.id, data.id))
        .returning({ id: structureJuridique.id })
      if (touchees.length === 0) throw new Error('Fiche introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(structureJuridique)
      .values(valeurs)
      .returning({ id: structureJuridique.id })
    return { id: cree.id }
  })

interface FicheParticipation {
  id?: number
  structureJuridiqueId: number
  associeId: number | null
  pourcentage: number | null // en %, converti en fraction au stockage
  convTreso?: boolean | null
  motifRemunerationAssocieId?: number | null
  dateSignatureConv?: string | null
  dateApplication?: string | null
  dateFinRemuneration?: string | null
  indexTauxRemunerationId?: number | null
  infoTauxRemuneration?: string | null
  periodiciteVersement?: string | null
  commentaires?: string | null
}

export const saveParticipationFn = createServerFn({ method: 'POST' })
  .validator((d: FicheParticipation) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    // iso-WinDev : une ligne sans associé ni pourcentage est ignorée
    if (data.associeId == null && !data.pourcentage)
      throw new Error('Associé ou pourcentage requis')
    const valeurs = {
      structureJuridiqueId: data.structureJuridiqueId,
      associeId: data.associeId,
      pourcentage: enFraction(data.pourcentage),
      convTreso: data.convTreso ?? null,
      motifRemunerationAssocieId: data.motifRemunerationAssocieId ?? null,
      dateSignatureConv: versDate(data.dateSignatureConv),
      dateApplication: versDate(data.dateApplication),
      dateFinRemuneration: versDate(data.dateFinRemuneration),
      indexTauxRemunerationId: data.indexTauxRemunerationId ?? null,
      infoTauxRemuneration: data.infoTauxRemuneration || null,
      periodiciteVersement: data.periodiciteVersement || null,
      commentaires: data.commentaires || null,
    }
    if (data.id) {
      const touchees = await db
        .update(participation)
        .set(valeurs)
        .where(eq(participation.id, data.id))
        .returning({ id: participation.id })
      if (touchees.length === 0) throw new Error('Fiche introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(participation)
      .values(valeurs)
      .returning({ id: participation.id })
    return { id: cree.id }
  })

export const deleteParticipationFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(participation).where(eq(participation.id, data.id))
  })

interface FicheCompteBanque {
  id?: number
  structureJuridiqueId: number
  banqueId?: number | null
  typeCompteBanqueId?: number | null
  utilisationCompteId?: number | null
  numCompte?: string | null
  iban?: string | null
  bic?: string | null
  estCloture?: boolean | null
  commentaires?: string | null
}

export const saveCompteBanqueFn = createServerFn({ method: 'POST' })
  .validator((d: FicheCompteBanque) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const valeurs = {
      structureJuridiqueId: data.structureJuridiqueId,
      banqueId: data.banqueId ?? null,
      typeCompteBanqueId: data.typeCompteBanqueId ?? null,
      utilisationCompteId: data.utilisationCompteId ?? null,
      numCompte: data.numCompte || null,
      iban: data.iban || null,
      bic: data.bic || null,
      estCloture: data.estCloture ?? null,
      commentaires: data.commentaires || null,
    }
    if (data.id) {
      const touchees = await db
        .update(compteBanque)
        .set(valeurs)
        .where(eq(compteBanque.id, data.id))
        .returning({ id: compteBanque.id })
      if (touchees.length === 0) throw new Error('Fiche introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(compteBanque)
      .values(valeurs)
      .returning({ id: compteBanque.id })
    return { id: cree.id }
  })

export const deleteCompteBanqueFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db.delete(compteBanque).where(eq(compteBanque.id, data.id))
  })
