// Module SCCV (FEN_TABLE_StructureJuridique + FEN_Fiche_StructureJuridique)
// — phase 4, lecture (les modales CRUD sont la tâche 8). Filtres + table
// principale, détail sous la table en 4 onglets (Associés, Opérations,
// Comptes bancaires, Centre des impôts).
// Référence : docs/plan-implementation.md (module SCCV).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import Champ from '#/components/Champ'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import {
  getSccvDetailFn,
  getSccvListeFn,
  getSccvNomenclaturesFn,
} from '#/lib/sccv.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheSccv {
  sccv?: number
}

export const Route = createFileRoute('/_authed/sccv')({
  validateSearch: (s: Record<string, unknown>): RechercheSccv => ({
    sccv: s.sccv ? Number(s.sccv) : undefined,
  }),
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('sccv')) throw redirect({ to: '/' })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageSccv,
})

type LigneSccv = Awaited<ReturnType<typeof getSccvListeFn>>[number]
type DetailSccv = NonNullable<Awaited<ReturnType<typeof getSccvDetailFn>>>
type LigneParticipation = DetailSccv['participations'][number]
type LigneOperationSccv = DetailSccv['operations'][number]
type LigneCompteSccv = DetailSccv['comptes'][number]
type Nomenclatures = Awaited<ReturnType<typeof getSccvNomenclaturesFn>>

// cases à cocher WinDev en lecture → toggles désactivés (pattern operations.tsx)
function Case({ libelle, actif }: { libelle: string; actif?: boolean | null }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
      <Switch checked={!!actif} disabled className="scale-75" />
      {libelle}
    </label>
  )
}

// --- colonnes génériques (mêmes formatteurs que les autres écrans) ---

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
const colEuro = <T,>(
  id: string,
  header: string,
  size = 120,
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
// coché/décoché tel qu'affiché dans les tables WinDev (✓/—), à distinguer du
// composant Case (toggles désactivés des fiches)
const colCheck = <T,>(
  id: string,
  header: string,
  size = 90,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => <span className="block text-center">{c.getValue() ? '✓' : '—'}</span>,
})

// ---------------------------------------------------------------------------
// Table principale
// ---------------------------------------------------------------------------

