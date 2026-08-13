// Module Déclarations (FEN_Declaration, phase 8) — volet Opérations à gauche
// (masquage comptable, pattern compta.tsx), sélecteur de tranche, trois
// accordéons : Assurance DO/MRH, SGA, Déclaration 940 & LASM. CRUD par
// modales (champs partagés ChampsModale).
// Captures : migration_windev/captures_ecrans/Declaration_*.png.
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import {
  BoutonsTable,
  ChampBascule,
  ChampDate,
  ChampNombre,
  ChampSelectId,
  ChampSelectTexte,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
  versInputDate,
} from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import SelecteurTranche from '#/components/SelecteurTranche'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { getOperationCommFn } from '#/lib/commercialisation.ts'
import {
  deleteAssuranceFn,
  deleteDeclaration940Fn,
  deleteSgaFn,
  getDeclarationsFn,
  getDeclarationsNomenclaturesFn,
  saveAssuranceFn,
  saveDeclaration940Fn,
  saveSgaFn,
} from '#/lib/declarations.ts'
import {
  selectionARejouer,
  useMemoriserSelection,
  usePref,
} from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheDeclarations {
  op?: number
  tranche?: number
}

export const Route = createFileRoute('/_authed/declarations')({
  validateSearch: (s: Record<string, unknown>): RechercheDeclarations => ({
    op: s.op ? Number(s.op) : undefined,
    tranche: s.tranche ? Number(s.tranche) : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('declarations')) throw redirect({ to: '/' })
    // même fil conducteur que /operations, cf. le commentaire de
    // selectionARejouer pour la garde contre la boucle de redirection.
    const selection = selectionARejouer(context.prefs, search.op)
    if (selection) throw redirect({ to: '/declarations', search: selection })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageDeclarations,
})

type Declarations = Awaited<ReturnType<typeof getDeclarationsFn>>
type LigneAssurance = Declarations['assurances'][number]
type LigneSga = Declarations['sgas'][number]
type Ligne940 = Declarations['declarations940'][number]
type Nomenclatures = Awaited<ReturnType<typeof getDeclarationsNomenclaturesFn>>

// valeurs observées dans le legacy (combo WinDev en saisie libre restreinte)
const TYPES_CONTRAT = [
  'DO',
  'CNR',
  'TRC',
  'TRC Prolongation',
  'MRH',
  'DO+CNR',
  'DO+CNR+TRC',
] as const

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
const colEntier = <T,>(
  id: string,
  header: string,
  size = 90,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">{c.getValue() ?? '—'}</span>
  ),
})
const colCheck = <T,>(
  id: string,
  header: string,
  size = 100,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-center">{c.getValue() ? '✓' : '—'}</span>
  ),
})

// ---------------------------------------------------------------------------
// Page (volet Opérations + tranche, pattern compta.tsx)
// ---------------------------------------------------------------------------

