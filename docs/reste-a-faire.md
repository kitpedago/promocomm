# Reste à faire (état au 2026-08-13)

Toutes les phases fonctionnelles du [plan](plan-implementation.md) sont livrées
(0 à 8 ✅, 9 🔶). Ce qui suit est **tout ce qui reste**, classé par ce qui le
bloque. Rien ici n'est réalisable sans une décision, une donnée ou un accès
externe — le développement autonome est allé au bout de ce qu'il pouvait.

## 1. Décisions à prendre avec le client

| Sujet                                              | État                                                                                                                                                                                                                                                                                                | Décision attendue                                                                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`tSubvention2`**                                 | Dossier instruit : reprise morte — IDs en texte (max « 99 »), colonnes `Organisme_old`/`IDOperation_old`, **aucune référence dans les fenêtres ni requêtes WinDev**, les 291 déblocages pointent tous vers `tSubvention` (IDs int, dates jusqu'en 2024 contre 2023).                                | Confirmer l'abandon (recommandé). Si les taux historiques `PremierDeblocage*`/`SoldeDeblocage*` (qui ne vivent que sur cette table morte) ont une valeur, les reprendre en archive lecture seule. |
| **Motif d'annulation d'une réservation**           | ✅ Résolu le 2026-08-13 : liste « Motif annulation » dans `/parametres` (table côté app, hors ETL — survit aux réimports), semée avec les 4 motifs du combo WinDev fournis par le client, et modale « Annuler la réservation » branchée dessus (select, stockage en libellé dans la colonne texte). | —                                                                                                                                                                                                 |
| **TMA (travaux modificatifs acquéreur)**           | Fonction **neutralisée à la source** dans le WinDev actuel (contrôles commentés dans FEN_TABLE_Commercialisation). Les données `tma` (178) sont reprises, aucun écran ne les édite.                                                                                                                 | Le besoin est-il réactivé ? Si oui : onglet TMA sur le détail du lot (les champs existent déjà au schéma).                                                                                        |
| **Validations réactivées** (phase 4, pour mémoire) | RS obligatoire, SIRET nettoyé + avertissement 14 chiffres, total % participation ≠ 100 signalé — commentées dans le legacy, réactivées dans la reprise.                                                                                                                                             | Valider ce comportement en recette.                                                                                                                                                               |

## 2. Bloqué par le contenu du prochain `.bak`

Le `.bak` importé (2026-07-04) est en retard sur l'analyse WinDev actuelle.
À la prochaine livraison de sauvegarde, vérifier la présence de :

- **`ChampImportLot`** — mapping colonnes Excel → champs du lot ; sans elle,
  l'**import Excel de lots** (bouton « Importer » de FEN_Param) n'est pas
  reproductible fidèlement. Dès qu'elle arrive : reprendre la table, puis
  implémenter l'import (fichier `.xls`, ligne 1 = entêtes, arrêt à « TOTAUX »,
  remplace les lots de la tranche après confirmation — code WinDev documenté
  dans `FEN_Param.wdw`, `BTN_Importer_Lot`).
- **`tHonoCommHFFacture.IDPrestataire` et `IDBaremeHonoComm`** — colonnes de
  l'analyse actuelle absentes du .bak : le **filtre Prestataire des factures
  d'honoraires** (écran Honoraires de commercialisation) reste sans objet
  tant qu'elles n'arrivent pas.

## 3. Transverses à cadrer (intégrations externes)

| Fonction                                                      | Ce qui manque pour démarrer                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mails SAV** (chargé d'op, journalier, mensuels entreprises) | Serveur SMTP (hôte, compte, expéditeur), modèles de mails, périmètre des destinataires. Les données (`reserve.envoyer_mail`, `envoyer_mail_date`, emails des entreprises) sont prêtes.                                                                                                                                                                                                                                           |
| **Import Air-Bat**                                            | Format du fichier d'échange (le legacy stocke `id_air_bat` + verrou `est_verrouille`, repris).                                                                                                                                                                                                                                                                                                                                   |
| **Impression / états**                                        | Choix des états à reprendre parmi les `.wde` WinDev (réserves par lot/entreprise, enquêtes acquéreurs…) et de la cible (PDF serveur ?).                                                                                                                                                                                                                                                                                          |
| **Alertes stades**                                            | L'écran de paramétrage existe (`/parametres` > Stades d'avancement : règles, états, types de date — tables reprises, **vides dans le legacy, jamais utilisées**). Le moteur d'alerte (`GetAlerteStade`/`UpdateAlerteTranche` WinDev) n'est pas repris : à construire seulement si le client alimente les règles. Les archives de stades ne reprennent que les entêtes (le détail `ArchiveStadeAvancementListe` legacy est vide). |
| **« Synchro. dates » entre tranches**                         | Fonction WinDev de synchronisation des jalons (`AvecSynchroEntreTranche`) — préciser le comportement attendu avec les utilisateurs avant transposition.                                                                                                                                                                                                                                                                          |
| **Exports Excel**                                             | ✅ Couvert : bouton « Exporter » (CSV pour Excel) sur toutes les tables de l'app, plus l'export d'interface de la Commercialisation (BTN_Exporter — 62 colonnes iso-`REQ_InterfaceCommercialisation_Lot`). Ne reste que si un format `.xlsx` spécifique est exigé.                                                                                                                                                               |

## 4. Bascule (fin de parcours)

1. Dernier réimport `.bak` (celui qui apporte les tables de la section 2).
2. Correction du backlog des défauts source (`docs/` — orphelins, doublons,
   nomenclatures concurrentes) **après** ce dernier import, pas avant.
3. Gel des saisies WinDev, l'app devient la source de vérité.
4. Infrastructure : le changement de VPS prévu était conditionné au
   sous-domaine (accès actuel WireGuard `http://10.66.66.1:3020`) — DNS,
   Caddy (prudence : valider avant reload de caddy-central), sauvegardes
   Postgres à mettre en place.
5. Recette utilisateurs par service (la matrice de droits est en place :
   modules par service + droits fins `droit`/`requireDroit`).

## Hors périmètre notable (assumé, documenté dans le plan)

- Écran des factures de missions (`facture`, 1 653 lignes reprises) : porté
  par `FEN_Promotion` (suivi de production), **sans capture** — à traiter si
  le client le demande.
- Nomenclatures legacy jamais alimentées ou hors analyse : non reprises
  (détail par phase dans le plan).
