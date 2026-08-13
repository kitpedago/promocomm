// Module SAV Promotion (FEN_SAV_Promotion, phase 5) — volet Opérations à
// gauche (masquage promo), sélecteur de tranche avec dates Livraison /
// Réception (jalons 35/39), lots de la tranche (fn partagée Commercialisation)
// et réserves du lot sélectionné (CRUD par modale, code auto NextCodeReserve).
// Mails, impression et import Air-Bat : phase 9.
// Capture : migration_windev/captures_ecrans/SAVPromotion.png.
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import {
  BoutonsTable,
  ChampBascule,
  ChampDate,
  ChampSelectId,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
  versInputDate,
} from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
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
import { getLotsCommFn, getOperationCommFn } from '#/lib/commercialisation.ts'
import {
  deleteReserveFn,
  getProchainCodeFn,
  getReservesFn,
  getSavNomenclaturesFn,
  getSavTrancheFn,
  saveReserveFn,
} from '#/lib/sav.ts'
import { selectionARejouer, useMemoriserSelection } from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheSav {
  op?: number
  tranche?: number
}

export const Route = createFileRoute('/_authed/sav')({
  validateSearch: (s: Record<string, unknown>): RechercheSav => ({
    op: s.op ? Number(s.op) : undefined,
    tranche: s.tranche ? Number(s.tranche) : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('sav')) throw redirect({ to: '/' })
    // même fil conducteur que /operations, cf. le commentaire de
    // selectionARejouer pour la garde contre la boucle de redirection.
    const selection = selectionARejouer(context.prefs, search.op)
    if (selection) throw redirect({ to: '/sav', search: selection })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageSav,
})

type LigneLot = Awaited<ReturnType<typeof getLotsCommFn>>[number]
type LigneReserve = Awaited<ReturnType<typeof getReservesFn>>[number]
type Nomenclatures = Awaited<ReturnType<typeof getSavNomenclaturesFn>>

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

const COLONNES_LOTS: Array<ColumnDef<LigneLot, any>> = [
  colTexte('numLot', 'Num lot', 130),
  colTexte('numEtage', 'Num étage', 90),
  colTexte('designation', 'Désignation', 180),
  colTexte('acquereur', 'Acquéreur', 220),
  colTexte('natureAchat', 'Nature achat', 120),
  colTexte('destination', 'Destination', 110),
  colTexte('typeDeBien', 'Type de bien', 100),
]

const COLONNES_RESERVES: Array<ColumnDef<LigneReserve, any>> = [
  colTexte('code', 'Code', 110),
  colTexte('type', 'Type', 120),
  colCheck('travauxEffectues', 'Travaux effectués', 130),
  colTexte('piece', 'Pièce', 110),
  colTexte('reserve', 'Réserve', 320),
  colDate('dateReclamation', 'Date réclamation', 130),
  colDate('dateIntervention', "Date d'intervention", 140),
  colTexte('entreprise', 'Entreprise', 180),
  colCheck('envoyerMail', 'Envoyer mail', 110),
  colDate('envoyerMailDate', "Date d'envoi du mail journalier", 150),
  colCheck('estVerrouille', 'Est verrouillée (import Air-Bat) ?', 140),
]

function PageSav() {
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
        masquerFlag="masquerPromo"
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7">
        {op == null ? (
          <div className="island-shell rounded-xl px-8 py-12 text-center">
            <p className="island-kicker mb-2">SAV Promotion</p>
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
                Lots de l'opération {d.libelle}
                {d.sccv ? ` — ${d.sccv}` : ''}
                {d.commune ? ` ${d.commune}` : ''}
              </h1>
              {(d.chargeOpe1 ?? d.chargeOpe2) && (
                <span className="text-[13px] text-[var(--ink-soft)]">
                  Chargé d'opération :{' '}
                  <span className="font-semibold">
                    {[d.chargeOpe1, d.chargeOpe2].filter(Boolean).join(' et ')}
                  </span>
                </span>
              )}
            </div>

            {trancheActive != null && (
              <SavTranche
                key={trancheActive}
                tranches={d.tranches}
                trancheActive={trancheActive}
                onChangeTranche={(id) =>
                  void navigate({ search: { op, tranche: id } })
                }
                operationId={op}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SavTranche({
  tranches,
  trancheActive,
  onChangeTranche,
  operationId,
}: {
  tranches: NonNullable<
    Awaited<ReturnType<typeof getOperationCommFn>>
  >['tranches']
  trancheActive: number
  onChangeTranche: (id: number) => void
  operationId: number
}) {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()

  const savTranche = useQuery({
    queryKey: ['sav-tranche', trancheActive],
    queryFn: () => getSavTrancheFn({ data: { trancheId: trancheActive } }),
  })
  const lots = useQuery({
    queryKey: ['lots-comm', operationId, trancheActive],
    queryFn: () =>
      getLotsCommFn({ data: { operationId, trancheId: trancheActive } }),
  })
  const nomenclatures = useQuery({
    queryKey: ['sav-nomenclatures'],
    queryFn: () => getSavNomenclaturesFn(),
    staleTime: 60_000,
  })

  const [lotSel, setLotSel] = useState<number | null>(null)
  // iso-WinDev : premier lot sélectionné à l'arrivée
  useEffect(() => {
    if (lotSel == null && lots.data?.length) setLotSel(lots.data[0].id)
  }, [lots.data, lotSel])
  const lotCourant = lots.data?.find((l) => l.id === lotSel)

  const reserves = useQuery({
    queryKey: ['reserves', lotSel],
    queryFn: () => getReservesFn({ data: { lotId: lotSel! } }),
    enabled: lotSel != null,
  })

  const [reserveSel, setReserveSel] = useState<number | null>(null)
  const [reserveModale, setReserveModale] = useState<
    'creation' | LigneReserve | null
  >(null)

  const supprimer = useMutation({
    mutationFn: (id: number) => deleteReserveFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reserves', lotSel] })
      setReserveSel(null)
    },
  })

  return (
    <>
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
        <SelecteurTranche
          tranches={tranches}
          value={trancheActive}
          onChange={onChangeTranche}
        />
        <span className="text-[13px] text-[var(--ink-soft)]">
          Livraison{' '}
          <span className="font-semibold tabular-nums">
            {fmtDate(savTranche.data?.livraison)}
          </span>
        </span>
        <span className="text-[13px] text-[var(--ink-soft)]">
          Réception{' '}
          <span className="font-semibold tabular-nums">
            {fmtDate(savTranche.data?.reception)}
          </span>
        </span>
      </div>

      <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
          <div className="flex flex-col gap-2">
            <DataTable
              id="sav-lots"
              columns={COLONNES_LOTS}
              data={lots.data ?? []}
              unite="lots"
              getRowId={(r) => String(r.id)}
              selectedRowId={lotSel != null ? String(lotSel) : null}
              onRowClick={(r) => {
                setLotSel(r.id)
                setReserveSel(null)
              }}
              emptyText={lots.isLoading ? 'Chargement…' : 'Aucun lot.'}
            />

            <p className="mt-2 shrink-0 text-[15px] font-bold text-[var(--ink)]">
              Réserves du lot {lotCourant?.numLot ?? '—'}
              {lotCourant?.acquereur ? ` | ${lotCourant.acquereur}` : ''}
            </p>
            {!lectureSeule && lotSel != null && (
              <BoutonsTable
                selection={reserveSel}
                onNouveau={() => setReserveModale('creation')}
                onModifier={() => {
                  const l = reserves.data?.find((x) => x.id === reserveSel)
                  if (l) setReserveModale(l)
                }}
                onSupprimer={() => {
                  if (reserveSel != null) supprimer.mutate(reserveSel)
                }}
                confirmation="Supprimer cette réserve ?"
              />
            )}
            <ErreurMutation erreur={supprimer.error} />
            <DataTable
              id="sav-reserves"
              columns={COLONNES_RESERVES}
              data={reserves.data ?? []}
              unite="réserves"
              getRowId={(r) => String(r.id)}
              selectedRowId={reserveSel != null ? String(reserveSel) : null}
              onRowClick={(r) => setReserveSel(r.id)}
              emptyText={
                lotSel == null ? 'Sélectionnez un lot.' : 'Aucune réserve.'
              }
            />
          </div>
        </div>

        {lotSel != null && (
          <ModaleReserve
            lotId={lotSel}
            ligne={reserveModale === 'creation' ? null : reserveModale}
            open={reserveModale != null}
            onOpenChange={(o) => {
              if (!o) setReserveModale(null)
            }}
            nomenclatures={nomenclatures.data}
          />
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Modale « Réserve » (FEN_Fiche_Reserve)
// ---------------------------------------------------------------------------

interface EntreeReserve {
  id?: number
  lotId: number
  code: string | null
  typeId: number | null
  pieceId: number | null
  entrepriseId: number | null
  travauxEffectues: boolean | null
  reserve: string | null
  dateReclamation: string | null
  dateIntervention: string | null
  envoyerMail: boolean | null
}

function ModaleReserve({
  lotId,
  ligne,
  open,
  onOpenChange,
  nomenclatures,
}: {
  lotId: number
  /** null = création */
  ligne: LigneReserve | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const vide: EntreeReserve = {
    lotId,
    code: null,
    typeId: null,
    pieceId: null,
    entrepriseId: null,
    travauxEffectues: null,
    reserve: null,
    dateReclamation: null,
    dateIntervention: null,
    envoyerMail: null,
  }
  const depuisLigne = (l: LigneReserve): EntreeReserve => ({
    lotId,
    code: l.code,
    typeId: l.typeId,
    pieceId: l.pieceId,
    entrepriseId: l.entrepriseId,
    travauxEffectues: l.travauxEffectues,
    reserve: l.reserve,
    dateReclamation: versInputDate(l.dateReclamation),
    dateIntervention: versInputDate(l.dateIntervention),
    envoyerMail: l.envoyerMail,
  })
  const [valeurs, setValeurs] = useState<EntreeReserve>(() =>
    ligne ? depuisLigne(ligne) : vide,
  )
  const enregistrer = useMutation({
    mutationFn: (v: EntreeReserve) => saveReserveFn({ data: v }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reserves', lotId] })
      onOpenChange(false)
    },
  })
  // code auto-proposé à la création (NextCodeReserve, iso-WinDev)
  const prochainCode = useQuery({
    queryKey: ['prochain-code-reserve', lotId],
    queryFn: () => getProchainCodeFn({ data: { lotId } }),
    enabled: open && ligne == null,
  })
  useEffect(() => {
    if (open) {
      setValeurs(
        ligne
          ? depuisLigne(ligne)
          : { ...vide, code: prochainCode.data?.code || null },
      )
      enregistrer.reset()
    }
  }, [open, ligne, prochainCode.data])

  const set =
    <TCle extends keyof EntreeReserve>(k: TCle) =>
    (v: EntreeReserve[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la réserve' : 'Nouvelle réserve'}
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
              libelle="Code"
              value={valeurs.code ?? ''}
              onChange={(v) => set('code')(v || null)}
            />
            <ChampSelectId
              libelle="Type"
              value={valeurs.typeId}
              onChange={set('typeId')}
              options={nomenclatures?.types ?? []}
            />
            <ChampSelectId
              libelle="Pièce"
              value={valeurs.pieceId}
              onChange={set('pieceId')}
              options={nomenclatures?.pieces ?? []}
            />
            <ChampSelectId
              libelle="Entreprise"
              value={valeurs.entrepriseId}
              onChange={set('entrepriseId')}
              options={nomenclatures?.entreprises ?? []}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Réserve"
                value={valeurs.reserve ?? ''}
                onChange={(v) => set('reserve')(v || null)}
              />
            </div>
            <ChampDate
              libelle="Date réclamation"
              value={valeurs.dateReclamation}
              onChange={set('dateReclamation')}
            />
            <ChampDate
              libelle="Date d'intervention"
              value={valeurs.dateIntervention}
              onChange={set('dateIntervention')}
            />
            <ChampBascule
              libelle="Travaux effectués"
              checked={!!valeurs.travauxEffectues}
              onChange={set('travauxEffectues')}
            />
            <ChampBascule
              libelle="Envoyer mail"
              checked={!!valeurs.envoyerMail}
              onChange={set('envoyerMail')}
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
