// Module Opérations (FEN_TABLE_Operation) — lecture : détails (notaires,
// architectes, investisseur, masquages), combo tranche, puis les onglets
// de la tranche (Stade d'avancement, Terrain, Subventions, Informations diverses).
// Références : migration_windev/captures_ecrans/Opérations.png,
// Opération_OngletTerrain.png, Opération_OngletInfoDiverses.png.
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import Champ from '#/components/Champ'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import SelecteurTranche, { libelleTranche } from '#/components/SelecteurTranche'
import { Switch } from '#/components/ui/switch'
import {
  getOperationFicheFn,
  getStadesFn,
  getSubventionsFn,
} from '#/lib/operations.ts'
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
  const navigate = useNavigate({ from: Route.fullPath })

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
              open
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
                  <p className="text-[13px] font-semibold text-[var(--gold-ink)]">
                    Architectes de la tranche
                    {t ? ` ${libelleTranche(t)}` : ''}
                  </p>
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

            {t && <OngletsTranche tranche={t} />}
          </>
        )}
      </div>
    </div>
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
] as const
type Onglet = (typeof ONGLETS)[number]

type LigneTranche = Fiche['tranches'][number]
type LigneStade = Awaited<ReturnType<typeof getStadesFn>>[number]
type LigneSubvention = Awaited<ReturnType<typeof getSubventionsFn>>[number]

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
  colDate('datePreviComptaDebutAnnee', 'Date prévi 01/N', 130),
  colDate('datePreviMajPromo', 'Date prévi. promo', 130),
  colDate('dateReelle', 'Date réelle', 120),
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
      <p className="border-b border-[var(--line-soft)] pb-1 text-[13px] font-semibold text-[var(--gold-ink)]">
        {titre}
      </p>
      {children}
    </div>
  )
}

const pourcent = (n: number | null | undefined) =>
  n != null ? `${(n * 100).toFixed(2).replace('.', ',')} %` : null

function OngletsTranche({ tranche: t }: { tranche: LigneTranche }) {
  const [ongletStocke, setOnglet] = usePref<Onglet>(
    'onglet:operations',
    ONGLETS[0],
  )
  // un onglet renommé depuis l'enregistrement ne doit pas laisser la page vide
  const onglet = ONGLETS.includes(ongletStocke) ? ongletStocke : ONGLETS[0]

  const stades = useQuery({
    queryKey: ['stades', t.id],
    queryFn: () => getStadesFn({ data: { trancheId: t.id } }),
    enabled: onglet === "Stade d'avancement",
  })
  const subventions = useQuery({
    queryKey: ['subventions', t.id],
    queryFn: () => getSubventionsFn({ data: { trancheId: t.id } }),
    enabled: onglet === 'Subventions',
  })

  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} />

      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {onglet === "Stade d'avancement" && (
          // les 40+ jalons défilent dans la table, pas la page
          <div className="flex h-full min-h-0 flex-col gap-2">
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
            <DataTable
              id="operations-stades"
              columns={COLONNES_STADES}
              data={stades.data ?? []}
              unite="stades"
              getRowId={(s) => String(s.id)}
              defaultHidden={['montantPrevi', 'commentaire']}
              emptyText={
                stades.isLoading
                  ? 'Chargement…'
                  : 'Aucun stade sur cette tranche.'
              }
            />
          </div>
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
