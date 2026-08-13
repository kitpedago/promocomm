// Module Bilan par SCCV (FEN_TABLE_Bilan, phase 8) — volet SCCV filtrable à
// gauche (mêmes filtres que le module SCCV), trois accordéons à droite :
// Stock et CA (deux tables), Résultats, IS - Non IS (seconde vue de
// bilan_resultat, colonnes calculées). CRUD par modales, pattern sccv.tsx.
// Captures : migration_windev/captures_ecrans/Bilan_*.png.
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import {
  deleteBilanCahtFn,
  deleteBilanResultatFn,
  deleteBilanStockFn,
  getBilanFn,
  saveBilanCahtFn,
  saveBilanResultatFn,
  saveBilanStockFn,
} from '#/lib/bilan.ts'
import {
  affectationTotal,
  cahtTotal,
  quotePart,
  resultatFiscal,
  totalFiscalSccv,
} from '#/lib/bilan.helpers.ts'
import { getSccvListeFn, getSccvNomenclaturesFn } from '#/lib/sccv.ts'
import { enFraction, enPourcent } from '#/lib/sccv.helpers.ts'
import { usePref } from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheBilan {
  sccv?: number
}

export const Route = createFileRoute('/_authed/bilan')({
  validateSearch: (s: Record<string, unknown>): RechercheBilan => ({
    sccv: s.sccv ? Number(s.sccv) : undefined,
  }),
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('bilan')) throw redirect({ to: '/' })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageBilan,
})

type Bilan = NonNullable<Awaited<ReturnType<typeof getBilanFn>>>
type LigneStock = Bilan['stock'][number]
type LigneCaht = Bilan['caht'][number]
type LigneResultat = Bilan['resultats'][number]

// --- colonnes génériques (mêmes formatteurs que les autres écrans) ---

const colEuro = <T,>(
  id: string,
  header: string,
  size = 130,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">
      {fmtEuro(c.getValue())}
    </span>
  ),
})
const colEuroCalc = <T,>(
  id: string,
  header: string,
  calc: (row: T) => number | null,
  size = 130,
): ColumnDef<T, any> => ({
  id,
  accessorFn: (r) => calc(r),
  header,
  size,
  cell: (c) => (
    <span className="block text-right font-semibold tabular-nums">
      {fmtEuro(c.getValue())}
    </span>
  ),
})
const colEntier = <T,>(
  id: string,
  header: string,
  size = 80,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">{c.getValue() ?? '—'}</span>
  ),
})
const colDate = <T,>(
  id: string,
  header: string,
  size = 120,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
})
const colTexte = <T,>(
  id: string,
  header: string,
  size: number,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => c.getValue() ?? '—',
})
// fractions 0–1 (iso-legacy) affichées en %
const fmtPourc = (v: number | null | undefined) =>
  v != null ? `${(v * 100).toFixed(2).replace('.', ',')} %` : '—'
const colAnnee = <T,>(): ColumnDef<T, any> => ({
  accessorKey: 'annee',
  header: 'Année',
  size: 80,
  cell: (c) => <span className="tabular-nums">{c.getValue() ?? '—'}</span>,
})

// ---------------------------------------------------------------------------
// Volet SCCV (panneau dockable WinDev — mêmes filtres que le module SCCV)
// ---------------------------------------------------------------------------

