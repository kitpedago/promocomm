# Préférences mémorisées par utilisateur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mémoriser en base, par utilisateur, les réglages de table, l'onglet actif, l'état du volet Opérations et l'opération/tranche sélectionnée, et les réappliquer dès le rendu serveur.

**Architecture :** une table clé/valeur JSONB `user_pref` (PK `(user_id, cle)`), deux server functions (`getPrefsFn`, `setPrefFn`), un hook `usePref(cle, defaut)` qui lit le cache TanStack Query alimenté par le `beforeLoad` de `_authed` et écrit en base avec un debounce de 500 ms. Le `localStorage` disparaît : les préférences sont disponibles au SSR, donc une seule source de vérité.

**Tech stack :** TanStack Start 1.168 · TanStack Router 1.170 · TanStack Query 5.101 · Drizzle ORM 0.45 (PostgreSQL 16) · Better Auth · Vitest 4.

**Spec :** `docs/superpowers/specs/2026-08-12-preferences-utilisateur-design.md`

## Global Constraints

- **Pas de dépôt git dans `/opt/promocomm`** — aucune étape `git commit` dans ce plan. Chaque tâche se termine par une vérification exécutable. Si vous voulez des commits, faites `git init` avant de démarrer et ajoutez vos propres commits en fin de tâche.
- **Ligne de base du typage : 8 erreurs pré-existantes**, dans `src/router.tsx` (3), `src/db/domaine.ts` (3), `src/lib/etl/import.ts` (1), `drizzle.config.ts` (1). La barrière de chaque tâche est `npx tsc --noEmit 2>&1 | grep -c "error TS"` → **8**. Toute valeur supérieure signale une régression introduite par la tâche.
- **La table `user_pref` va dans `src/db/schema.ts`, jamais dans `src/db/domaine.ts`** : `scripts/transform-legacy.ts` reconstruit le schéma métier à chaque réimport `.bak` et effacerait les préférences.
- **Aucun `userId` ne transite par le client.** Les deux server functions le lisent depuis `requireSession()` (`src/lib/session.server.ts`).
- **Nommage français** dans le code applicatif, comme le reste du dépôt (`libelle`, `valeur`, `cle`, `replie`…). Les identifiants Drizzle en base restent en `snake_case`.
- **Toggles uniquement**, jamais de checkbox HTML (consigne `docs/plan-implementation.md`).
- Commandes : `npm run db:generate`, `npm run db:migrate`, `npm run test`, `npm run dev` (sert sur `http://10.66.66.1:3021`), `npx tsc --noEmit`.

---

### Task 1 : table `user_pref` et migration

**Files:**
- Modify: `src/db/schema.ts:1-16`
- Create (généré) : `drizzle/00XX_*.sql` + `drizzle/meta/*`

**Interfaces:**
- Consumes: `user` de `src/db/auth-schema.ts` (déjà ré-exporté par `schema.ts:1`)
- Produces: `userPref` — colonnes `userId: text`, `cle: text`, `valeur: jsonb`, `updatedAt: timestamp`, PK composite `(userId, cle)`

- [ ] **Step 1 : ajouter la table**

Dans `src/db/schema.ts`, remplacer la ligne d'import Drizzle et ajouter la table après `importRuns` :

```ts
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

import { user } from './auth-schema.ts'
```

```ts
// Préférences d'interface par utilisateur (largeurs de colonnes, onglet actif,
// opération sélectionnée, état du volet). Volontairement hors domaine.ts : le
// transform reconstruit le schéma métier à chaque réimport .bak, ces lignes
// doivent y survivre. Forme clé/valeur : une écriture ne touche qu'une ligne,
// deux onglets de navigateur ne s'écrasent pas.
export const userPref = pgTable(
  'user_pref',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cle: text().notNull(),
    valeur: jsonb().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cle] })],
)
```

- [ ] **Step 2 : générer la migration**

Run: `npm run db:generate`
Expected: un nouveau fichier `drizzle/00XX_<nom>.sql` contenant `CREATE TABLE "user_pref"` avec `PRIMARY KEY("user_id","cle")` et la contrainte `FOREIGN KEY … ON DELETE cascade`. Ouvrez-le et vérifiez ces trois éléments avant d'appliquer.

