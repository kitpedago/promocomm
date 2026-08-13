// Panneau maître « Opérations » (pattern WinDev : liste à gauche, recherche
// « Contient » ≥ 3 caractères sans accent, case « Inclure les Masquer … »,
// compteur, repliable). Le flag de masquage filtré dépend du module
// (commercial par défaut, comptable pour Compta & Finances).
import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

import { Switch } from '#/components/ui/switch'
import { getOperationsCommFn } from '#/lib/commercialisation.ts'
import { usePref } from '#/lib/preferences.ts'
import { sansAccents } from '#/lib/utils.ts'

const LIBELLES_MASQUER = {
  masquerCommercial: 'Masquer commercial',
  masquerComptable: 'Masquer comptable',
  masquerPromo: 'Masquer promo',
} as const

export default function PanneauOperations({
  selectedId,
  onSelect,
  masquerFlag = 'masquerCommercial',
}: {
  selectedId: number | null
  onSelect: (id: number) => void
  // flag de masquage filtré par la case « Inclure les Masquer … » (par module)
  masquerFlag?: keyof typeof LIBELLES_MASQUER
}) {
  const [volet, setVolet] = usePref('volet:operations', {
    replie: false,
    recherche: '',
    inclureMasques: false,
  })
  const { replie, recherche, inclureMasques } = volet

  const operations = useQuery({
    queryKey: ['operations-comm'],
    queryFn: () => getOperationsCommFn(),
    staleTime: 60_000,
  })

  const filtrees = useMemo(() => {
    let liste = operations.data ?? []
    if (!inclureMasques) liste = liste.filter((o) => !o[masquerFlag])
    const q = sansAccents(recherche.trim())
    if (q.length >= 3) {
      liste = liste.filter((o) =>
        sansAccents(`${o.libelle} ${o.commune ?? ''} ${o.sccv ?? ''}`).includes(
          q,
        ),
      )
    }
    return liste
  }, [operations.data, recherche, inclureMasques])

  // la ligne restaurée peut être hors écran dans une liste longue. `replie` en
  // dépendance : au dépliage la ref vient d'être rattachée, l'effet rejoué fait
  // le défilement.
  const refSelection = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    refSelection.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, filtrees, replie])

  if (replie) {
    return (
      <aside className="sticky top-[61px] flex h-[calc(100vh-61px)] w-9 flex-shrink-0 flex-col items-center border-r border-[var(--line)] bg-[var(--cream)] py-3">
        <button
          onClick={() => setVolet((v) => ({ ...v, replie: false }))}
          className="cursor-pointer rounded-lg p-1.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
          aria-label="Déplier la liste des opérations"
        >
          <ChevronsRight className="h-4 w-4" aria-hidden />
        </button>
        <span className="mt-3 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase [writing-mode:vertical-rl]">
          Opérations
        </span>
      </aside>
    )
  }

  return (
    <aside className="sticky top-[61px] flex h-[calc(100vh-61px)] w-[264px] flex-shrink-0 flex-col border-r border-[var(--line)] bg-[var(--cream)]">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">Opérations</h2>
        <button
          onClick={() => setVolet((v) => ({ ...v, replie: true }))}
          className="cursor-pointer rounded-lg p-1.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
          aria-label="Replier la liste des opérations"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[var(--ink-faded)]">
            Contient (nom, SCCV, commune)
          </span>
          <input
            value={recherche}
            onChange={(e) =>
              setVolet((v) => ({ ...v, recherche: e.target.value }))
            }
            placeholder="Au moins 3 caract., sans accent"
            className="h-8 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ink)]"
          />
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink-soft)]">
          <Switch
            checked={inclureMasques}
            onCheckedChange={(c) =>
              setVolet((v) => ({ ...v, inclureMasques: c }))
            }
            className="scale-75"
          />
          Inclure les « {LIBELLES_MASQUER[masquerFlag]} »
        </label>
        <p className="text-[13px] font-bold text-[var(--ink)]">
          {operations.isLoading
            ? 'Chargement…'
            : `${filtrees.length} opération${filtrees.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--line-soft)]">
        {filtrees.map((o) => (
          <button
            key={o.id}
            ref={o.id === selectedId ? refSelection : undefined}
            onClick={() => onSelect(o.id)}
            className={`flex w-full cursor-pointer flex-col px-3 py-1.5 text-left transition-colors ${
              o.id === selectedId
                ? 'bg-[var(--gold-tint)]'
                : 'hover:bg-[var(--cream-hover)]'
            }`}
          >
            <span
              className={`truncate text-[13px] ${
                o.id === selectedId
                  ? 'font-semibold text-[var(--ink)]'
                  : 'font-medium text-[var(--ink-soft)]'
              }`}
            >
              {o.libelle}
            </span>
            <span className="truncate text-[11px] text-[var(--muted)]">
              {o.commune ?? '—'}
            </span>
          </button>
        ))}
        {!operations.isLoading && filtrees.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-[var(--muted)]">
            Aucune opération.
          </p>
        )}
      </nav>
    </aside>
  )
}
