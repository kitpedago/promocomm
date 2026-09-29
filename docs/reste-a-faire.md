# Reste à faire (état au 2026-09-29)

Toutes les phases fonctionnelles du [plan](plan-implementation.md) sont livrées
(0 à 8 ✅, 9 🔶). Ce qui suit est **tout ce qui reste**, classé par ce qui le
bloque. Rien ici n'est réalisable sans une décision, une donnée ou un accès
externe — le développement autonome est allé au bout de ce qu'il pouvait.

## 1. Décisions à prendre avec le client

Toutes tranchées au 2026-09-29 — section gardée pour mémoire.

| Sujet                                              | État                                                                                                                                                                                                                                                                                                         | Décision attendue |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| **`tSubvention2`**                                 | ✅ Abandon confirmé par le client le 2026-09-29 : table non reprise (reprise morte — IDs en texte, **aucune référence dans les fenêtres ni requêtes WinDev**, les 291 déblocages pointent tous vers `tSubvention`). Les taux `PremierDeblocage*`/`SoldeDeblocage*` qu'elle seule portait ne sont pas repris. | —                 |
| **Motif d'annulation d'une réservation**           | ✅ Résolu le 2026-08-13 : liste « Motif annulation » dans `/parametres` (table côté app, hors ETL — survit aux réimports), semée avec les 4 motifs du combo WinDev fournis par le client, et modale « Annuler la réservation » branchée dessus (select, stockage en libellé dans la colonne texte).          | —                 |
| **TMA (travaux modificatifs acquéreur)**           | ✅ Non réactivé, décision du client le 2026-09-29. Fonction neutralisée à la source dans le WinDev actuel (contrôles commentés dans FEN_TABLE_Commercialisation). Les données `tma` (178) restent reprises pour la base miroir, aucun écran ne les édite.                                                    | —                 |
| **Validations réactivées** (phase 4, pour mémoire) | ✅ Réactivation validée par le client le 2026-09-29 : RS obligatoire, SIRET nettoyé + avertissement 14 chiffres, total % participation ≠ 100 signalé — commentées dans le legacy, actives dans la reprise.                                                                                                   | —                 |

## 2. Bloqué par le contenu du prochain `.bak`

Le `.bak` importé (2026-07-04) est en retard sur l'analyse WinDev actuelle.
À la prochaine livraison de sauvegarde, vérifier la présence de :

- ~~**`ChampImportLot`**~~ — couvert le 2026-09-29. La table est un fichier
  HFSQL local de WinDev (elle n'arrivera jamais par un `.bak` SQL Server) :
  le client l'a exportée (`migration_windev/ChampImportLot.xlsx`, 24 colonnes)
  et elle vit en dur dans `src/lib/importlots.helpers.ts`. Import Excel des
  lots : Paramètres > Opérations, tranches et lots, bouton « Importer des lots
  (Excel) » de la tranche sélectionnée (`.xlsx`, ligne 1 = entêtes, arrêt à
  « TOTAUX », remplace les lots de la tranche après confirmation). Écart
  assumé avec WinDev, qui supprimait aussi les réservations des lots
  remplacés : une tranche dont les lots portent des réservations, des réserves
  SAV ou des commissions vendeur n'est pas écrasée.
- ~~**`tHonoCommHFFacture.IDPrestataire` et `IDBaremeHonoComm`**~~ — arrivées
  avec le back du 2026-09-08 : migration 0028 (`bareme_hono_comm`, FK sur
  `hono_comm_facture`), ETL, colonnes + selects + filtre Prestataire sur les
  factures d'honoraires de commercialisation, liste « Barèmes honoraires
  commercialisation » dans Paramètres.

## 3. Transverses à cadrer (intégrations externes)

| Fonction                                                      | Ce qui manque pour démarrer                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mails SAV** (chargé d'op, journalier, mensuels entreprises) | Serveur SMTP (hôte, compte, expéditeur), modèles de mails, périmètre des destinataires. Les données (`reserve.envoyer_mail`, `envoyer_mail_date`, emails des entreprises) sont prêtes.                                                                                                                                                                                                                                                                                                      |
| **Import Air-Bat**                                            | Format du fichier d'échange (le legacy stocke `id_air_bat` + verrou `est_verrouille`, repris).                                                                                                                                                                                                                                                                                                                                                                                              |
| **Impression / états**                                        | Choix des états à reprendre parmi les `.wde` WinDev (réserves par lot/entreprise, enquêtes acquéreurs…) et de la cible (PDF serveur ?).                                                                                                                                                                                                                                                                                                                                                     |
| **Alertes stades**                                            | L'écran de paramétrage existe (`/parametres` > Stades d'avancement : règles, états, types de date — tables reprises, **vides dans le legacy, jamais utilisées**). Le moteur d'alerte (`GetAlerteStade`/`UpdateAlerteTranche` WinDev) n'est pas repris : à construire seulement si le client alimente les règles. Les archives de stades ne reprennent que les entêtes (le détail `ArchiveStadeAvancementListe` legacy est vide).                                                            |
| **« Synchro. dates » entre tranches**                         | ✅ Couvert (2026-09-29) : à la validation d'un stade (onglet Stade d'avancement des Opérations), si l'opération (`synchroniser_dates_entre_tranche`) et le stade (`avec_synchro_entre_tranche`) l'autorisent, la date prévi promo est recopiée sur le même stade des autres tranches, la date réelle seulement si elle y est vide. Les deux bascules se règlent dans `/parametres`. Dans WinDev la synchro était inactive depuis cet écran (`gbCurOperationSynchroTranche` jamais affecté). |
| **Exports Excel**                                             | ✅ Couvert : bouton « Exporter » (CSV pour Excel) sur toutes les tables de l'app, plus l'export d'interface de la Commercialisation (BTN_Exporter — 62 colonnes iso-`REQ_InterfaceCommercialisation_Lot`). Ne reste que si un format `.xlsx` spécifique est exigé.                                                                                                                                                                                                                          |

## 4. Bascule (fin de parcours)

1. Dernier réimport `.bak` (celui qui apporte les tables de la section 2).
2. Correction du backlog des défauts source (`docs/` — orphelins, doublons,
   nomenclatures concurrentes) **après** ce dernier import, pas avant.
3. Gel des saisies WinDev, l'app devient la source de vérité.
4. Infrastructure : déploiement Docker sur le PC Windows 11 du client
   (Docker Desktop + auto-login, images GHCR, `docker-compose.prod.yml`,
   `update.ps1`, backups `pg_dump` planifiés) — voir `docs/projet-deploiement.md`.
   Abandonné : VPS, sous-domaine, DNS/Caddy.
5. Recette utilisateurs par service (la matrice de droits est en place :
   modules par service + droits fins `droit`/`requireDroit`).

## Hors périmètre notable (assumé, documenté dans le plan)

- ~~Écran des factures de missions (`facture`)~~ — couvert le 2026-09-29 :
  table Facture du jalon sélectionné dans l'onglet Stade d'avancement des
  Opérations (CRUD par modale, capture Opérations.png).
- Nomenclatures legacy jamais alimentées ou hors analyse : non reprises
  (détail par phase dans le plan).
