# Préférences mémorisées par utilisateur — design

Date : 2026-08-12

## Objectif

Mémoriser, pour chaque utilisateur et d'un poste à l'autre :

- largeurs des colonnes de table ;
- options d'affichage des tables (colonnes visibles, ordre, tri, filtre, lignes
  par page, « 1 seule ligne », « ligne compacte ») ;
- onglet actif de chaque page à onglets ;
- opération sélectionnée (et sa tranche), réappliquée à l'ouverture de la page ;
- état du volet Opérations (replié, recherche, « Inclure les Masquer commercial »).

Répond à `docs/plan-implementation.md:182` (« Préférences de table mémorisées par
page et par utilisateur … à stocker hors du périmètre du transform ») et
`:187` (« Volet Opérations … position mémorisée »).

## État actuel

`src/components/DataTable.tsx:71-130` persiste déjà ses réglages, mais en
`localStorage`, sous une clé `promocomm:table:<id>` sans identifiant
d'utilisateur : les préférences sont attachées au navigateur, pas à la personne,
et deux comptes partageant un poste se marchent dessus.

Onglets (`src/components/Onglets.tsx`), opération sélectionnée (`?op=` / `?tranche=`
dans l'URL) et volet Opérations (`src/components/PanneauOperations.tsx:20-22`)
ne sont pas mémorisés du tout.

## Décisions

| Sujet                       | Décision                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Stockage                    | PostgreSQL, table applicative, **hors** `src/db/domaine.ts` → survit aux réimports `.bak` |
| Forme                       | Clé/valeur JSONB, une ligne par préférence, PK `(user_id, cle)`                           |
| `localStorage`              | **Supprimé.** Les préférences arrivent au SSR via le loader, une seule source de vérité   |
| Portée de l'opération       | Globale, partagée entre modules (fil conducteur WinDev)                                   |
| Restauration de l'opération | Redirection vers `?op=…&tranche=…` : URL représentative et partageable                    |

L'hybride `localStorage` + base a été écarté après coup : les préférences étant
chargées côté serveur dès le premier rendu, le cache local ne couvrait plus qu'une
fenêtre de ~500 ms (rechargement pendant le debounce d'écriture), au prix de la
divergence local/serveur que le chargement serveur élimine.

La forme clé/valeur a été préférée à un blob JSON unique par utilisateur : ce
dernier fait s'écraser mutuellement deux onglets de navigateur ouverts sur des
pages différentes (Opérations et Commercialisation), cas courant ici.

## Modèle de données

Dans `src/db/schema.ts` (aux côtés de `importRuns`), pas dans `domaine.ts` :

```ts
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

Migration générée par `npm run db:generate`, appliquée par `npm run db:migrate`.

### Clés

| Clé                        | Valeur                                                                                            | Écrite par                             |
| -------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `table:<id>`               | `TableParams` (tri, visibilité, ordre, largeurs, filtre, `pageSize`, `uneLigne`, `ligneCompacte`) | `DataTable`                            |
| `onglet:operations`        | libellé de l'onglet actif                                                                         | `routes/_authed/operations.tsx`        |
| `onglet:commercialisation` | idem                                                                                              | `routes/_authed/commercialisation.tsx` |
| `selection`                | `{ op: number, tranche?: number }`                                                                | les deux pages                         |
| `volet:operations`         | `{ replie, recherche, inclureMasques }`                                                           | `PanneauOperations`                    |

Les `<id>` de table sont ceux déjà passés en prop (`operations-stades`,
`operations-subventions`, `commercialisation-lots`, …).

## API serveur

Dans `src/lib/preferences.ts`, deux server functions gardées par
`requireSession()` (`src/lib/session.server.ts`) — l'`userId` vient de la session,
jamais du client :

- `getPrefsFn()` → `Record<string, unknown>` : toutes les préférences de
  l'utilisateur en une requête (quelques dizaines de lignes) ;
- `setPrefFn({ cle, valeur })` : upsert `onConflictDoUpdate` sur `(user_id, cle)`.

## Chargement

`src/routes/_authed.tsx:9-13` retourne déjà `{ session }` dans le contexte de
route. On y ajoute `prefs` :

```ts
beforeLoad: async ({ context }) => {
  const session = await getSessionFn()
  if (!session?.user) throw redirect({ to: '/login' })
  const prefs = await context.queryClient.ensureQueryData({
    queryKey: ['prefs'],
    queryFn: () => getPrefsFn(),
    staleTime: Infinity,
  })
  return { session, prefs }
}
```

`ensureQueryData` garantit une seule requête par session de navigation, et c'est
le cache que lit le hook client : le `beforeLoad` des pages enfants et les
composants voient toujours la même valeur.

## Hook client

Toujours dans `src/lib/preferences.ts` :

```ts
export function usePref<T>(
  cle: string,
  defaut: T,
): [T, (v: T | ((prec: T) => T)) => void]
```

**Lecture** : `useQuery(['prefs'])` — jamais un fetch, les données viennent du
loader. Valeur rendue : `prefs[cle] ?? defaut`. Si `defaut` est un objet simple
(ni tableau, ni primitive), fusion superficielle `{ ...defaut, ...stocke }` — une
préférence enregistrée avant l'ajout d'un champ reste utilisable, et les
`defaultHidden` par table (comportement actuel de `DataTable.tsx:76`)
s'appliquent tant que l'utilisateur n'a pas touché au menu Affichage : la fusion
étant superficielle, `columnVisibility` est repris en bloc dès qu'il existe, et
une colonne `defaultHidden` ajoutée après coup au code reste visible pour qui a
déjà réglé ses colonnes. Comportement volontaire : un réglage explicite prime.

**Écriture**, en deux temps :

1. `queryClient.setQueryData(['prefs'], …)` — l'UI répond immédiatement, aucun
   aller-retour réseau dans le chemin de rendu ;
2. `setPrefFn` en debounce de 500 ms, une minuterie par clé — un glissement de
   colonne émet des dizaines d'événements `onChange` et ne produit qu'un `UPDATE`.

L'échec du push serveur est avalé (pas de bandeau d'erreur pour une largeur de
colonne) : la session reste correcte, seule la persistance est perdue.

## Sites d'appel

| Fichier                                        | Changement                                                                                                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/DataTable.tsx:71-130`          | `lireParams`, `cle`, `useState`, `restaure` et les deux `useEffect` supprimés au profit de `usePref('table:' + id, base)`. Le helper `set()` et « Réinitialiser la table » sont inchangés. `pageIndex` reste local, non mémorisé (comportement actuel). |
| `src/routes/_authed/operations.tsx:354`        | `useState<Onglet>` → `usePref('onglet:operations', ONGLETS[0])`                                                                                                                                                                                         |
| `src/routes/_authed/commercialisation.tsx:351` | idem, clé `onglet:commercialisation`                                                                                                                                                                                                                    |
| `src/components/PanneauOperations.tsx:20-22`   | les trois `useState` fusionnés en `usePref('volet:operations', { replie: false, recherche: '', inclureMasques: false })`                                                                                                                                |

`DataTable` ne change qu'en un point : toutes les tables existantes et à venir en
héritent sans modification.

## Restauration de l'opération

**Écriture**, à côté des `navigate` existants (`operations.tsx:95`,
`commercialisation.tsx:120`, et les `onChange` de `SelecteurTranche`) :
`setSelection({ op: id })` à la sélection d'une opération,
`setSelection({ op, tranche: id })` au changement de tranche.

**Lecture**, dans le `beforeLoad` des deux pages, après le contrôle de droits
déjà présent :

```ts
if (search.op == null && context.prefs.selection?.op != null)
  throw redirect({ to: Route.fullPath, search: context.prefs.selection })
```

Exécuté au SSR : l'URL est correcte avant le premier rendu, sans clignotement.
Pas de boucle possible — la redirection ne part que si `search.op` est absent, et
elle le renseigne. Un lien explicite `?op=99` l'emporte et devient la nouvelle
sélection mémorisée.

**Visibilité dans le volet gauche.** L'opération restaurée est déjà surlignée
(`PanneauOperations.tsx:107`), mais peut se trouver hors écran dans une liste de
plusieurs centaines d'entrées : au montage, si `selectedId` est renseigné, le
bouton correspondant appelle `scrollIntoView({ block: 'nearest' })`. Sans cela la
restauration est invisible pour l'utilisateur.

Le lot sélectionné (`?lot=`) n'est pas mémorisé — hors du périmètre demandé.

## Cas limites

- Onglet mémorisé disparu après renommage → repli sur `ONGLETS[0]`
  (`ONGLETS.includes(stocke) ? stocke : ONGLETS[0]`).
- Préférence de table enregistrée avant l'ajout d'une colonne → la fusion
  superficielle avec `base` fournit les champs manquants.
- Suppression d'un utilisateur → `onDelete: 'cascade'`.
- Clés orphelines (table retirée du code) → laissées en base, volume négligeable,
  aucune purge.
- Les anciennes clés `promocomm:table:<id>` du `localStorage` ne sont pas
  migrées : elles deviennent inertes, chaque utilisateur reconfigure une fois.

**Limite acceptée** : si l'opération mémorisée a disparu ou devient invisible
(`masquerCommercial`), la page affiche « Opération introuvable ». On ne paie pas
une requête de validation dans le `beforeLoad` pour un cas rare ; une nouvelle
sélection répare l'état.

## Vérification

Premier fichier de test du dépôt (`vitest` est installé, aucun test à ce jour) :
`src/lib/preferences.test.ts` sur la fonction pure de résolution
valeur stockée + défaut :

- clé absente → le défaut ;
- objet partiel stocké → fusion avec le défaut, champs manquants comblés ;
- valeur non-objet (nombre, chaîne, tableau) → renvoyée telle quelle, sans fusion.

Passe manuelle ensuite sur les quatre écrans : redimensionner une colonne,
masquer une colonne, changer d'onglet, replier le volet, sélectionner une
opération — puis recharger, et vérifier via une seconde session navigateur que
les réglages suivent le compte et non le navigateur.

## Hors périmètre

- Interface de remise à zéro globale des préférences (le bouton « Réinitialiser
  la table » existant suffit par table).
- Préférences partagées par service ou par rôle.
- Mémorisation de la page courante d'une table, du lot sélectionné, du
  défilement des tables.
