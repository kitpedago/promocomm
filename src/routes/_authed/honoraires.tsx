// Module Honoraires (FEN_TABLE_Honoraire, phase 7) — volet Opérations à
// gauche (masquage comptable, pattern compta.tsx), sélecteur de tranche,
// deux accordéons : Honoraires suivant Convention (missions + grille de
// facturation par stade) et Honoraires de commercialisation (barème par
// nature d'achat + factures). CRUD par modales (champs partagés ChampsModale).
// Captures : migration_windev/captures_ecrans/Honoraires_*.png.
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import {
  BoutonsTable,
  ChampBascule,
  ChampDate,
  ChampNombre,
  ChampSelectId,
  ChampTexteLong,
  ErreurMutation,
  SousTitre,
  versInputDate,
} from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import Scindeur from '#/components/Scindeur'
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
import { totalFacture } from '#/lib/honoraires.helpers.ts'
import {
  deleteFactureFn,
  deleteGrilleFn,
  deleteMissionFn,
  deleteNatureFn,
  getHonorairesFn,
  getHonorairesNomenclaturesFn,
  importerGrilleFn,
  saveFactureFn,
  saveGrilleFn,
  saveMissionFn,
  saveNatureFn,
} from '#/lib/honoraires.ts'
import {
  selectionARejouer,
  useMemoriserSelection,
  usePref,
} from '#/lib/preferences.ts'
import { enFraction, enPourcent } from '#/lib/sccv.helpers.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheHonoraires {
  op?: number
  tranche?: number
}

export const Route = createFileRoute('/_authed/honoraires')({
  validateSearch: (s: Record<string, unknown>): RechercheHonoraires => ({
    op: s.op ? Number(s.op) : undefined,
    tranche: s.tranche ? Number(s.tranche) : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('honoraires')) throw redirect({ to: '/' })
    // même fil conducteur que /operations, cf. le commentaire de
    // selectionARejouer pour la garde contre la boucle de redirection.
    const selection = selectionARejouer(context.prefs, search.op)
    if (selection) throw redirect({ to: '/honoraires', search: selection })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageHonoraires,
})

type Honoraires = Awaited<ReturnType<typeof getHonorairesFn>>
type LigneMission = Honoraires['missions'][number]
type LigneGrille = Honoraires['grilles'][number]
type LigneNature = Honoraires['natures'][number]
type LigneFacture = Honoraires['factures'][number]
type Nomenclatures = Awaited<ReturnType<typeof getHonorairesNomenclaturesFn>>

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
// fractions 0–1 (iso-legacy) affichées en %
const fmtPourc = (v: number | null | undefined) =>
  v != null ? `${(v * 100).toFixed(2).replace('.', ',')} %` : '—'
const colPourc = <T,>(
  id: string,
  header: string,
  size = 100,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">
      {fmtPourc(c.getValue())}
    </span>
  ),
})

// sur-entêtes de groupes colorés (couleurs WinDev transposées vers la charte)
const T_VERT = 'bg-[var(--ok-tint)] text-[var(--ink)]'
const T_BLEU = 'bg-[var(--info-tint)] text-[var(--ink)]'
const T_OR = 'bg-[var(--gold-tint)] text-[var(--gold-ink)]'

const groupe = <T,>(
  header: string,
  classeEntete: string,
  columns: Array<ColumnDef<T, any>>,
): ColumnDef<T, any> => ({
  id: header,
  header,
  meta: { classeEntete },
  columns,
})

// ---------------------------------------------------------------------------
// Page (volet Opérations + tranche, pattern compta.tsx)
// ---------------------------------------------------------------------------

function PageHonoraires() {
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
            <p className="island-kicker mb-2">Honoraires</p>
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
              <OngletsHonoraires
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
  'Honoraires suivant Convention',
  'Honoraires de commercialisation',
] as const
type Accordeon = (typeof ACCORDEONS)[number]

