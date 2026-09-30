// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DataTable from './DataTable.tsx'

// usePref lit la base : un simple état local suffit ici
vi.mock('#/lib/preferences.ts', async () => {
  const react = await import('react')
  return { usePref: (_cle: string, defaut: unknown) => react.useState(defaut) }
})

const LIGNES = [
  { id: 1, nom: 'Alpha' },
  { id: 2, nom: 'Bravo' },
]

// table à sélection bascule (le cas le plus piégeux : le 2ᵉ clic désélectionne)
function Banc({
  onModifier,
  avecBouton = true,
}: {
  onModifier: (id: number | null) => void
  avecBouton?: boolean
}) {
  const [sel, setSel] = useState<number | null>(null)
  return (
    <>
      {avecBouton && (
        <button
          data-modifier-table="banc"
          disabled={sel == null}
          onClick={() => onModifier(sel)}
        >
          Modifier
        </button>
      )}
      <DataTable
        id="banc"
        columns={[{ accessorKey: 'nom', header: 'Nom' }]}
        data={LIGNES}
        getRowId={(r) => String(r.id)}
        selectedRowId={sel != null ? String(sel) : null}
        onRowClick={(r) => setSel(r.id === sel ? null : r.id)}
      />
    </>
  )
}

const doubleClic = (premier: string, second = premier) => {
  fireEvent.click(screen.getByText(premier))
  fireEvent.click(screen.getByText(second))
  fireEvent.doubleClick(screen.getByText(second))
}

describe('DataTable — double-clic sur une ligne', () => {
  afterEach(cleanup)

  it('clique le bouton Modifier de la table, ligne sélectionnée', () => {
    const onModifier = vi.fn()
    render(<Banc onModifier={onModifier} />)
    doubleClic('Bravo')
    expect(onModifier).toHaveBeenCalledExactlyOnceWith(2)
  })

  it('ne fait rien à cheval sur deux lignes', () => {
    const onModifier = vi.fn()
    render(<Banc onModifier={onModifier} />)
    doubleClic('Alpha', 'Bravo')
    expect(onModifier).not.toHaveBeenCalled()
  })

  it('ne fait rien sans bouton Modifier', () => {
    const onModifier = vi.fn()
    render(<Banc onModifier={onModifier} avecBouton={false} />)
    doubleClic('Bravo')
    expect(onModifier).not.toHaveBeenCalled()
  })
})
