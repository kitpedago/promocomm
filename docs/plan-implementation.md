# Plan d'implémentation progressive (reprise WinDev)

Rédigé le 2026-07-05. Ordonne la migration des 9 modules WinDev
([ecrans-windev.md](ecrans-windev.md)) en phases livrables, chacune utilisable en l'état.
L'ordre suit deux critères : **les données déjà migrées d'abord** (la dimension commerciale
est dans `public` depuis la tranche 1, [schema-cible.md](schema-cible.md)) et **la valeur
d'usage** (les 4 modules ouverts à tous les services avant les modules Comptabilité).

## Cycle des données pendant le développement

- **WinDev reste la source de vérité** jusqu'à la bascule : réimporter régulièrement un
  `.bak` frais ; chaque réimport écrase le schéma `public` (`TRUNCATE` + recopie).
- **Développer et utiliser les CRUD sans attendre** : toute modification saisie dans
  l'app web est une donnée de test, perdue au réimport suivant — c'est voulu, repartir
  d'une base propre fait partie du cycle de test.
- **Vérifier la parité** avec WinDev à chaque réimport, sur les mêmes données.
- **Garder hors du transform** l'auth (Better Auth) et les futures tables propres à
  l'app web : elles survivent aux réimports.

## Rythme de chaque phase

1. **ETL** : étendre `domaine.ts` + `transform.ts` (migration Drizzle, volumes cibles =
   volumes sources, FK gardées par `EXISTS` si non contraintes côté SQL Server).
2. **Écrans** : recettes de la charte ([charte.md](charte.md)), composants transverses
   réutilisés.
3. **Droits** : visibilité module par service (déjà en place via la sidebar) ; droits fins
   table `Droit` quand le module concerné en a (235 lignes legacy).
4. **Doc** : mettre à jour [schema-cible.md](schema-cible.md) et le présent plan.

---

## Phase 0 — Socle ✅ (2026-07-04 → 05)

Pipeline `.bak` → `legacy` → `public` (tranche 1 : 30 tables), login par services,
charte Keredes, menu latéral par droits, tableau de bord (5 widgets FEN_Menu).

## Phase 1 — Consultation commerciale (données déjà migrées)

Le cœur de l'usage quotidien, ouvert aux 7 services. **Aucune extension ETL** hormis
`tListePrestataire` (prestataires de commercialisation, reporté de la tranche 1).

- **Composants transverses** (le pattern maître/tranche/accordéon revient partout — à
  construire ici, réutilisés ensuite) :
  - panneau maître 264 px : liste opérations/SCCV, recherche « Contient » (min. 3 car.,
    sans accent), compteur, cases « Inclure les Masquer commercial/comptable/promo »,
    repliable ;
  - sélecteur de tranche avec récap (« Coll. : 18 dont PSLA 8… ») depuis les compteurs
    de `tranche` ;
  - table charte : tri, filtre par colonne, ligne Total, groupes d'en-têtes ;
  - accordéon vertical + sous-onglets.
- **Écrans (lecture)** :
  - **Commercialisation** : lots par op/tranche, badge HLM, détail lot en onglets
    (Commercialisation, Dépôt de garantie, Fiscalité, Prév. signature, Actes, Livraison) ;
  - **Acquéreurs** : filtre en arbre par opération, recherche nom/email/téléphone,
    « lot courant » **calculé** (commercialisation active la plus récente — le cache
    `curIDLot` n'a pas été repris) ;
  - **Opérations** : bloc « Détails opération » de la capture (notaires vente/foncier,
    architectes de la tranche, investisseur, masquages), combo tranche, puis les trois
    onglets **Stade d'avancement** / **Terrain** / **Informations diverses**. Livré avec
    l'ETL correspondant (voir phase 3, avancée ici) : `EtudeNotaire`,
    `InterlocuteurNotaire`, `FonctionInterlocuteurNotaire`, `tArchitecte`,
    `tListeAvancement`, `tStadeAvancement`, `tSubvention` et les blocs Terrain /
    certification / MOE de `tTranche`. Restent à faire côté Opérations : alertes stades,
    planning et export Excel (phase 9), colonne « Num Facture » des stades (phase 7),
    déblocages de subventions (phase 6).

## Phase 2 — Écriture commerciale ✅ (2026-08-13)

- CRUD : Réserver / Modifier / Annuler la réservation, dépôts de garantie, TMA,
  propagation adresse/date livraison de la tranche vers les lots. Testables
  immédiatement sur les données importées (réinitialisées au réimport suivant).
- **Droits fins** : transposer la table `Droit` (lecture seule / masqué par contrôle)
  en table `droit` + hook composants.
- À trancher avec le client : motif d'annulation (liste paramétrable dans FEN_Param
  vs texte libre dans `tCommercialisation.MotifAnnulation`).
