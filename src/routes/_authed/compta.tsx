// Module Compta & Finances (FEN_Compta, phase 6) — lecture par tranche :
// Subventions (+ déblocages), Suivi évolution de dépenses et budget
// (suivi résultat + suivi détaillé frais), Finances (Admin PSLA, Contrats PSLA,
// Financements PSLA, Financements, GFA, Suivi Prêt 1 %).
// Captures : migration_windev/captures_ecrans/ComptaFinances_*.png.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import Champ from '#/components/Champ'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import SelecteurTranche from '#/components/SelecteurTranche'
import { getOperationCommFn } from '#/lib/commercialisation.ts'
import {
  getDeblocagesSubventionFn,
  getFinancementsFn,
  getGfaFn,
  getMouvementsFinancementFn,
  getPslaFn,
  getReducsGfaFn,
  getSuiviTrancheFn,
} from '#/lib/compta.ts'
import { getSubventionsFn } from '#/lib/operations.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { VueFinancement } from '#/lib/compta.ts'
import type { ColumnDef } from '@tanstack/react-table'

interface RechercheCompta {
  op?: number
  tranche?: number
}

export const Route = createFileRoute('/_authed/compta')({
  validateSearch: (s: Record<string, unknown>): RechercheCompta => ({
    op: s.op ? Number(s.op) : undefined,
    tranche: s.tranche ? Number(s.tranche) : undefined,
  }),
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('compta')) throw redirect({ to: '/' })
  },
  component: PageCompta,
})

// -- helpers colonnes (mêmes conventions que le module Opérations) ----------

const colDate = <T,>(
  id: string,
  header: string,
  size = 110,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
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

const colOui = <T,>(
  id: string,
  header: string,
  size = 90,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (c.getValue() ? 'Oui' : '—'),
})

// les taux legacy sont stockés en fraction (0.003 → « 0,30 % », comme WinDev)
const colPourc = <T,>(
  id: string,
  header: string,
  size = 90,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">
      {c.getValue() != null
        ? `${(Number(c.getValue()) * 100).toFixed(2).replace('.', ',')} %`
        : '—'}
    </span>
  ),
})

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

// -- page -------------------------------------------------------------------

