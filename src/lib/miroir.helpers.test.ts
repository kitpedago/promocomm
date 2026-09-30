import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { copies } from '#/lib/etl/transform.ts'

import {
  COMPAT_ACCESS,
  NOMENCLATURES_FIGEES,
  PLANIF_DEFAUT,
  alterCitext,
  colonneLegacy,
  inverser,
  normaliserPlanif,
  prochainPassage,
  tronquer,
} from './miroir.helpers.ts'

import type { Planif } from './miroir.helpers.ts'

describe('colonneLegacy', () => {
  it('reconnaît les quatre formes du mapping', () => {
    expect(colonneLegacy('s."Libelle"')).toEqual({
      legacy: 'Libelle',
      fk: false,
    })
    expect(colonneLegacy(`COALESCE(s."RS", '')`)).toEqual({
      legacy: 'RS',
      fk: false,
    })
    expect(colonneLegacy('NULLIF(s."IDTranche", 0)')).toEqual({
      legacy: 'IDTranche',
      fk: true,
    })
    expect(
      colonneLegacy(
        '(SELECT s."IDBanque" WHERE EXISTS (SELECT 1 FROM legacy."tBanque" r WHERE r."IDBanque" = s."IDBanque"))',
      ),
    ).toEqual({ legacy: 'IDBanque', fk: true })
    expect(colonneLegacy('NULLIF(s."Siret", 0)::bigint::text')).toEqual({
      legacy: 'Siret',
      fk: true,
      cast: 'bigint',
    })
    expect(colonneLegacy('(s."ModeBrouillon" <> 0)')).toEqual({
      legacy: 'ModeBrouillon',
      fk: false,
      bool: true,
    })
    expect(
      colonneLegacy(
        `NULLIF(TRIM(regexp_replace(COALESCE(s."Commentaire", ''), '<[^>]*>', '', 'g')), '')`,
      ),
    ).toEqual({ legacy: 'Commentaire', fk: false })
    expect(
      colonneLegacy(
        `COALESCE(NULLIF(s."MotifAnnulation", ''), (SELECT m."Libelle" FROM legacy."MotifAnnulation" m WHERE m."IDMotifAnnulation" = s."IDMotifAnnulation"))`,
      ),
    ).toEqual({ legacy: 'MotifAnnulation', fk: false })
  })
  it('rejette les expressions non inversibles', () => {
    expect(colonneLegacy('ROW_NUMBER() OVER (ORDER BY s."Code")')).toBeNull()
    expect(
      colonneLegacy(`CASE s."IDService" WHEN 1 THEN 'promo' END`),
    ).toBeNull()
  })
})

describe('tronquer', () => {
  it('coupe les textes trop longs pour la colonne miroir et les compte', () => {
    const lignes = [
      { Libelle: 'Rennes', CP: '35000', Commentaire: 'x'.repeat(300) },
      { Libelle: 'Saint-Jacques', CP: null, Commentaire: null },
    ]
    expect(tronquer(lignes, { Libelle: 6, CP: 10 })).toBe(1)
    expect(lignes).toEqual([
      { Libelle: 'Rennes', CP: '35000', Commentaire: 'x'.repeat(300) },
      { Libelle: 'Saint-', CP: null, Commentaire: null },
    ])
  })
})

