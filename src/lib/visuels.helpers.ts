// Helpers purs de la recherche de visuels d'opération sur keredes.coop
// (slugification, extraction HTML) — testés dans visuels.helpers.test.ts.
// Le réseau est dans visuels.server.ts.
import { sansAccents } from '#/lib/utils.ts'

/** « L'Orée du TER » → « l-oree-du-ter » (forme des slugs WordPress du site). */
export function slugifier(libelle: string): string {
  return sansAccents(libelle)
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Slugs `bien-neuf/<slug>/` d'une page liste, dédupliqués, ordre d'apparition. */
export function extraireSlugs(html: string): Array<string> {
  return [
    ...new Set(
      [...html.matchAll(/bien-neuf\/([a-z0-9-]+)\//g)].map((m) => m[1]),
    ),
  ]
}

/** Meilleur slug pour un libellé : exact, « contient » sans tirets, sinon
 *  tous les mots (≥ 3 lettres) présents — couvre « COUR LAWRENCE » →
 *  cours-lawrence. */
export function trouverSlug(
  libelle: string,
  slugs: Array<string>,
): string | null {
  const s = slugifier(libelle)
  if (!s) return null
  if (slugs.includes(s)) return s
  const compact = s.replace(/-/g, '')
  const parContenu = slugs.find((x) => {
    const c = x.replace(/-/g, '')
    return c.includes(compact) || compact.includes(c)
  })
  if (parContenu) return parContenu
  const mots = s.split('-').filter((m) => m.length >= 3)
  return mots.length > 0
    ? (slugs.find((x) => mots.every((m) => x.includes(m))) ?? null)
    : null
}

/* Variante srcset la plus large ≤ 1280w (assez grande pour le bandeau,
   bien sous le plafond de 3 Mo), sinon le src d'origine. */
function meilleureVariante(tag: string): string | null {
  const src = /src="([^"]+)"/.exec(tag)?.[1] ?? null
  const srcset = /srcset="([^"]+)"/.exec(tag)?.[1]
  if (!srcset) return src
  let choix: { url: string; w: number } | null = null
  for (const entree of srcset.split(',')) {
    const m = /^\s*(\S+)\s+(\d+)w\s*$/.exec(entree)
    if (m && Number(m[2]) <= 1280 && (!choix || Number(m[2]) > choix.w))
      choix = { url: m[1], w: Number(m[2]) }
  }
  return choix?.url ?? src
}

/** URLs de la galerie d'une page programme (class estateImages__image). */
export function extraireImagesProgramme(html: string): Array<string> {
  const urls = [...html.matchAll(/<img[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /class="[^"]*estateImages__image[^"]*"/.test(tag))
    .map(meilleureVariante)
    .filter((u): u is string => !!u)
  return [...new Set(urls)]
}
