// Écran Paramètres « Contrats & avenants » (service Administrateur = le dev) :
// CRUD des contrats/avenants + suivi d'imputation des heures des tickets —
// heures facturées vs calculées (Σ ticket.nb_heures imputées), solde par
// contrat, heures saisies non imputées. Repris du SaaS isfectuteurs
// (ContratsParam.tsx). Cf. src/lib/contrats.ts.
import { Fragment, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
  FileDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'

import {
  ChampDate,
  ChampForm,
  ChampSelectTexte,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
} from '#/components/ChampsModale'
import MenuExporter from '#/components/MenuExporter'
import { Button } from '#/components/ui/button'
import { useConfirmation } from '#/components/ui/confirmation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  CONTRAT_TYPES,
  contratMd,
  fmtHeures,
  lignesContrat,
  nomFichierContrat,
} from '#/lib/contrats.helpers.ts'
import {
  deleteContratFn,
  listContratsFn,
  listTicketsContratFn,
  saveContratFn,
} from '#/lib/contrats.ts'
import { telecharger } from '#/lib/csv.ts'
import {
  STATUT_BADGE,
  TICKET_STATUTS,
  TICKET_TYPES,
  TYPE_BADGE,
} from '#/lib/tickets.defs.ts'
import { fmtDate } from '#/lib/utils.ts'

import type { ContratRow, ContratType } from '#/lib/contrats.helpers.ts'

const LIBELLES = { types: TICKET_TYPES, statuts: TICKET_STATUTS }
const TYPES = Object.values(CONTRAT_TYPES)
const typeDepuisLibelle = (l: string | null): ContratType =>
  l === CONTRAT_TYPES.avenant ? 'avenant' : 'contrat'

