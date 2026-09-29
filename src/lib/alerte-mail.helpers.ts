// Helpers purs de l'Alerte mail (adresses, clés de config, lien du ticket,
// textes des courriels, heure de relance) — partagés client/serveur, testés
// dans alerte-mail.helpers.test.ts.
import { TICKET_STATUTS } from '#/lib/tickets.defs.ts'

/** Clés `app_param` de la config Alerte mail. */
export const MAIL_KEYS = {
  active: 'Mail_Active', // "1" = alertes actives
  relance: 'Mail_Relance', // "1" = relance quotidienne des tickets non livrés
  destinataires: 'Mail_Destinataires', // adresses du développeur (lignes/CSV)
  expediteur: 'Email_Expediteur',
  serveur: 'SMTP_Server',
  port: 'SMTP_Port',
  login: 'SMTP_Login', // vide = relais sans authentification
  motDePasse: 'SMTP_MotDePasse', // chiffré (…MotDePasse)
} as const

/** Clé `app_param` de l'URL publique (liens des courriels). Vide = BETTER_AUTH_URL. */
export const URL_BASE_KEY = 'URLBasePublique'

/** Heure locale du serveur (TZ Europe/Paris en prod) de la relance quotidienne. */
export const HEURE_RELANCE = 8

export interface MailConfig {
  active: boolean
  relance: boolean
  destinataires: Array<string>
  expediteur: string
  serveur: string
  port: number
  login: string
  motDePasse: string
  baseUrl: string // URL publique (sans slash final), pour le lien du ticket ; '' = repli BETTER_AUTH_URL
}

/** Découpe une liste d'adresses (virgule, point-virgule ou saut de ligne). */
export function parseAdresses(csv: string | null | undefined): Array<string> {
  return (csv ?? '')
    .split(/[,;\n\r]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x, i, a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x) && a.indexOf(x) === i)
}

/** Config SMTP suffisante pour envoyer ? */
export function configComplete(c: MailConfig): boolean {
  return Boolean(c.serveur && c.expediteur)
}

/**
 * Lien vers la fiche du ticket : URL publique configurée, sinon `repli`
 * (BETTER_AUTH_URL), sinon '' — jamais de lien mort dans un courriel.
 */
export function lienTicket(
  baseUrl: string,
  repli: string | undefined,
  id: number,
): string {
  const base = (baseUrl || repli || '').replace(/\/+$/, '')
  return base ? `${base}/tickets?ticket=${id}` : ''
}

/** « Bug [majeure] #12 » — la gravité ne concerne que les bugs. */
export function etiquetteTicket(t: {
  id: number
  type: string
  gravite: string
}): string {
  return t.type === 'feature'
    ? `Feature #${t.id}`
    : `Bug [${t.gravite}] #${t.id}`
}

export interface TicketRelance {
  id: number
  type: string
  gravite: string
  titre: string
  statut: string
  creeParNom: string
  creeLe: string // jj/mm/aaaa
}

/** Corps de la relance : un bloc par ticket non livré. */
export function texteRelance(
  tickets: Array<TicketRelance>,
  lien: (id: number) => string,
): string {
  return tickets
    .map((t) => {
      // statut non validé en base (pas de CHECK) : valeur brute en repli
      const statut =
        (TICKET_STATUTS as Record<string, string | undefined>)[t.statut] ??
        t.statut
      const l = lien(t.id)
      return (
        `${etiquetteTicket(t)} — ${statut} — ${t.titre}\n` +
        `  déposé le ${t.creeLe} par ${t.creeParNom}` +
        (l ? `\n  ${l}` : '')
      )
    })
    .join('\n\n')
}

/** Prochaine relance strictement après `depuis` : HEURE_RELANCE, heure locale. */
export function prochaineRelance(depuis: Date): Date {
  const d = new Date(depuis)
  d.setHours(HEURE_RELANCE, 0, 0, 0)
  // marge d'une minute : un timer déclenché quelques ms trop tôt ne doit pas
  // se réarmer sur le même jour (relance en double)
  if (d.getTime() <= depuis.getTime() + 60_000) d.setDate(d.getDate() + 1)
  return d
}
