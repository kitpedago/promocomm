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
import { enPourcent } from '#/lib/sccv.helpers.ts'
import { requireSession } from '#/lib/session.server.ts'

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
