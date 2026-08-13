import { describe, expect, it } from 'vitest'

import { totalFacture } from './honoraires.helpers.ts'

describe('honoraires.helpers', () => {
  it('totalFacture somme les quatre montants, NULL compté 0', () => {
    // facture 171257 de LES PALOMAS : avoir CLA seul
    expect(
      totalFacture({
        montantResa: null,
        montantActe: null,
        montantCla: -1000,
        montantLeveeOption: null,
      }),
    ).toBe(-1000)
    expect(
      totalFacture({
        montantResa: 1000,
        montantActe: 4000,
        montantCla: 2000,
        montantLeveeOption: 1000,
      }),
    ).toBe(8000)
    expect(
      totalFacture({
        montantResa: null,
        montantActe: null,
        montantCla: null,
        montantLeveeOption: null,
      }),
    ).toBe(0)
  })
})
