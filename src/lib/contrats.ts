// Contrats & avenants (Paramètres > Système, service Administrateur = le dev)
// + imputation des heures des tickets — repris du SaaS isfectuteurs
// (server/contrats.fn.ts). « H calculées » d'un contrat = Σ ticket.nb_heures
// imputées (jamais stocké) ; « heures non imputées » = Σ des tickets avec
// heures mais sans contrat — pour ne rien oublier de facturer.
import { createServerFn } from '@tanstack/react-start'
import { desc, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { contrat, ticket } from '#/db/schema.ts'
import { normaliserContrat } from '#/lib/contrats.helpers.ts'
import { requireAdmin } from '#/lib/session.server.ts'

import type {
  ContratRow,
  ContratTicketRow,
  ContratType,
} from '#/lib/contrats.helpers.ts'
import type { TicketStatut, TicketType } from '#/lib/tickets.defs.ts'

export interface ContratsResult {
  rows: Array<ContratRow>
  /** Σ heures des tickets AVEC heures mais SANS contrat. */
  heuresNonImputees: number
  ticketsNonImputes: number
  /** Σ ticket.heures_non_imputables (heures passées, non facturables). */
  heuresNonImputables: number
  ticketsNonImputables: number
}

// Sous-requêtes corrélées en SQL littéral qualifié : drizzle rendrait
// `"contrat_id" = "id"` sans préfixe de table (= ticket.id, toujours faux)
const heuresCalculees = sql<number>`coalesce((select sum(t.nb_heures) from ticket t where t.contrat_id = contrat.id), 0)::float8`

const colonnes = {
  id: contrat.id,
  type: sql<ContratType>`${contrat.type}`,
  numRef: contrat.numRef,
  dateSignature: contrat.dateSignature,
  description: contrat.description,
  nbHeuresFacturees: contrat.nbHeuresFacturees,
  nbHeuresCalcule: heuresCalculees,
  nbTickets: sql<number>`(select count(*)::int from ticket t where t.contrat_id = contrat.id)`,
}

export const listContratsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ContratsResult> => {
    await requireAdmin()
    const [rows, [ni]] = await Promise.all([
      db
        .select(colonnes)
        .from(contrat)
        .orderBy(
          sql`${contrat.dateSignature} desc nulls last`,
          desc(contrat.id),
        ),
      db
        .select({
          h: sql<number>`coalesce(sum(${ticket.nbHeures}) filter (where ${ticket.contratId} is null), 0)::float8`,
          n: sql<number>`count(*) filter (where ${ticket.nbHeures} is not null and ${ticket.contratId} is null)::int`,
          hni: sql<number>`coalesce(sum(${ticket.heuresNonImputables}), 0)::float8`,
          nni: sql<number>`count(*) filter (where ${ticket.heuresNonImputables} > 0)::int`,
        })
        .from(ticket),
    ])
    return {
      rows,
      heuresNonImputees: ni.h,
      ticketsNonImputes: ni.n,
      heuresNonImputables: ni.hni,
      ticketsNonImputables: ni.nni,
    }
  },
)

export const saveContratFn = createServerFn({ method: 'POST' })
  .validator(normaliserContrat)
  .handler(async ({ data }): Promise<{ id: number }> => {
    await requireAdmin()
    const valeurs = {
      type: data.type,
      numRef: data.numRef,
      dateSignature: data.dateSignature,
      description: data.description,
      nbHeuresFacturees: data.nbHeuresFacturees,
    }
    const rows =
      data.id == null
        ? await db.insert(contrat).values(valeurs).returning({ id: contrat.id })
        : await db
            .update(contrat)
            .set(valeurs)
            .where(eq(contrat.id, data.id))
            .returning({ id: contrat.id })
    if (!rows.length) throw new Error('Contrat introuvable.')
    return rows[0]
  })

export const deleteContratFn = createServerFn({ method: 'POST' })
  .validator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(ticket)
      .where(eq(ticket.contratId, data.id))
    if (n > 0)
      throw new Error(
        `${n} ticket(s) imputé(s) sur ce contrat : réimputez-les d'abord.`,
      )
    const rows = await db
      .delete(contrat)
      .where(eq(contrat.id, data.id))
      .returning({ id: contrat.id })
    if (!rows.length) throw new Error('Contrat introuvable.')
    return { ok: true }
  })

/** Tickets imputés sur un contrat (panneau dépliant + exports). */
export const listTicketsContratFn = createServerFn({ method: 'GET' })
  .validator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }): Promise<Array<ContratTicketRow>> => {
    await requireAdmin()
    return db
      .select({
        id: ticket.id,
        type: sql<TicketType>`${ticket.type}`,
        titre: ticket.titre,
        statut: sql<TicketStatut>`${ticket.statut}`,
        nbHeures: ticket.nbHeures,
        dateLivraison: ticket.dateLivraison,
      })
      .from(ticket)
      .where(eq(ticket.contratId, data.id))
      .orderBy(sql`${ticket.dateLivraison} desc nulls last`, desc(ticket.id))
  })

/** Options du combo « Imputation contrat » de la fiche ticket :
 *  libellé = type + n° réf + solde restant (facturées − imputées). */
export const getContratOptionsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<{ id: number; libelle: string }>> => {
    await requireAdmin()
    const rows = await db
      .select({
        id: contrat.id,
        type: sql<ContratType>`${contrat.type}`,
        numRef: contrat.numRef,
        solde: sql<number>`(${contrat.nbHeuresFacturees} - ${heuresCalculees})::float8`,
      })
      .from(contrat)
      .orderBy(sql`${contrat.dateSignature} desc nulls last`, desc(contrat.id))
    return rows.map((r) => ({
      id: r.id,
      libelle: `${r.type === 'avenant' ? 'Avenant' : 'Contrat'} ${r.numRef} — solde ${r.solde.toLocaleString('fr-FR')} h`,
    }))
  },
)
