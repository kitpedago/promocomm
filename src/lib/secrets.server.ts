// Chiffrement au repos des SECRETS de `app_param` (identifiants OVH SMS…) :
// AES-256-GCM, clé dérivée d'un secret d'ENVIRONNEMENT (jamais en base) — un
// dump BDD seul est inexploitable. Rétro-compatible (une valeur en clair
// héritée est lue telle quelle) et idempotent (ne re-chiffre pas une valeur
// déjà chiffrée). Repris d'isfectuteurs (server/secrets.ts).
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

const PREFIX = 'enc:v1:'

/** Clé AES-256 (32 o) dérivée du secret d'env, ou null si aucun secret configuré. */
function key(): Buffer | null {
  const s = process.env.APP_SECRETS_KEY || process.env.BETTER_AUTH_SECRET || ''
  return s ? createHash('sha256').update(s).digest() : null
}

/** Un paramètre porte-t-il un secret à chiffrer ? (nom de clé `param`). */
export function isSecretParam(param: string): boolean {
  return /Secret|ConsumerKey|MotDePasse|Password|Token/i.test(param)
}

/**
 * Chiffre une valeur secrète (AES-256-GCM). Idempotent (valeur déjà `enc:` →
 * inchangée) ; dégradation sûre : sans clé ou valeur vide, renvoie le clair
 * (ne casse pas l'écriture — cf. rétro-compat de decryptSecret).
 */
export function encryptSecret(plain: string): string {
  if (!plain || plain.startsWith(PREFIX)) return plain
  const k = key()
  if (!k) return plain
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64')
}

/**
 * Déchiffre si la valeur est chiffrée (préfixe `enc:`), sinon la renvoie telle
 * quelle (rétro-compat : valeurs héritées en clair). Renvoie "" si chiffré
 * mais indéchiffrable (pas de clé / altération).
 */
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return ''
  if (!stored.startsWith(PREFIX)) return stored
  const k = key()
  if (!k) return ''
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const enc = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', k, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      'utf8',
    )
  } catch {
    return ''
  }
}
