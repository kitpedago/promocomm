// Bouton Exporter commun : menu Excel (.xlsx, en-tête grisé) / CSV (« ; »,
// BOM UTF-8). Les lignes (1ʳᵉ = en-têtes) sont fournies à la demande, en
// local ou par une server function.
import { useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

import { construireCsv, telecharger, telechargerCsv } from '#/lib/csv.ts'
import { ecrireXlsx } from '#/lib/xlsx.ts'

export interface Export {
  /** nom du fichier sans extension */
  nomFichier: string
  lignes: Array<Array<unknown>>
}

export async function exporterLignes(format: 'xlsx' | 'csv', e: Export) {
  if (format === 'csv')
    telechargerCsv(`${e.nomFichier}.csv`, construireCsv(e.lignes))
  else telecharger(`${e.nomFichier}.xlsx`, await ecrireXlsx(e.lignes))
}

const ITEM =
  'flex cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--ink)] outline-none hover:bg-[var(--gold-tint)] data-[highlighted]:bg-[var(--gold-tint)]'

export default function MenuExporter({
  charger,
  libelle = 'Exporter',
  title = 'Exporter les lignes affichées',
  disabled,
  className = '',
}: {
  charger: () => Export | Promise<Export>
  libelle?: string
  title?: string
  disabled?: boolean
  className?: string
}) {
  const [etat, setEtat] = useState<'repos' | 'en cours' | 'erreur'>('repos')
  const exporter = async (format: 'xlsx' | 'csv') => {
    setEtat('en cours')
    try {
      await exporterLignes(format, await charger())
      setEtat('repos')
    } catch {
      setEtat('erreur')
    }
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={disabled || etat === 'en cours'}
        title={title}
        className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-50 ${className}`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {etat === 'en cours' ? 'Export en cours…' : libelle}
        <ChevronDown className="h-3 w-3" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-36 rounded-xl border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-[0_12px_32px_rgba(20,25,45,0.18)]"
        >
          <DropdownMenu.Item
            className={ITEM}
            onSelect={() => void exporter('xlsx')}
          >
            Excel (.xlsx)
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={ITEM}
            onSelect={() => void exporter('csv')}
          >
            CSV
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
      {etat === 'erreur' && (
        <span className="text-[12px] text-[var(--danger)]">
          Export impossible.
        </span>
      )}
    </DropdownMenu.Root>
  )
}
