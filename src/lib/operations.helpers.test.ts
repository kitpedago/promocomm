import { describe, expect, it } from 'vitest'

import { cachesStades, synchroniserDates } from './operations.helpers.ts'

import type { StadeTranche } from './operations.helpers.ts'

describe('operations.helpers', () => {
  const freres: Array<{
    id: number
    datePreviMajPromo: string | null
    dateReelle: string | null
  }> = [
    { id: 1, datePreviMajPromo: '2026-01-10', dateReelle: null },
    { id: 2, datePreviMajPromo: null, dateReelle: '2025-12-01' },
  ]

  it('la date prévi promo saisie écrase celle des autres tranches', () => {
    expect(
      synchroniserDates(
        { datePreviMajPromo: '2026-03-15', dateReelle: null },
        freres,
      ).map((f) => f.datePreviMajPromo),
    ).toEqual(['2026-03-15', '2026-03-15'])
  })

  it('la date réelle ne remplit que les vides', () => {
    expect(
      synchroniserDates(
        { datePreviMajPromo: null, dateReelle: '2026-02-20' },
        freres,
      ).map((f) => f.dateReelle),
    ).toEqual(['2026-02-20', '2025-12-01'])
  })

  it('saisie vide → rien ne bouge', () => {
    expect(
      synchroniserDates<string, (typeof freres)[number]>(
        { datePreviMajPromo: null, dateReelle: null },
        freres,
      ),
    ).toEqual(freres)
  })
})

describe('cachesStades (trigger StadeAvancement_update)', () => {
  const j = (s: string) => new Date(s)
  // listeAvancementId = ordre = id : un stade par ligne, dans l'ordre de la liste
  const stade = (
    n: number,
    s: Partial<StadeTranche> & { previ?: string; reelle?: string } = {},
  ): StadeTranche => ({
    id: n,
    listeAvancementId: n,
    ordre: n,
    code: null,
    avecSuivi: true,
    datePreviMajPromo: s.previ ? j(s.previ) : null,
    dateReelle: s.reelle ? j(s.reelle) : null,
    ...s,
  })

  it('stade_com : date réelle du stade COM', () => {
    expect(
      cachesStades([
        stade(1, { code: 'ESQ', reelle: '2026-01-05' }),
        stade(2, { code: 'COM', reelle: '2026-02-10' }),
      ]).stadeCom,
    ).toEqual(j('2026-02-10'))
    expect(cachesStades([stade(2, { code: 'COM' })]).stadeCom).toBeNull()
  })

  it('situation : étude, travaux depuis OS, livré depuis LIV, fin SAV', () => {
    const situation = (dates: Record<string, string | undefined>) => {
      const c = cachesStades(
        Object.entries(dates).map(([code, reelle], i) =>
          stade(i + 1, { code, reelle }),
        ),
      )
      return [c.situationId, c.situationDepuisLe]
    }
    expect(situation({ OS: undefined, LIV: undefined })).toEqual([1, null])
    expect(situation({ OS: '2026-03-01', LIV: undefined })).toEqual([
      2,
      j('2026-03-01'),
    ])
    expect(situation({ OS: '2026-03-01', LIV: '2027-09-15' })).toEqual([
      3,
      j('2027-09-15'),
    ])
    expect(
      situation({ OS: '2026-03-01', LIV: '2027-09-15', SAV: '2028-09-15' }),
    ).toEqual([4, j('2028-09-15')])
  })

  it('situation : livraison sans OS → laissée telle quelle, comme WinDev', () => {
    const c = cachesStades([
      stade(1, { code: 'OS' }),
      stade(2, { code: 'LIV', reelle: '2027-09-15' }),
    ])
    expect('situationId' in c).toBe(false)
    expect('situationDepuisLe' in c).toBe(false)
  })

  it('actuel : dernier stade réalisé, à date égale le premier dans l’ordre', () => {
    const c = cachesStades([
      stade(1, { reelle: '2026-01-05' }),
      stade(3, { reelle: '2026-04-20' }),
      stade(2, { reelle: '2026-04-20' }),
      stade(4, { previ: '2026-06-01' }),
    ])
    expect(c.listeAvancementActuelId).toBe(2)
  })

  it('prochain : stade non réalisé à la prévi la plus proche après le stade actuel', () => {
    const c = cachesStades([
      stade(1, { previ: '2026-01-01', reelle: '2026-04-20' }),
      // prévi dépassée par le stade actuel : pas un « prochain »
      stade(2, { previ: '2026-03-01' }),
      stade(3, { previ: '2026-09-01' }),
      stade(4, { previ: '2026-06-01' }),
      // déjà réalisé, même avec une prévi à venir
      stade(5, { previ: '2026-05-01', reelle: '2026-02-01' }),
    ])
    expect(c.listeAvancementActuelId).toBe(1)
    expect(c.listeAvancementProchainId).toBe(4)
  })

  it('prochain : à prévi égale, le premier dans l’ordre', () => {
    const c = cachesStades([
      stade(3, { previ: '2026-06-01' }),
      stade(2, { previ: '2026-06-01' }),
    ])
    expect(c.listeAvancementActuelId).toBeNull()
    expect(c.listeAvancementProchainId).toBe(2)
  })

  it('suivi : actuel et prochain pris parmi les seuls stades suivis', () => {
    const c = cachesStades([
      stade(1, { reelle: '2026-01-05' }),
      stade(2, { reelle: '2026-04-20', avecSuivi: false }),
      stade(3, { previ: '2026-03-01' }),
      stade(4, { previ: '2026-05-01', avecSuivi: false }),
      stade(5, { previ: '2026-06-01' }),
    ])
    expect([c.listeAvancementActuelId, c.listeAvancementProchainId]).toEqual([
      2, 4,
    ])
    expect([
      c.listeAvancementSuiviActuelId,
      c.listeAvancementSuiviProchainId,
    ]).toEqual([1, 3])
  })

  it('aucun stade : tout est vide, situation étude', () => {
    expect(cachesStades([])).toEqual({
      stadeCom: null,
      situationId: 1,
      situationDepuisLe: null,
      listeAvancementActuelId: null,
      listeAvancementProchainId: null,
      listeAvancementSuiviActuelId: null,
      listeAvancementSuiviProchainId: null,
    })
  })
})
