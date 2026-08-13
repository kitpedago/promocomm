// Préférences d'interface par utilisateur : stockage en base (table user_pref),
// chargées une fois par le beforeLoad de _authed, lues et écrites par usePref.
// Pas de localStorage : la valeur serveur est là dès le rendu SSR.

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { useEffect } from 'react'

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
    return { ...defaut, ...stocke }
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

export const CLE_PREFS = ['prefs'] as const

// Une minuterie par clé : un glissement de colonne émet des dizaines
// d'événements onChange et ne doit produire qu'un seul UPDATE.
const minuteries = new Map<string, ReturnType<typeof setTimeout>>()

function pousser(cle: string, valeur: unknown) {
  clearTimeout(minuteries.get(cle))
  minuteries.set(
    cle,
    setTimeout(() => {
      minuteries.delete(cle)
      // échec avalé : la session reste correcte, seule la persistance est
      // perdue — pas de bandeau d'erreur pour une largeur de colonne
      void setPrefFn({ data: { cle, valeur } }).catch(() => {})
    }, 500),
  )
}

/**
 * Préférence mémorisée par utilisateur. Lecture depuis le cache alimenté par le
 * beforeLoad de _authed (jamais de fetch ici), écriture optimiste puis push
 * serveur en debounce.
 */
export function usePref<T>(
  cle: string,
  defaut: T,
): [T, (v: T | ((prec: T) => T)) => void] {
  const queryClient = useQueryClient()
  // `select` : chaque observateur ne suit que sa propre clé. Sans lui, tous
  // suivent l'objet racine que `setQueryData` remplace — une frappe dans la
  // recherche du volet re-rendrait toutes les tables de la page.
  const { data } = useQuery({
    queryKey: CLE_PREFS,
    queryFn: () => getPrefsFn(),
    staleTime: Infinity,
    select: (p: Prefs) => p[cle],
  })
  const valeur = resoudrePref(data, defaut)

  const ecrire = (v: T | ((prec: T) => T)) => {
    const prec = queryClient.getQueryData<Prefs>(CLE_PREFS)
    const courant = resoudrePref(prec?.[cle], defaut)
    const suivant = typeof v === 'function' ? (v as (p: T) => T)(courant) : v
    queryClient.setQueryData<Prefs>(CLE_PREFS, { ...prec, [cle]: suivant })
    pousser(cle, suivant)
  }

  return [valeur, ecrire]
}

/** Opération et tranche courantes, partagées par tous les modules (fil conducteur WinDev). */
export interface Selection {
  op?: number
  tranche?: number
}

export const SELECTION_VIDE: Selection = {}

// identifiants de la base : entiers positifs, jamais 0 (clé auto-incrémentée)
const estIdPositif = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0

/**
 * Sélection à rejouer dans l'URL au chargement d'une page (Opérations,
 * Commercialisation), ou `undefined` si rien à faire.
 *
 * `op` doit être un entier positif : `{ op: 0 }` est atteignable (verifierEntree
 * ne contrôle pas la forme de `valeur`) et, sans ce garde-fou, produirait une
 * redirection vers `?op=0` que validateSearch (qui teste la véracité de
 * `s.op`) réduit aussitôt à `undefined` — rejouant la même redirection à
 * l'infini. Ne pas simplifier cette condition en `selection?.op != null`.
 */
export function selectionARejouer(
  prefs: Prefs,
  searchOp: number | undefined,
): Selection | undefined {
  if (searchOp != null) return undefined
  const selection = prefs.selection
  if (!estObjetSimple(selection)) return undefined
  const { op, tranche } = selection
  if (!estIdPositif(op)) return undefined
  return { op, tranche: typeof tranche === 'number' ? tranche : undefined }
}

/**
 * Sélection à mémoriser quand l'URL porte une opération — un lien partagé
 * `?op=99` l'emporte et devient la sélection mémorisée.
 *
 * Rend `undefined` quand il n'y a rien à écrire : sans cette égalité, l'effet
 * qui l'appelle écrirait à chaque rendu. Pas de boucle avec la redirection de
 * `selectionARejouer` : celle-ci ne part que si l'URL n'a pas d'`op`, et ici on
 * n'écrit que si elle en a une — on ne touche jamais à l'URL.
 */
export function selectionAMemoriser(
  memorisee: Selection,
  op: number | undefined,
  tranche: number | undefined,
): Selection | undefined {
  if (op == null) return undefined
  // même opération, tranche pas encore connue (requête en cours) : ne pas
  // écraser la tranche mémorisée — sinon elle est effacée à chaque visite, et
  // perdue pour de bon si la requête échoue avant d'aboutir.
  if (
    memorisee.op === op &&
    (tranche === undefined || memorisee.tranche === tranche)
  )
    return undefined
  return { op, tranche }
}

/**
 * Aligne la sélection mémorisée sur l'URL. Seul écrivain de la clé
 * `selection` : les pages n'ont qu'à naviguer, la mémorisation suit. Écrire
 * aussi dans les gestionnaires de clic serait sans effet — l'effet, qui voit
 * encore l'URL d'avant, y reviendrait au rendu suivant.
 */
export function useMemoriserSelection(
  op: number | undefined,
  tranche: number | undefined,
) {
  const [selection, setSelection] = usePref<Selection>(
    'selection',
    SELECTION_VIDE,
  )
  const aMemoriser = selectionAMemoriser(selection, op, tranche)
  useEffect(() => {
    if (aMemoriser) setSelection(aMemoriser)
  })
}
