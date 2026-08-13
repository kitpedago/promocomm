// Module Commercialisation (FEN_TABLE_Commercialisation) — phase 1, lecture.
// Référence : migration_windev/captures_ecrans/Commercialisation*.png.
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import Champ from '#/components/Champ'
import {
  BoutonsTable,
  ChampBascule,
  ChampDate,
  ChampNombre,
  ChampForm,
  ChampSelectId,
  ChampSelectTexte,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
  SousTitre,
  versInputDate,
} from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import Scindeur from '#/components/Scindeur'
import SelecteurTranche from '#/components/SelecteurTranche'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { getNomenclatureFn } from '#/lib/parametres.ts'
import {
  annulerCommercialisationFn,
  appliquerAdresseLotFn,
  deleteVersementFn,
  getCommNomenclaturesFn,
  getDroitsFn,
  getExportCommFn,
  getLotDetailFn,
  getLotsCommFn,
  getOperationCommFn,
  propagerAdresseFn,
  propagerDateLivraisonFn,
  saveCommercialisationFn,
  saveVersementFn,
  updateDateLivraisonFn,
  updateTrancheAdresseFn,
} from '#/lib/commercialisation.ts'
import { telechargerCsv } from '#/lib/csv.ts'
import { enFraction, enPourcent } from '#/lib/sccv.helpers.ts'
import {
  selectionARejouer,
  useMemoriserSelection,
  usePref,
} from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

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
    // même fil conducteur que /operations, cf. le commentaire de
    // selectionARejouer pour la garde contre la boucle de redirection.
    const selection = selectionARejouer(context.prefs, search.op)
    if (selection) {
      throw redirect({ to: '/commercialisation', search: selection })
    }
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageCommercialisation,
})

type LigneLot = Awaited<ReturnType<typeof getLotsCommFn>>[number]
type Nomenclatures = Awaited<ReturnType<typeof getCommNomenclaturesFn>>