/** Panneau dépliant sous la ligne contrat : tickets imputés + exports. */
function ContratTickets({ contrat }: { contrat: ContratRow }) {
  const q = useQuery({
    queryKey: ['contrat-tickets', contrat.id],
    queryFn: () => listTicketsContratFn({ data: { id: contrat.id } }),
  })
  if (q.isLoading)
    return <Loader2 className="mx-auto my-2 animate-spin" size={17} />
  const tickets = q.data ?? []
  const exportMd = () =>
    telecharger(
      `${nomFichierContrat(contrat)}.md`,
      new Blob([contratMd(contrat, tickets, LIBELLES)], {
        type: 'text/markdown;charset=utf-8',
      }),
    )
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
          Tickets imputés ({tickets.length})
        </span>
        <span className="ml-auto" />
        <MenuExporter
          title="Exporter les tickets imputés"
          charger={() => ({
            nomFichier: nomFichierContrat(contrat),
            lignes: lignesContrat(tickets, LIBELLES),
          })}
        />
        <Button type="button" size="sm" variant="outline" onClick={exportMd}>
          <FileDown />
          Format md
        </Button>
      </div>
      {tickets.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-faded)]">
          Aucun ticket imputé.
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
              <th className="px-2 py-1 text-right">#</th>
              <th className="px-2 py-1">Type</th>
              <th className="px-2 py-1">Titre</th>
              <th className="px-2 py-1">Statut</th>
              <th className="px-2 py-1 text-right">Heures</th>
              <th className="px-2 py-1">Livré le</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-[var(--line-soft)]">
                <td className="px-2 py-1.5 text-right font-bold">{t.id}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${TYPE_BADGE[t.type]}`}
                  >
                    {TICKET_TYPES[t.type]}
                  </span>
                </td>
                <td className="max-w-[340px] truncate px-2 py-1.5">
                  {t.titre}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${STATUT_BADGE[t.statut]}`}
                  >
                    {TICKET_STATUTS[t.statut]}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">
                  {t.nbHeures != null ? fmtHeures(t.nbHeures) : '—'}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {fmtDate(t.dateLivraison)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

interface Form {
  id: number | null
  type: ContratType
  numRef: string
  dateSignature: string | null
  description: string
  nbHeuresFacturees: string
}

export function ContratsParam() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['contrats'],
    queryFn: () => listContratsFn(),
  })
  const rows = q.data?.rows ?? []
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['contrats'] })
    void qc.invalidateQueries({ queryKey: ['contrat-options'] })
  }
  const { confirmer, modale } = useConfirmation()

  const [form, setForm] = useState<Form | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const set = <TCle extends keyof Form>(k: TCle, v: Form[TCle]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f))

  const saveMut = useMutation({
    mutationFn: (f: Form) => saveContratFn({ data: f }),
    onSuccess: () => {
      setForm(null)
      refresh()
    },
  })
  const delMut = useMutation({
    mutationFn: (id: number) => deleteContratFn({ data: { id } }),
    onSuccess: refresh,
    onError: (e) =>
      confirmer({ titre: 'Suppression impossible', message: e.message }),
  })

  const totalFacture = rows.reduce((s, c) => s + c.nbHeuresFacturees, 0)
  const totalCalcule = rows.reduce((s, c) => s + c.nbHeuresCalcule, 0)
  const couleurSolde = (n: number) =>
    n < 0 ? 'text-[var(--danger)]' : 'text-emerald-700'

  return (
    <div className="space-y-4">
      {modale}
      <div className="flex items-center gap-3">
        <p className="text-[13px] text-[var(--ink-faded)]">
          Heures <b>facturées</b> = au contrat ; heures <b>calculées</b> = Σ des
          heures des tickets imputés (fiche ticket, panneau Qualification).
        </p>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          onClick={() => {
            saveMut.reset()
            setForm({
              id: null,
              type: 'contrat',
              numRef: '',
              dateSignature: null,
              description: '',
              nbHeuresFacturees: '',
            })
          }}
        >
          <Plus />
          Nouveau contrat / avenant
        </Button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-[var(--line)] bg-white">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--cream)] text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
              <th className="px-3.5 py-2.5">Type</th>
              <th className="px-3.5 py-2.5">N° réf.</th>
              <th className="px-3.5 py-2.5">Signé le</th>
              <th className="px-3.5 py-2.5">Description</th>
              <th className="px-3.5 py-2.5 text-right">H facturées</th>
              <th className="px-3.5 py-2.5 text-right">H calculées</th>
              <th className="px-3.5 py-2.5 text-right">Solde</th>
              <th className="w-[80px] px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr>
                <td colSpan={8} className="px-3.5 py-10 text-center">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3.5 py-10 text-center text-[var(--ink-faded)]"
                >
                  Aucun contrat — créez le premier avec « Nouveau contrat /
                  avenant ».
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const solde = c.nbHeuresFacturees - c.nbHeuresCalcule
                const open = openId === c.id
                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => setOpenId(open ? null : c.id)}
                      className="cursor-pointer border-b border-[var(--line-soft)] hover:bg-[var(--cream-hover)]"
                    >
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {open ? (
                          <ChevronDown size={14} className="mr-1 inline" />
                        ) : (
                          <ChevronRight size={14} className="mr-1 inline" />
                        )}
                        <span
                          className={`rounded px-2 py-0.5 text-[11.5px] font-bold ${
                            c.type === 'avenant'
                              ? 'bg-[var(--info-tint)] text-[var(--ink)]'
                              : 'bg-[var(--gold-tint)] text-[var(--gold-ink)]'
                          }`}
                        >
                          {CONTRAT_TYPES[c.type]}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold whitespace-nowrap">
                        {c.numRef}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {fmtDate(c.dateSignature)}
                      </td>
                      <td className="max-w-[320px] truncate px-3.5 py-2.5">
                        {c.description || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {fmtHeures(c.nbHeuresFacturees)}
                      </td>
                      <td
                        className="px-3.5 py-2.5 text-right whitespace-nowrap"
                        title={`${c.nbTickets} ticket(s) imputé(s)`}
                      >
                        {fmtHeures(c.nbHeuresCalcule)}
                        {c.nbTickets > 0 && (
                          <span className="text-[var(--ink-faded)]">
                            {' '}
                            ({c.nbTickets})
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-3.5 py-2.5 text-right font-bold whitespace-nowrap ${couleurSolde(solde)}`}
                      >
                        {fmtHeures(solde)}
                      </td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          title="Modifier"
                          className="cursor-pointer rounded p-1 text-[var(--ink-faded)] hover:bg-[var(--gold-tint)] hover:text-[var(--ink)]"
                          onClick={(e) => {
                            e.stopPropagation()
                            saveMut.reset()
                            setForm({
                              id: c.id,
                              type: c.type,
                              numRef: c.numRef,
                              dateSignature: c.dateSignature,
                              description: c.description,
                              nbHeuresFacturees: String(c.nbHeuresFacturees),
                            })
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          title="Supprimer"
                          className="cursor-pointer rounded p-1 text-[var(--ink-faded)] hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]"
                          onClick={(e) => {
                            e.stopPropagation()
                            confirmer({
                              titre: 'Supprimer',
                              message: `Supprimer ${
                                c.type === 'avenant'
                                  ? "l'avenant"
                                  : 'le contrat'
                              } ${c.numRef} ?`,
                              destructif: true,
                              action: () => delMut.mutate(c.id),
                            })
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-[var(--line-soft)]">
                        <td
                          colSpan={8}
                          className="bg-[var(--cream)]/60 px-4 py-3"
                        >
                          <ContratTickets contrat={c} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-[var(--line)] bg-[var(--cream)] font-bold">
                <td className="px-3.5 py-2.5" colSpan={4}>
                  Total
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  {fmtHeures(totalFacture)}
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  {fmtHeures(totalCalcule)}
                </td>
                <td
                  className={`px-3.5 py-2.5 text-right ${couleurSolde(totalFacture - totalCalcule)}`}
                >
                  {fmtHeures(totalFacture - totalCalcule)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {q.data && (
        <>
          <p
            className={`text-[13px] font-semibold ${
              q.data.heuresNonImputees > 0
                ? 'text-[var(--danger)]'
                : 'text-[var(--ink-faded)]'
            }`}
          >
            Heures non imputées : <b>{fmtHeures(q.data.heuresNonImputees)}</b>
            {q.data.ticketsNonImputes > 0 &&
              ` (${q.data.ticketsNonImputes} ticket(s) avec heures sans contrat)`}
            .
          </p>
          <p className="text-[13px] font-semibold text-[var(--ink-faded)]">
            Heures non imputables :{' '}
            <b>{fmtHeures(q.data.heuresNonImputables)}</b>
            {q.data.ticketsNonImputables > 0 &&
              ` (${q.data.ticketsNonImputables} ticket(s))`}
            .
          </p>
        </>
      )}

      <Dialog open={form != null} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {form.id == null
                  ? 'Nouveau contrat / avenant'
                  : 'Modifier le contrat / avenant'}
              </DialogTitle>
            </DialogHeader>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                saveMut.mutate(form)
              }}
            >
              <ChampSelectTexte
                libelle="Type"
                value={CONTRAT_TYPES[form.type]}
                onChange={(v) => set('type', typeDepuisLibelle(v))}
                options={TYPES}
              />
              <ChampTexte
                libelle="N° de référence"
                value={form.numRef}
                onChange={(v) => set('numRef', v)}
              />
              <ChampDate
                libelle="Date de signature"
                value={form.dateSignature}
                onChange={(v) => set('dateSignature', v)}
              />
              <ChampForm libelle="Heures facturées">
                <Input
                  inputMode="decimal"
                  placeholder="ex. 35"
                  value={form.nbHeuresFacturees}
                  onChange={(e) => set('nbHeuresFacturees', e.target.value)}
                  className="h-9 text-[13px]"
                />
              </ChampForm>
              <div className="col-span-2">
                <ChampTexteLong
                  libelle="Description"
                  value={form.description}
                  onChange={(v) => set('description', v)}
                />
              </div>
              <div className="col-span-2">
                <ErreurMutation erreur={saveMut.error} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm(null)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={saveMut.isPending}>
                  {saveMut.isPending && <Loader2 className="animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
