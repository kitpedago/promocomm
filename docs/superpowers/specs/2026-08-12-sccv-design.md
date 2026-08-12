# Module SCCV (Structures juridiques) — design

Date : 2026-08-12. Phase 4 du [plan d'implémentation](../../plan-implementation.md).
Source métier : `FEN_TABLE_StructureJuridique.wdw` + `FEN_Fiche_StructureJuridique.wdw`
+ `FEN_Fiche_Participation.wdw` (analysés), requêtes dans
[requetes_windev.txt](../../requetes_windev.txt), capture `SCCV.png`.

**Portée validée : CRUD complet** (première brèche dans le « lecture seule » des
phases 1-3), sauf suppression de SCCV — interdite comme dans WinDev.
Édition en **formulaires modaux** (pas de saisie en ligne iso-WinDev).

## 1. Schéma (`src/db/domaine.ts`)

### `structure_juridique` — colonnes ajoutées

| Colonne | Legacy | Note |
| --- | --- | --- |
| `stade_id` → `structure_juridique_stade` | `Stade` | |
| `personne_comptable_id` → `personne` | `IDPersonneComptable` | |
| `gestionnaire_sccv_id` → `gestionnaire_sccv` | `IDGestionnaireSCCV` | la colonne texte `GestionnaireSCCV` (dénormalisation) n'est **pas** reprise |
| `partenariat_id` → `partenariat` | `IDPartenariat` | |
| `hfsga` boolean | `HFSGA` | |
| `date_bilan_debut_premier_exercice`, `date_bilan_fin_premier_exercice` timestamp | idem | |
| `date_modif_cloture`, `date_planning_cloture` **text** | idem | texte en legacy, repris tels quels |
| `date_liberation_capital` timestamp | `DateLiberationCapital` | |
| `edi_tva`, `edi_liasse`, `cpte_fiscal` boolean | `EDI_TVA`, `EDI_Liasse`, `CpteFiscal` | volet Centre des impôts |
| `sie_id` → `sie`, `civilite_id` → `civilite`, `interlocuteur_sie` text, `date_mandat_sie` timestamp | idem | |

Non repris : `old_CentreImpotsSIE`, `PasDeSouscriptionAuCapital` (module
Commercialisation), les 6 caches `curPourc*`/`curAutreNom*` (dénormalisation
écrite par trigger legacy, recalculable — l'écran Bilan les recalculera à la
volée en phase 7 ; les IDs associés 1/18/30 codés en dur dans le trigger ne
sont pas reproduits).

### Nouvelles tables

- `participation` (299) : `structure_juridique_id`, `associe_id`, `pourcentage`
  (double, **fraction 0–1** en legacy), `commentaires`, `conv_treso`,
  `motif_remuneration_associe_id`, `date_signature_conv`, `date_application`,
  `date_fin_remuneration`, `index_taux_remuneration_id`,
  `info_taux_remuneration`, `periodicite_versement` integer **sans FK**
  (la table legacy `Periodicite` n'a qu'un code texte sans ID — vérifier les
  valeurs réelles à l'implémentation, FK ajoutée si une cible existe).
- `associe` : `rs`, `forme_juridique`, `siren`, `adresse1`, `adresse2`, `cp`,
  `commune`, `tel`, `est_hlm`, `contact_nom_complet`, `contact_fonction`,
  `email`, `commentaire`.
- `compte_banque` (195) : `structure_juridique_id`, `banque_id`,
  `type_compte_banque_id`, `utilisation_compte_id`, `num_compte`, `iban`,
  `bic`, `est_cloture`, `commentaires`.
- `sie` : `libelle`, `adresse`, `cp`, `commune`.
- `personne` : `patronyme`, `prenom`, `est_present`, `fonction_id` (integer
  brut, pas de table `fonction` — seul usage : comptables = fonction 1),
  `email`, `equipe_personne_id` (integer brut).
- Nomenclatures : `structure_juridique_stade`, `gestionnaire_sccv`,
  `partenariat`, `index_taux`, `motif_remuneration_associe`, `banque`
  (toutes les colonnes legacy — contacts CC/Prêt serviront en phase 6),
  `type_compte_banque` (← `tListeTypeCompteBanque`), `utilisation_compte`
  (← `tListeUtilisationCompte`).

## 2. ETL (`src/lib/etl/transform.ts`)

Un insert par table ci-dessus + extension des colonnes de
`structure_juridique`, garde-fous FK par `EXISTS` (pattern existant).
Volumes cibles = volumes sources.

## 3. Server functions (`src/lib/sccv.ts`)

Lecture (GET) :

- `getSccvListeFn` : transpose `REQ_StructureJuridique`. Filtres `stadeId`,
  `comptableId`, `gestionnaireId`, `liquidee` (défaut **false** : seules les
  non-liquidées à l'ouverture, comme WinDev), `contient` (LIKE sur RS seul —
  l'infobulle WinDev qui promet opération+commune ment). Tri `rs` ASC
  (le legacy n'a aucun ORDER BY). Jointures libellés stade/comptable/
  gestionnaire. Compteur côté client.
- `getSccvDetailFn` : participations (avec libellé associé « RS (HLM/Non
  HLM) »), opérations portées (libelle, cp, commune, sur_rennes_metropole,
  anru, annee_dgd, adresse, nom_zac), comptes bancaires (libellés banque/
  type/utilisation), volet Centre des impôts.
- `getSccvNomenclaturesFn` : stades, comptables (`fonction_id = 1 AND
  est_present`, **plus la valeur courante si le comptable est parti** — piège
  legacy), gestionnaires, partenariats, associés, banques, types compte,
  utilisations, SIE, civilités, motifs rémunération, index taux.

Écriture (POST) — rejetées côté serveur pour le service Consultation :

- `saveSccvFn` : create/update de toutes les colonnes (fiche + volet fiscal).
  SIRET : espaces retirés (`NoSpace(sscInside)` legacy). Un seul UPSERT (pas
  le double `Save()` legacy).
- `saveParticipationFn` / `deleteParticipationFn`.
- `saveCompteBanqueFn` / `deleteCompteBanqueFn`.
- **Pas de suppression SCCV** (iso-WinDev : bouton absent).

## 4. Écran (`src/routes/_authed/sccv.tsx`)

- Barre filtres : combos Stade / Comptable / Gestionnaire, case « Liquidée »,
  recherche « Contient » (≥ 3 caractères, double-clic ou bouton pour vider),
  compteur « N SCCV ».
- DataTable principale, colonnes WinDev : Nom SCCV, TVA intra, Siret, HF ?,
  HLM ?, dates (début activité, immat, bilans 1er exercice, modif clôture,
  planning clôture, liquidation, libération capital), Comptable, Stade,
  HF SGA ?, Capital, Cpte fiscal, Nb parts, Montant parts, Gestionnaire.
  Badge/format « liquidée » visible.
- Détail sous la table (titre = RS sélectionnée), 4 onglets via `Onglets` :
  1. **Associés** : colonnes WinDev (associé, %, conv. tréso, motif, dates,
     index taux, info taux, périodicité, commentaires) + **ligne Total des %
     en pied** (pied de table DataTable existant). Boutons Nouveau / Modifier /
     Supprimer → modale participation.
  2. **Opérations** : lecture seule, sans bouton.
  3. **Comptes bancaires** : boutons Nouveau / Modifier / Supprimer → modale.
  4. **Centre des impôts** : affichage EDI TVA / EDI liasse / Cpte fiscal /
     SIE / Civilité / Interlocuteur SIE / Date mandat ; bouton Modifier →
     modale (mêmes colonnes, sauvées par `saveSccvFn`). Interlocuteur SIE :
     champ texte avec suggestions = valeurs distinctes existantes
     (`datalist`, transpose `REQ_InterlocuteurSIE`).
- Boutons « Nouvelle SCCV » / « Modifier » (+ double-clic ligne) → modale
  fiche SCCV en deux colonnes comme WinDev : identité (RS, SIRET, TVA intra,
  gestionnaire, partenariat) + dates + comptable + stade + HF SGA à gauche ;
  Capital (HLM ?, HF ?, capital, nb parts, montant part, date libération)
  à droite.
- Nouveau composant `ui/dialog.tsx` (shadcn), réutilisé par les 4 modales.
- Boutons d'écriture masqués pour le service Consultation.

## 5. Validations (réactivées — commentées dans le legacy)

À signaler au client : des enregistrements existants peuvent les violer.

- RS obligatoire (bloquant).
- SIRET : espaces retirés à la sauvegarde ; avertissement non bloquant si
  ≠ 14 chiffres.
- Total des participations d'une SCCV ≠ 100 % → avertissement non bloquant
  (le legacy ne contrôle pas, la ligne Total du pied sert de contrôle visuel).
- Pas de contrôle `capital = nb_part × montant_part` (trois saisies
  indépendantes en legacy) ; hors périmètre.
- Règle « SCCV liquidée non affectable à une opération » : notée pour la
  future édition de la fiche Opération, rien à faire ici.

## 6. Vérification

- `tsc` propre ; migration Drizzle générée et appliquée.
- `npm run db:transform` : volumes cibles = volumes sources (participation
  299, compte_banque 195, structure_juridique 138…).
- Recette navigateur : filtres (défaut non liquidées), sélection → 4 onglets,
  création/modification SCCV (SIRET nettoyé), CRUD participation (total %)
  et compte bancaire, lecture seule en service Consultation.
