// Recherche et téléchargement de visuels d'opération sur keredes.coop.
// Scraping HTML léger (l'API REST WordPress du site est bloquée — 401).
// Serveur uniquement. Helpers purs et testés : visuels.helpers.ts.
import { db } from '#/db/index.ts'
import { operationVisuel } from '#/db/schema.ts'
import { CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'
import {
  extraireImagesProgramme,
  extraireSlugs,
  slugifier,
  trouverSlug,
} from '#/lib/visuels.helpers.ts'

const BASE = 'https://keredes.coop'
const LISTE_URL = `${BASE}/achat/biens/?type%5B%5D=bien-neuf`

// Cache mémoire de la liste des programmes (~34 slugs) — 1 h
let cacheSlugs: { slugs: Array<string>; expire: number } | null = null

async function chargerSlugs(): Promise<Array<string>> {
  if (cacheSlugs && cacheSlugs.expire > Date.now()) return cacheSlugs.slugs
  const rep = await fetch(LISTE_URL, { signal: AbortSignal.timeout(10_000) })
  if (!rep.ok) throw new Error(`keredes.coop injoignable (HTTP ${rep.status})`)
  const slugs = extraireSlugs(await rep.text())
  cacheSlugs = { slugs, expire: Date.now() + 3_600_000 }
  return slugs
}

/* Page programme : 200 = existe, 301 vers /achat/neuf/ = programme retiré
   (livré) — d'où redirect:'manual'. */
async function pageProgramme(slug: string): Promise<string | null> {
  const rep = await fetch(`${BASE}/bien-neuf/${slug}/`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  })
  return rep.status === 200 ? rep.text() : null
}

/** URLs candidates pour un libellé : match dans la liste, sinon slug direct. */
export async function chercherCandidats(
  libelle: string,
): Promise<Array<string>> {
  const slugs = await chargerSlugs().catch(() => [])
  const essais = [
    ...new Set(
      [trouverSlug(libelle, slugs), slugifier(libelle) || null].filter(
        (s): s is string => !!s,
      ),
    ),
  ]
  for (const slug of essais) {
    const html = await pageProgramme(slug).catch(() => null)
    if (!html) continue
    const images = extraireImagesProgramme(html)
    if (images.length > 0) return images
  }
  return []
}

/** Télécharge une image keredes.coop (anti-SSRF : domaine imposé), ≤ 3 Mo. */
export async function telechargerImage(
  url: string,
): Promise<{ contenu: Buffer; mime: string; taille: number }> {
  const u = new URL(url)
  if (u.hostname !== 'keredes.coop' && u.hostname !== 'www.keredes.coop')
    throw new Error('URL hors keredes.coop refusée.')
  const rep = await fetch(u, {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  })
  if (!rep.ok)
    throw new Error(`Téléchargement impossible (HTTP ${rep.status}).`)
  const mime = (rep.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!mime.startsWith('image/'))
    throw new Error('Le lien ne pointe pas vers une image.')
  const contentLength = rep.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > CAPTURE_MAX_OCTETS)
    throw new Error('Image trop lourde (3 Mo maximum).')
  const contenu = Buffer.from(await rep.arrayBuffer())
  if (contenu.byteLength > CAPTURE_MAX_OCTETS)
    throw new Error('Image trop lourde (3 Mo maximum).')
  return { contenu, mime, taille: contenu.byteLength }
}

/** Auto/backfill : 1ᵉʳ candidat stocké, silencieux. true si stocké. */
export async function chercherEtStockerVisuel(
  operationId: number,
  libelle: string,
): Promise<boolean> {
  const candidats = await chercherCandidats(libelle)
  if (candidats.length === 0) return false
  try {
    const { contenu, mime, taille } = await telechargerImage(candidats[0])
    await db
      .insert(operationVisuel)
      .values({ operationId, contenu, mime, taille, source: candidats[0] })
      .onConflictDoNothing()
    return true
  } catch {
    return false
  }
}
