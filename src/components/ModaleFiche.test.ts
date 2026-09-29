import { describe, expect, it } from 'vitest'

import { decouperOnglets, depuisLigne, versFiche } from './ModaleFiche.tsx'
import type { DescChamp } from './ModaleFiche.tsx'

describe('ModaleFiche', () => {
  const nom: DescChamp = { k: 'libelle', l: 'Nom', t: 'texte' }
  const etages: DescChamp = { k: 'nbEtage', l: 'Nb étages', t: 'entier' }
  const montant: DescChamp = { k: 'terrainMontantHt', l: 'HT', t: 'nombre' }
  const avecOnglets: Array<DescChamp> = [
    nom,
    { t: 'onglet', l: 'Détails' },
    etages,
    { t: 'onglet', l: 'Terrains' },
    montant,
  ]

  it('sans marqueur onglet, tous les champs restent dans le bloc haut', () => {
    expect(decouperOnglets([nom, etages])).toEqual({
      haut: [nom, etages],
      onglets: [],
    })
  })

  it('les champs se rangent sous le dernier marqueur onglet rencontré', () => {
    expect(decouperOnglets(avecOnglets)).toEqual({
      haut: [nom],
      onglets: [
        { l: 'Détails', champs: [etages] },
        { l: 'Terrains', champs: [montant] },
      ],
    })
  })

  it('un pourcent se saisit en % et repart en fraction', () => {
    const champs: Array<DescChamp> = [
      { k: 'taux', l: 'Taux', t: 'pourcent' },
      montant,
    ]
    const valeurs = depuisLigne(champs, { taux: 0.0035, terrainMontantHt: 12 })
    expect(valeurs).toEqual({ taux: 0.35, terrainMontantHt: 12 })
    const fiche = versFiche(champs, valeurs)
    expect(fiche.taux).toBeCloseTo(0.0035, 10)
    expect(fiche.terrainMontantHt).toBe(12)
    expect(versFiche(champs, depuisLigne(champs, null)).taux).toBeNull()
  })

  it('un champ zeroSiVide vaut 0 à défaut de valeur, jamais vide', () => {
    const champs: Array<DescChamp> = [{ ...etages, zeroSiVide: true }, montant]
    expect(depuisLigne(champs, null)).toEqual({
      nbEtage: 0,
      terrainMontantHt: null,
    })
    expect(depuisLigne(champs, { nbEtage: null }).nbEtage).toBe(0)
    expect(depuisLigne(champs, { nbEtage: 3 }).nbEtage).toBe(3)
  })

  it('les marqueurs onglet ne produisent aucune valeur de fiche', () => {
    expect(Object.keys(depuisLigne(avecOnglets, null))).toEqual([
      'libelle',
      'nbEtage',
      'terrainMontantHt',
    ])
  })
})