- [ ] **Step 3 : appliquer la migration**

Run: `npm run db:migrate`
Expected: sortie sans erreur.

- [ ] **Step 4 : vérifier la table en base**

Run:
```bash
psql "$DATABASE_URL" -c "\d user_pref"
```
Expected: quatre colonnes, `Indexes: "user_pref_user_id_cle_pk" PRIMARY KEY, btree (user_id, cle)`, une `Foreign-key constraint` vers `"user"`.

Si `psql` n'est pas disponible en local, `npm run db:studio` puis inspection visuelle de la table convient.

- [ ] **Step 5 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

---

### Task 2 : `resoudrePref`, la fusion valeur stockée / défaut

**Files:**
- Create: `src/lib/preferences.ts`
- Test: `src/lib/preferences.test.ts`

**Interfaces:**
- Produces: `resoudrePref<T>(stocke: unknown, defaut: T): T` — renvoie `defaut` si rien n'est stocké, la fusion superficielle `{ ...defaut, ...stocke }` si les deux sont des objets simples, la valeur stockée telle quelle sinon.

Pourquoi cette fonction existe : une préférence enregistrée hier ne contient pas les champs ajoutés au code aujourd'hui. Sans fusion, `params.pageSize` serait `undefined` après l'ajout d'un champ à `TableParams` et la table planterait. C'est déjà le comportement de l'actuel `DataTable.tsx:76` (`{ ...base, ...JSON.parse(brut) }`), on le rend testable.

- [ ] **Step 1 : écrire le test qui échoue**

Créer `src/lib/preferences.test.ts` :

```ts
import { expect, test } from 'vitest'

import { resoudrePref } from './preferences.ts'

test('rien de stocké → le défaut', () => {
  expect(resoudrePref(undefined, { pageSize: 50 })).toEqual({ pageSize: 50 })
  expect(resoudrePref(null, { pageSize: 50 })).toEqual({ pageSize: 50 })
})

test('objet partiel → fusion, les champs manquants viennent du défaut', () => {
  const defaut = { pageSize: 50, uneLigne: true, ligneCompacte: false }
  expect(resoudrePref({ pageSize: 100 }, defaut)).toEqual({
    pageSize: 100,
    uneLigne: true,
    ligneCompacte: false,
  })
})

test('primitive stockée → renvoyée telle quelle, sans fusion', () => {
  expect(resoudrePref('Terrain', "Stade d'avancement")).toBe('Terrain')
  expect(resoudrePref(0, 50)).toBe(0)
  expect(resoudrePref(false, true)).toBe(false)
})

test('tableau stocké → remplacement, pas de fusion index par index', () => {
  expect(resoudrePref(['b'], ['a', 'z'])).toEqual(['b'])
})

test('défaut objet, valeur stockée tableau → pas de fusion', () => {
  expect(resoudrePref(['a'], { pageSize: 50 })).toEqual(['a'])
})
```

- [ ] **Step 2 : lancer le test pour le voir échouer**

Run: `npm run test -- src/lib/preferences.test.ts`
Expected: FAIL — `Failed to resolve import "./preferences.ts"`.

- [ ] **Step 3 : écrire l'implémentation minimale**

Créer `src/lib/preferences.ts` :

```ts
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
```

- [ ] **Step 4 : lancer le test pour le voir passer**

Run: `npm run test -- src/lib/preferences.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

---

### Task 3 : server functions `getPrefsFn` et `setPrefFn`

**Files:**
- Modify: `src/lib/preferences.ts` (ajout en tête et en fin de fichier)

**Interfaces:**
- Consumes: `resoudrePref` (tâche 2), `userPref` (tâche 1), `requireSession` de `src/lib/session.server.ts`, `db` de `src/db/index.ts`
- Produces:
  - `getPrefsFn(): Promise<Record<string, unknown>>` — toutes les préférences de l'utilisateur courant, indexées par clé
  - `setPrefFn({ data: { cle: string; valeur: unknown } }): Promise<void>` — upsert d'une clé
  - `type Prefs = Record<string, unknown>`

`cle` et `valeur` viennent du client : ce sont des entrées non fiables. L'`userId` n'en vient jamais — il est pris de la session, donc aucun utilisateur ne peut écrire chez un autre. Restent deux gardes de volume, à ne pas retirer : longueur de clé et taille de valeur.

- [ ] **Step 1 : écrire le test qui échoue**

Ajouter à `src/lib/preferences.test.ts` :

```ts
import { LIMITE_CLE, LIMITE_VALEUR, verifierEntree } from './preferences.ts'