- **Livré 2026-08-13** (migration 0018) : table `droit` (235 restrictions,
  IDService → slug par l'ordre FEN_Login) + garde serveur `requireDroit`
  (fenêtre + contrôle WinDev) et hook client `useDroitsComm` ;
  `commercialisation.prestataire_comm1_id/2_id` repris (2 819/95 lignes).
  Écran : modale Réserver/Modifier (fiche complète — réservation, prix,
  agrément, courtage, souscription capital, revente, clause particulière),
  modale Annuler (date/motif/commentaire, l'historique est conservé), CRUD
  versements de dépôt de garantie, propagation adresse (remplacer tout ou
  seulement les vides) et date de livraison (dates déjà saisies conservées)
  aux lots non investisseurs — natures 2/9/10 exclues iso-WinDev. Motif
  d'annulation en texte libre (aucune valeur dans le legacy ; liste
  paramétrable à trancher avec le client). TMA : contrôles commentés dans le
  WinDev actuel (fonction neutralisée à la source) — données `tma` déjà
  reprises, pas d'écran tant que le client n'a pas réactivé le besoin.

## Phase 3 — Suivi de production (module Opérations complet) ✅ (2026-08-13)

Le gros a été avancé en phase 1 le 2026-08-12 (ETL `tListeAvancement`,
`tStadeAvancement`, notaires, architectes, blocs Terrain / certification / MOE, et les
trois onglets de la fiche). Reste :

- **ETL** : blocs `IDListeAvancement_*` de `tTranche` (stade actuel / prochain),
  personnes internes de `tOperation` (chargé d'op, assistante), règles d'alerte.
- **Écrans** : alertes stades, « Synchro. dates », Contentieux, Intervalles ; planning
  (export Excel en fonction transverse, phase 9).
- Au passage : les caches `stade_com`/`situation_*` du tableau de bord pourront être
  recalculés depuis `tStadeAvancement` au lieu d'être repris tels quels.
- **Livré 2026-08-13** (migration 0019) : stades courants de la tranche
  (`liste_avancement_actuel/prochain/suivi_actuel/suivi_prochain_id`,
  198/127/194 lignes) affichés en tête de l'onglet Stade d'avancement ;
  chargés d'opération (`charge_ope1/2_id` ← `curIDPersonne_ChargeOpe*`, 141/8 —
  « cur » trompeur, champs saisis sans autre source) affichés sur la fiche
  Opérations et l'entête SAV. **Non repris, jamais alimentés dans le legacy**
  (0 ligne partout) : `Contentieux`, `RegleAlerteStadeAvancement`,
  `EtatStadeAvancementAlerte`, `tOperation.IDPersonne_Assistante`,
  `AlerteStadeAvancement_Texte` — écrans alertes/Contentieux sans objet tant
  que le client n'alimente pas ; « Synchro. dates » et planning/export → phase 9.

## Phase 4 — SCCV et associés ✅ (2026-08-12)

Livré : ETL des 13 tables/extensions du module (voir [schema-cible.md](schema-cible.md))
— `tParticipation` (299), `tAssocie` (→ `associe`, 33), `tCompteBanque` (195),
`tSIE` (→ `sie`, 13), `tBanque` (17, avancée depuis la phase 6 pour l'onglet
Comptes bancaires), volet comptable/fiscal de `tStructureJuridique` (gestionnaire,
EDI, dates bilan) et les nomenclatures du module (stade, gestionnaire,
partenariat, index de taux, motif de rémunération, type/utilisation de compte).
Écrans : liste SCCV (88 lignes, filtres stade/comptable/gestionnaire/liquidée,
21 colonnes) et fiche en 4 onglets (Associés, Opérations, Comptes bancaires,
Centre des impôts) ; CRUD complet sur la fiche, les participations et les comptes
bancaires (pas de suppression de SCCV, iso-WinDev).

**À signaler au client** : validations commentées dans le legacy et réactivées
dans la reprise — raison sociale obligatoire, SIRET nettoyé des espaces à la
saisie avec avertissement (non bloquant) s'il ne fait pas 14 chiffres, total des
% de participation signalé (non bloquant) s'il diffère de 100.

## Phase 5 — SAV Promotion ✅ (2026-08-13)

- **ETL** : `tReserve` (30 431 lignes — la plus grosse table, prévoir index),
  `tReserveType`, `tReservePiece`, `tReserveEntreprise` (281), livraison/réception par lot.
- **Écrans** : lots par op/tranche, réserves du lot (code, type, pièce, entreprise,
  dates réclamation/intervention). Mails journaliers/mensuels et import Air-Bat → phase 9.
- **Livré 2026-08-13** (migration 0017) : `reserve` (13 992 — les 16 439 lignes
  sans lot, archives « Ancien* » d'un logiciel antérieur inaffichables dans
  WinDev aussi, ne sont pas reprises), `reserve_type` (6), `reserve_piece`
  (0 — table vidée côté legacy, 97 % de références orphelines mises à NULL),
  `reserve_entreprise` (281), index `reserve(lot_id)`. Écran `/sav` : volet
  Opérations (masquage promo), dates Livraison/Réception de la tranche
  (jalons 35/39 de `stade_avancement`), lots (fn partagée `getLotsCommFn`
  étendue), réserves du lot en CRUD par modale — code auto proposé
  (`NextCodeReserve` transposé et testé), lignes verrouillées Air-Bat
  protégées. Chargé d'opération d'entête (cache `curIDPersonne_ChargeOpe*`) →
  phase 3 ; mails, impression, import Air-Bat → phase 9.

## Phase 6 — Dimension financière (Compta & Finances) ✅ (2026-08-13)

Réservé Comptabilité/Administrateur. Le plus gros morceau ETL :

- **ETL** : `tBanque` (17), `tFinancement` (228), `tRemboursementAnticipe` (613, relation
  à rattacher), `tGFA` (108) + `ReducGFA`, `tPSLA` (101), `tDeblocagePSLA` (357),
  `tSubvention` (224) **ou** `tSubvention2` (218) — arbitrer la génération vivante avec
  le client —, `tDeblocageSubvention` (291), `FraisFinancierPub` (694), `CategorieFrais`,
  `tBudget` (264), blocs financiers de `tTranche` (Cout*, CAHT*, QuotePart*, Terrain*…).
- **Écrans** : accordéons Subventions / Suivi dépenses & budget / Finances par tranche
  (Admin PSLA, Contrats, Financements, GFA, Suivi prêt 1 %).
- **Écriture livrée 2026-08-13** : CRUD des subventions (+ déblocages, en
  cascade à la suppression), frais financiers, financements (fiche complète
  ~50 champs par sections), PSLA, déblocages PSLA, remboursements anticipés,
  GFA (+ réductions) — `lib/compta.ecriture.ts` (upsert commun) et modale
  générique `ModaleFiche` pilotée par descripteurs (réutilisable phase 9).
  Reste côté client : arbitrage `tSubvention2` ; les champs « Premier/Solde »
  du déblocage notés en 2026-08-12 n'existent pas dans le .bak importé.

## Phase 7 — Honoraires et facturation ✅ (2026-08-13)

- **ETL** : `tMission` (855), `tListeTypeMission`, `tGrilleFacturation` (1 259 —
  ⚠ son `IDStadeAvancement` référence `tListeAvancement`, pas `tStadeAvancement`),
  `tFacture` (1 653, elle référence bien le jalon réel), `tHonoCommHFNatureAchat` (312),
  `tHonoCommHFFacture` (645), `tListePrestataire` si pas fait en phase 1.
- **Écrans** : missions suivant convention + grille de facturation par stade
  (ESQ 12,5 %, DPC 25 %…), barème de commercialisation par nature d'achat, factures.
- **Livré 2026-08-13** (FEN_TABLE_Honoraire, migration 0015) : ETL `tMission`/
  `tGrilleFacturation`/`tHonoCommHFNatureAchat`/`tHonoCommHFFacture` +
  nomenclatures `type_mission`, `prestataire`, extension `liste_avancement`
  (`avec_hono_gestion`, `pourcentage_standard`) ; écran `/honoraires`
  (2 accordéons, CRUD par modales, bouton Importer de la grille standard,
  sur-entêtes colorés Loc. accession / VEFA / Honoraires au %). Non repris :
  `tMission.GrilleSpecifique`/`PourCoPromotion`/`PourPromotion` (absents de la
  fiche WinDev, 1 ligne sur 855) ; `IDPrestataire`/`IDBaremeHonoComm` de
  `tHonoCommHFFacture` (colonnes de l'analyse WinDev absentes du .bak importé —
  filtre Prestataire des factures sans objet tant qu'un .bak plus récent ne les
  apporte pas). `tFacture` (1 653) reprise en ETL (migration 0016, table
  `facture` → `stade_avancement`/`type_mission`, 0 orphelin) ; son écran
  porteur FEN_Promotion (factures par jalon réel du suivi de production, sans
  capture) reviendra avec la phase 3.

## Phase 8 — Déclarations et Bilan ✅ (2026-08-13)

- **ETL** : `tAssuranceDoMrH` (348), `AccordCadreAssurance` (5), `tSGA` (199 — HTML
  brut des commentaires assaini au transform), `tDeclaration940` (124 — 4 lignes sans
  tranche, colonne nullable, backlog défauts source), `tBilan_Stock` (428),
  `tBilan_CAHT` (207), `tBilan_Resultat` (607).
- **Écrans** : `/declarations` (volet Opérations masquage comptable, tranche, accordéons
  Assurance DO/MRH / SGA / 940 & LASM, CRUD par modales) ; `/bilan` par SCCV
  (Stock et CA, Résultats, IS - Non IS, colonnes calculées iso-WinDev, CRUD).
  Champs de modale factorisés dans `ChampsModale.tsx` (consigne « un composant
  unique par type de contrôle » — sccv.tsx encore sur ses copies locales).

## Phase 9 — Paramètres et fonctions transverses

- **Paramètres** : CRUD des ~30 nomenclatures (arbre FEN_Param), gestion directe
  Opérations/Tranches/Lots, import de lots.
- **Transverses** (au fil du besoin, regroupées ici pour mémoire) : exports Excel,
  impression, envois de mails SAV, import Air-Bat, alertes stades.

## Bascule (fin de parcours)

1. Dernier import `.bak`, gel de WinDev.
2. Correction du backlog des défauts source (orphelins, doublons, nomenclatures
   concurrentes, HTML brut, `Commune` texte libre…) — **après** ce dernier import,
   comme convenu.
3. Passage des services/mots de passe en table ; les saisies deviennent les données
   de production (plus de réimport destructif).
4. Le transform devient un outil d'archive ; `legacy` est conservé en lecture pour audit.
5. Infra : changement de VPS prévu, sous-domaine à créer à ce moment-là.

## Suivi

| Phase | Contenu                                           | État                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Socle (ETL, auth, charte, menu, tableau de bord)  | ✅ 2026-07-05                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 1     | Consultation commerciale + composants transverses | ✅ 2026-08-12 — Commercialisation et Acquéreurs livrés le 2026-07-05 (panneau maître, sélecteur de tranche, table unique `DataTable` avec pagination, détail lot 7 onglets, filtre en arbre par opération, lot courant calculé) ; fiche Opérations partielle (identité, adresse, tranches, lots) le 2026-08-12                                                                                                                                                                                                                            |
| 2     | Écriture commerciale + droits fins                | ✅ 2026-08-13 — table `droit` (235 restrictions legacy) + `requireDroit` serveur + `useDroitsComm` client ; modales Réserver/Modifier (fiche complète) et Annuler (historique conservé), CRUD versements DG, propagations adresse/date livraison (lots investisseurs exclus, dates saisies conservées) ; `prestataire_comm1/2` repris. TMA neutralisé dans le WinDev source ; motif d'annulation en texte libre (à trancher client)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3     | Suivi de production (Opérations)                  | ✅ 2026-08-13 — stades courants de la tranche (actuel/prochain + suivi) et chargés d'opération repris (migration 0019) et affichés (fiche Opérations, entête SAV, onglet Stade). Alertes/Contentieux : tables legacy vides, non repris ; Synchro dates + planning/export → phase 9                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4     | SCCV et associés                                  | ✅ 2026-08-12 — ETL (13 tables/extensions), liste (88) + fiche 4 onglets, CRUD complet ; validations réactivées à signaler au client (RS obligatoire, SIRET, total % ≠ 100)                                                                                                                                                                                                                                                                                                                                                               |
| 5     | SAV Promotion                                     | ✅ 2026-08-13 — ETL `reserve`/`reserve_type`/`reserve_piece`/`reserve_entreprise` (13 992/6/0/281, index par lot) ; écran `/sav` (volet masquage promo, dates Livraison/Réception jalons 35/39, lots partagés Commercialisation, CRUD réserves avec code auto NextCodeReserve et verrou Air-Bat). Mails/impression/import Air-Bat → phase 9                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6     | Compta & Finances                                 | ✅ 2026-08-13 — lecture (2026-08-12) puis écriture : CRUD des subventions + déblocages, frais financiers, financements (fiche complète 50 champs), PSLA, déblocages PSLA, remboursements anticipés, GFA + réductions — modale générique `ModaleFiche` pilotée par descripteurs, suppressions en cascade iso-WinDev, cycle création/suppression vérifié navigateur. Restent côté client : arbitrage `tSubvention2` (génération vivante) ; « Premier/Solde » du déblocage n'existe pas dans le .bak                                                                                                                        |
| 7     | Honoraires                                        | ✅ 2026-08-13 — ETL `tMission`/`tGrilleFacturation`/`tHonoCommHFNatureAchat`/`tHonoCommHFFacture`/`tFacture` (855/1 259/312/645/1 653) + `type_mission`, `prestataire`, extension `liste_avancement` ; écran `/honoraires` (accordéons Suivant Convention — missions + grille par stade avec Importer — et Commercialisation — barème par nature d'achat + factures, sur-entêtes colorés, totaux iso-WinDev). L'écran des factures de missions (FEN_Promotion, sans capture) suivra en phase 3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 8     | Déclarations et Bilan                             | ✅ 2026-08-13 — Bilan par SCCV : ETL `tBilan_Stock`/`tBilan_CAHT`/`tBilan_Resultat` (428/207/607), écran `/bilan` (volet SCCV filtrable, accordéons Stock et CA / Résultats / IS - Non IS, CRUD, colonnes calculées iso-WinDev dont quotes-parts × % KPI). Déclarations : ETL `tAssuranceDoMrH`/`AccordCadreAssurance`/`tSGA` (HTML assaini)/`tDeclaration940` (348/5/199/124), écran `/declarations` (volet Opérations, tranche, accordéons Assurance DO/MRH / SGA / 940 & LASM, CRUD). Champs de modale factorisés (`ChampsModale.tsx`) |
| 9     | Paramètres + transverses                          | à faire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| —     | Bascule                                           | à faire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Consignes de développement (composants UI)

- **Un composant unique par type de contrôle** (liste déroulante, zone de saisie,
  date…) : base `src/components/ui/*` habillée charte, déclinée par props — jamais de
  variante ad hoc recodée dans un écran.
- **Combo** : toujours zone de recherche (sauf liste courte)
- **Table : un composant unique** pour toutes les listes, avec de série :
  - tri sur toutes les colonnes ;
  - largeur des colonnes ajustable ;
  - menu « Affichage » aligné à droite : colonnes (afficher/masquer, réordonner)
    et lignes (1 seule ligne, ligne compacte) ;
  - compteur d'éléments affichés ;
  - filtre actif mis en évidence ;
  - pagination, dont combo à droite 10, 20, 50, 100, max 500 ou nb lignes total.
- **Préférences de table mémorisées par page et par utilisateur** (filtres, largeurs,
  colonnes visibles, ordre) — à stocker hors du périmètre du transform pour survivre
  aux réimports (cf. « Cycle des données »).
  ✅ Livré (2026-08-12) : table `user_pref` (clé/valeur JSONB), hook `usePref`, contexte de route au beforeLoad. Conception : [superpowers/specs/2026-08-12-preferences-utilisateur-design.md](superpowers/specs/2026-08-12-preferences-utilisateur-design.md).
- **Cases à cocher : uniquement des toggles** (interrupteurs type `Switch`), pas de
  checkbox classique.
- **Volet Opérations** : sur le côté gauche, avec recherche et position mémorisée, commun à plusieurs pages + **Combo Tranche** en haut (ou opération qui se déroule pour afficher les tranches)
