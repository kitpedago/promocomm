import { drizzle } from 'drizzle-orm/node-postgres'

import { modeBaseCourant, urlProd } from '#/lib/dbmode.server.ts'

import * as schema from './schema.ts'

const instances = new Map<string, ReturnType<typeof creer>>()
const creer = (url: string) => drizzle(url, { schema })

function instance(url: string) {
  let i = instances.get(url)
  if (!i) {
    i = creer(url)
    instances.set(url, i)
  }
  return i
}

/**
 * Base locale, toujours. Réservée à ce qui ne doit PAS suivre la bascule
 * dev/prod : authentification et préférences (cf. dbmode.server.ts).
 */
export const dbLocale = instance(process.env.DATABASE_URL!)

/**
 * Base métier de la requête en cours. Proxy plutôt qu'instance figée : la
 * bascule dev/prod porte sur les ~20 modules qui importent `db`, sans les
 * toucher. Les méthodes sont liées à l'instance réelle (drizzle appelle ses
 * propres champs via `this`).
 */
export const db: typeof dbLocale = new Proxy(dbLocale, {
  get(_cible, prop, recepteur) {
    const url = modeBaseCourant() === 'prod' ? urlProd() : undefined
    const reelle = url ? instance(url) : dbLocale
    const valeur = Reflect.get(reelle, prop, recepteur)
    return typeof valeur === 'function' ? valeur.bind(reelle) : valeur
  },
})

// Base miroir aux noms SQL Server : rafraîchie à intervalle si MIROIR_DB est
// définie (miroir.server.ts). Import différé : ce module n'en dépend pas.
// MIROIR_AUTO=0 : posé par les scripts (npm run db:miroir), qui pilotent le
// miroir eux-mêmes et ne veulent pas d'un passage concurrent au démarrage.
if (process.env.MIROIR_DB && process.env.MIROIR_AUTO !== '0') {
  void import('#/lib/miroir.server.ts').then((m) => m.planifierMiroir())
}