describe('inverser', () => {
  it('produit le SELECT inverse avec alias legacy', () => {
    const r = inverser({
      target: 'operation',
      cols: '(id, structure_juridique_id, libelle)',
      select: `SELECT s."IDOperation", NULLIF(s."IDStructureJuridique", 0), s."Libelle" FROM legacy."tOperation" s`,
    })
    expect(r.table).toBe('tOperation')
    expect(r.colonnes.map((c) => c.legacy)).toEqual([
      'IDOperation',
      'IDStructureJuridique',
      'Libelle',
    ])
    expect(r.sql).toBe(
      `SELECT "id" AS "IDOperation", COALESCE("structure_juridique_id", 0) AS "IDStructureJuridique", "libelle" AS "Libelle" FROM public."operation"`,
    )
    expect(r.ignorees).toEqual([])
  })
  it('désigne la clé primaire : la colonne legacy reprise de id', () => {
    const r = inverser({
      target: 'operation',
      cols: '(id, libelle)',
      select: `SELECT s."IDOperation", s."Libelle" FROM legacy."tOperation" s`,
    })
    expect(r.cle).toBe('IDOperation')
    // id généré à l'aller (ROW_NUMBER) : rien à désigner
    expect(
      inverser(copies.find((c) => c.target === 'zonage_abc')!).cle,
    ).toBeUndefined()
  })
  it("recaste une fk convertie en texte à l'aller", () => {
    const r = inverser({
      target: 'structure_juridique',
      cols: '(id, siret)',
      select: `SELECT s."IDStructureJuridique", NULLIF(s."Siret", 0)::bigint::text FROM legacy."tStructureJuridique" s`,
    })
    expect(r.colonnes[1].expr).toBe('COALESCE("siret"::bigint, 0)')
  })
  it('ignore les colonnes non inversibles sans décaler les autres', () => {
    const r = inverser({
      target: 'droit',
      cols: '(id, service, type)',
      select: `SELECT s."IDDroit", CASE s."IDService" WHEN 1 THEN 'promo' END, s."IDTypeDroit" FROM legacy."Droit" s WHERE s."IDService" BETWEEN 1 AND 7`,
    })
    expect(r.colonnes.map((c) => c.legacy)).toEqual(['IDDroit', 'IDTypeDroit'])
    expect(r.ignorees).toEqual(['service'])
  })
  it("ajoute les colonnes propres à l'application (hors legacy)", () => {
    const r = inverser({
      target: 'facture',
      cols: '(id, commentaire)',
      select: `SELECT s."IDFacture", s."Commentaire" FROM legacy."tFacture" s`,
      horsLegacy: [
        {
          col: 'prestataire_id',
          legacy: 'IDPrestataire',
          type: 'integer',
          fk: true,
        },
        { col: 'note', legacy: 'Note', type: 'text' },
      ],
    })
    expect(r.colonnes.slice(2)).toEqual([
      {
        legacy: 'IDPrestataire',
        expr: 'COALESCE("prestataire_id", 0)',
        type: 'integer',
      },
      { legacy: 'Note', expr: '"note"', type: 'text' },
    ])
    expect(r.sql).toBe(
      `SELECT "id" AS "IDFacture", "commentaire" AS "Commentaire", COALESCE("prestataire_id", 0) AS "IDPrestataire", "note" AS "Note" FROM public."facture"`,
    )
  })
  it('joint les sous-requêtes dont se servent les colonnes calculées', () => {
    const r = inverser({
      target: 'lot',
      cols: '(id)',
      select: `SELECT s."IDlot" FROM legacy."tLot" s`,
      jointure: 'LEFT JOIN (SELECT 1 AS n) x ON true',
      calculees: [{ legacy: 'Nb', expr: 'x.n' }],
    })
    expect(r.sql).toBe(
      `SELECT "id" AS "IDlot", x.n AS "Nb" FROM public."lot" LEFT JOIN (SELECT 1 AS n) x ON true`,
    )
  })
  it('ne calcule que des colonnes connues de la table miroir', () => {
    const ddl = readFileSync(
      new URL('./miroir.schema.sql', import.meta.url),
      'utf8',
    )
    for (const c of copies) {
      const table = inverser(c).table
      const colonnes =
        new RegExp(`CREATE TABLE "${table}" \\(([^;]*)\\);`).exec(ddl)?.[1] ??
        ''
      for (const k of c.calculees ?? [])
        expect(colonnes, `${table}.${k.legacy}`).toContain(`"${k.legacy}" `)
    }
  })
  it('calcule les caches des triggers Commercialisation, Participation et Tranche_Lot', () => {
    const calculees = (target: string) =>
      (copies.find((c) => c.target === target)!.calculees ?? []).map(
        (k) => k.legacy,
      )
    expect(calculees('lot')).toEqual([
      'curIDCommercialisation',
      'curIDAcquereur',
      'curIDNatureAchat',
      'curDateResa',
      'curDateLivraison',
      'curPrixDeVenteReelHT',
      'curPrixDeVenteReelTTC',
      'curTauxTVAReel',
      'curRemiseClientTTC',
    ])
    expect(calculees('acquereur')).toEqual([
      'curIDLot',
      'curDateResa',
      'curDateAnnulation',
      'DescriptionLotCourant',
    ])
    expect(calculees('tranche')).toEqual(
      expect.arrayContaining([
        'NbLot',
        'NbResa',
        'NbInvendus',
        'NbResa_N',
        'NbResa_Nm1',
        'NbResa_Nm2',
        'NbResa_N_PSLA',
        'NbLgtPSLA',
        'NbLgtHorsPSLA',
        'NbActeVEFA',
        'NbActeVEFA_N',
        'NbLeveeOption',
        'NbLeveeOption_N',
        'NbPhaseLoc',
      ]),
    )
    expect(calculees('structure_juridique')).toEqual([
      'curPourcKPI',
      'curPourcKGI',
      'curPourcMH',
      'curPourcAutre',
      'curAutreNom',
      'curAutreNomPourc',
    ])
    expect(calculees('operation')).toEqual([
      'curPourcentageHF',
      'curIDAssocieHorsHF',
      'curNbLot',
      'curNbTranche',
    ])
  })
  it('expose le prestataire mission de la facture', () => {
    const r = inverser(copies.find((c) => c.target === 'facture')!)
    expect(r.table).toBe('tFacture')
    expect(r.colonnes.at(-1)).toEqual({
      legacy: 'IDPrestataire',
      expr: 'COALESCE("prestataire_id", 0)',
      type: 'integer',
    })
  })
  it('expose les fins Tabbor et commercialisation de la tranche', () => {
    const r = inverser(copies.find((c) => c.target === 'tranche')!)
    expect(r.table).toBe('tTranche')
    expect(r.colonnes.filter((c) => c.type)).toEqual([
      { legacy: 'AnneeFinTabbor', expr: '"annee_fin_tabbor"', type: 'integer' },
      {
        legacy: 'DateFinCommercialisation',
        expr: '"date_fin_commercialisation"',
        type: 'timestamp without time zone',
      },
    ])
  })
  it('recalcule les caches de stade de la tranche (triggers WinDev)', () => {
    const r = inverser(copies.find((c) => c.target === 'tranche')!)
    const noms = r.colonnes.map((c) => c.legacy)
    // aucune colonne en double : StadeCOM calculé remplace la recopie de stade_com
    expect(new Set(noms).size).toBe(noms.length)
    expect(r.sql).not.toContain('"stade_com"')
    expect(r.sql).toContain(`la.code = 'COM') AS "StadeCOM"`)
    expect(noms).toEqual(
      expect.arrayContaining(['StadeLIV', 'StadePreviLIV', 'StadePreviCOM']),
    )
    expect(r.sql).toContain(
      `(SELECT max(sa.date_previ_maj_promo) FROM public.stade_avancement sa JOIN public.liste_avancement la ON la.id = sa.liste_avancement_id WHERE sa.tranche_id = "tranche".id AND la.code = 'LIV') AS "StadePreviLIV"`,
    )
  })
  it('déduit situation et dates des stades courants des caches de la tranche', () => {
    const r = inverser(copies.find((c) => c.target === 'tranche')!)
    expect(r.sql).toContain(
      `(SELECT si.libelle FROM public.situation si WHERE si.id = "tranche".situation_id) AS "StadeCode"`,
    )
    expect(r.sql).toContain(
      `(SELECT max(sa.date_reelle) FROM public.stade_avancement sa WHERE sa.tranche_id = "tranche".id AND sa.liste_avancement_id = "tranche".liste_avancement_actuel_id) AS "DateStadeActuel"`,
    )
    expect(r.sql).toContain(
      `(SELECT max(sa.date_previ_maj_promo) FROM public.stade_avancement sa WHERE sa.tranche_id = "tranche".id AND sa.liste_avancement_id = "tranche".liste_avancement_suivi_prochain_id) AS "DateStadeSuiviProchain"`,
    )
    expect(r.colonnes.map((c) => c.legacy)).toEqual(
      expect.arrayContaining([
        'DateStadeProchain',
        'DateStadeSuiviActuel',
        'StadeSAV',
        'StadePreviSAV',
      ]),
    )
  })
  it('passe en old les dates de bail opérateur de la tranche', () => {
    const r = inverser(copies.find((c) => c.target === 'tranche')!)
    expect(r.sql).toContain(
      '"terrain_bail_operateur_date_previ" AS "old_TerrainBailOperateurDatePrevi", "terrain_bail_operateur_date_reelle" AS "old_TerrainBailOperateurDateReelle"',
    )
    // la table miroir porte les mêmes noms, sinon son chargement échoue
    const ddl = readFileSync(
      new URL('./miroir.schema.sql', import.meta.url),
      'utf8',
    )
    expect(ddl.match(/"(old_)?TerrainBailOperateurDate\w+"/g)).toEqual([
      '"old_TerrainBailOperateurDatePrevi"',
      '"old_TerrainBailOperateurDateReelle"',
    ])
  })
  it("garde l'apostrophe d'un nom de colonne legacy", () => {
    const r = inverser(copies.find((c) => c.target === 'acquereur')!)
    expect(r.sql).toContain(`"type_acquisition" AS "Type d'acquisition"`)
    expect(r.sql).toContain('COALESCE("conseiller_technique_id", 0)')
  })
  it('inverse toutes les copies réelles du transform', () => {
    const ignorees: Array<string> = []
    for (const c of copies) {
      const r = inverser(c)
      expect(r.table, c.target).toMatch(/^\w+$/)
      expect(r.colonnes.length, c.target).toBeGreaterThan(0)
      ignorees.push(...r.ignorees.map((col) => `${c.target}.${col}`))
    }
    // seules exceptions connues : ids générés par ROW_NUMBER et le service texte de droit
    expect(ignorees).toEqual([
      'domaine_stade_avancement.id',
      'zonage_abc.id',
      'droit.service',
    ])
  })
})