test('entrée valide acceptée', () => {
  expect(() => verifierEntree('table:operations-stades', { pageSize: 50 })).not.toThrow()
})

test('clé vide ou trop longue rejetée', () => {
  expect(() => verifierEntree('', {})).toThrow('Clé de préférence invalide')
  expect(() => verifierEntree('x'.repeat(LIMITE_CLE + 1), {})).toThrow(
    'Clé de préférence invalide',
  )
})

test('valeur trop volumineuse rejetée', () => {
  const gros = { texte: 'x'.repeat(LIMITE_VALEUR) }
  expect(() => verifierEntree('table:x', gros)).toThrow('Préférence trop volumineuse')
})

test('valeur non sérialisable rejetée', () => {
  const cyclique: Record<string, unknown> = {}
  cyclique.moi = cyclique
  expect(() => verifierEntree('table:x', cyclique)).toThrow('Préférence trop volumineuse')
})
```

- [ ] **Step 2 : lancer le test pour le voir échouer**

Run: `npm run test -- src/lib/preferences.test.ts`
Expected: FAIL — `verifierEntree is not a function` (ou erreur d'import sur `LIMITE_CLE`).

- [ ] **Step 3 : écrire l'implémentation**

Dans `src/lib/preferences.ts`, ajouter les imports en tête du fichier (après le commentaire d'en-tête) :

```ts
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { userPref } from '#/db/schema.ts'
import { requireSession } from '#/lib/session.server.ts'
```

puis, à la fin du fichier :

```ts
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
export const getPrefsFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Prefs> => {
    const session = await requireSession()
    const lignes = await db
      .select({ cle: userPref.cle, valeur: userPref.valeur })
      .from(userPref)
      .where(eq(userPref.userId, session.user.id))
    return Object.fromEntries(lignes.map((l) => [l.cle, l.valeur]))
  },
)

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
```

- [ ] **Step 4 : lancer les tests pour les voir passer**

Run: `npm run test -- src/lib/preferences.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5 : vérifier que le bundle client se construit**

`src/lib/preferences.ts` importe `db` et `requireSession` au niveau module et sera importé par des composants clients. Le compilateur de server functions de TanStack Start retire les corps de `.handler()` et les imports devenus inutiles — c'est déjà le montage de `src/lib/operations.ts:27-29`. Cette étape le prouve plutôt que de le supposer.

Run: `npm run build`
Expected: build réussi.

Si le build échoue avec une erreur d'`import-protection` mentionnant `auth`, `db` ou `node:`, appliquez la parade déjà utilisée dans le dépôt pour `session.ts` / `session.server.ts` : déplacez `getPrefsFn`, `setPrefFn` et `verifierEntree` dans un nouveau `src/lib/preferences.server.ts`, ne gardez dans `preferences.ts` que `resoudrePref`, `Prefs` et (tâche 4) `usePref`, et importez les server functions depuis le nouveau fichier. Adaptez les imports de `preferences.test.ts` en conséquence.

- [ ] **Step 6 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

---

### Task 4 : chargement dans le contexte de route et hook `usePref`

**Files:**
- Modify: `src/routes/_authed.tsx:8-15`
- Modify: `src/lib/preferences.ts` (ajout du hook)

**Interfaces:**
- Consumes: `getPrefsFn`, `resoudrePref`, `Prefs` (tâches 2 et 3) ; `context.queryClient` fourni par la racine (`src/router.tsx:12`, `createRootRouteWithContext<{ queryClient }>` dans `src/routes/__root.tsx:15-19`)
- Produces:
  - `CLE_PREFS = ['prefs'] as const` — clé de query partagée
  - `usePref<T>(cle: string, defaut: T): [T, (v: T | ((prec: T) => T)) => void]`
  - `context.prefs: Prefs` disponible dans le `beforeLoad` de toute route sous `_authed`

