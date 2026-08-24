// Recherche et téléchargement de visuels d'opération sur keredes.coop.
// Scraping HTML léger (l'API REST WordPress du site est bloquée — 401).
// Serveur uniquement. Helpers purs et testés : visuels.helpers.ts.
import { db } from '#/db/index.ts'
import { operationVisuel } from '#/db/schema.ts'
import { CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'
import {
  extraireImagesProgramme,
  extraireLocs,
  slugifier,
  slugsDeSection,
  trouverSlug,
} from '#/lib/visuels.helpers.ts'

const BASE = 'https://keredes.coop'

// Sources par ordre de préférence : programmes en vente (rendus 3D), puis
// réalisations (livrées), puis actualités (photos de livraison — couvre les
// opérations dont la page bien-neuf a été retirée, ex. ALDEA). Les slugs
// viennent des sitemaps WordPress (seule énumération publique : l'API REST
// est bloquée).
const SOURCES = [
  {
    section: 'bien-neuf',
    sitemap: 'bien-neuf-sitemap.xml',
    classes: ['estateImages__image'],
  },
  {
    section: 'realisations',
    sitemap: 'realisations-sitemap.xml',
    classes: ['realisationsHero__picture__image', 'baseGallery__image'],
  },
  {
    section: 'actualites',
    sitemap: 'news-sitemap.xml',
    classes: ['newsHero__image', 'baseGallery__image'],
  },
] as const

// Cache mémoire des slugs par section (~120 URLs en tout) — 1 h
let cacheSlugs: {
  parSection: Map<string, Array<string>>
  expire: number
} | null = null

async function chargerSlugs(): Promise<Map<string, Array<string>>> {
  if (cacheSlugs && cacheSlugs.expire > Date.now()) return cacheSlugs.parSection
  const parSection = new Map<string, Array<string>>()
  for (const src of SOURCES) {
    const rep = await fetch(`${BASE}/${src.sitemap}`, {
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null)
    if (!rep?.ok) continue
    parSection.set(
      src.section,
      slugsDeSection(extraireLocs(await rep.text()), src.section),
    )
  }
  if (parSection.size > 0)
    cacheSlugs = { parSection, expire: Date.now() + 3_600_000 }
  return parSection
}

/* Page d'une section : 200 = existe, 301 = retirée — d'où redirect:'manual'. */
async function pageSection(
  section: string,
  slug: string,
): Promise<string | null> {
  const rep = await fetch(`${BASE}/${section}/${slug}/`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  })
  return rep.status === 200 ? rep.text() : null
}

/** URLs candidates pour un libellé, sources par ordre de préférence. */
export async function chercherCandidats(
  libelle: string,
): Promise<Array<string>> {
  const parSection = await chargerSlugs().catch(
    () => new Map<string, Array<string>>(),
  )
  for (const src of SOURCES) {
    const essais = [
      ...new Set(
        [
          trouverSlug(libelle, parSection.get(src.section) ?? []),
          // le sitemap peut être en retard : tentative directe par slug exact
          src.section === 'bien-neuf' ? slugifier(libelle) || null : null,
        ].filter((s): s is string => !!s),
      ),
    ]
    for (const slug of essais) {
      const html = await pageSection(src.section, slug).catch(() => null)
      if (!html) continue
      const images = extraireImagesProgramme(html, [...src.classes])
      if (images.length > 0) return images
    }
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
