// Cœur « Alerte SMS » via l'API OVH SMS (server-only, sans createServerFn —
// importé par les handlers de tickets.ts / alerte-sms.ts sans faire fuir de
// code serveur dans le bundle navigateur). Repris d'isfectuteurs
// (server/ovh-sms.ts), adapté drizzle/app_param.
//
// Notification transactionnelle « un ticket est publié » : à la création d'un
// ticket, on prévient par SMS les numéros configurés (Paramètres → Système →
// Alerte SMS). BEST-EFFORT : toute erreur est journalisée mais n'empêche
// JAMAIS la création du ticket.
import { createHash } from 'node:crypto'
import { inArray } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { appParam } from '#/db/schema.ts'
import {
  SMS_KEYS,
  URL_BASE_KEY,
  configComplete,
  lienTicket,
  normPortee,
  parseDestinataires,
  ticketDeclencheSms,
} from '#/lib/ovh-sms.helpers.ts'
import { decryptSecret, encryptSecret, isSecretParam } from '#/lib/secrets.server.ts'

import type { SmsConfig } from '#/lib/ovh-sms.helpers.ts'

/** Point d'entrée régional de l'API OVH (Europe). */
const OVH_ENDPOINT = 'https://eu.api.ovh.com/1.0'

/** Lit la config Alerte SMS (secrets déchiffrés, clés absentes tolérées). */
export async function readSmsConfig(): Promise<SmsConfig> {
  const keys = [...Object.values(SMS_KEYS), URL_BASE_KEY]
  const rows = await db
    .select({ param: appParam.param, valeur: appParam.valeur })
    .from(appParam)
    .where(inArray(appParam.param, keys))
  const m = new Map(rows.map((r) => [r.param, r.valeur]))
  const get = (k: string) => m.get(k) ?? ''
  // Valeur enregistrée telle quelle (vide = repli sur BETTER_AUTH_URL à
  // l'envoi, cf. lienTicket) : pas de défaut figé qui finirait en base.
  const baseUrl = get(URL_BASE_KEY).replace(/\/+$/, '')
  return {
    active: get(SMS_KEYS.active) === '1',
    applicationKey: get(SMS_KEYS.applicationKey),
    applicationSecret: decryptSecret(get(SMS_KEYS.applicationSecret)),
    consumerKey: decryptSecret(get(SMS_KEYS.consumerKey)),
    serviceName: get(SMS_KEYS.serviceName),
    expediteur: get(SMS_KEYS.expediteur),
    destinataires: parseDestinataires(get(SMS_KEYS.destinataires)),
    portee: normPortee(get(SMS_KEYS.portee)),
    baseUrl,
  }
}

