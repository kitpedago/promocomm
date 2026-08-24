# Visuel d'opération — design

Date : 2026-08-24 · Branche : feat/preferences-utilisateur

## Objectif

Associer un visuel (image) à chaque opération : recherche automatique sur le site
keredes.coop, upload manuel en secours, affichage en miniature dans le volet
Opérations et en zone dédiée dans la fiche Opération (Paramètres OTL).

## Stockage

Table `operation_visuel` dans `src/db/schema.ts` (hors `domaine.ts` : survit au
réimport .bak qui TRUNCATE CASCADE les tables du domaine) :

| colonne | type | note |
|---|---|---|
| id | serial PK | |
| operation_id | integer UNIQUE **sans FK** | FK provoquerait le truncate en cascade ; IDs legacy stables entre réimports |
| contenu | bytea | image originale, plafond 3 Mo |
| mime | text | image/jpeg, image/png, image/webp |
| miniature | text | data-URL ~220 px (pattern `ticket_capture`) |
| source | text | URL d'origine keredes.coop ou `upload` |
| cree_le | timestamp | |

Réutilise le type custom `bytea` et les helpers `decodeCapture` /
`sanitizeMiniature` de `tickets.helpers.ts`.

## Recherche keredes.coop (pas d'API, pas de clé)

Le site est un WordPress dont l'API REST est bloquée (401) → scraping HTML :

1. Liste des programmes : `https://keredes.coop/achat/biens/?type[]=bien-neuf`
   → extraire les slugs `bien-neuf/<slug>/`. Cache mémoire serveur ~1 h.
2. Match : libellé de l'opération slugifié (minuscules, sans accents) « contenu
   dans » le slug ou inversement.
3. Page programme : extraire les `src` des `<img class="estateImages__image">`,
   dédupliqués → candidats.
4. Téléchargement de l'image choisie côté serveur (fetch, plafond 3 Mo,
   Content-Type image/* exigé).

Limite connue : les programmes livrés sont retirés du site (redirect 301 vers
`/achat/neuf/`) → introuvables, fallback upload manuel.

## Flux

- **Fiche Opération (Paramètres OTL)** : zone visuel dans la fiche — bandeau
  image si présente, boutons « Rechercher un visuel » (grille de candidats,
  clic = choix), « Remplacer » (input fichier + coller Ctrl+V, pattern
  TicketNouveau), « Retirer ». Composant dédié, hors types génériques de
  `ModaleFiche`.
- **Création d'une opération** : après insert, recherche + 1ᵉʳ candidat pris
  automatiquement, silencieux, échec non bloquant.
- **Backfill** : bouton « Rechercher les visuels manquants » (Paramètres) —
  boucle sur les opérations sans visuel, 1ᵉʳ candidat chacune, rapport
  « X trouvés, Y introuvables ». Relançable.
- **Volet Opérations** (`PanneauOperations`) : miniature 32 px à gauche du
  libellé, placeholder neutre si absente. `getOperationsCommFn` renvoie la
  colonne `miniature` seule (jamais le bytea).

## Server functions (pattern createServerFn + requireSession/requireEcriture)

- `rechercherVisuelsFn` (GET) : libellé → liste d'URLs candidates.
- `choisirVisuelFn` (POST, écriture) : operationId + URL (+ miniature data-URL
  optionnelle générée côté client, canvas comme `tickets.captures.ts`) →
  télécharge l'original côté serveur, stocke. Pas de lib image côté serveur :
  `miniature` est **nullable**. L'auto/backfill stocke `miniature = null` ;
  le volet affiche alors un placeholder ; la fiche, quand elle charge
  l'original, régénère la miniature côté client et la sauve (lazy backfill).
- `uploadVisuelFn` (POST, écriture) : data-URL + miniature → stocke (pattern
  `insertCaptures`).
- `retirerVisuelFn` (POST, écriture) : delete par operationId.
- `backfillVisuelsFn` (POST, écriture) : boucle serveur, renvoie le rapport.
- `getVisuelFn` (GET) : original en data-URL pour le bandeau de la fiche.

## Erreurs

- Site injoignable / HTML changé : recherche renvoie liste vide + message
  « aucun résultat », jamais d'exception à l'écran.
- Image > 3 Mo ou non-image : refus serveur, message clair.
- Backfill : erreurs individuelles comptées « introuvables », la boucle continue.

## Tests

- Slugification + matching (unitaires purs).
- Extraction des images depuis un HTML fixture (page programme sauvegardée).
- decode/refus taille et mime sur `choisirVisuelFn`/`uploadVisuelFn` (réutilise
  les patterns de tests tickets).
- Pas de test d'intégration réseau contre le site réel.