// Droits fins de la fenêtre (restrictions du service courant, cf. table droit)
function useDroitsComm() {
  const droits = useQuery({
    queryKey: ['droits', 'FEN_TABLE_Commercialisation'],
    queryFn: () =>
      getDroitsFn({ data: { fenetre: 'FEN_TABLE_Commercialisation' } }),
    staleTime: 300_000,
  })
  // tant que les droits ne sont pas chargés, on restreint (jamais l'inverse)
  return (controle: string) =>
    droits.data?.some((d) => d.controle === controle) ?? true
}

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

  const operation = useQuery({
    queryKey: ['operation-comm', op],
    queryFn: () => getOperationCommFn({ data: { operationId: op! } }),
    enabled: op != null,
  })
  // pas de choix « ENSEMBLE » : à défaut de tranche dans l'URL — ou si celle
  // demandée n'existe plus après un réimport .bak — on prend la première
  // tranche de l'opération
  const tranches = operation.data?.tranches
  const trancheActive = (
    tranches?.find((t) => t.id === tranche) ?? tranches?.[0]
  )?.id
  // l'URL fait foi : un lien partagé `?op=99` devient la sélection mémorisée
  useMemoriserSelection(op, trancheActive)
  const lots = useQuery({
    queryKey: ['lots-comm', op, trancheActive],
    queryFn: () =>
      getLotsCommFn({ data: { operationId: op!, trancheId: trancheActive } }),
    enabled: op != null && operation.data != null,
  })

  const tableLots = (
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
        lots.isLoading ? 'Chargement…' : 'Aucun lot pour cette sélection.'
      }
    />
  )

  return (
    // hauteur fixée à l'écran : la page ne défile pas, chaque table a son
    // ascenseur interne et les onglets du détail restent visibles en bas
    <div className="flex h-[calc(100vh-61px)] items-stretch overflow-hidden">
      <PanneauOperations
        selectedId={op ?? null}
        // nouvelle opération → la tranche mémorisée ne s'applique plus
        onSelect={(id) => void navigate({ search: { op: id } })}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-5 py-5 sm:px-7">
        {op == null ? (
          <div className="island-shell rounded-xl px-8 py-12 text-center">
            <p className="island-kicker mb-2">Commercialisation</p>
            <p className="text-[15px] text-[var(--muted)]">
              Sélectionnez une opération dans la liste de gauche.
            </p>
          </div>
        ) : !operation.data ? (
          // une opération mémorisée puis supprimée dans WinDev ramène ici à
          // chaque visite : le dire, plutôt qu'une table vide sans explication
          <p className="text-[13px] text-[var(--muted)]">
            {operation.isLoading ? 'Chargement…' : 'Opération introuvable.'}
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h1 className="text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
                Lots ({lots.data?.length ?? '…'}) de l'opération{' '}
                {operation.data.libelle}
                {operation.data.sccv ? ` — ${operation.data.sccv}` : ''}
              </h1>
              {operation.data.hlm && (
                <span className="badge-pill bg-[var(--ok-tint)] font-bold text-[var(--ink)]">
                  HLM
                </span>
              )}
              <BoutonExporter operationId={op} />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <SelecteurTranche
                tranches={operation.data.tranches}
                value={trancheActive}
                onChange={(id) =>
                  void navigate({ search: { op, tranche: id } })
                }
              />
              {trancheActive != null && (
                <Propagation
                  tranche={operation.data.tranches.find(
                    (t) => t.id === trancheActive,
                  )}
                  // adresse de tranche modifiée → l'en-tête (operation.tranches)
                  // doit suivre pour préremplir les prochaines modales
                  onDone={() => {
                    void lots.refetch()
                    void operation.refetch()
                  }}
                />
              )}
            </div>

            {lot == null ? (
              tableLots
            ) : (
              <div className="min-h-0 flex-1">
                <Scindeur
                  id="commercialisation"
                  haut={tableLots}
                  bas={<DetailLot lotId={lot} />}
                />
              </div>
            )}
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

// en-tête vert pâle pour les colonnes qui étaient jaunes (saisie en ligne)
// dans WinDev — distinct du doré (sections de modale, groupes du Bilan)
const enJaune = (c: ColComm): ColComm => ({
  ...c,
  meta: { classeEntete: 'bg-[var(--ok-tint)] text-[var(--ink)]' },
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
      enJaune(colBool('estJustifFiscal', 'Justif fiscal ?')),
      enJaune(colBool('estFiscalite', 'Fiscalité ?')),
      enJaune(colTexte('commFisca', 'Comm Fisca', 240)),
      enJaune(colTexte('fiscalite', 'Fiscalité acquéreur', 150)),
    ],
  },
  'Contrat Loc. Accession': {
    colonnes: [
      ...COL_BASE,
      enJaune(colDate('dateSignatureContratLoc', 'Date signature contrat loc')),
      enJaune(colEuro('loyer', 'Loyer', 110)),
      enJaune(colEuro('epargne', 'Epargne', 110)),
      colDate('dateResiliationContratLoc', 'Résiliation du contrat', 150),
    ],
    masquees: ['dateResiliationContratLoc'],
  },
  'Prév. signature actes': {
    colonnes: [
      ...COL_BASE,
      colDate('dateResa', 'Date de résa'),
      enJaune(
        colDate('datePrevueSignatureActe', 'Date prévue signature acte', 160),
      ),
      enJaune(colTexte('dateSignatureComm', 'Commentaire', 240)),
      colDate('datePreviActabilite', "Prévision d'actabilité", 150),
    ],
    masquees: ['datePreviActabilite'],
  },
  Actes: {
    colonnes: [
      ...COL_BASE,
      colDate('dateResa', 'Date de résa'),
      enJaune(
        colDate('dateSignatureActeVefa', 'Date signature Acte VEFA', 160),
      ),
      enJaune(colDate('dateLeveeOption', 'Date levée option', 140)),
      enJaune(colBool('pasAideRm', "Pas d'aide RM")),
      enJaune(colEuro('montantSubv', 'Montant subv', 130)),
      enJaune(colEuro('montantSubvAcpte', 'Montant subv acompte', 160)),
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
      enJaune(colBool('soldeDemande', 'Solde demandé')),
    ],
  },
}

function DetailLot({ lotId }: { lotId: number }) {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const restreint = useDroitsComm()
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
    // au changement de lot on garde l'ancien détail affiché le temps du
    // fetch : pas de flash « Chargement… » (le composant reste monté, sans key)
    placeholderData: keepPreviousData,
  })
  const nomenclatures = useQuery({
    queryKey: ['comm-nomenclatures'],
    queryFn: () => getCommNomenclaturesFn(),
    staleTime: 60_000,
  })
  const invalider = () => {
    void queryClient.invalidateQueries({ queryKey: ['lot-detail', lotId] })
    void queryClient.invalidateQueries({ queryKey: ['lots-comm'] })
  }
  // 'creation' = Réserver, une ligne = Modifier
  const [commModale, setCommModale] = useState<'creation' | LigneComm | null>(
    null,
  )
  const [annulationModale, setAnnulationModale] = useState<LigneComm | null>(
    null,
  )
  const [versementSel, setVersementSel] = useState<number | null>(null)
  const [versementModale, setVersementModale] = useState<
    'creation' | LigneVersement | null
  >(null)
  // sans remontage (pas de key), une sélection de l'ancien lot pointerait
  // vers des lignes d'un autre lot — reset au changement
  useEffect(() => {
    setCommId(null)
    setCommModale(null)
    setAnnulationModale(null)
    setVersementSel(null)
    setVersementModale(null)
  }, [lotId])
  const supprimerVersement = useMutation({
    mutationFn: (id: number) => deleteVersementFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setVersementSel(null)
    },
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
    // remplit le volet bas du Scindeur : hauteur constante quel que soit
    // l'onglet actif, c'est le contenu de l'onglet qui défile
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--line-soft)] px-[18px] py-[14px]">
        <div>
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
        </div>
        {!lectureSeule && !restreint('SC_Reservation') && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              onClick={() => {
                // iso-WinDev : blocage avant ouverture de la fiche
                if (lignes.some((c) => !c.dateAnnulation)) {
                  alert(
                    "Ce lot est déjà réservé. Vous devez d'abord annuler la réservation.",
                  )
                  return
                }
                setCommModale('creation')
              }}
            >
              Réserver
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!selection}
              onClick={() => {
                if (selection) setCommModale(selection)
              }}
            >
              Modifier
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!selection || selection.dateAnnulation != null}
              onClick={() => {
                if (selection) setAnnulationModale(selection)
              }}
            >
              Annuler la réservation
            </Button>
          </div>
        )}
      </header>

      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-[18px] py-4">
        {!selection ? (
          <p className="text-[13px] text-[var(--muted)]">
            Lot jamais commercialisé.
          </p>
        ) : onglet === 'Livraison' ? (
          <OngletLivraison
            selection={selection}
            adresseLot={d.adresseCompleteLot}
            peutModifier={!lectureSeule && !restreint('TABLE_REQ_Livraison')}
            onDone={invalider}
          />
        ) : (
          <div className="flex flex-col gap-5">
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
              <div className="flex flex-col gap-2">
                <h3 className="text-[13.5px] font-bold text-[var(--ink)]">
                  Versement pour la réservation de{' '}
                  {selection.acquereur ?? 'l’acquéreur'}
                </h3>
                {!lectureSeule &&
                  !restreint('TABLE_VersementDepotGarantie') && (
                    <BoutonsTable
                      selection={versementSel}
                      onNouveau={() => setVersementModale('creation')}
                      onModifier={() => {
                        const v = versements.find((x) => x.id === versementSel)
                        if (v) setVersementModale(v)
                      }}
                      onSupprimer={() => {
                        if (
                          versementSel != null &&
                          !restreint('BTN_VersementDepotGarantie_Supprimer')
                        )
                          supprimerVersement.mutate(versementSel)
                      }}
                      confirmation="Supprimer ce versement ?"
                    />
                  )}
                <ErreurMutation erreur={supprimerVersement.error} />
                <DataTable
                  id="lot-versements"
                  columns={COLONNES_VERSEMENTS}
                  data={versements}
                  unite="versements"
                  getRowId={(v) => String(v.id)}
                  selectedRowId={
                    versementSel != null ? String(versementSel) : null
                  }
                  onRowClick={(v) => setVersementSel(v.id)}
                  totalFor={['montantVerse']}
                  emptyText="Aucun versement enregistré."
                />
              </div>
            )}
          </div>
        )}
      </div>

      <ModaleCommercialisation
        lotId={lotId}
        ligne={commModale === 'creation' ? null : commModale}
        open={commModale != null}
        onOpenChange={(o) => {
          if (!o) setCommModale(null)
        }}
        nomenclatures={nomenclatures.data}
        ongletActif={onglet}
        onDone={invalider}
      />
      <ModaleAnnulation
        ligne={annulationModale}
        open={annulationModale != null}
        onOpenChange={(o) => {
          if (!o) setAnnulationModale(null)
        }}
        onDone={invalider}
      />
      {selection && (
        <ModaleVersement
          commercialisationId={selection.id}
          ligne={versementModale === 'creation' ? null : versementModale}
          open={versementModale != null}
          onOpenChange={(o) => {
            if (!o) setVersementModale(null)
          }}
          onDone={invalider}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Onglet Livraison (iso-WinDev : SAI_Date_livraison + BTN_Enregistrer,
// section Adresses avec rappels et BTN_Appliquer_l_adresse)
// ---------------------------------------------------------------------------

function OngletLivraison({
  selection,
  adresseLot,
  peutModifier,
  onDone,
}: {
  selection: LigneComm
  adresseLot: string | null
  peutModifier: boolean
  onDone: () => void
}) {
  const [date, setDate] = useState<string | null>(() =>
    versInputDate(selection.dateLivraison),
  )
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    setDate(versInputDate(selection.dateLivraison))
    setMessage(null)
  }, [selection.id])
  const enregistrer = useMutation({
    mutationFn: () =>
      updateDateLivraisonFn({
        data: { id: selection.id, dateLivraison: date },
      }),
    onSuccess: () => {
      setMessage('Date enregistrée.')
      onDone()
    },
  })
  const appliquer = useMutation({
    mutationFn: () =>
      appliquerAdresseLotFn({ data: { commercialisationId: selection.id } }),
    onSuccess: () => {
      setMessage("Adresse actuelle de l'acquéreur remplacée.")
      onDone()
    },
  })
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-end gap-2">
        <fieldset disabled={!peutModifier} className="w-52">
          <ChampDate libelle="Date livraison" value={date} onChange={setDate} />
        </fieldset>
        {peutModifier && (
          <Button
            size="sm"
            onClick={() => enregistrer.mutate()}
            disabled={enregistrer.isPending}
          >
            Enregistrer
          </Button>
        )}
      </div>
      <SousTitre>Adresses</SousTitre>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Champ libelle="Destination">{selection.destination}</Champ>
        <Champ libelle="Nature d'achat">{selection.natureAchat}</Champ>
      </div>
      <Champ libelle="Adresse du lot">{adresseLot}</Champ>
      <Champ libelle="Adresse actuelle">{selection.adresseActuelle}</Champ>
      {peutModifier && (
        <div>
          <Button
            size="sm"
            variant="outline"
            disabled={
              !adresseLot || !selection.adresseActuelle || appliquer.isPending
            }
            onClick={() => {
              // confirmation iso-WinDev (BTN_Appliquer_l_adresse)
              if (
                confirm(
                  `Voulez-vous remplacer l'adresse actuelle de l'acquéreur :\n\n${selection.adresseActuelle ?? ''}\n\npar\n\n${adresseLot ?? ''} ?`,
                )
              )
                appliquer.mutate()
            }}
          >
            Appliquer l'adresse du lot
          </Button>
        </div>
      )}
      {message && <p className="text-[12px] text-[var(--muted)]">{message}</p>}
      <ErreurMutation erreur={enregistrer.error ?? appliquer.error} />
    </div>
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

// ---------------------------------------------------------------------------
// Export CSV de l'opération (BTN_Exporter — fichier d'interface
// REQ_InterfaceCommercialisation_Lot, toutes tranches confondues)
// ---------------------------------------------------------------------------

function BoutonExporter({ operationId }: { operationId: number }) {
  const restreint = useDroitsComm()
  const exporter = useMutation({
    mutationFn: () => getExportCommFn({ data: { operationId } }),
    onSuccess: (r) => telechargerCsv(r.nomFichier, r.csv),
  })
  if (restreint('BTN_Exporter')) return null
  return (
    <span className="ml-auto flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => exporter.mutate()}
        disabled={exporter.isPending}
        title="Exporter la commercialisation de l'opération (toutes tranches) en CSV"
      >
        {exporter.isPending ? 'Export en cours…' : 'Exporter'}
      </Button>
      {exporter.isError && (
        <span className="text-[12px] text-[var(--danger)]">
          Export impossible.
        </span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Propagation tranche → lots (adresse, date de livraison) — BTN_Propager_*
// ---------------------------------------------------------------------------

function Propagation({
  tranche,
  onDone,
}: {
  tranche:
    | NonNullable<
        Awaited<ReturnType<typeof getOperationCommFn>>
      >['tranches'][number]
    | undefined
  onDone: () => void
}) {
  const { lectureSeule } = Route.useRouteContext()
  const restreint = useDroitsComm()
  const [modale, setModale] = useState<
    'adresse' | 'date' | 'adresseTranche' | null
  >(null)
  const [adresse, setAdresse] = useState('')
  const [remplacerNonVides, setRemplacerNonVides] = useState(false)
  const [date, setDate] = useState<string | null>(null)
  const [resultat, setResultat] = useState<string | null>(null)

  const propagerAdresse = useMutation({
    mutationFn: () =>
      propagerAdresseFn({
        data: { trancheId: tranche!.id, adresse, remplacerNonVides },
      }),
    onSuccess: (r) => {
      setResultat(`Adresse propagée à ${r.modifies} lot(s).`)
      setModale(null)
      onDone()
    },
  })
  const propagerDate = useMutation({
    mutationFn: () =>
      propagerDateLivraisonFn({
        data: { trancheId: tranche!.id, date: date! },
      }),
    onSuccess: (r) => {
      setResultat(`Date de livraison propagée à ${r.modifies} réservation(s).`)
      setModale(null)
      onDone()
    },
  })
  const modifierAdresse = useMutation({
    mutationFn: () =>
      updateTrancheAdresseFn({
        data: { trancheId: tranche!.id, adresse },
      }),
    onSuccess: () => {
      setResultat('Adresse de la tranche enregistrée.')
      setModale(null)
      onDone()
    },
  })

  const peutPropager = !restreint('BTN_Propager_aux_lots')
  const peutModifierAdresse = !restreint('BTN_Modifier_adresse_tranche')
  if (lectureSeule || !tranche || (!peutPropager && !peutModifierAdresse))
    return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {peutPropager && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setAdresse(tranche.adresse ?? '')
              setRemplacerNonVides(false)
              propagerAdresse.reset()
              setModale('adresse')
            }}
          >
            Propager l'adresse aux lots
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDate(versInputDate(tranche.dateLivraisonContractuelle))
              propagerDate.reset()
              setModale('date')
            }}
          >
            Propager la date de livraison
          </Button>
        </>
      )}
      {peutModifierAdresse && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setAdresse(tranche.adresse ?? '')
            modifierAdresse.reset()
            setModale('adresseTranche')
          }}
        >
          Modifier l'adresse de la tranche
        </Button>
      )}
      {resultat && (
        <span className="text-[12px] text-[var(--muted)]">{resultat}</span>
      )}

      <Dialog
        open={modale === 'adresse'}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Propager l'adresse de la tranche aux lots</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              propagerAdresse.mutate()
            }}
          >
            <div className="grid gap-3">
              <ChampTexte
                libelle="Adresse à propager"
                value={adresse}
                onChange={setAdresse}
              />
              <ChampBascule
                libelle="Remplacer aussi les adresses de lot déjà renseignées"
                checked={remplacerNonVides}
                onChange={setRemplacerNonVides}
              />
              <p className="text-[12px] text-[var(--muted)]">
                Les lots investisseurs (INVEST, INV PLS, INV NP) ne sont pas
                modifiés.
              </p>
            </div>
            <ErreurMutation erreur={propagerAdresse.error} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" size="sm" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={propagerAdresse.isPending}
              >
                Propager
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modale === 'date'}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Propager la date de livraison aux lots</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (date) propagerDate.mutate()
            }}
          >
            <div className="grid gap-3">
              <ChampDate
                libelle="Date de livraison"
                value={date}
                onChange={setDate}
              />
              <p className="text-[12px] text-[var(--muted)]">
                Les dates de livraison déjà renseignées ne sont pas remplacées
                (iso-WinDev) ; lots investisseurs exclus.
              </p>
            </div>
            <ErreurMutation erreur={propagerDate.error} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" size="sm" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={!date || propagerDate.isPending}
              >
                Propager
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FEN_Fiche_Tranche_Adresse : un seul champ, l'adresse de la tranche */}
      <Dialog
        open={modale === 'adresseTranche'}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'adresse de la tranche</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              modifierAdresse.mutate()
            }}
          >
            <div className="grid gap-3">
              <ChampTexte
                libelle="Adresse"
                value={adresse}
                onChange={setAdresse}
              />
            </div>
            <ErreurMutation erreur={modifierAdresse.error} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" size="sm" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={modifierAdresse.isPending}
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modale « Réserver / Modifier » (FEN_Fiche_Commercialisation)
// ---------------------------------------------------------------------------

