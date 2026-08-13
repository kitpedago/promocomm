// Server functions du module Acquéreurs (FEN_Table_Acquereur +
// FEN_Fiche_Acquereur) — liste et CRUD complet.
// Comme WinDev, la liste complète est chargée puis filtrée côté client
// (arbre opérations + recherche nom/email/téléphones) — 2 929 lignes.
import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import {
  acquereur,
  acquereurPlafondRessources,
  acquereurTrancheAge,
  civilite,
  commercial,
  commercialisation,
  csp,
  lot,
  natureJuridique,
  operation,
  situationFamiliale,
  situationFamille,
  tranche,
  typeLogementActuel,
  typeMenage,
} from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
import {
  calculerAge,
  calculerMenage,
  construireNomComplet,
  trancheAgePourAges,
} from '#/lib/acquereurs.helpers.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'

export const getAcquereursFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()

    // « lot courant » = commercialisation active (non annulée) la plus récente,
    // affiché « OPÉRATION COMMUNE | num lot » comme dans WinDev (le cache
    // curIDLot/DescriptionLotCourant du legacy n'a pas été repris)
    const lotCourant = db
      .selectDistinctOn([commercialisation.acquereurId], {
        acquereurId: commercialisation.acquereurId,
        lotCourant: sql<string>`
          ${operation.libelle} || COALESCE(' ' || ${operation.commune}, '')
          || ' | ' || COALESCE(${lot.numLot}, '')`.as('lot_courant'),
      })
      .from(commercialisation)
      .innerJoin(lot, eq(commercialisation.lotId, lot.id))
      .innerJoin(tranche, eq(lot.trancheId, tranche.id))
      .innerJoin(operation, eq(tranche.operationId, operation.id))
      .where(isNull(commercialisation.dateAnnulation))
      .orderBy(
        asc(commercialisation.acquereurId),
        sql`${commercialisation.dateResa} DESC NULLS LAST`,
        desc(commercialisation.id),
      )
      .as('lot_courant')

    // opérations où l'acquéreur a (eu) une commercialisation — pour l'arbre de filtre
    const opsAcquereur = db
      .select({
        acquereurId: commercialisation.acquereurId,
        // typé nullable : le LEFT JOIN de la requête principale peut ne rien apporter
        operationIds:
          sql<Array<number> | null>`array_agg(DISTINCT ${tranche.operationId})`.as(
            'operation_ids',
          ),
      })
      .from(commercialisation)
      .innerJoin(lot, eq(commercialisation.lotId, lot.id))
      .innerJoin(tranche, eq(lot.trancheId, tranche.id))
      .groupBy(commercialisation.acquereurId)
      .as('ops_acquereur')

    const civ2 = alias(civilite, 'civ2')
    const civ3 = alias(civilite, 'civ3')

    return db
      .select({
        id: acquereur.id,
        nomComplet: sql<
          string | null
        >`COALESCE(${acquereur.nomComplet}, ${acquereur.rs})`,
        lotCourant: lotCourant.lotCourant,
        civilite: sql<string>`concat_ws(', ', ${civilite.libelle}, ${civ2.libelle}, ${civ3.libelle})`,
        prenoms: sql<string>`concat_ws(', ', ${acquereur.prenom}, ${acquereur.prenom2}, ${acquereur.prenom3})`,
        email: acquereur.email,
        email2: acquereur.email2,
        telephone: acquereur.telephone,
        portable: acquereur.portable,
        communeActuelle: acquereur.communeActuelle,
        operationIds: opsAcquereur.operationIds,
      })
      .from(acquereur)
      .leftJoin(civilite, eq(acquereur.civiliteId, civilite.id))
      .leftJoin(civ2, eq(acquereur.civilite2Id, civ2.id))
      .leftJoin(civ3, eq(acquereur.civilite3Id, civ3.id))
      .leftJoin(lotCourant, eq(lotCourant.acquereurId, acquereur.id))
      .leftJoin(opsAcquereur, eq(opsAcquereur.acquereurId, acquereur.id))
      .orderBy(sql`COALESCE(${acquereur.nomComplet}, ${acquereur.rs}) ASC`)
  },
)

