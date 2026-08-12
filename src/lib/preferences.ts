// Préférences d'interface par utilisateur : stockage en base (table user_pref),
// chargées une fois par le beforeLoad de _authed, lues et écrites par usePref.
// Pas de localStorage : la valeur serveur est là dès le rendu SSR.

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
