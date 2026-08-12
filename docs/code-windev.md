# Code source WinDev (référence métier)

Dépôt : https://github.com/kitpedago/PromoComm_WinDev — cloné dans
[migration_windev/PromoComm_WinDev/](../migration_windev/PromoComm_WinDev/) (117 Mo, re-clonable à volonté).
Consigne projet : **s'en inspirer pour les tâches métiers spécifiques** (projet.md §Base de code).

## Ce qui est lisible (et comment)

| Extension    | Contenu                                                                 | Lisibilité                                                                                                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.wdw` (125) | Fenêtres : définition des champs **+ tout le WLangage des traitements** | ✅ texte (YAML, code dans les blocs `code : \|1-`)                                                                                                                                                                                                                   |
| `.wdc` (17)  | Classes métier                                                          | ✅ texte                                                                                                                                                                                                                                                             |
| `.wdg` (12)  | Collections de procédures                                               | ✅ texte                                                                                                                                                                                                                                                             |
| `.WDR` (174) | Requêtes                                                                | ❌ binaire compilé — **SQL complet exporté par l'utilisateur** dans [requetes_windev.txt](requetes_windev.txt) (UTF-8, 164 requêtes, séparées par `-- Requête : NOM`). NB : les noms de tables y sont les noms _logiques_ WinDev, déjà sans préfixe `t` (Lot = tLot) |
| `.wde/.wte`  | États (impressions)                                                     | ✅ texte                                                                                                                                                                                                                                                             |
| `.wdd/.ana`  | Analyse (schéma BDD)                                                    | binaire — inutile, on a mieux via SQL Server                                                                                                                                                                                                                         |

Recherche type : `grep -rn "NomProcedure\|NomChamp" --include='*.wdw' --include='*.wdc' --include='*.wdg'`
puis lire le bloc `code :` correspondant. Les noms de procédures se listent avec `grep 'name : '`.

## Cartographie des fichiers à fort contenu métier

- **`cCommResa.wdc`** — commissions vendeur : `CalcCommVendeur` =
  `Round(prixVenteReelTTC × txCommVendeur × txRepartitionComm, 2)`, **négatif si évènement = annulation** ;
  `AddCommVendeur`, `CommVendeur_AnnulationResa`, `CommVendeurExists`, `LoadCommercialSelonResa`.
- **`COL_Tranche.wdg`** — alertes de stades : `UpdateAlerteTranche`/`GetAlerteStade` (remplit
  `tTranche.AlerteStadeAvancement_Texte`), `UpdateDatePreviPromoAuto` (calcul récursif des dates
  prévisionnelles des stades, ×3 passes, respecte `Operation.SynchroniserDatesEntreTranche`).
- **`CStadesAvancement.wdc` / `CIntervalle.wdc` / `FEN_Intervalle.wdw`** — intervalles entre stades.
- **`COL_Commercialisation.wdg`** — quasi vide ; la logique de commercialisation vit dans
  `FEN_TABLE_Commercialisation.wdw` (8 100 lignes) et `FEN_Fiche_Commercialisation.wdw`.
- **`COL_ProcéduresGlobales.wdg`** — utilitaires transverses dont `DLookup`/`DCount`/`DSum`
  (accès données ad hoc), `EchapSQL`, `EstSCCVLiquidee`, `CompteBanque_ajout`.
- **`COL_AriBat.wdg` / `FEN_Import_AirBat.wdw`** — import des réserves Air-Bat
  (`AirBat_Import`, `FindLot`, `FindReserve`, `AriBat_ReserveEntreprise`…).
- **`cexcel.wdc` / `CTableurPlanning.wdc` / `COL_Planning.wdg`** — génération Excel et planning.
- **`CMail.wdc` / `MPrepareMail.wdc` / `COL_EMail.wdg`** — mails SAV (préparation, files d'envoi).
- **`cMantis.wdc` / `FEN_Mantis.wdw`** — intégration bugtracker Mantis (probablement hors périmètre).
- **`FEN_Param.wdw`** — CRUD des nomenclatures ; `clsUserParam`/`clsParamSystem` — préférences (table `Param`).

## Correspondances utiles

- Les captures de `migration_windev/*.png` correspondent aux fenêtres `FEN_TABLE_*`/`FEN_*` du même nom
  (voir [ecrans-windev.md](ecrans-windev.md)).
- Les `REQ_*` compilées portent des noms explicites qui confirment le modèle : ex.
  `REQ_IDCommercialisation_courante` (= le « lot courant »), `REQ_Stat_Lot_*` (les compteurs `Nb*`
  de tTranche sont recalculés par ces stats), `REQ_SynchroTrancheDate*`.
- Avant d'implémenter un module dans la nouvelle app, lire la fenêtre correspondante :
  les événements des boutons contiennent les règles de gestion (validations, cascades, calculs).
