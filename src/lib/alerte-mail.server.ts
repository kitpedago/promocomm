// Cœur « Alerte mail » par SMTP (server-only, sans createServerFn — importé
// par les handlers de tickets.ts / alerte-mail.ts sans faire fuir de code
// serveur dans le bundle navigateur). Transport repris d'isfectuteurs
// (server/mail.ts), adapté drizzle/app_param.
//
// Deux courriels au développeur (Paramètres → Système → Alerte mail) :
// « un ticket est publié » à la création, et la relance quotidienne des
// tickets non livrés. BEST-EFFORT : toute erreur est journalisée mais
// n'empêche JAMAIS la création du ticket.
import { and, asc, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import nodemailer from 'nodemailer'

import { db } from '#/db/index.ts'
import { appParam, ticket } from '#/db/schema.ts'
import {
  MAIL_KEYS,
  URL_BASE_KEY,
  configComplete,
  etiquetteTicket,
  lienTicket,
  parseAdresses,
  prochaineRelance,
  texteRelance,
} from '#/lib/alerte-mail.helpers.ts'
import { decryptSecret, encryptSecret, isSecretParam } from '#/lib/secrets.server.ts'
import { TICKET_STATUTS_CLOS } from '#/lib/tickets.defs.ts'

import type { MailConfig } from '#/lib/alerte-mail.helpers.ts'

/** Lit la config Alerte mail (secret déchiffré, clés absentes tolérées). */
export async function readMailConfig(): Promise<MailConfig> {
  const keys = [...Object.values(MAIL_KEYS), URL_BASE_KEY]
  const rows = await db
    .select({ param: appParam.param, valeur: appParam.valeur })
    .from(appParam)
    .where(inArray(appParam.param, keys))
  const m = new Map(rows.map((r) => [r.param, r.valeur]))
  const get = (k: string) => m.get(k) ?? ''
  return {
    active: get(MAIL_KEYS.active) === '1',
    relance: get(MAIL_KEYS.relance) === '1',
    destinataires: parseAdresses(get(MAIL_KEYS.destinataires)),
    expediteur: get(MAIL_KEYS.expediteur),
    serveur: get(MAIL_KEYS.serveur),
    port: Number(get(MAIL_KEYS.port)) || 587,
    login: get(MAIL_KEYS.login),
    motDePasse: decryptSecret(get(MAIL_KEYS.motDePasse)),
    // Valeur enregistrée telle quelle (vide = repli sur BETTER_AUTH_URL à
    // l'envoi, cf. lienTicket) : pas de défaut figé qui finirait en base.
    baseUrl: get(URL_BASE_KEY).replace(/\/+$/, ''),
  }
}

/** Écrit une clé de config (chiffre les secrets au repos). */
export async function writeMailParam(param: string, valeur: string): Promise<void> {
  const v = isSecretParam(param) ? encryptSecret(valeur) : valeur
  await db
    .insert(appParam)
    .values({ param, valeur: v })
    .onConflictDoUpdate({ target: appParam.param, set: { valeur: v } })
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** Envoie UN courriel texte aux destinataires configurés. Ne lève pas. */
export async function envoyerMail(
  c: MailConfig,
  objet: string,
  texte: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!configComplete(c))
    return { ok: false, error: 'Configuration SMTP incomplète.' }
  if (c.destinataires.length === 0)
    return { ok: false, error: 'Aucun destinataire valide.' }
  const secure = c.port === 465
  try {
    await nodemailer
      .createTransport({
        host: c.serveur,
        port: c.port,
        secure,
        // identifiants jamais envoyés en clair : STARTTLS exigé dès qu'il y a
        // un login (un relais interne sans authentification reste possible)
        requireTLS: !secure && !!c.login,
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 60_000,
        auth: c.login ? { user: c.login, pass: c.motDePasse } : undefined,
      })
      .sendMail({
        from: c.expediteur,
        to: c.destinataires,
        subject: objet,
        text: texte,
      })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: `SMTP : ${errMsg(e)}` }
  }
}

/**
 * Notifie par courriel la publication d'un ticket, si l'alerte est active.
 * BEST-EFFORT : n'importe quelle erreur (config absente, SMTP KO, réseau) est
 * journalisée et avalée — la création du ticket ne doit jamais échouer à cause
 * du courriel.
 */
export async function notifierTicketMail(t: {
  id: number
  type: string
  gravite: string
  titre: string
  description: string
  page: string
  auteur: string
}): Promise<void> {
  try {
    const c = await readMailConfig()
    if (!c.active) return
    // Lien direct : ouvre la fiche du ticket (deep-link ?ticket= de /tickets).
    const lien = lienTicket(c.baseUrl, process.env.BETTER_AUTH_URL, t.id)
    const r = await envoyerMail(
      c,
      `PromoComm : ${etiquetteTicket(t)} — ${t.titre}`,
      [
        `Déposé par ${t.auteur}`,
        t.page && `Page concernée : ${t.page}`,
        t.description && `\n${t.description}`,
        lien && `\n${lien}`,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    if (!r.ok) console.error('[alerte-mail] envoi alerte:', r.error)
  } catch (e) {
    console.error('[alerte-mail] notifierTicketMail:', errMsg(e))
  }
}

/**
 * Relance : un courriel listant les tickets non clos, non archivés, déposés
 * avant aujourd'hui (celui du jour vient d'être notifié). Rien à relancer =
 * pas de courriel. Ne lève pas.
 */
export async function relancerTickets(): Promise<void> {
  try {
    const c = await readMailConfig()
    if (!c.active || !c.relance) return
    const tickets = await db
      .select({
        id: ticket.id,
        type: ticket.type,
        gravite: ticket.gravite,
        titre: ticket.titre,
        statut: ticket.statut,
        creeParNom: ticket.creeParNom,
        creeLe: sql<string>`to_char(${ticket.creeLe}, 'DD/MM/YYYY')`,
      })
      .from(ticket)
      .where(
        and(
          notInArray(ticket.statut, TICKET_STATUTS_CLOS),
          isNull(ticket.archiveLe),
          sql`${ticket.creeLe} < current_date`,
        ),
      )
      .orderBy(asc(ticket.id))
    if (tickets.length === 0) return
    const n = tickets.length
    const r = await envoyerMail(
      c,
      `PromoComm : ${n} ticket${n > 1 ? 's' : ''} non livré${n > 1 ? 's' : ''}`,
      texteRelance(tickets, (id) =>
        lienTicket(c.baseUrl, process.env.BETTER_AUTH_URL, id),
      ),
    )
    if (!r.ok) console.error('[alerte-mail] relance:', r.error)
  } catch (e) {
    console.error('[alerte-mail] relancerTickets:', errMsg(e))
  }
}

// Un seul timer par processus, y compris sous HMR.
const g = globalThis as { __relance?: ReturnType<typeof setTimeout> }

/**
 * Au démarrage : arme la relance quotidienne (setTimeout chaîné). L'activation
 * est relue en base à chaque passage : pas de réarmement à l'enregistrement.
 */
// ponytail: serveur arrêté à l'heure de la relance = pas de relance ce
// jour-là ; mémoriser la date du dernier envoi si un rattrapage est voulu
export function planifierRelance(depuis = new Date()) {
  if (g.__relance) clearTimeout(g.__relance)
  g.__relance = setTimeout(() => {
    const maintenant = new Date()
    void relancerTickets()
    planifierRelance(maintenant)
  }, prochaineRelance(depuis).getTime() - depuis.getTime())
  g.__relance.unref()
}
