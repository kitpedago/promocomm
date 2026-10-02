import { describe, expect, it } from 'vitest'

import { contratMd, normaliserContrat } from './contrats.helpers.ts'

describe('normaliserContrat', () => {
  it('normalise type, virgule décimale et date vide', () => {
    expect(
      normaliserContrat({
        type: 'autre',
        numRef: '  C-2026-01 ',
        dateSignature: '',
        nbHeuresFacturees: '35,5',
      }),
    ).toEqual({
      id: null,
      type: 'contrat',
      numRef: 'C-2026-01',
      dateSignature: null,
      description: '',
      nbHeuresFacturees: 35.5,
    })
  })
  it('refuse n° vide, date mal formée, heures négatives', () => {
    expect(() => normaliserContrat({ numRef: ' ' })).toThrow('référence')
    expect(() =>
      normaliserContrat({ numRef: 'x', dateSignature: '01/02/2026' }),
    ).toThrow('Date')
    expect(() =>
      normaliserContrat({ numRef: 'x', nbHeuresFacturees: -1 }),
    ).toThrow('Heures')
  })
})

describe('contratMd', () => {
  it('écrit en-tête, solde et table des tickets', () => {
    const md = contratMd(
      {
        id: 1,
        type: 'avenant',
        numRef: 'AV-2',
        dateSignature: '2026-03-04',
        description: 'Lot | 2',
        nbHeuresFacturees: 10,
        nbHeuresCalcule: 4,
        nbTickets: 1,
      },
      [
        {
          id: 7,
          type: 'bug',
          titre: 'Export | cassé',
          statut: 'livre',
          nbHeures: 4,
          dateLivraison: '2026-03-10',
        },
      ],
      { types: { bug: 'Bug' }, statuts: { livre: 'Livré' } },
    )
    expect(md).toContain('# Avenant AV-2')
    expect(md).toContain('Signé le : 04/03/2026')
    expect(md).toContain('Lot \\| 2')
    expect(md).toContain('solde : 6,00 h')
    expect(md).toContain(
      '| 7 | Bug | Export \\| cassé | Livré | 4,00 h | 10/03/2026 |',
    )
  })
})