- [ ] **Step 1 : écrire le hook**

À la fin de `src/lib/preferences.ts` :

```ts
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
  const { data } = useQuery<Prefs>({
    queryKey: CLE_PREFS,
    queryFn: () => getPrefsFn(),
    staleTime: Infinity,
  })
  const valeur = resoudrePref(data?.[cle], defaut)

  const ecrire = (v: T | ((prec: T) => T)) => {
    const prec = queryClient.getQueryData<Prefs>(CLE_PREFS)
    const courant = resoudrePref(prec?.[cle], defaut)
    const suivant =
      typeof v === 'function' ? (v as (p: T) => T)(courant) : v
    queryClient.setQueryData<Prefs>(CLE_PREFS, { ...prec, [cle]: suivant })
    pousser(cle, suivant)
  }

  return [valeur, ecrire]
}
```

et l'import React Query en tête de fichier :

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
```

- [ ] **Step 2 : charger les préférences dans le `beforeLoad` de `_authed`**

Dans `src/routes/_authed.tsx`, remplacer le `beforeLoad` (lignes 9-13) par :

```ts
  beforeLoad: async ({ context }) => {
    const session = await getSessionFn()
    if (!session?.user) throw redirect({ to: '/login' })
    // ensureQueryData : une seule requête par session de navigation, et c'est le
    // cache que relit usePref — le beforeLoad des pages enfants et les composants
    // voient toujours la même valeur.
    const prefs = await context.queryClient.ensureQueryData({
      queryKey: CLE_PREFS,
      queryFn: () => getPrefsFn(),
      staleTime: Infinity,
    })
    return { session, prefs }
  },
```

et ajouter l'import :

```ts
import { CLE_PREFS, getPrefsFn } from '#/lib/preferences.ts'
```

- [ ] **Step 3 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

- [ ] **Step 4 : vérifier le chargement dans l'application**

Run: `npm run dev`, se connecter, ouvrir `http://10.66.66.1:3021/operations`.
Expected: la page s'affiche comme avant (aucune préférence n'est encore écrite). Dans l'onglet Réseau, **une seule** requête vers `getPrefsFn` par chargement de page. Dans les devtools TanStack Query, une entrée `["prefs"]` à `{}`.

- [ ] **Step 5 : vérifier l'écriture de bout en bout**

Dans la console du navigateur, sur une page authentifiée, provoquer une écriture via l'application n'est pas encore possible (aucun appelant avant la tâche 5). Vérifier plutôt le trajet serveur :

Run:
```bash
psql "$DATABASE_URL" -c "select count(*) from user_pref;"
```
Expected: `0`. La table existe et répond ; les écritures réelles seront vérifiées en tâche 5.

---

### Task 5 : `DataTable` sur `usePref` (largeurs, colonnes, tri, filtre, lignes)

**Files:**
- Modify: `src/components/DataTable.tsx:1-7` (en-tête), `:71-80` (suppression), `:111-141` (état), `:316` (réinitialisation)

**Interfaces:**
- Consumes: `usePref` (tâche 4)
- Produces: clés `table:<id>` en base, une par table (`operations-stades`, `operations-subventions`, `commercialisation-lots`, et toute table future)

- [ ] **Step 1 : retirer le stockage localStorage**

Supprimer intégralement `cle` et `lireParams` (`DataTable.tsx:71-80`) et corriger le commentaire d'en-tête : remplacer, lignes 5-7,

```
// pagination (10/20/50/100/500 max), paramètres mémorisés par table
// (localStorage — par navigateur en attendant un stockage par utilisateur
// côté serveur).
```

par

```
// pagination (10/20/50/100/500 max), paramètres mémorisés par table et par
// utilisateur (table user_pref, clé « table:<id> » — cf. src/lib/preferences.ts).
```

- [ ] **Step 2 : remplacer l'état local par la préférence**

Remplacer `DataTable.tsx:120-130` :

```ts
  // rendu SSR avec les défauts, puis restauration après montage (pas de
  // localStorage côté serveur, et l'hydratation doit correspondre)
  const [params, setParams] = useState<TableParams>(base)
  const [restaure, setRestaure] = useState(false)
  useEffect(() => {
    setParams(lireParams(id, base))
    setRestaure(true)
  }, [id, base])
  useEffect(() => {
    if (restaure) localStorage.setItem(cle(id), JSON.stringify(params))
  }, [id, params, restaure])
```