const COLONNES_MISSIONS: Array<ColumnDef<LigneMission, any>> = [
  colDate('dateConvention', 'Date convention', 130),
  colEntier('nbLogement', 'Nb logements', 110),
  colEuro('baseHonoUnitaireHt', 'Base Honoraires Unitaire HT', 180),
  colEuro('baseHonoHt', 'Base Honoraires HT', 150),
  colTexte('typeMission', 'Type de mission', 180),
  colTexte('prestataire', 'Prestataire mission', 160),
  colCheck('finFacturation', 'Fin facturation', 120),
  colEntier('nbMois', 'Nb mois', 90),
  colEntier('ordre', 'Ordre', 80),
  colTexte('commentaire', 'Commentaire', 220),
]
const MISSIONS_MASQUEES = ['nbMois', 'ordre']

const COLONNES_GRILLE: Array<ColumnDef<LigneGrille, any>> = [
  {
    id: 'stade',
    header: 'Stade avancement',
    size: 240,
    accessorFn: (r) =>
      r.stade ? `${r.stade}${r.code ? ` (${r.code})` : ''}` : null,
    cell: (c) => c.getValue() ?? '—',
  },
  colPourc('pourcentage', 'Pourcentage', 110),
  colEuro('montant', 'Montant', 130),
]

const COLONNES_NATURES: Array<ColumnDef<LigneNature, any>> = [
  colTexte('natureAchat', 'Nature achat', 150),
  groupe('Loc. accession', T_VERT, [
    colEuro('montantCla', 'Montant CLA', 130),
    colEuro('montantLeveeOption', 'Montant Levée option', 160),
  ]),
  groupe('VEFA', T_BLEU, [
    colEuro('montantResa', 'Montant réservation', 150),
    colEuro('montantActe', 'Montant Acte', 130),
  ]),
  groupe('Honoraires au %', T_OR, [
    colPourc('pourcentageResa', '% résa', 90),
    colPourc('pourcentageActe', '% acte', 90),
  ]),
  colTexte('commentaires', 'Commentaires', 240),
]

