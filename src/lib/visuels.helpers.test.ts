import { describe, expect, it } from 'vitest'

import {
  extraireImagesProgramme,
  extraireSlugs,
  slugifier,
  trouverSlug,
} from '#/lib/visuels.helpers.ts'

describe('slugifier', () => {
  it('minuscules, sans accents, tirets', () => {
    expect(slugifier("L'Orée du TER")).toBe('l-oree-du-ter')
    expect(slugifier('ALBATROS')).toBe('albatros')
    expect(slugifier('  Cœur Sancé — Rennes ')).toBe('coeur-sance-rennes')
  })
  it('vide si rien d\'exploitable', () => {
    expect(slugifier(' — ')).toBe('')
  })
})

describe('extraireSlugs', () => {
  it('déduplique les slugs bien-neuf', () => {
    const html = `<a href="https://keredes.coop/bien-neuf/switch/">x</a>
      <a href="/bien-neuf/switch/">y</a>
      <a href="https://keredes.coop/bien-neuf/les-partitions/">z</a>`
    expect(extraireSlugs(html)).toEqual(['switch', 'les-partitions'])
  })
})

describe('trouverSlug', () => {
  const slugs = ['switch', 'chemin-des-alouettes', 'loree-du-ter', 'cours-lawrence']
  it('correspondance exacte', () => {
    expect(trouverSlug('SWITCH', slugs)).toBe('switch')
  })
  it('« contient » sans tirets, dans les deux sens', () => {
    expect(trouverSlug("L'Orée du TER", slugs)).toBe('loree-du-ter')
    expect(trouverSlug('COUR LAWRENCE', slugs)).toBe('cours-lawrence')
  })
  it('null si aucun candidat', () => {
    expect(trouverSlug('ALBATROS', slugs)).toBeNull()
    expect(trouverSlug('', slugs)).toBeNull()
  })
})

describe('extraireImagesProgramme', () => {
  // Structure réelle observée sur keredes.coop/bien-neuf/switch/ (2026-08)
  const html = `
    <img width="1600" src="https://keredes.coop/app/uploads/2026/07/Switch-Lorient.png"
      class="estateImages__image" srcset="https://keredes.coop/app/uploads/2026/07/Switch-Lorient.png 1600w,
      https://keredes.coop/app/uploads/2026/07/Switch-Lorient-300x200.png 300w,
      https://keredes.coop/app/uploads/2026/07/Switch-Lorient-1024x681.png 1024w" />
    <img src="https://keredes.coop/app/themes/keredes/logo.svg" class="header__logo" />
    <img width="1600" src="https://keredes.coop/app/uploads/2026/07/Switch-Lorient.png"
      class="newsHero__image" />
    <img src="https://keredes.coop/app/uploads/2026/07/Switch-2.png" class="estateImages__image" />`
  it('classe estateImages__image seulement, variante srcset ≤ 1280w préférée, dédupliqué', () => {
    expect(extraireImagesProgramme(html)).toEqual([
      'https://keredes.coop/app/uploads/2026/07/Switch-Lorient-1024x681.png',
      'https://keredes.coop/app/uploads/2026/07/Switch-2.png',
    ])
  })
  it('vide si structure absente', () => {
    expect(extraireImagesProgramme('<html></html>')).toEqual([])
  })
})
