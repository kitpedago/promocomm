// Écran « Alerte mail » (Paramètres → Système, service Administrateur) :
// configuration SMTP + adresses du développeur + relance quotidienne, et
// courriel de test. La notification elle-même est déclenchée par tickets.ts
// (createTicketFn → notifierTicketMail, cf. alerte-mail.server.ts).
import { createServerFn } from '@tanstack/react-start'

import {
  MAIL_KEYS,
  URL_BASE_KEY,
  parseAdresses,
} from '#/lib/alerte-mail.helpers.ts'
import {
  envoyerMail,
  readMailConfig,
  writeMailParam,
} from '#/lib/alerte-mail.server.ts'
import { requireAdmin } from '#/lib/session.server.ts'

export interface AlerteMailConfig {
  active: boolean
  relance: boolean
  destinataires: string // texte multi-lignes (adresses normalisées)
  expediteur: string
  serveur: string
  port: number
  login: string
  // Le mot de passe ne repart jamais vers le navigateur
  motDePasseDefini: boolean
  baseUrl: string
}

export const getAlerteMailConfigFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AlerteMailConfig> => {
    await requireAdmin()
    const c = await readMailConfig()
    return {
      active: c.active,
      relance: c.relance,
      destinataires: c.destinataires.join('\n'),
      expediteur: c.expediteur,
      serveur: c.serveur,
      port: c.port,
      login: c.login,
      motDePasseDefini: c.motDePasse !== '',
      baseUrl: c.baseUrl,
    }
  },
)

export const saveAlerteMailConfigFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      active?: boolean
      relance?: boolean
      destinataires?: string
      expediteur?: string
      serveur?: string
      port?: number
      login?: string
      motDePasse?: string
      baseUrl?: string
    }) => {
      const port = Math.floor(Number(d.port))
      return {
        active: d.active === true,
        relance: d.relance === true,
        // Re-normalisées à l'enregistrement (source unique de vérité)
        destinataires: parseAdresses(d.destinataires).join('\n'),
        expediteur: (d.expediteur ?? '').trim(),
        serveur: (d.serveur ?? '').trim(),
        port: port > 0 && port < 65536 ? port : 587,
        login: (d.login ?? '').trim(),
        motDePasse: d.motDePasse ?? '',
        baseUrl: (d.baseUrl ?? '').trim().replace(/\/+$/, ''),
      }
    },
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    await writeMailParam(MAIL_KEYS.active, data.active ? '1' : '0')
    await writeMailParam(MAIL_KEYS.relance, data.relance ? '1' : '0')
    await writeMailParam(MAIL_KEYS.destinataires, data.destinataires)
    await writeMailParam(MAIL_KEYS.expediteur, data.expediteur)
    await writeMailParam(MAIL_KEYS.serveur, data.serveur)
    await writeMailParam(MAIL_KEYS.port, String(data.port))
    await writeMailParam(MAIL_KEYS.login, data.login)
    // Champ vide = mot de passe conservé ; sans login, il n'a plus d'objet
    if (data.motDePasse || !data.login)
      await writeMailParam(MAIL_KEYS.motDePasse, data.login ? data.motDePasse : '')
    await writeMailParam(URL_BASE_KEY, data.baseUrl)
    return { ok: true }
  })

/** Envoie un courriel de test aux adresses configurées (vérifie SMTP + envoi). */
export const testAlerteMailFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: boolean; message: string }> => {
    await requireAdmin()
    const c = await readMailConfig()
    const r = await envoyerMail(
      c,
      "PromoComm : test d'alerte mail",
      'Si vous recevez ce message, la configuration SMTP est opérationnelle.',
    )
    if (!r.ok) return { ok: false, message: r.error ?? "Échec de l'envoi." }
    return {
      ok: true,
      message: `Courriel de test envoyé à ${c.destinataires.join(', ')}.`,
    }
  },
)
