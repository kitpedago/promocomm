// Module Commercialisation (FEN_TABLE_Commercialisation) — phase 1, lecture.
// Référence : migration_windev/captures_ecrans/Commercialisation*.png.
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import Champ from '#/components/Champ'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import SelecteurTranche from '#/components/SelecteurTranche'
import {
  getLotDetailFn,
  getLotsCommFn,
  getOperationCommFn,
} from '#/lib/commercialisation.ts'
import { SELECTION_VIDE, usePref } from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { Selection } from '#/lib/preferences.ts'
import type { ColumnDef } from '@tanstack/react-table'

interface RechercheComm {
  op?: number
  tranche?: number
  lot?: number
}

export const Route = createFileRoute('/_authed/commercialisation')({
  validateSearch: (s: Record<string, unknown>): RechercheComm => ({
    op: s.op ? Number(s.op) : undefined,
    tranche: s.tranche ? Number(s.tranche) : undefined,
    lot: s.lot ? Number(s.lot) : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('commercialisation')) {
      throw redirect({ to: '/' })
    }
    // même fil conducteur que /operations : pas de boucle, la redirection
    // renseigne justement search.op.
    const selection = context.prefs.selection as Selection | undefined
    if (search.op == null && selection?.op != null) {
      throw redirect({ to: '/commercialisation', search: selection })
    }
  },
  component: PageCommercialisation,
})

type LigneLot = Awaited<ReturnType<typeof getLotsCommFn>>[number]

