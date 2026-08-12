// Préférences d'interface par utilisateur : stockage en base (table user_pref),
// chargées une fois par le beforeLoad de _authed, lues et écrites par usePref.
// Pas de localStorage : la valeur serveur est là dès le rendu SSR.

import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { userPref } from '#/db/schema.ts'
import { requireSession } from '#/lib/session.server.ts'

const estObjetSimple = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Valeur effective d'une préférence. La fusion superficielle avec le défaut
 * comble les champs ajoutés au code après l'enregistrement de la préférence.
 */
export function resoudrePref<T>(stocke: unknown, defaut: T): T {
  if (stocke === undefined || stocke === null) return defaut
  if (estObjetSimple(defaut) && estObjetSimple(stocke)) {
    return { ...defaut, ...stocke } as T
  }
  return stocke as T
}

export type Prefs = Record<string, unknown>

export const LIMITE_CLE = 64
export const LIMITE_VALEUR = 20_000

/** Gardes de volume sur une entrée venue du client (l'userId, lui, vient de la session). */
export function verifierEntree(cle: string, valeur: unknown) {
  if (typeof cle !== 'string' || cle.length === 0 || cle.length > LIMITE_CLE) {
    throw new Error('Clé de préférence invalide')
  }
  let taille: number
  try {
    taille = JSON.stringify(valeur).length
  } catch {
    throw new Error('Préférence trop volumineuse')
  }
  if (taille > LIMITE_VALEUR) throw new Error('Préférence trop volumineuse')
}

// Toutes les préférences de l'utilisateur en une requête : quelques dizaines de
// lignes, chargées une fois par le beforeLoad de _authed.
export const getPrefsFn = createServerFn({
  method: 'GET',
  // Sortie faite de valeurs jsonb typées `unknown` (JSON arbitraire par
  // conception) : la validation statique du type de retour ne peut rien en
  // prouver, elle est désactivée ici (la garde runtime reste verifierEntree
  // côté écriture ; en lecture les valeurs viennent de nos propres lignes).
  strict: { output: false },
}).handler(async (): Promise<Prefs> => {
  const session = await requireSession()
  const lignes = await db
    .select({ cle: userPref.cle, valeur: userPref.valeur })
    .from(userPref)
    .where(eq(userPref.userId, session.user.id))
  return Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]))
})

export const setPrefFn = createServerFn({ method: 'POST' })
  .validator((data: { cle: string; valeur: unknown }) => {
    verifierEntree(data.cle, data.valeur)
    return data
  })
  .handler(async ({ data }) => {
    const session = await requireSession()
    await db
      .insert(userPref)
      .values({ userId: session.user.id, cle: data.cle, valeur: data.valeur })
      .onConflictDoUpdate({
        target: [userPref.userId, userPref.cle],
        set: { valeur: data.valeur, updatedAt: new Date() },
      })
  })