interface EntreeComm {
  id?: number
  lotId: number
  acquereurId: number | null
  natureAchatId: number | null
  dateResa: string | null
  montantDepotGarantie: number | null
  livraisonTrimestrePrevuContrat: string | null
  prestataireComm1Id: number | null
  prestataireComm2Id: number | null
  moyenPaiementId: number | null
  prixVenteReelTtc: number | null
  /** saisi en %, converti en fraction à l'enregistrement */
  tauxTvaReel: number | null
  prixVenteReelHt: number | null
  remiseClientTtc: number | null
  dateDemandeAgrement: string | null
  dateAgrementObtenu: string | null
  dateReceptionCourrierLvo: string | null
  avecHonoraireCourtage: boolean | null
  montantHonoCourtageClient: number | null
  montantHonoCourtageBanque: number | null
  banqueCourtageId: number | null
  avecSouscriptionCapitalKpi: boolean | null
  pasDeSouscriptionCapital: boolean | null
  dateSouscription: string | null
  commentairesSouscription: string | null
  estReventeBien: boolean | null
  dateButoirRevente: string | null
  avecClauseParticuliere: boolean | null
  motifClauseParticuliereId: number | null
  commentaireClauseParticuliere: string | null
  estJustifFiscal: boolean | null
  estFiscalite: boolean | null
  commFisca: string | null
  fiscaliteAcquereurId: number | null
  dateSignatureContratLoc: string | null
  loyer: number | null
  epargne: number | null
  datePrevueSignatureActe: string | null
  dateSignatureComm: string | null
  dateSignatureActeVefa: string | null
  dateLeveeOption: string | null
  pasAideRm: boolean | null
  montantSubv: number | null
  montantSubvAcpte: number | null
  soldeDemande: boolean | null
}