const COLONNES_SCCV: Array<ColumnDef<LigneSccv, any>> = [
  {
    accessorKey: 'rs',
    header: 'Nom SCCV',
    size: 220,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colTexte('numTvaIntra', 'N° TVA intra', 150),
  colTexte('siret', 'Siret', 140),
  colCheck('sccvHf', 'HF ?', 70),
  colCheck('sccvHlm', 'HLM ?', 80),
  colDate('dateDebutActivite', 'Début activité'),
  colDate('dateImmat', 'Immatriculation'),
  colDate('dateBilanDebutPremierExercice', 'Début bilan 1ᵉʳ exercice', 170),
  colDate('dateBilanFinPremierExercice', 'Fin bilan 1ᵉʳ exercice', 160),
  colTexte('dateModifCloture', 'Modif clôture', 130),
  colTexte('datePlanningCloture', 'Planning clôture', 140),
  colDate('dateLiquidation', 'Liquidation'),
  colDate('dateLiberationCapital', 'Libération capital', 150),
  colTexte('comptable', 'Comptable', 170),
  colTexte('stade', 'Stade', 150),
  colCheck('hfsga', 'HF SGA ?', 90),
  colEuro('capital', 'Capital', 120),
  colCheck('cpteFiscal', 'Cpte fiscal ?', 110),
  {
    accessorKey: 'nbPart',
    header: 'Nb parts',
    size: 90,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colEuro('montantPart', 'Montant parts', 130),
  colTexte('gestionnaire', 'Gestionnaire', 160),
]

const DEFAUT_MASQUEES = [
  'dateBilanDebutPremierExercice',
  'dateBilanFinPremierExercice',
  'dateModifCloture',
  'datePlanningCloture',
  'dateLiberationCapital',
]

// --- barre de filtres ---

function SelectFiltre({
  libelle,
  value,
  onChange,
  options,
}: {
  libelle: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  options: Array<{ id: number; libelle: string | null }>
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
      {libelle}
      <Select
        value={value != null ? String(value) : 'tous'}
        onValueChange={(v) => onChange(v === 'tous' ? undefined : Number(v))}
      >
        <SelectTrigger className="h-8 w-[170px] bg-[var(--card)] text-[13px]">
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

function PageSccv() {
  const { sccv } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [stadeId, setStadeId] = useState<number | undefined>(undefined)
  const [comptableId, setComptableId] = useState<number | undefined>(undefined)
  const [gestionnaireId, setGestionnaireId] = useState<number | undefined>(
    undefined,
  )
  const [liquidee, setLiquidee] = useState(false)
  const [recherche, setRecherche] = useState('')
  // pas de recherche serveur en dessous de 3 caractères (iso-WinDev)
  const contient =
    recherche.trim().length >= 3 ? recherche.trim() : undefined

  const nomenclatures = useQuery({
    queryKey: ['sccv-nomenclatures'],
    queryFn: () => getSccvNomenclaturesFn(),
    staleTime: 60_000,
  })

  const filtres = { stadeId, comptableId, gestionnaireId, liquidee, contient }
  const liste = useQuery({
    queryKey: ['sccv-liste', filtres],
    queryFn: () => getSccvListeFn({ data: filtres }),
  })

  return (
    <div className="flex h-[calc(100vh-61px)] flex-col overflow-hidden px-5 py-5 sm:px-7">
      <h1 className="mb-3 shrink-0 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
        SCCV
      </h1>

      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <SelectFiltre
          libelle="Stade"
          value={stadeId}
          onChange={setStadeId}
          options={nomenclatures.data?.stades ?? []}
        />
        <SelectFiltre
          libelle="Comptable"
          value={comptableId}
          onChange={setComptableId}
          options={nomenclatures.data?.comptables ?? []}
        />
        <SelectFiltre
          libelle="Gestionnaire"
          value={gestionnaireId}
          onChange={setGestionnaireId}
          options={nomenclatures.data?.gestionnaires ?? []}
        />

        <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
          <Switch checked={liquidee} onCheckedChange={(v) => setLiquidee(!!v)} />
          Liquidées
        </label>

        <label
          title="Recherche sur le nom SCCV (au moins 3 caractères)"
          className={`flex h-8 items-center gap-1.5 rounded-lg border bg-[var(--card)] px-2.5 ${
            contient
              ? 'border-[var(--gold)] bg-[var(--gold-tint)]'
              : 'border-[var(--input-border)]'
          }`}
        >
          <Search className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Contient… (3 car. min)"
            className="w-48 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          {recherche && (
            <button
              onClick={() => setRecherche('')}
              className="cursor-pointer text-xs font-bold text-[var(--gold-ink)]"
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          )}
        </label>
      </div>

      <DataTable
        id="sccv"
        columns={COLONNES_SCCV}
        data={liste.data ?? []}
        unite="SCCV"
        getRowId={(r) => String(r.id)}
        selectedRowId={sccv != null ? String(sccv) : null}
        onRowClick={(r) => void navigate({ search: { sccv: r.id } })}
        defaultHidden={DEFAUT_MASQUEES}
        emptyText={liste.isLoading ? 'Chargement…' : 'Aucune SCCV trouvée.'}
      />

      {sccv != null && (
        <DetailSccv
          key={sccv}
          sccvId={sccv}
          nomenclatures={nomenclatures.data}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Détail : fiche + 4 onglets (Associés / Opérations / Comptes bancaires /
// Centre des impôts)
// ---------------------------------------------------------------------------

const ONGLETS_SCCV = [
  'Associés',
  'Opérations',
  'Comptes bancaires',
  'Centre des impôts',
] as const
type OngletSccv = (typeof ONGLETS_SCCV)[number]

const COLONNES_PARTICIPATIONS: Array<ColumnDef<LigneParticipation, any>> = [
  colTexte('associe', 'Associé', 220),
  {
    accessorKey: 'pourcentage',
    header: '%',
    size: 90,
    cell: (c) => {
      const v = c.getValue<number | null>()
      return (
        <span className="block text-right tabular-nums">
          {v != null
            ? `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
            : '—'}
        </span>
      )
    },
  },
  colCheck('convTreso', 'Conv. tréso', 100),
  colTexte('motif', 'Motif rémunération', 170),
  colDate('dateSignatureConv', 'Date signature conv.'),
  colDate('dateApplication', 'Date application'),
  colDate('dateFinRemuneration', 'Date fin rémunération'),
  colTexte('indexTaux', 'Index taux', 130),
  colTexte('infoTauxRemuneration', 'Info taux', 150),
  colTexte('periodiciteVersement', 'Périodicité', 110),
  colTexte('commentaires', 'Commentaires', 220),
]

const COLONNES_OPERATIONS_SCCV: Array<ColumnDef<LigneOperationSccv, any>> = [
  colTexte('libelle', 'Nom opération', 220),
  colTexte('cp', 'Code postal', 100),
  colTexte('commune', 'Commune', 150),
  colCheck('surRennesMetropole', 'Sur Rennes Métropole', 150),
  colCheck('anru', 'ANRU', 90),
  {
    accessorKey: 'anneeDgd',
    header: 'Année DGD',
    size: 110,
    cell: (c) => c.getValue() ?? '—',
  },
  colTexte('adresse', 'Adresse', 220),
  colTexte('nomZac', 'Nom ZAC', 150),
]

const COLONNES_COMPTES_SCCV: Array<ColumnDef<LigneCompteSccv, any>> = [
  colTexte('banque', 'Banque', 180),
  colTexte('typeCompte', 'Type de compte', 150),
  colTexte('utilisation', 'Utilisation', 150),
  colTexte('numCompte', 'N° compte', 150),
  colTexte('iban', 'IBAN', 220),
  colTexte('bic', 'BIC', 110),
  colCheck('estCloture', 'Clôturé', 90),
  colTexte('commentaires', 'Commentaires', 220),
]

function DetailSccv({
  sccvId,
  nomenclatures,
}: {
  sccvId: number
  nomenclatures: Nomenclatures | undefined
}) {
  const [onglet, setOnglet] = useState<OngletSccv>('Associés')
  const detail = useQuery({
    queryKey: ['sccv-detail', sccvId],
    queryFn: () => getSccvDetailFn({ data: { sccvId } }),
  })

  if (detail.isLoading) {
    return (
      <p className="mt-5 shrink-0 text-[13px] text-[var(--muted)]">
        Chargement…
      </p>
    )
  }
  const d = detail.data
  if (!d) {
    return (
      <p className="mt-5 shrink-0 text-[13px] text-[var(--muted)]">
        SCCV introuvable.
      </p>
    )
  }
  const f = d.fiche
  const sie = nomenclatures?.sies.find((s) => s.id === f.sieId)
  const civilite = nomenclatures?.civilites.find((c) => c.id === f.civiliteId)

  return (
    <section className="island-shell mt-5 flex max-h-[52%] min-h-0 shrink-0 flex-col overflow-hidden rounded-xl">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--line-soft)] px-[18px] py-[14px]">
        <h2 className="text-[15.5px] font-bold text-[var(--ink)]">{f.rs}</h2>
        {f.dateLiquidation && (
          <span className="badge-pill bg-[var(--danger-tint)] font-bold text-[var(--danger)]">
            Liquidée le {fmtDate(f.dateLiquidation)}
          </span>
        )}
      </header>

      <Onglets onglets={ONGLETS_SCCV} actif={onglet} onChange={setOnglet} />

      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {onglet === 'Associés' && (
          <div className="flex h-full min-h-0 flex-col">
            <DataTable
              id="sccv-participations"
              columns={COLONNES_PARTICIPATIONS}
              data={d.participations}
              unite="associés"
              getRowId={(p) => String(p.id)}
              totalFor={['pourcentage']}
              emptyText="Aucun associé."
            />
          </div>
        )}

        {onglet === 'Opérations' && (
          <div className="flex h-full min-h-0 flex-col">
            <DataTable
              id="sccv-operations"
              columns={COLONNES_OPERATIONS_SCCV}
              data={d.operations}
              unite="opérations"
              getRowId={(o) => String(o.id)}
              emptyText="Aucune opération."
            />
          </div>
        )}

        {onglet === 'Comptes bancaires' && (
          <div className="flex h-full min-h-0 flex-col">
            <DataTable
              id="sccv-comptes"
              columns={COLONNES_COMPTES_SCCV}
              data={d.comptes}
              unite="comptes"
              getRowId={(c) => String(c.id)}
              emptyText="Aucun compte bancaire."
            />
          </div>
        )}

        {onglet === 'Centre des impôts' && (
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            <Case libelle="EDI TVA" actif={f.ediTva} />
            <Case libelle="EDI Liasse" actif={f.ediLiasse} />
            <Case libelle="Cpte fiscal" actif={f.cpteFiscal} />
            <Champ libelle="SIE">{sie?.libelle}</Champ>
            <Champ libelle="Civilité">{civilite?.libelle}</Champ>
            <Champ libelle="Interlocuteur SIE">{f.interlocuteurSie}</Champ>
            <Champ libelle="Date mandat SIE">{fmtDate(f.dateMandatSie)}</Champ>
          </div>
        )}
      </div>
    </section>
  )
}