function SelectVolet({
  libelle,
  value,
  onChange,
  options,
}: {
  libelle: string
  value: number | null
  onChange: (v: number | null) => void
  options: Array<{ id: number; libelle: string | null }>
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-[var(--ink-faded)]">
        {libelle}
      </span>
      <Select
        value={value != null ? String(value) : 'tous'}
        onValueChange={(v) => onChange(v === 'tous' ? null : Number(v))}
      >
        <SelectTrigger className="h-8 w-full bg-[var(--card)] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.libelle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

interface VoletBilan {
  replie: boolean
  recherche: string
  stadeId: number | null
  comptableId: number | null
  gestionnaireId: number | null
  liquidee: boolean
}

function PanneauSccv({
  selectedId,
  onSelect,
}: {
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const [volet, setVolet] = usePref<VoletBilan>('volet:bilan-sccv', {
    replie: false,
    recherche: '',
    stadeId: null,
    comptableId: null,
    gestionnaireId: null,
    liquidee: false,
  })
  const { replie, recherche, stadeId, comptableId, gestionnaireId, liquidee } =
    volet
  // pas de recherche serveur en dessous de 3 caractères (iso-WinDev)
  const contient = recherche.trim().length >= 3 ? recherche.trim() : undefined

  const nomenclatures = useQuery({
    queryKey: ['sccv-nomenclatures'],
    queryFn: () => getSccvNomenclaturesFn(),
    staleTime: 60_000,
  })
  const filtres = {
    stadeId: stadeId ?? undefined,
    comptableId: comptableId ?? undefined,
    gestionnaireId: gestionnaireId ?? undefined,
    liquidee,
    contient,
  }
  const liste = useQuery({
    queryKey: ['sccv-liste', filtres],
    queryFn: () => getSccvListeFn({ data: filtres }),
  })
  const sccvs = liste.data ?? []

  if (replie) {
    return (
      <aside className="sticky top-[61px] flex h-[calc(100vh-61px)] w-9 flex-shrink-0 flex-col items-center border-r border-[var(--line)] bg-[var(--cream)] py-3">
        <button
          onClick={() => setVolet((v) => ({ ...v, replie: false }))}
          className="cursor-pointer rounded-lg p-1.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
          aria-label="Déplier la liste des SCCV"
        >
          <ChevronsRight className="h-4 w-4" aria-hidden />
        </button>
        <span className="mt-3 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase [writing-mode:vertical-rl]">
          SCCV
        </span>
      </aside>
    )
  }

  return (
    <aside className="sticky top-[61px] flex h-[calc(100vh-61px)] w-[264px] flex-shrink-0 flex-col border-r border-[var(--line)] bg-[var(--cream)]">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="text-[15px] font-bold text-[var(--ink)]">SCCV</h2>
        <button
          onClick={() => setVolet((v) => ({ ...v, replie: true }))}
          className="cursor-pointer rounded-lg p-1.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
          aria-label="Replier la liste des SCCV"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[var(--ink-faded)]">
            Contient (SCCV)
          </span>
          <input
            value={recherche}
            onChange={(e) =>
              setVolet((v) => ({ ...v, recherche: e.target.value }))
            }
            placeholder="Au moins 3 caract."
            className="h-8 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--ink)]"
          />
        </label>
        <SelectVolet
          libelle="Stade de la structure"
          value={stadeId}
          onChange={(x) => setVolet((v) => ({ ...v, stadeId: x }))}
          options={nomenclatures.data?.stades ?? []}
        />
        <SelectVolet
          libelle="Comptable"
          value={comptableId}
          onChange={(x) => setVolet((v) => ({ ...v, comptableId: x }))}
          options={nomenclatures.data?.comptables ?? []}
        />
        <SelectVolet
          libelle="Gestionnaire"
          value={gestionnaireId}
          onChange={(x) => setVolet((v) => ({ ...v, gestionnaireId: x }))}
          options={nomenclatures.data?.gestionnaires ?? []}
        />
        <label className="flex items-center gap-2 text-[12px] text-[var(--ink-soft)]">
          <Switch
            checked={liquidee}
            onCheckedChange={(c) => setVolet((v) => ({ ...v, liquidee: c }))}
            className="scale-75"
          />
          Liquidées
        </label>
        <p className="text-[13px] font-bold text-[var(--ink)]">
          {liste.isLoading ? 'Chargement…' : `${sccvs.length} SCCV`}
        </p>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--line-soft)]">
        {sccvs.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex w-full cursor-pointer flex-col px-3 py-1.5 text-left transition-colors ${
              s.id === selectedId
                ? 'bg-[var(--gold-tint)]'
                : 'hover:bg-[var(--cream-hover)]'
            }`}
          >
            <span
              className={`truncate text-[13px] ${
                s.id === selectedId
                  ? 'font-semibold text-[var(--ink)]'
                  : 'font-medium text-[var(--ink-soft)]'
              }`}
            >
              {s.rs}
            </span>
            <span className="truncate text-[11px] text-[var(--muted)]">
              {[s.stade, s.comptable].filter(Boolean).join(' · ') || '—'}
            </span>
          </button>
        ))}
        {!liste.isLoading && sccvs.length === 0 && (
          <p className="px-3 py-4 text-[13px] text-[var(--muted)]">
            Aucune SCCV.
          </p>
        )}
      </nav>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Champs de formulaire des modales (pattern sccv.tsx)
// ---------------------------------------------------------------------------

function ChampForm({
  libelle,
  children,
}: {
  libelle: string
  children: React.ReactNode
}) {
  return (
    <Label className="flex flex-col items-stretch gap-1">
      <span className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
        {libelle}
      </span>
      {children}
    </Label>
  )
}

function ChampNombre({
  libelle,
  value,
  onChange,
  step = '0.01',
  required,
}: {
  libelle: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  step?: string
  required?: boolean
}) {
  return (
    <ChampForm libelle={libelle}>
      <Input
        type="number"
        step={step}
        required={required}
        value={value != null ? String(value) : ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Number(e.target.value))
        }
        className="h-9 text-[13px]"
      />
    </ChampForm>
  )
}

function ChampDate({
  libelle,
  value,
  onChange,
}: {
  libelle: string
  value: string | null | undefined
  onChange: (v: string | null) => void
}) {
  return (
    <ChampForm libelle={libelle}>
      <Input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-9 text-[13px]"
      />
    </ChampForm>
  )
}

function ChampTexteLong({
  libelle,
  value,
  onChange,
}: {
  libelle: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ChampForm libelle={libelle}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-[13px]"
      />
    </ChampForm>
  )
}

function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-[var(--line-soft)] pb-1 text-[13px] font-semibold text-[var(--gold-ink)] sm:col-span-2">
      {children}
    </p>
  )
}

function ErreurMutation({ erreur }: { erreur: unknown }) {
  if (!erreur) return null
  return (
    <p className="mt-3 text-[13px] text-red-700">
      {erreur instanceof Error ? erreur.message : 'Erreur à l’enregistrement.'}
    </p>
  )
}

// Timestamps du serveur : Date ou string ISO selon la sérialisation
function versInputDate(v: string | Date | null | undefined): string | null {
  if (!v) return null
  const iso = v instanceof Date ? v.toISOString() : v
  return iso.slice(0, 10)
}

// ---------------------------------------------------------------------------
// Boutons Nouveau / Modifier / Supprimer d'une table (pattern sccv.tsx)
// ---------------------------------------------------------------------------

function BoutonsTable({
  selection,
  onNouveau,
  onModifier,
  onSupprimer,
  confirmation,
}: {
  selection: number | null
  onNouveau: () => void
  onModifier: () => void
  onSupprimer: () => void
  confirmation: string
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" onClick={onNouveau}>
        Nouveau
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={selection == null}
        onClick={onModifier}
      >
        Modifier
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={selection == null}
        onClick={() => {
          if (confirm(confirmation)) onSupprimer()
        }}
      >
        Supprimer
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modale « Stock »
// ---------------------------------------------------------------------------

interface EntreeStock {
  id?: number
  structureJuridiqueId: number
  annee: number | null
  stockTotalDebit33a35: number | null
  stockTotalCredit33a35: number | null
  stockCredit713300: number | null
  stockPslaPhaseLocNb: number | null
  stockPslaPhaseLocCout: number | null
  stockInvenduNb: number | null
  stockInvenduCout: number | null
}

function ModaleStock({
  sccvId,
  ligne,
  open,
  onOpenChange,
}: {
  sccvId: number
  /** null = création */
  ligne: LigneStock | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const vide: EntreeStock = {
    structureJuridiqueId: sccvId,
    annee: null,
    stockTotalDebit33a35: null,
    stockTotalCredit33a35: null,
    stockCredit713300: null,
    stockPslaPhaseLocNb: null,
    stockPslaPhaseLocCout: null,
    stockInvenduNb: null,
    stockInvenduCout: null,
  }
  const depuisLigne = (l: LigneStock): EntreeStock => ({
    structureJuridiqueId: sccvId,
    annee: l.annee,
    stockTotalDebit33a35: l.stockTotalDebit33a35,
    stockTotalCredit33a35: l.stockTotalCredit33a35,
    stockCredit713300: l.stockCredit713300,
    stockPslaPhaseLocNb: l.stockPslaPhaseLocNb,
    stockPslaPhaseLocCout: l.stockPslaPhaseLocCout,
    stockInvenduNb: l.stockInvenduNb,
    stockInvenduCout: l.stockInvenduCout,
  })
  const [valeurs, setValeurs] = useState<EntreeStock>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (d: EntreeStock) => saveBilanStockFn({ data: d }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bilan', sccvId] })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(ligne ? depuisLigne(ligne) : vide)
      enregistrer.reset()
    }
  }, [open, ligne])

  const set =
    <TCle extends keyof EntreeStock>(k: TCle) =>
    (v: EntreeStock[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le stock' : 'Nouvelle ligne de stock'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampNombre
              libelle="Année"
              step="1"
              required
              value={valeurs.annee}
              onChange={set('annee')}
            />
            <div />
            <SousTitre>Balance 33 à 35</SousTitre>
            <ChampNombre
              libelle="Total débit"
              value={valeurs.stockTotalDebit33a35}
              onChange={set('stockTotalDebit33a35')}
            />
            <ChampNombre
              libelle="Total crédit"
              value={valeurs.stockTotalCredit33a35}
              onChange={set('stockTotalCredit33a35')}
            />
            <SousTitre>Variation</SousTitre>
            <ChampNombre
              libelle="Crédit 713300"
              value={valeurs.stockCredit713300}
              onChange={set('stockCredit713300')}
            />
            <div />
            <SousTitre>Logements PSLA (phase locative)</SousTitre>
            <ChampNombre
              libelle="Nb"
              step="1"
              value={valeurs.stockPslaPhaseLocNb}
              onChange={set('stockPslaPhaseLocNb')}
            />
            <ChampNombre
              libelle="Coût"
              value={valeurs.stockPslaPhaseLocCout}
              onChange={set('stockPslaPhaseLocCout')}
            />
            <SousTitre>Invendus logements VEFA</SousTitre>
            <ChampNombre
              libelle="Nb"
              step="1"
              value={valeurs.stockInvenduNb}
              onChange={set('stockInvenduNb')}
            />
            <ChampNombre
              libelle="Coût"
              value={valeurs.stockInvenduCout}
              onChange={set('stockInvenduCout')}
            />
          </div>
          <ErreurMutation erreur={enregistrer.error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modale « CA HT »
// ---------------------------------------------------------------------------

interface EntreeCaht {
  id?: number
  structureJuridiqueId: number
  annee: number | null
  cahtVefa: number | null
  cahtLvPsla: number | null
  cahtLoyers: number | null
  cahtTma: number | null
  cahtTerrain: number | null
  cahtAutres: number | null
  cahtCommentaire: string | null
  nbLotVefa: number | null
  nbLotLvPsla: number | null
  nbLotAutre: number | null
  nbLotCommentaire: string | null
}

function ModaleCaht({
  sccvId,
  ligne,
  open,
  onOpenChange,
}: {
  sccvId: number
  /** null = création */
  ligne: LigneCaht | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const vide: EntreeCaht = {
    structureJuridiqueId: sccvId,
    annee: null,
    cahtVefa: null,
    cahtLvPsla: null,
    cahtLoyers: null,
    cahtTma: null,
    cahtTerrain: null,
    cahtAutres: null,
    cahtCommentaire: null,
    nbLotVefa: null,
    nbLotLvPsla: null,
    nbLotAutre: null,
    nbLotCommentaire: null,
  }
  const depuisLigne = (l: LigneCaht): EntreeCaht => ({
    structureJuridiqueId: sccvId,
    annee: l.annee,
    cahtVefa: l.cahtVefa,
    cahtLvPsla: l.cahtLvPsla,
    cahtLoyers: l.cahtLoyers,
    cahtTma: l.cahtTma,
    cahtTerrain: l.cahtTerrain,
    cahtAutres: l.cahtAutres,
    cahtCommentaire: l.cahtCommentaire,
    nbLotVefa: l.nbLotVefa,
    nbLotLvPsla: l.nbLotLvPsla,
    nbLotAutre: l.nbLotAutre,
    nbLotCommentaire: l.nbLotCommentaire,
  })
  const [valeurs, setValeurs] = useState<EntreeCaht>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (d: EntreeCaht) => saveBilanCahtFn({ data: d }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bilan', sccvId] })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(ligne ? depuisLigne(ligne) : vide)
      enregistrer.reset()
    }
  }, [open, ligne])

  const set =
    <TCle extends keyof EntreeCaht>(k: TCle) =>
    (v: EntreeCaht[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const total = cahtTotal(valeurs)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le CA HT' : 'Nouvelle ligne de CA HT'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampNombre
              libelle="Année"
              step="1"
              required
              value={valeurs.annee}
              onChange={set('annee')}
            />
            <div />
            <ChampNombre
              libelle="VEFA"
              value={valeurs.cahtVefa}
              onChange={set('cahtVefa')}
            />
            <ChampNombre
              libelle="Levée PSLA"
              value={valeurs.cahtLvPsla}
              onChange={set('cahtLvPsla')}
            />
            <ChampNombre
              libelle="Loyers PSLA"
              value={valeurs.cahtLoyers}
              onChange={set('cahtLoyers')}
            />
            <ChampNombre
              libelle="TMA"
              value={valeurs.cahtTma}
              onChange={set('cahtTma')}
            />
            <ChampNombre
              libelle="Terrain"
              value={valeurs.cahtTerrain}
              onChange={set('cahtTerrain')}
            />
            <ChampNombre
              libelle="Autres"
              value={valeurs.cahtAutres}
              onChange={set('cahtAutres')}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires"
                value={valeurs.cahtCommentaire ?? ''}
                onChange={(v) => set('cahtCommentaire')(v || null)}
              />
            </div>
            <SousTitre>Nombre de lots</SousTitre>
            <ChampNombre
              libelle="Nb lots VEFA"
              step="1"
              value={valeurs.nbLotVefa}
              onChange={set('nbLotVefa')}
            />
            <ChampNombre
              libelle="Nb lots levée PSLA"
              step="1"
              value={valeurs.nbLotLvPsla}
              onChange={set('nbLotLvPsla')}
            />
            <ChampNombre
              libelle="Nb lots autres"
              step="1"
              value={valeurs.nbLotAutre}
              onChange={set('nbLotAutre')}
            />
            <ChampTexteLong
              libelle="Commentaire lots"
              value={valeurs.nbLotCommentaire ?? ''}
              onChange={(v) => set('nbLotCommentaire')(v || null)}
            />
          </div>
          <p className="mt-3 text-right text-[13px] font-semibold text-[var(--ink)]">
            Total CA HT : {fmtEuro(total)}
          </p>
          <ErreurMutation erreur={enregistrer.error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modale « Résultat » (accordéons Résultats + IS - Non IS : mêmes lignes)
// ---------------------------------------------------------------------------

interface EntreeResultat {
  id?: number
  structureJuridiqueId: number
  annee: number | null
  resultCptaSccvTotal: number | null
  ranSccv: number | null
  cpteCourantSccv: number | null
  datePvag: string | null
  resultAcompteMontant: number | null
  resultAcompteDateVersement: string | null
  reintegrationFiscaleSccv: number | null
  deductionFiscaleSccv: number | null
  reintegrationFiscaleComm: string | null
  deductionFiscaleComm: string | null
  pourcKpiAnnee: number | null // en %, converti en fraction au stockage
  commentairePourcHf: string | null
  resultFiscaSccvIs: number | null
  resultFiscaSccvNonIs: number | null
  ranSccvIs: number | null
  ranSccvNonIs: number | null
  ranSccvTotal: number | null
  quotePartHfRanIs: number | null
  quotePartHfRanNonIs: number | null
  quotePartHfRanTotal: number | null
}

function ModaleResultat({
  sccvId,
  ligne,
  open,
  onOpenChange,
}: {
  sccvId: number
  /** null = création */
  ligne: LigneResultat | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const vide: EntreeResultat = {
    structureJuridiqueId: sccvId,
    annee: null,
    resultCptaSccvTotal: null,
    ranSccv: null,
    cpteCourantSccv: null,
    datePvag: null,
    resultAcompteMontant: null,
    resultAcompteDateVersement: null,
    reintegrationFiscaleSccv: null,
    deductionFiscaleSccv: null,
    reintegrationFiscaleComm: null,
    deductionFiscaleComm: null,
    pourcKpiAnnee: null,
    commentairePourcHf: null,
    resultFiscaSccvIs: null,
    resultFiscaSccvNonIs: null,
    ranSccvIs: null,
    ranSccvNonIs: null,
    ranSccvTotal: null,
    quotePartHfRanIs: null,
    quotePartHfRanNonIs: null,
    quotePartHfRanTotal: null,
  }
  const depuisLigne = (l: LigneResultat): EntreeResultat => ({
    structureJuridiqueId: sccvId,
    annee: l.annee,
    resultCptaSccvTotal: l.resultCptaSccvTotal,
    ranSccv: l.ranSccv,
    cpteCourantSccv: l.cpteCourantSccv,
    datePvag: versInputDate(l.datePvag),
    resultAcompteMontant: l.resultAcompteMontant,
    resultAcompteDateVersement: versInputDate(l.resultAcompteDateVersement),
    reintegrationFiscaleSccv: l.reintegrationFiscaleSccv,
    deductionFiscaleSccv: l.deductionFiscaleSccv,
    reintegrationFiscaleComm: l.reintegrationFiscaleComm,
    deductionFiscaleComm: l.deductionFiscaleComm,
    pourcKpiAnnee: enPourcent(l.pourcHfAnnee),
    commentairePourcHf: l.commentairePourcHf,
    resultFiscaSccvIs: l.resultFiscaSccvIs,
    resultFiscaSccvNonIs: l.resultFiscaSccvNonIs,
    ranSccvIs: l.ranSccvIs,
    ranSccvNonIs: l.ranSccvNonIs,
    ranSccvTotal: l.ranSccvTotal,
    quotePartHfRanIs: l.quotePartHfRanIs,
    quotePartHfRanNonIs: l.quotePartHfRanNonIs,
    quotePartHfRanTotal: l.quotePartHfRanTotal,
  })
  const [valeurs, setValeurs] = useState<EntreeResultat>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (d: EntreeResultat) => {
      const { pourcKpiAnnee, ...reste } = d
      return saveBilanResultatFn({
        data: { ...reste, pourcHfAnnee: enFraction(pourcKpiAnnee) },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bilan', sccvId] })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(ligne ? depuisLigne(ligne) : vide)
      enregistrer.reset()
    }
  }, [open, ligne])

  const set =
    <TCle extends keyof EntreeResultat>(k: TCle) =>
    (v: EntreeResultat[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le résultat' : 'Nouvelle ligne de résultat'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampNombre
              libelle="Année"
              step="1"
              required
              value={valeurs.annee}
              onChange={set('annee')}
            />
            <ChampNombre
              libelle="Résultat compta"
              value={valeurs.resultCptaSccvTotal}
              onChange={set('resultCptaSccvTotal')}
            />
            <SousTitre>Affectation résultats SCCV</SousTitre>
            <ChampNombre
              libelle="Report à nouveau"
              value={valeurs.ranSccv}
              onChange={set('ranSccv')}
            />
            <ChampNombre
              libelle="Compte courant"
              value={valeurs.cpteCourantSccv}
              onChange={set('cpteCourantSccv')}
            />
            <ChampDate
              libelle="Date PVAG"
              value={valeurs.datePvag}
              onChange={set('datePvag')}
            />
            <div className="text-right text-[13px] text-[var(--ink-soft)] sm:self-end">
              Total :{' '}
              {fmtEuro(
                affectationTotal({
                  ranSccv: valeurs.ranSccv,
                  cpteCourantSccv: valeurs.cpteCourantSccv,
                }),
              )}
            </div>
            <SousTitre>Acompte</SousTitre>
            <ChampNombre
              libelle="Résultat acompte"
              value={valeurs.resultAcompteMontant}
              onChange={set('resultAcompteMontant')}
            />
            <ChampDate
              libelle="Date versement acompte"
              value={valeurs.resultAcompteDateVersement}
              onChange={set('resultAcompteDateVersement')}
            />
            <SousTitre>Résultat fiscal de la SCCV</SousTitre>
            <ChampNombre
              libelle="Réintégration fiscale"
              value={valeurs.reintegrationFiscaleSccv}
              onChange={set('reintegrationFiscaleSccv')}
            />
            <ChampNombre
              libelle="Déduction fiscale"
              value={valeurs.deductionFiscaleSccv}
              onChange={set('deductionFiscaleSccv')}
            />
            <ChampTexteLong
              libelle="Commentaire réintégration"
              value={valeurs.reintegrationFiscaleComm ?? ''}
              onChange={(v) => set('reintegrationFiscaleComm')(v || null)}
            />
            <ChampTexteLong
              libelle="Commentaire déduction"
              value={valeurs.deductionFiscaleComm ?? ''}
              onChange={(v) => set('deductionFiscaleComm')(v || null)}
            />
            <div className="text-right text-[13px] font-semibold text-[var(--ink)] sm:col-span-2">
              Résultat fiscal SCCV :{' '}
              {fmtEuro(
                resultatFiscal({
                  resultCptaSccvTotal: valeurs.resultCptaSccvTotal,
                  reintegrationFiscaleSccv: valeurs.reintegrationFiscaleSccv,
                  deductionFiscaleSccv: valeurs.deductionFiscaleSccv,
                }),
              )}
            </div>
            <SousTitre>IS - Non IS</SousTitre>
            <ChampNombre
              libelle="% KPI de l'année"
              value={valeurs.pourcKpiAnnee}
              onChange={set('pourcKpiAnnee')}
            />
            <ChampTexteLong
              libelle="Commentaire % KPI"
              value={valeurs.commentairePourcHf ?? ''}
              onChange={(v) => set('commentairePourcHf')(v || null)}
            />
            <ChampNombre
              libelle="Résultat fiscal IS"
              value={valeurs.resultFiscaSccvIs}
              onChange={set('resultFiscaSccvIs')}
            />
            <ChampNombre
              libelle="Résultat fiscal non IS"
              value={valeurs.resultFiscaSccvNonIs}
              onChange={set('resultFiscaSccvNonIs')}
            />
            <SousTitre>Ventilation du RAN</SousTitre>
            <ChampNombre
              libelle="RAN IS"
              value={valeurs.ranSccvIs}
              onChange={set('ranSccvIs')}
            />
            <ChampNombre
              libelle="RAN non IS"
              value={valeurs.ranSccvNonIs}
              onChange={set('ranSccvNonIs')}
            />
            <ChampNombre
              libelle="RAN total"
              value={valeurs.ranSccvTotal}
              onChange={set('ranSccvTotal')}
            />
            <div />
            <ChampNombre
              libelle="QP KPI RAN IS"
              value={valeurs.quotePartHfRanIs}
              onChange={set('quotePartHfRanIs')}
            />
            <ChampNombre
              libelle="QP KPI RAN non IS"
              value={valeurs.quotePartHfRanNonIs}
              onChange={set('quotePartHfRanNonIs')}
            />
            <ChampNombre
              libelle="QP KPI RAN total"
              value={valeurs.quotePartHfRanTotal}
              onChange={set('quotePartHfRanTotal')}
            />
          </div>
          <ErreurMutation erreur={enregistrer.error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Colonnes des quatre tables
// ---------------------------------------------------------------------------

const COLONNES_STOCK: Array<ColumnDef<LigneStock, any>> = [
  colAnnee<LigneStock>(),
  colEuro('stockTotalDebit33a35', 'Balance 33-35 : débit', 150),
  colEuro('stockTotalCredit33a35', 'Balance 33-35 : crédit', 150),
  colEuro('stockCredit713300', 'Variation : crédit 713300', 170),
  colEntier('stockPslaPhaseLocNb', 'Logt PSLA : nb', 110),
  colEuro('stockPslaPhaseLocCout', 'Logt PSLA : coût', 140),
  colEntier('stockInvenduNb', 'Invendus VEFA : nb', 140),
  colEuro('stockInvenduCout', 'Invendus VEFA : coût', 150),
]

const COLONNES_CAHT: Array<ColumnDef<LigneCaht, any>> = [
  colAnnee<LigneCaht>(),
  colEuro('cahtVefa', 'VEFA'),
  colEuro('cahtLvPsla', 'Levée PSLA'),
  colEuro('cahtLoyers', 'Loyers PSLA'),
  colEuro('cahtTma', 'TMA', 110),
  colEuro('cahtTerrain', 'Terrain', 110),
  colEuro('cahtAutres', 'Autres', 110),
  colTexte('cahtCommentaire', 'Commentaires', 200),
  colEuroCalc('cahtTotal', 'Total', (r) => cahtTotal(r)),
  colEntier('nbLotVefa', 'Nb lots VEFA', 110),
  colEntier('nbLotLvPsla', 'Nb lots levée PSLA', 140),
  colEntier('nbLotAutre', 'Nb lots autres', 120),
  colTexte('nbLotCommentaire', 'Commentaire lots', 180),
]
const CAHT_MASQUEES = [
  'nbLotVefa',
  'nbLotLvPsla',
  'nbLotAutre',
  'nbLotCommentaire',
]

const COLONNES_RESULTATS: Array<ColumnDef<LigneResultat, any>> = [
  colAnnee<LigneResultat>(),
  colEuro('resultCptaSccvTotal', 'Compta'),
  colEuro('ranSccv', 'Report à nouveau'),
  colEuro('cpteCourantSccv', 'Compte courant'),
  colEuroCalc(
    'affectationTotal',
    'Total affectation',
    (r) => affectationTotal(r),
    140,
  ),
  colDate('datePvag', 'Date PVAG', 110),
  colEuro('resultAcompteMontant', 'Résultat acompte', 130),
  colDate('resultAcompteDateVersement', 'Date versement acompte', 170),
  colEuro('reintegrationFiscaleSccv', 'Réintégration fiscale', 150),
  colEuro('deductionFiscaleSccv', 'Déduction fiscale', 140),
  colEuroCalc(
    'resultatFiscal',
    'Résultat fiscal SCCV',
    (r) => resultatFiscal(r),
    150,
  ),
  colTexte('reintegrationFiscaleComm', 'Commentaire réintégration', 200),
  colTexte('deductionFiscaleComm', 'Commentaire déduction', 200),
]
const RESULTATS_MASQUEES = ['reintegrationFiscaleComm', 'deductionFiscaleComm']

function colonnesIsNonIs(
  pourcKpiActuel: number | null,
): Array<ColumnDef<LigneResultat, any>> {
  return [
    colAnnee<LigneResultat>(),
    colEuro('resultFiscaSccvIs', 'Résultat SCCV IS', 140),
    colEuro('resultFiscaSccvNonIs', 'Résultat SCCV non IS', 150),
    colEuroCalc(
      'totalFiscalSccv',
      'Total SCCV',
      (r) => totalFiscalSccv(r),
      130,
    ),
    {
      id: 'rappelPourcKpi',
      header: 'Rappel % KPI actuel',
      size: 140,
      accessorFn: () => pourcKpiActuel,
      cell: () => (
        <span className="block text-right tabular-nums">
          {fmtPourc(pourcKpiActuel)}
        </span>
      ),
    },
    {
      accessorKey: 'pourcHfAnnee',
      header: "% KPI de l'année",
      size: 130,
      cell: (c) => (
        <span className="block text-right tabular-nums">
          {fmtPourc(c.getValue())}
        </span>
      ),
    },
    colEuroCalc('quotePartIs', 'Quote-part IS', (r) =>
      quotePart(r.resultFiscaSccvIs, r.pourcHfAnnee),
    ),
    colEuroCalc(
      'quotePartNonIs',
      'Quote-part non IS',
      (r) => quotePart(r.resultFiscaSccvNonIs, r.pourcHfAnnee),
      140,
    ),
    colEuroCalc(
      'quotePartTotal',
      'Quote-part totale',
      (r) => quotePart(totalFiscalSccv(r), r.pourcHfAnnee),
      140,
    ),
    colEuro('ranSccvIs', 'RAN : IS', 120),
    colEuro('ranSccvNonIs', 'RAN : non IS', 120),
    colEuro('ranSccvTotal', 'RAN : total', 120),
    colEuro('quotePartHfRanIs', 'QP KPI RAN : IS', 130),
    colEuro('quotePartHfRanNonIs', 'QP KPI RAN : non IS', 150),
    colEuro('quotePartHfRanTotal', 'QP KPI RAN : total', 140),
    colTexte('commentairePourcHf', 'Commentaire % KPI', 180),
  ]
}
const IS_NON_IS_MASQUEES = [
  'quotePartHfRanIs',
  'quotePartHfRanNonIs',
  'quotePartHfRanTotal',
  'commentairePourcHf',
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const ACCORDEONS = ['Stock et CA', 'Résultats', 'IS - Non IS'] as const
type Accordeon = (typeof ACCORDEONS)[number]

function PageBilan() {
  const { sccv } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <div className="flex h-[calc(100vh-61px)] items-stretch">
      <PanneauSccv
        selectedId={sccv ?? null}
        onSelect={(id) => void navigate({ search: { sccv: id } })}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7">
        {sccv == null ? (
          <div className="island-shell rounded-xl px-8 py-12 text-center">
            <p className="island-kicker mb-2">Bilan</p>
            <p className="text-[15px] text-[var(--muted)]">
              Sélectionnez une SCCV dans la liste de gauche.
            </p>
          </div>
        ) : (
          <BilanSccv key={sccv} sccvId={sccv} />
        )}
      </div>
    </div>
  )
}

function BilanSccv({ sccvId }: { sccvId: number }) {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [accordeon, setAccordeon] = useState<Accordeon>('Stock et CA')

  const bilan = useQuery({
    queryKey: ['bilan', sccvId],
    queryFn: () => getBilanFn({ data: { sccvId } }),
  })

  const [stockSel, setStockSel] = useState<number | null>(null)
  const [stockModale, setStockModale] = useState<
    'creation' | LigneStock | null
  >(null)
  const [cahtSel, setCahtSel] = useState<number | null>(null)
  const [cahtModale, setCahtModale] = useState<'creation' | LigneCaht | null>(
    null,
  )
  const [resultatSel, setResultatSel] = useState<number | null>(null)
  const [resultatModale, setResultatModale] = useState<
    'creation' | LigneResultat | null
  >(null)

  const invalider = () =>
    void queryClient.invalidateQueries({ queryKey: ['bilan', sccvId] })
  const supprimerStock = useMutation({
    mutationFn: (id: number) => deleteBilanStockFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setStockSel(null)
    },
  })
  const supprimerCaht = useMutation({
    mutationFn: (id: number) => deleteBilanCahtFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setCahtSel(null)
    },
  })
  const supprimerResultat = useMutation({
    mutationFn: (id: number) => deleteBilanResultatFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setResultatSel(null)
    },
  })

  const d = bilan.data
  const colsIsNonIs = useMemo(
    () => colonnesIsNonIs(d?.pourcKpiActuel ?? null),
    [d?.pourcKpiActuel],
  )

  if (bilan.isLoading)
    return <p className="text-[13px] text-[var(--muted)]">Chargement…</p>
  if (!d)
    return <p className="text-[13px] text-[var(--muted)]">SCCV introuvable.</p>

  return (
    <>
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
        <h1 className="text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
          {d.fiche.rs}
        </h1>
        {d.fiche.dateLiquidation && (
          <span className="badge-pill bg-[var(--danger-tint)] font-bold text-[var(--danger)]">
            Liquidée le {fmtDate(d.fiche.dateLiquidation)}
          </span>
        )}
      </div>

      <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <Onglets
          onglets={ACCORDEONS}
          actif={accordeon}
          onChange={setAccordeon}
        />

        <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
          {accordeon === 'Stock et CA' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-[var(--gold-ink)]">
                  Stock
                </p>
                {!lectureSeule && (
                  <BoutonsTable
                    selection={stockSel}
                    onNouveau={() => setStockModale('creation')}
                    onModifier={() => {
                      const l = d.stock.find((x) => x.id === stockSel)
                      if (l) setStockModale(l)
                    }}
                    onSupprimer={() => {
                      if (stockSel != null) supprimerStock.mutate(stockSel)
                    }}
                    confirmation="Supprimer cette ligne de stock ?"
                  />
                )}
                <ErreurMutation erreur={supprimerStock.error} />
                <DataTable
                  id="bilan-stock"
                  columns={COLONNES_STOCK}
                  data={d.stock}
                  unite="années"
                  getRowId={(r) => String(r.id)}
                  selectedRowId={stockSel != null ? String(stockSel) : null}
                  onRowClick={(r) => setStockSel(r.id)}
                  totalFor={['stockCredit713300']}
                  emptyText="Aucune ligne de stock."
                />
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-[var(--gold-ink)]">
                  CA HT
                </p>
                {!lectureSeule && (
                  <BoutonsTable
                    selection={cahtSel}
                    onNouveau={() => setCahtModale('creation')}
                    onModifier={() => {
                      const l = d.caht.find((x) => x.id === cahtSel)
                      if (l) setCahtModale(l)
                    }}
                    onSupprimer={() => {
                      if (cahtSel != null) supprimerCaht.mutate(cahtSel)
                    }}
                    confirmation="Supprimer cette ligne de CA HT ?"
                  />
                )}
                <ErreurMutation erreur={supprimerCaht.error} />
                <DataTable
                  id="bilan-caht"
                  columns={COLONNES_CAHT}
                  data={d.caht}
                  unite="années"
                  getRowId={(r) => String(r.id)}
                  selectedRowId={cahtSel != null ? String(cahtSel) : null}
                  onRowClick={(r) => setCahtSel(r.id)}
                  totalFor={[
                    'cahtVefa',
                    'cahtLvPsla',
                    'cahtLoyers',
                    'cahtTma',
                    'cahtTerrain',
                    'cahtAutres',
                    'cahtTotal',
                  ]}
                  defaultHidden={CAHT_MASQUEES}
                  emptyText="Aucune ligne de CA HT."
                />
              </div>
            </div>
          )}

          {accordeon === 'Résultats' && (
            <div className="flex h-full min-h-0 flex-col gap-2">
              {!lectureSeule && (
                <BoutonsTable
                  selection={resultatSel}
                  onNouveau={() => setResultatModale('creation')}
                  onModifier={() => {
                    const l = d.resultats.find((x) => x.id === resultatSel)
                    if (l) setResultatModale(l)
                  }}
                  onSupprimer={() => {
                    if (resultatSel != null)
                      supprimerResultat.mutate(resultatSel)
                  }}
                  confirmation="Supprimer cette ligne de résultat ?"
                />
              )}
              <ErreurMutation erreur={supprimerResultat.error} />
              <DataTable
                id="bilan-resultats"
                columns={COLONNES_RESULTATS}
                data={d.resultats}
                unite="années"
                getRowId={(r) => String(r.id)}
                selectedRowId={resultatSel != null ? String(resultatSel) : null}
                onRowClick={(r) => setResultatSel(r.id)}
                totalFor={[
                  'resultCptaSccvTotal',
                  'ranSccv',
                  'cpteCourantSccv',
                  'affectationTotal',
                  'resultatFiscal',
                ]}
                defaultHidden={RESULTATS_MASQUEES}
                emptyText="Aucune ligne de résultat."
              />
            </div>
          )}

          {accordeon === 'IS - Non IS' && (
            <div className="flex h-full min-h-0 flex-col gap-2">
              {!lectureSeule && (
                <BoutonsTable
                  selection={resultatSel}
                  onNouveau={() => setResultatModale('creation')}
                  onModifier={() => {
                    const l = d.resultats.find((x) => x.id === resultatSel)
                    if (l) setResultatModale(l)
                  }}
                  onSupprimer={() => {
                    if (resultatSel != null)
                      supprimerResultat.mutate(resultatSel)
                  }}
                  confirmation="Supprimer cette ligne de résultat ?"
                />
              )}
              <ErreurMutation erreur={supprimerResultat.error} />
              <DataTable
                id="bilan-is-non-is"
                columns={colsIsNonIs}
                data={d.resultats}
                unite="années"
                getRowId={(r) => String(r.id)}
                selectedRowId={resultatSel != null ? String(resultatSel) : null}
                onRowClick={(r) => setResultatSel(r.id)}
                totalFor={[
                  'resultFiscaSccvIs',
                  'resultFiscaSccvNonIs',
                  'totalFiscalSccv',
                  'quotePartIs',
                  'quotePartNonIs',
                  'quotePartTotal',
                  'ranSccvIs',
                  'ranSccvNonIs',
                  'ranSccvTotal',
                ]}
                defaultHidden={IS_NON_IS_MASQUEES}
                emptyText="Aucune ligne de résultat."
              />
            </div>
          )}
        </div>
      </section>

      <ModaleStock
        sccvId={sccvId}
        ligne={stockModale === 'creation' ? null : stockModale}
        open={stockModale != null}
        onOpenChange={(o) => {
          if (!o) setStockModale(null)
        }}
      />
      <ModaleCaht
        sccvId={sccvId}
        ligne={cahtModale === 'creation' ? null : cahtModale}
        open={cahtModale != null}
        onOpenChange={(o) => {
          if (!o) setCahtModale(null)
        }}
      />
      <ModaleResultat
        sccvId={sccvId}
        ligne={resultatModale === 'creation' ? null : resultatModale}
        open={resultatModale != null}
        onOpenChange={(o) => {
          if (!o) setResultatModale(null)
        }}
      />
    </>
  )
}