// Table de sélection d'un acquéreur (équivalent FEN_RechercheAcquereur) :
// le combo classique gèle avec ~3 000 entrées, ici recherche + liste bornée
function ModaleChoixAcquereur({
  open,
  onOpenChange,
  options,
  onChoisir,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  options: Array<{ id: number; libelle: string | null }>
  onChoisir: (id: number) => void
}) {
  const [filtre, setFiltre] = useState('')
  useEffect(() => {
    if (open) setFiltre('')
  }, [open])
  const cherche = filtre.trim().toLowerCase()
  const trouves = cherche
    ? options.filter((o) => (o.libelle ?? '').toLowerCase().includes(cherche))
    : options
  const visibles = trouves.slice(0, 100)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choisir un acquéreur</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Rechercher un acquéreur…"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="h-9 text-[13px]"
        />
        <div className="max-h-[50vh] overflow-y-auto rounded-md border border-[var(--line-soft)]">
          {visibles.map((o) => (
            <button
              type="button"
              key={o.id}
              className="block w-full border-b border-[var(--line-soft)] px-3 py-1.5 text-left text-[13px] last:border-b-0 hover:bg-[var(--gold-tint)]"
              onClick={() => {
                onChoisir(o.id)
                onOpenChange(false)
              }}
            >
              {o.libelle || '—'}
            </button>
          ))}
          {visibles.length === 0 && (
            <p className="px-3 py-2 text-[13px] text-[var(--muted)]">
              Aucun acquéreur trouvé.
            </p>
          )}
        </div>
        <p className="text-[12px] text-[var(--muted)]">
          {trouves.length} acquéreur(s)
          {trouves.length > visibles.length
            ? ` — ${visibles.length} affichés, affinez la recherche`
            : ''}
        </p>
      </DialogContent>
    </Dialog>
  )
}