par une seule ligne — les préférences arrivent avec le rendu serveur, il n'y a plus ni restauration après montage ni décalage d'hydratation :

```ts
  const [params, setParams] = usePref<TableParams>(`table:${id}`, base)
```

Adapter les imports : `useState` reste nécessaire (`pageIndex`, ligne 144), `useEffect` aussi (recalage de page, ligne 177). Ajouter :

```ts
import { usePref } from '#/lib/preferences.ts'
```

Le helper `set()` (lignes 132-141) et le bouton « Réinitialiser la table » (ligne 316, `setParams({ ...base })`) fonctionnent inchangés : `usePref` accepte la forme fonction comme la forme valeur.

- [ ] **Step 3 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

- [ ] **Step 4 : vérifier dans l'application**

Run: `npm run dev`, aller sur `http://10.66.66.1:3021/operations?op=324`, onglet « Stade d'avancement ».
Expected, dans l'ordre :
1. élargir une colonne au glisser → aucun à-coup ;
2. masquer une colonne via « Affichage », passer en « Ligne compacte », trier sur « Date réelle », taper dans le filtre, passer à 100 lignes par page ;
3. recharger la page (F5) → largeur, colonne masquée, compacité, tri, filtre et taille de page sont tous restaurés **dès le premier rendu**, sans clignotement des valeurs par défaut ;
4. « Réinitialiser la table » → retour aux défauts, `montantPrevi` et `commentaire` à nouveau masqués (`defaultHidden`).

- [ ] **Step 5 : vérifier la persistance serveur et le debounce**

Run:
```bash
psql "$DATABASE_URL" -c "select cle, jsonb_pretty(valeur) from user_pref;"
```
Expected: une ligne `table:operations-stades` contenant `columnSizing`, `columnVisibility`, `sorting`, `globalFilter`, `pageSize`, `ligneCompacte`.

Vérifier le debounce : dans l'onglet Réseau, effectuer un long glissement de redimensionnement.
Expected: **un seul** appel `setPrefFn`, envoyé environ 500 ms après le relâchement.

- [ ] **Step 6 : vérifier que la préférence suit le compte, pas le navigateur**

Ouvrir une fenêtre de navigation privée, se connecter avec un **autre** service, ouvrir la même page.
Expected: réglages par défaut, la table du premier utilisateur n'a pas déteint. Se reconnecter avec le premier compte dans cette même fenêtre privée : ses réglages sont là.

---

### Task 6 : onglet actif des pages Opérations et Commercialisation

**Files:**
- Modify: `src/routes/_authed/operations.tsx:353-354`
- Modify: `src/routes/_authed/commercialisation.tsx:350-351`

