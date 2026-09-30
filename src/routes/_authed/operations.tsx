// Module Opérations (FEN_TABLE_Operation) — détails (notaires, architectes,
// investisseur, masquages ; bouton Modifier pour notaires/architectes), combo
// tranche, puis les onglets de la tranche (Stade d'avancement — CRUD, filtre
// domaine, synchro des dates entre tranches, factures du jalon —, Terrain,
// Subventions, Informations diverses) et l'onglet Contentieux (par opération,
// CRUD). Références : migration_windev/captures_ecrans/Opérations.png,
// Opération_OngletTerrain.png, Opération_OngletInfoDiverses.png.
import { createContext, useContext, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronsLeft, ChevronsRight, Pencil } from 'lucide-react'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'

import Champ from '#/components/Champ'
import {
  BoutonsTable,
  ChampBascule,
  ChampDate,
  ChampNombre,
  ChampSelectId,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
  SousTitre,
  versInputDate,
} from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import SelecteurTranche, { libelleTranche } from '#/components/SelecteurTranche'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { useToast } from '#/components/ui/toast'
import { dateFr, lireSaisie } from '#/lib/compta.helpers.ts'
import { getHonorairesNomenclaturesFn } from '#/lib/honoraires.ts'
import { synchroniserDates } from '#/lib/operations.helpers.ts'
import {
  deleteContentieuxFn,
  deleteFactureFn,
  deleteStadeFn,
  getContentieuxFn,
  getFacturesFn,
  getOperationFicheFn,
  getStadesFn,
  getStadesFreresFn,
  getSubventionsFn,
  saveContentieuxFn,
  saveFactureFn,
  saveOperationSimpleFn,
  saveStadeFn,
} from '#/lib/operations.ts'
import { getOtlOptionsFn } from '#/lib/parametres.otl.ts'
import {
  selectionARejouer,
  useMemoriserSelection,
  usePref,
} from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheOp {
  op?: number
  tranche?: number
}

export const Route = createFileRoute('/_authed/operations')({
  validateSearch: (s: Record<string, unknown>): RechercheOp => ({
    op: s.op ? Number(s.op) : undefined,
    tranche: s.tranche ? Number(s.tranche) : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('operations')) throw redirect({ to: '/' })
    // arrivée sans paramètre → on rejoue la dernière sélection dans l'URL, au
    // SSR : pas de clignotement, et l'URL reste partageable.
    const selection = selectionARejouer(context.prefs, search.op)
    if (selection) throw redirect({ to: '/operations', search: selection })
    return {
      lectureSeule: context.session.user.service === 'consultation',
      // TABLE_REQ_StadeAvancement_Operation.COL_DatePrevComptaDebutAnnee :
      // visible des seuls services Comptabilité et Administrateur (iso-WinDev)
      voitDatePreviCompta: ['compta', 'admin'].includes(
        context.session.user.service ?? '',
      ),
    }
  },
  component: PageOperations,
})

type Fiche = NonNullable<Awaited<ReturnType<typeof getOperationFicheFn>>>
type Notaire = Fiche['notaireVente']

