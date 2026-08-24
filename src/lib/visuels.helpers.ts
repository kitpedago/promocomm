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

/** URLs `<loc>` d'un sitemap XML WordPress. */
export function extraireLocs(xml: string): Array<string> {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

/** Slugs `…/section/<slug>/` parmi des URLs de sitemap (racine exclue). */
export function slugsDeSection(
  urls: Array<string>,
  section: string,
): Array<string> {
  const re = new RegExp(`/${section}/([a-z0-9-]+)/?$`)
  return [
    ...new Set(
      urls
        .map((u) => re.exec(u)?.[1])
        .filter((s): s is string => !!s),
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

/** URLs des images d'une page, filtrées par classes CSS — l'ordre des
 *  classes donne la priorité (hero avant galerie), dédupliqué. */
export function extraireImagesProgramme(
  html: string,
  classes: Array<string> = ['estateImages__image'],
): Array<string> {
  const tags = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0])
  const urls: Array<string> = []
  for (const classe of classes)
    for (const tag of tags) {
      if (!new RegExp(`class="[^"]*${classe}[^"]*"`).test(tag)) continue
      const u = meilleureVariante(tag)
      if (u) urls.push(u)
    }
  return [...new Set(urls)]
}
