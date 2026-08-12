# Schéma métier cible (`public`) — tranche 1

Créé le 2026-07-04. Périmètre : colonne vertébrale (structure juridique > opération >
tranche > lot) + dimension commerciale. Définition Drizzle : [src/db/domaine.ts](../src/db/domaine.ts).
Alimentation : `npm run db:transform` (ou automatiquement en fin d'import .bak) recopie
`legacy` → `public` en préservant les IDs. Modèle source : [modele-legacy.md](modele-legacy.md).

## Principes de mapping

- Préfixe `t` des tables abandonné, noms français en snake_case (`tOperation` → `operation`).
- IDs legacy préservés (`identity BY DEFAULT` + `setval`) : les références croisées restent
  valides d'un rechargement à l'autre, l'app génère les IDs suivants.
- `0` → `NULL` pour toutes les références (convention WinDev « pas de référence »).
- Références jamais contraintes côté SQL Server passées par un garde `EXISTS`
  (ex. `comm_vendeur.commercialisation_id`, 2 orphelines neutralisées en NULL).
- Types : montants en `numeric` (mode number), taux en `real`, dates en `timestamp` sans TZ
  (heures « murales » du legacy).

## Colonnes volontairement non reprises

- **Caches dénormalisés** : `cur*` (curIDAcquereur, curNbLot…), compteurs `Nb*` recalculables
  (NbResa, NbActeVEFA, NbTMA…), `DescriptionAcquereurCourant`, `NomComplet` est conservé lui
  (saisie, pas un cache sûr).
- **Reprises d'anciens imports** : colonnes `Import*`, `*_orig`, `PromoGesNom`, les colonnes
  à espaces de `tAcquereur` (« N° Lot », « Date de transfert de propriété »…), `Grille *` de `tLot`.
- **Historique** : colonnes `old_*` / `*_old` (l'équivalent actuel existe toujours).
- **Reportées aux tranches suivantes** (les colonnes existent dans `legacy`) :
  - `tTranche` : blocs financiers (Cout*, CAHT*, QuotePart*, Subv*, HonoComm*, Frais*,
    Terrain*, DroitAppui*) → dimension financière ; blocs avancement (Stade*, IDListeAvancement_*)
    → dimension suivi ; MOE/certifications (les deux architectes sont repris depuis
    le 2026-08-12, cf. fiche Opérations).
  - `tOperation` : personnes internes (ChargeOpe, assistante), certifications/labels,
    TypeFoncier, ApporteurFoncier, PourcentageKPI.
  - `tStructureJuridique` : volet comptable/fiscal (SIE, EDI, gestionnaire SCCV, dates bilan).
  - `tAcquereur.IDConseillerTechnique` (référence non identifiée), `Identifiant`, `Etape`, `Enquete*`.
  - `tCommercialisation` : `PrestataireCommercialisation/Comm1/Comm2` (→ `tListePrestataire`,
    confirmé par REQ_InterfaceCommercialisation_Lot — à ajouter en tranche 2), `TMAMailing*`.

## Tables (58)

**Nomenclatures (29)** : `civilite`, `csp`, `situation_familiale`, `situation_famille` (les deux
coexistent sur l'acquéreur — héritage à clarifier avec le client), `type_menage`,
`type_logement_actuel`, `acquereur_tranche_age`, `acquereur_plafond_ressources`,
`acquereur_revenu_quartile`, `nature_juridique`, `type_acquereur`, `fiscalite_acquereur`,
`nature_achat`, `moyen_paiement`, `motif_clause_particuliere`, `banque_courtage`,
`destination`, `concept`, `secteur_geographique`, `situation`, `fonction_interlocuteur_notaire`,
puis (2026-08-12, onglets de la fiche Opérations) `signataire`, `ofs_nom`, `certification`,
`label`, `performance_energetique`, `mission_moe_interne`, `categorie_subvention`,
`organisme_subvention`.

**Interlocuteurs externes (3, ajoutés le 2026-08-12 pour la fiche Opérations)** :
`etude_notaire` (24), `interlocuteur_notaire` (30 — la colonne texte `Fonction` du legacy
ne contient que des codes, seule la FK est reprise), `architecte` (25). Référencés par
`operation` (notaire/clerc vente et foncier) et `tranche` (architecte mandataire/cotraitant).

**Avancement et subventions (3, ajoutés le 2026-08-12)** : `liste_avancement` (65 jalons de
référence — `DomaineStadeAvancement` n'est qu'une liste de deux codes texte, le domaine reste
une colonne), `stade_avancement` (6 935 jalons datés par tranche ; la facture liée attend le
module Honoraires), `subvention` (224 ; déblocages et suivi budgétaire en phase 6).
`tranche` porte au passage les blocs Terrain (opérateur / OFS-BRS / bail) et
Informations diverses (certification, label, performance énergétique, MOE interne).

**Module SCCV et associés (13 tables/extensions, phase 4, 2026-08-12)** :
`structure_juridique_stade` (7), `gestionnaire_sccv` (12), `partenariat` (4),
`index_taux` (4), `motif_remuneration_associe` (2), `type_compte_banque` (2),
`utilisation_compte` (3), `sie` (13, service des impôts des entreprises),
`personne` (44, collaborateurs internes — legacy `tPersonne` ; seuls les
comptables, `fonction_id = 1`, sont utilisés par le module, `fonction_id` et
`equipe_personne_id` repris bruts sans table de référence faute d'écran),
`banque` (17, avancée depuis la phase 6 pour l'onglet Comptes bancaires),
`associe` (33, personnes morales associées), `participation` (299, parts des
associés dans les SCCV), `compte_banque` (195). `structure_juridique` reçoit en
extension le volet gestion (stade, comptable, gestionnaire, partenariat) et le
volet Centre des impôts (EDI TVA/liasse, compte fiscal, SIE, interlocuteur, date
de mandat).

- `participation.pourcentage` est stocké en fraction 0–1 (iso-legacy
  `Pourcentage`), converti en % côté UI (`enPourcent`/`enFraction` dans
  `sccv.helpers.ts`).
- `participation.periodiciteVersement` reprend `IDPeriodicite_Versement`, à
  100 % vide dans le legacy (aucune ligne dans `tListePeriodicite`) : remplacé
  par un code texte (`ANNUEL`/`TRIM`) servant une combo statique côté UI,
  pas une table de référence.
- Caches non repris : `cur*` de `tStructureJuridique` et le texte dénormalisé
  `GestionnaireSCCV` (le nom du gestionnaire passe désormais par la jointure
  vers `gestionnaire_sccv`) — recalcul prévu en phase 7 si un besoin
  d'affichage rapide apparaît.
- Pas d'écran de suppression de SCCV (iso-WinDev, la fiche ne se supprime pas).

**Cœur (11)** :

| Table                      | Source                  | Lignes | Notes                                                       |
| -------------------------- | ----------------------- | ------ | ----------------------------------------------------------- |
| `structure_juridique`      | tStructureJuridique     | 138    | identité + capital ; volet compta en phase ultérieure       |
| `operation`                | tOperation              | 167    | + secteur géographique, investisseur, abandon               |
| `tranche`                  | tTranche                | 213    | volet structurel seulement (financier/avancement plus tard) |
| `lot`                      | tLot                    | 3 141  | `tranche_id` nullable (129 lots hérités sans tranche)       |
| `commercial`               | tCommercial             | 30     | force de vente                                              |
| `acquereur`                | tAcquereur              | 2 929  | 3 co-acquéreurs à plat (structure héritée conservée)        |
| `commercialisation`        | tCommercialisation      | 2 945  | cycle de vente + prix réel + parcours client                |
| `comm_vendeur`             | tCommVendeur            | 5 157  | commissions ; 2 refs commercialisation orphelines → NULL    |
| `versement_depot_garantie` | tVersementDepotGarantie | 1 676  | `commercialisation_id` nullable (26 hérités)                |
| `tma`                      | tTMA                    | 178    | devis travaux modificatifs                                  |

## Vérifications effectuées (2026-07-04)

- Volumes cibles = volumes sources pour les 30 tables.
- Jointure complète opération→tranche→lot→commercialisation→acquéreur OK sur données réelles.
- FK toutes satisfaites après gardes (aucune erreur d'insertion).
