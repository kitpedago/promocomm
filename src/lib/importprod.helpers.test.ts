import { describe, expect, it } from 'vitest'

import {
  construireInsert,
  taillePaquet,
  valeurParam,
} from './importprod.helpers.ts'

const col = (nom: string, json = false) => ({ nom, json })

describe('taillePaquet', () => {
  it('reste sous les 65535 paramètres de PostgreSQL', () => {
    for (const cols of [1, 7, 120, 900]) {
      expect(taillePaquet(cols) * cols).toBeLessThan(65_535)
    }
  })
  it('vaut au moins 1 même pour une table absurde', () => {
    expect(taillePaquet(100_000)).toBe(1)
  })
})

describe('valeurParam', () => {
  it('ré-encode les colonnes json, y compris scalaires et tableaux', () => {
    expect(valeurParam(col('v', true), 'abc')).toBe('"abc"')
    expect(valeurParam(col('v', true), [1, 2])).toBe('[1,2]')
    expect(valeurParam(col('v', true), { a: 1 })).toBe('{"a":1}')
  })
  it('laisse NULL et les colonnes non json intacts', () => {
    expect(valeurParam(col('v', true), null)).toBeNull()
    expect(valeurParam(col('v'), 'abc')).toBe('abc')
  })
})

describe('construireInsert', () => {
  it('numérote les placeholders en continu sur toutes les lignes', () => {
    const { sql, params } = construireInsert(
      'op',
      [col('id'), col('nom')],
      [
        { id: 1, nom: 'a' },
        { id: 2, nom: 'b' },
      ],
    )
    expect(sql).toBe(
      'INSERT INTO public."op" ("id","nom") VALUES ($1,$2),($3,$4)',
    )
    expect(params).toEqual([1, 'a', 2, 'b'])
  })
})
