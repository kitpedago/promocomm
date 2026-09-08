import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { getDashboardFn } from '#/lib/dashboard.ts'

// Tableau de bord — widgets de FEN_Menu (capture TableauDeBord.png) ;
// les tuiles des modules sont portées par le menu latéral (Sidebar)
export const Route = createFileRoute('/_authed/')({
  loader: () => getDashboardFn(),
  component: Home,
})

type Cell = string | number | Date | null

interface Col {
  key: string
  label: string
  kind?: 'date' | 'num'
}

const COLS_TRANCHE: Array<Col> = [
  { key: 'operation', label: 'Nom opération' },
  { key: 'commune', label: 'Commune' },
  { key: 'tranche', label: 'Tranche' },
  { key: 'nbLogt', label: 'Nb logt', kind: 'num' },
  { key: 'depuisLe', label: 'Depuis le', kind: 'date' },
]

const COLS_SCCV: Array<Col> = [
  { key: 'commune', label: 'Commune' },
  { key: 'sccv', label: 'SCCV' },
  { key: 'operation', label: 'Opération' },
  { key: 'nbLogt', label: 'Nb logt', kind: 'num' },
  { key: 'depuisLe', label: 'Depuis le', kind: 'date' },
]

const fmtCell = (v: Cell, kind?: Col['kind']) => {
  if (v == null || v === '') return '—'
  if (kind === 'date') return new Date(v).toLocaleDateString('fr-FR')
  return String(v)
}

function Widget({
  title,
  cols,
  rows,
  onMove,
  onDragStart,
}: {
  title: string
  cols: Array<Col>
  rows: Array<Record<string, Cell>>
  onMove: () => void
  onDragStart: () => void
}) {
  const total = rows.reduce(
    (s, r) => s + (typeof r.nbLogt === 'number' ? r.nbLogt : 0),
    0,
  )
  return (
    <section
      className="island-shell overflow-hidden rounded-xl"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
    >
      <header className="flex cursor-grab items-baseline justify-between gap-3 border-b border-[var(--line-soft)] px-[18px] py-[14px] active:cursor-grabbing">
        <h2 className="text-[15.5px] font-bold text-[var(--ink)]">{title}</h2>
        <span className="flex items-baseline gap-2 text-xs whitespace-nowrap text-[var(--muted)]">
          {rows.length === 0
            ? 'aucune ligne'
            : `${rows.length} ligne${rows.length > 1 ? 's' : ''}`}
          <button
            type="button"
            onClick={onMove}
            title="Déplacer dans l'autre colonne"
            aria-label="Déplacer dans l'autre colonne"
            className="hidden rounded px-1 text-sm leading-none hover:bg-[var(--cream-hover)] hover:text-[var(--ink)] xl:inline"
          >
            ⇄
          </button>
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="px-[18px] py-6 text-[13px] text-[var(--muted)]">
          Rien sur la période.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[var(--cream)]">
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-2 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase ${c.kind === 'num' ? 'text-right' : 'text-left'}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--line-row)] transition-colors hover:bg-[var(--cream-hover)]"
                >
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 text-[var(--ink-soft)] ${c.kind === 'num' ? 'text-right tabular-nums' : ''} ${c.kind === 'date' ? 'whitespace-nowrap tabular-nums' : ''}`}
                    >
                      {fmtCell(r[c.key], c.kind)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--cream)]">
                <td className="px-3 py-2 font-semibold text-[var(--ink)]">
                  Total
                </td>
                <td colSpan={2} />
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--ink)]">
                  {total}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

type Data = Awaited<ReturnType<typeof getDashboardFn>>

const WIDGETS: Array<{ id: keyof Data; title: string; cols: Array<Col> }> = [
  {
    id: 'lancementsCom',
    title: 'Lancements commercialisation depuis les 90 derniers jours',
    cols: COLS_TRANCHE,
  },
  {
    id: 'livraisons',
    title: 'Livraisons depuis les 90 derniers jours',
    cols: COLS_TRANCHE,
  },
  {
    id: 'enTravaux',
    title: 'En travaux depuis les 90 derniers jours',
    cols: COLS_TRANCHE,
  },
  { id: 'sccvCreees', title: 'SCCV créées depuis 1 an', cols: COLS_SCCV },
  { id: 'sccvLiquidees', title: 'SCCV liquidées depuis 1 an', cols: COLS_SCCV },
]

// Répartition des widgets entre les 2 colonnes, mémoire navigateur (pas la
// pref serveur : choix explicite, propre au poste). Lue après montage pour ne
// pas diverger du rendu SSR.
const CLE_COLONNES = 'accueil.colonnes'
const DEFAUT_DROITE: Array<keyof Data> = ['sccvCreees', 'sccvLiquidees']

function useColonnes() {
  const [droite, setDroite] = useState<Array<keyof Data>>(DEFAUT_DROITE)
  useEffect(() => {
    try {
      const v = localStorage.getItem(CLE_COLONNES)
      if (v) setDroite(JSON.parse(v))
    } catch {
      /* stockage indisponible : on garde le défaut */
    }
  }, [])
  const placer = (id: keyof Data, aDroite: boolean) =>
    setDroite((prec) => {
      if (prec.includes(id) === aDroite) return prec
      const suivant = aDroite ? [...prec, id] : prec.filter((x) => x !== id)
      try {
        localStorage.setItem(CLE_COLONNES, JSON.stringify(suivant))
      } catch {
        /* idem */
      }
      return suivant
    })
  return { droite, placer }
}

function Home() {
  const data = Route.useLoaderData()
  const { droite, placer } = useColonnes()
  // id en cours de glisser : ref plutôt que dataTransfer (Firefox n'expose pas
  // les données pendant dragover), pas d'état pour ne pas re-rendre.
  const glisse = useRef<keyof Data | null>(null)
  const colonne = (aDroite: boolean) => (
    <div
      className="flex min-h-24 flex-col gap-6"
      onDragOver={(e) => {
        if (glisse.current) e.preventDefault()
      }}
      onDrop={(e) => {
        e.preventDefault()
        if (glisse.current) placer(glisse.current, aDroite)
        glisse.current = null
      }}
    >
      {WIDGETS.filter((w) => droite.includes(w.id) === aDroite).map((w) => (
        <Widget
          key={w.id}
          title={w.title}
          cols={w.cols}
          rows={data[w.id]}
          onMove={() => placer(w.id, !aDroite)}
          onDragStart={() => (glisse.current = w.id)}
        />
      ))}
    </div>
  )
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pt-10 pb-10">
      <div className="rise-in">
        <p className="island-kicker mb-1">Tableau de bord</p>
        <h1 className="display-title text-3xl font-bold tracking-tight text-[var(--ink)]">
          PromoComm
        </h1>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {colonne(false)}
        {colonne(true)}
      </div>
    </main>
  )
}
