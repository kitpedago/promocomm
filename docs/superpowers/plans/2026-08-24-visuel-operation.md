# Visuel d'opération — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Associer un visuel à chaque opération — recherche sur keredes.coop (auto à la création, backfill, choix par fiche), upload manuel en secours, miniature dans le volet Opérations.

**Architecture:** Table `operation_visuel` hors domaine (survit au réimport .bak, **sans FK** vers `operation`). Scraping HTML de keredes.coop côté serveur (liste des slugs `bien-neuf/<slug>/` puis galerie `estateImages__image`). Helpers purs testés dans `visuels.helpers.ts`, réseau dans `visuels.server.ts`, server fns dans `visuels.ts`. Miniature générée côté client (canvas) — nulle au départ pour l'auto/backfill, régénérée au premier affichage de la fiche (lazy).

**Tech Stack:** TanStack Start (`createServerFn`), Drizzle + Postgres 16, TanStack Query, vitest. Aucune dépendance nouvelle.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-08-24-visuel-operation-design.md`.
- Plafond image : réutiliser `CAPTURE_MAX_OCTETS` (3 Mo) de `#/lib/tickets.helpers.ts`.
- Téléchargement serveur limité au domaine `keredes.coop` (anti-SSRF : l'URL vient du client).
- Textes UI en français, style charte existant (`var(--ink)`, `var(--cream)`…).
- Alias d'import : `#/*` = `./src/*`. Tests : `npm test` (vitest). Lint : `npm run lint`.
- Jamais renvoyer le bytea dans les listes — la colonne `miniature` seule.
- Commits : préfixes `feat(operations):` etc., co-author Claude.

---

### Task 1 : Table `operation_visuel` + migration

**Files:**
- Modify: `src/db/schema.ts` (après le bloc `ticketLecture`, fin de fichier)
- Create: `drizzle/0027_*.sql` (généré)

**Interfaces:**
- Produces: export Drizzle `operationVisuel` (colonnes `id, operationId, contenu, mime, taille, miniature, source, creeLe`), importable via `#/db/schema.ts`.

- [ ] **Step 1 : Ajouter la table dans `src/db/schema.ts`**

À la fin du fichier (le type `bytea` est déjà défini ligne ~55) :

```ts
// Visuel d'une opération (image trouvée sur keredes.coop ou téléversée).
// Hors domaine.ts : survit aux réimports .bak. PAS de FK vers operation :
// le TRUNCATE … CASCADE du transform emporterait ces lignes ; les IDs
// legacy sont stables d'un réimport à l'autre.
// Cf. docs/superpowers/specs/2026-08-24-visuel-operation-design.md.
export const operationVisuel = pgTable('operation_visuel', {
  id: serial().primaryKey(),
  operationId: integer('operation_id').notNull().unique(),
  contenu: bytea().notNull(),
  mime: text().notNull().default('image/jpeg'),
  taille: integer().notNull().default(0),
  // Vignette data-URL ~220 px générée côté client ('' = à régénérer)
  miniature: text().notNull().default(''),
  // URL d'origine keredes.coop, ou 'upload'
  source: text().notNull().default(''),
  creeLe: timestamp('cree_le').defaultNow().notNull(),
})
```

- [ ] **Step 2 : Générer et appliquer la migration**

Run: `npm run db:generate` puis `npm run db:migrate`
Expected: nouveau fichier `drizzle/0027_*.sql` contenant `CREATE TABLE "operation_visuel"` avec `operation_id integer NOT NULL UNIQUE`, migration appliquée sans erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(operations): table operation_visuel (hors domaine, sans FK)"
```

---

### Task 2 : Helpers purs de scraping (TDD)

**Files:**
- Create: `src/lib/visuels.helpers.ts`
- Test: `src/lib/visuels.helpers.test.ts`

**Interfaces:**
- Consumes: `sansAccents` de `#/lib/utils.ts`.
- Produces:
  - `slugifier(libelle: string): string`
  - `extraireSlugs(html: string): Array<string>`
  - `trouverSlug(libelle: string, slugs: Array<string>): string | null`
  - `extraireImagesProgramme(html: string): Array<string>` (URLs dédupliquées, variante srcset ≤ 1280w préférée)

- [ ] **Step 1 : Écrire les tests (échec attendu)**

`src/lib/visuels.helpers.test.ts` :

```ts
import { describe, expect, it } from 'vitest'

import {
  extraireImagesProgramme,
  extraireSlugs,
  slugifier,
  trouverSlug,
} from '#/lib/visuels.helpers.ts'

describe('slugifier', () => {
  it('minuscules, sans accents, tirets', () => {
    expect(slugifier('L’Orée du TER')).toBe('l-oree-du-ter')
    expect(slugifier('ALBATROS')).toBe('albatros')
    expect(slugifier('  Cœur Sancé — Rennes ')).toBe('coeur-sance-rennes')
  })
  it('vide si rien d’exploitable', () => {
    expect(slugifier(' — ')).toBe('')
  })
})

describe('extraireSlugs', () => {
  it('déduplique les slugs bien-neuf', () => {
    const html = `<a href="https://keredes.coop/bien-neuf/switch/">x</a>
      <a href="/bien-neuf/switch/">y</a>
      <a href="https://keredes.coop/bien-neuf/les-partitions/">z</a>`
    expect(extraireSlugs(html)).toEqual(['switch', 'les-partitions'])
  })
})

describe('trouverSlug', () => {
  const slugs = ['switch', 'chemin-des-alouettes', 'loree-du-ter', 'cours-lawrence']
  it('correspondance exacte', () => {
    expect(trouverSlug('SWITCH', slugs)).toBe('switch')
  })
  it('« contient » sans tirets, dans les deux sens', () => {
    expect(trouverSlug('L’Orée du TER', slugs)).toBe('loree-du-ter')
    expect(trouverSlug('COUR LAWRENCE', slugs)).toBe('cours-lawrence')
  })
  it('null si aucun candidat', () => {
    expect(trouverSlug('ALBATROS', slugs)).toBeNull()
    expect(trouverSlug('', slugs)).toBeNull()
  })
})

describe('extraireImagesProgramme', () => {
  // Structure réelle observée sur keredes.coop/bien-neuf/switch/ (2026-08)
  const html = `
    <img width="1600" src="https://keredes.coop/app/uploads/2026/07/Switch-Lorient.png"
      class="estateImages__image" srcset="https://keredes.coop/app/uploads/2026/07/Switch-Lorient.png 1600w,
      https://keredes.coop/app/uploads/2026/07/Switch-Lorient-300x200.png 300w,
      https://keredes.coop/app/uploads/2026/07/Switch-Lorient-1024x681.png 1024w" />
    <img src="https://keredes.coop/app/themes/keredes/logo.svg" class="header__logo" />
    <img width="1600" src="https://keredes.coop/app/uploads/2026/07/Switch-Lorient.png"
      class="newsHero__image" />
    <img src="https://keredes.coop/app/uploads/2026/07/Switch-2.png" class="estateImages__image" />`
  it('classe estateImages__image seulement, variante srcset ≤ 1280w préférée, dédupliqué', () => {
    expect(extraireImagesProgramme(html)).toEqual([
      'https://keredes.coop/app/uploads/2026/07/Switch-Lorient-1024x681.png',
      'https://keredes.coop/app/uploads/2026/07/Switch-2.png',
    ])
  })
  it('vide si structure absente', () => {
    expect(extraireImagesProgramme('<html></html>')).toEqual([])
  })
})
```

- [ ] **Step 2 : Vérifier l'échec**

Run: `npx vitest run src/lib/visuels.helpers.test.ts`
Expected: FAIL (module `visuels.helpers.ts` introuvable).

- [ ] **Step 3 : Implémenter `src/lib/visuels.helpers.ts`**

```ts
// Helpers purs de la recherche de visuels d'opération sur keredes.coop
// (slugification, extraction HTML) — testés dans visuels.helpers.test.ts.
// Le réseau est dans visuels.server.ts.
import { sansAccents } from '#/lib/utils.ts'

/** « L’Orée du TER » → « l-oree-du-ter » (forme des slugs WordPress du site). */
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
```

Note : `sansAccents` fait `normalize('NFD')` + suppression des diacritiques + minuscules — « œ » n'est pas un diacritique, d'où le remplacement explicite.

- [ ] **Step 4 : Vérifier le vert**

Run: `npx vitest run src/lib/visuels.helpers.test.ts`
Expected: PASS (8 tests). Ajuster l'implémentation, pas les tests, si écart.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/visuels.helpers.ts src/lib/visuels.helpers.test.ts
git commit -m "feat(operations): helpers de recherche de visuels keredes.coop"
```

---

### Task 3 : Réseau serveur (`visuels.server.ts`)

**Files:**
- Create: `src/lib/visuels.server.ts`

**Interfaces:**
- Consumes: Task 2 (`slugifier`, `extraireSlugs`, `trouverSlug`, `extraireImagesProgramme`), `CAPTURE_MAX_OCTETS` de `#/lib/tickets.helpers.ts`, `operationVisuel` de Task 1, `db` de `#/db/index.ts`.
- Produces:
  - `chercherCandidats(libelle: string): Promise<Array<string>>`
  - `telechargerImage(url: string): Promise<{ contenu: Buffer; mime: string; taille: number }>` (throw si hors keredes.coop, non-image ou > 3 Mo)
  - `chercherEtStockerVisuel(operationId: number, libelle: string): Promise<boolean>` (true si un visuel a été stocké)

Pas de test unitaire (réseau) — la logique extractive est couverte par Task 2.

- [ ] **Step 1 : Implémenter**

```ts
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
  const rep = await fetch(u, { signal: AbortSignal.timeout(15_000) })
  if (!rep.ok)
    throw new Error(`Téléchargement impossible (HTTP ${rep.status}).`)
  const mime = (rep.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!mime.startsWith('image/'))
    throw new Error('Le lien ne pointe pas vers une image.')
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
  const { contenu, mime, taille } = await telechargerImage(candidats[0])
  await db
    .insert(operationVisuel)
    .values({ operationId, contenu, mime, taille, source: candidats[0] })
    .onConflictDoNothing()
  return true
}
```

- [ ] **Step 2 : Vérifier lint + types**

Run: `npm run lint && npx vitest run`
Expected: propre, tests existants verts.

- [ ] **Step 3 : Commit**

```bash
git add src/lib/visuels.server.ts
git commit -m "feat(operations): scraping serveur des visuels keredes.coop"
```

---

### Task 4 : Server functions (`visuels.ts`)

**Files:**
- Create: `src/lib/visuels.ts`

**Interfaces:**
- Consumes: Task 3, `decodeCapture` + `sanitizeMiniature` de `#/lib/tickets.helpers.ts`, `requireSession`/`requireEcriture` de `#/lib/session.server.ts`, `operationVisuel`, `operation` (`#/db/domaine.ts`), `db`, drizzle `eq, asc, isNull, notInArray…`.
- Produces (signatures consommées par Tasks 5–8) :
  - `getVisuelFn` GET `{operationId}` → `{ mime, source, miniature, dataUrl } | null`
  - `rechercherVisuelsFn` GET `{operationId}` → `{ candidats: Array<string> }`
  - `choisirVisuelFn` POST `{operationId, url}` → `{ ok: true }`
  - `uploadVisuelFn` POST `{operationId, nom, dataUrl, miniature?}` → `{ ok: true }`
  - `retirerVisuelFn` POST `{operationId}` → `{ ok: true }`
  - `saveMiniatureVisuelFn` POST `{operationId, miniature}` → `{ ok: true }`
  - `backfillVisuelsFn` POST `{limite: number, apresId?: number}` → `{ traites, trouves, restants, dernierId }` (curseur : le client repasse `dernierId` en `apresId`)

- [ ] **Step 1 : Implémenter**

```ts
// Server functions du visuel d'opération (bandeau fiche Paramètres OTL,
// miniature du volet Opérations). Réseau keredes.coop : visuels.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { asc, eq, notInArray } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { operation } from '#/db/domaine.ts'
import { operationVisuel } from '#/db/schema.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'
import { decodeCapture, sanitizeMiniature } from '#/lib/tickets.helpers.ts'
import {
  chercherCandidats,
  chercherEtStockerVisuel,
  telechargerImage,
} from '#/lib/visuels.server.ts'

// Original en data-URL pour le bandeau de la fiche (chargé à la demande)
export const getVisuelFn = createServerFn({ method: 'GET' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const [v] = await db
      .select()
      .from(operationVisuel)
      .where(eq(operationVisuel.operationId, data.operationId))
    if (!v) return null
    return {
      mime: v.mime,
      source: v.source,
      miniature: v.miniature,
      dataUrl: `data:${v.mime};base64,${v.contenu.toString('base64')}`,
    }
  })

export const rechercherVisuelsFn = createServerFn({ method: 'GET' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const [op] = await db
      .select({ libelle: operation.libelle })
      .from(operation)
      .where(eq(operation.id, data.operationId))
    if (!op?.libelle) return { candidats: [] as Array<string> }
    return { candidats: await chercherCandidats(op.libelle) }
  })

async function remplacerVisuel(
  operationId: number,
  valeurs: {
    contenu: Buffer
    mime: string
    taille: number
    miniature?: string
    source: string
  },
) {
  await db
    .insert(operationVisuel)
    .values({ operationId, miniature: '', ...valeurs })
    .onConflictDoUpdate({
      target: operationVisuel.operationId,
      set: { miniature: '', ...valeurs },
    })
}

// Choix d'un candidat keredes.coop — le serveur retélécharge (l'URL cliente
// n'est qu'une référence, jamais un contenu) ; miniature régénérée ensuite
// par la fiche (lazy, cf. saveMiniatureVisuelFn)
export const choisirVisuelFn = createServerFn({ method: 'POST' })
  .validator((d: { operationId: number; url: string }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const { contenu, mime, taille } = await telechargerImage(data.url)
    await remplacerVisuel(data.operationId, {
      contenu,
      mime,
      taille,
      source: data.url,
    })
    return { ok: true as const }
  })

export const uploadVisuelFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      operationId: number
      nom: string
      dataUrl: string
      miniature?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireEcriture()
    const cap = decodeCapture({
      nom: data.nom,
      dataUrl: data.dataUrl,
      miniature: data.miniature,
    })
    await remplacerVisuel(data.operationId, {
      contenu: Buffer.from(cap.b64, 'base64'),
      mime: cap.mime,
      taille: cap.taille,
      miniature: cap.miniature,
      source: 'upload',
    })
    return { ok: true as const }
  })

export const retirerVisuelFn = createServerFn({ method: 'POST' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db
      .delete(operationVisuel)
      .where(eq(operationVisuel.operationId, data.operationId))
    return { ok: true as const }
  })

// Lazy backfill de la vignette : la fiche la génère (canvas) à partir de la
// data-URL de l'original quand elle est absente ('')
export const saveMiniatureVisuelFn = createServerFn({ method: 'POST' })
  .validator((d: { operationId: number; miniature: string }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const m = sanitizeMiniature(data.miniature)
    if (m)
      await db
        .update(operationVisuel)
        .set({ miniature: m })
        .where(eq(operationVisuel.operationId, data.operationId))
    return { ok: true as const }
  })

// Backfill par paquets pilotés par le client (pas de requête HTTP de
// plusieurs minutes). Curseur `apresId` : les opérations introuvables sur le
// site (livrées) resteraient sinon en tête de file à chaque appel — le
// curseur garantit la progression et la terminaison de la boucle cliente.
export const backfillVisuelsFn = createServerFn({ method: 'POST' })
  .validator((d: { limite: number; apresId?: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const limite = Math.min(Math.max(1, data.limite), 25)
    const deja = db
      .select({ id: operationVisuel.operationId })
      .from(operationVisuel)
    const sans = await db
      .select({ id: operation.id, libelle: operation.libelle })
      .from(operation)
      .where(
        and(
          notInArray(operation.id, deja),
          gt(operation.id, data.apresId ?? 0),
        ),
      )
      .orderBy(asc(operation.id))
    const paquet = sans.slice(0, limite)
    let trouves = 0
    for (const op of paquet) {
      const ok = await chercherEtStockerVisuel(op.id, op.libelle ?? '').catch(
        () => false,
      )
      if (ok) trouves++
    }
    return {
      traites: paquet.length,
      trouves,
      restants: sans.length - paquet.length,
      dernierId: paquet.at(-1)?.id ?? null,
    }
  })
```

- [ ] **Step 2 : Vérifier**

Run: `npm run lint && npx vitest run`
Expected: propre. (Si `notInArray` avec sous-requête pose souci de types drizzle, remplacer par `sql\`${operation.id} not in (select operation_id from operation_visuel)\``.)

- [ ] **Step 3 : Commit**

```bash
git add src/lib/visuels.ts
git commit -m "feat(operations): server functions visuel d'opération"
```

---

### Task 5 : Auto à la création d'une opération

**Files:**
- Modify: `src/lib/parametres.otl.ts:262-294` (`saveOperationOtlFn`)

**Interfaces:**
- Consumes: `chercherEtStockerVisuel` (Task 3).

- [ ] **Step 1 : Brancher la recherche après création**

Dans le handler de `saveOperationOtlFn`, remplacer le `return upsert(...)` final par :

```ts
    const estCreation = data.id == null
    const res = await upsert(operation, data.id, {
      /* … valeurs existantes inchangées … */
    })
    // Nouvelle opération : visuel keredes.coop en tâche de fond, jamais
    // bloquant (échec silencieux — corrigeable depuis la fiche)
    if (estCreation)
      void chercherEtStockerVisuel(res.id, data.libelle.trim()).catch(() => {})
    return res
```

Import en tête de fichier : `import { chercherEtStockerVisuel } from '#/lib/visuels.server.ts'`.

- [ ] **Step 2 : Vérifier**

Run: `npm run lint && npx vitest run`
Expected: propre.

- [ ] **Step 3 : Test manuel (HMR sur http://10.66.66.1:3021)**

Paramètres → Opérations, tranches et lots → Nouveau : créer une opération nommée « SWITCH » (commune libre). Vérifier en base : `select operation_id, mime, taille, source from operation_visuel;` → une ligne source keredes.coop. Supprimer l'opération de test ensuite.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/parametres.otl.ts
git commit -m "feat(operations): visuel auto à la création d'une opération"
```

---

### Task 6 : Zone visuel dans la fiche Opération (Paramètres OTL)

**Files:**
- Create: `src/components/VisuelOperation.tsx`
- Modify: `src/lib/tickets.captures.ts` (exporter `makeMiniature`)
- Modify: `src/components/ModaleFiche.tsx` (prop `enTete?: ReactNode`)
- Modify: `src/routes/_authed/parametres.tsx` (`NiveauOtl` : prop `enTete?: (id: number | null) => ReactNode` ; `VueOtl` : passage pour le niveau Opérations)

**Interfaces:**
- Consumes: `getVisuelFn`, `rechercherVisuelsFn`, `choisirVisuelFn`, `uploadVisuelFn`, `retirerVisuelFn`, `saveMiniatureVisuelFn` (Task 4) ; `readCaptureFiles`, `makeMiniature` (`#/lib/tickets.captures.ts`).
- Produces: `<VisuelOperation operationId={number} />` (défaut export).

- [ ] **Step 1 : Exporter `makeMiniature`**

Dans `src/lib/tickets.captures.ts:17` : `async function makeMiniature` → `export async function makeMiniature`.

- [ ] **Step 2 : Créer `src/components/VisuelOperation.tsx`**

```tsx
// Zone visuel de la fiche Opération (Paramètres OTL) : bandeau image,
// recherche keredes.coop (grille de candidats), téléversement, retrait.
// Miniature régénérée ici quand absente (auto/backfill la laissent vide).
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '#/components/ui/button'
import { makeMiniature, readCaptureFiles } from '#/lib/tickets.captures.ts'
import {
  choisirVisuelFn,
  getVisuelFn,
  rechercherVisuelsFn,
  retirerVisuelFn,
  saveMiniatureVisuelFn,
  uploadVisuelFn,
} from '#/lib/visuels.ts'

export default function VisuelOperation({
  operationId,
}: {
  operationId: number
}) {
  const queryClient = useQueryClient()
  const [candidats, setCandidats] = useState<Array<string> | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const refFichier = useRef<HTMLInputElement>(null)

  const visuel = useQuery({
    queryKey: ['operation-visuel', operationId],
    queryFn: () => getVisuelFn({ data: { operationId } }),
  })

  const invalider = () => {
    queryClient.invalidateQueries({ queryKey: ['operation-visuel', operationId] })
    queryClient.invalidateQueries({ queryKey: ['operations-comm'] })
    setCandidats(null)
    setErreur(null)
  }

  // Lazy backfill de la vignette (auto/backfill stockent miniature = '')
  useEffect(() => {
    const v = visuel.data
    if (!v || v.miniature !== '') return
    void makeMiniature(v.dataUrl).then((m) => {
      if (m)
        saveMiniatureVisuelFn({ data: { operationId, miniature: m } }).then(
          () => queryClient.invalidateQueries({ queryKey: ['operations-comm'] }),
          () => {},
        )
    })
  }, [visuel.data, operationId])

  const rechercher = useMutation({
    mutationFn: () => rechercherVisuelsFn({ data: { operationId } }),
    onSuccess: (r) => {
      setCandidats(r.candidats)
      setErreur(r.candidats.length === 0 ? 'Aucun visuel trouvé sur keredes.coop.' : null)
    },
    onError: () => setErreur('Recherche impossible (site injoignable ?).'),
  })
  const choisir = useMutation({
    mutationFn: (url: string) => choisirVisuelFn({ data: { operationId, url } }),
    onSuccess: invalider,
    onError: (e) => setErreur(e instanceof Error ? e.message : 'Échec.'),
  })
  const retirer = useMutation({
    mutationFn: () => retirerVisuelFn({ data: { operationId } }),
    onSuccess: invalider,
  })

  const televerser = async (files: Array<File>) => {
    const { captures, erreur: err } = await readCaptureFiles(files, 0)
    if (err) setErreur(err)
    const c = captures[0]
    if (!c) return
    try {
      await uploadVisuelFn({
        data: { operationId, nom: c.nom, dataUrl: c.dataUrl, miniature: c.miniature },
      })
      invalider()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Échec du téléversement.')
    }
  }

  return (
    <div
      className="mb-4 flex flex-col gap-2"
      onPaste={(e) => {
        const files = [...e.clipboardData.files]
        if (files.length > 0) void televerser(files)
      }}
    >
      {visuel.data ? (
        <img
          src={visuel.data.dataUrl}
          alt="Visuel de l'opération"
          className="max-h-56 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-[13px] text-[var(--muted)]">
          {visuel.isLoading ? 'Chargement…' : 'Aucun visuel'}
        </div>
      )}
      <div className="flex items-center gap-2">
        {visuel.data && (
          <span className="mr-auto truncate text-[12px] text-[var(--muted)]">
            {visuel.data.source === 'upload' ? 'Téléversé' : 'keredes.coop'}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={rechercher.isPending}
          onClick={() => rechercher.mutate()}
        >
          {rechercher.isPending ? 'Recherche…' : 'Rechercher sur keredes.coop'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => refFichier.current?.click()}
        >
          Téléverser
        </Button>
        {visuel.data && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => retirer.mutate()}
          >
            Retirer
          </Button>
        )}
        <input
          ref={refFichier}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void televerser([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>
      {candidats && candidats.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {candidats.map((url) => (
            <button
              key={url}
              type="button"
              disabled={choisir.isPending}
              onClick={() => choisir.mutate(url)}
              className="cursor-pointer overflow-hidden rounded-lg border border-[var(--line)] hover:border-[var(--ink)]"
              title="Choisir ce visuel"
            >
              <img src={url} alt="" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {erreur && <p className="text-[12px] text-red-700">{erreur}</p>}
    </div>
  )
}
```

- [ ] **Step 3 : Prop `enTete` dans `ModaleFiche`**

`src/components/ModaleFiche.tsx` : ajouter `enTete?: React.ReactNode` aux props, et le rendre entre `</DialogHeader>` et `<form …>` : `{enTete}`.

- [ ] **Step 4 : Passage dans `NiveauOtl` et `VueOtl`**

`src/routes/_authed/parametres.tsx` :
- `NiveauOtl` : nouvelle prop optionnelle `enTete?: (id: number | null) => ReactNode` ; dans son `ModaleFiche`, passer `enTete={enTete?.(typeof modale === 'number' ? modale : null)}`.
- `VueOtl`, `<NiveauOtl titre="Opérations" …>` (~l.1211) : ajouter

```tsx
enTete={(id) => (id != null ? <VisuelOperation operationId={id} /> : null)}
```

(import `VisuelOperation` en tête de fichier). En création il n'y a pas d'id — l'auto de Task 5 s'en charge.

- [ ] **Step 5 : Test manuel**

Paramètres → OTL → sélectionner une opération → Modifier : zone visuel visible ; « Rechercher sur keredes.coop » sur une opération au nom d'un programme actif (ex. libellé contenant « SWITCH ») → grille → clic → bandeau affiché. « Téléverser » une image locale → remplace. « Retirer » → zone vide. Vérifier `npm run lint`.

- [ ] **Step 6 : Commit**

```bash
git add src/components/VisuelOperation.tsx src/components/ModaleFiche.tsx src/routes/_authed/parametres.tsx src/lib/tickets.captures.ts
git commit -m "feat(operations): zone visuel dans la fiche Opération (recherche + upload)"
```

---

### Task 7 : Backfill « Rechercher les visuels manquants »

**Files:**
- Modify: `src/routes/_authed/parametres.tsx` (`VueOtl`, au-dessus du `NiveauOtl` Opérations)

**Interfaces:**
- Consumes: `backfillVisuelsFn` (Task 4).

- [ ] **Step 1 : Bouton + boucle client**

Dans `VueOtl`, ajouter un état et une boucle par paquets (le serveur traite 10 opérations par appel, le client rappelle tant qu'il en reste) :

```tsx
const [backfill, setBackfill] = useState<{
  enCours: boolean
  trouves: number
  traites: number
} | null>(null)

const lancerBackfill = async () => {
  setBackfill({ enCours: true, trouves: 0, traites: 0 })
  let trouves = 0
  let traites = 0
  let apresId = 0
  try {
    for (;;) {
      const r = await backfillVisuelsFn({ data: { limite: 10, apresId } })
      trouves += r.trouves
      traites += r.traites
      setBackfill({ enCours: true, trouves, traites })
      if (r.restants === 0 || r.traites === 0 || r.dernierId == null) break
      apresId = r.dernierId
    }
  } finally {
    setBackfill({ enCours: false, trouves, traites })
    queryClient.invalidateQueries({ queryKey: ['operations-comm'] })
  }
}
```

Rendu à côté du titre du niveau Opérations (au-dessus du `<NiveauOtl titre="Opérations"`) :

```tsx
<div className="flex items-center gap-3">
  <Button
    type="button"
    size="sm"
    variant="outline"
    disabled={backfill?.enCours}
    onClick={() => void lancerBackfill()}
  >
    {backfill?.enCours ? 'Recherche des visuels…' : 'Rechercher les visuels manquants'}
  </Button>
  {backfill && (
    <span className="text-[12px] text-[var(--muted)]">
      {backfill.trouves} trouvé{backfill.trouves > 1 ? 's' : ''} /{' '}
      {backfill.traites} sans visuel
      {backfill.enCours ? '…' : ' — les programmes livrés ne sont plus sur le site.'}
    </span>
  )}
</div>
```

Import `backfillVisuelsFn` depuis `#/lib/visuels.ts`.

- [ ] **Step 2 : Test manuel**

Lancer le backfill sur la base de dev (~167 opérations). Attendre la fin : compteur cohérent, pas d'erreur console serveur, `select count(*) from operation_visuel;` > 0. Les opérations livrées restent sans visuel — attendu.

- [ ] **Step 3 : Commit**

```bash
git add src/routes/_authed/parametres.tsx
git commit -m "feat(operations): backfill des visuels manquants depuis keredes.coop"
```

---

### Task 8 : Miniature dans le volet Opérations

**Files:**
- Modify: `src/lib/commercialisation.ts:35-55` (`getOperationsCommFn`)
- Modify: `src/components/PanneauOperations.tsx:127-151` (rendu d'une ligne)

**Interfaces:**
- Consumes: `operationVisuel` (Task 1).
- Produces: `getOperationsCommFn` renvoie en plus `miniature: string | null` (data-URL ~220 px, jamais le bytea).

- [ ] **Step 1 : Joindre la miniature dans `getOperationsCommFn`**

Ajouter au `select` : `miniature: operationVisuel.miniature,` et après le `leftJoin` existant :

```ts
      .leftJoin(operationVisuel, eq(operation.id, operationVisuel.operationId))
```

Import : `import { operationVisuel } from '#/db/schema.ts'`.

- [ ] **Step 2 : Afficher dans `PanneauOperations`**

Dans le bouton de ligne (l.128-151), passer en rangée : miniature 32 px à gauche, textes à droite :

```tsx
<button … className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left transition-colors ${…inchangé…}`}>
  {o.miniature ? (
    <img
      src={o.miniature}
      alt=""
      className="h-8 w-8 flex-shrink-0 rounded-md object-cover"
    />
  ) : (
    <span
      aria-hidden
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--cream-hover)]"
    >
      <Building2 className="h-4 w-4 text-[var(--muted)]" />
    </span>
  )}
  <span className="flex min-w-0 flex-col">
    {/* les deux <span> libellé + commune existants, inchangés */}
  </span>
</button>
```

Import `Building2` depuis `lucide-react`.

- [ ] **Step 3 : Test manuel + tests**

Volet visible sur /operations : lignes avec miniature (après backfill Task 7 + ouverture d'une fiche pour le lazy backfill des vignettes) et placeholder ailleurs. Sélection/recherche inchangées.
Run: `npm run lint && npx vitest run`
Expected: propre, tous tests verts.

- [ ] **Step 4 : Commit**

```bash
git add src/lib/commercialisation.ts src/components/PanneauOperations.tsx
git commit -m "feat(operations): miniature du visuel dans le volet Opérations"
```

---

### Task 9 : Vérification finale

- [ ] **Step 1 : Suite complète**

Run: `npm run lint && npx vitest run && npm run build`
Expected: tout vert, build sans erreur.

- [ ] **Step 2 : Parcours manuel complet**

1. Créer une opération « SWITCH TEST » → visuel auto apparu dans sa fiche (rouvrir la fiche). Supprimer l'opération de test.
2. Fiche d'une opération réelle : rechercher, choisir, remplacer par upload, retirer, re-choisir.
3. Volet : miniatures + placeholders, recherche/masqués inchangés.
4. Backfill : relance → « 0 trouvé / 0 sans visuel » ou ne retraite que les restantes.

- [ ] **Step 3 : Commit final si retouches**

```bash
git add -A && git commit -m "fix(operations): retouches visuel d'opération après vérification"
```
