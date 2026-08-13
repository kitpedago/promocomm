import { expect, test } from 'vitest'

import {
  LIMITE_CLE,
  LIMITE_VALEUR,
  resoudrePref,
  selectionARejouer,
  verifierEntree,
} from './preferences.ts'

test('rien de stocké → le défaut', () => {
  expect(resoudrePref(undefined, { pageSize: 50 })).toEqual({ pageSize: 50 })
  expect(resoudrePref(null, { pageSize: 50 })).toEqual({ pageSize: 50 })
})

test('objet partiel → fusion, les champs manquants viennent du défaut', () => {
  const defaut = { pageSize: 50, uneLigne: true, ligneCompacte: false }
  expect(resoudrePref({ pageSize: 100 }, defaut)).toEqual({
    pageSize: 100,
    uneLigne: true,
    ligneCompacte: false,
  })
})

test('primitive stockée → renvoyée telle quelle, sans fusion', () => {
  expect(resoudrePref('Terrain', "Stade d'avancement")).toBe('Terrain')
  expect(resoudrePref(0, 50)).toBe(0)
  expect(resoudrePref(false, true)).toBe(false)
})

test('tableau stocké → remplacement, pas de fusion index par index', () => {
  expect(resoudrePref(['b'], ['a', 'z'])).toEqual(['b'])
})

test('défaut objet, valeur stockée tableau → pas de fusion', () => {
  expect(resoudrePref(['a'], { pageSize: 50 })).toEqual(['a'])
})

test('entrée valide acceptée', () => {
  expect(() =>
    verifierEntree('table:operations-stades', { pageSize: 50 }),
  ).not.toThrow()
})

test('clé vide ou trop longue rejetée', () => {
  expect(() => verifierEntree('', {})).toThrow('Clé de préférence invalide')
  expect(() => verifierEntree('x'.repeat(LIMITE_CLE + 1), {})).toThrow(
    'Clé de préférence invalide',
  )
})

test('valeur trop volumineuse rejetée', () => {
  const gros = { texte: 'x'.repeat(LIMITE_VALEUR) }
  expect(() => verifierEntree('table:x', gros)).toThrow(
    'Préférence trop volumineuse',
  )
})

test('valeur non sérialisable rejetée', () => {
  const cyclique: Record<string, unknown> = {}
  cyclique.moi = cyclique
  expect(() => verifierEntree('table:x', cyclique)).toThrow(
    'Préférence trop volumineuse',
  )
})

test('selectionARejouer : rien en préférence → rien à rejouer', () => {
  expect(selectionARejouer({}, undefined)).toBeUndefined()
})

test('selectionARejouer : tranche sans opération → rien à rejouer', () => {
  expect(
    selectionARejouer({ selection: { tranche: 5 } }, undefined),
  ).toBeUndefined()
})

test('selectionARejouer : op à 0 → rien à rejouer (sinon boucle avec validateSearch, qui traite 0 comme absent)', () => {
  expect(selectionARejouer({ selection: { op: 0 } }, undefined)).toBeUndefined()
})

test('selectionARejouer : opération valide (même introuvable en base) → rejouée', () => {
  expect(selectionARejouer({ selection: { op: 999999 } }, undefined)).toEqual({
    op: 999999,
    tranche: undefined,
  })
})

test('selectionARejouer : opération et tranche valides → les deux rejouées', () => {
  expect(
    selectionARejouer({ selection: { op: 5, tranche: 12 } }, undefined),
  ).toEqual({ op: 5, tranche: 12 })
})

test('selectionARejouer : valeur stockée non-objet → rien à rejouer', () => {
  expect(
    selectionARejouer({ selection: 'operations' }, undefined),
  ).toBeUndefined()
  expect(selectionARejouer({ selection: 42 }, undefined)).toBeUndefined()
  expect(selectionARejouer({ selection: ['op'] }, undefined)).toBeUndefined()
  expect(selectionARejouer({ selection: null }, undefined)).toBeUndefined()
})

test('selectionARejouer : search.op déjà renseigné → rien à rejouer', () => {
  expect(selectionARejouer({ selection: { op: 5 } }, 7)).toBeUndefined()
})