describe('nomenclatures figées', () => {
  it('visent des tables du miroir, hors copies, avec leurs colonnes', () => {
    const ddl = readFileSync(
      new URL('./miroir.schema.sql', import.meta.url),
      'utf8',
    )
    for (const [table, rows] of Object.entries(NOMENCLATURES_FIGEES)) {
      expect(
        copies.some((c) => inverser(c).table === table),
        table,
      ).toBe(false)
      const def = ddl.match(
        new RegExp(`CREATE TABLE "${table}" \\(([^;]*)\\);`),
      )
      expect(def, table).not.toBeNull()
      for (const col of Object.keys(rows[0]))
        expect(def![1], `${table}.${col}`).toContain(`"${col}" `)
    }
  })
})

describe('compatibilité Access', () => {
  it('compare et décale une date par un entier en jours depuis le 01/01/1900', () => {
    expect(COMPAT_ACCESS).toContain(
      `access_date_gt(timestamp, integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT $1 > timestamp '1900-01-01' + $2 * interval '1 day' $$;`,
    )
    expect(COMPAT_ACCESS).toContain(
      `access_date_moins(timestamp, integer) RETURNS timestamp LANGUAGE sql IMMUTABLE AS $$ SELECT $1 - $2 * interval '1 day' $$;`,
    )
    expect(COMPAT_ACCESS).toContain(
      `access_bool_eq(boolean, integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT $1 = ($2 <> 0) $$;`,
    )
    expect(alterCitext('tLot', ['Numlot', 'FamilleDeBien'])).toBe(
      `ALTER TABLE public."tLot" ALTER COLUMN "Numlot" TYPE citext, ALTER COLUMN "FamilleDeBien" TYPE citext`,
    )
    // rejouable : chaque opérateur est retiré avant d'être recréé
    for (const op of ['<', '<=', '>', '>=', '=', '<>', '+', '-'])
      expect(COMPAT_ACCESS).toContain(
        `DROP OPERATOR IF EXISTS ${op} (timestamp, integer);\nCREATE OPERATOR ${op} (`,
      )
  })
})

