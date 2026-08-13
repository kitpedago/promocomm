// Écran « Alerte SMS » (Paramètres → Système, service Administrateur) :
// configuration de l'API OVH SMS + numéros destinataires + portée du
// déclencheur, et SMS de test. La notification elle-même est déclenchée par
// tickets.ts (createTicketFn → notifierTicketSms, cf. ovh-sms.server.ts).
// Repris d'isfectuteurs (server/alerte-sms.fn.ts).
import { createServerFn } from '@tanstack/react-start'

import {
  SMS_KEYS,
  URL_BASE_KEY,
  configComplete,
  normPortee,
  parseDestinataires,
} from '#/lib/ovh-sms.helpers.ts'
import { envoyerSms, readSmsConfig, writeSmsParam } from '#/lib/ovh-sms.server.ts'
import { requireAdmin } from '#/lib/session.server.ts'

import type { SmsPortee } from '#/lib/ovh-sms.helpers.ts'

export interface AlerteSmsConfig {
  active: boolean
  applicationKey: string
  applicationSecret: string
  consumerKey: string
  serviceName: string
  expediteur: string
  destinataires: string // texte multi-lignes (numéros normalisés)
  portee: SmsPortee
  baseUrl: string
  configComplete: boolean
}

export const getAlerteSmsConfigFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AlerteSmsConfig> => {
    await requireAdmin()
    const c = await readSmsConfig()
    return {
      active: c.active,
      applicationKey: c.applicationKey,
      applicationSecret: c.applicationSecret,
      consumerKey: c.consumerKey,
      serviceName: c.serviceName,
      expediteur: c.expediteur,
      destinataires: c.destinataires.join('\n'),
      portee: c.portee,
      baseUrl: c.baseUrl,
      configComplete: configComplete(c),
    }
  },
)

export const saveAlerteSmsConfigFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      active?: boolean
      applicationKey?: string
      applicationSecret?: string
      consumerKey?: string
      serviceName?: string
      expediteur?: string
      destinataires?: string
      portee?: string
      baseUrl?: string
    }) => ({
      active: d.active === true,
      applicationKey: (d.applicationKey ?? '').trim(),
      applicationSecret: (d.applicationSecret ?? '').trim(),
      consumerKey: (d.consumerKey ?? '').trim(),
      serviceName: (d.serviceName ?? '').trim(),
      expediteur: (d.expediteur ?? '').trim(),
      // Re-normalisés à l'enregistrement (source unique de vérité)
      destinataires: parseDestinataires(d.destinataires).join('\n'),
      portee: normPortee(d.portee),
      baseUrl: (d.baseUrl ?? '').trim().replace(/\/+$/, ''),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    await requireAdmin()
    await writeSmsParam(SMS_KEYS.active, data.active ? '1' : '0')
    await writeSmsParam(SMS_KEYS.applicationKey, data.applicationKey)
    await writeSmsParam(SMS_KEYS.applicationSecret, data.applicationSecret)
    await writeSmsParam(SMS_KEYS.consumerKey, data.consumerKey)
    await writeSmsParam(SMS_KEYS.serviceName, data.serviceName)
    await writeSmsParam(SMS_KEYS.expediteur, data.expediteur)
    await writeSmsParam(SMS_KEYS.destinataires, data.destinataires)
    await writeSmsParam(SMS_KEYS.portee, data.portee)
    await writeSmsParam(URL_BASE_KEY, data.baseUrl)
    return { ok: true }
  })

/** Envoie un SMS de test aux numéros configurés (vérifie identifiants + envoi). */
export const testAlerteSmsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: boolean; message: string }> => {
    await requireAdmin()
    const c = await readSmsConfig()
    if (!configComplete(c))
      return {
        ok: false,
        message:
          'Configuration OVH incomplète (clé applicative, secret, clé consommateur et service SMS requis).',
      }
    if (c.destinataires.length === 0)
      return { ok: false, message: 'Aucun numéro destinataire valide.' }
    const r = await envoyerSms(
      c,
      "PromoComm : test d'alerte SMS. Si vous recevez ce message, la configuration OVH est opérationnelle.",
      c.destinataires,
    )
    if (!r.ok) return { ok: false, message: r.error ?? "Échec de l'envoi." }
    const n = r.validCount ?? c.destinataires.length
    const refus = r.invalidReceivers?.length
      ? ` (refusé(s) par OVH : ${r.invalidReceivers.join(', ')})`
      : ''
    const credits =
      typeof r.total === 'number' ? ` — ${r.total} crédit(s) utilisé(s)` : ''
    return {
      ok: true,
      message: `SMS de test pris en charge par OVH pour ${n} numéro${
        n > 1 ? 's' : ''
      }${credits}${refus}.`,
    }
  },
)
