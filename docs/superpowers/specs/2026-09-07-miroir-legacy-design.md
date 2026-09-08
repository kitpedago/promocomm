# Base miroir aux noms SQL Server — design (2026-09-07)

## Besoin

Une base PostgreSQL `promocomm_miroir`, sur le même serveur que la prod, dont les tables et
colonnes portent les noms du SQL Server d'origine (`tOperation.IDOperation`…), rafraîchie à
intervalle depuis `public` de la prod. Lecture seule de fait : seul le job y écrit.

## Principe

Le mapping `legacy → public` de `src/lib/etl/transform.ts` (tableau `copies`) est la seule
source de vérité. Il est **inversé mécaniquement** : chaque expression du `select` est réduite
à sa colonne legacy, chaque colonne de `cols` est la colonne publique correspondante.

| Forme dans `select`                         | Colonne legacy | Expression inverse (depuis public) |
| ------------------------------------------- | -------------- | ---------------------------------- |
| `s."Col"`                                   | Col            | `col`                              |
| `COALESCE(s."Col", '')`                     | Col            | `col`                              |
| `NULLIF(s."Col", 0)` (fk)                   | Col            | `COALESCE(col, 0)`                 |
| `(SELECT s."Col" WHERE EXISTS …)` (fkSafe)  | Col            | `COALESCE(col, 0)`                 |
| `NULLIF(s."Col", 0)::bigint::text`          | Col            | `COALESCE(col, 0)` (pg recaste)    |
| `(s."Col" <> 0)` (entier lu en booléen)     | Col            | `col::int`                         |
| `COALESCE(NULLIF(s."Col", ''), (SELECT …))` | Col            | `col` (texte, sans l'id résolu)    |
| autre (`ROW_NUMBER`, `CASE`…)               | —              | colonne ignorée, avertissement     |

Les `WHERE` des copies ne sont pas repris : toutes les lignes publiques partent au miroir.

## Composants

1. `transform.ts` : `copies` exporté.
2. `src/lib/miroir.helpers.ts` (pur, testé) : `colonneLegacy(expr)`, `inverser(copy)` →
   `{ table, colonnes: [{legacy, expr}], ignorees }`.
3. `src/lib/miroir.schema.sql` : DDL `DROP TABLE IF EXISTS` + `CREATE TABLE` des 191 tables (le legacy évolue à chaque .bak), snapshot du
   schéma `legacy` local (types déjà convertis par l'import .bak). Régénéré par
   `npm run db:miroir -- --ddl` quand un nouveau .bak est importé.
4. `src/lib/miroir.server.ts` : `preparerMiroir()` (rôles, base, droits — voir ci-dessous) puis
   `rafraichirMiroir(urlSource, urlEcrivain)` : DDL, puis par table inversée `TRUNCATE` + copie
   par paquets (`construireInsert` de importprod.helpers). Refus si source = miroir. Journal.
5. Planification : `MIROIR_DB`, `MIROIR_INTERVALLE_MIN` (intervalle initial, défaut 60).
   `db/index.ts` arme la boucle (état dans `globalThis`) quand `MIROIR_DB` est définie.
   `npm run db:miroir` pour un rafraîchissement manuel.

## Page `/admin/miroir` (ajoutée le même jour)

- **Rafraîchir** à la demande (tâche de fond, un seul passage à la fois), dernier passage
  avec journal.
- **Planification** persistée dans `app_param` (`MiroirPlanification`, JSON) : intervalle en
  minutes (0 = désactivée), jours de la semaine, plage horaire `heureDebut`–`heureFin` en
  heure locale du serveur (`TZ=Europe/Paris` dans docker-compose). `prochainPassage()`
  (miroir.helpers.ts, testé) : `dernier + intervalle` s'il tombe dans la fenêtre, sinon
  l'ouverture de la prochaine fenêtre ; `setTimeout` chaîné.
- **Rôles dédiés** (config : `MIROIR_DB` = nom de la base, sur le serveur de `DATABASE_URL`) :
  - `miroir_ecrivain` : propriétaire de la base miroir, seul rôle du job. Créé par
    `preparerMiroir()` avec les droits de l'application avant chaque passage (idempotent :
    rôle, mot de passe, base, reprise de propriété des tables table par table).
  - `miroir_lecteur` : SELECT sur toutes les tables + privilèges par défaut, réaccordés après
    le DDL de chaque passage. Créé/régénéré depuis la page.
  - `REVOKE CONNECT … FROM PUBLIC` sur la base de l'application : aucun des deux rôles ne
    peut s'y connecter (un job buggé ne peut pas la toucher).
  - Mots de passe aléatoires, chiffrés dans `app_param` (`secrets.server.ts`) ; celui du
    lecteur est relisible depuis la page.
  - Opérations sérialisées (passage, préparation, création du lecteur) : des GRANT/ALTER
    concurrents échouent (« tuple concurrently updated »). Les scripts posent `MIROIR_AUTO=0`
    pour ne pas déclencher le passage automatique du chargement de `db/index.ts`.

## Hors périmètre

Clés primaires/index sur le miroir, historique multi-passages, colonnes `cur*`.
