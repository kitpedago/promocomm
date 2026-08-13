import { describe, expect, it } from 'vitest'

import { nextCodeReserve } from './sav.helpers.ts'

describe('sav.helpers', () => {
  it('incrémente après le dernier « / » sur 2 chiffres minimum', () => {
    expect(nextCodeReserve(['A015-TIN/09', 'A015-TIN/10'])).toBe('A015-TIN/11')
    expect(nextCodeReserve(['03-OLI/08'])).toBe('03-OLI/09')
    expect(nextCodeReserve(['X/99'])).toBe('X/100')
  })
  it('ne considère que les codes de longueur maximale (iso-WinDev)', () => {
    // « A015-TIN/9 » plus court est ignoré face à « A015-TIN/10 »
    expect(nextCodeReserve(['A015-TIN/9', 'A015-TIN/10'])).toBe('A015-TIN/11')
  })
  it("vide si pas de « / » numérique ou pas d'existant", () => {
    expect(nextCodeReserve([])).toBe('')
    expect(nextCodeReserve(['SANS-SLASH'])).toBe('')
    expect(nextCodeReserve(['AB/X1'])).toBe('')
    expect(nextCodeReserve([null])).toBe('')
  })
})