describe('planification', () => {
  const p: Planif = {
    intervalleMin: 30,
    jours: [1, 2, 3, 4, 5],
    heureDebut: '08:00',
    heureFin: '18:00',
  }
  // mercredi 9 septembre 2026
  const mer = (h: number, m = 0) => new Date(2026, 8, 9, h, m)

  it('normalise les saisies douteuses', () => {
    expect(normaliserPlanif(null)).toEqual({
      ...PLANIF_DEFAUT,
      intervalleMin: 0,
    })
    expect(
      normaliserPlanif({
        intervalleMin: 15.7,
        jours: [1, 1, 9],
        heureDebut: '9:30',
        heureFin: '17:00',
      }),
    ).toEqual({
      intervalleMin: 15,
      jours: [1],
      heureDebut: '09:30',
      heureFin: '17:00',
    })
    // début >= fin : journée entière
    expect(
      normaliserPlanif({
        intervalleMin: 5,
        heureDebut: '18:00',
        heureFin: '08:00',
      }),
    ).toMatchObject({
      heureDebut: '00:00',
      heureFin: '24:00',
    })
  })
  it('dans la fenêtre : depuis + intervalle', () => {
    expect(prochainPassage(mer(10), p)).toEqual(mer(10, 30))
  })
  it('après la fermeture : ouverture du lendemain', () => {
    expect(prochainPassage(mer(17, 45), p)).toEqual(new Date(2026, 8, 10, 8))
  })
  it('avant l’ouverture : ouverture du jour', () => {
    expect(prochainPassage(mer(7), p)).toEqual(mer(8))
  })
  it('vendredi soir : lundi matin', () => {
    expect(prochainPassage(new Date(2026, 8, 11, 17, 50), p)).toEqual(
      new Date(2026, 8, 14, 8),
    )
  })
  it('désactivée : null', () => {
    expect(prochainPassage(mer(10), { ...p, intervalleMin: 0 })).toBeNull()
  })
  it('journée entière tous les jours : simple intervalle', () => {
    expect(
      prochainPassage(new Date(2026, 8, 12, 23, 50), {
        ...PLANIF_DEFAUT,
        intervalleMin: 20,
      }),
    ).toEqual(new Date(2026, 8, 13, 0, 10))
  })
})
