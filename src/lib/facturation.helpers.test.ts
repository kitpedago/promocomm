import { describe, expect, it } from 'vitest'

import {
  adresseFacturation,
  libelleCompta,
  sansPrefixeSccv,
  siren,
} from './facturation.helpers'

describe('facturation électronique', () => {
  it('retire le préfixe SCCV du nom', () => {
    expect(sansPrefixeSccv('SCCV LES BLEUETS')).toBe('LES BLEUETS')
    expect(sansPrefixeSccv('sccv  Pilate')).toBe('Pilate')
    expect(sansPrefixeSccv('SNC HOCHE')).toBe('SNC HOCHE')
    expect(sansPrefixeSccv('SCCVISTE')).toBe('SCCVISTE')
  })
  it('extrait le SIREN du SIRET', () => {
    expect(siren('78996531600019')).toBe('789965316')
    expect(siren('789 965 316 00019')).toBe('789965316')
    expect(siren('532556529')).toBe('532556529')
    expect(siren('12345')).toBe('')
    expect(siren(null)).toBe('')
  })
  it("forme l'adresse de facturation, vide si SIREN ou suffixe manque", () => {
    expect(adresseFacturation('78996531600019', '@ARC')).toBe('789965316_@ARC')
    expect(adresseFacturation('78996531600019', ' ')).toBe('')
    expect(adresseFacturation(null, '@ARC')).toBe('')
  })
  it('affiche le libellé court du gestionnaire, sinon le libellé', () => {
    expect(libelleCompta('ARC PROMOTION', 'ARC')).toBe('ARC')
    expect(libelleCompta('ARC PROMOTION', '  ')).toBe('ARC PROMOTION')
    expect(libelleCompta(null, null)).toBe('')
  })
})
