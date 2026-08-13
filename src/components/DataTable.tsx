// Composant table unique (consignes UI de docs/plan-implementation.md) :
// tri sur toutes les colonnes, largeurs ajustables, menu « Affichage »
// (colonnes : afficher/masquer, réordonner ; lignes : 1 seule ligne, ligne
// compacte), compteur d'éléments, filtre mis en évidence,
// pagination (10/20/50/100/500 max), paramètres mémorisés par table et par
// utilisateur (table user_pref, clé « table:<id> » — cf. src/lib/preferences.ts).
import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { usePref } from '#/lib/preferences.ts'

import type {
  ColumnDef,
  ColumnSizingState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'

interface TableParams {
  sorting: SortingState
  columnVisibility: VisibilityState
  columnOrder: Array<string>
  columnSizing: ColumnSizingState
  globalFilter: string
  pageSize: number
  /** contenu des cellules tronqué sur une seule ligne (sinon retour à la ligne) */
  uneLigne: boolean
  /** hauteur de ligne réduite */
  ligneCompacte: boolean
}

const TAILLES_PAGE = [10, 20, 50, 100, 500] as const

const DEFAUTS: TableParams = {
  sorting: [],
  columnVisibility: {},
  columnOrder: [],
  columnSizing: {},
  globalFilter: '',
  pageSize: 50,
  uneLigne: true,
  ligneCompacte: false,
}

export interface DataTableProps<T> {
  /** clé de mémorisation des paramètres — unique par page/table */
  id: string
  columns: Array<ColumnDef<T, any>>
  data: Array<T>
  /** libellé du compteur, ex. « lots » → « 17 lots affichés » */
  unite?: string
  getRowId?: (row: T) => string
  selectedRowId?: string | null
  onRowClick?: (row: T) => void
  /** ids des colonnes numériques à sommer dans la ligne Total */
  totalFor?: Array<string>
  /** colonnes masquées par défaut (réactivables via le menu Affichage) */
  defaultHidden?: Array<string>
  emptyText?: string
}

export default function DataTable<T>({
  id,
  columns,
  data,
  unite = 'éléments',
  getRowId,
  selectedRowId,
  onRowClick,
  totalFor,
  defaultHidden,
  emptyText = 'Aucun élément.',
}: DataTableProps<T>) {
  const base = useMemo<TableParams>(
    () => ({
      ...DEFAUTS,
      columnVisibility: Object.fromEntries(
        (defaultHidden ?? []).map((c) => [c, false]),
      ),
    }),
    [defaultHidden],
  )
  const [params, setParams] = usePref<TableParams>(`table:${id}`, base)

  const set =
    <TCle extends keyof TableParams>(k: TCle) =>
    (
      updater:
        TableParams[TCle] | ((old: TableParams[TCle]) => TableParams[TCle]),
    ) =>
      setParams((p) => ({
        ...p,
        [k]: typeof updater === 'function' ? updater(p[k]) : updater,
      }))

  // page courante non mémorisée (repartir en page 1 à chaque visite)
  const [pageIndex, setPageIndex] = useState(0)
  const { pageSize, uneLigne, ligneCompacte, ...etatTable } = params
  const padCell = ligneCompacte ? 'px-2 py-0.5' : 'px-3 py-2'

  const table = useReactTable({
    data,
    columns,
    state: { ...etatTable, pagination: { pageIndex, pageSize } },
    onSortingChange: set('sorting'),
    onColumnVisibilityChange: set('columnVisibility'),
    onColumnOrderChange: set('columnOrder'),
    onColumnSizingChange: set('columnSizing'),
    onGlobalFilterChange: set('globalFilter'),
    onPaginationChange: (updater) => {
      const suivant =
        typeof updater === 'function'
          ? updater({ pageIndex, pageSize })
          : updater
      setPageIndex(suivant.pageSize !== pageSize ? 0 : suivant.pageIndex)
      if (suivant.pageSize !== pageSize) set('pageSize')(suivant.pageSize)
    },
    globalFilterFn: 'includesString',
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
  })

  const rows = table.getRowModel().rows
  const lignesFiltrees = table.getPrePaginationRowModel().rows
  // si le filtre réduit le nombre de pages, revenir sur la dernière valide
  useEffect(() => {
    const max = Math.max(0, Math.ceil(lignesFiltrees.length / pageSize) - 1)
    if (pageIndex > max) setPageIndex(max)
  }, [pageIndex, pageSize, lignesFiltrees.length])
  const filtreActif = params.globalFilter.trim() !== ''
  const nbPages = table.getPageCount()
  const debut = lignesFiltrees.length === 0 ? 0 : pageIndex * pageSize + 1
  const fin = Math.min((pageIndex + 1) * pageSize, lignesFiltrees.length)

  const totaux = useMemo(() => {
    if (!totalFor?.length) return null
    const t: Record<string, number> = {}
    for (const col of totalFor) {
      t[col] = lignesFiltrees.reduce((s, r) => {
        const v = r.getValue(col)
        return s + (typeof v === 'number' ? v : 0)
      }, 0)
    }
    return t
  }, [lignesFiltrees, totalFor])

  const deplacerColonne = (colId: string, delta: -1 | 1) => {
    const ordre = table.getAllLeafColumns().map((c) => c.id)
    const i = ordre.indexOf(colId)
    const j = i + delta
    if (i < 0 || j < 0 || j >= ordre.length) return
    ;[ordre[i], ordre[j]] = [ordre[j], ordre[i]]
    table.setColumnOrder(ordre)
  }

  return (
    // min-h-0/flex-1 : quand le parent borne la hauteur, c'est la table qui
    // défile (en-tête et pagination restent visibles), pas la page
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* barre d'outils : compteur, filtre, menu Affichage (aligné à droite) */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-semibold text-[var(--ink)]">
          {filtreActif
            ? `${lignesFiltrees.length} / ${data.length} ${unite}`
            : `${lignesFiltrees.length} ${unite} au total`}
        </span>
        <label
          className={`flex h-8 items-center gap-1.5 rounded-lg border bg-[var(--card)] px-2.5 transition-colors ${
            filtreActif
              ? 'border-[var(--gold)] bg-[var(--gold-tint)]'
              : 'border-[var(--input-border)]'
          }`}
        >
          <Search
            className={`h-3.5 w-3.5 ${filtreActif ? 'text-[var(--gold-ink)]' : 'text-[var(--muted)]'}`}
            aria-hidden
          />
          <input
            value={params.globalFilter}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Filtrer…"
            className="w-36 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          {filtreActif && (
            <button
              onClick={() => table.setGlobalFilter('')}
              className="cursor-pointer text-xs font-bold text-[var(--gold-ink)]"
              aria-label="Effacer le filtre"
            >
              ×
            </button>
          )}
        </label>

        <PopoverPrimitive.Root>
          <PopoverPrimitive.Trigger className="ml-auto flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Affichage
            <ChevronDown className="h-3 w-3" aria-hidden />
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="end"
              sideOffset={6}
              className="z-50 w-64 rounded-xl border border-[var(--line)] bg-[var(--card)] p-2 shadow-[0_12px_32px_rgba(20,25,45,0.18)]"
            >
              <p className="px-2 pt-1 pb-1.5 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                Colonnes
              </p>
              {table.getAllLeafColumns().map((col, i, cols) => (
                <div
                  key={col.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--cream-hover)]"
                >
                  <Switch
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    className="scale-75"
                  />
                  <span className="flex-1 truncate text-[13px] text-[var(--ink-soft)]">
                    {typeof col.columnDef.header === 'string'
                      ? col.columnDef.header
                      : col.id}
                  </span>
                  <button
                    onClick={() => deplacerColonne(col.id, -1)}
                    className={`cursor-pointer rounded p-0.5 text-[var(--ink-faded)] hover:bg-[var(--line-soft)] hover:text-[var(--ink)] ${i === 0 ? 'invisible' : ''}`}
                    aria-label={`Monter ${col.id}`}
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    onClick={() => deplacerColonne(col.id, 1)}
                    className={`cursor-pointer rounded p-0.5 text-[var(--ink-faded)] hover:bg-[var(--line-soft)] hover:text-[var(--ink)] ${i === cols.length - 1 ? 'invisible' : ''}`}
                    aria-label={`Descendre ${col.id}`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ))}
              <p className="mt-1 border-t border-[var(--line-soft)] px-2 pt-2 pb-1.5 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                Lignes
              </p>
              {(
                [
                  ['uneLigne', '1 seule ligne'],
                  ['ligneCompacte', 'Ligne compacte'],
                ] as const
              ).map(([k, libelle]) => (
                <label
                  key={k}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--cream-hover)]"
                >
                  <Switch
                    checked={params[k]}
                    onCheckedChange={(v) => set(k)(!!v)}
                    className="scale-75"
                  />
                  <span className="flex-1 text-[13px] text-[var(--ink-soft)]">
                    {libelle}
                  </span>
                </label>
              ))}
              <button
                onClick={() => setParams({ ...base })}
                className="mt-1 w-full cursor-pointer rounded-lg border-t border-[var(--line-soft)] px-2 pt-2 pb-1 text-left text-xs font-medium text-[var(--ink-faded)] hover:text-[var(--ink)]"
              >
                Réinitialiser la table
              </button>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      {/* table */}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--line)]">
        <table
          className="border-collapse text-[13px]"
          style={{ width: table.getCenterTotalSize(), minWidth: '100%' }}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-[var(--cream)]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className={`sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--cream)] ${padCell} text-left text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase select-none`}
                  >
                    <button
                      onClick={h.column.getToggleSortingHandler()}
                      className="flex w-full cursor-pointer items-center gap-1 uppercase"
                    >
                      <span className="truncate">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </span>
                      {h.column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="h-3 w-3 shrink-0 text-[var(--gold-deep)]" />
                      ) : h.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="h-3 w-3 shrink-0 text-[var(--gold-deep)]" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-40" />
                      )}
                    </button>
                    <div
                      onMouseDown={h.getResizeHandler()}
                      onTouchStart={h.getResizeHandler()}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none ${
                        h.column.getIsResizing()
                          ? 'bg-[var(--gold)]'
                          : 'hover:bg-[var(--line)]'
                      }`}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  className="px-3 py-6 text-[13px] text-[var(--muted)]"
                >
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
                className={`border-b border-[var(--line-row)] transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${
                  selectedRowId != null && row.id === selectedRowId
                    ? 'bg-[var(--gold-tint)]'
                    : 'hover:bg-[var(--cream-hover)]'
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={`${uneLigne ? 'truncate' : 'wrap-break-word whitespace-normal'} ${padCell} align-top text-[var(--ink-soft)]`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totaux && rows.length > 0 && (
            <tfoot>
              <tr className="bg-[var(--cream)]">
                {table.getVisibleLeafColumns().map((col, i) => (
                  <td
                    key={col.id}
                    className={`sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--cream)] ${padCell} font-semibold text-[var(--ink)]`}
                  >
                    {i === 0 ? (
                      'Total'
                    ) : col.id in totaux ? (
                      // groupé fr-FR et arrondi : les sommes de flottants
                      // (surfaces) sortaient sinon en 2154.6899999999996
                      // — aligné à droite comme les cellules numériques
                      <span className="block text-right tabular-nums">
                        {totaux[col.id].toLocaleString('fr-FR', {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    ) : (
                      ''
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* pagination : taille de page + plage affichée + navigation */}
      {lignesFiltrees.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--ink-soft)]">
          <label className="flex items-center gap-2">
            Lignes par page
            <Select
              value={String(pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[104px] bg-[var(--card)] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAILLES_PAGE.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n === 500 ? '500 (max)' : n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <span className="tabular-nums">
            {debut}–{fin} sur {lignesFiltrees.length} {unite}
          </span>
          {nbPages > 1 && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--card)] p-1.5 text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--input-border)] disabled:hover:text-[var(--ink-soft)]"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="px-1 tabular-nums">
                Page {pageIndex + 1} / {nbPages}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--card)] p-1.5 text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--input-border)] disabled:hover:text-[var(--ink-soft)]"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
