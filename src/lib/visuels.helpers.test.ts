import { describe, expect, it } from 'vitest'

import {
  extraireImagesProgramme,
  extraireLocs,
  slugifier,
  slugsDeSection,
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

describe('extraireLocs / slugsDeSection', () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://keredes.coop/actualites/</loc></url>
    <url><loc>https://keredes.coop/actualites/la-residence-aldea-a-cesson-sevigne-est-livree/</loc></url>
    <url><loc>https://keredes.coop/actualites/club-agir-keredes/</loc></url>
    <url><loc>https://keredes.coop/bien-neuf/switch/</loc></url>
  </urlset>`
  it('extrait les <loc>', () => {
    expect(extraireLocs(xml)).toHaveLength(4)
  })
  it('slugs d\'une section, racine exclue', () => {
    expect(slugsDeSection(extraireLocs(xml), 'actualites')).toEqual([
      'la-residence-aldea-a-cesson-sevigne-est-livree',
      'club-agir-keredes',
    ])
    expect(slugsDeSection(extraireLocs(xml), 'bien-neuf')).toEqual(['switch'])
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
  it('matche un slug d\'actualité contenant le libellé', () => {
    expect(
      trouverSlug('ALDEA', ['club-agir-keredes', 'la-residence-aldea-a-cesson-sevigne-est-livree']),
    ).toBe('la-residence-aldea-a-cesson-sevigne-est-livree')
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
  it('classes par ordre de priorité (hero avant galerie), dédupliqué', () => {
    const actu = `
      <img src="https://keredes.coop/app/uploads/g1.jpg" class="baseGallery__image" />
      <img src="https://keredes.coop/app/uploads/hero.jpg" class="newsHero__image" />
      <img src="https://keredes.coop/app/uploads/hero.jpg" class="baseGallery__image" />`
    expect(
      extraireImagesProgramme(actu, ['newsHero__image', 'baseGallery__image']),
    ).toEqual([
      'https://keredes.coop/app/uploads/hero.jpg',
      'https://keredes.coop/app/uploads/g1.jpg',
    ])
  })
})