const COLONNES_FACTURES: Array<ColumnDef<LigneFacture, any>> = [
  colEntier('numFacture', 'Numéro de facture', 130),
  colDate('dateFacture', 'Date de facture', 120),
  groupe('Loc accession', T_VERT, [
    colEntier('nbCla', 'Nb CLA', 80),
    colEuro('montantCla', 'Montant CLA', 120),
    colEntier('nbLeveeOption', 'Nb levée option', 110),
    colEuro('montantLeveeOption', 'Montant levée option', 150),
  ]),
  groupe('VEFA', T_BLEU, [
    colEntier('nbResa', 'Nb résa', 80),
    colEuro('montantResa', 'Montant résa', 120),
    colEntier('nbActe', 'Nb acte', 80),
    colEuro('montantActe', 'Montant Acte', 120),
  ]),
  {
    id: 'totalFacture',
    header: 'Total facturé',
    size: 120,
    accessorFn: (r) => totalFacture(r),
    cell: (c) => (
      <span className="block text-right font-semibold tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  colTexte('commentaires', 'Commentaires', 220),
]

function OngletsHonoraires({ trancheId }: { trancheId: number }) {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [accordeonStocke, setAccordeon] = usePref<Accordeon>(
    'onglet:honoraires',
    ACCORDEONS[0],
  )
  // un onglet renommé depuis l'enregistrement ne doit pas laisser la page vide
  const accordeon = ACCORDEONS.includes(accordeonStocke)
    ? accordeonStocke
    : ACCORDEONS[0]

  const honoraires = useQuery({
    queryKey: ['honoraires', trancheId],
    queryFn: () => getHonorairesFn({ data: { trancheId } }),
  })
  const nomenclatures = useQuery({
    queryKey: ['honoraires-nomenclatures'],
    queryFn: () => getHonorairesNomenclaturesFn(),
    staleTime: 60_000,
  })

  const [missionSel, setMissionSel] = useState<number | null>(null)
  const [missionModale, setMissionModale] = useState<
    'creation' | LigneMission | null
  >(null)
  const [grilleSel, setGrilleSel] = useState<number | null>(null)
  const [grilleModale, setGrilleModale] = useState<
    'creation' | LigneGrille | null
  >(null)
  const [natureSel, setNatureSel] = useState<number | null>(null)
  const [natureModale, setNatureModale] = useState<
    'creation' | LigneNature | null
  >(null)
  const [factureSel, setFactureSel] = useState<number | null>(null)
  const [factureModale, setFactureModale] = useState<
    'creation' | LigneFacture | null
  >(null)

  const d = honoraires.data
  // iso-WinDev : la première mission est sélectionnée à l'arrivée (sa grille
  // s'affiche dessous)
  useEffect(() => {
    if (missionSel == null && d?.missions.length)
      setMissionSel(d.missions[0].id)
  }, [d, missionSel])
  const grillesMission = (d?.grilles ?? []).filter(
    (g) => g.missionId === missionSel,
  )

  const invalider = () =>
    void queryClient.invalidateQueries({ queryKey: ['honoraires', trancheId] })
  const supprimerMission = useMutation({
    mutationFn: (id: number) => deleteMissionFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setMissionSel(null)
      setGrilleSel(null)
    },
  })
  const supprimerGrille = useMutation({
    mutationFn: (id: number) => deleteGrilleFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setGrilleSel(null)
    },
  })
  const importerGrille = useMutation({
    mutationFn: (missionId: number) =>
      importerGrilleFn({ data: { missionId } }),
    onSuccess: invalider,
  })
  const supprimerNature = useMutation({
    mutationFn: (id: number) => deleteNatureFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setNatureSel(null)
    },
  })
  const supprimerFacture = useMutation({
    mutationFn: (id: number) => deleteFactureFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setFactureSel(null)
    },
  })

  if (honoraires.isLoading)
    return <p className="text-[13px] text-[var(--muted)]">Chargement…</p>
  if (!d) return null

  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <Onglets onglets={ACCORDEONS} actif={accordeon} onChange={setAccordeon} />

      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {accordeon === 'Honoraires suivant Convention' && (
          <Scindeur
            id="honoraires-convention"
            haut={
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                {!lectureSeule && (
                  <BoutonsTable
                    selection={missionSel}
                    onNouveau={() => setMissionModale('creation')}
                    onModifier={() => {
                      const l = d.missions.find((x) => x.id === missionSel)
                      if (l) setMissionModale(l)
                    }}
                    onSupprimer={() => {
                      if (missionSel != null)
                        supprimerMission.mutate(missionSel)
                    }}
                    confirmation="Supprimer cette mission (et sa grille de facturation) ?"
                  />
                )}
                <ErreurMutation erreur={supprimerMission.error} />
                <DataTable
                  id="honoraires-missions"
                  columns={COLONNES_MISSIONS}
                  data={d.missions}
                  unite="missions"
                  getRowId={(r) => String(r.id)}
                  selectedRowId={missionSel != null ? String(missionSel) : null}
                  onRowClick={(r) => {
                    setMissionSel(r.id)
                    setGrilleSel(null)
                  }}
                  defaultHidden={MISSIONS_MASQUEES}
                  emptyText="Aucune mission."
                />
              </div>
            }
            bas={
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <p className="shrink-0 text-[15px] font-bold text-[var(--ink)]">
                  Grille facturation
                </p>
                {!lectureSeule && missionSel != null && (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <BoutonsTable
                      selection={grilleSel}
                      onNouveau={() => setGrilleModale('creation')}
                      onModifier={() => {
                        const l = grillesMission.find((x) => x.id === grilleSel)
                        if (l) setGrilleModale(l)
                      }}
                      onSupprimer={() => {
                        if (grilleSel != null) supprimerGrille.mutate(grilleSel)
                      }}
                      confirmation="Supprimer cette ligne de grille ?"
                    />
                    {/* iso-WinDev : grisé dès qu'un stade existe pour la mission */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        grillesMission.length > 0 || importerGrille.isPending
                      }
                      onClick={() => importerGrille.mutate(missionSel)}
                      title="Importe les stades d'avancement « Avec hono Gestion » et leur % standard"
                    >
                      Importer
                    </Button>
                  </div>
                )}
                <ErreurMutation
                  erreur={supprimerGrille.error ?? importerGrille.error}
                />
                <DataTable
                  id="honoraires-grille"
                  columns={COLONNES_GRILLE}
                  data={grillesMission}
                  unite="stades"
                  getRowId={(r) => String(r.id)}
                  selectedRowId={grilleSel != null ? String(grilleSel) : null}
                  onRowClick={(r) => setGrilleSel(r.id)}
                  totalFor={['pourcentage', 'montant']}
                  emptyText={
                    missionSel == null
                      ? 'Sélectionnez une mission.'
                      : 'Aucun stade : « Importer » recopie la grille standard.'
                  }
                />
              </div>
            }
          />
        )}

        {accordeon === 'Honoraires de commercialisation' && (
          <Scindeur
            id="honoraires-commercialisation"
            haut={
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                {!lectureSeule && (
                  <BoutonsTable
                    selection={natureSel}
                    onNouveau={() => setNatureModale('creation')}
                    onModifier={() => {
                      const l = d.natures.find((x) => x.id === natureSel)
                      if (l) setNatureModale(l)
                    }}
                    onSupprimer={() => {
                      if (natureSel != null) supprimerNature.mutate(natureSel)
                    }}
                    confirmation="Supprimer ce barème ?"
                  />
                )}
                <ErreurMutation erreur={supprimerNature.error} />
                <DataTable
                  id="honoraires-natures"
                  columns={COLONNES_NATURES}
                  data={d.natures}
                  unite="barèmes"
                  getRowId={(r) => String(r.id)}
                  selectedRowId={natureSel != null ? String(natureSel) : null}
                  onRowClick={(r) => setNatureSel(r.id)}
                  totalFor={[
                    'montantCla',
                    'montantLeveeOption',
                    'montantResa',
                    'montantActe',
                  ]}
                  emptyText="Aucun barème par nature d'achat."
                />
              </div>
            }
            bas={
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <p className="shrink-0 text-[15px] font-bold text-[var(--ink)]">
                  Factures
                </p>
                {!lectureSeule && (
                  <BoutonsTable
                    selection={factureSel}
                    onNouveau={() => setFactureModale('creation')}
                    onModifier={() => {
                      const l = d.factures.find((x) => x.id === factureSel)
                      if (l) setFactureModale(l)
                    }}
                    onSupprimer={() => {
                      if (factureSel != null)
                        supprimerFacture.mutate(factureSel)
                    }}
                    confirmation="Supprimer cette facture ?"
                  />
                )}
                <ErreurMutation erreur={supprimerFacture.error} />
                <DataTable
                  id="honoraires-factures"
                  columns={COLONNES_FACTURES}
                  data={d.factures}
                  unite="factures"
                  getRowId={(r) => String(r.id)}
                  selectedRowId={factureSel != null ? String(factureSel) : null}
                  onRowClick={(r) => setFactureSel(r.id)}
                  totalFor={[
                    'nbCla',
                    'montantCla',
                    'nbLeveeOption',
                    'montantLeveeOption',
                    'nbResa',
                    'montantResa',
                    'nbActe',
                    'montantActe',
                    'totalFacture',
                  ]}
                  emptyText="Aucune facture."
                />
              </div>
            }
          />
        )}
      </div>

      <ModaleMission
        trancheId={trancheId}
        ligne={missionModale === 'creation' ? null : missionModale}
        open={missionModale != null}
        onOpenChange={(o) => {
          if (!o) setMissionModale(null)
        }}
        nomenclatures={nomenclatures.data}
      />
      {missionSel != null && (
        <ModaleGrille
          trancheId={trancheId}
          missionId={missionSel}
          ligne={grilleModale === 'creation' ? null : grilleModale}
          open={grilleModale != null}
          onOpenChange={(o) => {
            if (!o) setGrilleModale(null)
          }}
          nomenclatures={nomenclatures.data}
        />
      )}
      <ModaleNature
        trancheId={trancheId}
        ligne={natureModale === 'creation' ? null : natureModale}
        open={natureModale != null}
        onOpenChange={(o) => {
          if (!o) setNatureModale(null)
        }}
        nomenclatures={nomenclatures.data}
      />
      <ModaleFacture
        trancheId={trancheId}
        ligne={factureModale === 'creation' ? null : factureModale}
        open={factureModale != null}
        onOpenChange={(o) => {
          if (!o) setFactureModale(null)
        }}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Modale « Mission » (FEN_Fiche_Mission)