export type LigneAcquereur = Awaited<ReturnType<typeof getAcquereursFn>>[number]

// Fiche complète pour la modale d'édition
export const getAcquereurFicheFn = createServerFn({ method: 'GET' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const fiche = (
      await db.select().from(acquereur).where(eq(acquereur.id, data.id))
    ).at(0)
    return fiche ?? null
  })

// Combos de la fiche. Tranches d'âge avec borne pour l'aperçu du calcul
// côté client ; type de ménage / situation familiale servent à afficher
// les champs auto-calculés (grisés dans WinDev).
export const getAcquereurNomenclaturesFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  await requireSession()
  const [
    civilites,
    naturesJuridiques,
    csps,
    situationsFamille,
    typesLogement,
    plafonds,
    tranchesAge,
    typesMenage,
    situationsFamiliale,
    commerciaux,
  ] = await Promise.all([
    db.select().from(civilite).orderBy(asc(civilite.id)),
    db.select().from(natureJuridique).orderBy(asc(natureJuridique.id)),
    db
      .select({ id: csp.id, libelle: csp.libelle })
      .from(csp)
      .orderBy(asc(csp.numero)),
    db.select().from(situationFamille).orderBy(asc(situationFamille.libelle)),
    db
      .select({
        id: typeLogementActuel.id,
        libelle: typeLogementActuel.libelle,
      })
      .from(typeLogementActuel)
      .orderBy(asc(typeLogementActuel.id)),
    db
      .select()
      .from(acquereurPlafondRessources)
      .orderBy(asc(acquereurPlafondRessources.id)),
    db
      .select()
      .from(acquereurTrancheAge)
      .orderBy(asc(acquereurTrancheAge.borneMax)),
    db.select().from(typeMenage).orderBy(asc(typeMenage.id)),
    db.select().from(situationFamiliale).orderBy(asc(situationFamiliale.id)),
    db
      .select({
        id: commercial.id,
        libelle: sql<string>`concat_ws(' ', ${commercial.denomination}, ${commercial.prenom})`,
      })
      .from(commercial)
      .orderBy(asc(commercial.denomination)),
  ])
  return {
    civilites,
    naturesJuridiques,
    csps,
    situationsFamille,
    typesLogement,
    plafonds,
    tranchesAge,
    typesMenage,
    situationsFamiliale,
    commerciaux,
  }
})

// Champs éditables de la fiche (les calculés — nom complet, âges, tranche
// d'âge, type de ménage, situation familiale — sont dérivés au save)
export interface FicheAcquereur {
  id?: number
  conseillerCommercialId?: number | null
  // identité (jusqu'à 3 co-acquéreurs)
  civiliteId?: number | null
  patronyme?: string | null
  prenom?: string | null
  civilite2Id?: number | null
  patronyme2?: string | null
  prenom2?: string | null
  civilite3Id?: number | null
  patronyme3?: string | null
  prenom3?: string | null
  rs?: string | null
  natureJuridiqueId?: number | null
  commentaire?: string | null
  // coordonnées
  adresseActuelle?: string | null
  cpActuel?: string | null
  communeActuelle?: string | null
  communeOrigine?: string | null
  dateModifAdresse?: string | null
  telephone?: string | null
  portable?: string | null
  email?: string | null
  email2?: string | null
  // foyer
  nombreAdultes?: number | null
  nombreEnfants?: number | null
  enfantAVenir?: number | null
  situationFamilleId?: number | null
  ageEnfant1?: number | null
  ageEnfant2?: number | null
  ageEnfant3?: number | null
  ageEnfant4?: number | null
  ageEnfant5?: number | null
  adulte1DateNaissance?: string | null
  adulte1LieuNaissance?: string | null
  adulte1CspId?: number | null
  adulte1Metier?: string | null
  adulte1CommuneTravail?: string | null
  adulte2DateNaissance?: string | null
  adulte2LieuNaissance?: string | null
  adulte2CspId?: number | null
  adulte2Metier?: string | null
  adulte2CommuneTravail?: string | null
  // suivi
  etape?: string | null
  enqueteA?: string | null
  enqueteB?: string | null
  enqueteC?: string | null
  infoPourEntreprise?: string | null
  dateCreation?: string | null
  // logement
  typeLogementActuelId?: number | null
  loyerActuel?: number | null
  primoAccedant?: string | null
  // financement
  revenusFoyerFiscal?: number | null
  anneeDeclaration?: number | null
  revenusNetImposableNm1?: number | null
  apportReelHorsSubvention?: number | null
  subvention?: number | null
  plafondRessourcesId?: number | null
  revenuNetFoyerMensuel?: number | null
  mensualiteFinancement?: number | null
  estPtz?: boolean | null
  tauxEffort?: number | null
  pensionAutresRevenus?: number | null
  dureeFinancementMois?: number | null
}

