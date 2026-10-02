// Module Facturation électronique (propre à l'application) : SCCV à compta
// extérieure immatriculées où KPI détient plus de 5 %, une ligne par
// opération, avec l'adresse de facturation électronique (SIREN_suffixe du
// gestionnaire, saisi dans Paramètres > Gestionnaire SCCV). Filtres commune,
// compta, liquidées, recherche ; export Excel des lignes affichées. Un clic
// sur une ligne ouvre son détail en lecture seule dans le volet de droite.
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'

import Champ from '#/components/Champ'
import { ErreurMutation } from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { telecharger } from '#/lib/csv.ts'
import { getFacturationFn } from '#/lib/facturation.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro, sansAccents } from '#/lib/utils.ts'
import { ecrireXlsx } from '#/lib/xlsx.ts'

import type { ColumnDef } from '@tanstack/react-table'
import type { LigneFacturation } from '#/lib/facturation.ts'

export const Route = createFileRoute('/_authed/facturation')({
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('facturation')) throw redirect({ to: '/' })
  },
  component: PageFacturation,
})

const COLONNES: Array<{ id: keyof LigneFacturation; l: string; size: number }> =
  [
    { id: 'commune', l: 'Commune', size: 160 },
    { id: 'operation', l: 'Opération', size: 240 },
    { id: 'sccv', l: 'SCCV', size: 220 },
    { id: 'compta', l: 'Compta', size: 200 },
    { id: 'logiciel', l: 'Logiciel', size: 140 },
    { id: 'adresse', l: 'Adresse facturation', size: 200 },
  ]

const colonnes: Array<ColumnDef<LigneFacturation, any>> = COLONNES.map((c) => ({
  accessorKey: c.id,
  header: c.l,
  size: c.size,
  cell: (x) => x.getValue() || '—',
}))

function SelectFiltre({
  libelle,
  value,
  onChange,
  options,
}: {
  libelle: string
  value: string
  onChange: (v: string) => void
  options: Array<string>
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
      {libelle}
      <Select
        value={value || 'tous'}
        onValueChange={(v) => onChange(v === 'tous' ? '' : v)}
      >
        <SelectTrigger className="h-8 w-[190px] bg-[var(--card)] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

const distinct = (valeurs: Array<string>) =>
  [...new Set(valeurs.filter(Boolean))].sort((a, b) => a.localeCompare(b))

function VoletDetail({
  ligne,
  onFermer,
}: {
  ligne: LigneFacturation
  onFermer: () => void
}) {
  return (
    <aside className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--cream)] p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[15px] leading-tight font-bold text-[var(--ink)]">
          {ligne.rs}
        </h2>
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer le détail"
          className="cursor-pointer rounded p-0.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <Champ libelle="Adresse de facturation électronique">
        <span className="font-mono text-[14px] font-bold tabular-nums">
          {ligne.adresse || '—'}
        </span>
      </Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="SIREN">{ligne.siren || '—'}</Champ>
        <Champ libelle="Suffixe">{ligne.suffixe || '—'}</Champ>
      </div>
      <Champ libelle="SIRET">{ligne.siret || '—'}</Champ>
      <Champ libelle="Opération">{ligne.operation || '—'}</Champ>
      <Champ libelle="Commune">{ligne.commune || '—'}</Champ>
      <Champ libelle="Gestionnaire (compta)">{ligne.gestionnaire || '—'}</Champ>
      <Champ libelle="Logiciel">{ligne.logiciel || '—'}</Champ>
      <div className="grid grid-cols-2 gap-3">
        <Champ libelle="Immatriculée le">{fmtDate(ligne.dateImmat)}</Champ>
        <Champ libelle="Liquidée le">{fmtDate(ligne.dateLiquidation)}</Champ>
        <Champ libelle="Capital">{fmtEuro(ligne.capital)}</Champ>
        <Champ libelle="Part KPI">
          {(ligne.partKpi * 100).toLocaleString('fr-FR', {
            maximumFractionDigits: 2,
          })}{' '}
          %
        </Champ>
      </div>
    </aside>
  )
}