**Interfaces:**
- Consumes: `usePref` (tâche 4)
- Produces: clés `onglet:operations` et `onglet:commercialisation` (valeur : le libellé de l'onglet)

Le libellé stocké peut ne plus exister après un renommage d'onglet — les onglets de ces deux pages ont déjà bougé plusieurs fois. D'où le repli explicite sur le premier onglet.

- [ ] **Step 1 : Opérations**

Dans `src/routes/_authed/operations.tsx`, remplacer la ligne 354 :

```ts
  const [onglet, setOnglet] = useState<Onglet>("Stade d'avancement")
```

par :

```ts
  const [ongletStocke, setOnglet] = usePref<Onglet>('onglet:operations', ONGLETS[0])
  // un onglet renommé depuis l'enregistrement ne doit pas laisser la page vide
  const onglet = ONGLETS.includes(ongletStocke) ? ongletStocke : ONGLETS[0]
```

Ajouter l'import `import { usePref } from '#/lib/preferences.ts'` et retirer `useState` de l'import React s'il n'est plus utilisé ailleurs dans le fichier (vérifier : à ce stade il ne l'est plus, la ligne 6 devient inutile — supprimer alors `import { useState } from 'react'`).

- [ ] **Step 2 : Commercialisation**

Dans `src/routes/_authed/commercialisation.tsx`, remplacer la ligne 351 :

```ts
  const [onglet, setOnglet] = useState<Onglet>('Commercialisation')
```

par :

```ts
  const [ongletStocke, setOnglet] = usePref<Onglet>(
    'onglet:commercialisation',
    ONGLETS[0],
  )
  const onglet = ONGLETS.includes(ongletStocke) ? ongletStocke : ONGLETS[0]
```

Ajouter `import { usePref } from '#/lib/preferences.ts'`. Ici `useState` reste utilisé ligne 354 (`commId`) : garder l'import React.

`ONGLETS[0]` vaut bien `'Commercialisation'` (`commercialisation.tsx:192-200`), le défaut est donc inchangé.

- [ ] **Step 3 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

- [ ] **Step 4 : vérifier dans l'application**

Run: `npm run dev`
Expected :
1. sur `/operations?op=324`, choisir l'onglet « Terrain », recharger → « Terrain » est actif dès le premier rendu ;
2. sur `/commercialisation?op=324`, sélectionner un lot, choisir un onglet autre que le premier, recharger, resélectionner un lot → l'onglet est conservé ;
3. les deux clés sont indépendantes : l'onglet d'Opérations n'a pas changé celui de Commercialisation.

- [ ] **Step 5 : vérifier le repli sur onglet inconnu**

Run:
```bash
psql "$DATABASE_URL" -c "update user_pref set valeur = '\"Onglet Supprimé\"'::jsonb where cle = 'onglet:operations';"
```
Recharger `/operations?op=324`.
Expected: le premier onglet (« Stade d'avancement ») est actif, aucune page blanche, aucune erreur console.

---

### Task 7 : état du volet Opérations

**Files:**
- Modify: `src/components/PanneauOperations.tsx:5-22`, `:44-93`

**Interfaces:**
- Consumes: `usePref` (tâche 4)
- Produces: clé `volet:operations`, valeur `{ replie: boolean; recherche: string; inclureMasques: boolean }`

- [ ] **Step 1 : remplacer les trois `useState`**

Dans `src/components/PanneauOperations.tsx`, remplacer les lignes 20-22 :

```ts
  const [replie, setReplie] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [inclureMasques, setInclureMasques] = useState(false)
```

par :

```ts
  const [volet, setVolet] = usePref('volet:operations', {
    replie: false,
    recherche: '',
    inclureMasques: false,
  })
  const { replie, recherche, inclureMasques } = volet
```

Ajouter `import { usePref } from '#/lib/preferences.ts'` et retirer `useState` de l'import ligne 5 (`useMemo` reste utilisé ligne 30).

- [ ] **Step 2 : adapter les quatre écritures**

| Ligne d'origine | Remplacement |
|---|---|
| `:48` `onClick={() => setReplie(false)}` | `onClick={() => setVolet((v) => ({ ...v, replie: false }))}` |
| `:66` `onClick={() => setReplie(true)}` | `onClick={() => setVolet((v) => ({ ...v, replie: true }))}` |
| `:81` `onChange={(e) => setRecherche(e.target.value)}` | `onChange={(e) => setVolet((v) => ({ ...v, recherche: e.target.value }))}` |
| `:88` `onCheckedChange={setInclureMasques}` | `onCheckedChange={(c) => setVolet((v) => ({ ...v, inclureMasques: c }))}` |

Les lectures (`replie` ligne 44, `recherche` ligne 80, `inclureMasques` lignes 32 et 87) restent inchangées grâce à la déstructuration de l'étape 1.

- [ ] **Step 3 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

- [ ] **Step 4 : vérifier dans l'application**

Run: `npm run dev`, aller sur `/operations`.
Expected :
1. taper `bea` dans « Contient », activer « Inclure les Masquer commercial », replier le volet, recharger → volet toujours replié ;
2. déplier → la recherche `bea` et le toggle sont conservés, la liste est filtrée en conséquence ;
3. naviguer vers `/commercialisation` → le même état de volet s'y applique (composant partagé, clé unique).

- [ ] **Step 5 : vérifier le debounce de la saisie**

Onglet Réseau ouvert, taper `beauvais` d'un trait dans le champ de recherche.
Expected: **un seul** appel `setPrefFn` après la fin de la frappe, pas un par caractère.

---

### Task 8 : opération et tranche sélectionnées

**Files:**
- Modify: `src/routes/_authed/operations.tsx:32-42` (beforeLoad), `:93-96` et `:193-199` (écritures)
- Modify: `src/routes/_authed/commercialisation.tsx:28-40` (beforeLoad), `:118-121` et `:148-155` (écritures)
- Modify: `src/components/PanneauOperations.tsx` (défilement vers la ligne sélectionnée)

**Interfaces:**
- Consumes: `usePref` (tâche 4), `context.prefs` (tâche 4)
- Produces: clé `selection`, valeur `{ op?: number; tranche?: number }`, partagée par les deux modules

- [ ] **Step 1 : type partagé de la sélection**

Ajouter à la fin de `src/lib/preferences.ts` :

```ts
/** Opération et tranche courantes, partagées par tous les modules (fil conducteur WinDev). */
export interface Selection {
  op?: number
  tranche?: number
}

export const SELECTION_VIDE: Selection = {}
```

- [ ] **Step 2 : écrire la sélection depuis Opérations**

Dans `src/routes/_authed/operations.tsx`, dans `PageOperations`, après la ligne 78 (`const navigate = …`) :

```ts
  const [, setSelection] = usePref<Selection>('selection', SELECTION_VIDE)
```

Remplacer l'appel du volet (lignes 93-96) :

```tsx
      <PanneauOperations
        selectedId={op ?? null}
        onSelect={(id) => {
          // nouvelle opération → la tranche mémorisée ne s'applique plus
          setSelection({ op: id })
          void navigate({ search: { op: id } })
        }}
      />
```

et le sélecteur de tranche (lignes 193-199) :

```tsx
              <SelecteurTranche
                tranches={d.tranches}
                value={trancheActive}
                onChange={(id) => {
                  setSelection({ op, tranche: id })
                  void navigate({ search: { op, tranche: id } })
                }}
              />
```

Imports à ajouter : `import { SELECTION_VIDE, usePref } from '#/lib/preferences.ts'` et le type `import type { Selection } from '#/lib/preferences.ts'`.

- [ ] **Step 3 : écrire la sélection depuis Commercialisation**

Même chose dans `src/routes/_authed/commercialisation.tsx`, dans `PageCommercialisation`, après la ligne 97 :

```ts
  const [, setSelection] = usePref<Selection>('selection', SELECTION_VIDE)
```

lignes 118-121 :

```tsx
      <PanneauOperations
        selectedId={op ?? null}
        onSelect={(id) => {
          setSelection({ op: id })
          void navigate({ search: { op: id } })
        }}
      />
```

lignes 148-155 :

```tsx
                <SelecteurTranche
                  tranches={operation.data.tranches}
                  value={trancheActive}
                  onChange={(id) => {
                    setSelection({ op, tranche: id })
                    void navigate({ search: { op, tranche: id } })
                  }}
                />
```

Le lot (`?lot=`) n'est volontairement pas mémorisé.

- [ ] **Step 4 : restaurer la sélection dans les deux `beforeLoad`**

Dans `src/routes/_authed/operations.tsx`, remplacer le `beforeLoad` (lignes 37-40) :

```ts
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('operations')) throw redirect({ to: '/' })
    // arrivée sans paramètre → on rejoue la dernière sélection dans l'URL, au
    // SSR : pas de clignotement, et l'URL reste partageable. Pas de boucle,
    // la redirection renseigne justement search.op.
    const selection = context.prefs.selection as Selection | undefined
    if (search.op == null && selection?.op != null) {
      throw redirect({ to: '/operations', search: selection })
    }
  },
```

Dans `src/routes/_authed/commercialisation.tsx`, remplacer le `beforeLoad` (lignes 34-39) :

```ts
  beforeLoad: ({ context, search }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('commercialisation')) {
      throw redirect({ to: '/' })
    }
    const selection = context.prefs.selection as Selection | undefined
    if (search.op == null && selection?.op != null) {
      throw redirect({ to: '/commercialisation', search: selection })
    }
  },
```

Ajouter dans les deux fichiers : `import type { Selection } from '#/lib/preferences.ts'` (déjà fait en étapes 2 et 3).

- [ ] **Step 5 : amener la ligne sélectionnée dans le champ de vision**

Sans cela, la restauration est invisible : l'opération est surlignée mais peut se trouver plusieurs centaines de lignes plus bas dans le volet.

Dans `src/components/PanneauOperations.tsx`, ajouter après la déclaration de `filtrees` (ligne 42) :

```ts
  // la ligne restaurée peut être hors écran dans une liste longue
  const refSelection = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    refSelection.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, filtrees])
```

et sur le bouton de la liste (ligne 103) :

```tsx
          <button
            key={o.id}
            ref={o.id === selectedId ? refSelection : undefined}
            onClick={() => onSelect(o.id)}
```

Compléter l'import React ligne 5 : `import { useEffect, useMemo, useRef } from 'react'`.

- [ ] **Step 6 : barrière de typage**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: `8`

- [ ] **Step 7 : vérifier la restauration**

Run: `npm run dev`
Expected, dans l'ordre :
1. sur `/operations`, sélectionner une opération loin dans la liste, puis une tranche autre que la première ;
2. naviguer vers l'accueil, revenir sur `/operations` par la barre latérale → l'URL devient `/operations?op=…&tranche=…`, la fiche est affichée, et la ligne est **visible** dans le volet gauche sans défilement manuel ;
3. recharger `/operations` sans paramètre → même résultat, sans clignotement de l'écran « Sélectionnez une opération » ;
4. aller sur `/commercialisation` sans paramètre → la **même** opération est ouverte (sélection partagée) ;
5. ouvrir `/operations?op=<autre id>` explicitement → cette opération l'emporte et devient la nouvelle sélection mémorisée (vérifier en revenant sur `/operations` sans paramètre).

- [ ] **Step 8 : vérifier l'absence de boucle de redirection**

Run:
```bash
psql "$DATABASE_URL" -c "select jsonb_pretty(valeur) from user_pref where cle = 'selection';"
```
Expected: `{ "op": <id>, "tranche": <id> }`.

Ouvrir `/operations` : l'onglet Réseau ne doit montrer **qu'une seule** redirection, et la barre d'adresse se stabiliser immédiatement. Puis supprimer la préférence et vérifier le cas vide :

```bash
psql "$DATABASE_URL" -c "delete from user_pref where cle = 'selection';"
```
Recharger `/operations` sans paramètre.
Expected: écran « Sélectionnez une opération dans la liste de gauche », aucune redirection.

- [ ] **Step 9 : vérifier la limite acceptée (opération disparue)**

Run:
```bash
psql "$DATABASE_URL" -c "update user_pref set valeur = '{\"op\": 999999}'::jsonb where cle = 'selection';"
```
Recharger `/operations`.
Expected: redirection vers `/operations?op=999999` puis message « Opération introuvable ». Sélectionner une opération valide répare l'état. Comportement attendu et documenté dans le spec — pas un bug à corriger.

- [ ] **Step 10 : passe finale**

Run: `npm run test`
Expected: 9 tests passent.

Run: `npm run build`
Expected: build réussi.

Run: `grep -rn "localStorage" src --include=*.ts --include=*.tsx`
Expected: aucun résultat — le stockage par navigateur a bien disparu.

---

## Mise à jour de la documentation

- [ ] **Step 1 : refléter l'état livré dans le plan général**

Dans `docs/plan-implementation.md`, la consigne ligne 182 (« Préférences de table mémorisées par page et par utilisateur … à stocker hors du périmètre du transform ») et ligne 187 (« Volet Opérations … position mémorisée ») sont désormais réalisées. Ajouter à la suite de la ligne 182 :

```
  Réalisé : table `user_pref` (clé/valeur JSONB, hors `domaine.ts`), hook
  `usePref` — cf. `docs/superpowers/specs/2026-08-12-preferences-utilisateur-design.md`.
```

- [ ] **Step 2 : documenter la table dans le schéma cible**

Dans `docs/schema-cible.md`, ajouter `user_pref` à la liste des tables applicatives (aux côtés d'`import_runs`), en précisant qu'elle est hors périmètre du transform et survit aux réimports `.bak`.
