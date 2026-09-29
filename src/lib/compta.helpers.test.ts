import { describe, expect, it } from 'vitest'

import { precomEnPourcent, valeursSuivi } from './compta.helpers.ts'

describe('precomEnPourcent', () => {
  it('ramène en % les fractions du legacy', () => {
    expect(precomEnPourcent(0.4)).toBe(40)
    expect(precomEnPourcent(1)).toBe(100)
  })

  it('laisse les pourcentages et les vides', () => {
    expect(precomEnPourcent(38.86)).toBe(38.86)
    expect(precomEnPourcent(0)).toBe(0)
    expect(precomEnPourcent(null)).toBeNull()
  })
})

describe('valeursSuivi', () => {
  it("n'écrit que les clés présentes dans la fiche", () => {
    expect(
      valeursSuivi({
        id: 7,
        cahtPrevPsla: 0,
        cahtPrevCommentaire: '',
        fraisBudgetDate: '2026-09-29',
        fraisReelDate: null,
      }),
    ).toEqual({
      cahtPrevPsla: 0,
      cahtPrevCommentaire: null,
      fraisBudgetDate: new Date('2026-09-29'),
      fraisReelDate: null,
    })
  })

  it('ignore les colonnes de la tranche étrangères au suivi', () => {
    expect(
      valeursSuivi({ id: 7, libelle: 'X', operationId: 1 } as never),
    ).toEqual({})
  })
})
