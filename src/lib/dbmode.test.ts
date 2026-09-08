import { beforeAll, describe, expect, it } from 'vitest'

import { modeDepuisCookie, valeurSignee } from './dbmode.server.ts'

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'secret-de-test'
})

describe('modeDepuisCookie', () => {
  it('accepte une valeur signée par nous', () => {
    expect(modeDepuisCookie(valeurSignee('prod'))).toBe('prod')
  })
  it('refuse une valeur forgée ou tronquée', () => {
    for (const v of [
      undefined,
      '',
      'prod',
      'prod.',
      'prod.deadbeef',
      `prod.${'0'.repeat(64)}`,
      valeurSignee('prod').replace('prod', 'dev'),
    ]) {
      expect(modeDepuisCookie(v)).toBe('dev')
    }
  })
})
