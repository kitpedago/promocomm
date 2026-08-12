# Charte graphique PromoComm (Keredes)

Source de vérité : maquette [migration_windev/ChartePromoComm.html](../migration_windev/ChartePromoComm.html)
(l'ouvrir dans un navigateur pour voir le rendu cible — module Compta & Finances/GFA maquetté).
Tokens implémentés dans [src/styles.css](../src/styles.css) le 2026-07-05. Thème **clair uniquement**.

## Fondamentaux

- **Police** : Instrument Sans (auto-hébergée, `public/fonts/*.woff2`, extraite de la maquette).
- **Logo** : `public/keredes-logo.png` (« Keredes — L'immobilier coopératif », 223×65).
- **Arrondis** : 8 px standard (`--radius`), 12 px pour les cartes (`rounded-xl`), 999 px badges.
- **Pas d'ombre marquée** : cartes bordées `--line`, ombre 0 1px 4px rgba(0,0,0,.04) max.

## Tokens (CSS variables dans styles.css)

| Token                                   | Valeur                      | Usage                                             |
| --------------------------------------- | --------------------------- | ------------------------------------------------- |
| `--ink`                                 | #232B49                     | texte, titres, nav active, fonds sombres (avatar) |
| `--ink-soft`                            | #5A5F73                     | texte secondaire, cellules                        |
| `--ink-faded`                           | #7A7E8F                     | en-têtes de colonnes, libellés                    |
| `--muted`                               | #9A97A8                     | placeholders, sous-titres, états vides            |
| `--paper`                               | #F4F3EF                     | fond général du body                              |
| `--card`                                | #FFFFFF                     | cartes, sidebar, header                           |
| `--cream`                               | #FBFAF7                     | panneau maître, en-têtes de tables                |
| `--cream-hover`                         | #F8F6F0                     | survol de lignes                                  |
| `--line` / `--line-soft` / `--line-row` | #E7E4DC / #EFEDE6 / #F0EEE7 | bordures / séparateurs / lignes de table          |
| `--input-border`                        | #E0DDD4                     | champs de saisie                                  |
| `--gold` / `--gold-hover`               | #F5B841 / #EFAB27           | CTA primaires, soulignés actifs                   |
| `--gold-deep`                           | #C99A2B                     | kickers, groupes de colonnes actifs               |
| `--gold-tint` / `--gold-ink`            | #FBEFD3 / #8A6413           | badges dorés                                      |
| `--danger` / `--danger-tint`            | #B4432E / #FAF0ED           | suppression, erreurs                              |
| `--ok-tint` / `--info-tint`             | #E2F0E5 / #E3EAF6           | badges vert / bleu                                |

Le thème shadcn/ui est mappé dessus : `primary` = doré (texte encre), `destructive` = #B4432E,
`border`/`input`/`ring` charte → les composants `ui/*` sont automatiquement conformes.

## Recettes de composants (extraites de la maquette, à réutiliser pour tout nouvel écran)

- **Layout modules** : sidebar nav 208px blanche (bordure droite `--line`) · panneau maître
  264px `--cream` (liste opérations/SCCV, recherche, « Inclure les masqués ») · détail flex-1
  sur `--paper` avec padding 20/28px.
- **Carte/section** : `island-shell rounded-xl` ; en-tête interne : flex, padding 14px 18px,
  bordure basse `--line-soft`, `h2` 15.5px w700 + sous-titre 12px `--muted`.
- **Table** : bande de groupes (10.5px uppercase, actif `--gold-deep` souligné 2px `--gold`,
  inactifs `--ink-faded` soulignés `--line-strong`) ; en-têtes 11px uppercase `--ink-faded` w700
  sur `--cream` ; lignes 13px, bordure `--line-row`, hover `--cream-hover` ;
  chiffres `tabular-nums`, montants alignés à droite.
- **Boutons** : primaire = `bg-gold text-ink w700 rounded-lg` hover `--gold-hover`
  (= `<Button>` par défaut) ; secondaire = blanc bordé `--input-border` hover bordure encre ;
  icônes 28×28 `rounded-[7px]` ; suppression : texte `--danger`, hover fond `--danger-tint`.
- **Badges** : classe `.badge-pill` + fond/texte selon statut (`--ok-tint`, `--info-tint`,
  `--gold-tint`+`--gold-ink`).
- **Onglets** : rangée bordée bas 2px `--line`, actif : souligné 3px (encre ou or), w600.
- **Kicker** : `.island-kicker` (11px, uppercase, `--gold-deep`) au-dessus des titres.
- **Avatar utilisateur** : cercle `--ink`, initiales `--gold` (cf. header).
- **Modale** : overlay sombre, carte blanche, ombre 0 24px 64px rgba(20,25,45,.35),
  animations `kd-overlay-in`/`kd-modal-in` (voir maquette).

## Notes

- Les classes historiques (`island-shell`, `island-kicker`, `nav-link`, `display-title`) et les
  alias `--sea-ink`/`--sea-ink-soft` sont re-mappés sur la charte : les anciennes pages ont
  basculé sans réécriture ; utiliser les nouveaux noms (`--ink`…) pour le code neuf.
- Le mode sombre a été retiré (charte claire) — ne pas réintroduire de `dark:` sans décision.
