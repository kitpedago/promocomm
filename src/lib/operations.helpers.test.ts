import { describe, expect, it } from 'vitest'

import { synchroniserDates } from './operations.helpers.ts'

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
