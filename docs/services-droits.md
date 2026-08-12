# Services et droits (transposé de WinDev)

Sources : code de démarrage `PRomoComm.wdp` (liste des services), `FEN_Login.wdw` (mots de
passe en dur), `FEN_Menu.wdw` (modules visibles par service), gabarit `FENMOD_Master.wdt` +
table legacy `Droit` (droits fins par contrôle). Implémenté le 2026-07-05 :
[src/lib/services.ts](../src/lib/services.ts) (liste + matrice), `services.server.ts`
(mots de passe, jamais côté client), `login-fn.ts` (server function), comptes Better Auth
`<slug>@promocomm.local` synchronisés par `npm run db:seed`, champ `user.service` en session.

En dur pour l'instant (demande utilisateur) ; à passer en table plus tard — sans risque :
le réimport .bak ne touche que `legacy` + les 30 tables du domaine, jamais l'auth.

## Matrice modules × services (FEN_Menu)

| Module            | Promotion | Comptabilité | Consultation | Dir. commercial | Administrateur | Juridique | Dir. Promotion |
| ----------------- | :-------: | :----------: | :----------: | :-------------: | :------------: | :-------: | :------------: |
| Commercialisation |    ✅     |      ✅      |      ✅      |       ✅        |       ✅       |    ✅     |       ✅       |
| Opérations        |    ✅     |      ✅      |      ✅      |       ✅        |       ✅       |    ✅     |       ✅       |
| Acquéreurs        |    ✅     |      ✅      |      ✅      |       ✅        |       ✅       |    ✅     |       ✅       |
| SCCV              |    ✅     |      ✅      |      ✅      |       ✅        |       ✅       |    ✅     |       ✅       |
| SAV Promotion     |    ✅     |      —       |      ✅      |        —        |       ✅       |     —     |       ✅       |
| Paramètres        |     —     |      ✅      |      —       |       ✅        |       ✅       |     —     |       ✅       |
| Compta & Finances |     —     |      ✅      |      —       |        —        |       ✅       |     —     |       —        |
| Bilan             |     —     |      ✅      |      —       |        —        |       ✅       |     —     |       —        |
| Honoraires        |     —     |      ✅      |      —       |        —        |       ✅       |     —     |       ✅       |
| Déclarations      |    ✅     |      ✅      |      —       |        —        |       ✅       |     —     |       ✅       |

« Consultation » se connecte **sans mot de passe** (comme dans WinDev : `bWithPassword=False`).

## Droits fins (phase ultérieure)

Le gabarit `FENMOD_Master` applique en plus, à l'ouverture de chaque fenêtre, la table
`Droit` (235 lignes en legacy) : (Fenetre, Controle, Indice, IDService, IDTypeDroit) avec
IDTypeDroit 1 = lecture seule, 2 = masqué. À transposer quand les écrans existeront
(probablement en table `droit` + hook côté composants). `TypeDroit` = nomenclature (2 lignes).

## Tableau de bord (FEN_Menu)

La page d'accueil cible (capture `TableauDeBord.png`) : tuiles des modules autorisés +
widgets « Lancements commercialisation / Livraisons / En travaux depuis 90 jours » et
« SCCV créées / liquidées depuis 1 an » (requêtes `REQ_Tranche_Situation_DernierMois_*`,
`REQ_SCCV_Creation_DernierMois`, `REQ_SCCV_Liquidation_DernierMois`).

Implémenté le 2026-07-05 : les tuiles sont devenues le menu latéral
([src/components/Sidebar.tsx](../src/components/Sidebar.tsx), filtré par la matrice
ci-dessus, Paramètres rangé sous « Administration ») et les 5 widgets vivent sur
l'accueil ([src/routes/_authed/index.tsx](../src/routes/_authed/index.tsx),
requêtes transposées dans [src/lib/dashboard.ts](../src/lib/dashboard.ts)). Pour cela,
`tranche` a repris les caches legacy `StadeCOM` / `StadeIDSituation` / `StadeDepuisLe`
(→ `stade_com`, `situation_id`, `situation_depuis_le`) et la nomenclature
`tListeSituation` (→ table `situation` : 1 ÉTUDE, 2 TRAVAUX, 3 LIVRÉ, 4 Fin SAV).
Fenêtres identiques à WinDev (90 j / 1 an) : vides tant que le .bak importé
s'arrête à début 2025.
