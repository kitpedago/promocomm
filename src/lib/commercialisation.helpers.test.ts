import { describe, expect, it } from 'vitest'

import {
  calculerMontantHt,
  calculerRemise,
  tauxDepuisTexte,
} from './commercialisation.helpers.ts'

describe('commercialisation.helpers', () => {
  it('calculerMontantHt retrouve les HT du legacy', () => {
    // réservations relevées en base : TTC, taux → HT enregistré par WinDev
    expect(calculerMontantHt(163000, 5.5)).toBe(154502.37)
    expect(calculerMontantHt(223000, 20)).toBe(185833.33)
    expect(calculerMontantHt(165000, 20)).toBe(137500)
  })

  it('calculerMontantHt attend le prix et le taux', () => {
    expect(calculerMontantHt(null, 20)).toBeNull()
    expect(calculerMontantHt(100000, null)).toBeNull()
  })

  it('calculerRemise = prix grille − prix réel', () => {
    expect(calculerRemise(170000, 163000)).toBe(7000)
    expect(calculerRemise(null, 163000)).toBeNull()
  })

  it('tauxDepuisTexte lit les TVA texte du lot', () => {
    expect(tauxDepuisTexte('5.5')).toBe(5.5)
    expect(tauxDepuisTexte('5,5')).toBe(5.5)
    expect(tauxDepuisTexte('20')).toBe(20)
    expect(tauxDepuisTexte('')).toBeNull()
    expect(tauxDepuisTexte(null)).toBeNull()
    expect(tauxDepuisTexte('exonéré')).toBeNull()
  })
})
