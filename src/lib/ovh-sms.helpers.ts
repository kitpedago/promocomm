// Helpers purs de l'Alerte SMS OVH (normalisation des numéros, portée du
// déclencheur, clés de config) — partagés client/serveur, testés dans
// ovh-sms.helpers.test.ts. Repris d'isfectuteurs (server/ovh-sms.ts).

/** Clés `app_param` de la config Alerte SMS. */
export const SMS_KEYS = {
  active: 'OVH_SMS_Active', // "1" = alertes actives
  applicationKey: 'OVH_SMS_ApplicationKey',
  applicationSecret: 'OVH_SMS_ApplicationSecret', // chiffré (…Secret)
  consumerKey: 'OVH_SMS_ConsumerKey', // chiffré (ConsumerKey)
  serviceName: 'OVH_SMS_ServiceName', // ex. sms-xx1234-1
  expediteur: 'OVH_SMS_Expediteur', // sender enregistré chez OVH (optionnel)
  destinataires: 'OVH_SMS_Destinataires', // numéros FR (lignes/CSV)
  portee: 'OVH_SMS_Portee', // tous | grave | bugfeature
} as const

/** Clé `app_param` de l'URL publique (liens des SMS). */
export const URL_BASE_KEY = 'URLBasePublique'
export const BASE_URL_DEFAUT = 'http://10.66.66.1:3020'

/** Portées possibles du déclencheur (quels tickets envoient un SMS). */
export type SmsPortee = 'tous' | 'grave' | 'bugfeature'
const PORTEES: Array<SmsPortee> = ['tous', 'grave', 'bugfeature']
export function normPortee(v: string | null | undefined): SmsPortee {
  return PORTEES.includes(v as SmsPortee) ? (v as SmsPortee) : 'tous'
}

export interface SmsConfig {
  active: boolean
  applicationKey: string
  applicationSecret: string
  consumerKey: string
  serviceName: string
  expediteur: string
  destinataires: Array<string> // normalisés +33…
  portee: SmsPortee
  baseUrl: string // URL publique (sans slash final), pour le lien du ticket
}

/** Normalise un numéro FR en format international OVH (+33…). "" si invalide. */
export function normReceiver(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (/^\+33[1-9]\d{8}$/.test(s.replace(/\s/g, ''))) return s.replace(/\s/g, '')
  const d = s.replace(/\D/g, '')
  if (/^0033[1-9]\d{8}$/.test(d)) return '+33' + d.slice(4)
  if (/^33[1-9]\d{8}$/.test(d)) return '+33' + d.slice(2)
  if (/^0[1-9]\d{8}$/.test(d)) return '+33' + d.slice(1)
  return '' // numéro non FR / atypique : ignoré (jamais deviné)
}

/** Découpe un CSV de numéros (virgule, point-virgule ou saut de ligne). */
export function parseDestinataires(csv: string | null | undefined): Array<string> {
  return (csv ?? '')
    .split(/[,;\n\r]+/)
    .map((x) => normReceiver(x))
    .filter((x, i, a) => x && a.indexOf(x) === i)
}

/** Config OVH complète (identifiants + service) ? (sinon envoi impossible). */
export function configComplete(c: SmsConfig): boolean {
  return Boolean(
    c.applicationKey && c.applicationSecret && c.consumerKey && c.serviceName,
  )
}

/** Un ticket doit-il déclencher un SMS pour cette portée ? */
export function ticketDeclencheSms(
  portee: SmsPortee,
  type: string,
  gravite: string,
): boolean {
  if (type === 'feature') return portee === 'bugfeature'
  // type bug :
  if (portee === 'grave') return gravite === 'bloquante' || gravite === 'majeure'
  return true // « tous » et « bugfeature » alertent tous les bugs
}
