import { describe, expect, it } from 'vitest'

import { copies } from '#/lib/etl/transform.ts'

import {
  PLANIF_DEFAUT,
  colonneLegacy,
  inverser,
  normaliserPlanif,
  prochainPassage,
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