function PageFacturation() {
  const [liquidee, setLiquidee] = useState(false)
  const [commune, setCommune] = useState('')
  const [compta, setCompta] = useState('')
  const [recherche, setRecherche] = useState('')
  const [sel, setSel] = useState<string | null>(null)

  const liste = useQuery({
    queryKey: ['facturation', liquidee],
    queryFn: () => getFacturationFn({ data: { liquidee } }),
  })
  const toutes = liste.data ?? []

  const lignes = useMemo(() => {
    const motif = sansAccents(recherche.trim().toLowerCase())
    return toutes.filter(
      (l) =>
        (!commune || l.commune === commune) &&
        (!compta || l.compta === compta) &&
        (!motif ||
          sansAccents(
            `${l.sccv} ${l.operation} ${l.commune}`.toLowerCase(),
          ).includes(motif)),
    )
  }, [toutes, commune, compta, recherche])
  const ligneSel = toutes.find((l) => l.id === sel) ?? null

  const exporter = useMutation({
    mutationFn: async () => {
      const entetes = COLONNES.map((c) => c.l)
      const corps = lignes.map((l) => COLONNES.map((c) => l[c.id]))
      telecharger(
        'Facturation_electronique.xlsx',
        await ecrireXlsx([entetes, ...corps]),
      )
    },
  })

  return (
    <div className="flex h-[calc(100vh-61px)] flex-col overflow-hidden px-5 py-5 sm:px-7">
      <h1 className="mb-3 shrink-0 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
        Facturation électronique
      </h1>

      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <SelectFiltre
          libelle="Commune"
          value={commune}
          onChange={setCommune}
          options={distinct(toutes.map((l) => l.commune))}
        />
        <SelectFiltre
          libelle="Compta"
          value={compta}
          onChange={setCompta}
          options={distinct(toutes.map((l) => l.compta))}
        />
        <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
          <Switch
            checked={liquidee}
            onCheckedChange={(v) => setLiquidee(!!v)}
          />
          Liquidées
        </label>
        <label
          title="Recherche sur la SCCV, l'opération ou la commune"
          className={`flex h-8 items-center gap-1.5 rounded-lg border bg-[var(--card)] px-2.5 ${
            recherche
              ? 'border-[var(--gold)] bg-[var(--gold-tint)]'
              : 'border-[var(--input-border)]'
          }`}
        >
          <Search className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Contient…"
            className="w-48 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche('')}
              className="cursor-pointer text-xs font-bold text-[var(--gold-ink)]"
            >
              ×
            </button>
          )}
        </label>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => exporter.mutate()}
          disabled={exporter.isPending || lignes.length === 0}
          title="Exporter les lignes affichées (Excel)"
        >
          {exporter.isPending ? 'Export en cours…' : 'Export Excel'}
        </Button>
      </div>
      <ErreurMutation erreur={exporter.error} />

      <p className="mb-2 shrink-0 text-[12px] text-[var(--muted)]">
        SCCV à compta extérieure, immatriculées, où KPI détient plus de 5 %.
        Adresse de facturation = SIREN_suffixe du gestionnaire (Paramètres ›
        Gestionnaire SCCV).
      </p>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DataTable
            id="facturation"
            unite="lignes"
            columns={colonnes}
            data={lignes}
            getRowId={(r) => r.id}
            selectedRowId={sel}
            // sélection à bascule, comme les autres tables
            onRowClick={(r) => setSel((s) => (s === r.id ? null : r.id))}
            emptyText={liste.isLoading ? 'Chargement…' : 'Aucune SCCV trouvée.'}
          />
        </div>
        {ligneSel && (
          <VoletDetail ligne={ligneSel} onFermer={() => setSel(null)} />
        )}
      </div>
    </div>
  )
}
