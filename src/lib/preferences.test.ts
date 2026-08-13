import { expect, test } from 'vitest'

import {
  LIMITE_CLE,
  LIMITE_VALEUR,
  resoudrePref,
  sccvARejouer,
  selectionAMemoriser,
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

// sccvARejouer : mêmes gardes que selectionARejouer, pour la clé `sccv`
test('sccvARejouer : rien en préférence → rien à rejouer', () => {
  expect(sccvARejouer({}, undefined)).toBeUndefined()
})

test('sccvARejouer : sccv à 0 ou non-numérique → rien à rejouer (garde anti-boucle)', () => {
  expect(sccvARejouer({ sccv: 0 }, undefined)).toBeUndefined()
  expect(sccvARejouer({ sccv: 'douze' }, undefined)).toBeUndefined()
  expect(sccvARejouer({ sccv: { id: 5 } }, undefined)).toBeUndefined()
})

test('sccvARejouer : id valide → rejoué', () => {
  expect(sccvARejouer({ sccv: 42 }, undefined)).toBe(42)
})

test('sccvARejouer : search.sccv déjà renseigné → rien à rejouer', () => {
  expect(sccvARejouer({ sccv: 42 }, 7)).toBeUndefined()
})

// resoudrePref sans le cast `as T` : la fusion doit rester typée et complète
test('fusion sans cast : le défaut fournit les champs absents, le stocké gagne', () => {
  const defaut = { replie: false, recherche: '', inclureMasques: false }
  const v = resoudrePref({ recherche: 'BEAUVAIS' }, defaut)
  expect(v).toEqual({
    replie: false,
    recherche: 'BEAUVAIS',
    inclureMasques: false,
  })
  // le défaut n'est pas muté : usePref le reçoit à chaque rendu
  expect(defaut.recherche).toBe('')
})

test('fusion : une valeur falsy stockée écrase bien le défaut', () => {
  expect(resoudrePref({ uneLigne: false }, { uneLigne: true })).toEqual({
    uneLigne: false,
  })
})

// M5 : un lien explicite ?op= devient la sélection mémorisée
test('selectionAMemoriser : URL sans opération → rien à écrire', () => {
  expect(selectionAMemoriser({ op: 412 }, undefined, undefined)).toBeUndefined()
})

test('selectionAMemoriser : URL déjà égale à la mémoire → rien à écrire', () => {
  expect(selectionAMemoriser({ op: 99, tranche: 3 }, 99, 3)).toBeUndefined()
  expect(selectionAMemoriser({}, undefined, undefined)).toBeUndefined()
  expect(
    selectionAMemoriser({ op: 99, tranche: undefined }, 99, undefined),
  ).toBeUndefined()
})

test('selectionAMemoriser : lien partagé sur une autre opération → écrite', () => {
  expect(selectionAMemoriser({ op: 412, tranche: 87 }, 99, 5)).toEqual({
    op: 99,
    tranche: 5,
  })
})

test('selectionAMemoriser : même opération, tranche différente → écrite', () => {
  expect(selectionAMemoriser({ op: 99, tranche: 3 }, 99, 5)).toEqual({
    op: 99,
    tranche: 5,
  })
  // tranche mémorisée disparue : la page retombe sur la première et la mémoire
  // se répare
  expect(selectionAMemoriser({ op: 99, tranche: 87 }, 99, 1)).toEqual({
    op: 99,
    tranche: 1,
  })
})

test('selectionAMemoriser : rien de mémorisé encore → écrite', () => {
  expect(selectionAMemoriser({}, 99, undefined)).toEqual({
    op: 99,
    tranche: undefined,
  })
})

// R1 : tant que la requête d'opération n'a pas répondu, trancheActive vaut
// undefined — ça ne doit pas écraser la tranche mémorisée (sinon perdue pour
// de bon si la requête échoue avant d'aboutir).
test('selectionAMemoriser : même opération, tranche pas encore connue → rien à écrire', () => {
  expect(
    selectionAMemoriser({ op: 68, tranche: 250 }, 68, undefined),
  ).toBeUndefined()
})

test('selectionAMemoriser : opération changée, tranche pas encore connue → écrite, tranche effacée', () => {
  expect(selectionAMemoriser({ op: 68, tranche: 250 }, 99, undefined)).toEqual({
    op: 99,
    tranche: undefined,
  })
})

test('selectionAMemoriser : même opération, tranche différente connue → écrite', () => {
  expect(selectionAMemoriser({ op: 68, tranche: 250 }, 68, 300)).toEqual({
    op: 68,
    tranche: 300,
  })
})