const COLONNES_LOTS: Array<ColumnDef<LigneLot, any>> = [
  { accessorKey: 'numLot', header: 'Num lot', size: 130 },
  {
    accessorKey: 'acquereur',
    header: 'Acquéreur',
    size: 220,
    cell: (c) => c.getValue() ?? '—',
  },
  {
    accessorKey: 'destination',
    header: 'Destination',
    size: 120,
    cell: (c) => c.getValue() ?? '—',
  },
  {
    accessorKey: 'natureAchat',
    header: 'Nature achat',
    size: 120,
    cell: (c) => c.getValue() ?? '—',
  },
  {
    accessorKey: 'dateResa',
    header: 'Date de réservation',
    size: 130,
    cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
  },
  { accessorKey: 'familleDeBien', header: 'Famille de bien', size: 140 },
  { accessorKey: 'typeDeBien', header: 'Type de bien', size: 110 },
  {
    accessorKey: 'surfHabitable',
    header: 'Surf. hab.',
    size: 90,
    cell: (c) => (
      <span className="tabular-nums">
        {c.getValue() != null ? `${c.getValue()} m²` : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'prixVenteTtc',
    header: 'Prix TTC',
    size: 120,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
]

function PageCommercialisation() {
  const { op, tranche, lot } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [, setSelection] = usePref<Selection>('selection', SELECTION_VIDE)

  const operation = useQuery({
    queryKey: ['operation-comm', op],
    queryFn: () => getOperationCommFn({ data: { operationId: op! } }),
    enabled: op != null,
  })
  // pas de choix « ENSEMBLE » : à défaut de tranche dans l'URL, on prend la
  // première tranche de l'opération
  const trancheActive = tranche ?? operation.data?.tranches[0]?.id
  const lots = useQuery({
    queryKey: ['lots-comm', op, trancheActive],
    queryFn: () =>
      getLotsCommFn({ data: { operationId: op!, trancheId: trancheActive } }),
    enabled: op != null && operation.isSuccess,
  })

  return (
    // hauteur fixée à l'écran : la page ne défile pas, chaque table a son
    // ascenseur interne et les onglets du détail restent visibles en bas
    <div className="flex h-[calc(100vh-61px)] items-stretch overflow-hidden">
      <PanneauOperations
        selectedId={op ?? null}
        onSelect={(id) => {
          // nouvelle opération → la tranche mémorisée ne s'applique plus
          setSelection({ op: id })
          void navigate({ search: { op: id } })
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-5 py-5 sm:px-7">
        {op == null ? (
          <div className="island-shell rounded-xl px-8 py-12 text-center">
            <p className="island-kicker mb-2">Commercialisation</p>
            <p className="text-[15px] text-[var(--muted)]">
              Sélectionnez une opération dans la liste de gauche.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
                Lots ({lots.data?.length ?? '…'}) de l'opération{' '}
                {operation.data?.libelle ?? '…'}
                {operation.data?.sccv ? ` — ${operation.data.sccv}` : ''}
              </h1>
              {operation.data?.hlm && (
                <span className="badge-pill bg-[var(--ok-tint)] font-bold text-[var(--ink)]">
                  HLM
                </span>
              )}
            </div>

            {operation.data && (
              <div className="mb-4">
                <SelecteurTranche
                  tranches={operation.data.tranches}
                  value={trancheActive}
                  onChange={(id) => {
                    setSelection({ op, tranche: id })
                    void navigate({ search: { op, tranche: id } })
                  }}
                />
              </div>
            )}

            <DataTable
              id="commercialisation-lots"
              columns={COLONNES_LOTS}
              data={lots.data ?? []}
              unite="lots"
              getRowId={(l) => String(l.id)}
              selectedRowId={lot != null ? String(lot) : null}
              onRowClick={(l) =>
                void navigate({
                  search: { op, tranche: trancheActive, lot: l.id },
                })
              }
              emptyText={
                lots.isLoading
                  ? 'Chargement…'
                  : 'Aucun lot pour cette sélection.'
              }
            />

            {lot != null && <DetailLot key={lot} lotId={lot} />}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Détail du lot sélectionné, en onglets (pattern WinDev)
// Chaque onglet = la même liste de commercialisations du lot, vue par un jeu de
// colonnes différent (cf. captures Commercialisation_Lot_*.png). Seul l'onglet
// Livraison est en champs, comme dans WinDev.
// ---------------------------------------------------------------------------

const ONGLETS = [
  'Commercialisation',
  'Dépôt de garantie',
  'Fiscalité',
  'Contrat Loc. Accession',
  'Prév. signature actes',
  'Actes',
  'Livraison',
] as const
type Onglet = (typeof ONGLETS)[number]

type DetailLotData = NonNullable<Awaited<ReturnType<typeof getLotDetailFn>>>
type LigneComm = DetailLotData['commercialisations'][number] & {
  destination: string | null
}
type ColComm = ColumnDef<LigneComm, any>

const colTexte = (id: string, header: string, size: number): ColComm => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => c.getValue() ?? '—',
})
const colDate = (id: string, header: string, size = 130): ColComm => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
})
const colEuro = (id: string, header: string, size = 130): ColComm => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">
      {fmtEuro(c.getValue())}
    </span>
  ),
})
const colBool = (id: string, header: string, size = 110): ColComm => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (c.getValue() ? 'Oui' : '—'),
})

const COL_BASE: Array<ColComm> = [
  colTexte('acquereur', 'Acquéreur', 200),
  colTexte('destination', 'Destination', 110),
  colTexte('natureAchat', 'Nature achat', 120),
]

// colonnes par onglet, plus celles masquées par défaut (menu Affichage) : ces
// dernières ne sont pas dans la table WinDev mais la donnée existe
const COLONNES: Record<
  Exclude<Onglet, 'Livraison'>,
  { colonnes: Array<ColComm>; masquees?: Array<string> }