function PageDeclarations() {
  const { op, tranche } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const fiche = useQuery({
    queryKey: ['operation-comm', op],
    queryFn: () => getOperationCommFn({ data: { operationId: op! } }),
    enabled: op != null,
  })
  const d = fiche.data
  // à défaut de tranche dans l'URL — ou si celle demandée n'existe plus après
  // un réimport .bak — la première tranche de l'opération
  const trancheActive = (
    d?.tranches.find((t) => t.id === tranche) ?? d?.tranches[0]
  )?.id
  // l'URL fait foi : un lien partagé `?op=99` devient la sélection mémorisée
  useMemoriserSelection(op, trancheActive)

  return (
    <div className="flex h-[calc(100vh-61px)] items-stretch">
      <PanneauOperations
        selectedId={op ?? null}
        onSelect={(id) => void navigate({ search: { op: id } })}
        masquerFlag="masquerComptable"
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7">
        {op == null ? (
          <div className="island-shell rounded-xl px-8 py-12 text-center">
            <p className="island-kicker mb-2">Déclarations</p>
            <p className="text-[15px] text-[var(--muted)]">
              Sélectionnez une opération dans la liste de gauche.
            </p>
          </div>
        ) : !d ? (
          <p className="text-[13px] text-[var(--muted)]">
            {fiche.isLoading ? 'Chargement…' : 'Opération introuvable.'}
          </p>
        ) : (
          <>
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
              <h1 className="text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
                {d.libelle}
                {d.commune ? ` — ${d.commune}` : ''}
              </h1>
            </div>

            <div className="mb-4 shrink-0">
              <SelecteurTranche
                tranches={d.tranches}
                value={trancheActive}
                onChange={(id) =>
                  void navigate({ search: { op, tranche: id } })
                }
              />
            </div>

            {trancheActive != null && (
              <OngletsDeclarations
                key={trancheActive}
                trancheId={trancheActive}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Accordéons WinDev → onglets
// ---------------------------------------------------------------------------

const ACCORDEONS = [
  'Assurance DO/MRH',
  'SGA',
  'Déclaration 940 & LASM',
] as const
type Accordeon = (typeof ACCORDEONS)[number]

const COLONNES_ASSURANCE: Array<ColumnDef<LigneAssurance, any>> = [
  colTexte('numContrat', 'Numéro contrat', 140),
  colTexte('typeContrat', 'Type contrat', 130),
  colDate('dateSouscription', 'Date souscription', 140),
  colDate('dateDgd', 'Date DGD', 110),
  colDate('dateResiliation', 'Date résiliation', 130),
  colDate('dateFinTrc', 'Date fin TRC', 120),
  colTexte('accordCadre', 'Accord cadre', 160),
  colEuro('coutOperation', 'Coût opération', 130),
  colEuro('montantCotisation', 'Montant cotisation', 140),
  colTexte('commentaire', 'Commentaire', 220),
  colCheck('surOpe', 'Sur opération ?', 120),
]

const COLONNES_SGA: Array<ColumnDef<LigneSga, any>> = [
  colEntier('numFiche', 'Numéro de fiche', 120),
  colCheck('estPsla', 'Est PSLA ?', 100),
  colDate('dateCreation', 'Date création', 120),
  colDate('dateSortie', 'Date sortie', 120),
  colEuro('prixTerrainHt', 'Prix terrain HT', 130),
  colEuro('prixFraisAnnexeHt', 'Prix frais annexe HT', 150),
  colEuro('prixRevientBudget', 'Prix revient budget', 150),
  colEuro('prixVenteBudget', 'Prix vente budget', 140),
  colTexte('budget', 'Budget', 160),
  colTexte('commentaire', 'Commentaire', 200),
  {
    accessorKey: 'surfaceUtile',
    header: 'Surface utile',
    size: 110,
    cell: (c) => {
      const v = c.getValue<number | null>()
      return (
        <span className="block text-right tabular-nums">
          {v != null
            ? v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
            : '—'}
        </span>
      )
    },
  },
]

const COLONNES_940: Array<ColumnDef<Ligne940, any>> = [
  colDate('date940', 'Date 940', 110),
  colEntier('stockLogtDat', 'Stock logt DAT', 120),
  colDate('dateTvaLasm', 'Date TVA LASM', 130),
  colCheck('surOpe', 'Sur opération ?', 120),
  colCheck('finSuivi', 'Fin suivi ?', 100),
  colTexte('commentaires', 'Commentaires', 300),
]

function OngletsDeclarations({ trancheId }: { trancheId: number }) {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [accordeonStocke, setAccordeon] = usePref<Accordeon>(
    'onglet:declarations',
    ACCORDEONS[0],
  )
  // un onglet renommé depuis l'enregistrement ne doit pas laisser la page vide
  const accordeon = ACCORDEONS.includes(accordeonStocke)
    ? accordeonStocke
    : ACCORDEONS[0]

  const declarations = useQuery({
    queryKey: ['declarations', trancheId],
    queryFn: () => getDeclarationsFn({ data: { trancheId } }),
  })
  const nomenclatures = useQuery({
    queryKey: ['declarations-nomenclatures'],
    queryFn: () => getDeclarationsNomenclaturesFn(),
    staleTime: 60_000,
  })

  const [assuranceSel, setAssuranceSel] = useState<number | null>(null)
  const [assuranceModale, setAssuranceModale] = useState<
    'creation' | LigneAssurance | null
  >(null)
  const [sgaSel, setSgaSel] = useState<number | null>(null)
  const [sgaModale, setSgaModale] = useState<'creation' | LigneSga | null>(null)
  const [d940Sel, setD940Sel] = useState<number | null>(null)
  const [d940Modale, setD940Modale] = useState<'creation' | Ligne940 | null>(
    null,
  )

  const invalider = () =>
    void queryClient.invalidateQueries({
      queryKey: ['declarations', trancheId],
    })
  const supprimerAssurance = useMutation({
    mutationFn: (id: number) => deleteAssuranceFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setAssuranceSel(null)
    },
  })
  const supprimerSga = useMutation({
    mutationFn: (id: number) => deleteSgaFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setSgaSel(null)
    },
  })
  const supprimer940 = useMutation({
    mutationFn: (id: number) => deleteDeclaration940Fn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setD940Sel(null)
    },
  })

  const d = declarations.data
  if (declarations.isLoading)
    return <p className="text-[13px] text-[var(--muted)]">Chargement…</p>
  if (!d) return null

  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <Onglets onglets={ACCORDEONS} actif={accordeon} onChange={setAccordeon} />

      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {accordeon === 'Assurance DO/MRH' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {!lectureSeule && (
              <BoutonsTable
                selection={assuranceSel}
                onNouveau={() => setAssuranceModale('creation')}
                onModifier={() => {
                  const l = d.assurances.find((x) => x.id === assuranceSel)
                  if (l) setAssuranceModale(l)
                }}
                onSupprimer={() => {
                  if (assuranceSel != null)
                    supprimerAssurance.mutate(assuranceSel)
                }}
                confirmation="Supprimer ce contrat d'assurance ?"
              />
            )}
            <ErreurMutation erreur={supprimerAssurance.error} />
            <DataTable
              id="declarations-assurance"
              columns={COLONNES_ASSURANCE}
              data={d.assurances}
              unite="contrats"
              getRowId={(r) => String(r.id)}
              selectedRowId={assuranceSel != null ? String(assuranceSel) : null}
              onRowClick={(r) => setAssuranceSel(r.id)}
              emptyText="Aucun contrat d'assurance."
            />
          </div>
        )}

        {accordeon === 'SGA' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {!lectureSeule && (
              <BoutonsTable
                selection={sgaSel}
                onNouveau={() => setSgaModale('creation')}
                onModifier={() => {
                  const l = d.sgas.find((x) => x.id === sgaSel)
                  if (l) setSgaModale(l)
                }}
                onSupprimer={() => {
                  if (sgaSel != null) supprimerSga.mutate(sgaSel)
                }}
                confirmation="Supprimer cette fiche SGA ?"
              />
            )}
            <ErreurMutation erreur={supprimerSga.error} />
            <DataTable
              id="declarations-sga"
              columns={COLONNES_SGA}
              data={d.sgas}
              unite="fiches"
              getRowId={(r) => String(r.id)}
              selectedRowId={sgaSel != null ? String(sgaSel) : null}
              onRowClick={(r) => setSgaSel(r.id)}
              emptyText="Aucune fiche SGA."
            />
          </div>
        )}

        {accordeon === 'Déclaration 940 & LASM' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {!lectureSeule && (
              <BoutonsTable
                selection={d940Sel}
                onNouveau={() => setD940Modale('creation')}
                onModifier={() => {
                  const l = d.declarations940.find((x) => x.id === d940Sel)
                  if (l) setD940Modale(l)
                }}
                onSupprimer={() => {
                  if (d940Sel != null) supprimer940.mutate(d940Sel)
                }}
                confirmation="Supprimer cette déclaration ?"
              />
            )}
            <ErreurMutation erreur={supprimer940.error} />
            <DataTable
              id="declarations-940"
              columns={COLONNES_940}
              data={d.declarations940}
              unite="déclarations"
              getRowId={(r) => String(r.id)}
              selectedRowId={d940Sel != null ? String(d940Sel) : null}
              onRowClick={(r) => setD940Sel(r.id)}
              emptyText="Aucune déclaration."
            />
          </div>
        )}
      </div>

      <ModaleAssurance
        trancheId={trancheId}
        ligne={assuranceModale === 'creation' ? null : assuranceModale}
        open={assuranceModale != null}
        onOpenChange={(o) => {
          if (!o) setAssuranceModale(null)
        }}
        nomenclatures={nomenclatures.data}
      />
      <ModaleSga
        trancheId={trancheId}
        ligne={sgaModale === 'creation' ? null : sgaModale}
        open={sgaModale != null}
        onOpenChange={(o) => {
          if (!o) setSgaModale(null)
        }}
        nomenclatures={nomenclatures.data}
      />
      <Modale940
        trancheId={trancheId}
        ligne={d940Modale === 'creation' ? null : d940Modale}
        open={d940Modale != null}
        onOpenChange={(o) => {
          if (!o) setD940Modale(null)
        }}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Modale « Assurance DO/MRH »
// ---------------------------------------------------------------------------

interface EntreeAssurance {
  id?: number
  trancheId: number
  numContrat: string | null
  typeContrat: string | null
  dateSouscription: string | null
  dateDgd: string | null
  dateResiliation: string | null
  dateFinTrc: string | null
  accordCadre: string | null
  coutOperation: number | null
  montantCotisation: number | null
  commentaire: string | null
  surOpe: boolean | null
}

function ModaleAssurance({
  trancheId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
}: {
  trancheId: number
  /** null = création */
  ligne: LigneAssurance | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const vide: EntreeAssurance = {
    trancheId,
    numContrat: null,
    typeContrat: null,
    dateSouscription: null,
    dateDgd: null,
    dateResiliation: null,
    dateFinTrc: null,
    accordCadre: null,
    coutOperation: null,
    montantCotisation: null,
    commentaire: null,
    surOpe: null,
  }
  const depuisLigne = (l: LigneAssurance): EntreeAssurance => ({
    trancheId,
    numContrat: l.numContrat,
    typeContrat: l.typeContrat,
    dateSouscription: versInputDate(l.dateSouscription),
    dateDgd: versInputDate(l.dateDgd),
    dateResiliation: versInputDate(l.dateResiliation),
    dateFinTrc: versInputDate(l.dateFinTrc),
    accordCadre: l.accordCadre,
    coutOperation: l.coutOperation,
    montantCotisation: l.montantCotisation,
    commentaire: l.commentaire,
    surOpe: l.surOpe,
  })
  const [valeurs, setValeurs] = useState<EntreeAssurance>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeAssurance) => saveAssuranceFn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['declarations', trancheId],
      })
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
    <TCle extends keyof EntreeAssurance>(k: TCle) =>
    (v: EntreeAssurance[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le contrat' : 'Nouveau contrat'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampTexte
              libelle="Numéro contrat"
              value={valeurs.numContrat ?? ''}
              onChange={(v) => set('numContrat')(v || null)}
            />
            <ChampSelectTexte
              libelle="Type contrat"
              value={valeurs.typeContrat}
              onChange={set('typeContrat')}
              options={TYPES_CONTRAT}
            />
            <ChampDate
              libelle="Date souscription"
              value={valeurs.dateSouscription}
              onChange={set('dateSouscription')}
            />
            <ChampDate
              libelle="Date DGD"
              value={valeurs.dateDgd}
              onChange={set('dateDgd')}
            />
            <ChampDate
              libelle="Date résiliation"
              value={valeurs.dateResiliation}
              onChange={set('dateResiliation')}
            />
            <ChampDate
              libelle="Date fin TRC"
              value={valeurs.dateFinTrc}
              onChange={set('dateFinTrc')}
            />
            <ChampSelectTexte
              libelle="Accord cadre"
              value={valeurs.accordCadre}
              onChange={set('accordCadre')}
              options={(nomenclatures?.accords ?? []).map((a) => a.code)}
            />
            <ChampBascule
              libelle="Sur opération ?"
              checked={!!valeurs.surOpe}
              onChange={set('surOpe')}
            />
            <ChampNombre
              libelle="Coût opération"
              value={valeurs.coutOperation}
              onChange={set('coutOperation')}
            />
            <ChampNombre
              libelle="Montant cotisation"
              value={valeurs.montantCotisation}
              onChange={set('montantCotisation')}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaire"
                value={valeurs.commentaire ?? ''}
                onChange={(v) => set('commentaire')(v || null)}
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

// ---------------------------------------------------------------------------
// Modale « SGA »
// ---------------------------------------------------------------------------

interface EntreeSga {
  id?: number
  trancheId: number
  numFiche: number | null
  estPsla: boolean | null
  dateCreation: string | null
  dateSortie: string | null
  prixTerrainHt: number | null
  prixFraisAnnexeHt: number | null
  prixRevientBudget: number | null
  prixVenteBudget: number | null
  listeBudgetId: number | null
  commentaire: string | null
  surfaceUtile: number | null
}

function ModaleSga({
  trancheId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
}: {
  trancheId: number
  /** null = création */
  ligne: LigneSga | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const vide: EntreeSga = {
    trancheId,
    numFiche: null,
    estPsla: null,
    dateCreation: null,
    dateSortie: null,
    prixTerrainHt: null,
    prixFraisAnnexeHt: null,
    prixRevientBudget: null,
    prixVenteBudget: null,
    listeBudgetId: null,
    commentaire: null,
    surfaceUtile: null,
  }
  const depuisLigne = (l: LigneSga): EntreeSga => ({
    trancheId,
    numFiche: l.numFiche,
    estPsla: l.estPsla,
    dateCreation: versInputDate(l.dateCreation),
    dateSortie: versInputDate(l.dateSortie),
    prixTerrainHt: l.prixTerrainHt,
    prixFraisAnnexeHt: l.prixFraisAnnexeHt,
    prixRevientBudget: l.prixRevientBudget,
    prixVenteBudget: l.prixVenteBudget,
    listeBudgetId: l.listeBudgetId,
    commentaire: l.commentaire,
    surfaceUtile: l.surfaceUtile,
  })
  const [valeurs, setValeurs] = useState<EntreeSga>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeSga) => saveSgaFn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['declarations', trancheId],
      })
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
    <TCle extends keyof EntreeSga>(k: TCle) =>
    (v: EntreeSga[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la fiche SGA' : 'Nouvelle fiche SGA'}
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
              libelle="Numéro de fiche"
              step="1"
              value={valeurs.numFiche}
              onChange={set('numFiche')}
            />
            <ChampBascule
              libelle="Est PSLA ?"
              checked={!!valeurs.estPsla}
              onChange={set('estPsla')}
            />
            <ChampDate
              libelle="Date création"
              value={valeurs.dateCreation}
              onChange={set('dateCreation')}
            />
            <ChampDate
              libelle="Date sortie"
              value={valeurs.dateSortie}
              onChange={set('dateSortie')}
            />
            <ChampNombre
              libelle="Prix terrain HT"
              value={valeurs.prixTerrainHt}
              onChange={set('prixTerrainHt')}
            />
            <ChampNombre
              libelle="Prix frais annexe HT"
              value={valeurs.prixFraisAnnexeHt}
              onChange={set('prixFraisAnnexeHt')}
            />
            <ChampNombre
              libelle="Prix revient budget"
              value={valeurs.prixRevientBudget}
              onChange={set('prixRevientBudget')}
            />
            <ChampNombre
              libelle="Prix vente budget"
              value={valeurs.prixVenteBudget}
              onChange={set('prixVenteBudget')}
            />
            <ChampSelectId
              libelle="Budget"
              value={valeurs.listeBudgetId}
              onChange={set('listeBudgetId')}
              options={nomenclatures?.budgets ?? []}
            />
            <ChampNombre
              libelle="Surface utile"
              value={valeurs.surfaceUtile}
              onChange={set('surfaceUtile')}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaire"
                value={valeurs.commentaire ?? ''}
                onChange={(v) => set('commentaire')(v || null)}
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

// ---------------------------------------------------------------------------
// Modale « Déclaration 940 & LASM »
// ---------------------------------------------------------------------------

interface Entree940 {
  id?: number
  trancheId: number
  date940: string | null
  stockLogtDat: number | null
  dateTvaLasm: string | null
  surOpe: boolean | null
  finSuivi: boolean | null
  commentaires: string | null
}

function Modale940({
  trancheId,
  ligne,
  open,
  onOpenChange,
}: {
  trancheId: number
  /** null = création */
  ligne: Ligne940 | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const vide: Entree940 = {
    trancheId,
    date940: null,
    stockLogtDat: null,
    dateTvaLasm: null,
    surOpe: null,
    finSuivi: null,
    commentaires: null,
  }
  const depuisLigne = (l: Ligne940): Entree940 => ({
    trancheId,
    date940: versInputDate(l.date940),
    stockLogtDat: l.stockLogtDat,
    dateTvaLasm: versInputDate(l.dateTvaLasm),
    surOpe: l.surOpe,
    finSuivi: l.finSuivi,
    commentaires: l.commentaires,
  })
  const [valeurs, setValeurs] = useState<Entree940>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: Entree940) => saveDeclaration940Fn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['declarations', trancheId],
      })
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
    <TCle extends keyof Entree940>(k: TCle) =>
    (v: Entree940[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la déclaration' : 'Nouvelle déclaration'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampDate
              libelle="Date 940"
              value={valeurs.date940}
              onChange={set('date940')}
            />
            <ChampNombre
              libelle="Stock logt DAT"
              step="1"
              value={valeurs.stockLogtDat}
              onChange={set('stockLogtDat')}
            />
            <ChampDate
              libelle="Date TVA LASM"
              value={valeurs.dateTvaLasm}
              onChange={set('dateTvaLasm')}
            />
            <div className="flex flex-col gap-2">
              <ChampBascule
                libelle="Sur opération ?"
                checked={!!valeurs.surOpe}
                onChange={set('surOpe')}
              />
              <ChampBascule
                libelle="Fin suivi ?"
                checked={!!valeurs.finSuivi}
                onChange={set('finSuivi')}
              />
            </div>
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires"
                value={valeurs.commentaires ?? ''}
                onChange={(v) => set('commentaires')(v || null)}
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
