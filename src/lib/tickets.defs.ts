// Référentiels du suivi de tickets (libellés + couleurs des badges, charte
// Keredes), partagés client/serveur — repris du SaaS isfectuteurs
// (lib/ticket-defs.ts). Volontairement en dur : pas de référentiel paramétrable.

export const TICKET_TYPES = {
  bug: 'Bug',
  feature: 'Feature',
} as const
export type TicketType = keyof typeof TICKET_TYPES

export const TICKET_GRAVITES = {
  bloquante: 'Bloquante',
  majeure: 'Majeure',
  mineure: 'Mineure',
  confort: 'Confort',
} as const
export type TicketGravite = keyof typeof TICKET_GRAVITES

export const TICKET_STATUTS = {
  nouveau: 'Nouveau',
  confirme: 'Confirmé',
  en_cours: 'En cours',
  a_tester: 'À tester',
  livre: 'Livré',
  ferme: 'Fermé',
  rejete: 'Rejeté',
  doublon: 'Doublon',
} as const
export type TicketStatut = keyof typeof TICKET_STATUTS

/** Statuts « clos » (plus de complément par le déposeur, jauge à 100 si livré). */
export const TICKET_STATUTS_CLOS: Array<TicketStatut> = [
  'livre',
  'ferme',
  'rejete',
  'doublon',
]

/* Classes des badges — tokens charte (docs/charte.md). */
const NEUTRE = 'bg-[var(--paper)] text-[var(--ink-faded)]'

export const TYPE_BADGE: Record<TicketType, string> = {
  bug: 'bg-[var(--danger-tint)] text-[var(--danger)]',
  feature: 'bg-[var(--info-tint)] text-[var(--ink)]',
}

export const GRAVITE_BADGE: Record<TicketGravite, string> = {
  bloquante: 'bg-[var(--danger-tint)] text-[var(--danger)]',
  majeure: 'bg-[var(--gold-tint)] text-[var(--gold-ink)]',
  mineure: 'bg-[var(--info-tint)] text-[var(--ink)]',
  confort: NEUTRE,
}

export const STATUT_BADGE: Record<TicketStatut, string> = {
  nouveau: 'bg-[var(--danger-tint)] text-[var(--danger)]',
  confirme: 'bg-[var(--gold-tint)] text-[var(--gold-ink)]',
  en_cours: 'bg-[var(--info-tint)] text-[var(--ink)]',
  a_tester: 'bg-violet-50 text-violet-700',
  livre: 'bg-[var(--ok-tint)] text-emerald-800',
  ferme: NEUTRE,
  rejete: NEUTRE,
  doublon: NEUTRE,
}

/* ── Types renvoyés par les server fns (src/lib/tickets.ts) ── */

export interface TicketListItem {
  id: number
  type: TicketType
  gravite: TicketGravite
  titre: string
  pageConcernee: string
  statut: TicketStatut
  ticketDoublonId: number | null
  avancement: number
  dateLivraison: string | null
  creeParNom: string
  creeLe: string
  nbCommentaires: number
  nbCaptures: number
  /** Activité (création/commentaire/capture/statut) non lue par L'APPELANT. */
  nonLu: boolean
  archive: boolean
  /** Le dev attend une réponse ET l'appelant est le déposeur du ticket. */
  attenteMaReponse: boolean
  masqueNouveautes: boolean
  /** Livré par l'IA (posé en SQL direct) — masqué (false) hors Administrateur. */
  livreParIa: boolean
}

export interface TicketCommentaire {
  id: number
  auteurNom: string
  auteurEmail: string
  texte: string
  creeLe: string
  /** L'auteur est le dev (compte du service Administrateur) — chip « Dev » du fil. */
  estDev: boolean
}

export interface TicketCaptureMeta {
  id: number
  nomFichier: string
  mime: string
  taille: number
  auteurNom: string
  /** Courriel du déposant (droit de renommage côté client). */
  auteurEmail: string
  /** Libellé de renommage (affiché à la place du nom de fichier si non vide). */
  description: string
  /** Vignette data-URL (~220 px) pour le mini-aperçu. */
  miniature: string
  /** Réponse du fil à laquelle la capture est jointe (null = fiche). */
  commentaireId: number | null
}

export type TicketDetail = TicketListItem & {
  description: string
  creeParEmail: string
  majLe: string
  doublonTitre: string | null
  /** « Demande une réponse » posée par le dev (levée quand le déposeur répond). */
  attenteReponse: boolean
  commentaires: Array<TicketCommentaire>
  captures: Array<TicketCaptureMeta>
}

/** Une feature livrée, pour la page « Nouveautés » (changelog). */
export interface FeatureLivree {
  id: number
  titre: string
  description: string
  pageConcernee: string
  /** Groupe d'affichage — date de livraison (repli : dernière màj). */
  dateLivraison: string
}