> = {
  Commercialisation: {
    colonnes: [
      ...COL_BASE,
      colDate('dateResa', 'Date de résa'),
      colDate('dateAnnulation', 'Date annulation'),
      colTexte(
        'livraisonTrimestrePrevuContrat',
        'Trimestre de livraison prévue au contrat',
        200,
      ),
      colEuro('prixVenteReelTtc', 'Prix de vente réel TTC', 150),
      {
        accessorKey: 'tauxTvaReel',
        header: 'Taux TVA réel',
        size: 110,
        cell: (c) => (
          <span className="block text-right tabular-nums">
            {c.getValue() != null ? `${c.getValue()} %` : '—'}
          </span>
        ),
      },
      colEuro('remiseClientTtc', 'Remise client TTC', 140),
      colEuro('prixVenteReelHt', 'Prix de vente réel HT', 150),
      colTexte('typeAcquereur', 'Type acquéreur', 130),
      colTexte('moyenPaiement', 'Moyen de paiement', 140),
      colTexte('motifAnnulation', 'Motif annulation', 160),
      colTexte('annulationCommentaire', 'Commentaire annulation', 180),
    ],
    masquees: [
      'typeAcquereur',
      'moyenPaiement',
      'motifAnnulation',
      'annulationCommentaire',
    ],
  },
  'Dépôt de garantie': {
    colonnes: [
      ...COL_BASE,
      colEuro('montantDepotGarantie', 'Montant dépôt garantie', 160),
    ],
  },
  Fiscalité: {
    colonnes: [
      ...COL_BASE,
      colDate('dateResa', 'Date de résa'),
      colBool('estJustifFiscal', 'Justif fiscal ?'),
      colBool('estFiscalite', 'Fiscalité ?'),
      colTexte('commFisca', 'Comm Fisca', 240),
      colTexte('fiscalite', 'Fiscalité acquéreur', 150),
    ],
  },
  'Contrat Loc. Accession': {
    colonnes: [
      ...COL_BASE,
      colDate('dateSignatureContratLoc', 'Date signature contrat loc'),
      colEuro('loyer', 'Loyer', 110),
      colEuro('epargne', 'Epargne', 110),
      colDate('dateResiliationContratLoc', 'Résiliation du contrat', 150),
    ],
    masquees: ['dateResiliationContratLoc'],
  },
  'Prév. signature actes': {
    colonnes: [
      ...COL_BASE,
      colDate('dateResa', 'Date de résa'),
      colDate('datePrevueSignatureActe', 'Date prévue signature acte', 160),
      colTexte('dateSignatureComm', 'Commentaire', 240),
      colDate('datePreviActabilite', "Prévision d'actabilité", 150),
    ],
    masquees: ['datePreviActabilite'],
  },
  Actes: {
    colonnes: [
      ...COL_BASE,
      colDate('dateResa', 'Date de résa'),
      colDate('dateSignatureActeVefa', 'Date signature Acte VEFA', 160),
      colDate('dateLeveeOption', 'Date levée option', 140),
      colBool('pasAideRm', "Pas d'aide RM"),
      colEuro('montantSubv', 'Montant subv', 130),
      colEuro('montantSubvAcpte', 'Montant subv acompte', 160),
      {
        id: 'soldeSubvention',
        header: 'Solde subvention',
        size: 140,
        // calcul WinDev : MontantSubv - MontantSubvAcpte
        accessorFn: (l: LigneComm) =>
          l.montantSubv != null || l.montantSubvAcpte != null
            ? (l.montantSubv ?? 0) - (l.montantSubvAcpte ?? 0)
            : null,
        cell: (c) => (
          <span className="block text-right tabular-nums">
            {fmtEuro(c.getValue())}
          </span>
        ),
      },
      colBool('soldeDemande', 'Solde demandé'),
    ],
  },
}