// Section de la modale portant le nom d'un onglet du détail : mise en
// évidence (fond doré + défilement) quand la modale s'ouvre depuis « Modifier »
// avec cet onglet actif
function SectionOnglet({
  titre,
  actif,
  children,
}: {
  titre: string
  actif: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // après le montage du contenu Radix, sinon le scroll est perdu
    if (actif)
      setTimeout(() => ref.current?.scrollIntoView({ block: 'center' }), 0)
  }, [actif])
  return (
    <div
      ref={ref}
      className={`grid gap-3 sm:col-span-2 sm:grid-cols-2 ${
        actif
          ? 'rounded-lg bg-[var(--gold-tint)] p-3 ring-1 ring-[var(--gold)]'
          : ''
      }`}
    >
      <SousTitre>{titre}</SousTitre>
      {children}
    </div>
  )
}

function ModaleCommercialisation({
  lotId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
  ongletActif,
  onDone,
}: {
  lotId: number
  /** null = Réserver (création) */
  ligne: LigneComm | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
  /** onglet du détail actif à l'ouverture — met en évidence la section homonyme */
  ongletActif?: Onglet
  onDone: () => void
}) {
  const vide: EntreeComm = {
    lotId,
    acquereurId: null,
    natureAchatId: null,
    dateResa: null,
    montantDepotGarantie: null,
    livraisonTrimestrePrevuContrat: null,
    prestataireComm1Id: null,
    prestataireComm2Id: null,
    moyenPaiementId: null,
    prixVenteReelTtc: null,
    tauxTvaReel: null,
    prixVenteReelHt: null,
    remiseClientTtc: null,
    dateDemandeAgrement: null,
    dateAgrementObtenu: null,
    dateReceptionCourrierLvo: null,
    avecHonoraireCourtage: null,
    montantHonoCourtageClient: null,
    montantHonoCourtageBanque: null,
    banqueCourtageId: null,
    avecSouscriptionCapitalKpi: null,
    pasDeSouscriptionCapital: null,
    dateSouscription: null,
    commentairesSouscription: null,
    estReventeBien: null,
    dateButoirRevente: null,
    avecClauseParticuliere: null,
    motifClauseParticuliereId: null,
    commentaireClauseParticuliere: null,
    estJustifFiscal: null,
    estFiscalite: null,
    commFisca: null,
    fiscaliteAcquereurId: null,
    dateSignatureContratLoc: null,
    loyer: null,
    epargne: null,
    datePrevueSignatureActe: null,
    dateSignatureComm: null,
    dateSignatureActeVefa: null,
    dateLeveeOption: null,
    pasAideRm: null,
    montantSubv: null,
    montantSubvAcpte: null,
    soldeDemande: null,
  }
  const depuisLigne = (l: LigneComm): EntreeComm => ({
    lotId,
    acquereurId: l.acquereurId,
    natureAchatId: l.natureAchatId,
    dateResa: versInputDate(l.dateResa),
    montantDepotGarantie: l.montantDepotGarantie,
    livraisonTrimestrePrevuContrat: l.livraisonTrimestrePrevuContrat,
    prestataireComm1Id: l.prestataireComm1Id,
    prestataireComm2Id: l.prestataireComm2Id,
    moyenPaiementId: l.moyenPaiementId,
    prixVenteReelTtc: l.prixVenteReelTtc,
    tauxTvaReel: enPourcent(l.tauxTvaReel),
    prixVenteReelHt: l.prixVenteReelHt,
    remiseClientTtc: l.remiseClientTtc,
    dateDemandeAgrement: versInputDate(l.dateDemandeAgrement),
    dateAgrementObtenu: versInputDate(l.dateAgrementObtenu),
    dateReceptionCourrierLvo: versInputDate(l.dateReceptionCourrierLvo),
    avecHonoraireCourtage: l.avecHonoraireCourtage,
    montantHonoCourtageClient: l.montantHonoCourtageClient,
    montantHonoCourtageBanque: l.montantHonoCourtageBanque,
    banqueCourtageId: l.banqueCourtageId,
    avecSouscriptionCapitalKpi: l.avecSouscriptionCapitalKpi,
    pasDeSouscriptionCapital: l.pasDeSouscriptionCapital,
    dateSouscription: versInputDate(l.dateSouscription),
    commentairesSouscription: l.commentairesSouscription,
    estReventeBien: l.estReventeBien == null ? null : !!l.estReventeBien,
    dateButoirRevente: versInputDate(l.dateButoirRevente),
    avecClauseParticuliere:
      l.avecClauseParticuliere == null ? null : !!l.avecClauseParticuliere,
    motifClauseParticuliereId: l.motifClauseParticuliereId,
    commentaireClauseParticuliere: l.commentaireClauseParticuliere,
    estJustifFiscal: l.estJustifFiscal,
    estFiscalite: l.estFiscalite,
    commFisca: l.commFisca,
    fiscaliteAcquereurId: l.fiscaliteAcquereurId,
    dateSignatureContratLoc: versInputDate(l.dateSignatureContratLoc),
    loyer: l.loyer,
    epargne: l.epargne,
    datePrevueSignatureActe: versInputDate(l.datePrevueSignatureActe),
    dateSignatureComm: l.dateSignatureComm,
    dateSignatureActeVefa: versInputDate(l.dateSignatureActeVefa),
    dateLeveeOption: versInputDate(l.dateLeveeOption),
    pasAideRm: l.pasAideRm,
    montantSubv: l.montantSubv,
    montantSubvAcpte: l.montantSubvAcpte,
    soldeDemande: l.soldeDemande,
  })
  const [valeurs, setValeurs] = useState<EntreeComm>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const [choixAcquereur, setChoixAcquereur] = useState(false)
  const enregistrer = useMutation({
    mutationFn: (v: EntreeComm) =>
      saveCommercialisationFn({
        data: { ...v, tauxTvaReel: enFraction(v.tauxTvaReel) },
      }),
    onSuccess: () => {
      onDone()
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
    <TCle extends keyof EntreeComm>(k: TCle) =>
    (v: EntreeComm[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la réservation' : 'Réserver le lot'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SousTitre>Réservation</SousTitre>
            {ligne ? (
              // acquéreur non modifiable sur une réservation existante :
              // libellé seul (changement d'acquéreur = annulation + nouvelle
              // résa, comme dans WinDev)
              <ChampForm libelle="Acquéreur">
                <p className="flex h-9 items-center text-[13px] text-[var(--ink)]">
                  {ligne.acquereur ?? '—'}
                </p>
              </ChampForm>
            ) : (
              // pas de combo (~3 000 entrées) : libellé + table de recherche,
              // comme FEN_RechercheAcquereur dans WinDev
              <ChampForm libelle="Acquéreur">
                <div className="flex h-9 items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">
                    {nomenclatures?.acquereurs.find(
                      (o) => o.id === valeurs.acquereurId,
                    )?.libelle ?? '—'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setChoixAcquereur(true)}
                  >
                    Choisir…
                  </Button>
                </div>
              </ChampForm>
            )}
            <ChampSelectId
              libelle="Nature achat"
              value={valeurs.natureAchatId}
              onChange={set('natureAchatId')}
              options={nomenclatures?.naturesAchat ?? []}
            />
            <ChampDate
              libelle="Date de réservation"
              value={valeurs.dateResa}
              onChange={set('dateResa')}
            />
            <ChampNombre
              libelle="Montant dépôt de garantie"
              value={valeurs.montantDepotGarantie}
              onChange={set('montantDepotGarantie')}
            />
            <ChampTexte
              libelle="Trimestre de livraison prévu au contrat"
              value={valeurs.livraisonTrimestrePrevuContrat ?? ''}
              onChange={(v) => set('livraisonTrimestrePrevuContrat')(v || null)}
            />
            <ChampSelectId
              libelle="Moyen de paiement"
              value={valeurs.moyenPaiementId}
              onChange={set('moyenPaiementId')}
              options={nomenclatures?.moyensPaiement ?? []}
            />
            <ChampSelectId
              libelle="Prestataire comm 1"
              value={valeurs.prestataireComm1Id}
              onChange={set('prestataireComm1Id')}
              options={nomenclatures?.prestataires ?? []}
            />
            <ChampSelectId
              libelle="Prestataire comm 2"
              value={valeurs.prestataireComm2Id}
              onChange={set('prestataireComm2Id')}
              options={nomenclatures?.prestataires ?? []}
            />
            <SousTitre>Prix</SousTitre>
            <ChampNombre
              libelle="Prix de vente réel TTC"
              value={valeurs.prixVenteReelTtc}
              onChange={set('prixVenteReelTtc')}
            />
            <ChampNombre
              libelle="Taux TVA réel (%)"
              value={valeurs.tauxTvaReel}
              onChange={set('tauxTvaReel')}
            />
            <ChampNombre
              libelle="Prix de vente réel HT"
              value={valeurs.prixVenteReelHt}
              onChange={set('prixVenteReelHt')}
            />
            <ChampNombre
              libelle="Remise client TTC"
              value={valeurs.remiseClientTtc}
              onChange={set('remiseClientTtc')}
            />
            <SousTitre>Agrément</SousTitre>
            <ChampDate
              libelle="Demande d'agrément"
              value={valeurs.dateDemandeAgrement}
              onChange={set('dateDemandeAgrement')}
            />
            <ChampDate
              libelle="Agrément obtenu et envoi notaire"
              value={valeurs.dateAgrementObtenu}
              onChange={set('dateAgrementObtenu')}
            />
            <ChampDate
              libelle="Réception courrier LVO"
              value={valeurs.dateReceptionCourrierLvo}
              onChange={set('dateReceptionCourrierLvo')}
            />
            <SousTitre>Honoraires de courtage</SousTitre>
            <ChampBascule
              libelle="Avec honoraires de courtage"
              checked={!!valeurs.avecHonoraireCourtage}
              onChange={set('avecHonoraireCourtage')}
            />
            <ChampSelectId
              libelle="Banque de courtage"
              value={valeurs.banqueCourtageId}
              onChange={set('banqueCourtageId')}
              options={nomenclatures?.banquesCourtage ?? []}
            />
            <ChampNombre
              libelle="Montant honoraires client"
              value={valeurs.montantHonoCourtageClient}
              onChange={set('montantHonoCourtageClient')}
            />
            <ChampNombre
              libelle="Montant honoraires banque"
              value={valeurs.montantHonoCourtageBanque}
              onChange={set('montantHonoCourtageBanque')}
            />
            <SousTitre>Souscription au capital</SousTitre>
            <ChampBascule
              libelle="Avec souscription capital KPI"
              checked={!!valeurs.avecSouscriptionCapitalKpi}
              onChange={set('avecSouscriptionCapitalKpi')}
            />
            <ChampBascule
              libelle="Pas de souscription au capital"
              checked={!!valeurs.pasDeSouscriptionCapital}
              onChange={set('pasDeSouscriptionCapital')}
            />
            <ChampDate
              libelle="Date souscription"
              value={valeurs.dateSouscription}
              onChange={set('dateSouscription')}
            />
            <ChampTexte
              libelle="Commentaires souscription"
              value={valeurs.commentairesSouscription ?? ''}
              onChange={(v) => set('commentairesSouscription')(v || null)}
            />
            <SousTitre>Revente et clause particulière</SousTitre>
            <ChampBascule
              libelle="Est une revente de bien"
              checked={!!valeurs.estReventeBien}
              onChange={set('estReventeBien')}
            />
            <ChampDate
              libelle="Date butoir revente"
              value={valeurs.dateButoirRevente}
              onChange={set('dateButoirRevente')}
            />
            <ChampBascule
              libelle="Avec clause particulière"
              checked={!!valeurs.avecClauseParticuliere}
              onChange={set('avecClauseParticuliere')}
            />
            <ChampSelectId
              libelle="Motif clause particulière"
              value={valeurs.motifClauseParticuliereId}
              onChange={set('motifClauseParticuliereId')}
              options={nomenclatures?.motifsClause ?? []}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires commercialisation"
                value={valeurs.commentaireClauseParticuliere ?? ''}
                onChange={(v) =>
                  set('commentaireClauseParticuliere')(v || null)
                }
              />
            </div>
            {/* zones jaunes WinDev : saisies en ligne dans la table, ici en
                sections homonymes des onglets */}
            <SectionOnglet
              titre="Fiscalité"
              actif={ligne != null && ongletActif === 'Fiscalité'}
            >
              <ChampBascule
                libelle="Justif fiscal ?"
                checked={!!valeurs.estJustifFiscal}
                onChange={set('estJustifFiscal')}
              />
              <ChampBascule
                libelle="Fiscalité ?"
                checked={!!valeurs.estFiscalite}
                onChange={set('estFiscalite')}
              />
              <ChampTexte
                libelle="Comm Fisca"
                value={valeurs.commFisca ?? ''}
                onChange={(v) => set('commFisca')(v || null)}
              />
              <ChampSelectId
                libelle="Fiscalité acquéreur"
                value={valeurs.fiscaliteAcquereurId}
                onChange={set('fiscaliteAcquereurId')}
                options={nomenclatures?.fiscalitesAcquereur ?? []}
              />
            </SectionOnglet>
            <SectionOnglet
              titre="Contrat Loc. Accession"
              actif={ligne != null && ongletActif === 'Contrat Loc. Accession'}
            >
              <ChampDate
                libelle="Date signature contrat loc"
                value={valeurs.dateSignatureContratLoc}
                onChange={set('dateSignatureContratLoc')}
              />
              <ChampNombre
                libelle="Loyer"
                value={valeurs.loyer}
                onChange={set('loyer')}
              />
              <ChampNombre
                libelle="Epargne"
                value={valeurs.epargne}
                onChange={set('epargne')}
              />
            </SectionOnglet>
            <SectionOnglet
              titre="Prév. signature actes"
              actif={ligne != null && ongletActif === 'Prév. signature actes'}
            >
              <ChampDate
                libelle="Date prévue signature acte"
                value={valeurs.datePrevueSignatureActe}
                onChange={set('datePrevueSignatureActe')}
              />
              <ChampTexte
                libelle="Commentaire"
                value={valeurs.dateSignatureComm ?? ''}
                onChange={(v) => set('dateSignatureComm')(v || null)}
              />
            </SectionOnglet>
            <SectionOnglet
              titre="Actes"
              actif={ligne != null && ongletActif === 'Actes'}
            >
              <ChampDate
                libelle="Date signature Acte VEFA"
                value={valeurs.dateSignatureActeVefa}
                onChange={set('dateSignatureActeVefa')}
              />
              <ChampDate
                libelle="Date levée option"
                value={valeurs.dateLeveeOption}
                onChange={set('dateLeveeOption')}
              />
              <ChampBascule
                libelle="Pas d'aide RM"
                checked={!!valeurs.pasAideRm}
                onChange={set('pasAideRm')}
              />
              <ChampBascule
                libelle="Solde demandé"
                checked={!!valeurs.soldeDemande}
                onChange={set('soldeDemande')}
              />
              <ChampNombre
                libelle="Montant subv"
                value={valeurs.montantSubv}
                onChange={set('montantSubv')}
              />
              <ChampNombre
                libelle="Montant subv acompte"
                value={valeurs.montantSubvAcpte}
                onChange={set('montantSubvAcpte')}
              />
            </SectionOnglet>
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
        <ModaleChoixAcquereur
          open={choixAcquereur}
          onOpenChange={setChoixAcquereur}
          options={nomenclatures?.acquereurs ?? []}
          onChoisir={set('acquereurId')}
        />
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modale « Annuler la réservation » (FEN_Commercialisation_Annulation)
// ---------------------------------------------------------------------------

function ModaleAnnulation({
  ligne,
  open,
  onOpenChange,
  onDone,
}: {
  ligne: LigneComm | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const [dateAnnulation, setDateAnnulation] = useState<string | null>(null)
  const [motif, setMotif] = useState('')
  const [commentaire, setCommentaire] = useState('')
  // liste paramétrable (/parametres > Motif annulation) — stockée en libellé
  // (colonne texte, iso legacy où elle n'a jamais été renseignée)
  const motifs = useQuery({
    queryKey: ['nomenclature', 'motifs-annulation'],
    queryFn: () => getNomenclatureFn({ data: { slug: 'motifs-annulation' } }),
    enabled: open,
  })
  const annuler = useMutation({
    mutationFn: () =>
      annulerCommercialisationFn({
        data: {
          id: ligne!.id,
          dateAnnulation: dateAnnulation!,
          motifAnnulation: motif || null,
          annulationCommentaire: commentaire || null,
        },
      }),
    onSuccess: () => {
      onDone()
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setDateAnnulation(new Date().toISOString().slice(0, 10))
      setMotif('')
      setCommentaire('')
      annuler.reset()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Annuler la réservation de {ligne?.acquereur ?? '—'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (dateAnnulation) annuler.mutate()
          }}
        >
          <div className="grid gap-3">
            <ChampDate
              libelle="Date d'annulation"
              value={dateAnnulation}
              onChange={setDateAnnulation}
            />
            <ChampSelectTexte
              libelle="Motif d'annulation"
              value={motif || null}
              onChange={(v) => setMotif(v ?? '')}
              options={(motifs.data ?? []).map((m) => String(m.libelle))}
            />
            <ChampTexteLong
              libelle="Commentaire"
              value={commentaire}
              onChange={setCommentaire}
            />
          </div>
          <ErreurMutation erreur={annuler.error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Fermer
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={!dateAnnulation || annuler.isPending}
            >
              Annuler la réservation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modale « Versement de dépôt de garantie »
// ---------------------------------------------------------------------------

function ModaleVersement({
  commercialisationId,
  ligne,
  open,
  onOpenChange,
  onDone,
}: {
  commercialisationId: number
  /** null = création */
  ligne: LigneVersement | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const [montant, setMontant] = useState<number | null>(null)
  const [dateRemise, setDateRemise] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const enregistrer = useMutation({
    mutationFn: () =>
      saveVersementFn({
        data: {
          id: ligne?.id,
          commercialisationId,
          montantVerse: montant,
          dateRemise,
          commentaire: commentaire || null,
        },
      }),
    onSuccess: () => {
      onDone()
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setMontant(ligne?.montantVerse ?? null)
      setDateRemise(versInputDate(ligne?.dateRemise) ?? null)
      setCommentaire(ligne?.commentaire ?? '')
      enregistrer.reset()
    }
  }, [open, ligne])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le versement' : 'Nouveau versement'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampNombre
              libelle="Montant versé"
              value={montant}
              onChange={setMontant}
            />
            <ChampDate
              libelle="Date de remise"
              value={dateRemise}
              onChange={setDateRemise}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaire"
                value={commentaire}
                onChange={setCommentaire}
              />
            </div>
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
