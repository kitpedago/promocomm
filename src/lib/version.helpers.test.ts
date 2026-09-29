import { describe, expect, it } from 'vitest'

import { tagMigration } from './version.helpers.ts'

const journal = [
  { when: 1790000000000, tag: '0035_corrections_recette' },
  { when: 1790694290318, tag: '0036_wakeful_vision' },
]

describe('tagMigration', () => {
  it('retrouve le tag depuis created_at, rendu en chaîne par node-postgres', () => {
    expect(tagMigration(journal, '1790694290318')).toBe('0036_wakeful_vision')
    expect(tagMigration(journal, 1790000000000)).toBe(
      '0035_corrections_recette',
    )
  })
  it('rend null sans ligne en base ou si la base devance le code', () => {
    expect(tagMigration(journal, null)).toBeNull()
    expect(tagMigration(journal, '1800000000000')).toBeNull()
  })
})
