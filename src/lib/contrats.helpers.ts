// Contrats & avenants — logique pure (validation de la fiche, export md),
// testable sans base. Cf. contrats.ts.
import type { TicketStatut, TicketType } from '#/lib/tickets.defs.ts'

export type ContratType = 'contrat' | 'avenant'

export const CONTRAT_TYPES: Record<ContratType, string> = {
  contrat: 'Contrat',
  avenant: 'Avenant',
}

export interface ContratRow {
  id: number
  type: ContratType
  numRef: string
  /** AAAA-MM-JJ — null si non signé. */
  dateSignature: string | null
  description: string
  nbHeuresFacturees: number
  /** Σ ticket.nb_heures des tickets imputés (calculé, jamais stocké). */
  nbHeuresCalcule: number
  nbTickets: number
}

export interface ContratTicketRow {
  id: number
  type: TicketType
  titre: string
  statut: TicketStatut
  nbHeures: number | null
  dateLivraison: string | null
}

export interface ContratSaisie {
  id: number | null
  type: ContratType
  numRef: string
  dateSignature: string | null
  description: string
  nbHeuresFacturees: number
}

/** Normalise la saisie brute du formulaire ; lève un message utilisateur si invalide. */
export function normaliserContrat(d: {
  id?: number | null
  type?: string
  numRef?: string
  dateSignature?: string | null
  description?: string
  nbHeuresFacturees?: string | number | null
}): ContratSaisie {
  const numRef = (d.numRef ?? '').trim().slice(0, 100)
  if (!numRef) throw new Error('Le n° de référence est requis.')
  const dateSignature = (d.dateSignature ?? '').trim() || null
  if (dateSignature && !/^\d{4}-\d{2}-\d{2}$/.test(dateSignature))
    throw new Error('Date de signature invalide.')
  const h = Number(String(d.nbHeuresFacturees ?? '0').replace(',', '.'))
  if (!Number.isFinite(h) || h < 0)
    throw new Error('Heures facturées invalides (nombre ≥ 0).')
  return {
    id: d.id ? Number(d.id) : null,
    type: d.type === 'avenant' ? 'avenant' : 'contrat',
    numRef,
    dateSignature,
    description: (d.description ?? '').trim(),
    nbHeuresFacturees: h,
  }
}

export const fmtHeures = (n: number) =>
  `${n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} h`

const fmtJour = (iso: string | null) => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'
}

/** Nom de fichier d'export sans extension. */
export const nomFichierContrat = (c: ContratRow) =>
  `${c.type}-${c.numRef.replace(/[^\w.-]+/g, '_')}`

/** Lignes (en-têtes incluses) de l'export Excel / CSV d'un contrat. */
export function lignesContrat(
  tickets: Array<ContratTicketRow>,
  libelles: { types: Record<string, string>; statuts: Record<string, string> },
): Array<Array<unknown>> {
  return [
    ['#', 'Type', 'Titre', 'Statut', 'Heures', 'Livré le'],
    ...tickets.map((t) => [
      t.id,
      libelles.types[t.type] ?? t.type,
      t.titre,
      libelles.statuts[t.statut] ?? t.statut,
      t.nbHeures,
      fmtJour(t.dateLivraison),
    ]),
  ]
}

/** Markdown du contrat + tickets imputés. */
export function contratMd(
  c: ContratRow,
  tickets: Array<ContratTicketRow>,
  libelles: { types: Record<string, string>; statuts: Record<string, string> },
): string {
  const esc = (s: string) => s.replace(/[|]/g, '\\|').replace(/\n+/g, ' ')
  const solde = c.nbHeuresFacturees - c.nbHeuresCalcule
  const lignes = [
    `# ${CONTRAT_TYPES[c.type]} ${c.numRef}`,
    '',
    `- Signé le : ${fmtJour(c.dateSignature)}`,
    ...(c.description ? [`- Description : ${esc(c.description)}`] : []),
    `- Heures facturées : ${fmtHeures(c.nbHeuresFacturees)} — imputées : ${fmtHeures(c.nbHeuresCalcule)} — solde : ${fmtHeures(solde)}`,
    '',
    `## Tickets imputés (${tickets.length})`,
    '',
    ...(tickets.length === 0
      ? ['Aucun ticket imputé.']
      : [
          '| # | Type | Titre | Statut | Heures | Livré le |',
          '| ---: | --- | --- | --- | ---: | --- |',
          ...tickets.map(
            (t) =>
              `| ${t.id} | ${libelles.types[t.type] ?? t.type} | ${esc(t.titre)} | ${
                libelles.statuts[t.statut] ?? t.statut
              } | ${t.nbHeures != null ? fmtHeures(t.nbHeures) : '—'} | ${fmtJour(t.dateLivraison)} |`,
          ),
        ]),
  ]
  return lignes.join('\n') + '\n'
}