/** Écrit une clé de config (chiffre les secrets au repos). */
export async function writeSmsParam(param: string, valeur: string): Promise<void> {
  const v = isSecretParam(param) ? encryptSecret(valeur) : valeur
  await db
    .insert(appParam)
    .values({ param, valeur: v })
    .onConflictDoUpdate({ target: appParam.param, set: { valeur: v } })
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
/**
 * Envoie UN SMS aux `receivers` via l'API OVH SMS (requête signée). Ne lève
 * pas : toute erreur est capturée et renvoyée.
 *
 * Signature OVH : "$1$" + sha1(AS + "+" + CK + "+" + METHOD + "+" + URL + "+"
 * + BODY + "+" + TIMESTAMP). Le timestamp est repris du serveur OVH
 * (/auth/time) pour immuniser contre la dérive d'horloge de l'hôte.
 */
export interface EnvoiSmsResult {
  ok: boolean
  error?: string
  total?: number // crédits retirés (totalCreditsRemoved)
  validCount?: number // destinataires réellement pris en charge par OVH
  invalidReceivers?: Array<string> // destinataires refusés par OVH
}

export async function envoyerSms(
  c: SmsConfig,
  message: string,
  receivers: Array<string>,
): Promise<EnvoiSmsResult> {
  if (!configComplete(c))
    return { ok: false, error: 'Configuration OVH incomplète.' }
  if (receivers.length === 0)
    return { ok: false, error: 'Aucun destinataire valide.' }

  let timestamp: string
  try {
    const t = await fetch(`${OVH_ENDPOINT}/auth/time`)
    timestamp = (await t.text()).trim()
    if (!/^\d+$/.test(timestamp))
      timestamp = String(Math.floor(Date.now() / 1000))
  } catch {
    timestamp = String(Math.floor(Date.now() / 1000))
  }

  const url = `${OVH_ENDPOINT}/sms/${encodeURIComponent(c.serviceName)}/jobs`
  const payload: Record<string, unknown> = {
    charset: 'UTF-8',
    coding: '7bit',
    message,
    noStopClause: true, // message de service (non commercial) → pas de mention STOP
    priority: 'high',
    receivers,
  }
  if (c.expediteur) payload.sender = c.expediteur
  else payload.senderForResponse = true // sinon OVH refuse sans expéditeur
  const body = JSON.stringify(payload)

  const toSign = [
    c.applicationSecret,
    c.consumerKey,
    'POST',
    url,
    body,
    timestamp,
  ].join('+')
  const signature = '$1$' + createHash('sha1').update(toSign).digest('hex')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': c.applicationKey,
        'X-Ovh-Consumer': c.consumerKey,
        'X-Ovh-Timestamp': timestamp,
        'X-Ovh-Signature': signature,
      },
      body,
    })
    const text = await res.text()
    if (!res.ok) {
      let msg = text
      try {
        msg = (JSON.parse(text) as { message?: string }).message ?? text
      } catch {
        /* corps non JSON : conservé tel quel */
      }
      return { ok: false, error: `OVH ${res.status} : ${msg}` }
    }
    // HTTP 2xx = OVH a ACCEPTÉ la requête, mais peut n'avoir RIEN envoyé :
    // destinataire refusé (invalidReceivers) ou crédit insuffisant
    // (totalCreditsRemoved: 0, aucun ids). L'info est dans le CORPS, pas dans
    // le statut HTTP → on l'inspecte pour ne pas annoncer un faux succès.
    let parsed: {
      ids?: Array<unknown>
      validReceivers?: Array<unknown>
      invalidReceivers?: Array<unknown>
      totalCreditsRemoved?: number
    } = {}
    try {
      parsed = (JSON.parse(text) ?? {}) as typeof parsed
    } catch {
      // Réponse 2xx sans corps JSON exploitable : on ne peut ni confirmer ni
      // infirmer la livraison → considéré comme abouti (comportement isfec).
      return { ok: true }
    }
    const ids = Array.isArray(parsed.ids) ? parsed.ids : []
    const valid = Array.isArray(parsed.validReceivers)
      ? (parsed.validReceivers as Array<string>)
      : []
    const invalid = Array.isArray(parsed.invalidReceivers)
      ? (parsed.invalidReceivers as Array<string>)
      : []
    const total =
      typeof parsed.totalCreditsRemoved === 'number'
        ? parsed.totalCreditsRemoved
        : undefined

    // Rien n'est parti : aucun job créé ET aucun destinataire valide.
    if (ids.length === 0 && valid.length === 0) {
      const raison = invalid.length
        ? `destinataire(s) refusé(s) par OVH : ${invalid.join(', ')}`
        : total === 0
          ? 'crédit SMS insuffisant (0 crédit retiré)'
          : "OVH n'a créé aucun envoi (vérifiez expéditeur/service et crédits)"
      return {
        ok: false,
        error: `Envoi non abouti — ${raison}.`,
        total,
        invalidReceivers: invalid,
      }
    }
    // Abouti (éventuellement partiel : certains destinataires refusés).
    return {
      ok: true,
      total,
      validCount: valid.length || ids.length,
      invalidReceivers: invalid.length ? invalid : undefined,
    }
  } catch (e) {
    return { ok: false, error: errMsg(e) }
  }
}

/**
 * Notifie par SMS la publication d'un ticket, si l'alerte est active et que la
 * portée configurée le prévoit. BEST-EFFORT : n'importe quelle erreur (config
 * absente, OVH KO, réseau) est journalisée et avalée — la création du ticket
 * ne doit jamais échouer à cause du SMS.
 */
export async function notifierTicketSms(t: {
  id: number
  type: string
  gravite: string
  titre: string
  auteur?: string
}): Promise<void> {
  try {
    const c = await readSmsConfig()
    if (!c.active) return
    if (!ticketDeclencheSms(c.portee, t.type, t.gravite)) return
    if (!configComplete(c) || c.destinataires.length === 0) return

    const label = t.type === 'feature' ? 'Feature' : 'Bug'
    const grav = t.type === 'bug' ? ` [${t.gravite}]` : ''
    const par = t.auteur ? ` — ${t.auteur}` : ''
    const titre = t.titre.length > 90 ? t.titre.slice(0, 87) + '…' : t.titre
    // Lien direct : ouvre la fiche du ticket (deep-link ?ticket= de /tickets).
    const lien = lienTicket(c.baseUrl, process.env.BETTER_AUTH_URL, t.id)
    const message =
      `PromoComm : ${label}${grav} #${t.id}${par}\n${titre}` +
      (lien ? `\n${lien}` : '')

    const r = await envoyerSms(c, message, c.destinataires)
    if (!r.ok) console.error('[ovh-sms] envoi alerte:', r.error)
    else if (r.invalidReceivers?.length)
      console.warn(
        '[ovh-sms] alerte partielle — destinataires refusés :',
        r.invalidReceivers.join(', '),
      )
  } catch (e) {
    console.error('[ovh-sms] notifierTicketSms:', errMsg(e))
  }
}
