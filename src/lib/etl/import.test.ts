import { describe, expect, it } from 'vitest'

import { msTypeToPg } from './import.ts'

describe('msTypeToPg', () => {
  it('garde la longueur des textes courts, lus par Access en jointure', () => {
    expect(msTypeToPg('nvarchar', undefined, undefined, 255)).toBe(
      'varchar(255)',
    )
    expect(msTypeToPg('nchar', undefined, undefined, 3)).toBe('varchar(3)')
  })
  it('passe en text les textes longs ou sans limite', () => {
    expect(msTypeToPg('nvarchar', undefined, undefined, -1)).toBe('text')
    expect(msTypeToPg('nvarchar', undefined, undefined, 4000)).toBe('text')
    expect(msTypeToPg('ntext', undefined, undefined, 1073741823)).toBe('text')
  })
})