function PageCompta() {
  const { op, tranche } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const fiche = useQuery({
    queryKey: ['operation-comm', op],
    queryFn: () => getOperationCommFn({ data: { operationId: op! } }),
    enabled: op != null,
  })
  const d = fiche.data
  const trancheActive = tranche ?? d?.tranches[0]?.id

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
            <p className="island-kicker mb-2">Compta &amp; Finances</p>
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
              {d.hlm && (
                <span className="badge-pill bg-[var(--ok-tint)] font-bold text-[var(--ink)]">
                  HLM
                </span>
              )}
            </div>

            <div className="mb-4 shrink-0">
              <SelecteurTranche
                tranches={d.tranches}
                value={trancheActive}
                onChange={(id) => void navigate({ search: { op, tranche: id } })}
              />
            </div>

            {trancheActive != null && (
              <OngletsCompta key={trancheActive} trancheId={trancheActive} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// -- accordéons WinDev → onglets --------------------------------------------

const ACCORDEONS = [
  'Subventions',
  'Suivi dépenses & budget',
  'Finances',
] as const
type Accordeon = (typeof ACCORDEONS)[number]

function OngletsCompta({ trancheId }: { trancheId: number }) {
  const [accordeon, setAccordeon] = useState<Accordeon>('Subventions')
  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <Onglets onglets={ACCORDEONS} actif={accordeon} onChange={setAccordeon} />
      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {accordeon === 'Subventions' && (
          <OngletSubventions trancheId={trancheId} />
        )}
        {accordeon === 'Suivi dépenses & budget' && (
          <OngletSuivi trancheId={trancheId} />
        )}
        {accordeon === 'Finances' && <OngletFinances trancheId={trancheId} />}
      </div>
    </section>
  )
}

// -- accordéon Subventions ---------------------------------------------------

type LigneSubvention = Awaited<ReturnType<typeof getSubventionsFn>>[number]

const COLONNES_SUBVENTIONS: Array<ColumnDef<LigneSubvention, any>> = [
  { accessorKey: 'categorie', header: 'Catégorie', size: 150 },
  { accessorKey: 'organisme', header: 'Organisme', size: 190 },
  colEuro('budgetPreviMontant', 'Budget prévi'),
  {
    accessorKey: 'budgetPreviCommentaire',
    header: 'Budget prévi commentaires',
    size: 200,
  },
  colDate('dateConvention', 'Date conv.'),
  { accessorKey: 'numConvention', header: 'Num conv.', size: 140 },
  colDate('dateCaducite', 'Date caducité'),
  colEuro('montantAgrement', 'Agrément'),
  colEuro('montantProvisoire', 'Provisoire'),
  colEuro('montantDefinitif', 'Définitif'),
  colOui('finDeSuivi', 'Fin suivi'),
  { accessorKey: 'commentaire', header: 'Commentaire', size: 220 },
]

type LigneDeblocageSubvention = Awaited<
  ReturnType<typeof getDeblocagesSubventionFn>
>[number]

const COLONNES_DEBLOCAGES_SUBVENTION: Array<
  ColumnDef<LigneDeblocageSubvention, any>
> = [
  colDate('dateDemande', 'Date demande', 130),
  colEuro('montant', 'Montant'),
  colDate('datePaiement', 'Date paiement', 130),
  { accessorKey: 'commentaire', header: 'Commentaire', size: 300 },
]

function OngletSubventions({ trancheId }: { trancheId: number }) {
  const [subventionId, setSubventionId] = useState<number | null>(null)

  const subventions = useQuery({
    queryKey: ['subventions', trancheId],
    queryFn: () => getSubventionsFn({ data: { trancheId } }),
  })
  const deblocages = useQuery({
    queryKey: ['deblocages-subvention', subventionId],
    queryFn: () =>
      getDeblocagesSubventionFn({ data: { subventionId: subventionId! } }),
    enabled: subventionId != null,
  })
  const selection = subventions.data?.find((s) => s.id === subventionId)

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        id="compta-subventions"
        columns={COLONNES_SUBVENTIONS}
        data={subventions.data ?? []}
        unite="subventions"
        getRowId={(s) => String(s.id)}
        selectedRowId={subventionId != null ? String(subventionId) : null}
        onRowClick={(s) => setSubventionId(s.id === subventionId ? null : s.id)}
        totalFor={[
          'budgetPreviMontant',
          'montantAgrement',
          'montantProvisoire',
          'montantDefinitif',
        ]}
        defaultHidden={['dateCaducite', 'commentaire']}
        emptyText={
          subventions.isLoading
            ? 'Chargement…'
            : 'Aucune subvention sur cette tranche.'
        }
      />

      {selection && (
        <Bloc
          titre={`Déblocages de la subvention ${selection.categorie ?? ''} ${
            selection.organisme ? `— ${selection.organisme}` : ''
          }`}
        >
          <DataTable
            id="compta-deblocages-subvention"
            columns={COLONNES_DEBLOCAGES_SUBVENTION}
            data={deblocages.data ?? []}
            unite="déblocages"
            getRowId={(x) => String(x.id)}
            totalFor={['montant']}
            emptyText={
              deblocages.isLoading
                ? 'Chargement…'
                : 'Aucun déblocage sur cette subvention.'
            }
          />
        </Bloc>
      )}
      {!selection && (
        <p className="text-[13px] text-[var(--muted)]">
          Sélectionnez une subvention pour afficher ses déblocages.
        </p>
      )}
    </div>
  )
}

// -- accordéon Suivi évolution de dépenses et budget -------------------------

type Suivi = NonNullable<Awaited<ReturnType<typeof getSuiviTrancheFn>>>
type LigneFrais = Suivi['frais'][number]

const COLONNES_FRAIS: Array<ColumnDef<LigneFrais, any>> = [
  {
    accessorKey: 'categorie',
    header: 'Catégorie frais',
    size: 200,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colEuro('budgetMontant', 'Montant budget'),
  colEuro('actuaMontant', 'Montant actualisé'),
  colEuro('consommeMontant', 'Montant consommé'),
  colEuro('reelMontant', 'Montant réel'),
  {
    accessorKey: 'ordre',
    header: 'Ordre',
    size: 70,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  { accessorKey: 'usageFrais', header: 'Usage frais', size: 140 },
]

// cellule € de la grille Suivi résultat
function C({ v }: { v: number | null | undefined }) {
  return (
    <td className="border border-[var(--line-soft)] px-2 py-1 text-right tabular-nums">
      {v != null ? fmtEuro(v) : ''}
    </td>
  )
}

const somme = (...ns: Array<number | null | undefined>) =>
  ns.some((n) => n != null)
    ? ns.reduce<number>((a, n) => a + (n ?? 0), 0)
    : null

function OngletSuivi({ trancheId }: { trancheId: number }) {
  const suivi = useQuery({
    queryKey: ['compta-suivi', trancheId],
    queryFn: () => getSuiviTrancheFn({ data: { trancheId } }),
  })
  const s = suivi.data
  if (!s)
    return (
      <p className="text-[13px] text-[var(--muted)]">
        {suivi.isLoading ? 'Chargement…' : 'Tranche introuvable.'}
      </p>
    )

  const th =
    'border border-[var(--line-soft)] bg-[var(--cream)] px-2 py-1 text-[12px] font-semibold text-[var(--ink)]'
  const rowLabel =
    'border border-[var(--line-soft)] px-2 py-1 text-left font-medium text-[var(--ink)]'

  return (
    <div className="flex flex-col gap-8">
      <Bloc titre="Suivi résultat">
        <div className="flex flex-wrap items-start gap-8">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th} />
                  <th className={th} colSpan={3}>
                    Budget
                  </th>
                  <th className={th} colSpan={2}>
                    Coût sans hono ni publicité
                  </th>
                  <th className={th}>Quote part</th>
                </tr>
                <tr>
                  <th className={th} />
                  <th className={th}>CA HT</th>
                  <th className={th}>Subvention</th>
                  <th className={th}>Hono comm</th>
                  <th className={th}>Budget</th>
                  <th className={th}>Réel</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={rowLabel}>PSLA</td>
                  <C v={s.cahtPrevPsla} />
                  <C v={s.subvPrevPsla} />
                  <C v={s.honoCommPsla} />
                  <C v={s.coutPrevPsla} />
                  <C v={s.coutReelPsla} />
                  <C v={s.quotePartPsla} />
                </tr>
                <tr>
                  <td className={rowLabel}>VEFA taux réduit</td>
                  <C v={s.cahtPrevVefaReduit} />
                  <C v={s.subvPrevVefaReduit} />
                  <C v={s.honoCommVefaReduit} />
                  {/* coût VEFA unique : cellule fusionnée sur les deux lignes VEFA (comme WinDev) */}
                  <td
                    rowSpan={2}
                    className="border border-[var(--line-soft)] px-2 py-1 text-right align-middle tabular-nums"
                  >
                    {s.coutPrevVefa != null ? fmtEuro(s.coutPrevVefa) : ''}
                  </td>
                  <td
                    rowSpan={2}
                    className="border border-[var(--line-soft)] px-2 py-1 text-right align-middle tabular-nums"
                  >
                    {s.coutReelVefa != null ? fmtEuro(s.coutReelVefa) : ''}
                  </td>
                  <C v={s.quotePartVefaReduit} />
                </tr>
                <tr>
                  <td className={rowLabel}>VEFA taux normal</td>
                  <C v={s.cahtPrevVefa} />
                  <C v={s.subvPrevVefaNormal} />
                  <C v={s.honoCommVefaNormal} />
                  <C v={s.quotePartVefaNormal} />
                </tr>
                <tr>
                  <td className={rowLabel}>Autre</td>
                  <C v={s.cahtPrevAutre} />
                  <C v={s.subvPrevAutre} />
                  <C v={s.honoCommAutre} />
                  <C v={s.coutPrevAutre} />
                  <C v={s.coutReelAutre} />
                  <C v={s.quotePartAutre} />
                </tr>
                <tr className="font-semibold">
                  <td className={rowLabel}>Total</td>
                  <C
                    v={somme(
                      s.cahtPrevPsla,
                      s.cahtPrevVefaReduit,
                      s.cahtPrevVefa,
                      s.cahtPrevAutre,
                    )}
                  />
                  <C
                    v={somme(
                      s.subvPrevPsla,
                      s.subvPrevVefaReduit,
                      s.subvPrevVefaNormal,
                      s.subvPrevAutre,
                    )}
                  />
                  <C
                    v={somme(
                      s.honoCommPsla,
                      s.honoCommVefaReduit,
                      s.honoCommVefaNormal,
                      s.honoCommAutre,
                    )}
                  />
                  <C v={somme(s.coutPrevPsla, s.coutPrevVefa, s.coutPrevAutre)} />
                  <C v={somme(s.coutReelPsla, s.coutReelVefa, s.coutReelAutre)} />
                  <C
                    v={somme(
                      s.quotePartPsla,
                      s.quotePartVefaReduit,
                      s.quotePartVefaNormal,
                      s.quotePartAutre,
                    )}
                  />
                </tr>
                <tr>
                  <td className={rowLabel}>Commentaires</td>
                  <td
                    colSpan={3}
                    className="border border-[var(--line-soft)] px-2 py-1"
                  >
                    {s.cahtPrevCommentaire}
                  </td>
                  <td className="border border-[var(--line-soft)] px-2 py-1">
                    {s.coutPrevCommentaire}
                  </td>
                  <td className="border border-[var(--line-soft)] px-2 py-1">
                    {s.coutReelCommentaire}
                  </td>
                  <td className="border border-[var(--line-soft)] px-2 py-1">
                    {s.quotePartCommentaire}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Champ libelle="Répartition">{s.modeRepartQuotePart}</Champ>
            <div />
            <Champ libelle="LVO prévi. Nb">{s.nbLvoPrev}</Champ>
            <Champ libelle="LVO prévi. Année">{s.nbLvoPrevAnnee}</Champ>
          </div>
        </div>
      </Bloc>

      <Bloc titre="Suivi détaillé frais / budget">
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
          <Champ libelle="Budget — date">{fmtDate(s.fraisBudgetDate)}</Champ>
          <Champ libelle="Actualisé — date">{fmtDate(s.fraisActuaDate)}</Champ>
          <Champ libelle="Consommé — date">
            {fmtDate(s.fraisConsommeDate)}
          </Champ>
          <Champ libelle="Réel — date">{fmtDate(s.fraisReelDate)}</Champ>
          <Champ libelle="Budget — commentaire">
            {s.fraisBudgetCommentaire}
          </Champ>
          <Champ libelle="Actualisé — commentaire">
            {s.fraisActuaCommentaire}
          </Champ>
          <Champ libelle="Consommé — commentaire">
            {s.fraisConsommeCommentaire}
          </Champ>
          <Champ libelle="Réel — commentaire">{s.fraisReelCommentaire}</Champ>
          <Champ libelle="Stade budget">{s.stadeBudget}</Champ>
          <Champ libelle="Type mission budget architecte">
            {s.typeMissionBudgetArchitecte}
          </Champ>
          <Champ libelle="Date contrat architecte">
            {fmtDate(s.dateContratArchitecte)}
          </Champ>
        </div>
        <DataTable
          id="compta-frais"
          columns={COLONNES_FRAIS}
          data={s.frais}
          unite="catégories"
          getRowId={(f) => String(f.id)}
          totalFor={[
            'budgetMontant',
            'actuaMontant',
            'consommeMontant',
            'reelMontant',
          ]}
          emptyText="Aucun frais sur cette tranche."
        />
      </Bloc>
    </div>
  )
}

// -- accordéon Finances ------------------------------------------------------

const ONGLETS_FINANCES = [
  'Admin PSLA',
  'Contrats PSLA',
  'Financements PSLA',
  'Financements',
  'GFA',
  'Suivi Prêt 1 %',
] as const
type OngletFinance = (typeof ONGLETS_FINANCES)[number]

function OngletFinances({ trancheId }: { trancheId: number }) {
  const [onglet, setOnglet] = useState<OngletFinance>('Admin PSLA')
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Onglets onglets={ONGLETS_FINANCES} actif={onglet} onChange={setOnglet} />
      <div className="min-h-0 flex-1 overflow-auto pt-4">
        {onglet === 'Admin PSLA' && <OngletAdminPsla trancheId={trancheId} />}
        {onglet === 'Contrats PSLA' && (
          <OngletContratsPsla trancheId={trancheId} />
        )}
        {onglet === 'Financements PSLA' && (
          <OngletFinancements trancheId={trancheId} vue="psla" />
        )}
        {onglet === 'Financements' && (
          <OngletFinancements trancheId={trancheId} vue="autres" />
        )}
        {onglet === 'GFA' && <OngletGfa trancheId={trancheId} />}
        {onglet === 'Suivi Prêt 1 %' && (
          <OngletFinancements trancheId={trancheId} vue="pret1" />
        )}
      </div>
    </div>
  )
}

// -- onglets Admin PSLA / Contrats PSLA --------------------------------------

type LignePsla = Awaited<ReturnType<typeof getPslaFn>>[number]

const COLONNES_ADMIN_PSLA: Array<ColumnDef<LignePsla, any>> = [
  {
    accessorKey: 'estimPsla',
    header: 'Estim. PSLA',
    size: 90,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colEuro('montantPsla', 'Montant PSLA'),
  { accessorKey: 'organismeAgrement', header: 'Organisme agrément', size: 150 },
  colDate('previAgrement', 'Prévi. agrément'),
  colDate('dateDepotDossierAgrement', 'Dépôt dossier'),
  colDate('dateReceptionAgrement', 'Réception agrément'),
  colDate('dateDecisionAgrement', 'Décision agrément'),
  colDate('dateConventionEngagementReciproque', 'Conv. engagement récipr.'),
  colDate('cffFiClient', 'CFF FI client'),
  colDate('banqueOperateurDate', 'Date banque opérateur'),
  { accessorKey: 'banqueOperateur', header: 'Banque opérateur', size: 150 },
  colDate('banqueClientDate', 'Date banque client'),
  { accessorKey: 'banqueClient', header: 'Banque client', size: 150 },
  colOui('finSuivi', 'Fin suivi'),
]

const COLONNES_CONTRATS_PSLA: Array<ColumnDef<LignePsla, any>> = [
  colDate('dateAgrementProvisoire', 'Agrément provisoire'),
  { accessorKey: 'numAgrement', header: 'N° agrément', size: 130 },
  colEuro('coutTotal', 'Coût total'),
  {
    accessorKey: 'dureeAnneePsla',
    header: 'Durée (années)',
    size: 100,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colEuro('montantPsla', 'Montant PSLA'),
  { accessorKey: 'banqueOperateur', header: 'Banque opérateur', size: 150 },
  {
    accessorKey: 'organismeGarantieEmprunt',
    header: 'Organisme garantie emprunt',
    size: 170,
  },
  colDate('dateDeliberationGarantie', 'Délibération garantie'),
  { accessorKey: 'numBureauGarantie', header: 'N° bureau garantie', size: 130 },
  {
    accessorKey: 'numConventionGarantie',
    header: 'N° convention garantie',
    size: 150,
  },
  colDate('garantieEmpruntActionDate', 'Date action garantie'),
  {
    accessorKey: 'garantieEmpruntActionType',
    header: 'Action garantie',
    size: 150,
  },
  colDate('banqueActionDate', 'Date action banque'),
  { accessorKey: 'banqueActionType', header: 'Action banque', size: 150 },
  colDate('dateInfoAnnuelle', 'Info annuelle'),
  colDate('dateInfoFin', 'Info fin'),
  { accessorKey: 'commentaires', header: 'Commentaires', size: 240 },
]

function OngletAdminPsla({ trancheId }: { trancheId: number }) {
  const psla = useQuery({
    queryKey: ['compta-psla', trancheId],
    queryFn: () => getPslaFn({ data: { trancheId } }),
  })
  return (
    <DataTable
      id="compta-admin-psla"
      columns={COLONNES_ADMIN_PSLA}
      data={psla.data ?? []}
      unite="dossiers"
      getRowId={(p) => String(p.id)}
      emptyText={
        psla.isLoading ? 'Chargement…' : 'Aucun dossier PSLA sur cette tranche.'
      }
    />
  )
}

function OngletContratsPsla({ trancheId }: { trancheId: number }) {
  const psla = useQuery({
    queryKey: ['compta-psla', trancheId],
    queryFn: () => getPslaFn({ data: { trancheId } }),
  })
  return (
    <DataTable
      id="compta-contrats-psla"
      columns={COLONNES_CONTRATS_PSLA}
      data={psla.data ?? []}
      unite="contrats"
      getRowId={(p) => String(p.id)}
      defaultHidden={['dateInfoAnnuelle', 'dateInfoFin']}
      emptyText={
        psla.isLoading ? 'Chargement…' : 'Aucun dossier PSLA sur cette tranche.'
      }
    />
  )
}

// -- onglets Financements (PSLA / autres / Prêt 1 %) -------------------------

type LigneFinancement = Awaited<ReturnType<typeof getFinancementsFn>>[number]

const COLONNES_FINANCEMENTS_BASE: Array<ColumnDef<LigneFinancement, any>> = [
  { accessorKey: 'banque', header: 'Banque', size: 160 },
  colEuro('montantFinancement', 'Montant'),
  colDate('dateSignature', 'Date signature'),
  { accessorKey: 'numContrat', header: 'N° contrat', size: 130 },
  colOui('estPhaseAmortissement', 'Amortissement'),
  colOui('estSolde', 'Soldé'),
  { accessorKey: 'indexTaux', header: 'Index taux', size: 110 },
  colOui('indexTauxFloore', 'Flooré'),
  colPourc('margeBanque', 'Marge banque'),
  { accessorKey: 'periodicite', header: 'Périodicité', size: 100 },
  colEuro('fraisDossier', 'Frais dossier'),
  colPourc('commissionEngagementPourc', '% comm. engagement', 120),
  colOui('estPrlvFraisDossier', 'Prlv frais dossier', 110),
  colEuro('partSocialeMontant', 'Part sociale'),
  { accessorKey: 'statutPartSociale', header: 'Statut part sociale', size: 130 },
  colDate('dateStatutPartSociale', 'Date statut PS'),
  colDate('dateButoir', 'Date butoir'),
  { accessorKey: 'actionAlerte', header: 'Action alerte', size: 130 },
  colDate('dateDebutMobilisation', 'Début mobilisation'),
  colDate('dateFinMobilisation', 'Fin mobilisation'),
  { accessorKey: 'commentaire', header: 'Commentaire', size: 240 },
]

const COLONNES_PAR_VUE: Record<
  VueFinancement,
  Array<ColumnDef<LigneFinancement, any>>
> = {
  psla: [
    ...COLONNES_FINANCEMENTS_BASE,
    {
      accessorKey: 'dureeMoisMobPsla',
      header: 'Durée mob. (mois)',
      size: 110,
      cell: (c) => (
        <span className="block text-right tabular-nums">
          {c.getValue() ?? '—'}
        </span>
      ),
    },
    colOui('estAmortDiffere', 'Amort. différé', 100),
  ],
  autres: [
    { accessorKey: 'typeFinancement', header: 'Type', size: 130 },
    ...COLONNES_FINANCEMENTS_BASE,
    colEuro('prevMtOc', 'Prévi Mt OC'),
    colOui('surOpe', 'Sur opé ?', 80),
    { accessorKey: 'finPret', header: 'Fin prêt', size: 110 },
    colEuro('apportPromoteur', 'Apport promoteur'),
    { accessorKey: 'statutApport', header: 'Statut apport', size: 120 },
    colEuro('blocageHonoOcMontant', 'Blocage hono OC'),
    colOui('estHfCautionOc', 'HF caution OC', 100),
    { accessorKey: 'mandatHypothequer', header: 'Mandat hypothéquer', size: 140 },
    colEuro('mandatCoutMontant', 'Coût mandat'),
    { accessorKey: 'statutCoutMandat', header: 'Statut coût mandat', size: 130 },
  ],
  pret1: [
    { accessorKey: 'banque', header: 'Banque', size: 160 },
    colOui('estSolde', 'Soldé'),
    colDate('dateVerstPret', 'Date verst prêt'),
    colEuro('montantPrevi', 'Montant prévi'),
    { accessorKey: 'infosPretPrevi', header: 'Infos prêt prévi', size: 180 },
    colDate('dateEnvoiDossier', 'Envoi dossier'),
    colDate('dateSignature', 'Date signature'),
    colEuro('contratMontant', 'Montant contrat'),
    {
      accessorKey: 'contratNbLogt',
      header: 'Nb logts contrat',
      size: 100,
      cell: (c) => (
        <span className="block text-right tabular-nums">
          {c.getValue() ?? '—'}
        </span>
      ),
    },
    colPourc('tauxPret', 'Taux prêt'),
    colDate('dateDebutEcheance', 'Début échéance'),
    colDate('dateFinEcheance', 'Fin échéance'),
    colEuro('montantEcheance', 'Montant échéance'),
    {
      accessorKey: 'pretEmployeurNumeroModifEcheance',
      header: 'N° modif échéance',
      size: 110,
      cell: (c) => (
        <span className="block text-right tabular-nums">
          {c.getValue() ?? '—'}
        </span>
      ),
    },
    colDate('pretEmployeurDateDebutAmort', 'Début amort. employeur', 140),
    { accessorKey: 'commentaire', header: 'Commentaire', size: 240 },
  ],
}

const CACHEES_PAR_VUE: Record<VueFinancement, Array<string>> = {
  psla: ['dateButoir', 'actionAlerte', 'commentaire'],
  autres: [
    'apportPromoteur',
    'statutApport',
    'blocageHonoOcMontant',
    'estHfCautionOc',
    'mandatHypothequer',
    'mandatCoutMontant',
    'statutCoutMandat',
    'commentaire',
  ],
  pret1: [],
}

type LigneDeblocagePsla = Awaited<
  ReturnType<typeof getMouvementsFinancementFn>
>['deblocages'][number]
type LigneRemboursement = Awaited<
  ReturnType<typeof getMouvementsFinancementFn>
>['remboursements'][number]

const COLONNES_DEBLOCAGES_FIN: Array<ColumnDef<LigneDeblocagePsla, any>> = [
  {
    accessorKey: 'numero',
    header: 'N°',
    size: 60,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colDate('dateDemande', 'Date demande', 130),
  colEuro('montant', 'Montant'),
  colDate('dateVersement', 'Date versement', 130),
  { accessorKey: 'commentaire', header: 'Commentaire', size: 260 },
]

const COLONNES_REMBOURSEMENTS: Array<ColumnDef<LigneRemboursement, any>> = [
  {
    accessorKey: 'numero',
    header: 'N°',
    size: 60,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colEuro('montant', 'Montant'),
  colDate('date', 'Date', 120),
  {
    accessorKey: 'nbLogt',
    header: 'Nb logts',
    size: 80,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  { accessorKey: 'commentaire', header: 'Commentaire', size: 260 },
]

function OngletFinancements({
  trancheId,
  vue,
}: {
  trancheId: number
  vue: VueFinancement
}) {
  const [financementId, setFinancementId] = useState<number | null>(null)

  const financements = useQuery({
    queryKey: ['compta-financements', trancheId, vue],
    queryFn: () => getFinancementsFn({ data: { trancheId, vue } }),
  })
  // les tables Déblocage / Remboursement anticipé n'existent que pour
  // Financements PSLA et Suivi Prêt 1 % (comme FEN_Compta)
  const avecMouvements = vue !== 'autres'
  const mouvements = useQuery({
    queryKey: ['compta-mouvements', financementId],
    queryFn: () =>
      getMouvementsFinancementFn({ data: { financementId: financementId! } }),
    enabled: avecMouvements && financementId != null,
  })

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        id={`compta-financements-${vue}`}
        columns={COLONNES_PAR_VUE[vue]}
        data={financements.data ?? []}
        unite="financements"
        getRowId={(f) => String(f.id)}
        selectedRowId={financementId != null ? String(financementId) : null}
        onRowClick={
          avecMouvements
            ? (f) => setFinancementId(f.id === financementId ? null : f.id)
            : undefined
        }
        totalFor={['montantFinancement']}
        defaultHidden={CACHEES_PAR_VUE[vue]}
        emptyText={
          financements.isLoading
            ? 'Chargement…'
            : 'Aucun financement sur cette tranche.'
        }
      />

      {avecMouvements &&
        (financementId == null ? (
          <p className="text-[13px] text-[var(--muted)]">
            Sélectionnez un financement pour afficher ses déblocages et
            remboursements anticipés.
          </p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <Bloc titre="Déblocages du financement">
              <DataTable
                id="compta-deblocages-fin"
                columns={COLONNES_DEBLOCAGES_FIN}
                data={mouvements.data?.deblocages ?? []}
                unite="déblocages"
                getRowId={(x) => String(x.id)}
                totalFor={['montant']}
                emptyText={
                  mouvements.isLoading ? 'Chargement…' : 'Aucun déblocage.'
                }
              />
            </Bloc>
            <Bloc titre="Remboursements anticipés">
              <DataTable
                id="compta-remboursements"
                columns={COLONNES_REMBOURSEMENTS}
                data={mouvements.data?.remboursements ?? []}
                unite="remboursements"
                getRowId={(x) => String(x.id)}
                totalFor={['montant']}
                emptyText={
                  mouvements.isLoading ? 'Chargement…' : 'Aucun remboursement.'
                }
              />
            </Bloc>
          </div>
        ))}
    </div>
  )
}

// -- onglet GFA --------------------------------------------------------------

type LigneGfa = Awaited<ReturnType<typeof getGfaFn>>[number]

const COLONNES_ADMIN_GFA: Array<ColumnDef<LigneGfa, any>> = [
  colOui('surOpe', 'Sur opé ?', 80),
  { accessorKey: 'banque', header: 'Organisme', size: 170 },
  { accessorKey: 'commentaires', header: 'Commentaires', size: 240 },
  colDate('dateDossier', 'Envoi dossier'),
  colDate('dateAccord', 'Accord'),
  colDate('dateAttestation', 'Attestation'),
  colEuro('apportPromoteur', 'Apport'),
  { accessorKey: 'statutApportPromoteur', header: 'Statut apport', size: 130 },
  colDate('actionFinDate', 'Date fin GFA'),
  { accessorKey: 'actionFinType', header: 'Action fin GFA', size: 140 },
  colOui('finGfa', 'Fin GFA', 80),
  colEuro('fondsGarantieMontant', 'Fonds garantie'),
  colDate('fondsGarantieDateDemandeRemb', 'Demande remb. fonds', 130),
  colDate('fondsGarantieDateRemb', 'Remb. fonds', 120),
  colEuro('partSocialeMontant', 'Part sociale'),
  colDate('partSocialeDateDemandeRemb', 'Demande remb. PS', 130),
  colDate('partSocialeDateRemb', 'Remb. PS', 110),
  {
    accessorKey: 'partSocialeCommentaire',
    header: 'Commentaire PS',
    size: 200,
  },
]

const COLONNES_CONDITIONS_GFA: Array<ColumnDef<LigneGfa, any>> = [
  colOui('hfCaution', 'HF caution', 90),
  colPourc('taux', 'Taux'),
  { accessorKey: 'periodeTaux', header: 'Période', size: 120 },
  {
    accessorKey: 'dureeMois',
    header: 'Durée (mois)',
    size: 90,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  { accessorKey: 'commentaireTaux', header: 'Commentaires GFA', size: 220 },
  colEuro('baseInitiale', 'Base initiale'),
  colEuro('commissionCautionMontant', 'Comm. caution'),
  colDate('datePremierPrlvt', '1er prélèvement', 120),
  colEuro('fraisDossier', 'Frais dossier'),
  colPourc('precomPourc', '% précom.'),
  colEuro('caTtcMin', 'CA TTC min'),
  {
    accessorKey: 'commentaireConditions',
    header: 'Conditions particulières',
    size: 220,
  },
]

type LigneReduc = Awaited<ReturnType<typeof getReducsGfaFn>>[number]

const COLONNES_REDUCTIONS: Array<ColumnDef<LigneReduc, any>> = [
  colEuro('montant', 'Montant'),
  colDate('dateReduc', 'Date', 120),
  { accessorKey: 'commentaire', header: 'Commentaire', size: 240 },
]

function OngletGfa({ trancheId }: { trancheId: number }) {
  const [gfaId, setGfaId] = useState<number | null>(null)

  const gfa = useQuery({
    queryKey: ['compta-gfa', trancheId],
    queryFn: () => getGfaFn({ data: { trancheId } }),
  })
  const reducs = useQuery({
    queryKey: ['compta-reducs-gfa', gfaId],
    queryFn: () => getReducsGfaFn({ data: { gfaId: gfaId! } }),
    enabled: gfaId != null,
  })

  return (
    <div className="flex flex-col gap-6">
      <Bloc titre="Admin GFA">
        <DataTable
          id="compta-admin-gfa"
          columns={COLONNES_ADMIN_GFA}
          data={gfa.data ?? []}
          unite="garanties"
          getRowId={(g) => String(g.id)}
          selectedRowId={gfaId != null ? String(gfaId) : null}
          onRowClick={(g) => setGfaId(g.id === gfaId ? null : g.id)}
          defaultHidden={[
            'fondsGarantieDateDemandeRemb',
            'fondsGarantieDateRemb',
            'partSocialeDateDemandeRemb',
            'partSocialeDateRemb',
            'partSocialeCommentaire',
          ]}
          emptyText={
            gfa.isLoading ? 'Chargement…' : 'Aucune GFA sur cette tranche.'
          }
        />
      </Bloc>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Bloc titre="GFA — conditions financières">
          <DataTable
            id="compta-conditions-gfa"
            columns={COLONNES_CONDITIONS_GFA}
            data={gfa.data ?? []}
            unite="garanties"
            getRowId={(g) => String(g.id)}
            selectedRowId={gfaId != null ? String(gfaId) : null}
            onRowClick={(g) => setGfaId(g.id === gfaId ? null : g.id)}
            emptyText={
              gfa.isLoading ? 'Chargement…' : 'Aucune GFA sur cette tranche.'
            }
          />
        </Bloc>
        <Bloc titre="Réductions">
          {gfaId == null ? (
            <p className="text-[13px] text-[var(--muted)]">
              Sélectionnez une GFA pour afficher ses réductions.
            </p>
          ) : (
            <DataTable
              id="compta-reducs-gfa"
              columns={COLONNES_REDUCTIONS}
              data={reducs.data ?? []}
              unite="réductions"
              getRowId={(r) => String(r.id)}
              totalFor={['montant']}
              emptyText={
                reducs.isLoading ? 'Chargement…' : 'Aucune réduction.'
              }
            />
          )}
        </Bloc>
      </div>
    </div>
  )
}