// « NOTAIRES DES LICES : Maitre BEAUVAIS Isabelle » (cf. capture)
function ChampNotaire({ libelle, n }: { libelle: string; n: Notaire }) {
  return (
    <Champ libelle={libelle}>
      {n ? (
        <>
          {n.etude ? `${n.etude} : ` : ''}
          {n.libelle}
          {n.telephone || n.email ? (
            <span className="block text-[11px] text-[var(--muted)]">
              {[n.telephone, n.email].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </>
      ) : null}
    </Champ>
  )
}

// cases à cocher WinDev en lecture → toggles désactivés (consignes UI)
function Case({ libelle, actif }: { libelle: string; actif?: boolean | null }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
      <Switch checked={!!actif} disabled className="scale-75" />
      {libelle}
    </label>
  )
}

function PageOperations() {
  const { op, tranche } = Route.useSearch()
  const { lectureSeule } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const [modaleContacts, setModaleContacts] = useState(false)
  const [detailsOuverts, setDetailsOuverts] = usePref(
    'details:operations',
    true,
  )

  const fiche = useQuery({
    queryKey: ['operation-fiche', op],
    queryFn: () => getOperationFicheFn({ data: { operationId: op! } }),
    enabled: op != null,
  })
  const d = fiche.data
  // à défaut de tranche dans l'URL — ou si celle demandée n'existe plus, les
  // identifiants de tranche étant recopiés du legacy à chaque réimport .bak
  // alors que user_pref y survit — la première de l'opération (comme la combo
  // WinDev, qui se positionne sur la première tranche)
  const t = d?.tranches.find((x) => x.id === tranche) ?? d?.tranches[0]
  const trancheActive = t?.id
  // l'URL fait foi : un lien partagé `?op=99` devient la sélection mémorisée
  useMemoriserSelection(op, trancheActive)

  return (
    <div className="flex h-[calc(100vh-61px)] items-stretch">
      <PanneauOperations
        selectedId={op ?? null}
        // nouvelle opération → la tranche mémorisée ne s'applique plus
        onSelect={(id) => void navigate({ search: { op: id } })}
        masquerFlag="masquerPromo"
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7">
        {op == null ? (
          <div className="island-shell rounded-xl px-8 py-12 text-center">
            <p className="island-kicker mb-2">Opérations</p>
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
              {d.sccvHlm && (
                <span className="badge-pill bg-[var(--ok-tint)] font-bold text-[var(--ink)]">
                  HLM
                </span>
              )}
              {d.dateAbandon && (
                <span className="badge-pill bg-[var(--danger-tint)] font-bold text-[var(--danger)]">
                  Abandonnée le {fmtDate(d.dateAbandon)}
                </span>
              )}
            </div>

            {/* Détails opérations : quatre blocs de la capture WinDev */}
            <details
              open={detailsOuverts}
              // `toggle` part aussi au montage d'un bloc ouvert : n'écrire
              // que sur un vrai changement
              onToggle={(e) => {
                const ouvert = e.currentTarget.open
                if (ouvert !== detailsOuverts) setDetailsOuverts(ouvert)
              }}
              className="island-shell group mb-4 shrink-0 overflow-hidden rounded-xl"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-[var(--line-soft)] px-[18px] py-[14px] [&::-webkit-details-marker]:hidden">
                <ChevronDown
                  className="h-4 w-4 text-[var(--ink-faded)] transition-transform group-open:rotate-180"
                  aria-hidden
                />
                <h2 className="text-[15.5px] font-bold text-[var(--ink)]">
                  Détails opération
                </h2>
                {!lectureSeule && t && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={(e) => {
                      // ne pas replier/déplier le bloc <details>
                      e.preventDefault()
                      setModaleContacts(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Modifier
                  </Button>
                )}
              </summary>
              <div className="grid gap-x-8 gap-y-4 px-[18px] py-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-3">
                  <ChampNotaire libelle="Notaire Vente" n={d.notaireVente} />
                  <ChampNotaire libelle="Clerc Vente" n={d.clercVente} />
                  <ChampNotaire
                    libelle="Notaire Foncier"
                    n={d.notaireFoncier}
                  />
                  <ChampNotaire libelle="Clerc Foncier" n={d.clercFoncier} />
                </div>

                <div className="flex flex-col gap-3">
                  <SousTitre>
                    Architectes de la tranche
                    {t ? ` ${libelleTranche(t)}` : ''}
                  </SousTitre>
                  <Champ libelle="Architecte mandataire">
                    {t?.architecteMandataire}
                  </Champ>
                  <Champ libelle="Architecte cotraitant">
                    {t?.architecteCotraitant}
                  </Champ>
                </div>

                <div className="flex flex-col gap-3">
                  <Champ libelle="Chargé d'opération">
                    {[d.chargeOpe1, d.chargeOpe2]
                      .filter(Boolean)
                      .join(' et ') || null}
                  </Champ>
                  <Case
                    libelle="Possibilité investisseur"
                    actif={d.possibiliteInvestisseur}
                  />
                  <Champ libelle="Taux investisseur autorisé">
                    {d.tauxInvestisseurAutorise != null
                      ? `${d.tauxInvestisseurAutorise} %`
                      : null}
                  </Champ>
                  <Champ libelle="Commentaire investisseur">
                    {d.commentaireInvestisseur}
                  </Champ>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 border-t border-[var(--line-soft)] px-[18px] py-3">
                <Case
                  libelle="Masquer Commercial"
                  actif={d.masquerCommercial}
                />
                <Case libelle="Masquer Comptable" actif={d.masquerComptable} />
                <Case libelle="Masquer Promo" actif={d.masquerPromo} />
              </div>
            </details>

            <div className="mb-4 shrink-0">
              <SelecteurTranche
                tranches={d.tranches}
                value={trancheActive}
                onChange={(id) =>
                  void navigate({ search: { op, tranche: id } })
                }
              />
            </div>

            {t && (
              <OngletsTranche
                tranche={t}
                operationId={d.id}
                synchro={!!d.synchroniserDatesEntreTranche}
                lectureSeule={lectureSeule}
              />
            )}

            {t && (
              <ModaleOperationSimple
                fiche={d}
                tranche={t}
                open={modaleContacts}
                onOpenChange={setModaleContacts}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Modale du bouton « Modifier » — iso-fenêtre WinDev Operation_Simple
// (capture Fiche_Operation_Simple.png) : Investisseur, Masquer, Notaires,
// Architectes ; boutons vers Paramètres pour gérer les listes.
function ModaleOperationSimple({
  fiche,
  tranche: t,
  open,
  onOpenChange,
}: {
  fiche: Fiche
  tranche: LigneTranche
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const queryClient = useQueryClient()
  const options = useQuery({
    queryKey: ['otl-options'],
    queryFn: () => getOtlOptionsFn(),
    staleTime: 300_000,
    enabled: open,
  }).data

  const depuisFiche = () => ({
    possibiliteInvestisseur: fiche.possibiliteInvestisseur,
    tauxInvestisseurAutorise: fiche.tauxInvestisseurAutorise,
    commentaireInvestisseur: fiche.commentaireInvestisseur ?? '',
    masquerCommercial: fiche.masquerCommercial,
    masquerComptable: fiche.masquerComptable,
    masquerPromo: fiche.masquerPromo,
    notaireVenteId: fiche.notaireVenteId,
    clercVenteId: fiche.clercVenteId,
    notaireFoncierId: fiche.notaireFoncierId,
    clercFoncierId: fiche.clercFoncierId,
    architecteMandataireId: t.architecteMandataireId,
    architecteCotraitantId: t.architecteCotraitantId,
  })
  const [valeurs, setValeurs] = useState(depuisFiche)
  // resynchronise la fiche affichée à chaque ouverture (autre op/tranche)
  const [cleOuverture, setCleOuverture] = useState<string | null>(null)
  const cle = `${fiche.id}:${t.id}:${open}`
  if (open && cle !== cleOuverture) {
    setCleOuverture(cle)
    setValeurs(depuisFiche())
  }
  type Valeurs = ReturnType<typeof depuisFiche>
  const set =
    <TCle extends keyof Valeurs>(k: TCle) =>
    (v: Valeurs[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const enregistrer = useMutation({
    mutationFn: () =>
      saveOperationSimpleFn({
        data: {
          operationId: fiche.id,
          trancheId: t.id,
          ...valeurs,
          commentaireInvestisseur: valeurs.commentaireInvestisseur || null,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['operation-fiche', fiche.id],
      })
      onOpenChange(false)
    },
  })

  const lienListe = (liste: string, libelle: string) => (
    <Link
      to="/parametres"
      search={{ liste }}
      className="badge-pill shrink-0 bg-[var(--gold-tint)] font-bold normal-case"
      onClick={() => onOpenChange(false)}
    >
      {libelle}
    </Link>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Opération simplifiée — {fiche.libelle}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SousTitre>Investisseur</SousTitre>
            <div className="flex flex-col gap-3">
              <ChampBascule
                libelle="Possibilité investisseur"
                checked={!!valeurs.possibiliteInvestisseur}
                onChange={set('possibiliteInvestisseur')}
              />
              <ChampNombre
                libelle="Taux investisseur autorisé"
                value={valeurs.tauxInvestisseurAutorise}
                onChange={set('tauxInvestisseurAutorise')}
              />
              <ChampTexte
                libelle="Commentaire investisseur"
                value={valeurs.commentaireInvestisseur}
                onChange={set('commentaireInvestisseur')}
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                Masquer
              </p>
              <ChampBascule
                libelle="Masquer Commercial"
                checked={!!valeurs.masquerCommercial}
                onChange={set('masquerCommercial')}
              />
              <ChampBascule
                libelle="Masquer Comptable"
                checked={!!valeurs.masquerComptable}
                onChange={set('masquerComptable')}
              />
              <ChampBascule
                libelle="Masquer Promo"
                checked={!!valeurs.masquerPromo}
                onChange={set('masquerPromo')}
              />
            </div>

            <SousTitre>
              Notaires
              {lienListe('notaires', 'Gérer les notaires')}
            </SousTitre>
            <ChampSelectId
              libelle="Notaire Vente"
              value={valeurs.notaireVenteId}
              onChange={set('notaireVenteId')}
              options={options?.notaires ?? []}
            />
            <ChampSelectId
              libelle="Clerc Vente"
              value={valeurs.clercVenteId}
              onChange={set('clercVenteId')}
              options={options?.notaires ?? []}
            />
            <ChampSelectId
              libelle="Notaire Foncier"
              value={valeurs.notaireFoncierId}
              onChange={set('notaireFoncierId')}
              options={options?.notaires ?? []}
            />
            <ChampSelectId
              libelle="Clerc Foncier"
              value={valeurs.clercFoncierId}
              onChange={set('clercFoncierId')}
              options={options?.notaires ?? []}
            />

            <SousTitre>
              Architectes — tranche {libelleTranche(t)}
              {lienListe('architectes', 'Gérer les architectes')}
            </SousTitre>
            <ChampSelectId
              libelle="Architecte mandataire"
              value={valeurs.architecteMandataireId}
              onChange={set('architecteMandataireId')}
              options={options?.architectes ?? []}
            />
            <ChampSelectId
              libelle="Architecte cotraitant"
              value={valeurs.architecteCotraitantId}
              onChange={set('architecteCotraitantId')}
              options={options?.architectes ?? []}
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
// Onglets de la tranche : Stade d'avancement / Terrain / Informations diverses
// (captures Opérations.png, Opération_OngletTerrain.png,
// Opération_OngletInfoDiverses.png)
// ---------------------------------------------------------------------------

const ONGLETS = [
  "Stade d'avancement",
  'Terrain',
  'Subventions',
  'Informations diverses',
  'Contentieux',
] as const
type Onglet = (typeof ONGLETS)[number]

type LigneTranche = Fiche['tranches'][number]
type LigneStade = Awaited<ReturnType<typeof getStadesFn>>[number]
type LigneFacture = Awaited<ReturnType<typeof getFacturesFn>>[number]
type LigneSubvention = Awaited<ReturnType<typeof getSubventionsFn>>[number]
type LigneContentieux = Awaited<ReturnType<typeof getContentieuxFn>>[number]

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

const COL_DATE_PREVI_COMPTA = colDate<LigneStade>(
  'datePreviComptaDebutAnnee',
  'Date prévi 01/N',
  130,
)

// Saisie en ligne des dates prévi. promo et réelle de la table des stades :
// Tab passe d'un champ à l'autre, la ligne s'enregistre quand on la quitte
// (table en saisie WinDev).
type ChampDateStade = 'datePreviMajPromo' | 'dateReelle'
type DatesStade = Record<ChampDateStade, string | null>

const datesDe = (l: LigneStade): DatesStade => ({
  datePreviMajPromo: versInputDate(l.datePreviMajPromo),
  dateReelle: versInputDate(l.dateReelle),
})

// absent : lecture seule
const SaisieStades = createContext<{
  /** dates saisies que la table n'a pas encore rechargées, par id de stade */
  brouillons: Partial<Record<number, DatesStade>>
  sortirChamp: (
    ligne: LigneStade,
    dates: DatesStade,
    quitteLigne: boolean,
  ) => void
} | null>(null)

function CelluleDateStade({
  ligne,
  champ,
  libelle,
}: {
  ligne: LigneStade
  champ: ChampDateStade
  libelle: string
}) {
  const saisie = useContext(SaisieStades)
  // null : hors saisie, le champ affiche la date de la ligne
  const [texte, setTexte] = useState<string | null>(null)
  const annule = useRef(false)
  if (!saisie)
    return <span className="tabular-nums">{fmtDate(ligne[champ])}</span>
  const dates = saisie.brouillons[ligne.id] ?? datesDe(ligne)
  // telle qu'elle se tape : jj/mm/aaaa
  const brute = dateFr(dates[champ])
  return (
    <input
      aria-label={`${libelle} — ${ligne.stade ?? ''}`}
      inputMode="numeric"
      placeholder="jj/mm/aaaa"
      value={texte ?? brute}
      aria-invalid={texte != null && lireSaisie(texte, 'date') === undefined}
      onFocus={(e) => {
        setTexte(brute)
        const c = e.currentTarget
        // après le rendu, comme la saisie directe du suivi compta
        requestAnimationFrame(() => c.select())
      }}
      onChange={(e) => setTexte(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') annule.current = true
        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
      }}
      onBlur={(e) => {
        // saisie illisible : la date reste celle d'avant
        const lue = texte == null ? undefined : lireSaisie(texte, 'date')
        saisie.sortirChamp(
          ligne,
          // Échap : toute la ligne revient aux dates enregistrées
          annule.current
            ? datesDe(ligne)
            : lue === undefined
              ? dates
              : { ...dates, [champ]: lue },
          !e.currentTarget.closest('tr')?.contains(e.relatedTarget),
        )
        annule.current = false
        setTexte(null)
      }}
      className="w-full rounded-sm bg-transparent tabular-nums outline-none placeholder:text-[var(--muted)] focus:bg-white focus:ring-1 focus:ring-[var(--gold)] focus:ring-inset aria-invalid:ring-1 aria-invalid:ring-red-500 aria-invalid:ring-inset"
    />
  )
}

const colDateSaisie = (
  id: ChampDateStade,
  header: string,
  size: number,
): ColumnDef<LigneStade, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <CelluleDateStade ligne={c.row.original} champ={id} libelle={header} />
  ),
})

const COLONNES_STADES: Array<ColumnDef<LigneStade, any>> = [
  {
    accessorKey: 'stade',
    header: 'Stade avancement',
    size: 240,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  { accessorKey: 'domaine', header: 'Domaine', size: 130 },
  COL_DATE_PREVI_COMPTA,
  colDateSaisie('datePreviMajPromo', 'Date prévi. promo', 130),
  colDateSaisie('dateReelle', 'Date réelle', 120),
  {
    accessorKey: 'pourcentageAvancementReel',
    header: '% avanc.',
    size: 90,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() != null ? `${c.getValue()} %` : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'montantPrevi',
    header: 'Montant prévi',
    size: 120,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  { accessorKey: 'commentaire', header: 'Commentaire', size: 240 },
  {
    accessorKey: 'avecAppelFondClientSuppl',
    header: 'Appel fonds suppl.',
    size: 130,
    cell: (c) => (c.getValue() ? 'Oui' : '—'),
  },
  {
    accessorKey: 'lienHypertexte',
    header: 'Lien',
    size: 200,
    cell: (c) => {
      const lien: string | null = c.getValue()
      // seuls les liens web sont cliquables (chemins réseau legacy : texte)
      return lien && /^https?:\/\//i.test(lien) ? (
        <a
          href={lien}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--gold-ink)] underline"
          onClick={(e) => e.stopPropagation()}
        >
          {lien}
        </a>
      ) : (
        lien
      )
    },
  },
]

// Table Facture du jalon sélectionné (TABLE_Facture de la capture)
const COLONNES_FACTURES: Array<ColumnDef<LigneFacture, any>> = [
  { accessorKey: 'numFacture', header: 'Num facture', size: 100 },
  colDate('dateFacture', 'Date facture', 110),
  {
    accessorKey: 'montantHt',
    header: 'Montant HT',
    size: 110,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  { accessorKey: 'prestataire', header: 'Prestataire', size: 140 },
  { accessorKey: 'typeMission', header: 'Type de mission', size: 160 },
  {
    accessorKey: 'partiel',
    header: 'Partiel',
    size: 80,
    cell: (c) => (c.getValue() ? 'Oui' : '—'),
  },
  { accessorKey: 'nbMois', header: 'Nb mois', size: 80 },
  { accessorKey: 'commentaire', header: 'Commentaire', size: 220 },
]

const COLONNES_SUBVENTIONS: Array<ColumnDef<LigneSubvention, any>> = [
  { accessorKey: 'categorie', header: 'Catégorie subvention', size: 170 },
  { accessorKey: 'organisme', header: 'Organisme', size: 220 },
  colDate('dateConvention', 'Date conv.'),
  {
    accessorKey: 'budgetPreviMontant',
    header: 'Budget prévi',
    size: 120,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  {
    accessorKey: 'montantAgrement',
    header: 'Montant agréé',
    size: 120,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  {
    accessorKey: 'montantProvisoire',
    header: 'Montant provisoire',
    size: 130,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  {
    accessorKey: 'montantDefinitif',
    header: 'Montant définitif',
    size: 130,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {fmtEuro(c.getValue())}
      </span>
    ),
  },
  { accessorKey: 'numConvention', header: 'N° convention', size: 130 },
  colDate('dateCaducite', 'Caducité'),
  {
    accessorKey: 'finDeSuivi',
    header: 'Fin de suivi',
    size: 100,
    cell: (c) => (c.getValue() ? 'Oui' : '—'),
  },
  { accessorKey: 'commentaire', header: 'Commentaire', size: 240 },
]

// Onglet Contentieux — colonnes de FEN_Table_Contentieux (par opération)
const COLONNES_CONTENTIEUX: Array<ColumnDef<LigneContentieux, any>> = [
  {
    accessorKey: 'objet',
    header: 'Objet',
    size: 280,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colDate('dateDebut', 'Date début'),
  colDate('dateFin', 'Date fin'),
  { accessorKey: 'avocats', header: 'Avocats', size: 220 },
  { accessorKey: 'commentaires', header: 'Commentaires', size: 320 },
]

// libellé de bloc bleu des captures WinDev
function Bloc({
  titre,
  children,
}: {
  titre: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <SousTitre>{titre}</SousTitre>
      {children}
    </div>
  )
}

const pourcent = (n: number | null | undefined) =>
  n != null ? `${(n * 100).toFixed(2).replace('.', ',')} %` : null

function OngletsTranche({
  tranche: t,
  operationId,
  synchro,
  lectureSeule,
}: {
  tranche: LigneTranche
  operationId: number
  synchro: boolean
  lectureSeule: boolean
}) {
  const [ongletStocke, setOnglet] = usePref<Onglet>(
    'onglet:operations',
    ONGLETS[0],
  )
  // un onglet renommé depuis l'enregistrement ne doit pas laisser la page vide
  const onglet = ONGLETS.includes(ongletStocke) ? ongletStocke : ONGLETS[0]

  const subventions = useQuery({
    queryKey: ['subventions', t.id],
    queryFn: () => getSubventionsFn({ data: { trancheId: t.id } }),
    enabled: onglet === 'Subventions',
  })
  const litiges = useQuery({
    queryKey: ['contentieux', operationId],
    queryFn: () => getContentieuxFn({ data: { operationId } }),
    enabled: onglet === 'Contentieux',
  })

  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} />

      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {onglet === "Stade d'avancement" && (
          // sélection et filtre repartent de zéro à chaque tranche
          <OngletStades
            key={t.id}
            tranche={t}
            operationId={operationId}
            synchro={synchro}
            lectureSeule={lectureSeule}
          />
        )}

        {onglet === 'Terrain' && (
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <Bloc titre="Terrain bilan Opérateur — Charge foncière hors BRS">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Champ libelle="Montant HT">
                  {fmtEuro(t.terrainMontantHt)}
                </Champ>
                <Champ libelle="Montant TTC">
                  {fmtEuro(t.terrainMontantTtc)}
                </Champ>
                <Champ libelle="% acompte prévu">
                  {pourcent(t.terrainPourcAcptePrevu)}
                </Champ>
                <Champ libelle="Acompte">{fmtEuro(t.terrainAcompte)}</Champ>
                <Champ libelle="Signataire compromis">
                  {t.terrainSignataire}
                </Champ>
                <Champ libelle="Date stade Compromis">
                  {fmtDate(t.dateStadeCompromis)}
                </Champ>
                <Champ libelle="Commentaire">{t.terrainCommentaire}</Champ>
              </div>
            </Bloc>

            <Bloc titre="Terrain bilan OFS — Charge foncière BRS">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Champ libelle="Nom OFS">{t.ofsNom}</Champ>
                <Champ libelle="Signataire compromis">
                  {t.terrainOfsSignataire}
                </Champ>
                <Champ libelle="Montant HT">
                  {fmtEuro(t.terrainOfsMontantHt)}
                </Champ>
                <Champ libelle="Acompte % prévi">
                  {pourcent(t.terrainOfsAcptePourcPrevu)}
                </Champ>
                <Champ libelle="Acompte montant versé">
                  {fmtEuro(t.terrainOfsAcpteMontantVerse)}
                </Champ>
                <Champ libelle="Date prévi.">
                  {fmtDate(t.terrainOfsCompromisDatePrevi)}
                </Champ>
                <Champ libelle="Date réelle">
                  {fmtDate(t.terrainOfsCompromisDateReelle)}
                </Champ>
                <Champ libelle="Commentaire">{t.terrainOfsCommentaire}</Champ>
              </div>
            </Bloc>

            <Bloc titre="Bail opérateur">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Champ libelle="Bail opérateur date prévi">
                  {fmtDate(t.terrainBailOperateurDatePrevi)}
                </Champ>
                <Champ libelle="Bail opérateur date réelle">
                  {fmtDate(t.terrainBailOperateurDateReelle)}
                </Champ>
              </div>
            </Bloc>

            <Bloc titre="Autre">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Champ libelle="Montant total">{fmtEuro(t.autreMontant)}</Champ>
                <Champ libelle="Autre commentaires">{t.autreCommentaire}</Champ>
              </div>
            </Bloc>
          </div>
        )}

        {onglet === 'Subventions' && (
          // la table gère son propre défilement, comme l'onglet Stades
          <div className="flex h-full min-h-0 flex-col">
            <DataTable
              id="operations-subventions"
              columns={COLONNES_SUBVENTIONS}
              data={subventions.data ?? []}
              unite="subventions"
              getRowId={(s) => String(s.id)}
              defaultHidden={['numConvention', 'dateCaducite', 'commentaire']}
              emptyText={
                subventions.isLoading
                  ? 'Chargement…'
                  : 'Aucune subvention sur cette tranche.'
              }
            />
          </div>
        )}

        {onglet === 'Contentieux' && (
          <OngletContentieux
            operationId={operationId}
            lignes={litiges.data ?? []}
            chargement={litiges.isLoading}
            lectureSeule={lectureSeule}
          />
        )}

        {onglet === 'Informations diverses' && (
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            <Bloc titre="Certification & Label">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Champ libelle="Certification">{t.certification}</Champ>
                <Champ libelle="Label">{t.label}</Champ>
                <Champ libelle="Performance énergétique">
                  {t.performanceEnergetique}
                </Champ>
              </div>
            </Bloc>
            <Bloc titre="MOE">
              <div className="flex flex-col gap-3">
                <Case libelle="Est MOE interne" actif={t.estMoeInterne} />
                <Champ libelle="Mission MOE interne">
                  {t.missionMoeInterne}
                </Champ>
                <Champ libelle="Commentaires avancement">
                  {t.commentaireAvancement}
                </Champ>
              </div>
            </Bloc>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Onglet Stade d'avancement : table CRUD des jalons de la tranche, filtre
// domaine, « Synchro. dates » et factures du jalon sélectionné
// ---------------------------------------------------------------------------

const TOUS = '__tous__'
const HIDDEN_STADES = [
  'montantPrevi',
  'commentaire',
  'avecAppelFondClientSuppl',
  'lienHypertexte',
]
const COLONNES_STADES_SANS_COMPTA = COLONNES_STADES.filter(
  (c) => c !== COL_DATE_PREVI_COMPTA,
)
const HIDDEN_FACTURES = ['typeMission', 'partiel', 'nbMois', 'commentaire']

function OngletStades({
  tranche: t,
  operationId,
  synchro,
  lectureSeule,
}: {
  tranche: LigneTranche
  operationId: number
  synchro: boolean
  lectureSeule: boolean
}) {
  const queryClient = useQueryClient()
  const { voitDatePreviCompta } = Route.useRouteContext()
  const [selection, setSelection] = useState<number | null>(null)
  const [domaine, setDomaine] = useState(TOUS)
  const [modale, setModale] = useState<LigneStade | 'creation' | null>(null)
  const [facturesRepliees, setFacturesRepliees] = usePref(
    'factures-repliees:operations',
    false,
  )

  const stades = useQuery({
    queryKey: ['stades', t.id],
    queryFn: () => getStadesFn({ data: { trancheId: t.id } }),
  })
  const tous = stades.data ?? []
  const domaines = [
    ...new Set(tous.map((s) => s.domaine).filter((x): x is string => !!x)),
  ].sort()
  const lignes =
    domaine === TOUS ? tous : tous.filter((s) => s.domaine === domaine)
  const selectionne = lignes.find((s) => s.id === selection)

  const invalider = () => {
    // toutes les tranches : la synchro modifie les jalons des tranches sœurs
    void queryClient.invalidateQueries({ queryKey: ['stades'] })
    // « Date stade Compromis » de l'onglet Terrain
    void queryClient.invalidateQueries({
      queryKey: ['operation-fiche', operationId],
    })
  }
  const supprimer = useMutation({
    mutationFn: (id: number) => deleteStadeFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setSelection(null)
    },
  })

  const { notifier, toast } = useToast()
  const [brouillons, setBrouillons] = useState<
    Partial<Record<number, DatesStade>>
  >({})
  // sortie de ligne : même enregistrement que la fiche (synchro entre tranches
  // comprise), les autres champs repartant tels qu'affichés
  const enregistrerDates = useMutation({
    mutationFn: ({ ligne, dates }: { ligne: LigneStade; dates: DatesStade }) =>
      saveStadeFn({
        data: {
          id: ligne.id,
          trancheId: t.id,
          listeAvancementId: ligne.listeAvancementId,
          datePreviComptaDebutAnnee: versInputDate(
            ligne.datePreviComptaDebutAnnee,
          ),
          commentaire: ligne.commentaire,
          lienHypertexte: ligne.lienHypertexte,
          avecAppelFondClientSuppl: ligne.avecAppelFondClientSuppl,
          ...dates,
        },
      }),
    onSuccess: ({ tranchesSynchronisees: n }, { ligne }) =>
      notifier({
        texte: `${ligne.stade ?? 'Stade'} : dates enregistrées${
          n > 0
            ? ` (synchro sur ${n} autre${n > 1 ? 's' : ''} tranche${n > 1 ? 's' : ''})`
            : ''
        }.`,
      }),
    onError: (e, { ligne }) =>
      notifier({
        texte: `${ligne.stade ?? 'Stade'} : ${e.message || 'erreur à l’enregistrement.'}`,
        erreur: true,
      }),
    onSettled: async (_resultat, _erreur, { ligne }) => {
      void queryClient.invalidateQueries({
        queryKey: ['operation-fiche', operationId],
      })
      // le brouillon reste affiché jusqu'au rechargement de la table : ni
      // retour fugitif à l'ancienne date, ni date refusée laissée à l'écran
      await queryClient.invalidateQueries({ queryKey: ['stades'] })
      setBrouillons((b) => ({ ...b, [ligne.id]: undefined }))
    },
  })
  const sortirChamp = (
    ligne: LigneStade,
    dates: DatesStade,
    quitteLigne: boolean,
  ) => {
    const avant = datesDe(ligne)
    const modifiee =
      dates.datePreviMajPromo !== avant.datePreviMajPromo ||
      dates.dateReelle !== avant.dateReelle
    setBrouillons((b) => ({
      ...b,
      // ligne quittée sans modification : rien à garder ni à enregistrer
      [ligne.id]: modifiee || !quitteLigne ? dates : undefined,
    }))
    if (modifiee && quitteLigne) enregistrerDates.mutate({ ligne, dates })
  }

  return (
    // les 40+ jalons défilent dans la table, pas la page
    <div className="flex h-full min-h-0 flex-col gap-2">
      {toast}
      <div className="flex shrink-0 flex-wrap gap-x-8 gap-y-1 text-[13px] text-[var(--ink-soft)]">
        <span>
          Stade actuel :{' '}
          <span className="font-semibold text-[var(--ink)]">
            {t.stadeActuel ?? '—'}
          </span>
        </span>
        <span>
          Stade prochain :{' '}
          <span className="font-semibold text-[var(--ink)]">
            {t.stadeProchain ?? '—'}
          </span>
        </span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        {!lectureSeule && (
          <BoutonsTable
            table="operations-stades"
            selection={selectionne?.id ?? null}
            onNouveau={() => setModale('creation')}
            onModifier={() => {
              if (selectionne) setModale(selectionne)
            }}
            onSupprimer={() => {
              if (selectionne) supprimer.mutate(selectionne.id)
            }}
            confirmation="Voulez-vous vraiment supprimer la ligne ?"
          />
        )}
        <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
          Filtre domaine :
          <Select value={domaine} onValueChange={setDomaine}>
            <SelectTrigger className="h-8 w-[170px] bg-[var(--card)] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TOUS}>Tous</SelectItem>
              {domaines.map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <span
          className={`badge-pill ml-auto font-bold ${
            synchro
              ? 'bg-[var(--ok-tint)] text-[var(--ink)]'
              : 'bg-[var(--cream)] text-[var(--muted)]'
          }`}
          title={
            synchro
              ? "Synchronise les dates si le stade d'avancement le permet."
              : 'Synchronisation des dates entre tranches désactivée pour cette opération (Paramètres > Opérations).'
          }
        >
          Synchro. dates{synchro ? '' : ' : non'}
        </span>
      </div>
      <ErreurMutation erreur={supprimer.error} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
        <div className="flex min-h-0 min-w-0 flex-[2] flex-col">
          <SaisieStades
            value={lectureSeule ? null : { brouillons, sortirChamp }}
          >
            <DataTable
              id="operations-stades"
              columns={
                voitDatePreviCompta
                  ? COLONNES_STADES
                  : COLONNES_STADES_SANS_COMPTA
              }
              data={lignes}
              unite="stades"
              getRowId={(s) => String(s.id)}
              selectedRowId={selectionne ? String(selectionne.id) : null}
              onRowClick={(s) => setSelection(s.id)}
              defaultHidden={HIDDEN_STADES}
              emptyText={
                stades.isLoading
                  ? 'Chargement…'
                  : 'Aucun stade sur cette tranche.'
              }
            />
          </SaisieStades>
        </div>
        {facturesRepliees ? (
          // même repli que le volet Opérations : bande étroite, libellé
          // vertical (horizontale sous xl, où les tables sont empilées)
          <button
            type="button"
            onClick={() => setFacturesRepliees(false)}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--cream)] p-1.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)] xl:w-9 xl:flex-col xl:py-3"
            aria-label="Déplier les factures"
          >
            <ChevronsLeft className="h-4 w-4" aria-hidden />
            <span className="text-[11px] font-bold tracking-wide uppercase xl:[writing-mode:vertical-rl]">
              Factures
            </span>
          </button>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:w-[480px] xl:flex-none">
            <TableFactures
              // sélection de facture remise à zéro à chaque jalon
              key={selectionne?.id ?? 'aucun'}
              stade={selectionne ?? null}
              lectureSeule={lectureSeule}
              onReplier={() => setFacturesRepliees(true)}
            />
          </div>
        )}
      </div>

      <ModaleStade
        trancheId={t.id}
        ligne={modale === 'creation' ? null : modale}
        stadesPris={tous.map((s) => s.listeAvancementId)}
        open={modale != null}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
        onSuccess={invalider}
      />
    </div>
  )
}

// Fiche stade — iso-fenêtre WinDev FEN_Fiche_StadeAvancement
function ModaleStade({
  trancheId,
  ligne,
  stadesPris,
  open,
  onOpenChange,
  onSuccess,
}: {
  trancheId: number
  ligne: LigneStade | null
  stadesPris: Array<number | null>
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const vierge = {
    listeAvancementId: null as number | null,
    datePreviComptaDebutAnnee: null as string | null,
    datePreviMajPromo: null as string | null,
    dateReelle: null as string | null,
    commentaire: '',
    lienHypertexte: '',
    avecAppelFondClientSuppl: false,
  }
  const [valeurs, setValeurs] = useState(vierge)
  // recharge la ligne à l'ouverture (création ↔ modification)
  const [cleOuverture, setCleOuverture] = useState<string | null>(null)
  const cle = `${ligne?.id ?? 'creation'}:${open}`
  if (open && cle !== cleOuverture) {
    setCleOuverture(cle)
    setValeurs(
      ligne
        ? {
            listeAvancementId: ligne.listeAvancementId,
            datePreviComptaDebutAnnee: versInputDate(
              ligne.datePreviComptaDebutAnnee,
            ),
            datePreviMajPromo: versInputDate(ligne.datePreviMajPromo),
            dateReelle: versInputDate(ligne.dateReelle),
            commentaire: ligne.commentaire ?? '',
            lienHypertexte: ligne.lienHypertexte ?? '',
            avecAppelFondClientSuppl: !!ligne.avecAppelFondClientSuppl,
          }
        : vierge,
    )
  }
  type Valeurs = typeof vierge
  const set =
    <TCle extends keyof Valeurs>(k: TCle) =>
    (v: Valeurs[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const nomenclatures = useQuery({
    queryKey: ['honoraires-nomenclatures'],
    queryFn: () => getHonorairesNomenclaturesFn(),
    staleTime: 60_000,
    enabled: open,
  }).data
  // vide si l'opération ou le stade ne se synchronise pas
  const freres = useQuery({
    queryKey: ['stades-freres', trancheId, valeurs.listeAvancementId],
    queryFn: () =>
      getStadesFreresFn({
        data: { trancheId, listeAvancementId: valeurs.listeAvancementId! },
      }),
    enabled: open && valeurs.listeAvancementId != null,
  }).data
  const avant = (freres ?? []).map((f) => ({
    ...f,
    datePreviMajPromo: versInputDate(f.datePreviMajPromo),
    dateReelle: versInputDate(f.dateReelle),
  }))
  const apres = synchroniserDates(valeurs, avant)

  const enregistrer = useMutation({
    mutationFn: () =>
      saveStadeFn({ data: { ...valeurs, trancheId, id: ligne?.id } }),
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
    },
  })

  // avant → après, l'après mis en évidence quand la validation le change
  const dateSynchro = (a: string | null, b: string | null) =>
    a === b ? (
      fmtDate(a)
    ) : (
      <>
        {fmtDate(a)} →{' '}
        <span className="font-semibold text-[var(--gold-ink)]">
          {fmtDate(b)}
        </span>
      </>
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? "Modifier le stade d'avancement" : 'Nouveau stade'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {ligne ? (
                // le stade ne change pas en modification (iso-WinDev)
                <Champ libelle="Stade d'avancement">{ligne.stade}</Champ>
              ) : (
                <ChampSelectId
                  libelle="Stade d'avancement"
                  value={valeurs.listeAvancementId}
                  onChange={set('listeAvancementId')}
                  options={(nomenclatures?.stades ?? []).filter(
                    (s) => !stadesPris.includes(s.id),
                  )}
                />
              )}
            </div>
            <ChampDate
              libelle="Date prévi 01/N"
              value={valeurs.datePreviComptaDebutAnnee}
              onChange={set('datePreviComptaDebutAnnee')}
            />
            <ChampDate
              libelle="Date prévi. promo"
              value={valeurs.datePreviMajPromo}
              onChange={set('datePreviMajPromo')}
            />
            <ChampDate
              libelle="Date réelle"
              value={valeurs.dateReelle}
              onChange={set('dateReelle')}
            />
            <div className="flex items-end pb-2">
              <ChampBascule
                libelle="Avec appel de fonds client suppl."
                checked={valeurs.avecAppelFondClientSuppl}
                onChange={set('avecAppelFondClientSuppl')}
              />
            </div>
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaire"
                value={valeurs.commentaire}
                onChange={set('commentaire')}
              />
            </div>
            <div className="sm:col-span-2">
              <ChampTexte
                libelle="Lien hypertexte"
                value={valeurs.lienHypertexte}
                onChange={set('lienHypertexte')}
              />
            </div>

            {apres.length > 0 && (
              <>
                <SousTitre>Synchro entre tranches</SousTitre>
                <p className="text-[13px] text-[var(--ink-soft)] sm:col-span-2">
                  Cette tranche se synchronise avec les autres tranches de
                  l'opération. Voici les dates des autres tranches qui seront
                  synchronisées (la date réelle est mise à jour uniquement si
                  elle est vide).
                </p>
                <table className="text-[13px] sm:col-span-2">
                  <thead>
                    <tr className="text-left text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                      <th className="py-1 pr-4">Tranche</th>
                      <th className="py-1 pr-4">Date prévi. promo</th>
                      <th className="py-1">Date réelle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apres.map((f, i) => (
                      <tr
                        key={f.id}
                        className="border-t border-[var(--line-soft)] tabular-nums"
                      >
                        <td className="py-1 pr-4">{f.tranche}</td>
                        <td className="py-1 pr-4">
                          {dateSynchro(
                            avant[i].datePreviMajPromo,
                            f.datePreviMajPromo,
                          )}
                        </td>
                        <td className="py-1">
                          {dateSynchro(avant[i].dateReelle, f.dateReelle)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
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

// Factures du jalon sélectionné (TABLE_Facture) — éditable en ligne dans
// WinDev, CRUD par modale ici
function TableFactures({
  stade,
  lectureSeule,
  onReplier,
}: {
  stade: LigneStade | null
  lectureSeule: boolean
  onReplier: () => void
}) {
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<number | null>(null)
  const [modale, setModale] = useState<LigneFacture | 'creation' | null>(null)
  // même filtre Prestataire que les factures d'honoraires de commercialisation
  const [prestataireFiltre, setPrestataireFiltre] = useState<number | null>(
    null,
  )

  const factures = useQuery({
    queryKey: ['factures-stade', stade?.id],
    queryFn: () => getFacturesFn({ data: { stadeAvancementId: stade!.id } }),
    enabled: stade != null,
  })
  const nomenclatures = useQuery({
    queryKey: ['honoraires-nomenclatures'],
    queryFn: () => getHonorairesNomenclaturesFn(),
    staleTime: 60_000,
  }).data
  const lignes = factures.data ?? []
  const invalider = () =>
    void queryClient.invalidateQueries({
      queryKey: ['factures-stade', stade?.id],
    })
  const supprimer = useMutation({
    mutationFn: (id: number) => deleteFactureFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setSelection(null)
    },
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-end gap-x-4 gap-y-2">
        <p className="flex items-center gap-1 text-[13px] font-semibold text-[var(--ink)]">
          <button
            type="button"
            onClick={onReplier}
            className="cursor-pointer rounded-lg p-1.5 text-[var(--ink-faded)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
            aria-label="Replier les factures"
          >
            <ChevronsRight className="h-4 w-4" aria-hidden />
          </button>
          Factures{stade ? ` — ${stade.stade ?? ''}` : ''}
        </p>
        <div className="w-64">
          <ChampSelectId
            libelle="Prestataire"
            value={prestataireFiltre}
            onChange={(v) => {
              setPrestataireFiltre(v)
              setSelection(null)
            }}
            options={nomenclatures?.prestataires ?? []}
          />
        </div>
        {!lectureSeule && stade && (
          <BoutonsTable
            table="operations-factures"
            selection={selection}
            onNouveau={() => setModale('creation')}
            onModifier={() => {
              const l = lignes.find((x) => x.id === selection)
              if (l) setModale(l)
            }}
            onSupprimer={() => {
              if (selection != null) supprimer.mutate(selection)
            }}
            confirmation="Voulez-vous vraiment supprimer la ligne ?"
          />
        )}
      </div>
      <ErreurMutation erreur={supprimer.error} />
      <DataTable
        id="operations-factures"
        columns={COLONNES_FACTURES}
        data={
          prestataireFiltre == null
            ? lignes
            : lignes.filter((f) => f.prestataireId === prestataireFiltre)
        }
        unite="factures"
        getRowId={(r) => String(r.id)}
        selectedRowId={selection != null ? String(selection) : null}
        onRowClick={(r) => setSelection(r.id)}
        totalFor={['montantHt']}
        defaultHidden={HIDDEN_FACTURES}
        emptyText={
          !stade
            ? 'Sélectionnez un stade pour voir ses factures.'
            : factures.isLoading
              ? 'Chargement…'
              : 'Aucune facture sur ce stade.'
        }
      />
      {stade && (
        <ModaleFacture
          stadeAvancementId={stade.id}
          ligne={modale === 'creation' ? null : modale}
          open={modale != null}
          onOpenChange={(o) => {
            if (!o) setModale(null)
          }}
          onSuccess={invalider}
        />
      )}
    </div>
  )
}

function ModaleFacture({
  stadeAvancementId,
  ligne,
  open,
  onOpenChange,
  onSuccess,
}: {
  stadeAvancementId: number
  ligne: LigneFacture | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const vierge = {
    numFacture: null as number | null,
    dateFacture: null as string | null,
    montantHt: null as number | null,
    typeMissionId: null as number | null,
    prestataireId: null as number | null,
    partiel: false,
    nbMois: null as number | null,
    commentaire: '',
  }
  const [valeurs, setValeurs] = useState(vierge)
  // recharge la ligne à l'ouverture (création ↔ modification)
  const [cleOuverture, setCleOuverture] = useState<string | null>(null)
  const cle = `${ligne?.id ?? 'creation'}:${open}`
  if (open && cle !== cleOuverture) {
    setCleOuverture(cle)
    setValeurs(
      ligne
        ? {
            numFacture: ligne.numFacture,
            dateFacture: versInputDate(ligne.dateFacture),
            montantHt: ligne.montantHt,
            typeMissionId: ligne.typeMissionId,
            prestataireId: ligne.prestataireId,
            partiel: !!ligne.partiel,
            nbMois: ligne.nbMois,
            commentaire: ligne.commentaire ?? '',
          }
        : vierge,
    )
  }
  type Valeurs = typeof vierge
  const set =
    <TCle extends keyof Valeurs>(k: TCle) =>
    (v: Valeurs[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const nomenclatures = useQuery({
    queryKey: ['honoraires-nomenclatures'],
    queryFn: () => getHonorairesNomenclaturesFn(),
    staleTime: 60_000,
    enabled: open,
  }).data
  // prestataires « AfficherMission », plus celui de la facture s'il ne l'est plus
  const prestataires = [
    ...(nomenclatures?.prestataires ?? []),
    ...(nomenclatures?.tousPrestataires ?? []).filter(
      (p) =>
        p.id === ligne?.prestataireId &&
        !nomenclatures?.prestataires.some((m) => m.id === p.id),
    ),
  ]

  const enregistrer = useMutation({
    mutationFn: () =>
      saveFactureFn({
        data: { ...valeurs, stadeAvancementId, id: ligne?.id },
      }),
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
    },
  })

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
            enregistrer.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampNombre
              libelle="Num facture"
              value={valeurs.numFacture}
              onChange={set('numFacture')}
              step="1"
            />
            <ChampDate
              libelle="Date facture"
              value={valeurs.dateFacture}
              onChange={set('dateFacture')}
            />
            <ChampNombre
              libelle="Montant HT"
              value={valeurs.montantHt}
              onChange={set('montantHt')}
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
              options={prestataires}
            />
            <ChampNombre
              libelle="Nb mois"
              value={valeurs.nbMois}
              onChange={set('nbMois')}
              step="1"
            />
            <div className="flex items-end pb-2">
              <ChampBascule
                libelle="Partiel"
                checked={valeurs.partiel}
                onChange={set('partiel')}
              />
            </div>
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires"
                value={valeurs.commentaire}
                onChange={set('commentaire')}
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
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Onglet Contentieux : table CRUD par opération (FEN_Table_Contentieux)
// ---------------------------------------------------------------------------

function OngletContentieux({
  operationId,
  lignes,
  chargement,
  lectureSeule,
}: {
  operationId: number
  lignes: Array<LigneContentieux>
  chargement: boolean
  lectureSeule: boolean
}) {
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<number | null>(null)
  const [modale, setModale] = useState<LigneContentieux | 'creation' | null>(
    null,
  )

  const invalider = () =>
    void queryClient.invalidateQueries({
      queryKey: ['contentieux', operationId],
    })
  const supprimer = useMutation({
    mutationFn: (id: number) => deleteContentieuxFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setSelection(null)
    },
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {!lectureSeule && (
        <BoutonsTable
          table="operations-contentieux"
          selection={selection}
          onNouveau={() => setModale('creation')}
          onModifier={() => {
            const l = lignes.find((x) => x.id === selection)
            if (l) setModale(l)
          }}
          onSupprimer={() => {
            if (selection != null) supprimer.mutate(selection)
          }}
          confirmation="Voulez-vous vraiment supprimer la ligne ?"
        />
      )}
      <ErreurMutation erreur={supprimer.error} />
      <DataTable
        id="operations-contentieux"
        columns={COLONNES_CONTENTIEUX}
        data={lignes}
        unite="contentieux"
        getRowId={(r) => String(r.id)}
        selectedRowId={selection != null ? String(selection) : null}
        onRowClick={(r) => setSelection(r.id)}
        emptyText={
          chargement ? 'Chargement…' : 'Aucun contentieux sur cette opération.'
        }
      />
      <ModaleContentieux
        operationId={operationId}
        ligne={modale === 'creation' ? null : modale}
        open={modale != null}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
        onSuccess={invalider}
      />
    </div>
  )
}

function ModaleContentieux({
  operationId,
  ligne,
  open,
  onOpenChange,
  onSuccess,
}: {
  operationId: number
  ligne: LigneContentieux | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const vierge = {
    objet: '',
    dateDebut: null as string | null,
    dateFin: null as string | null,
    avocats: '',
    commentaires: '',
  }
  const [valeurs, setValeurs] = useState(vierge)
  // recharge la ligne à l'ouverture (création ↔ modification)
  const [cleOuverture, setCleOuverture] = useState<string | null>(null)
  const cle = `${ligne?.id ?? 'creation'}:${open}`
  if (open && cle !== cleOuverture) {
    setCleOuverture(cle)
    setValeurs(
      ligne
        ? {
            objet: ligne.objet ?? '',
            dateDebut: versInputDate(ligne.dateDebut),
            dateFin: versInputDate(ligne.dateFin),
            avocats: ligne.avocats ?? '',
            commentaires: ligne.commentaires ?? '',
          }
        : vierge,
    )
  }

  const enregistrer = useMutation({
    mutationFn: () =>
      saveContentieuxFn({
        data: { ...valeurs, operationId, id: ligne?.id },
      }),
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier le contentieux' : 'Nouveau contentieux'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ChampTexte
                libelle="Objet"
                value={valeurs.objet}
                onChange={(v) => setValeurs((s) => ({ ...s, objet: v }))}
              />
            </div>
            <ChampDate
              libelle="Date début"
              value={valeurs.dateDebut}
              onChange={(v) => setValeurs((s) => ({ ...s, dateDebut: v }))}
            />
            <ChampDate
              libelle="Date fin"
              value={valeurs.dateFin}
              onChange={(v) => setValeurs((s) => ({ ...s, dateFin: v }))}
            />
            <div className="sm:col-span-2">
              <ChampTexte
                libelle="Avocats"
                value={valeurs.avocats}
                onChange={(v) => setValeurs((s) => ({ ...s, avocats: v }))}
              />
            </div>
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires"
                value={valeurs.commentaires}
                onChange={(v) => setValeurs((s) => ({ ...s, commentaires: v }))}
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
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
