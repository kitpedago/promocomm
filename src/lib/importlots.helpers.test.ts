import { expect, test } from 'vitest'

import { CHAMPS_IMPORT_LOT, preparerImportLots } from './importlots.helpers.ts'

import type { Cellule } from './xlsx.ts'

const ENTETES: Array<Cellule> = CHAMPS_IMPORT_LOT.map((c) => c.colonne)
const ligne = (valeurs: Record<string, Cellule>): Array<Cellule> =>
  CHAMPS_IMPORT_LOT.map((c) => valeurs[c.colonne] ?? null)

test('importe les lignes jusqu’à TOTAUX', () => {
  const r = preparerImportLots([
    ENTETES,
    ligne({
      'Numéro de lot': 101,
      'Famille de bien': ' APPARTEMENT ',
      'Sfc habitable': 64.35,
      'Prix de vente TTC': '163 000,00 €',
      'Tx Vente': 0.055,
    }),
    [],
    ligne({ 'Numéro de lot': 'A02/P14', 'Tx Vente': 20 }),
    ['TOTAUX', null, 999],
    ligne({ 'Numéro de lot': 'après le total' }),
  ])
  expect(r.erreurs).toEqual([])
  expect(r.lots).toHaveLength(2)
  expect(r.lots[0]).toMatchObject({
    numLot: '101',
    familleDeBien: 'APPARTEMENT',
    surfHabitable: 64.35,
    prixVenteTtc: 163000,
    tva: '5.5',
    notes: null,
  })
  expect(r.lots[1]).toMatchObject({ numLot: 'A02/P14', tva: '20' })
})

test('entêtes reconnus sans casse, accents ni espaces, dans le désordre', () => {
  const entetes = [...ENTETES].reverse().map((e) => String(e).toUpperCase())
  entetes[entetes.indexOf('N°PARCELLE')] = 'n° parcelle'
  const valeurs = [...ligne({ 'Numéro de lot': 'B1', 'N°parcelle': 'AB 12' })]
  const r = preparerImportLots([entetes, valeurs.reverse()])
  expect(r.erreurs).toEqual([])
  expect(r.lots[0]).toMatchObject({ numLot: 'B1', numParcelle: 'AB 12' })
})

test('colonnes absentes : import refusé, colonnes nommées', () => {
  const r = preparerImportLots([
    ENTETES.filter((e) => e !== 'Notes' && e !== 'Balcon'),
    ['101'],
  ])
  expect(r.lots).toEqual([])
  expect(r.erreurs).toEqual([
    '2 colonne(s) absente(s) de la ligne 1 : « Balcon », « Notes ».',
  ])
})

test('fichier qui n’est pas une trame de lots', () => {
  const r = preparerImportLots([
    ['Nom', 'Prénom'],
    ['DUPONT', 'Jean'],
  ])
  expect(r.lots).toEqual([])
  expect(r.erreurs[0]).toMatch(/Aucune colonne de lot/)
})

test('signale les valeurs inexploitables avec leur ligne', () => {
  const r = preparerImportLots([
    ENTETES,
    ligne({ 'Numéro de lot': '101', Garage: 'oui' }),
    ligne({ 'Famille de bien': 'PARKING' }),
  ])
  expect(r.erreurs).toEqual([
    'Ligne 2, colonne « Garage » : « oui » n’est pas un nombre.',
    'Ligne 3 : numéro de lot manquant.',
  ])
})
