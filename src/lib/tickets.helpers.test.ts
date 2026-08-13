import { describe, expect, it } from 'vitest'

import {
  decodeCapture,
  fmtDateLongue,
  fmtTicketDate,
  grouperParDate,
  sanitizeMiniature,
} from './tickets.helpers.ts'

import type { FeatureLivree } from './tickets.defs.ts'

const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('decodeCapture', () => {
  it('décode une data URL image valide', () => {
    const d = decodeCapture({ nom: 'capture.png', dataUrl: PNG_1PX })
    expect(d.mime).toBe('image/png')
    expect(d.nom).toBe('capture.png')
    expect(d.taille).toBeGreaterThan(0)
    expect(d.miniature).toBe('')
  })
  it('rejette ce qui n’est pas une image base64', () => {
    expect(() =>
      decodeCapture({ nom: 'x', dataUrl: 'data:text/plain;base64,aGVsbG8=' }),
    ).toThrow('Capture illisible')
    expect(() => decodeCapture({ nom: 'x', dataUrl: 'pas-une-url' })).toThrow()
  })
  it('rejette au-delà de 3 Mo décodés', () => {
    const gros = `data:image/png;base64,${'A'.repeat(4.2 * 1024 * 1024)}`
    expect(() => decodeCapture({ nom: 'x', dataUrl: gros })).toThrow('3 Mo')
  })
  it('vide silencieusement une miniature illisible', () => {
    expect(sanitizeMiniature('nimporte-quoi')).toBe('')
    expect(sanitizeMiniature(PNG_1PX)).toBe(PNG_1PX)
  })
})

describe('formatage des dates', () => {
  it('fmtTicketDate : ISO → JJ/MM/AAAA (heure conservée)', () => {
    expect(fmtTicketDate('2026-07-08 14:30')).toBe('08/07/2026 14:30')
    expect(fmtTicketDate('2026-07-08')).toBe('08/07/2026')
    expect(fmtTicketDate(null)).toBe('')
  })
  it('fmtDateLongue : ISO → date longue française', () => {
    expect(fmtDateLongue('2026-07-08')).toBe('8 juillet 2026')
    expect(fmtDateLongue('invalide')).toBe('invalide')
  })
})

describe('grouperParDate', () => {
  const f = (id: number, dateLivraison: string): FeatureLivree => ({
    id,
    titre: `#${id}`,
    description: '',
    pageConcernee: '',
    dateLivraison,
  })
  it('regroupe les entrées consécutives de même date (ordre préservé)', () => {
    const g = grouperParDate([
      f(3, '2026-08-10'),
      f(2, '2026-08-10'),
      f(1, '2026-08-01'),
    ])
    expect(g).toHaveLength(2)
    expect(g[0].date).toBe('2026-08-10')
    expect(g[0].items.map((i) => i.id)).toEqual([3, 2])
    expect(g[1].items.map((i) => i.id)).toEqual([1])
  })
  it('liste vide → aucun groupe', () => {
    expect(grouperParDate([])).toEqual([])
  })
})