// ---------------------------------------------------------------------------

interface EntreeMission {
  id?: number
  trancheId: number
  dateConvention: string | null
  nbLogement: number | null
  baseHonoUnitaireHt: number | null
  baseHonoHt: number | null
  typeMissionId: number | null
  prestataireId: number | null
  finFacturation: boolean | null
  ordre: number | null
  nbMois: number | null
  commentaire: string | null
}

function ModaleMission({
  trancheId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
}: {
  trancheId: number
  /** null = création */
  ligne: LigneMission | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const vide: EntreeMission = {
    trancheId,
    dateConvention: null,
    nbLogement: null,
    baseHonoUnitaireHt: null,
    baseHonoHt: null,
    typeMissionId: null,
    prestataireId: null,
    finFacturation: null,
    ordre: null,
    nbMois: null,
    commentaire: null,
  }
  const depuisLigne = (l: LigneMission): EntreeMission => ({
    trancheId,
    dateConvention: versInputDate(l.dateConvention),
    nbLogement: l.nbLogement,
    baseHonoUnitaireHt: l.baseHonoUnitaireHt,
    baseHonoHt: l.baseHonoHt,
    typeMissionId: l.typeMissionId,
    prestataireId: l.prestataireId,
    finFacturation: l.finFacturation,
    ordre: l.ordre,
    nbMois: l.nbMois,
    commentaire: l.commentaire,
  })
  const [valeurs, setValeurs] = useState<EntreeMission>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeMission) => saveMissionFn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['honoraires', trancheId],
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
    <TCle extends keyof EntreeMission>(k: TCle) =>
    (v: EntreeMission[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la mission' : 'Nouvelle mission'}
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
              libelle="Date convention"
              value={valeurs.dateConvention}
              onChange={set('dateConvention')}
            />
            <ChampNombre
              libelle="Nb logements"
              step="1"
              value={valeurs.nbLogement}
              onChange={set('nbLogement')}
            />
            <ChampNombre
              libelle="Base Hono Unitaire HT"
              value={valeurs.baseHonoUnitaireHt}
              onChange={set('baseHonoUnitaireHt')}
            />
            <ChampNombre
              libelle="Base Hono HT"
              value={valeurs.baseHonoHt}
              onChange={set('baseHonoHt')}
            />
            <ChampSelectId
              libelle="Type de mission"
              value={valeurs.typeMissionId}
              onChange={set('typeMissionId')}
              options={nomenclatures?.typesMission ?? []}
            />
            <ChampSelectId
              libelle="Prestataire mission"
              value={valeurs.prestataireId}
              onChange={set('prestataireId')}
              options={nomenclatures?.prestataires ?? []}
            />
            <ChampNombre
              libelle="Ordre"
              step="1"
              value={valeurs.ordre}
              onChange={set('ordre')}
            />
            <ChampNombre
              libelle="Nb mois"
              step="1"
              value={valeurs.nbMois}
              onChange={set('nbMois')}
            />
            <ChampBascule
              libelle="Fin facturation"
              checked={!!valeurs.finFacturation}
              onChange={set('finFacturation')}
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
// Modale « Grille de facturation »
// ---------------------------------------------------------------------------

interface EntreeGrille {
  id?: number
  missionId: number
  listeAvancementId: number | null
  /** saisi en %, converti en fraction à l'enregistrement */
  pourcentage: number | null
  montant: number | null
}

function ModaleGrille({
  trancheId,
  missionId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
}: {
  trancheId: number
  missionId: number
  /** null = création */
  ligne: LigneGrille | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const vide: EntreeGrille = {
    missionId,
    listeAvancementId: null,
    pourcentage: null,
    montant: null,
  }
  const depuisLigne = (l: LigneGrille): EntreeGrille => ({
    missionId,
    listeAvancementId: l.listeAvancementId,
    pourcentage: enPourcent(l.pourcentage),
    montant: l.montant,
  })
  const [valeurs, setValeurs] = useState<EntreeGrille>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeGrille) =>
      saveGrilleFn({ data: { ...v, pourcentage: enFraction(v.pourcentage) } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['honoraires', trancheId],
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
    <TCle extends keyof EntreeGrille>(k: TCle) =>
    (v: EntreeGrille[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le stade' : 'Nouveau stade'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ChampSelectId
                libelle="Stade avancement"
                value={valeurs.listeAvancementId}
                onChange={set('listeAvancementId')}
                options={(nomenclatures?.stades ?? []).map((s) => ({
                  id: s.id,
                  libelle: s.code ? `${s.libelle} (${s.code})` : s.libelle,
                }))}
              />
            </div>
            <ChampNombre
              libelle="Pourcentage (%)"
              value={valeurs.pourcentage}
              onChange={set('pourcentage')}
            />
            <ChampNombre
              libelle="Montant"
              value={valeurs.montant}
              onChange={set('montant')}
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
// Modale « Barème par nature d'achat »
// ---------------------------------------------------------------------------

interface EntreeNature {
  id?: number
  trancheId: number
  natureAchatId: number | null
  montantCla: number | null
  montantLeveeOption: number | null
  montantResa: number | null
  montantActe: number | null
  /** saisis en %, convertis en fraction à l'enregistrement */
  pourcentageResa: number | null
  pourcentageActe: number | null
  commentaires: string | null
}

function ModaleNature({
  trancheId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
}: {
  trancheId: number
  /** null = création */
  ligne: LigneNature | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const vide: EntreeNature = {
    trancheId,
    natureAchatId: null,
    montantCla: null,
    montantLeveeOption: null,
    montantResa: null,
    montantActe: null,
    pourcentageResa: null,
    pourcentageActe: null,
    commentaires: null,
  }
  const depuisLigne = (l: LigneNature): EntreeNature => ({
    trancheId,
    natureAchatId: l.natureAchatId,
    montantCla: l.montantCla,
    montantLeveeOption: l.montantLeveeOption,
    montantResa: l.montantResa,
    montantActe: l.montantActe,
    pourcentageResa: enPourcent(l.pourcentageResa),
    pourcentageActe: enPourcent(l.pourcentageActe),
    commentaires: l.commentaires,
  })
  const [valeurs, setValeurs] = useState<EntreeNature>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeNature) =>
      saveNatureFn({
        data: {
          ...v,
          pourcentageResa: enFraction(v.pourcentageResa),
          pourcentageActe: enFraction(v.pourcentageActe),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['honoraires', trancheId],
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
    <TCle extends keyof EntreeNature>(k: TCle) =>
    (v: EntreeNature[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le barème' : 'Nouveau barème'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(ligne ? { ...valeurs, id: ligne.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ChampSelectId
                libelle="Nature achat"
                value={valeurs.natureAchatId}
                onChange={set('natureAchatId')}
                options={nomenclatures?.naturesAchat ?? []}
              />
            </div>
            <SousTitre>Loc. accession</SousTitre>
            <ChampNombre
              libelle="Montant CLA"
              value={valeurs.montantCla}
              onChange={set('montantCla')}
            />
            <ChampNombre
              libelle="Montant levée option"
              value={valeurs.montantLeveeOption}
              onChange={set('montantLeveeOption')}
            />
            <SousTitre>VEFA</SousTitre>
            <ChampNombre
              libelle="Montant réservation"
              value={valeurs.montantResa}
              onChange={set('montantResa')}
            />
            <ChampNombre
              libelle="Montant acte"
              value={valeurs.montantActe}
              onChange={set('montantActe')}
            />
            <SousTitre>Honoraires au %</SousTitre>
            <ChampNombre
              libelle="% résa"
              value={valeurs.pourcentageResa}
              onChange={set('pourcentageResa')}
            />
            <ChampNombre
              libelle="% acte"
              value={valeurs.pourcentageActe}
              onChange={set('pourcentageActe')}
            />
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

// ---------------------------------------------------------------------------
// Modale « Facture »
// ---------------------------------------------------------------------------

interface EntreeFacture {
  id?: number
  trancheId: number
  numFacture: number | null
  dateFacture: string | null
  nbCla: number | null
  montantCla: number | null
  nbLeveeOption: number | null
  montantLeveeOption: number | null
  nbResa: number | null
  montantResa: number | null
  nbActe: number | null
  montantActe: number | null
  commentaires: string | null
}

function ModaleFacture({
  trancheId,
  ligne,
  open,
  onOpenChange,
}: {
  trancheId: number
  /** null = création */
  ligne: LigneFacture | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const vide: EntreeFacture = {
    trancheId,
    numFacture: null,
    dateFacture: null,
    nbCla: null,
    montantCla: null,
    nbLeveeOption: null,
    montantLeveeOption: null,
    nbResa: null,
    montantResa: null,
    nbActe: null,
    montantActe: null,
    commentaires: null,
  }
  const depuisLigne = (l: LigneFacture): EntreeFacture => ({
    trancheId,
    numFacture: l.numFacture,
    dateFacture: versInputDate(l.dateFacture),
    nbCla: l.nbCla,
    montantCla: l.montantCla,
    nbLeveeOption: l.nbLeveeOption,
    montantLeveeOption: l.montantLeveeOption,
    nbResa: l.nbResa,
    montantResa: l.montantResa,
    nbActe: l.nbActe,
    montantActe: l.montantActe,
    commentaires: l.commentaires,
  })
  const [valeurs, setValeurs] = useState<EntreeFacture>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeFacture) => saveFactureFn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['honoraires', trancheId],
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
    <TCle extends keyof EntreeFacture>(k: TCle) =>
    (v: EntreeFacture[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la facture' : 'Nouvelle facture'}
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
              libelle="Numéro de facture"
              step="1"
              value={valeurs.numFacture}
              onChange={set('numFacture')}
            />
            <ChampDate
              libelle="Date de facture"
              value={valeurs.dateFacture}
              onChange={set('dateFacture')}
            />
            <SousTitre>Loc. accession</SousTitre>
            <ChampNombre
              libelle="Nb contrats loc accession"
              step="1"
              value={valeurs.nbCla}
              onChange={set('nbCla')}
            />
            <ChampNombre
              libelle="Montant CLA"
              value={valeurs.montantCla}
              onChange={set('montantCla')}
            />
            <ChampNombre
              libelle="Nb levées option"
              step="1"
              value={valeurs.nbLeveeOption}
              onChange={set('nbLeveeOption')}
            />
            <ChampNombre
              libelle="Montant levée option"
              value={valeurs.montantLeveeOption}
              onChange={set('montantLeveeOption')}
            />
            <SousTitre>VEFA</SousTitre>
            <ChampNombre
              libelle="Nb réservations"
              step="1"
              value={valeurs.nbResa}
              onChange={set('nbResa')}
            />
            <ChampNombre
              libelle="Montant résa"
              value={valeurs.montantResa}
              onChange={set('montantResa')}
            />
            <ChampNombre
              libelle="Nb actes"
              step="1"
              value={valeurs.nbActe}
              onChange={set('nbActe')}
            />
            <ChampNombre
              libelle="Montant acte"
              value={valeurs.montantActe}
              onChange={set('montantActe')}
            />
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