const versDate = (s: string | null | undefined) => (s ? new Date(s) : null)

// Create/update. Validations iso-WinDev (patronyme + civilité), puis champs
// dérivés recalculés comme les procédures Update_* et le trigger legacy.
export const saveAcquereurFn = createServerFn({ method: 'POST' })
  .validator((d: FicheAcquereur) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const patronyme = (data.patronyme ?? '').trim()
    if (!patronyme) throw new Error('Saisir un patronyme.')
    if (!data.civiliteId) throw new Error('Sélectionnez une civilité.')

    const idsCivilite = [
      data.civiliteId,
      data.civilite2Id,
      data.civilite3Id,
    ].filter((n): n is number => n != null)
    const [civilites, tranches] = await Promise.all([
      db.select().from(civilite).where(inArray(civilite.id, idsCivilite)),
      db.select().from(acquereurTrancheAge),
    ])
    const court = (id: number | null | undefined) => {
      const c = civilites.find((x) => x.id === id)
      return c ? (c.libelleCourt ?? c.libelle) : null
    }

    const dateCreation = versDate(data.dateCreation) ?? new Date()
    const adulte1Age = calculerAge(
      versDate(data.adulte1DateNaissance),
      dateCreation,
    )
    const adulte2Age = calculerAge(
      versDate(data.adulte2DateNaissance),
      dateCreation,
    )
    const menage = calculerMenage(
      data.nombreAdultes ?? null,
      data.nombreEnfants ?? null,
      data.enfantAVenir ?? null,
    )

    const valeurs = {
      conseillerCommercialId: data.conseillerCommercialId ?? null,
      civiliteId: data.civiliteId,
      patronyme,
      prenom: data.prenom || null,
      civilite2Id: data.civilite2Id ?? null,
      patronyme2: data.patronyme2 || null,
      prenom2: data.prenom2 || null,
      civilite3Id: data.civilite3Id ?? null,
      patronyme3: data.patronyme3 || null,
      prenom3: data.prenom3 || null,
      rs: data.rs || null,
      natureJuridiqueId: data.natureJuridiqueId ?? null,
      commentaire: data.commentaire || null,
      adresseActuelle: data.adresseActuelle || null,
      cpActuel: data.cpActuel || null,
      communeActuelle: data.communeActuelle || null,
      communeOrigine: data.communeOrigine || null,
      dateModifAdresse: versDate(data.dateModifAdresse),
      telephone: data.telephone || null,
      portable: data.portable || null,
      email: data.email || null,
      email2: data.email2 || null,
      nombreAdultes: data.nombreAdultes ?? null,
      nombreEnfants: data.nombreEnfants ?? null,
      enfantAVenir: data.enfantAVenir ?? null,
      situationFamilleId: data.situationFamilleId ?? null,
      ageEnfant1: data.ageEnfant1 ?? null,
      ageEnfant2: data.ageEnfant2 ?? null,
      ageEnfant3: data.ageEnfant3 ?? null,
      ageEnfant4: data.ageEnfant4 ?? null,
      ageEnfant5: data.ageEnfant5 ?? null,
      adulte1DateNaissance: versDate(data.adulte1DateNaissance),
      adulte1LieuNaissance: data.adulte1LieuNaissance || null,
      adulte1CspId: data.adulte1CspId ?? null,
      adulte1Metier: data.adulte1Metier || null,
      adulte1CommuneTravail: data.adulte1CommuneTravail || null,
      adulte2DateNaissance: versDate(data.adulte2DateNaissance),
      adulte2LieuNaissance: data.adulte2LieuNaissance || null,
      adulte2CspId: data.adulte2CspId ?? null,
      adulte2Metier: data.adulte2Metier || null,
      adulte2CommuneTravail: data.adulte2CommuneTravail || null,
      etape: data.etape || null,
      enqueteA: data.enqueteA || null,
      enqueteB: data.enqueteB || null,
      enqueteC: data.enqueteC || null,
      infoPourEntreprise: data.infoPourEntreprise || null,
      dateCreation,
      typeLogementActuelId: data.typeLogementActuelId ?? null,
      loyerActuel: data.loyerActuel ?? null,
      primoAccedant: data.primoAccedant || null,
      revenusFoyerFiscal: data.revenusFoyerFiscal ?? null,
      anneeDeclaration: data.anneeDeclaration ?? null,
      revenusNetImposableNm1: data.revenusNetImposableNm1 ?? null,
      apportReelHorsSubvention: data.apportReelHorsSubvention ?? null,
      subvention: data.subvention ?? null,
      plafondRessourcesId: data.plafondRessourcesId ?? null,
      revenuNetFoyerMensuel: data.revenuNetFoyerMensuel ?? null,
      mensualiteFinancement: data.mensualiteFinancement ?? null,
      estPtz: data.estPtz ?? null,
      tauxEffort: data.tauxEffort ?? null,
      pensionAutresRevenus: data.pensionAutresRevenus ?? null,
      dureeFinancementMois: data.dureeFinancementMois ?? null,
      // champs dérivés (Update_ChampMenage / Update_Age / trigger NomComplet)
      adulte1Age,
      adulte2Age,
      typeMenageId: menage.typeMenageId,
      situationFamilialeId: menage.situationFamilialeId,
      trancheAgeId: trancheAgePourAges(adulte1Age, adulte2Age, tranches),
      nomComplet: construireNomComplet({
        civ1Court: court(data.civiliteId),
        civ2Court: court(data.civilite2Id),
        civ3Court: court(data.civilite3Id),
        patronyme,
        prenom: data.prenom,
        patronyme2: data.patronyme2,
        prenom2: data.prenom2,
        patronyme3: data.patronyme3,
        prenom3: data.prenom3,
        rs: data.rs,
      }),
      // le legacy ne renseignait pas DateModification depuis la fiche ; ajouté
      dateModification: new Date(),
    }

    if (data.id) {
      const touchees = await db
        .update(acquereur)
        .set(valeurs)
        .where(eq(acquereur.id, data.id))
        .returning({ id: acquereur.id })
      if (touchees.length === 0) throw new Error('Fiche introuvable')
      return { id: data.id }
    }
    const [cree] = await db
      .insert(acquereur)
      .values(valeurs)
      .returning({ id: acquereur.id })
    return { id: cree.id }
  })

// Suppression refusée si l'acquéreur apparaît dans une commercialisation
// (iso-WinDev, même si annulée)
export const deleteAcquereurFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const [{ nb }] = await db
      .select({ nb: sql<number>`count(*)::int` })
      .from(commercialisation)
      .where(eq(commercialisation.acquereurId, data.id))
    if (nb > 0)
      throw new Error(
        'Cet acquéreur est dans au moins 1 commercialisation, suppression impossible.',
      )
    await db.delete(acquereur).where(eq(acquereur.id, data.id))
  })