function DetailLot({ lotId }: { lotId: number }) {
  const [ongletStocke, setOnglet] = usePref<Onglet>(
    'onglet:commercialisation',
    ONGLETS[0],
  )
  const onglet = ONGLETS.includes(ongletStocke) ? ongletStocke : ONGLETS[0]
  // ligne sélectionnée dans les tables d'onglet (défaut : commercialisation
  // courante) — pilote les versements et l'onglet Livraison
  const [commId, setCommId] = useState<number | null>(null)
  const detail = useQuery({
    queryKey: ['lot-detail', lotId],
    queryFn: () => getLotDetailFn({ data: { lotId } }),
  })

  if (detail.isLoading) {
    return (
      <p className="mt-5 text-[13px] text-[var(--muted)]">Chargement du lot…</p>
    )
  }
  const d = detail.data
  if (!d) return null

  // la destination est portée par le lot, mais WinDev l'affiche sur chaque ligne
  const lignes: Array<LigneComm> = d.commercialisations.map((c) => ({
    ...c,
    destination: d.destination,
  }))
  // commercialisation « courante » : la plus récente non annulée, sinon la plus récente
  const courante = lignes.find((c) => !c.dateAnnulation) ?? lignes.at(0)
  const selection = lignes.find((c) => c.id === commId) ?? courante
  const versements = selection
    ? d.versements.filter((v) => v.commercialisationId === selection.id)
    : []

  return (
    // borné à la moitié basse de l'écran : les onglets restent visibles, c'est
    // la table de l'onglet qui défile
    <section className="island-shell mt-5 flex max-h-[52%] min-h-0 shrink-0 flex-col overflow-hidden rounded-xl">
      <header className="shrink-0 border-b border-[var(--line-soft)] px-[18px] py-[14px]">
        <h2 className="text-[15.5px] font-bold text-[var(--ink)]">
          Détails du lot {d.fiche.numLot ?? d.fiche.id}
        </h2>
        <p className="text-xs text-[var(--muted)]">
          {d.fiche.designation ?? d.fiche.familleDeBien ?? ''}
          {d.fiche.surfHabitable != null
            ? ` · ${d.fiche.surfHabitable} m² hab.`
            : ''}
          {d.fiche.numEtage ? ` · étage ${d.fiche.numEtage}` : ''}
          {` · prix grille ${fmtEuro(d.fiche.prixVenteTtc)}`}
        </p>
      </header>

      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[18px] py-4">
        {!selection ? (
          <p className="text-[13px] text-[var(--muted)]">
            Lot jamais commercialisé.
          </p>
        ) : onglet === 'Livraison' ? (
          <div className="flex flex-col gap-4">
            <Champ libelle="Date livraison">
              {fmtDate(selection.dateLivraison)}
            </Champ>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Champ libelle="Destination">{selection.destination}</Champ>
              <Champ libelle="Nature d'achat">{selection.natureAchat}</Champ>
              <Champ libelle="Adresse du lot">{d.fiche.adresse}</Champ>
              <Champ libelle="Adresse actuelle">
                {selection.adresseActuelle}
              </Champ>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <DataTable
              id={`lot-comm-${onglet}`}
              columns={COLONNES[onglet].colonnes}
              defaultHidden={COLONNES[onglet].masquees}
              data={lignes}
              unite="réservations"
              getRowId={(c) => String(c.id)}
              selectedRowId={String(selection.id)}
              onRowClick={(c) => setCommId(c.id)}
            />

            {onglet === 'Dépôt de garantie' && (
              <div className="flex max-h-[45%] min-h-0 shrink-0 flex-col gap-2">
                <h3 className="text-[13.5px] font-bold text-[var(--ink)]">
                  Versement pour la réservation de{' '}
                  {selection.acquereur ?? 'l’acquéreur'}
                </h3>
                <DataTable
                  id="lot-versements"
                  columns={COLONNES_VERSEMENTS}
                  data={versements}
                  unite="versements"
                  getRowId={(v) => String(v.id)}
                  totalFor={['montantVerse']}
                  emptyText="Aucun versement enregistré."
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

type LigneVersement = DetailLotData['versements'][number]

const COLONNES_VERSEMENTS: Array<ColumnDef<LigneVersement, any>> = [
  { accessorKey: 'id', header: 'N° versement', size: 110 },
  {
    accessorKey: 'montantVerse',
    header: 'Montant versé',
    size: 130,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  {
    accessorKey: 'dateRemise',
    header: 'Date remise',
    size: 120,
    cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
  },
  {
    accessorKey: 'commentaire',
    header: 'Commentaire',
    size: 280,
    cell: (c) => c.getValue() ?? '—',
  },
  {
    accessorKey: 'dateCreation',
    header: 'Date création',
    size: 120,
    cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
  },
]
