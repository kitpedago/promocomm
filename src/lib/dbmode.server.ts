// Bascule dev/prod de la base *métier* consultée par l'application
// (bandeau + bouton dans l'en-tête, service Administrateur uniquement).
// Transposé du mode « base de test » du SaaS ISFEC.
//
// Ce qui NE bascule PAS : l'authentification et les préférences, qui restent
// sur la base locale (cf. dbLocale dans src/db/index.ts) — sinon basculer sur
// la prod couperait la session et rendrait le bouton de retour inatteignable.
import { createHmac, timingSafeEqual } from 'node:crypto'

import { getCookie } from '@tanstack/react-start/server'

export type ModeBase = 'dev' | 'prod'

export const COOKIE_MODE = 'db_mode'

/** La bascule n'existe que si une base de prod est configurée (dev local). */
export const urlProd = () => process.env.PROD_DATABASE_URL

function signature(mode: string) {
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET ?? '')
    .update(mode)
    .digest('hex')
}

export const valeurSignee = (mode: ModeBase) => `${mode}.${signature(mode)}`

/**
 * Mode porté par le cookie. Signé : un `db_mode=prod` forgé par un utilisateur
 * sans droits ne doit pas lui ouvrir la production. Toute valeur douteuse
 * retombe sur `dev` — le mode sans risque.
 */
export function modeDepuisCookie(valeur: string | undefined): ModeBase {
  if (!valeur) return 'dev'
  const sep = valeur.lastIndexOf('.')
  if (sep <= 0) return 'dev'
  if (valeur.slice(0, sep) !== 'prod') return 'dev'
  const fournie = Buffer.from(valeur.slice(sep + 1))
  const attendue = Buffer.from(signature('prod'))
  if (fournie.length !== attendue.length) return 'dev'
  return timingSafeEqual(fournie, attendue) ? 'prod' : 'dev'
}

/**
 * Mode de la requête en cours. Hors requête (scripts tsx, drizzle-kit) et sans
 * base de prod configurée : `dev`.
 */
export function modeBaseCourant(): ModeBase {
  if (!urlProd()) return 'dev'
  try {
    return modeDepuisCookie(getCookie(COOKIE_MODE))
  } catch {
    return 'dev'
  }
}
