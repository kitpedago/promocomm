import { describe, expect, it } from 'vitest'

import {
  affectationTotal,
  anneeInvalide,
  cahtTotal,
  quotePart,
  resultatFiscal,
  totalFiscalSccv,
} from './bilan.helpers.ts'

describe('bilan.helpers', () => {
  it('cahtTotal somme les composantes, null si tout est vide', () => {
    expect(
      cahtTotal({
        cahtVefa: 1025500,
        cahtLvPsla: null,
        cahtLoyers: null,
        cahtTma: 8396.9,
        cahtTerrain: null,
        cahtAutres: null,
      }),
    ).toBeCloseTo(1033896.9, 2)
    expect(
      cahtTotal({
        cahtVefa: null,
        cahtLvPsla: null,
        cahtLoyers: null,
        cahtTma: null,
        cahtTerrain: null,
        cahtAutres: null,
      }),
    ).toBeNull()
  })

  it('affectationTotal = RAN + compte courant', () => {
    expect(
      affectationTotal({ ranSccv: -37120.24, cpteCourantSccv: null }),
    ).toBe(-37120.24)
    expect(
      affectationTotal({ ranSccv: null, cpteCourantSccv: null }),
    ).toBeNull()
  })

  it('resultatFiscal = compta + réintégration − déduction', () => {
    expect(
      resultatFiscal({
        resultCptaSccvTotal: 535025.96,
        reintegrationFiscaleSccv: 0,
        deductionFiscaleSccv: 0,
      }),
    ).toBe(535025.96)
  })

  it('totalFiscalSccv = IS + non IS', () => {
    expect(
      totalFiscalSccv({ resultFiscaSccvIs: 61412.14, resultFiscaSccvNonIs: 0 }),
    ).toBe(61412.14)
  })

  it('quotePart applique la fraction, null si % absent ou nul (iso-WinDev)', () => {
    expect(quotePart(61412.14, 0.5)).toBeCloseTo(30706.07, 2)
    expect(quotePart(61412.14, 0)).toBeNull()
    expect(quotePart(null, 0.5)).toBeNull()
  })

  it('anneeInvalide borne 2001–2099', () => {
    expect(anneeInvalide(2000)).toBe(true)
    expect(anneeInvalide(2100)).toBe(true)
    expect(anneeInvalide(2015)).toBe(false)
    expect(anneeInvalide(null)).toBe(true)
  })
})
