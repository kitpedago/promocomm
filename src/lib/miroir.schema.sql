-- Généré par npm run db:miroir -- --ddl depuis le schéma legacy (2026-09-08). Ne pas éditer.
DROP TABLE IF EXISTS "AccordCadreAssurance";
CREATE TABLE "AccordCadreAssurance" (
  "Code" text
);
DROP TABLE IF EXISTS "ActionFinGFAType";
CREATE TABLE "ActionFinGFAType" (
  "IDActionFinGFAType" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "ArchiveStadeAvancement";
CREATE TABLE "ArchiveStadeAvancement" (
  "DateArchivage" timestamp without time zone,
  "Libelle" text,
  "IDArchiveStadeAvancement" integer
);
DROP TABLE IF EXISTS "ArchiveStadeAvancementListe";
CREATE TABLE "ArchiveStadeAvancementListe" (
  "IDArchiveStadeAvancement" integer,
  "IDListeAvancement" integer,
  "IDTranche" integer,
  "DatePrevMAJPromo" timestamp without time zone,
  "DateReelle" timestamp without time zone,
  "Ordre" integer,
  "Domaine" text,
  "CodeStadeAvancement" text,
  "StadeAvancement" text,
  "LibelleMission" text,
  "IDOperation" integer,
  "Tranche" text,
  "NbLogtIndiv" integer,
  "NbLogtColl" integer,
  "NbAutresLocaux" integer,
  "NbTerrain" integer,
  "curPourcentageHF" real,
  "AnneeStade" integer,
  "Commune" text,
  "Operation" text,
  "DateStade" timestamp without time zone,
  "StatutDate" text,
  "IDTypeDateStadeAvancement" integer,
  "TypeDateStadeAvancement" text,
  "IDArchiveStadeAvancementListe" integer
);
DROP TABLE IF EXISTS "BanqueActionType";
CREATE TABLE "BanqueActionType" (
  "Libelle" text,
  "IDBanqueActionType" integer
);
DROP TABLE IF EXISTS "BanqueCourtage";
CREATE TABLE "BanqueCourtage" (
  "Libelle" text,
  "IDBanqueCourtage" integer
);
DROP TABLE IF EXISTS "BaremeHonoComm";
CREATE TABLE "BaremeHonoComm" (
  "IDBaremeHonoComm" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "BlocageHonoOCFin";
CREATE TABLE "BlocageHonoOCFin" (
  "IDBlocageHonoOCFin" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "CSP";
CREATE TABLE "CSP" (
  "Numero" integer,
  "Libelle" text,
  "IDCSP" integer
);
DROP TABLE IF EXISTS "CalendrierMois";
CREATE TABLE "CalendrierMois" (
  "DateDebutMois" timestamp without time zone,
  "DateFinMois" timestamp without time zone,
  "Ann_e" integer,
  "Mois" text
);
DROP TABLE IF EXISTS "CategorieFrais";
CREATE TABLE "CategorieFrais" (
  "Libelle" text,
  "EstPublicite" boolean,
  "Ordre" integer,
  "IDCategorieFrais" integer,
  "IDUsageFrais" integer
);
DROP TABLE IF EXISTS "Certification";
CREATE TABLE "Certification" (
  "Libelle" text,
  "IDCertification" integer
);
DROP TABLE IF EXISTS "Commune";
CREATE TABLE "Commune" (
  "CodeINSEE" text,
  "Libelle" text,
  "Departement" text,
  "ZonageABCRevise" text,
  "CodePostal" text,
  "IDCommune" integer
);
DROP TABLE IF EXISTS "CommuneEtZonePourImport";
CREATE TABLE "CommuneEtZonePourImport" (
  "code_commune_insee" integer,
  "nom_de_la_commune" text,
  "code_postal" integer
);
DROP TABLE IF EXISTS "Contentieux";
CREATE TABLE "Contentieux" (
  "Objet" text,
  "DateDebut" timestamp without time zone,
  "DateFin" timestamp without time zone,
  "Avocats" text,
  "Commentaires" text,
  "IDOperation" integer,
  "IDContentieux" integer
);
DROP TABLE IF EXISTS "Copie de tCommercialisation";
CREATE TABLE "Copie de tCommercialisation" (
  "IDCommercialisation" integer,
  "IDLot" integer,
  "IDAcquereur" integer,
  "DateResa" timestamp without time zone,
  "DateSignatureContratLoc" timestamp without time zone,
  "DateSignatureActeVEFA" timestamp without time zone,
  "DateLivraison" timestamp without time zone,
  "DateLeveeOption" timestamp without time zone,
  "DateAnnulation" timestamp without time zone,
  "PrestataireCommercialisation" integer,
  "PromoGesNom" text,
  "DatePrevueSignatureActe" timestamp without time zone,
  "PrestataireComm1" integer,
  "PrestataireComm2" integer,
  "TauxCommResa" real,
  "TauxCommActe" real,
  "CommVendeurAVerserResa" numeric(19,4),
  "CommVendeurAVerserActe" numeric(19,4),
  "IDListeTypeAcquereur" integer,
  "PasAideRM" boolean,
  "MontantSubv" numeric(19,4),
  "MotifAnnulation" text,
  "DateSignatureComm" text,
  "EstFiscalite" boolean,
  "IDFiscaliteAcquereur" integer,
  "CommFisca" text,
  "EstJustifFiscal" boolean,
  "Loyer" numeric(19,4),
  "Epargne" numeric(19,4),
  "IDNatureAchat" integer,
  "CourrierInfoDemarrageDateEnvoiCourrier" timestamp without time zone,
  "PlanTechniqueDateEnvoiCourrier" timestamp without time zone,
  "ChoixMateriauxDateEnvoiCourrier" timestamp without time zone,
  "ChoixMateriauxDateChoixValide" timestamp without time zone,
  "PlacoDateEnvoiCourrier" timestamp without time zone,
  "PlacoRDVDate" timestamp without time zone,
  "PlacoRDVHeure" timestamp without time zone,
  "QuinzaineLivraisonDateEnvoiCourrier_old" timestamp without time zone,
  "QuinzaineLivraisonPeriode_old" text,
  "PreviLivraisionDateEnvoiCourrier_old" timestamp without time zone,
  "PreviLivraisionRDVDate_old" timestamp without time zone,
  "PreviLivraisionRDVHeure_old" timestamp without time zone,
  "LivraisonDateEnvoiCourrier" timestamp without time zone,
  "LivraisonRDVDate" timestamp without time zone,
  "LivraisonRDVHeure" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" text,
  "LivraisonTrimestreDecale" text,
  "CDVPromo" text,
  "TMADateEnvoiCourrier" timestamp without time zone,
  "TMAMontantOuvertureDossier" numeric(19,4),
  "TMACommentaire" text,
  "TMADatePaiementSolde" timestamp without time zone,
  "TMAMailingListeDevis" text,
  "TMAMailingSolde" text,
  "DateEtatSortieLieux" timestamp without time zone,
  "AnnulationCommentaire" text,
  "DateResiliationContratLoc" timestamp without time zone,
  "MontantDepotGarantie" real,
  "curNbCommVendeur" integer,
  "MontantSubvAcpte" numeric(19,4),
  "SoldeDemande" boolean,
  "PrixDeVenteReelTTC" numeric(19,4),
  "TauxTVAReel" real,
  "RemiseClientTTC" numeric(19,4),
  "PrixDeVenteReelTTC_old" numeric(19,4),
  "PrixDeVenteReelHT" numeric(19,4),
  "NbTMA" integer,
  "TMA_PMR_Montant" numeric(19,4),
  "CDVTechnique" text,
  "AvecTMA" boolean,
  "TroisMoisAvantLivraisonDateEnvoiCourrier" timestamp without time zone,
  "TroisMoisAvantLivraisonPeriode" text,
  "TMA_PMR_ContratSigne" boolean,
  "TMA_PMR_DateRemisNotaireContratEtPlanVEFA" timestamp without time zone,
  "DateDemandeAgrement" timestamp without time zone,
  "DateAgrementObtenuEtEnvoiNotaire" timestamp without time zone,
  "DateReceptionCourrierLVO" timestamp without time zone,
  "AvecHonoraireCourtage" boolean,
  "MontantHonoraireCourtageClient" numeric(19,4),
  "MontantHonoraireCourtageBanque" numeric(19,4),
  "IDBanqueCourtage" integer,
  "AvecSouscriptionCapitalKPI" boolean,
  "DateSouscription" timestamp without time zone,
  "IDMoyenDePaiement" integer,
  "PasDeSouscriptionAuCapital" boolean,
  "CommentairesSouscription" text
);
DROP TABLE IF EXISTS "DataLots";
CREATE TABLE "DataLots" (
  "ID TRANCHE" double precision,
  "Tranche" text,
  "Tranche - libellé" text,
  "Grille" text,
  "Grille - libellé" text,
  "Numéro de lot" text,
  "Lot associé" text,
  "Code de copropriété" text,
  "Famille de bien" text,
  "Type de bien" text,
  "Caractéristique" text,
  "Surf habitable" double precision,
  "Surf pondérée" double precision,
  "Surf utile" double precision,
  "Surf terrasse" double precision,
  "N° étage" text,
  "Surf garage" double precision,
  "N°parcelle" text,
  "Surf cave" double precision,
  "Surf balcon" double precision,
  "Surf loggias" double precision,
  "Surf remise" double precision,
  "Surf jardin" double precision,
  "Surf terrain" double precision,
  "Exposition" text,
  "Tantièmes" double precision,
  "Prix d'origine HT" double precision,
  "TVA Origine" text,
  "Prix d'origine" double precision,
  "Prix de vente HT" double precision,
  "Acquéreur - code" text,
  "Tx Vente" text,
  "Prix de vente TTC" double precision,
  "Tva/M" double precision,
  "Non destiné a la vente" double precision,
  "Statut" text,
  "Prix au m²" double precision,
  "Acquéreur - nom" text,
  "Date dépôt de prêt" timestamp without time zone,
  "Date prévue accord de prêt" timestamp without time zone,
  "Date accord de prêt" timestamp without time zone,
  "Date réservation" timestamp without time zone,
  "Date procuration" timestamp without time zone,
  "Date prévue signature" timestamp without time zone,
  "Date RDV acte" timestamp without time zone,
  "Date signature" timestamp without time zone,
  "Date prévue livraison" timestamp without time zone,
  "Date livraison" timestamp without time zone,
  "Prescripteur" text,
  "Mnt Comm" double precision,
  "Notes" text
);
DROP TABLE IF EXISTS "DecalageUniteTemps";
CREATE TABLE "DecalageUniteTemps" (
  "Libelle" text,
  "IDDecalageUniteTemps" integer
);
DROP TABLE IF EXISTS "DomaineStadeAvancement";
CREATE TABLE "DomaineStadeAvancement" (
  "CodeDomaineStadeAvancement" text
);
DROP TABLE IF EXISTS "Droit";
CREATE TABLE "Droit" (
  "IDDroit" integer,
  "Fenetre" text,
  "Controle" text,
  "Indice" integer,
  "IDService" integer,
  "IDTypeDroit" integer,
  "Commentaires" text
);
DROP TABLE IF EXISTS "EquipePersonne";
CREATE TABLE "EquipePersonne" (
  "Libelle" text,
  "IDEquipePersonne" integer
);
DROP TABLE IF EXISTS "EtatStadeAvancementAlerte";
CREATE TABLE "EtatStadeAvancementAlerte" (
  "Libelle" text,
  "IDEtatStadeAvancementAlerte" integer
);
DROP TABLE IF EXISTS "EtudeNotaire";
CREATE TABLE "EtudeNotaire" (
  "NomEtude" text,
  "Adresse" text,
  "CP" text,
  "Commune" text,
  "Email" text,
  "Commentaire" text,
  "IDEtudeNotaire" integer
);
DROP TABLE IF EXISTS "FonctionInterlocuteurNotaire";
CREATE TABLE "FonctionInterlocuteurNotaire" (
  "Libelle" text,
  "IDFonctionInterlocuteurNotaire" integer
);
DROP TABLE IF EXISTS "FraisFinancierPub";
CREATE TABLE "FraisFinancierPub" (
  "IDCategorieFrais" integer,
  "BudgetMontant" numeric(19,4),
  "ActuaMontant" numeric(19,4),
  "ConsommeMontant" numeric(19,4),
  "ReelMontant" numeric(19,4),
  "IDTranche" integer,
  "Ordre" integer,
  "IDFraisFinancierPub" integer,
  "UsageFrais" text
);
DROP TABLE IF EXISTS "GarantieEmpruntActionType";
CREATE TABLE "GarantieEmpruntActionType" (
  "Libelle" text,
  "IDGarantieEmpruntActionType" integer
);
DROP TABLE IF EXISTS "GestionnaireSCCV";
CREATE TABLE "GestionnaireSCCV" (
  "Libelle" text,
  "IDGestionnaireSCCV" integer
);
DROP TABLE IF EXISTS "ImportLotPromoGes";
CREATE TABLE "ImportLotPromoGes" (
  "IDTranche" double precision,
  "Tranche" text,
  "Tranche - libellé" text,
  "Grille" text,
  "Grille - libellé" text,
  "Numéro de lot" text,
  "Lot associé" text,
  "Code de copropriété" text,
  "Famille de bien" text,
  "Type de bien" text,
  "Caractéristique" text,
  "Surf habitable" double precision,
  "Surf pondérée" double precision,
  "Surf utile" double precision,
  "Surf terrasse" double precision,
  "Surf garage" double precision,
  "Surf cave" double precision,
  "Surf balcon" double precision,
  "Surf loggias" double precision,
  "Surf remise" double precision,
  "Surf jardin" double precision,
  "Surf terrain" double precision,
  "N° étage" text,
  "Exposition" text,
  "N°parcelle" text,
  "Tantièmes" double precision,
  "Prix d'origine" double precision,
  "Prix de vente HT" double precision,
  "Prix de vente TTC" double precision,
  "TVA" text,
  "Tva/M" double precision,
  "Non destiné a la vente" double precision,
  "Statut" text,
  "Prix au m²" double precision,
  "Acquéreur - code" text,
  "Acquéreur - nom" text,
  "Date dépôt de prêt" timestamp without time zone,
  "Date prévue accord de prêt" timestamp without time zone,
  "Date accord de prêt" timestamp without time zone,
  "Date réservation" timestamp without time zone,
  "Date procuration" timestamp without time zone,
  "Date prévue signature" timestamp without time zone,
  "Date RDV acte" timestamp without time zone,
  "Date signature" timestamp without time zone,
  "Date prévue livraison" timestamp without time zone,
  "Date livraison" timestamp without time zone,
  "Commercial" text,
  "Pct comm" double precision,
  "Mnt Comm" double precision,
  "Notes" text,
  "IDDestination" integer
);
DROP TABLE IF EXISTS "InfoConsigne";
CREATE TABLE "InfoConsigne" (
  "NomTable" text,
  "NomChamp" text,
  "TexteInfoConsigne" text,
  "NomControleAlternatif" text,
  "IDInfoConsigne" integer
);
DROP TABLE IF EXISTS "InterlocuteurNotaire";
CREATE TABLE "InterlocuteurNotaire" (
  "Civilite" text,
  "Patronyme" text,
  "Prenom" text,
  "Fonction" text,
  "Telephone" text,
  "Email" text,
  "IDEtudeNotaire" integer,
  "IDFonctionInterlocuteurNotaire" integer,
  "IDInterlocuteurNotaire" integer
);
DROP TABLE IF EXISTS "Label";
CREATE TABLE "Label" (
  "Libelle" text,
  "IDLabel" integer
);
DROP TABLE IF EXISTS "ListeNumEtage";
CREATE TABLE "ListeNumEtage" (
  "NumEtageImport" text,
  "NumEtageAfficher" text
);
DROP TABLE IF EXISTS "MandatHypothequer";
CREATE TABLE "MandatHypothequer" (
  "IDMandatHypothequer" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "MissionMOEInterne";
CREATE TABLE "MissionMOEInterne" (
  "IDMissionMOEInterne" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "ModeleMail";
CREATE TABLE "ModeleMail" (
  "IDModeleMail" integer,
  "Libelle" text,
  "Sujet" text,
  "Corps" bytea,
  "ModeBrouillon" smallint,
  "Destinataire" text,
  "DestinataireCC" text,
  "DestinataireCCI" text,
  "req_WD" text
);
DROP TABLE IF EXISTS "ModelePJ";
CREATE TABLE "ModelePJ" (
  "IDModelePJ" integer,
  "Libelle" text,
  "Nom_etat_WD" text,
  "IDModeleMail" integer,
  "Chemin" text
);
DROP TABLE IF EXISTS "MotifAnnulation";
CREATE TABLE "MotifAnnulation" (
  "IDMotifAnnulation" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "MotifClauseParticuliereComm";
CREATE TABLE "MotifClauseParticuliereComm" (
  "IDMotifClauseParticuliereComm" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "MotifRemunerationAssocie";
CREATE TABLE "MotifRemunerationAssocie" (
  "Libelle" text,
  "IDMotifRemunerationAssocie" integer
);
DROP TABLE IF EXISTS "MoyenDePaiement";
CREATE TABLE "MoyenDePaiement" (
  "Libelle" text,
  "IDMoyenDePaiement" integer
);
DROP TABLE IF EXISTS "NatureJuridique";
CREATE TABLE "NatureJuridique" (
  "IDNatureJuridique" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "NumEtageTemp";
CREATE TABLE "NumEtageTemp" (
  "NumAvant" text,
  "NumApres" text
);
DROP TABLE IF EXISTS "OFSNom";
CREATE TABLE "OFSNom" (
  "IDOFSNom" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "OrganismeSubvention";
CREATE TABLE "OrganismeSubvention" (
  "IDOrganismeSubvention" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "OrganismeSubvention-23062026";
CREATE TABLE "OrganismeSubvention-23062026" (
  "IDOrganismeSubvention" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "Param";
CREATE TABLE "Param" (
  "IDParam" integer,
  "Param" text,
  "Typ" text,
  "ValeurD" timestamp without time zone,
  "ValeurN" real,
  "ValeurT" text,
  "ValeurH" text
);
DROP TABLE IF EXISTS "Partenariat";
CREATE TABLE "Partenariat" (
  "Libelle" text,
  "IDPartenariat" integer
);
DROP TABLE IF EXISTS "PerformanceEnergetique";
CREATE TABLE "PerformanceEnergetique" (
  "IDPerformanceEnergetique" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "PeriodeTauxGFA";
CREATE TABLE "PeriodeTauxGFA" (
  "Libelle" text,
  "IDPeriodeTauxGFA" integer
);
DROP TABLE IF EXISTS "Periodicite";
CREATE TABLE "Periodicite" (
  "CodePeriodicite" text
);
DROP TABLE IF EXISTS "REQ_Acquereur_Simple";
CREATE TABLE "REQ_Acquereur_Simple" (
  "IDAcquereur" integer,
  "NomComplet" text
);
DROP TABLE IF EXISTS "REQ_Assistante";
CREATE TABLE "REQ_Assistante" (
  "IDPersonne" integer,
  "Assistante" text
);
DROP TABLE IF EXISTS "REQ_Avancement_selon_domaine";
CREATE TABLE "REQ_Avancement_selon_domaine" (
  "IDListeAvancement" integer,
  "Libelle" text,
  "Domaine" text,
  "Ordre" integer
);
DROP TABLE IF EXISTS "REQ_Interface_Operation_Tranche";
CREATE TABLE "REQ_Interface_Operation_Tranche" (
  "IDTranche" integer,
  "Libelle" text,
  "IDConcept" integer,
  "IDOperation" integer,
  "NbLogtIndiv" integer,
  "NbLogtColl" integer,
  "NbAutresLocaux" integer,
  "NbTerrain" integer,
  "DontLogtCollPSLA" integer,
  "DontLogtIndivPSLA" integer,
  "Commentaire" text,
  "DateLivraisonContractuelle" timestamp without time zone,
  "MontantHonoParLogt" numeric(24,6),
  "PasDeCommercialisation" smallint,
  "Adresse" text,
  "DureeChantierMois" integer,
  "TerrainMontantHT" numeric(24,6),
  "TerrainAcompte" numeric(24,6),
  "TerrainComm" text,
  "CoutPrevPSLA" numeric(24,6),
  "CoutPrevVEFA" numeric(24,6),
  "CoutPrevAutre" numeric(24,6),
  "CoutPrevCommentaire" text,
  "CoutReelPSLA" numeric(24,6),
  "CoutReelVEFA" numeric(24,6),
  "CoutReelAutre" numeric(24,6),
  "CoutReelCommentaire" text,
  "IDModeRepartQuotePart" integer,
  "QuotePartPSLA" real,
  "QuotePartVEFA_Normal" real,
  "QuotePartVEFA_Reduit" integer,
  "QuotePartAutre" real,
  "QuotePartCommentaire" text,
  "NbLVOPrev" integer,
  "NbLVOPrevAnnee" integer,
  "FinCommercialisation" smallint,
  "FinTabborAnnuel" smallint,
  "Concept" text,
  "Architecte" text,
  "DontLogtCollBRS" integer,
  "DontLogtIndivBRS" integer,
  "AlerteStadeAvancement_Texte" text,
  "IDCertification" integer,
  "IDLabel" integer,
  "IDPerformanceEnergetique" integer,
  "EstMOEInterne" smallint,
  "IDMissionMOEInterne" integer,
  "CommentaireAvancement" text,
  "CommentaireActionAMener" text
);
DROP TABLE IF EXISTS "REQ_InterlocuteurNotaire";
CREATE TABLE "REQ_InterlocuteurNotaire" (
  "NomEtude" text,
  "IDInterlocuteurNotaire" integer,
  "InterlocuteurNotaire" text,
  "NomComplet" text
);
DROP TABLE IF EXISTS "REQ_Operation";
CREATE TABLE "REQ_Operation" (
  "IDOperation" integer,
  "IDStructureJuridique" integer,
  "Libelle" text,
  "CP" text,
  "Commune" text,
  "SurRennesMetropole" smallint,
  "ANRU" smallint,
  "Commentaire" text,
  "AnneeDGD" integer,
  "MasquerCommercial" smallint,
  "MasquerComptable" smallint,
  "Adresse" text,
  "NomZAC" text,
  "DureeChantierMois_old" integer,
  "MasquerPromo" smallint,
  "RS" text,
  "curIDPersonne_ChargeOpe1" integer,
  "curIDPersonne_ChargeOpe2" integer,
  "NbTranches" numeric(20,0),
  "TotalLogtColl" bigint,
  "TotalTerrain" bigint,
  "TotalLogtIndiv" bigint,
  "TotalNbAutresLocaux" bigint,
  "ANRUComment" text,
  "IDSecteurGeographiqueDeveloppement" integer,
  "IDInterlocuteurNotaire_Foncier" integer,
  "IDInterlocuteurNotaire_Vente" integer,
  "AbreviationPourCodeReserve" text,
  "IDPersonne_Assistante" integer,
  "SynchroniserDatesEntreTranche" smallint,
  "IDApporteurFoncier" integer
);
DROP TABLE IF EXISTS "REQ_PrestataireComm2";
CREATE TABLE "REQ_PrestataireComm2" (
  "IDPrestataire" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "REQ_Reservation";
CREATE TABLE "REQ_Reservation" (
  "IDCommercialisation" integer,
  "IDLot" integer,
  "Numlot" text,
  "NomComplet" text,
  "IDDestination" integer,
  "IDNatureAchat" integer,
  "DateResa" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" text,
  "PrixDeVenteReelTTC" numeric(24,6),
  "DateAnnulation" timestamp without time zone,
  "MontantDepotGarantie" real,
  "PrestataireComm1" integer,
  "PrestataireComm2" integer,
  "EstFiscalite" smallint,
  "CommFisca" text,
  "IDFiscaliteAcquereur" integer,
  "EstJustifFiscal" smallint,
  "DateSignatureContratLoc" timestamp without time zone,
  "Loyer" numeric(24,6),
  "Epargne" numeric(24,6),
  "DatePrevueSignatureActe" timestamp without time zone,
  "DateSignatureComm" text,
  "DateSignatureActeVEFA" timestamp without time zone,
  "DateLeveeOption" timestamp without time zone,
  "PasAideRM" smallint,
  "MontantSubv" numeric(24,6),
  "DateLivraison" timestamp without time zone,
  "MontantSubvAcpte" numeric(24,6),
  "SoldeDemande" smallint
);
DROP TABLE IF EXISTS "REQ_Reservation_Tout";
CREATE TABLE "REQ_Reservation_Tout" (
  "IDCommercialisation" integer,
  "IDLot" integer,
  "NomComplet" text,
  "Numlot" text,
  "IDDestination" integer,
  "IDNatureAchat" integer,
  "DateResa" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" text,
  "PrixDeVenteReelTTC" numeric(24,6),
  "DateAnnulation" timestamp without time zone,
  "MontantDepotGarantie" real,
  "PrestataireComm1" integer,
  "PrestataireComm2" integer,
  "EstFiscalite" smallint,
  "CommFisca" text,
  "IDFiscaliteAcquereur" integer,
  "EstJustifFiscal" smallint,
  "DateSignatureContratLoc" timestamp without time zone,
  "Loyer" numeric(24,6),
  "Epargne" numeric(24,6),
  "DatePrevueSignatureActe" timestamp without time zone,
  "DateSignatureComm" text,
  "DateSignatureActeVEFA" timestamp without time zone,
  "DateLeveeOption" timestamp without time zone,
  "PasAideRM" smallint,
  "MontantSubv" numeric(24,6),
  "DateLivraison" timestamp without time zone,
  "RemiseClientTTC" numeric(24,6),
  "PrixDeVenteReelHT" numeric(24,6),
  "TauxTVAReel" real
);
DROP TABLE IF EXISTS "REQ_SCCV_Creation_DernierMois";
CREATE TABLE "REQ_SCCV_Creation_DernierMois" (
  "RS" text,
  "Commune" text,
  "Operation" text,
  "DateLiquidation" timestamp without time zone,
  "NbLogt" bigint,
  "DateImmat" timestamp without time zone
);
DROP TABLE IF EXISTS "REQ_SCCV_Liquidation_DernierMois";
CREATE TABLE "REQ_SCCV_Liquidation_DernierMois" (
  "RS" text,
  "Commune" text,
  "Operation" text,
  "DateLiquidation" timestamp without time zone,
  "NbLogt" bigint,
  "DateImmat" timestamp without time zone
);
DROP TABLE IF EXISTS "REQ_Subvention_Simple";
CREATE TABLE "REQ_Subvention_Simple" (
  "IDSubvention" integer,
  "IDTranche" integer,
  "IDCategorieSubvention" integer,
  "IDOrganismeSubvention" integer,
  "DateConvention" timestamp without time zone,
  "BudgetPreviMontant" numeric(24,6),
  "BudgetPreviCommentaire" text
);
DROP TABLE IF EXISTS "REQ_Tranche_Situation_DernierMois_LIV";
CREATE TABLE "REQ_Tranche_Situation_DernierMois_LIV" (
  "Operation" text,
  "Commune" text,
  "Tranche" text,
  "StadeIDSituation" integer,
  "StadeDepuisLe" timestamp without time zone,
  "NbLogt" bigint
);
DROP TABLE IF EXISTS "REQ_Tranche_Situation_DernierMois_LancementCom";
CREATE TABLE "REQ_Tranche_Situation_DernierMois_LancementCom" (
  "Operation" text,
  "Commune" text,
  "Tranche" text,
  "NbLogt" bigint,
  "StadeCOM" timestamp without time zone
);
DROP TABLE IF EXISTS "REQ_Tranche_Situation_DernierMois_TRAVAUX";
CREATE TABLE "REQ_Tranche_Situation_DernierMois_TRAVAUX" (
  "Operation" text,
  "Commune" text,
  "Tranche" text,
  "StadeIDSituation" integer,
  "NbLogt" bigint,
  "StadeDepuisLe" timestamp without time zone
);
DROP TABLE IF EXISTS "ReducGFA";
CREATE TABLE "ReducGFA" (
  "IDGFA" integer,
  "Montant" numeric(19,4),
  "DateReduc" timestamp without time zone,
  "Comm" text,
  "IDReducGFA" integer
);
DROP TABLE IF EXISTS "RegleAlerteStadeAvancement";
CREATE TABLE "RegleAlerteStadeAvancement" (
  "IDTypeDate1" integer,
  "IDStadeAvancement1" integer,
  "IDEtatStadeAlerte1" integer,
  "IDTypeDate2" integer,
  "IDStadeAvancement2" integer,
  "IDEtatStadeAlerte2" integer,
  "TxtSiALerte" text,
  "IDRegleAlerteStadeAvancement" integer
);
DROP TABLE IF EXISTS "SecteurGeographiqueDeveloppement";
CREATE TABLE "SecteurGeographiqueDeveloppement" (
  "Libelle" text,
  "IDSecteurGeographiqueDeveloppement" integer
);
DROP TABLE IF EXISTS "Service";
CREATE TABLE "Service" (
  "IDService" integer,
  "Libelle" text,
  "Num" integer
);
DROP TABLE IF EXISTS "Signataire";
CREATE TABLE "Signataire" (
  "IDSignataire" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "SituationFamiliale";
CREATE TABLE "SituationFamiliale" (
  "IDSituationFamiliale" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "SituationFamille";
CREATE TABLE "SituationFamille" (
  "IDSituationDeFamille" integer,
  "Libelle" text,
  "IDSituationFamille" integer
);
DROP TABLE IF EXISTS "StatutApport";
CREATE TABLE "StatutApport" (
  "IDStatutApport" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "StatutApportPromoteurGFA";
CREATE TABLE "StatutApportPromoteurGFA" (
  "IDStatutApportPromoteurGFA" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "StatutCoutMandat";
CREATE TABLE "StatutCoutMandat" (
  "IDStatutCoutMandat" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "StructureBaseDonnee";
CREATE TABLE "StructureBaseDonnee" (
  "IDBaseDonnee" integer,
  "FullName" text,
  "IDStructureBaseDonnee" integer
);
DROP TABLE IF EXISTS "StructureChamp";
CREATE TABLE "StructureChamp" (
  "IDChamp" integer,
  "IDTableData" integer,
  "Code" text,
  "Libelle" text,
  "IDTypeChamp" integer,
  "Taille" integer,
  "DateAjout" timestamp without time zone,
  "Commentaire" text,
  "NomIndex" text,
  "Unique" smallint,
  "ClePrimaire" smallint,
  "Requis" smallint,
  "OrigineDeLaDonnee" text,
  "IDStructureDomaine" integer,
  "IDStructureEmplacementInterface" integer,
  "IDStructureStatutChamp" integer,
  "IDTableData_EnLienAvec" integer,
  "DateRenomme" timestamp without time zone,
  "DateSupprime" timestamp without time zone,
  "IDStructureChamp" integer
);
DROP TABLE IF EXISTS "StructureDomaine";
CREATE TABLE "StructureDomaine" (
  "Libelle" text,
  "IDStructureDomaine" integer
);
DROP TABLE IF EXISTS "StructureEmplacementInterface";
CREATE TABLE "StructureEmplacementInterface" (
  "Libelle" text,
  "IDStructureEmplacementInterface" integer
);
DROP TABLE IF EXISTS "StructureStatutChamp";
CREATE TABLE "StructureStatutChamp" (
  "Libelle" text,
  "Commentaire" text,
  "IDStructureStatutChamp" integer
);
DROP TABLE IF EXISTS "StructureTableData";
CREATE TABLE "StructureTableData" (
  "IDTableData" integer,
  "Libelle" text,
  "IDBaseDonnee" integer,
  "DateAjout" timestamp without time zone,
  "Commentaire" text,
  "IDStructureTableData" integer
);
DROP TABLE IF EXISTS "StructureTypeChamp";
CREATE TABLE "StructureTypeChamp" (
  "IDTypeChamp" integer,
  "Libelle" text,
  "IDStructureTypeChamp" integer
);
DROP TABLE IF EXISTS "SurfaceNature";
CREATE TABLE "SurfaceNature" (
  "IDSurfaceNature" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "TypeBatiment";
CREATE TABLE "TypeBatiment" (
  "IDTypeBatiment" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "TypeBatimentStade";
CREATE TABLE "TypeBatimentStade" (
  "IDTypeBatimentStade" integer,
  "IDTypeBatiment" integer,
  "IDListeAvancement" integer,
  "IntervalleDureeMois" real,
  "IntervalleDureeMoisEtage" real
);
DROP TABLE IF EXISTS "TypeContratAssurance";
CREATE TABLE "TypeContratAssurance" (
  "Code" text
);
DROP TABLE IF EXISTS "TypeDateStadeAvancement";
CREATE TABLE "TypeDateStadeAvancement" (
  "IDTypeDateStadeAvancement" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "TypeDeMenage";
CREATE TABLE "TypeDeMenage" (
  "IDTypeDeMenage" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "TypeDroit";
CREATE TABLE "TypeDroit" (
  "IDTypeDroit" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "TypeFoncier";
CREATE TABLE "TypeFoncier" (
  "IDTypeFoncier" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "TypeLogementActuel";
CREATE TABLE "TypeLogementActuel" (
  "IDTypeLogementActuel" integer,
  "Libelle" text,
  "NumRM" integer
);
DROP TABLE IF EXISTS "TypeMissionBudgetArchitecte";
CREATE TABLE "TypeMissionBudgetArchitecte" (
  "IDTypeMissionBudgetArchitecte" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "UsageFrais";
CREATE TABLE "UsageFrais" (
  "IDUsageFrais" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "ZonageABC";
CREATE TABLE "ZonageABC" (
  "CodeZonageABC" text
);
DROP TABLE IF EXISTS "audit__tSubvention_delete_log";
CREATE TABLE "audit__tSubvention_delete_log" (
  "log_id" integer,
  "log_time" timestamp without time zone,
  "rows_deleted" integer,
  "login_name" text,
  "server_principal" text,
  "host_name" text,
  "app_name" text,
  "client_net_addr" text,
  "statement_text" text
);
DROP TABLE IF EXISTS "audit__tSubvention_truncate_log";
CREATE TABLE "audit__tSubvention_truncate_log" (
  "log_id" integer,
  "log_time" timestamp without time zone,
  "database_name" text,
  "schema_name" text,
  "object_name" text,
  "login_name" text,
  "server_principal" text,
  "host_name" text,
  "app_name" text,
  "client_net_addr" text,
  "statement_text" text
);
DROP TABLE IF EXISTS "sysdiagrams";
CREATE TABLE "sysdiagrams" (
  "name" text,
  "principal_id" integer,
  "diagram_id" integer,
  "version" integer,
  "definition" bytea
);
DROP TABLE IF EXISTS "tAcquereur";
CREATE TABLE "tAcquereur" (
  "IDAcquereur" integer,
  "Code" text,
  "Patronyme" text,
  "Civilite" text,
  "Prenom" text,
  "RS" text,
  "NatureJuridique" integer,
  "TypePropriétaire_old" integer,
  "Commentaire" text,
  "PromoGesNom" text,
  "ImportIDLot" integer,
  "ImportDateResa" timestamp without time zone,
  "ImportDatePrevueSignature" timestamp without time zone,
  "ImportDateLivraison" timestamp without time zone,
  "Identifiant" text,
  "N° Lot" text,
  "Typologie" text,
  "Etage" text,
  "surface" text,
  "Téléphone" text,
  "Portable" text,
  "Email" text,
  "AdresseActuelle" text,
  "CPActuel" text,
  "Communeactuelle" text,
  "IDTypeLogementActuel" integer,
  "RevenusFoyerFiscal_orig" text,
  "IDAcquereurRevenuFoyerFiscalParQuartile" integer,
  "AnneeDeDeclaration_orig" text,
  "NombreAdultes_orig" text,
  "NombreEnfants_orig" text,
  "EnfantAVenir_orig" text,
  "IDAcquereurPlafondRessources" integer,
  "PrixDAchat_orig" text,
  "TauxTVA_orig" text,
  "ApportReelADateHorsSubvention_orig" text,
  "Subvention_orig" text,
  "DateDeReservation" text,
  "Date  signature de contrat de loc acc" text,
  "Date de transfert de propriété" text,
  "Adresse programme" text,
  "CP programme" text,
  "Ville programme" text,
  "Nom programme" text,
  "Type de programme" text,
  "Co-propriété" text,
  "Zone ANRU" text,
  "Type d'acquisition" text,
  "PrimoAccedant" text,
  "Modifications" text,
  "ReservesDE" text,
  "Date prévisionnelle livraison" text,
  "Date réelle livraison" text,
  "IDAcquereurTrancheAge" integer,
  "Etape" text,
  "IDConseillerCommercial" integer,
  "IDConseillerTechnique" integer,
  "EnqueteA" text,
  "EnqueteB" text,
  "EnqueteC" text,
  "SituationFamiliale" integer,
  "Adulte1Age" integer,
  "Adulte2Age" integer,
  "Adulte1CSP" integer,
  "Adulte2CSP" integer,
  "Adulte1Metier" text,
  "Adulte2Metier" text,
  "Adulte1CommuneTravail" text,
  "Adulte2CommuneTravail" text,
  "TypeDeMenage" integer,
  "AgeEnfant1" integer,
  "AgeEnfant2" integer,
  "AgeEnfant3" integer,
  "AgeEnfant4" integer,
  "AgeEnfant5" integer,
  "RevenuNetFoyerMensuel_orig" text,
  "MultiAccedant" boolean,
  "RevenusNetImposableNMoins1" numeric(19,4),
  "Telephone_old" text,
  "TelPortable_old" text,
  "EstPTZ" boolean,
  "MensualiteDuFinancementClient" numeric(19,4),
  "TauxEffort" real,
  "old_CourrierInfoDemarrageDateEnvoiCourrier" timestamp without time zone,
  "old_PlanTechniqueDateEnvoiCourrier" timestamp without time zone,
  "old_TMA" boolean,
  "old_TMADateEnvoiCourrier" timestamp without time zone,
  "old_TMAMontantOuvertureDossier" numeric(19,4),
  "old_TMAMontantAcompte" numeric(19,4),
  "old_TMAMontantSolde" numeric(19,4),
  "old_TMACommentaire" text,
  "old_ChoixMateriauxDateEnvoiCourrier" timestamp without time zone,
  "old_ChoixMateriauxDateChoixValide" timestamp without time zone,
  "old_PlacoDateEnvoiCourrier" timestamp without time zone,
  "old_PlacoRDVDate" timestamp without time zone,
  "old_PlacoRDVHeure" timestamp without time zone,
  "old_QuinzaineLivraisonDateEnvoiCourrier" timestamp without time zone,
  "old_QuinzaineLivraisonPeriode" text,
  "old_PreviLivraisionDateEnvoiCourrier" timestamp without time zone,
  "old_PreviLivraisionRDVDate" timestamp without time zone,
  "old_PreviLivraisionRDVHeure" timestamp without time zone,
  "old_LivraisonDateEnvoiCourrier" timestamp without time zone,
  "old_LivraisonRDVDate" timestamp without time zone,
  "old_LivraisonRDVHeure" timestamp without time zone,
  "old_LivraisonTrimestrePrevueAuContrat" text,
  "old_LivraisonTrimestreDecale" text,
  "old_CDVPromo" text,
  "IDCivilite" integer,
  "Adulte1DateNaissance" timestamp without time zone,
  "Adulte2DateNaissance" timestamp without time zone,
  "InfoPourEntreprise" text,
  "curIDLot" integer,
  "curDateResa" timestamp without time zone,
  "CommuneOrigine" text,
  "DateModifAdresse" timestamp without time zone,
  "IDSituationFamille" integer,
  "PensionEtAutresRevenus" numeric(19,4),
  "LoyerActuel" numeric(19,4),
  "DureeFinancementEnMois" integer,
  "Adulte1LieuDeNaissance" text,
  "Adulte2LieuDeNaissance" text,
  "IDCivilite2" integer,
  "Patronyme2" text,
  "Prenom2" text,
  "NomComplet" text,
  "curDateAnnulation" timestamp without time zone,
  "DescriptionLotCourant" text,
  "Patronyme3" text,
  "Prenom3" text,
  "IDCivilite3" integer,
  "Email2" text,
  "DateCreation" timestamp without time zone,
  "DateModification" timestamp without time zone,
  "RevenusFoyerFiscal" numeric(19,4),
  "AnneeDeDeclaration" integer,
  "NombreAdultes" integer,
  "NombreEnfants" integer,
  "EnfantAVenir" integer,
  "PrixDAchat" numeric(19,4),
  "TauxTVA" real,
  "ApportReelADateHorsSubvention" numeric(19,4),
  "Subvention" numeric(19,4),
  "RevenuNetFoyerMensuel" numeric(19,4)
);
DROP TABLE IF EXISTS "tAcquereurOrigine";
CREATE TABLE "tAcquereurOrigine" (
  "Libelle" text,
  "NumRM" integer,
  "IDAcquereurOrigine" integer
);
DROP TABLE IF EXISTS "tAcquereurPlafondRessources";
CREATE TABLE "tAcquereurPlafondRessources" (
  "IDAcquereurPlafondRessources" integer,
  "Libelle" text,
  "Libelle_ancien" text
);
DROP TABLE IF EXISTS "tAcquereurRevenuFoyerFiscalParQuartile";
CREATE TABLE "tAcquereurRevenuFoyerFiscalParQuartile" (
  "IDAcquereurRevenuFoyerFiscalParQuartile" integer,
  "Libelle" text,
  "BorneMax" integer
);
DROP TABLE IF EXISTS "tAcquereurTrancheAge";
CREATE TABLE "tAcquereurTrancheAge" (
  "IDAcquereurTrancheAge" integer,
  "Libelle" text,
  "BorneMax" integer
);
DROP TABLE IF EXISTS "tAcquereur_ExportErrors";
CREATE TABLE "tAcquereur_ExportErrors" (
  "Champ" text,
  "Erreur" text,
  "Ligne" integer
);
DROP TABLE IF EXISTS "tAcquereur_copie";
CREATE TABLE "tAcquereur_copie" (
  "IDAcquereur" integer,
  "Code" text,
  "Patronyme" text,
  "Civilite" text,
  "Prenom" text,
  "RS" text,
  "NatureJuridique" integer,
  "TypePropriétaire_old" integer,
  "Commentaire" text,
  "PromoGesNom" text,
  "ImportIDLot" integer,
  "ImportDateResa" timestamp without time zone,
  "ImportDatePrevueSignature" timestamp without time zone,
  "ImportDateLivraison" timestamp without time zone,
  "Identifiant" text,
  "N° Lot" text,
  "Typologie" text,
  "Etage" text,
  "surface" text,
  "Téléphone" text,
  "Portable" text,
  "Email" text,
  "AdresseActuelle" text,
  "CPActuel" text,
  "Communeactuelle" text,
  "IDTypeLogementActuel" integer,
  "RevenusFoyerFiscal" text,
  "IDAcquereurRevenuFoyerFiscalParQuartile" integer,
  "AnneeDeDeclaration_old" text,
  "NombreAdultes" text,
  "NombreEnfants" text,
  "EnfantAVenir" text,
  "IDAcquereurPlafondRessources" integer,
  "PrixDAchat" text,
  "TauxTVA" text,
  "ApportReelADateHorsSubvention" text,
  "Subvention" text,
  "DateDeReservation" text,
  "Date  signature de contrat de loc acc" text,
  "Date de transfert de propriété" text,
  "Adresse programme" text,
  "CP programme" text,
  "Ville programme" text,
  "Nom programme" text,
  "Type de programme" text,
  "Co-propriété" text,
  "Zone ANRU" text,
  "Type d'acquisition" text,
  "PrimoAccedant" text,
  "Modifications" text,
  "ReservesDE" text,
  "Date prévisionnelle livraison" text,
  "Date réelle livraison" text,
  "IDAcquereurTrancheAge" integer,
  "Etape" text,
  "IDConseillerCommercial" integer,
  "IDConseillerTechnique" integer,
  "EnqueteA" text,
  "EnqueteB" text,
  "EnqueteC" text,
  "SituationFamiliale" integer,
  "Adulte1Age" integer,
  "Adulte2Age" integer,
  "Adulte1CSP" integer,
  "Adulte2CSP" integer,
  "Adulte1Metier" text,
  "Adulte2Metier" text,
  "Adulte1CommuneTravail" text,
  "Adulte2CommuneTravail" text,
  "TypeDeMenage" integer,
  "AgeEnfant1" integer,
  "AgeEnfant2" integer,
  "AgeEnfant3" integer,
  "AgeEnfant4" integer,
  "AgeEnfant5" integer,
  "RevenuNetFoyerMensuel" text,
  "MultiAccedant" boolean,
  "RevenusNetImposableNMoins1" numeric(19,4),
  "Telephone_old" text,
  "TelPortable_old" text,
  "EstPTZ" boolean,
  "MensualiteDuFinancementClient" numeric(19,4),
  "TauxEffort" real,
  "old_CourrierInfoDemarrageDateEnvoiCourrier" timestamp without time zone,
  "old_PlanTechniqueDateEnvoiCourrier" timestamp without time zone,
  "old_TMA" boolean,
  "old_TMADateEnvoiCourrier" timestamp without time zone,
  "old_TMAMontantOuvertureDossier" numeric(19,4),
  "old_TMAMontantAcompte" numeric(19,4),
  "old_TMAMontantSolde" numeric(19,4),
  "old_TMACommentaire" text,
  "old_ChoixMateriauxDateEnvoiCourrier" timestamp without time zone,
  "old_ChoixMateriauxDateChoixValide" timestamp without time zone,
  "old_PlacoDateEnvoiCourrier" timestamp without time zone,
  "old_PlacoRDVDate" timestamp without time zone,
  "old_PlacoRDVHeure" timestamp without time zone,
  "old_QuinzaineLivraisonDateEnvoiCourrier" timestamp without time zone,
  "old_QuinzaineLivraisonPeriode" text,
  "old_PreviLivraisionDateEnvoiCourrier" timestamp without time zone,
  "old_PreviLivraisionRDVDate" timestamp without time zone,
  "old_PreviLivraisionRDVHeure" timestamp without time zone,
  "old_LivraisonDateEnvoiCourrier" timestamp without time zone,
  "old_LivraisonRDVDate" timestamp without time zone,
  "old_LivraisonRDVHeure" timestamp without time zone,
  "old_LivraisonTrimestrePrevueAuContrat" text,
  "old_LivraisonTrimestreDecale" text,
  "old_CDVPromo" text,
  "IDCivilite" integer,
  "Adulte1DateNaissance" timestamp without time zone,
  "Adulte2DateNaissance" timestamp without time zone,
  "InfoPourEntreprise" text,
  "curIDLot" integer,
  "curDateResa" timestamp without time zone,
  "CommuneOrigine" text,
  "DateModifAdresse" timestamp without time zone,
  "IDSituationFamille" integer,
  "PensionEtAutresRevenus" numeric(19,4),
  "LoyerActuel" numeric(19,4),
  "DureeFinancementEnMois" integer,
  "Adulte1LieuDeNaissance" text,
  "Adulte2LieuDeNaissance" text,
  "IDCivilite2" integer,
  "Patronyme2" text,
  "Prenom2" text,
  "NomComplet" text,
  "curDateAnnulation" timestamp without time zone,
  "DescriptionLotCourant" text,
  "Patronyme3" text,
  "Prenom3" text,
  "IDCivilite3" integer,
  "Email2" text,
  "DateCreation" timestamp without time zone,
  "DateModification" timestamp without time zone,
  "AnneeDeDeclaration" integer
);
DROP TABLE IF EXISTS "tArchi_Operation";
CREATE TABLE "tArchi_Operation" (
  "IDArchitecte" integer,
  "IDOperation" integer,
  "Commentaire" text,
  "IDArchi_Operation" integer
);
DROP TABLE IF EXISTS "tArchitecte";
CREATE TABLE "tArchitecte" (
  "RS" text,
  "Commentaires" text,
  "Commune" text,
  "IDArchitecte" integer
);
DROP TABLE IF EXISTS "tAssocie";
CREATE TABLE "tAssocie" (
  "RS" text,
  "FormeJuridique" text,
  "SIREN" text,
  "Adresse1" text,
  "Adresse2" text,
  "CP" text,
  "Commune" text,
  "Tel" text,
  "EstHLM" boolean,
  "ContactNomComplet" text,
  "ContactFonction" text,
  "EMail" text,
  "Commentaire" text,
  "IDAssocie" integer
);
DROP TABLE IF EXISTS "tAssuranceDoMrH";
CREATE TABLE "tAssuranceDoMrH" (
  "NumContrat" text,
  "TypeContrat" text,
  "DateSouscription" timestamp without time zone,
  "DateDGD" timestamp without time zone,
  "DateResiliation" timestamp without time zone,
  "AccordCadre" text,
  "CoutOperation" numeric(19,4),
  "MontantCotisation" numeric(19,4),
  "Commentaire" text,
  "IDTranche" integer,
  "SurOpe" boolean,
  "IDOperation_old" integer,
  "DateFinTRC" timestamp without time zone,
  "IDAssuranceDoMrH" integer
);
DROP TABLE IF EXISTS "tAssurancePNO";
CREATE TABLE "tAssurancePNO" (
  "IDAssurancePNO" integer,
  "NumContrat" text,
  "TypeContrat" text,
  "DateSouscription" timestamp without time zone,
  "DateEcheance" timestamp without time zone,
  "DateResiliation" timestamp without time zone,
  "MontantCotisation" numeric(24,6),
  "IDLot" integer,
  "Commentaire" text
);
DROP TABLE IF EXISTS "tBanque";
CREATE TABLE "tBanque" (
  "Libelle" text,
  "CCNom" text,
  "CCAdresse" text,
  "CCTel" text,
  "CCEMail" text,
  "PretNom" text,
  "PretAdresse" text,
  "PretTel" text,
  "PretEMail" text,
  "CCCP" text,
  "CCCommune" text,
  "PretCP" text,
  "PretCommune" text,
  "IDBanque" integer
);
DROP TABLE IF EXISTS "tBilan_CAHT";
CREATE TABLE "tBilan_CAHT" (
  "IDBilanCAHT" integer,
  "IDStructureJuridique" integer,
  "Annee" integer,
  "CAHT_VEFA" double precision,
  "CAHT_LV_PSLA" double precision,
  "CAHT_Loyers" double precision,
  "CAHT_TMA" double precision,
  "CAHT_Terrain" double precision,
  "CAHT_Autres" double precision,
  "CAHT_Commentaire" text,
  "NbLot_VEFA" integer,
  "NbLot_LV_PSLA" integer,
  "NbLot_Autre" integer,
  "NbLot_Commentaire" text,
  "IDBilan_CAHT" integer
);
DROP TABLE IF EXISTS "tBilan_CAHT_VEFA";
CREATE TABLE "tBilan_CAHT_VEFA" (
  "IDBilanCAHTVEFA" integer,
  "CAHT_VEFA_InfPlafond" double precision,
  "CAHT_VEFA_SupPlafond" double precision,
  "CAHT_VEFA_InvestPM" double precision,
  "Nb_VEFA_InfPlafond" integer,
  "Nb_VEFA_SupPlafond" integer,
  "Nb_VEFA_InvestPM" integer,
  "IDBilanCAHT" integer
);
DROP TABLE IF EXISTS "tBilan_Resultat";
CREATE TABLE "tBilan_Resultat" (
  "IDBilanResultat" integer,
  "IDStructureJuridique" integer,
  "Annee" integer,
  "RAN_SCCV" real,
  "CpteCourant_SCCV" double precision,
  "ReintegrationFiscale_SCCV" double precision,
  "DeductionFiscale_SCCV" double precision,
  "ReintegrationFiscaleComm" text,
  "DeductionFiscaleCOmm" text,
  "ReintHF_ResultFiscal" double precision,
  "DeducHF_PerteFiscale" double precision,
  "PourcHFAnnee" double precision,
  "DatePVAG" timestamp without time zone,
  "ResultFisca_SCCV_IS" double precision,
  "ResultFisca_SCCV_NonIS" double precision,
  "ReintHF_PerteComptable" double precision,
  "DeducHF_ResultComptable" double precision,
  "CommentairePourcHF" text,
  "ResultCpta_SCCV_IS" real,
  "ResultCpta_SCCV_NonIS" real,
  "ResultCpta_SCCV_Total" double precision,
  "QuotePartHF_ResultCpta_IS_old" real,
  "QuotePartHF_ResultCpta_NonIS_old" real,
  "QuotePartHF_ResultCpta_Total_old" real,
  "QuotePartHF_RAN_Total" real,
  "QuotePartHF_RAN_IS" real,
  "QuotePartHF_RAN_NonIS" real,
  "ResultAcompteMontant" numeric(19,4),
  "ResultAcompteDateVersement" timestamp without time zone,
  "RAN_SCCV_IS" numeric(19,4),
  "RAN_SCCV_NonIS" numeric(19,4),
  "RAN_SCCV_Total" numeric(19,4),
  "IDBilan_Resultat" integer
);
DROP TABLE IF EXISTS "tBilan_Stock";
CREATE TABLE "tBilan_Stock" (
  "IDBilanStock" integer,
  "IDStructureJuridique" integer,
  "Annee" integer,
  "StockTotalDebit33a35" double precision,
  "StockTotalCredit33a35" double precision,
  "StockCredit713300" double precision,
  "StockPSLAPhaseLocNb" integer,
  "StockPSLAPhaseLocCout" double precision,
  "StockInvenduNb" integer,
  "StockInvenduCout" double precision,
  "IDBilan_Stock" integer
);
DROP TABLE IF EXISTS "tBudget";
CREATE TABLE "tBudget" (
  "IDListeBudget" integer,
  "DateValidation" timestamp without time zone,
  "Commentaire" text,
  "IDTranche" integer,
  "SurOpe" boolean,
  "IDOperation_old" integer,
  "DateSaisiePromoges" timestamp without time zone,
  "IDBudget" integer
);
DROP TABLE IF EXISTS "tCategorieSubvention";
CREATE TABLE "tCategorieSubvention" (
  "IDCategorieSubvention" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tCategorieSubvention-23062026";
CREATE TABLE "tCategorieSubvention-23062026" (
  "IDCategorieSubvention" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tCivilite";
CREATE TABLE "tCivilite" (
  "Libelle" text,
  "LibelleCourt" text,
  "Client" text,
  "IDCivilite" integer
);
DROP TABLE IF EXISTS "tCommVendeur";
CREATE TABLE "tCommVendeur" (
  "IDLot" integer,
  "IDCommercial" integer,
  "Pourcentage" real,
  "Evenement" integer,
  "DateRglt" timestamp without time zone,
  "Commentaire" text,
  "MntCommVendeur" numeric(19,4),
  "TxCommVendeur" double precision,
  "IDCommercialisation" integer,
  "DateValidation" timestamp without time zone,
  "IDCommVendeur" integer
);
DROP TABLE IF EXISTS "tCommercial";
CREATE TABLE "tCommercial" (
  "Denomination" text,
  "Prenom" text,
  "Initiales" text,
  "EMail" text,
  "Societe" text,
  "Fonction" text,
  "IDCommercial" integer
);
DROP TABLE IF EXISTS "tCommercialisation";
CREATE TABLE "tCommercialisation" (
  "IDCommercialisation" integer,
  "IDLot" integer,
  "IDAcquereur" integer,
  "DateResa" timestamp without time zone,
  "DateSignatureContratLoc" timestamp without time zone,
  "DateSignatureActeVEFA" timestamp without time zone,
  "DateLivraison" timestamp without time zone,
  "DateLeveeOption" timestamp without time zone,
  "DateAnnulation" timestamp without time zone,
  "PrestataireCommercialisation" integer,
  "PromoGesNom" text,
  "DatePrevueSignatureActe" timestamp without time zone,
  "PrestataireComm1" integer,
  "PrestataireComm2" integer,
  "TauxCommResa" real,
  "TauxCommActe" real,
  "CommVendeurAVerserResa" numeric(19,4),
  "CommVendeurAVerserActe" numeric(19,4),
  "IDListeTypeAcquereur" integer,
  "PasAideRM" boolean,
  "MontantSubv" numeric(19,4),
  "MotifAnnulation" text,
  "DateSignatureComm" text,
  "EstFiscalite" boolean,
  "IDFiscaliteAcquereur" integer,
  "CommFisca" text,
  "EstJustifFiscal" boolean,
  "Loyer" numeric(19,4),
  "Epargne" numeric(19,4),
  "IDNatureAchat" integer,
  "CourrierInfoDemarrageDateEnvoiCourrier" timestamp without time zone,
  "PlanTechniqueDateEnvoiCourrier" timestamp without time zone,
  "ChoixMateriauxDateEnvoiCourrier" timestamp without time zone,
  "ChoixMateriauxDateChoixValide" timestamp without time zone,
  "PlacoDateEnvoiCourrier" timestamp without time zone,
  "PlacoRDVDate" timestamp without time zone,
  "PlacoRDVHeure" timestamp without time zone,
  "QuinzaineLivraisonDateEnvoiCourrier_old" timestamp without time zone,
  "QuinzaineLivraisonPeriode_old" text,
  "PreviLivraisionDateEnvoiCourrier_old" timestamp without time zone,
  "PreviLivraisionRDVDate_old" timestamp without time zone,
  "PreviLivraisionRDVHeure_old" timestamp without time zone,
  "LivraisonDateEnvoiCourrier" timestamp without time zone,
  "LivraisonRDVDate" timestamp without time zone,
  "LivraisonRDVHeure" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" text,
  "LivraisonTrimestreDecale" text,
  "CDVPromo" text,
  "TMADateEnvoiCourrier" timestamp without time zone,
  "TMAMontantOuvertureDossier" numeric(19,4),
  "TMACommentaire" text,
  "TMADatePaiementSolde" timestamp without time zone,
  "TMAMailingListeDevis" text,
  "TMAMailingSolde" text,
  "DateEtatSortieLieux" timestamp without time zone,
  "AnnulationCommentaire" text,
  "DateResiliationContratLoc" timestamp without time zone,
  "MontantDepotGarantie" real,
  "curNbCommVendeur" integer,
  "MontantSubvAcpte" numeric(19,4),
  "SoldeDemande" boolean,
  "PrixDeVenteReelTTC" numeric(19,4),
  "TauxTVAReel" real,
  "RemiseClientTTC" numeric(19,4),
  "PrixDeVenteReelTTC_old" numeric(19,4),
  "PrixDeVenteReelHT" numeric(19,4),
  "NbTMA" integer,
  "TMA_PMR_Montant" numeric(19,4),
  "CDVTechnique" text,
  "AvecTMA" boolean,
  "TroisMoisAvantLivraisonDateEnvoiCourrier" timestamp without time zone,
  "TroisMoisAvantLivraisonPeriode" text,
  "TMA_PMR_ContratSigne" boolean,
  "TMA_PMR_DateRemisNotaireContratEtPlanVEFA" timestamp without time zone,
  "DateDemandeAgrement" timestamp without time zone,
  "DateAgrementObtenuEtEnvoiNotaire" timestamp without time zone,
  "DateReceptionCourrierLVO" timestamp without time zone,
  "AvecHonoraireCourtage" boolean,
  "MontantHonoraireCourtageClient" numeric(19,4),
  "MontantHonoraireCourtageBanque" numeric(19,4),
  "IDBanqueCourtage" integer,
  "AvecSouscriptionCapitalKPI" boolean,
  "DateSouscription" timestamp without time zone,
  "IDMoyenDePaiement" integer,
  "PasDeSouscriptionAuCapital" boolean,
  "CommentairesSouscription" text,
  "AvecClauseParticuliereComm" integer,
  "IDMotifClauseParticuliereComm" integer,
  "CommentaireClauseParticuliereComm" text,
  "DatePreviActabilite" timestamp without time zone,
  "EstReventeBien" integer,
  "DateButoirRevente" timestamp without time zone,
  "IDMotifAnnulation" integer
);
DROP TABLE IF EXISTS "tCompteBanque";
CREATE TABLE "tCompteBanque" (
  "IDBanque" integer,
  "IDTypeCompteBanque" integer,
  "IDUtilisationCompte" integer,
  "NumCompte" text,
  "IBAN" text,
  "BIC" text,
  "EstCloture" boolean,
  "Commentaires" text,
  "IDStructureJuridique" integer,
  "IDCompteBanque" integer
);
DROP TABLE IF EXISTS "tCompteBanque_old";
CREATE TABLE "tCompteBanque_old" (
  "IDBanque" integer,
  "IDTypeCompteBanque" integer,
  "IDUtilisationCompte" integer,
  "NumCompte" text,
  "IBAN" text,
  "BIC" text,
  "EstCloture" boolean,
  "Commentaires" text,
  "IDStructureJuridique" integer,
  "IDCompteBanque" integer
);
DROP TABLE IF EXISTS "tConcept";
CREATE TABLE "tConcept" (
  "Libelle" text,
  "IDArchitecte" integer,
  "Commentaire" text,
  "IDConcept" integer
);
DROP TABLE IF EXISTS "tDeblocagePSLA";
CREATE TABLE "tDeblocagePSLA" (
  "IDDeblocageFinancement" integer,
  "IDFinancement" integer,
  "IDPSLA" integer,
  "Numero" integer,
  "Montant" numeric(19,4),
  "DateDemande" timestamp without time zone,
  "DateVersement" timestamp without time zone,
  "Commentaire" text,
  "IDDeblocagePSLA" integer
);
DROP TABLE IF EXISTS "tDeblocageSubvention";
CREATE TABLE "tDeblocageSubvention" (
  "IDDeblocationSubvention" integer,
  "DateDemande" timestamp without time zone,
  "IDSubvention" integer,
  "Montant" numeric(19,4),
  "DatePaiement" timestamp without time zone,
  "Commentaire" text
);
DROP TABLE IF EXISTS "tDeclaration940";
CREATE TABLE "tDeclaration940" (
  "IDDeclaration940" integer,
  "Dat" timestamp without time zone,
  "StockLogtDAT" integer,
  "DateTvaLASM" timestamp without time zone,
  "IDTranche" integer,
  "SurOpe" boolean,
  "Commentaires" text,
  "FinSuivi" boolean
);
DROP TABLE IF EXISTS "tDestination";
CREATE TABLE "tDestination" (
  "IDDestination" integer,
  "Libelle" text,
  "Commentaire" text,
  "LibelleComm" text
);
DROP TABLE IF EXISTS "tEnqueteClient";
CREATE TABLE "tEnqueteClient" (
  "Identifiant" text,
  "N° Lot" text,
  "Typologie" text,
  "Etage" text,
  "surface" text,
  "Nom Client" text,
  "Prénom Client" text,
  "Téléphone" text,
  "Email Client" text,
  "Adresse actuelle" text,
  "CP Actuel" text,
  "Ville actuelle" text,
  "Origine" text,
  "Revenus foyer fiscal" text,
  "Revenu foyer fiscal par quartile" text,
  "Année de déclaration" text,
  "Nombre d'adulte" text,
  "Nombre d'enfants" text,
  "Enfant à venir" text,
  "Plafond de ressources" text,
  "Prix d'achat" text,
  "Taux TVA" text,
  "apport réel à  date hors subvention" text,
  "Subvention" text,
  "Date de réservation" text,
  "Date  signature de contrat de loc acc" text,
  "Date de transfert de propriété" text,
  "Adresse programme" text,
  "CP programme" text,
  "Ville programme" text,
  "Nom programme" text,
  "Type de programme" text,
  "Co-propriété" text,
  "Zone ANRU" text,
  "Type d'acquisition" text,
  "Primo accedant" text,
  "Modifications" text,
  "Réserves DE" text,
  "Date prévisionnelle livraison" text,
  "Date réelle livraison" text,
  "Age chef de famille" text,
  "Etape" text,
  "Nom Conseiller commercial" text,
  "Email Conseiller Commercial" text,
  "Nom Conseiller Technique" text,
  "Email Conseiller Technique" text,
  "EnquêteA" text,
  "EnquêteB" text,
  "EnquêteC" text
);
DROP TABLE IF EXISTS "tFacture";
CREATE TABLE "tFacture" (
  "IDFacture" integer,
  "NumFacture" integer,
  "DateFacture" timestamp without time zone,
  "Partiel" boolean,
  "MontantHT" numeric(19,4),
  "Commentaire" text,
  "IDStadeAvancement" integer,
  "IDTypeMission" integer,
  "NbMois" integer
);
DROP TABLE IF EXISTS "tFamilleDeBien";
CREATE TABLE "tFamilleDeBien" (
  "IDFamilleDeBien" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tFinancement";
CREATE TABLE "tFinancement" (
  "IDFinancement" integer,
  "IDTranche" integer,
  "IDTypeFinancement" integer,
  "IDBanque" integer,
  "MontantFinancement" numeric(19,4),
  "DateSignature" timestamp without time zone,
  "DateDebutMobilisation" timestamp without time zone,
  "DateFinMobilisation" timestamp without time zone,
  "IndexTaux" integer,
  "MargeBanque" real,
  "CommissionEngagementPourc" double precision,
  "FraisDossier" numeric(19,4),
  "Commentaire" text,
  "NumContrat" text,
  "EstPhaseAmortissement" boolean,
  "SurOpe" boolean,
  "ApportPromoteur" numeric(19,4),
  "IDListeFinPret" integer,
  "DateButoir" timestamp without time zone,
  "PartSocialeMontant" numeric(19,4),
  "IDListeStatutPartSociale" integer,
  "DateStatutPartSociale" timestamp without time zone,
  "EstSolde" boolean,
  "MontantPrevi" numeric(19,4),
  "InfosPretprevi" text,
  "DateEnvoiDossier" timestamp without time zone,
  "ContratMontant" numeric(19,4),
  "ContratNbLogt" integer,
  "DateDebutEcheance" timestamp without time zone,
  "DateFinEcheance" timestamp without time zone,
  "TauxPret" real,
  "MontantEcheance" numeric(19,4),
  "IDActionAlerte_old" integer,
  "FinancementSolde_old" boolean,
  "CommissionEngagementMontant_old" numeric(19,4),
  "DureeMoisMobPSLA" integer,
  "Periodicite" text,
  "DateVerstPret" timestamp without time zone,
  "PrevMtOC" integer,
  "IDActionAlerte" integer,
  "EstPrlvFraisDossier" boolean,
  "HFCautionOC" boolean,
  "BlocageHonoOCMontant" numeric(19,4),
  "BlocageHonoOCFin" text,
  "BlocageHonoOCComment" text,
  "EstHFCautionOC" boolean,
  "PretEmployeurNumeroModifEcheance" integer,
  "PretEmployeurDateDebutAmort" timestamp without time zone,
  "IndexTauxFloore" boolean,
  "IDStatutApport" integer,
  "IDMandatHypothequer" integer,
  "MandatCoutMontant" numeric(19,4),
  "IDStatutCoutMandat" integer,
  "EstAmortDiffére" boolean,
  "AmortissementDiffereDuree" real,
  "AmortissementDiffereFinDate" timestamp without time zone
);
DROP TABLE IF EXISTS "tFonction";
CREATE TABLE "tFonction" (
  "IDFonction" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tGFA";
CREATE TABLE "tGFA" (
  "IDGFA" integer,
  "IDTranche" integer,
  "SurOpe" boolean,
  "EstIntrinseque" boolean,
  "DateValidation" timestamp without time zone,
  "Commentaires" text,
  "IDBanque" integer,
  "DateDossierGFA" timestamp without time zone,
  "DateAccord" timestamp without time zone,
  "DateAttestation" timestamp without time zone,
  "Taux" real,
  "CommissionCautionMontant" numeric(19,4),
  "FraisDossier" numeric(19,4),
  "FondsGarantieMt" numeric(19,4),
  "FondsGarantieDateDemandeRemb" timestamp without time zone,
  "FondsGarantieDateRemb" timestamp without time zone,
  "FinGFA" boolean,
  "PrecomGFAPourc" real,
  "CATTCminGFA" numeric(19,4),
  "CommCondGFA" text,
  "EnvoiAttesNotaire_old" boolean,
  "PartSocialeMt" numeric(19,4),
  "PartSocialeDateDemandeRemb" timestamp without time zone,
  "PartSocialeDateRemb" timestamp without time zone,
  "ActionFinGFADate" timestamp without time zone,
  "IDActionFinGFAType" integer,
  "HFCautionGFA" boolean,
  "IDPeriodeTauxGFA" integer,
  "DureeMoisGFA" smallint,
  "CommGFA" text,
  "BaseInitialeGFA" numeric(19,4),
  "DatePremierPrlevtGFA" timestamp without time zone,
  "ApportPromoteurGFA" numeric(19,4),
  "IDStatutApportPromoteurGFA" integer,
  "PartSocialeComm" text
);
DROP TABLE IF EXISTS "tGrilleFacturation";
CREATE TABLE "tGrilleFacturation" (
  "IDGrilleFacturation" integer,
  "IDStadeAvancement" integer,
  "Pourcentage" real,
  "Montant" numeric(19,4),
  "IDMission" integer
);
DROP TABLE IF EXISTS "tGrilleHonoCom";
CREATE TABLE "tGrilleHonoCom" (
  "IDGrilleHonoCom" integer,
  "Evenement" text,
  "Pourcentage" double precision,
  "IDCommercialisation" integer,
  "Commentaire" text
);
DROP TABLE IF EXISTS "tGrilleHonoGestion";
CREATE TABLE "tGrilleHonoGestion" (
  "IDGrilleHonoGestion" integer,
  "IDListeAvancement" integer,
  "Pourcentage" double precision,
  "IDTypeMission" integer,
  "AvecHonoGestion" boolean,
  "AvecAppelFondClient" boolean
);
DROP TABLE IF EXISTS "tHonoCommHFFacture";
CREATE TABLE "tHonoCommHFFacture" (
  "IDHonoCommHFFacture" integer,
  "IDTranche" integer,
  "NumFacture" integer,
  "DateFacture" timestamp without time zone,
  "NbResa" integer,
  "NbCLA" integer,
  "NbActe" integer,
  "MontantResa" double precision,
  "MontantCLA" double precision,
  "MontantActe" double precision,
  "NbLeveeOption" integer,
  "MontantLeveeOption" double precision,
  "NbResaFiscalise_old" integer,
  "NbActeFiscalise_old" integer,
  "MontantResaFiscalise_old" double precision,
  "MontantActeFiscalise_old" double precision,
  "Commentaires" text,
  "NbResaAide_old" integer,
  "NbActeAide_old" integer,
  "MontantResaAide_old" double precision,
  "MontantActeAide_old" double precision,
  "IDBaremeHonoComm" integer,
  "IDPrestataire" integer
);
DROP TABLE IF EXISTS "tHonoCommHFNatureAchat";
CREATE TABLE "tHonoCommHFNatureAchat" (
  "IDHonoCommHFNatureAchat" integer,
  "IDNatureAchat" integer,
  "IDTranche" integer,
  "MontantResa" double precision,
  "MontantCLA" double precision,
  "MontantActe" double precision,
  "MontantLeveeOption" double precision,
  "Commentaires" text,
  "PourcentageResa" real,
  "PourcentageActe" real
);
DROP TABLE IF EXISTS "tIndextaux";
CREATE TABLE "tIndextaux" (
  "IDIndextaux" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeActionAlerte";
CREATE TABLE "tListeActionAlerte" (
  "IDActionAlerte" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeAvancement";
CREATE TABLE "tListeAvancement" (
  "IDListeAvancement" integer,
  "Domaine" text,
  "Code" text,
  "Libelle" text,
  "LibelleMission" text,
  "AvecHonoGestion" boolean,
  "AvecAppelFondClient" boolean,
  "AvecEquivLgt" boolean,
  "Ordre" integer,
  "PourcentageStandard" real,
  "PlanningTxt" text,
  "CouleurJalonFond" integer,
  "CouleurJalonPolice" integer,
  "PourcentageAvancement" real,
  "GanttAffiche" boolean,
  "GanttJalon" boolean,
  "GanttDureeDepuisStade" integer,
  "CouleurPeriodeFond" integer,
  "CouleurPeriodePolice" integer,
  "GanttDureeJusquaStade" integer,
  "AvecArchive" boolean,
  "AvecSuivi" boolean,
  "AvecSynchroEntreTranche" boolean,
  "NePasDecalerAuto" boolean,
  "DatePreviPromoAuto_IDListeAvancement" integer,
  "DatePreviPromoAuto_QteDecalage" integer,
  "DatePreviPromoAuto_IDDecalageUniteTemps" integer,
  "DatePreviObjectifAuto_DecalageMoisPreviPromo" integer,
  "InclureQuandCreationTranche" boolean,
  "IDDomaineStadeAvancement" integer
);
DROP TABLE IF EXISTS "tListeAvancement_old";
CREATE TABLE "tListeAvancement_old" (
  "IDListeAvancement" integer,
  "Domaine" text,
  "Code" text,
  "Libelle" text,
  "LibelleMission" text,
  "AvecHonoGestion" boolean,
  "AvecAppelFondClient" boolean,
  "AvecEquivLgt" boolean,
  "Ordre" integer,
  "PourcentageStandard" real,
  "PlanningTxt" text,
  "PlanningCouleurFond" integer,
  "PlanningCouleurPolice" integer,
  "PourcentageAvancement" real
);
DROP TABLE IF EXISTS "tListeBudget";
CREATE TABLE "tListeBudget" (
  "IDListeBudget" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeFinPret";
CREATE TABLE "tListeFinPret" (
  "IDFinPret" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeFiscaliteAcquereur";
CREATE TABLE "tListeFiscaliteAcquereur" (
  "IDFiscaliteAcquereur" integer,
  "Libelle" text,
  "LibelleCourt" text
);
DROP TABLE IF EXISTS "tListeModeRepartQuotePart";
CREATE TABLE "tListeModeRepartQuotePart" (
  "IDModeRepartQuotePart" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeNatureAchat";
CREATE TABLE "tListeNatureAchat" (
  "IDNatureAchat" integer,
  "Libelle" text,
  "LibelleLong" text,
  "OrdreComm" integer
);
DROP TABLE IF EXISTS "tListeOrganismeAgrement";
CREATE TABLE "tListeOrganismeAgrement" (
  "IDOrganismeAgrement" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeOrganismeGarantieEmprunt";
CREATE TABLE "tListeOrganismeGarantieEmprunt" (
  "IDOrganismeGarantieEmprunt" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListePhaseMontagePSLA";
CREATE TABLE "tListePhaseMontagePSLA" (
  "IDListePhaseMontagePSLA" integer,
  "Libelle" text,
  "Code" text
);
DROP TABLE IF EXISTS "tListePrestataire";
CREATE TABLE "tListePrestataire" (
  "IDPrestataire" integer,
  "Libelle" text,
  "AfficherMission" boolean,
  "AfficherOperation" boolean,
  "MasquerComm1" boolean,
  "MasquerComm2" boolean
);
DROP TABLE IF EXISTS "tListeSituation";
CREATE TABLE "tListeSituation" (
  "IDSituation" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeStatutPartSociale";
CREATE TABLE "tListeStatutPartSociale" (
  "IDStatutPartSociale" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeTypeAcquereur";
CREATE TABLE "tListeTypeAcquereur" (
  "IDListeTypeAcquereur" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeTypeBien";
CREATE TABLE "tListeTypeBien" (
  "IDTypeDeBien" integer,
  "Libelle" text,
  "IDFamilleDeBien" integer
);
DROP TABLE IF EXISTS "tListeTypeCompteBanque";
CREATE TABLE "tListeTypeCompteBanque" (
  "IDTypeCompteBanque" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeTypeEvenement";
CREATE TABLE "tListeTypeEvenement" (
  "IDListeTypeEvenement" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListeTypeFinancement";
CREATE TABLE "tListeTypeFinancement" (
  "IDTypeFinancement" integer,
  "Libelle" text,
  "Categorie" text
);
DROP TABLE IF EXISTS "tListeTypeMission";
CREATE TABLE "tListeTypeMission" (
  "IDTypeMission" integer,
  "Libelle" text,
  "CoPromotion" boolean
);
DROP TABLE IF EXISTS "tListeTypePropriétaire";
CREATE TABLE "tListeTypePropriétaire" (
  "IDListeTypePropriétaire" integer,
  "Libelle" text,
  "EstInvestisseur" boolean
);
DROP TABLE IF EXISTS "tListeUtilisationCompte";
CREATE TABLE "tListeUtilisationCompte" (
  "IDUtilisationCompte" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tListetauxTVA";
CREATE TABLE "tListetauxTVA" (
  "Taux" real,
  "PlusEnVigueur" boolean
);
DROP TABLE IF EXISTS "tLot";
CREATE TABLE "tLot" (
  "IDlot" integer,
  "IDTranche" integer,
  "IDDestination" integer,
  "Numlot" text,
  "LotAssocie" text,
  "FamilleDeBien" text,
  "TypeDeBien" text,
  "Commentaire" text,
  "SurfHabitable" double precision,
  "SurfTerrasse" double precision,
  "SurfGarage" double precision,
  "SurfCave" double precision,
  "SurfBalcon" double precision,
  "SurfLoggias" double precision,
  "SurfRemise" double precision,
  "SurfJardin" double precision,
  "SurfTerrain" double precision,
  "NumEtage" text,
  "Exposition" text,
  "NumParcelle" text,
  "NumCopropriete" text,
  "Tantiemes" double precision,
  "PrixOrigine" double precision,
  "PrixDeVenteHT" double precision,
  "PrixDeVenteTTC" double precision,
  "TVA" text,
  "GrilleStatut" text,
  "PrixM2" double precision,
  "Grille Acquéreur - code" text,
  "Grille Acquéreur - nom" text,
  "Grille Date dépôt de prêt" timestamp without time zone,
  "Grille Date prévue accord de prêt" timestamp without time zone,
  "Grille Date accord de prêt" timestamp without time zone,
  "Grille Date réservation" timestamp without time zone,
  "Grille Date procuration" timestamp without time zone,
  "Grille Date prévue signature" timestamp without time zone,
  "Grille Date RDV acte" timestamp without time zone,
  "Grille Date signature" timestamp without time zone,
  "Grille Date prévue livraison" timestamp without time zone,
  "Grille Date livraison" timestamp without time zone,
  "Grille Commercial" text,
  "Grille Pct comm" double precision,
  "Grille Mnt Comm" double precision,
  "Notes" text,
  "MontantHonoCom" numeric(19,4),
  "Commercial" text,
  "IDCommercial" integer,
  "IDAcquereur" integer,
  "TauxCommResa" real,
  "TauxCommActe" real,
  "CommVendeurAVerserResa" numeric(19,4),
  "CommVendeurAVerserActe" numeric(19,4),
  "Adresse" text,
  "LocatairePatronyme" text,
  "LocatairePrenom" text,
  "LocataireCivilite" text,
  "LocataireTelephone" text,
  "LocatairePortable" text,
  "DateLivraison_old" timestamp without time zone,
  "PDL" text,
  "PCE" text,
  "DateLivraisonSCCV" timestamp without time zone,
  "curIDAcquereur" integer,
  "curDateResa" timestamp without time zone,
  "curIDNatureAchat" integer,
  "curIDCommercialisation" integer,
  "curPrixDeVenteReelTTC" numeric(19,4),
  "curTauxTVAReel" real,
  "PrixDeVenteReelHT_old" real,
  "curRemiseClientTTC" numeric(19,4),
  "curPrixDeVenteReelHT" numeric(19,4),
  "EstPartieCommune" boolean,
  "NbTMA" integer,
  "curDateLivraison" timestamp without time zone,
  "EstVenteAcheve" boolean,
  "Designation" text,
  "SurfaceUtile" real,
  "DescriptionAcquereurCourant" text
);
DROP TABLE IF EXISTS "tMission";
CREATE TABLE "tMission" (
  "IDMission" integer,
  "IDTranche" integer,
  "DateConvention" timestamp without time zone,
  "BaseHonoUnitaireHT" numeric(19,4),
  "BaseHonoHT" numeric(19,4),
  "IDTypeMission" integer,
  "FinFacturation" boolean,
  "Commentaire" text,
  "Ordre" integer,
  "NbMois" integer,
  "GrilleSpecifique" boolean,
  "PourCoPromotion" boolean,
  "PourPromotion" boolean,
  "NbLogement" integer,
  "IDPrestataire" integer,
  "DateFactCommKPI_Ext_ContratOFS" date
);
DROP TABLE IF EXISTS "tMission2";
CREATE TABLE "tMission2" (
  "IDMission" integer,
  "IDTranche" integer,
  "DateConvention" timestamp without time zone,
  "BaseHonoUnitaireHT" numeric(19,4),
  "BaseHonoHT" numeric(19,4),
  "IDTypeMission" integer,
  "FinFacturation" boolean,
  "Commentaire" text,
  "Ordre" integer,
  "NbMois" integer,
  "GrilleSpecifique" boolean,
  "PourCoPromotion" boolean,
  "PourPromotion" boolean,
  "NbLogement" integer,
  "IDPrestataire" integer
);
DROP TABLE IF EXISTS "tOperation";
CREATE TABLE "tOperation" (
  "IDOperation" integer,
  "IDStructureJuridique" integer,
  "Libelle" text,
  "CP" text,
  "Commune" text,
  "SurRennesMetropole" boolean,
  "ANRU" boolean,
  "Commentaire" text,
  "AnneeDGD" integer,
  "MasquerCommercial" boolean,
  "MasquerComptable" boolean,
  "IndivColl" integer,
  "Adresse" text,
  "NomZAC" text,
  "DureeChantierMois_old" integer,
  "MasquerPromo" boolean,
  "curIDPersonne_ChargeOpe1" integer,
  "curIDPersonne_ChargeOpe2" integer,
  "curNbLot" integer,
  "curNbTranche" integer,
  "curPourcentageHF" real,
  "curIDAssocieHorsHF" integer,
  "IDCertification" integer,
  "IDLabel" integer,
  "IDPerformanceEnergetique" integer,
  "EstMOEInterne" boolean,
  "IDMissionMOEInterne" integer,
  "ANRUComment" text,
  "AvecAlerte" boolean,
  "IDSecteurGeographiqueDeveloppement" integer,
  "IDInterlocuteurNotaire_Notaire_Foncier" integer,
  "IDInterlocuteurNotaire_Notaire_Vente" integer,
  "AbreviationPourCodeReserve" text,
  "IDPersonne_Assistante" integer,
  "IDTypeFoncier" integer,
  "DateValidationEngagement" timestamp without time zone,
  "SynchroniserDatesEntreTranche" boolean,
  "DateAbandon" timestamp without time zone,
  "CommentairesAbandon" text,
  "PossibiliteInvestisseur" boolean,
  "TauxInvestisseurAutorise" real,
  "CommentaireInvestisseur" text,
  "IDInterlocuteurNotaire_Clerc_Foncier" integer,
  "IDInterlocuteurNotaire_Clerc_Vente" integer,
  "IDApporteurFoncier" integer,
  "PourcentageKPI" real
);
DROP TABLE IF EXISTS "tOperation_ChargeOpe";
CREATE TABLE "tOperation_ChargeOpe" (
  "IDOperation_ChargeOpe" integer,
  "IDPersonne" integer,
  "IDOperation" integer,
  "Jusquau" timestamp without time zone
);
DROP TABLE IF EXISTS "tPSLA";
CREATE TABLE "tPSLA" (
  "IDPSLA" integer,
  "DateAgrementProvisoire" timestamp without time zone,
  "NumAgrement" text,
  "CoutTotal" numeric(19,4),
  "MontantPSLA" numeric(19,4),
  "IDBanque" integer,
  "OrganismeGarantieEmprunt" integer,
  "DateDeliberationGarantie" timestamp without time zone,
  "IDTranche" integer,
  "GarantieEmpruntActionDate" timestamp without time zone,
  "old_GarantieEmpruntActionType" text,
  "Commentaire" text,
  "NbLogtAgrement" integer,
  "DateSignatureGarant" timestamp without time zone,
  "DateInfoAnnuelle" timestamp without time zone,
  "DateInfoFin" timestamp without time zone,
  "Commemtaires" text,
  "BanqueActionDate" timestamp without time zone,
  "old_BanqueActionType" text,
  "old_ActionDestinataire" text,
  "old_DateDepotDossierAgrement" timestamp without time zone,
  "old_DateSignaturePretSCCV" timestamp without time zone,
  "old_DateEnvoiPretGarant" timestamp without time zone,
  "old_IDPhaseMontagePSLA" integer,
  "old_PSLACoutRevientAgrement" numeric(19,4),
  "old_PSLADateDepotDdeAgrement" timestamp without time zone,
  "old_IDFinancement" integer,
  "OrganismeAgrément" integer,
  "PreviAgrement" timestamp without time zone,
  "DateDepotDossierAgrement" timestamp without time zone,
  "DateReceptionAgrement" timestamp without time zone,
  "DateDecisionAgrement" timestamp without time zone,
  "DateConventionEngagementReciproque" timestamp without time zone,
  "BanqueOperateurDate" timestamp without time zone,
  "BanqueOperateur" integer,
  "BanqueClientDate" timestamp without time zone,
  "BanqueClient" integer,
  "FinSuivi" boolean,
  "CFF_FI_Client" timestamp without time zone,
  "DureeAnneePSLA" integer,
  "EstimPSLA" integer,
  "NumBureauGarantie" text,
  "NumConventionGarantie" text,
  "IDBanqueActionType" integer,
  "IDGarantieEmpruntActionType" integer
);
DROP TABLE IF EXISTS "tParam_old";
CREATE TABLE "tParam_old" (
  "IDParam" integer,
  "Param" text,
  "ValeurD" timestamp without time zone,
  "ValeurN" integer,
  "ValeurT" text
);
DROP TABLE IF EXISTS "tParticipation";
CREATE TABLE "tParticipation" (
  "IDParticipation" integer,
  "IDStructureJuridique" integer,
  "IDAssocie" integer,
  "Pourcentage" double precision,
  "Commmentaires" text,
  "IDIndexTaux_Remuneration" integer,
  "DateFinRemuneration" timestamp without time zone,
  "IDMotifRemunerationAssocie" integer,
  "ConvTreso" boolean,
  "DateSignatureConv" timestamp without time zone,
  "DateApplication" timestamp without time zone,
  "InfoTauxRemuneration" text,
  "IDPeriodicite_Versement" integer
);
DROP TABLE IF EXISTS "tPersonne";
CREATE TABLE "tPersonne" (
  "IDPersonne" integer,
  "Patronyme" text,
  "Prenom" text,
  "EstPresent" boolean,
  "IDFonction" integer,
  "EMail" text,
  "IDEquipePersonne" integer
);
DROP TABLE IF EXISTS "tPlanningStade";
CREATE TABLE "tPlanningStade" (
  "IDPlanningStade" integer,
  "IDListeAvancement" integer,
  "NbMoisDecalDepuisOS" integer,
  "IDPlanningType" integer
);
DROP TABLE IF EXISTS "tPlanningType";
CREATE TABLE "tPlanningType" (
  "IDPlanningType" integer,
  "Label" text
);
DROP TABLE IF EXISTS "tRemboursementAnticipe";
CREATE TABLE "tRemboursementAnticipe" (
  "IDRemboursementAnticipe" integer,
  "IDFinancement" integer,
  "Numero" integer,
  "Montant" numeric(19,4),
  "Dat" timestamp without time zone,
  "NbLgt" integer,
  "Commentaire" text
);
DROP TABLE IF EXISTS "tReport";
CREATE TABLE "tReport" (
  "IDReport" integer,
  "Libelle" text,
  "NomInterne" text,
  "ServiceHF" text,
  "FilterIDOperation" boolean,
  "FilterIDEntreprise" boolean,
  "FilterIDAcquereur" boolean,
  "FilterIDLot" boolean,
  "FilterReserveRestantALever" boolean,
  "NomWinDev" text
);
DROP TABLE IF EXISTS "tReserve";
CREATE TABLE "tReserve" (
  "IDReserve" integer,
  "ReserveCode" text,
  "IDTypeReserve" integer,
  "TravauxEffectues" boolean,
  "Reserve" text,
  "DateReclamation" timestamp without time zone,
  "DateDIntervention" timestamp without time zone,
  "IDLot" integer,
  "IDEntreprise" integer,
  "IDPiece" integer,
  "AncienNumLot" text,
  "AncienneEntreprise" text,
  "AncienneOperation" text,
  "AncienPiece" text,
  "AncienType" text,
  "EnvoyerMail" boolean,
  "EnvoyerMailDate" timestamp without time zone,
  "WindowsUser" text,
  "EstVerrouille" boolean,
  "IDAirBat" integer
);
DROP TABLE IF EXISTS "tReserveEntreprise";
CREATE TABLE "tReserveEntreprise" (
  "IDReserveEntreprise" integer,
  "RS" text,
  "Adresse1" text,
  "Adresse2" text,
  "CP" text,
  "Commune" text,
  "Telephone" text,
  "Fax" text,
  "Contact" text,
  "TelContact" text,
  "CorpsDEtat" text,
  "EMail" text
);
DROP TABLE IF EXISTS "tReservePiece";
CREATE TABLE "tReservePiece" (
  "IDReservePiece" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tReserveType";
CREATE TABLE "tReserveType" (
  "IDReserveType" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tSGA";
CREATE TABLE "tSGA" (
  "IDSGA" integer,
  "old_IDOperation" integer,
  "NumFiche" integer,
  "DateCreation" timestamp without time zone,
  "DateSortie" timestamp without time zone,
  "PrixTerrainHT" numeric(19,4),
  "PrixFraisAnnexeHT" numeric(19,4),
  "PrixRevientBudget" numeric(19,4),
  "PrixVenteBudget" numeric(19,4),
  "IDBudget" integer,
  "Commentaire" text,
  "EstPSLA" boolean,
  "IDTranche" integer,
  "SurfaceUtile" real
);
DROP TABLE IF EXISTS "tSIE";
CREATE TABLE "tSIE" (
  "IDSIE" integer,
  "Libelle" text,
  "Adresse" text,
  "CP" text,
  "Commune" text
);
DROP TABLE IF EXISTS "tStadeAvancement";
CREATE TABLE "tStadeAvancement" (
  "IDStadeAvancement" integer,
  "IDListeAvancement" integer,
  "IDTranche" integer,
  "DatePrevComptaDebutAnnee" timestamp without time zone,
  "DatePrevMAJPromo" timestamp without time zone,
  "DateReelle" timestamp without time zone,
  "Commentaire" text,
  "AjoutNbMois" integer,
  "Ordre" integer,
  "PourcentageAvancementReel" real,
  "MontantPrevi" numeric(19,4),
  "AvecAppelFondClientSuppl" boolean,
  "DatePreviObjectif_OLD" timestamp without time zone,
  "LienHypertexte" text
);
DROP TABLE IF EXISTS "tStructureJuridique";
CREATE TABLE "tStructureJuridique" (
  "IDStructureJuridique" integer,
  "RS" text,
  "NumTVAIntra" text,
  "Siret" numeric(19,4),
  "DateDebutActivite" timestamp without time zone,
  "DateImmat" timestamp without time zone,
  "EDI_TVA" boolean,
  "EDI_Liasse" boolean,
  "DateBilanDebutPremierExercice" timestamp without time zone,
  "DateBilanFinPremierExercice" timestamp without time zone,
  "DatePlanningCloture" text,
  "IDPersonneComptable" integer,
  "Stade" integer,
  "GestionnaireSCCV" text,
  "HFSGA" boolean,
  "DateLiquidation" timestamp without time zone,
  "old_CentreImpotsSIE" text,
  "InterlocuteurSIE" text,
  "IDSIE" integer,
  "IDCivilite" integer,
  "CpteFiscal" boolean,
  "DateModifCloture" text,
  "SCCV_HF" boolean,
  "SCCV_HLM" boolean,
  "CapitalSCCV" integer,
  "NbPart" integer,
  "MontantPart" integer,
  "DateLiberationCapital" timestamp without time zone,
  "DateMandatSIE" timestamp without time zone,
  "IDGestionnaireSCCV" integer,
  "PasDeSouscriptionAuCapital" boolean,
  "IDPartenariat" integer,
  "curPourcKPI" real,
  "curPourcKGI" real,
  "curPourcMH" real,
  "curPourcAutre" real,
  "curAutreNom" text,
  "curAutreNomPourc" text
);
DROP TABLE IF EXISTS "tStructureJuridique_Stade";
CREATE TABLE "tStructureJuridique_Stade" (
  "IDStructureJuridique_Stade" integer,
  "Libelle" text
);
DROP TABLE IF EXISTS "tSubvention";
CREATE TABLE "tSubvention" (
  "IDSubvention" integer,
  "IDCategorieSubvention" integer,
  "Organisme_old" text,
  "NumConvention" text,
  "DateConvention" timestamp without time zone,
  "DateCaducite" timestamp without time zone,
  "MontantProvisoire" numeric(24,6),
  "MontantDefinitif" numeric(24,6),
  "FinDeSuivi" smallint,
  "PremierDeblocageAvancement" integer,
  "SoldeDeblocageAvancement" integer,
  "PremierDeblocagePoucentage" real,
  "SoldeDeblocagePoucentage" real,
  "Commentaire" text,
  "MontantAgrement" numeric(24,6),
  "IDTranche" integer,
  "SurOpe" smallint,
  "IDOperation_old" integer,
  "AvecSubvention_old" smallint,
  "BudgetPreviMontant" numeric(24,6),
  "BudgetPreviCommentaire" text,
  "IDOrganismeSubvention" integer
);
DROP TABLE IF EXISTS "tSubvention-SECOURS";
CREATE TABLE "tSubvention-SECOURS" (
  "IDSubvention" integer,
  "IDCategorieSubvention" integer,
  "Organisme_old" text,
  "NumConvention" text,
  "DateConvention" timestamp without time zone,
  "DateCaducite" timestamp without time zone,
  "MontantProvisoire" numeric(24,6),
  "MontantDefinitif" numeric(24,6),
  "FinDeSuivi" smallint,
  "PremierDeblocageAvancement" integer,
  "SoldeDeblocageAvancement" integer,
  "PremierDeblocagePoucentage" real,
  "SoldeDeblocagePoucentage" real,
  "Commentaire" text,
  "MontantAgrement" numeric(24,6),
  "IDTranche" integer,
  "SurOpe" smallint,
  "IDOperation_old" integer,
  "AvecSubvention_old" smallint,
  "BudgetPreviMontant" numeric(24,6),
  "BudgetPreviCommentaire" text,
  "IDOrganismeSubvention" integer
);
DROP TABLE IF EXISTS "tTMA";
CREATE TABLE "tTMA" (
  "IDTMA" integer,
  "RefDevis" text,
  "DateDevis" timestamp without time zone,
  "ObjetDevis" text,
  "DateSignatureDevis" timestamp without time zone,
  "MontantDevis" numeric(19,4),
  "MontantVersement1" numeric(19,4),
  "Commentaires" text,
  "IDCommercialisation" integer,
  "MontantVersement2" numeric(19,4)
);
DROP TABLE IF EXISTS "tTranche";
CREATE TABLE "tTranche" (
  "IDTranche" integer,
  "Libelle" text,
  "IDConcept" integer,
  "IDOperation" integer,
  "NbLogtIndiv" integer,
  "NbLogtColl" integer,
  "NbAutresLocaux" integer,
  "NbTerrain" integer,
  "DontLogtCollPSLA" integer,
  "DontLogtIndivPSLA" integer,
  "Commentaire" text,
  "DateLivraisonContractuelle" timestamp without time zone,
  "MontantHonoParLogt" numeric(19,4),
  "PasDeCommercialisation" boolean,
  "Adresse" text,
  "DureeChantierMois" integer,
  "TerrainMontantHT" numeric(19,4),
  "TerrainAcompte" numeric(19,4),
  "TerrainComm" text,
  "CoutPrevPSLA" numeric(19,4),
  "CoutPrevVEFA" numeric(19,4),
  "CoutPrevAutre" numeric(19,4),
  "CoutPrevCommentaire" text,
  "CoutReelPSLA" numeric(19,4),
  "CoutReelVEFA" numeric(19,4),
  "CoutReelAutre" numeric(19,4),
  "CoutReelCommentaire" text,
  "IDModeRepartQuotePart" integer,
  "QuotePartPSLA" real,
  "QuotePartVEFA_Normal" real,
  "QuotePartAutre" real,
  "QuotePartCommentaire" text,
  "CoutSurOpe_OLD" boolean,
  "NbLVOPrev" integer,
  "FinCommercialisation" boolean,
  "FinTabborAnnuel" boolean,
  "DateConvention" timestamp without time zone,
  "StadeOS" timestamp without time zone,
  "StadeCOM" timestamp without time zone,
  "StadeLIV" timestamp without time zone,
  "StadeSAV" timestamp without time zone,
  "Situation_ETUDE" integer,
  "Situation_TRAVAUX" integer,
  "Situation_LIVRE" integer,
  "Situation_FINSAV" integer,
  "StadeDepuisLe" timestamp without time zone,
  "StadeIDSituation" integer,
  "StadeCode" text,
  "StadePreviOS" timestamp without time zone,
  "StadePreviCOM" timestamp without time zone,
  "StadePreviLIV" timestamp without time zone,
  "StadePreviSAV" timestamp without time zone,
  "NbLot" integer,
  "NbResa" integer,
  "NbInvendus" integer,
  "NbResa_Nm2" integer,
  "NbResa_Nm1" integer,
  "NbResa_N" integer,
  "NbResa_N_PSLA" integer,
  "NbActeVEFA" integer,
  "NbActeVEFA_N" integer,
  "NbLgtPSLA" integer,
  "NbLgtHorsPSLA" integer,
  "NbLeveeOption" integer,
  "NbLeveeOption_N" integer,
  "NbPhaseLoc" integer,
  "FraisBudgetDate" timestamp without time zone,
  "FraisBudgetCommentaire" text,
  "FraisActuaDate" timestamp without time zone,
  "FraisActuaCommentaire" text,
  "FraisConsommeDate" timestamp without time zone,
  "FraisConsommeCommentaire" text,
  "FraisReelDate" timestamp without time zone,
  "FraisReelCommentaire" text,
  "CAHTActua" numeric(19,4),
  "CAHTReel" numeric(19,4),
  "TerrainMontantTTC" numeric(19,4),
  "TerrainCompromis_IDSignataire" integer,
  "CAHTPrevPSLA" numeric(19,4),
  "CAHTPrevVEFA" numeric(19,4),
  "CAHTPrevAutre" numeric(19,4),
  "CAHTPrevCommentaire" text,
  "DontLogtCollBRS" integer,
  "DontLogtIndivBRS" integer,
  "TerrainPourcAcptePrevu" real,
  "TerrainComment" text,
  "IDOFSNom" integer,
  "TerrainOFSMontantHT" numeric(19,4),
  "TerrainOFSAcptePourcPrevu" real,
  "TerrainOFSAcpteMontantVerse" real,
  "TerrainOFSCompromis_IDSignataire" integer,
  "old_DroitAppuiLogtMntUnitaire" numeric(19,4),
  "old_DroitAppuiLogtComment" text,
  "old_DroitAppuiSurfaceMntUnitaire" numeric(19,4),
  "old_DroitAppui_IDSurfaceNature" integer,
  "old_DroitAppuiSurfaceNbre" real,
  "old_DroitAppuiSurfaceComment" text,
  "old_DroitAppuiAutreMnt" numeric(19,4),
  "old_DroitAppuiAutreComment" text,
  "old_TerrainOFSCompromisDatePrevi" timestamp without time zone,
  "old_TerrainOFSCompromisDateReele" timestamp without time zone,
  "AlerteStadeAvancement_Texte" text,
  "IDCertification" integer,
  "IDLabel" integer,
  "IDPerformanceEnergetique" integer,
  "EstMOEInterne" boolean,
  "IDMissionMOEInterne" integer,
  "IDArchitecte_Mandataire" integer,
  "IDArchitecte_CoTraitant" integer,
  "AvecAppelFondClientDerogatoire" boolean,
  "TerrainBailOperateurDatePrevi" timestamp without time zone,
  "TerrainBailOperateurDateReelle" timestamp without time zone,
  "StadeESQ" timestamp without time zone,
  "StadeDPC" timestamp without time zone,
  "StadeAO" timestamp without time zone,
  "StadeRECEP" timestamp without time zone,
  "StadeLIVC" timestamp without time zone,
  "StadeGPA" timestamp without time zone,
  "StadePreviESQ" timestamp without time zone,
  "StadePreviDPC" timestamp without time zone,
  "StadePreviAO" timestamp without time zone,
  "StadePreviRECEP" timestamp without time zone,
  "StadePreviLIVC" timestamp without time zone,
  "StadePreviGPA" timestamp without time zone,
  "CommentaireAvancement" text,
  "CommentaireActionAMener" text,
  "IDListeAvancement_actuel" integer,
  "DateStadeActuel" timestamp without time zone,
  "IDListeAvancement_prochain" integer,
  "DateStadeProchain" timestamp without time zone,
  "IDListeAvancement_suivi_actuel" integer,
  "DateStadeSuiviActuel" timestamp without time zone,
  "IDListeAvancement_suivi_prochain" integer,
  "DateStadeSuiviProchain" timestamp without time zone,
  "NbEtage" integer,
  "IDTypeBatiment" integer,
  "IDTypeMissionBudgetArchitecte" integer,
  "IDListeBudget_FraisStade" integer,
  "DateContratArchitecte" timestamp without time zone,
  "NbLotAppartementOuMaison" integer,
  "CAHTPrevVEFA_Reduit" numeric(19,4),
  "SubvPrevPSLA" numeric(19,4),
  "SubvPrevVEFA_Reduit" numeric(19,4),
  "SubvPrevVEFA_Normal" numeric(19,4),
  "SubvPrevAutre" numeric(19,4),
  "HonoCommPSLA" numeric(19,4),
  "HonoCommVEFA_Reduit" numeric(19,4),
  "HonoCommVEFA_Normal" numeric(19,4),
  "HonoCommVEFA_Autre" numeric(19,4),
  "QuotePartVEFA_Reduit" real,
  "NbLVOPrevAnnee" integer,
  "TerrainOFSComment" text
);
DROP TABLE IF EXISTS "tVersementDepotGarantie";
CREATE TABLE "tVersementDepotGarantie" (
  "IDVersementDepotGarantie" integer,
  "MontantVerse" real,
  "DateRemise" timestamp without time zone,
  "Commentaire" text,
  "IDCommercialisation" integer,
  "DateCreation" timestamp without time zone
);
DROP TABLE IF EXISTS "tVersementDepotGarantie_old";
CREATE TABLE "tVersementDepotGarantie_old" (
  "IDVersementDepotGarantie" integer,
  "MontantVerse" real,
  "DateRemise" timestamp without time zone,
  "Commentaire" text,
  "IDCommercialisation" integer
);
