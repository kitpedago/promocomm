-- Généré par npm run db:miroir -- --ddl depuis le schéma legacy (2026-09-29). Ne pas éditer.
-- Seule retouche à la main, à refaire après un --ddl : tTranche.TerrainBailOperateurDate*
-- renommées old_* (dates saisies dans les stades d'avancement, jalon BRS Opérateur).
DROP TABLE IF EXISTS "AccordCadreAssurance";
CREATE TABLE "AccordCadreAssurance" (
  "Code" character varying(255)
);
DROP TABLE IF EXISTS "ActionFinGFAType";
CREATE TABLE "ActionFinGFAType" (
  "IDActionFinGFAType" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "ArchiveStadeAvancement";
CREATE TABLE "ArchiveStadeAvancement" (
  "DateArchivage" timestamp without time zone,
  "Libelle" character varying(20),
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
  "Domaine" character varying(255),
  "CodeStadeAvancement" character varying(255),
  "StadeAvancement" character varying(255),
  "LibelleMission" character varying(255),
  "IDOperation" integer,
  "Tranche" character varying(255),
  "NbLogtIndiv" integer,
  "NbLogtColl" integer,
  "NbAutresLocaux" integer,
  "NbTerrain" integer,
  "curPourcentageHF" real,
  "AnneeStade" integer,
  "Commune" character varying(255),
  "Operation" character varying(255),
  "DateStade" timestamp without time zone,
  "StatutDate" character varying(255),
  "IDTypeDateStadeAvancement" integer,
  "TypeDateStadeAvancement" character varying(255),
  "IDArchiveStadeAvancementListe" integer
);
DROP TABLE IF EXISTS "BanqueActionType";
CREATE TABLE "BanqueActionType" (
  "Libelle" character varying(255),
  "IDBanqueActionType" integer
);
DROP TABLE IF EXISTS "BanqueCourtage";
CREATE TABLE "BanqueCourtage" (
  "Libelle" character varying(100),
  "IDBanqueCourtage" integer
);
DROP TABLE IF EXISTS "BaremeHonoComm";
CREATE TABLE "BaremeHonoComm" (
  "IDBaremeHonoComm" integer,
  "Libelle" character varying(50)
);
DROP TABLE IF EXISTS "BlocageHonoOCFin";
CREATE TABLE "BlocageHonoOCFin" (
  "IDBlocageHonoOCFin" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "CSP";
CREATE TABLE "CSP" (
  "Numero" integer,
  "Libelle" character varying(100),
  "IDCSP" integer
);
DROP TABLE IF EXISTS "CalendrierMois";
CREATE TABLE "CalendrierMois" (
  "DateDebutMois" timestamp without time zone,
  "DateFinMois" timestamp without time zone,
  "Ann_e" integer,
  "Mois" character varying(50)
);
DROP TABLE IF EXISTS "CategorieFrais";
CREATE TABLE "CategorieFrais" (
  "Libelle" character varying(255),
  "EstPublicite" boolean,
  "Ordre" integer,
  "IDCategorieFrais" integer,
  "IDUsageFrais" integer
);
DROP TABLE IF EXISTS "Certification";
CREATE TABLE "Certification" (
  "Libelle" character varying(255),
  "IDCertification" integer
);
DROP TABLE IF EXISTS "Commune";
CREATE TABLE "Commune" (
  "CodeINSEE" character varying(255),
  "Libelle" character varying(255),
  "Departement" character varying(3),
  "ZonageABCRevise" character varying(3),
  "CodePostal" character varying(10),
  "IDCommune" integer
);
DROP TABLE IF EXISTS "CommuneEtZonePourImport";
CREATE TABLE "CommuneEtZonePourImport" (
  "code_commune_insee" integer,
  "nom_de_la_commune" character varying(50),
  "code_postal" integer
);
DROP TABLE IF EXISTS "Contentieux";
CREATE TABLE "Contentieux" (
  "Objet" character varying(255),
  "DateDebut" timestamp without time zone,
  "DateFin" timestamp without time zone,
  "Avocats" character varying(255),
  "Commentaires" character varying(255),
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
  "PromoGesNom" character varying(255),
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
  "MotifAnnulation" character varying(255),
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
  "QuinzaineLivraisonPeriode_old" character varying(255),
  "PreviLivraisionDateEnvoiCourrier_old" timestamp without time zone,
  "PreviLivraisionRDVDate_old" timestamp without time zone,
  "PreviLivraisionRDVHeure_old" timestamp without time zone,
  "LivraisonDateEnvoiCourrier" timestamp without time zone,
  "LivraisonRDVDate" timestamp without time zone,
  "LivraisonRDVHeure" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" character varying(10),
  "LivraisonTrimestreDecale" character varying(255),
  "CDVPromo" text,
  "TMADateEnvoiCourrier" timestamp without time zone,
  "TMAMontantOuvertureDossier" numeric(19,4),
  "TMACommentaire" text,
  "TMADatePaiementSolde" timestamp without time zone,
  "TMAMailingListeDevis" character varying(255),
  "TMAMailingSolde" character varying(255),
  "DateEtatSortieLieux" timestamp without time zone,
  "AnnulationCommentaire" character varying(255),
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
  "TroisMoisAvantLivraisonPeriode" character varying(255),
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
  "CommentairesSouscription" character varying(255)
);
DROP TABLE IF EXISTS "DataLots";
CREATE TABLE "DataLots" (
  "ID TRANCHE" double precision,
  "Tranche" character varying(255),
  "Tranche - libellé" character varying(255),
  "Grille" character varying(255),
  "Grille - libellé" character varying(255),
  "Numéro de lot" character varying(255),
  "Lot associé" character varying(255),
  "Code de copropriété" character varying(255),
  "Famille de bien" character varying(255),
  "Type de bien" character varying(255),
  "Caractéristique" character varying(255),
  "Surf habitable" double precision,
  "Surf pondérée" double precision,
  "Surf utile" double precision,
  "Surf terrasse" double precision,
  "N° étage" character varying(255),
  "Surf garage" double precision,
  "N°parcelle" character varying(255),
  "Surf cave" double precision,
  "Surf balcon" double precision,
  "Surf loggias" double precision,
  "Surf remise" double precision,
  "Surf jardin" double precision,
  "Surf terrain" double precision,
  "Exposition" character varying(255),
  "Tantièmes" double precision,
  "Prix d'origine HT" double precision,
  "TVA Origine" character varying(255),
  "Prix d'origine" double precision,
  "Prix de vente HT" double precision,
  "Acquéreur - code" character varying(255),
  "Tx Vente" character varying(255),
  "Prix de vente TTC" double precision,
  "Tva/M" double precision,
  "Non destiné a la vente" double precision,
  "Statut" character varying(255),
  "Prix au m²" double precision,
  "Acquéreur - nom" character varying(255),
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
  "Prescripteur" character varying(255),
  "Mnt Comm" double precision,
  "Notes" character varying(255)
);
DROP TABLE IF EXISTS "DecalageUniteTemps";
CREATE TABLE "DecalageUniteTemps" (
  "Libelle" character varying(255),
  "IDDecalageUniteTemps" integer
);
DROP TABLE IF EXISTS "DomaineStadeAvancement";
CREATE TABLE "DomaineStadeAvancement" (
  "CodeDomaineStadeAvancement" character varying(255)
);
DROP TABLE IF EXISTS "Droit";
CREATE TABLE "Droit" (
  "IDDroit" integer,
  "Fenetre" character varying(255),
  "Controle" character varying(255),
  "Indice" integer,
  "IDService" integer,
  "IDTypeDroit" integer,
  "Commentaires" character varying(255)
);
DROP TABLE IF EXISTS "EquipePersonne";
CREATE TABLE "EquipePersonne" (
  "Libelle" character varying(255),
  "IDEquipePersonne" integer
);
DROP TABLE IF EXISTS "EtatStadeAvancementAlerte";
CREATE TABLE "EtatStadeAvancementAlerte" (
  "Libelle" character varying(255),
  "IDEtatStadeAvancementAlerte" integer
);
DROP TABLE IF EXISTS "EtudeNotaire";
CREATE TABLE "EtudeNotaire" (
  "NomEtude" character varying(150),
  "Adresse" character varying(255),
  "CP" character varying(255),
  "Commune" character varying(255),
  "Email" character varying(255),
  "Commentaire" character varying(255),
  "IDEtudeNotaire" integer
);
DROP TABLE IF EXISTS "FonctionInterlocuteurNotaire";
CREATE TABLE "FonctionInterlocuteurNotaire" (
  "Libelle" character varying(50),
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
  "UsageFrais" character varying(255)
);
DROP TABLE IF EXISTS "GarantieEmpruntActionType";
CREATE TABLE "GarantieEmpruntActionType" (
  "Libelle" character varying(255),
  "IDGarantieEmpruntActionType" integer
);
DROP TABLE IF EXISTS "GestionnaireSCCV";
CREATE TABLE "GestionnaireSCCV" (
  "Libelle" character varying(255),
  "IDGestionnaireSCCV" integer
);
DROP TABLE IF EXISTS "ImportLotPromoGes";
CREATE TABLE "ImportLotPromoGes" (
  "IDTranche" double precision,
  "Tranche" character varying(255),
  "Tranche - libellé" character varying(255),
  "Grille" character varying(255),
  "Grille - libellé" character varying(255),
  "Numéro de lot" character varying(255),
  "Lot associé" character varying(255),
  "Code de copropriété" character varying(255),
  "Famille de bien" character varying(255),
  "Type de bien" character varying(255),
  "Caractéristique" character varying(255),
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
  "N° étage" character varying(255),
  "Exposition" character varying(255),
  "N°parcelle" character varying(255),
  "Tantièmes" double precision,
  "Prix d'origine" double precision,
  "Prix de vente HT" double precision,
  "Prix de vente TTC" double precision,
  "TVA" character varying(255),
  "Tva/M" double precision,
  "Non destiné a la vente" double precision,
  "Statut" character varying(255),
  "Prix au m²" double precision,
  "Acquéreur - code" character varying(255),
  "Acquéreur - nom" character varying(255),
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
  "Commercial" character varying(255),
  "Pct comm" double precision,
  "Mnt Comm" double precision,
  "Notes" character varying(255),
  "IDDestination" integer
);
DROP TABLE IF EXISTS "InfoConsigne";
CREATE TABLE "InfoConsigne" (
  "NomTable" character varying(255),
  "NomChamp" character varying(255),
  "TexteInfoConsigne" character varying(255),
  "NomControleAlternatif" character varying(255),
  "IDInfoConsigne" integer
);
DROP TABLE IF EXISTS "InterlocuteurNotaire";
CREATE TABLE "InterlocuteurNotaire" (
  "Civilite" character varying(10),
  "Patronyme" character varying(100),
  "Prenom" character varying(100),
  "Fonction" character varying(100),
  "Telephone" character varying(20),
  "Email" character varying(100),
  "IDEtudeNotaire" integer,
  "IDFonctionInterlocuteurNotaire" integer,
  "IDInterlocuteurNotaire" integer
);
DROP TABLE IF EXISTS "Label";
CREATE TABLE "Label" (
  "Libelle" character varying(255),
  "IDLabel" integer
);
DROP TABLE IF EXISTS "ListeNumEtage";
CREATE TABLE "ListeNumEtage" (
  "NumEtageImport" character varying(255),
  "NumEtageAfficher" character varying(10)
);
DROP TABLE IF EXISTS "MandatHypothequer";
CREATE TABLE "MandatHypothequer" (
  "IDMandatHypothequer" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "MissionMOEInterne";
CREATE TABLE "MissionMOEInterne" (
  "IDMissionMOEInterne" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "ModeleMail";
CREATE TABLE "ModeleMail" (
  "IDModeleMail" integer,
  "Libelle" character varying(255),
  "Sujet" character varying(255),
  "Corps" bytea,
  "ModeBrouillon" smallint,
  "Destinataire" character varying(255),
  "DestinataireCC" character varying(255),
  "DestinataireCCI" character varying(255),
  "req_WD" character varying(255)
);
DROP TABLE IF EXISTS "ModelePJ";
CREATE TABLE "ModelePJ" (
  "IDModelePJ" integer,
  "Libelle" character varying(255),
  "Nom_etat_WD" character varying(255),
  "IDModeleMail" integer,
  "Chemin" character varying(255)
);
DROP TABLE IF EXISTS "MotifAnnulation";
CREATE TABLE "MotifAnnulation" (
  "IDMotifAnnulation" integer,
  "Libelle" character varying(50)
);
DROP TABLE IF EXISTS "MotifClauseParticuliereComm";
CREATE TABLE "MotifClauseParticuliereComm" (
  "IDMotifClauseParticuliereComm" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "MotifRemunerationAssocie";
CREATE TABLE "MotifRemunerationAssocie" (
  "Libelle" character varying(255),
  "IDMotifRemunerationAssocie" integer
);
DROP TABLE IF EXISTS "MoyenDePaiement";
CREATE TABLE "MoyenDePaiement" (
  "Libelle" character varying(255),
  "IDMoyenDePaiement" integer
);
DROP TABLE IF EXISTS "NatureJuridique";
CREATE TABLE "NatureJuridique" (
  "IDNatureJuridique" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "NumEtageTemp";
CREATE TABLE "NumEtageTemp" (
  "NumAvant" character varying(255),
  "NumApres" character varying(255)
);
DROP TABLE IF EXISTS "OFSNom";
CREATE TABLE "OFSNom" (
  "IDOFSNom" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "OrganismeSubvention";
CREATE TABLE "OrganismeSubvention" (
  "IDOrganismeSubvention" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "OrganismeSubvention-23062026";
CREATE TABLE "OrganismeSubvention-23062026" (
  "IDOrganismeSubvention" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "Param";
CREATE TABLE "Param" (
  "IDParam" integer,
  "Param" character varying(255),
  "Typ" character varying(1),
  "ValeurD" timestamp without time zone,
  "ValeurN" real,
  "ValeurT" character varying(255),
  "ValeurH" text
);
DROP TABLE IF EXISTS "Partenariat";
CREATE TABLE "Partenariat" (
  "Libelle" character varying(255),
  "IDPartenariat" integer
);
DROP TABLE IF EXISTS "PerformanceEnergetique";
CREATE TABLE "PerformanceEnergetique" (
  "IDPerformanceEnergetique" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "PeriodeTauxGFA";
CREATE TABLE "PeriodeTauxGFA" (
  "Libelle" character varying(255),
  "IDPeriodeTauxGFA" integer
);
DROP TABLE IF EXISTS "Periodicite";
CREATE TABLE "Periodicite" (
  "CodePeriodicite" character varying(255)
);
DROP TABLE IF EXISTS "REQ_Acquereur_Simple";
CREATE TABLE "REQ_Acquereur_Simple" (
  "IDAcquereur" integer,
  "NomComplet" character varying(255)
);
DROP TABLE IF EXISTS "REQ_Assistante";
CREATE TABLE "REQ_Assistante" (
  "IDPersonne" integer,
  "Assistante" text
);
DROP TABLE IF EXISTS "REQ_Avancement_selon_domaine";
CREATE TABLE "REQ_Avancement_selon_domaine" (
  "IDListeAvancement" integer,
  "Libelle" character varying(255),
  "Domaine" character varying(255),
  "Ordre" integer
);
DROP TABLE IF EXISTS "REQ_Interface_Operation_Tranche";
CREATE TABLE "REQ_Interface_Operation_Tranche" (
  "IDTranche" integer,
  "Libelle" character varying(255),
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
  "Adresse" character varying(255),
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
  "Concept" character varying(255),
  "Architecte" character varying(255),
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
  "NomEtude" character varying(150),
  "IDInterlocuteurNotaire" integer,
  "InterlocuteurNotaire" text,
  "NomComplet" text
);
DROP TABLE IF EXISTS "REQ_Operation";
CREATE TABLE "REQ_Operation" (
  "IDOperation" integer,
  "IDStructureJuridique" integer,
  "Libelle" character varying(255),
  "CP" character varying(255),
  "Commune" character varying(255),
  "SurRennesMetropole" smallint,
  "ANRU" smallint,
  "Commentaire" text,
  "AnneeDGD" integer,
  "MasquerCommercial" smallint,
  "MasquerComptable" smallint,
  "Adresse" character varying(255),
  "NomZAC" character varying(255),
  "DureeChantierMois_old" integer,
  "MasquerPromo" smallint,
  "RS" character varying(255),
  "curIDPersonne_ChargeOpe1" integer,
  "curIDPersonne_ChargeOpe2" integer,
  "NbTranches" numeric(20,0),
  "TotalLogtColl" bigint,
  "TotalTerrain" bigint,
  "TotalLogtIndiv" bigint,
  "TotalNbAutresLocaux" bigint,
  "ANRUComment" character varying(255),
  "IDSecteurGeographiqueDeveloppement" integer,
  "IDInterlocuteurNotaire_Foncier" integer,
  "IDInterlocuteurNotaire_Vente" integer,
  "AbreviationPourCodeReserve" character varying(5),
  "IDPersonne_Assistante" integer,
  "SynchroniserDatesEntreTranche" smallint,
  "IDApporteurFoncier" integer
);
DROP TABLE IF EXISTS "REQ_PrestataireComm2";
CREATE TABLE "REQ_PrestataireComm2" (
  "IDPrestataire" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "REQ_Reservation";
CREATE TABLE "REQ_Reservation" (
  "IDCommercialisation" integer,
  "IDLot" integer,
  "Numlot" character varying(255),
  "NomComplet" character varying(255),
  "IDDestination" integer,
  "IDNatureAchat" integer,
  "DateResa" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" character varying(10),
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
  "NomComplet" character varying(255),
  "Numlot" character varying(255),
  "IDDestination" integer,
  "IDNatureAchat" integer,
  "DateResa" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" character varying(10),
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
  "RS" character varying(255),
  "Commune" character varying(255),
  "Operation" character varying(255),
  "DateLiquidation" timestamp without time zone,
  "NbLogt" bigint,
  "DateImmat" timestamp without time zone
);
DROP TABLE IF EXISTS "REQ_SCCV_Liquidation_DernierMois";
CREATE TABLE "REQ_SCCV_Liquidation_DernierMois" (
  "RS" character varying(255),
  "Commune" character varying(255),
  "Operation" character varying(255),
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
  "Operation" character varying(255),
  "Commune" character varying(255),
  "Tranche" character varying(255),
  "StadeIDSituation" integer,
  "StadeDepuisLe" timestamp without time zone,
  "NbLogt" bigint
);
DROP TABLE IF EXISTS "REQ_Tranche_Situation_DernierMois_LancementCom";
CREATE TABLE "REQ_Tranche_Situation_DernierMois_LancementCom" (
  "Operation" character varying(255),
  "Commune" character varying(255),
  "Tranche" character varying(255),
  "NbLogt" bigint,
  "StadeCOM" timestamp without time zone
);
DROP TABLE IF EXISTS "REQ_Tranche_Situation_DernierMois_TRAVAUX";
CREATE TABLE "REQ_Tranche_Situation_DernierMois_TRAVAUX" (
  "Operation" character varying(255),
  "Commune" character varying(255),
  "Tranche" character varying(255),
  "StadeIDSituation" integer,
  "NbLogt" bigint,
  "StadeDepuisLe" timestamp without time zone
);
DROP TABLE IF EXISTS "ReducGFA";
CREATE TABLE "ReducGFA" (
  "IDGFA" integer,
  "Montant" numeric(19,4),
  "DateReduc" timestamp without time zone,
  "Comm" character varying(255),
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
  "TxtSiALerte" character varying(255),
  "IDRegleAlerteStadeAvancement" integer
);
DROP TABLE IF EXISTS "SecteurGeographiqueDeveloppement";
CREATE TABLE "SecteurGeographiqueDeveloppement" (
  "Libelle" character varying(50),
  "IDSecteurGeographiqueDeveloppement" integer
);
DROP TABLE IF EXISTS "Service";
CREATE TABLE "Service" (
  "IDService" integer,
  "Libelle" character varying(255),
  "Num" integer
);
DROP TABLE IF EXISTS "Signataire";
CREATE TABLE "Signataire" (
  "IDSignataire" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "SituationFamiliale";
CREATE TABLE "SituationFamiliale" (
  "IDSituationFamiliale" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "SituationFamille";
CREATE TABLE "SituationFamille" (
  "IDSituationDeFamille" integer,
  "Libelle" character varying(255),
  "IDSituationFamille" integer
);
DROP TABLE IF EXISTS "StatutApport";
CREATE TABLE "StatutApport" (
  "IDStatutApport" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "StatutApportPromoteurGFA";
CREATE TABLE "StatutApportPromoteurGFA" (
  "IDStatutApportPromoteurGFA" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "StatutCoutMandat";
CREATE TABLE "StatutCoutMandat" (
  "IDStatutCoutMandat" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "StructureBaseDonnee";
CREATE TABLE "StructureBaseDonnee" (
  "IDBaseDonnee" integer,
  "FullName" character varying(255),
  "IDStructureBaseDonnee" integer
);
DROP TABLE IF EXISTS "StructureChamp";
CREATE TABLE "StructureChamp" (
  "IDChamp" integer,
  "IDTableData" integer,
  "Code" character varying(255),
  "Libelle" character varying(255),
  "IDTypeChamp" integer,
  "Taille" integer,
  "DateAjout" timestamp without time zone,
  "Commentaire" character varying(255),
  "NomIndex" character varying(255),
  "Unique" smallint,
  "ClePrimaire" smallint,
  "Requis" smallint,
  "OrigineDeLaDonnee" character varying(255),
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
  "Libelle" character varying(255),
  "IDStructureDomaine" integer
);
DROP TABLE IF EXISTS "StructureEmplacementInterface";
CREATE TABLE "StructureEmplacementInterface" (
  "Libelle" character varying(255),
  "IDStructureEmplacementInterface" integer
);
DROP TABLE IF EXISTS "StructureStatutChamp";
CREATE TABLE "StructureStatutChamp" (
  "Libelle" character varying(255),
  "Commentaire" character varying(255),
  "IDStructureStatutChamp" integer
);
DROP TABLE IF EXISTS "StructureTableData";
CREATE TABLE "StructureTableData" (
  "IDTableData" integer,
  "Libelle" character varying(255),
  "IDBaseDonnee" integer,
  "DateAjout" timestamp without time zone,
  "Commentaire" character varying(255),
  "IDStructureTableData" integer
);
DROP TABLE IF EXISTS "StructureTypeChamp";
CREATE TABLE "StructureTypeChamp" (
  "IDTypeChamp" integer,
  "Libelle" character varying(255),
  "IDStructureTypeChamp" integer
);
DROP TABLE IF EXISTS "SurfaceNature";
CREATE TABLE "SurfaceNature" (
  "IDSurfaceNature" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "TypeBatiment";
CREATE TABLE "TypeBatiment" (
  "IDTypeBatiment" integer,
  "Libelle" character varying(255)
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
  "Code" character varying(255)
);
DROP TABLE IF EXISTS "TypeDateStadeAvancement";
CREATE TABLE "TypeDateStadeAvancement" (
  "IDTypeDateStadeAvancement" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "TypeDeMenage";
CREATE TABLE "TypeDeMenage" (
  "IDTypeDeMenage" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "TypeDroit";
CREATE TABLE "TypeDroit" (
  "IDTypeDroit" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "TypeFoncier";
CREATE TABLE "TypeFoncier" (
  "IDTypeFoncier" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "TypeLogementActuel";
CREATE TABLE "TypeLogementActuel" (
  "IDTypeLogementActuel" integer,
  "Libelle" character varying(255),
  "NumRM" integer
);
DROP TABLE IF EXISTS "TypeMissionBudgetArchitecte";
CREATE TABLE "TypeMissionBudgetArchitecte" (
  "IDTypeMissionBudgetArchitecte" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "UsageFrais";
CREATE TABLE "UsageFrais" (
  "IDUsageFrais" integer,
  "Libelle" character varying(50)
);
DROP TABLE IF EXISTS "ZonageABC";
CREATE TABLE "ZonageABC" (
  "CodeZonageABC" character varying(3)
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
  "client_net_addr" character varying(48),
  "statement_text" text
);
DROP TABLE IF EXISTS "audit__tSubvention_truncate_log";
CREATE TABLE "audit__tSubvention_truncate_log" (
  "log_id" integer,
  "log_time" timestamp without time zone,
  "database_name" character varying(128),
  "schema_name" character varying(128),
  "object_name" character varying(128),
  "login_name" text,
  "server_principal" text,
  "host_name" text,
  "app_name" text,
  "client_net_addr" character varying(48),
  "statement_text" text
);
DROP TABLE IF EXISTS "sysdiagrams";
CREATE TABLE "sysdiagrams" (
  "name" character varying(128),
  "principal_id" integer,
  "diagram_id" integer,
  "version" integer,
  "definition" bytea
);
DROP TABLE IF EXISTS "tAcquereur";
CREATE TABLE "tAcquereur" (
  "IDAcquereur" integer,
  "Code" character varying(255),
  "Patronyme" character varying(255),
  "Civilite" character varying(255),
  "Prenom" character varying(255),
  "RS" character varying(255),
  "NatureJuridique" integer,
  "TypePropriétaire_old" integer,
  "Commentaire" text,
  "PromoGesNom" character varying(255),
  "ImportIDLot" integer,
  "ImportDateResa" timestamp without time zone,
  "ImportDatePrevueSignature" timestamp without time zone,
  "ImportDateLivraison" timestamp without time zone,
  "Identifiant" character varying(255),
  "N° Lot" character varying(255),
  "Typologie" character varying(255),
  "Etage" character varying(255),
  "surface" character varying(255),
  "Téléphone" character varying(255),
  "Portable" character varying(255),
  "Email" character varying(255),
  "AdresseActuelle" character varying(255),
  "CPActuel" character varying(255),
  "Communeactuelle" character varying(255),
  "IDTypeLogementActuel" integer,
  "RevenusFoyerFiscal_orig" character varying(255),
  "IDAcquereurRevenuFoyerFiscalParQuartile" integer,
  "AnneeDeDeclaration_orig" character varying(255),
  "NombreAdultes_orig" character varying(255),
  "NombreEnfants_orig" character varying(255),
  "EnfantAVenir_orig" character varying(255),
  "IDAcquereurPlafondRessources" integer,
  "PrixDAchat_orig" character varying(255),
  "TauxTVA_orig" character varying(255),
  "ApportReelADateHorsSubvention_orig" character varying(255),
  "Subvention_orig" character varying(255),
  "DateDeReservation" character varying(255),
  "Date  signature de contrat de loc acc" character varying(255),
  "Date de transfert de propriété" character varying(255),
  "Adresse programme" character varying(255),
  "CP programme" character varying(255),
  "Ville programme" character varying(255),
  "Nom programme" character varying(255),
  "Type de programme" character varying(255),
  "Co-propriété" character varying(255),
  "Zone ANRU" character varying(255),
  "Type d'acquisition" character varying(255),
  "PrimoAccedant" character varying(255),
  "Modifications" character varying(255),
  "ReservesDE" character varying(255),
  "Date prévisionnelle livraison" character varying(255),
  "Date réelle livraison" character varying(255),
  "IDAcquereurTrancheAge" integer,
  "Etape" character varying(255),
  "IDConseillerCommercial" integer,
  "IDConseillerTechnique" integer,
  "EnqueteA" character varying(255),
  "EnqueteB" character varying(255),
  "EnqueteC" character varying(255),
  "SituationFamiliale" integer,
  "Adulte1Age" integer,
  "Adulte2Age" integer,
  "Adulte1CSP" integer,
  "Adulte2CSP" integer,
  "Adulte1Metier" character varying(255),
  "Adulte2Metier" character varying(255),
  "Adulte1CommuneTravail" character varying(255),
  "Adulte2CommuneTravail" character varying(255),
  "TypeDeMenage" integer,
  "AgeEnfant1" integer,
  "AgeEnfant2" integer,
  "AgeEnfant3" integer,
  "AgeEnfant4" integer,
  "AgeEnfant5" integer,
  "RevenuNetFoyerMensuel_orig" character varying(255),
  "MultiAccedant" boolean,
  "RevenusNetImposableNMoins1" numeric(19,4),
  "Telephone_old" character varying(255),
  "TelPortable_old" character varying(255),
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
  "old_QuinzaineLivraisonPeriode" character varying(255),
  "old_PreviLivraisionDateEnvoiCourrier" timestamp without time zone,
  "old_PreviLivraisionRDVDate" timestamp without time zone,
  "old_PreviLivraisionRDVHeure" timestamp without time zone,
  "old_LivraisonDateEnvoiCourrier" timestamp without time zone,
  "old_LivraisonRDVDate" timestamp without time zone,
  "old_LivraisonRDVHeure" timestamp without time zone,
  "old_LivraisonTrimestrePrevueAuContrat" character varying(10),
  "old_LivraisonTrimestreDecale" character varying(255),
  "old_CDVPromo" text,
  "IDCivilite" integer,
  "Adulte1DateNaissance" timestamp without time zone,
  "Adulte2DateNaissance" timestamp without time zone,
  "InfoPourEntreprise" character varying(255),
  "curIDLot" integer,
  "curDateResa" timestamp without time zone,
  "CommuneOrigine" character varying(255),
  "DateModifAdresse" timestamp without time zone,
  "IDSituationFamille" integer,
  "PensionEtAutresRevenus" numeric(19,4),
  "LoyerActuel" numeric(19,4),
  "DureeFinancementEnMois" integer,
  "Adulte1LieuDeNaissance" character varying(255),
  "Adulte2LieuDeNaissance" character varying(255),
  "IDCivilite2" integer,
  "Patronyme2" character varying(255),
  "Prenom2" character varying(255),
  "NomComplet" character varying(255),
  "curDateAnnulation" timestamp without time zone,
  "DescriptionLotCourant" character varying(255),
  "Patronyme3" character varying(255),
  "Prenom3" character varying(255),
  "IDCivilite3" integer,
  "Email2" character varying(255),
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
  "Libelle" character varying(255),
  "NumRM" integer,
  "IDAcquereurOrigine" integer
);
DROP TABLE IF EXISTS "tAcquereurPlafondRessources";
CREATE TABLE "tAcquereurPlafondRessources" (
  "IDAcquereurPlafondRessources" integer,
  "Libelle" character varying(255),
  "Libelle_ancien" character varying(255)
);
DROP TABLE IF EXISTS "tAcquereurRevenuFoyerFiscalParQuartile";
CREATE TABLE "tAcquereurRevenuFoyerFiscalParQuartile" (
  "IDAcquereurRevenuFoyerFiscalParQuartile" integer,
  "Libelle" character varying(255),
  "BorneMax" integer
);
DROP TABLE IF EXISTS "tAcquereurTrancheAge";
CREATE TABLE "tAcquereurTrancheAge" (
  "IDAcquereurTrancheAge" integer,
  "Libelle" character varying(255),
  "BorneMax" integer
);
DROP TABLE IF EXISTS "tAcquereur_ExportErrors";
CREATE TABLE "tAcquereur_ExportErrors" (
  "Champ" character varying(255),
  "Erreur" character varying(255),
  "Ligne" integer
);
DROP TABLE IF EXISTS "tAcquereur_copie";
CREATE TABLE "tAcquereur_copie" (
  "IDAcquereur" integer,
  "Code" character varying(255),
  "Patronyme" character varying(255),
  "Civilite" character varying(255),
  "Prenom" character varying(255),
  "RS" character varying(255),
  "NatureJuridique" integer,
  "TypePropriétaire_old" integer,
  "Commentaire" text,
  "PromoGesNom" character varying(255),
  "ImportIDLot" integer,
  "ImportDateResa" timestamp without time zone,
  "ImportDatePrevueSignature" timestamp without time zone,
  "ImportDateLivraison" timestamp without time zone,
  "Identifiant" character varying(255),
  "N° Lot" character varying(255),
  "Typologie" character varying(255),
  "Etage" character varying(255),
  "surface" character varying(255),
  "Téléphone" character varying(255),
  "Portable" character varying(255),
  "Email" character varying(255),
  "AdresseActuelle" character varying(255),
  "CPActuel" character varying(255),
  "Communeactuelle" character varying(255),
  "IDTypeLogementActuel" integer,
  "RevenusFoyerFiscal" character varying(255),
  "IDAcquereurRevenuFoyerFiscalParQuartile" integer,
  "AnneeDeDeclaration_old" character varying(255),
  "NombreAdultes" character varying(255),
  "NombreEnfants" character varying(255),
  "EnfantAVenir" character varying(255),
  "IDAcquereurPlafondRessources" integer,
  "PrixDAchat" character varying(255),
  "TauxTVA" character varying(255),
  "ApportReelADateHorsSubvention" character varying(255),
  "Subvention" character varying(255),
  "DateDeReservation" character varying(255),
  "Date  signature de contrat de loc acc" character varying(255),
  "Date de transfert de propriété" character varying(255),
  "Adresse programme" character varying(255),
  "CP programme" character varying(255),
  "Ville programme" character varying(255),
  "Nom programme" character varying(255),
  "Type de programme" character varying(255),
  "Co-propriété" character varying(255),
  "Zone ANRU" character varying(255),
  "Type d'acquisition" character varying(255),
  "PrimoAccedant" character varying(255),
  "Modifications" character varying(255),
  "ReservesDE" character varying(255),
  "Date prévisionnelle livraison" character varying(255),
  "Date réelle livraison" character varying(255),
  "IDAcquereurTrancheAge" integer,
  "Etape" character varying(255),
  "IDConseillerCommercial" integer,
  "IDConseillerTechnique" integer,
  "EnqueteA" character varying(255),
  "EnqueteB" character varying(255),
  "EnqueteC" character varying(255),
  "SituationFamiliale" integer,
  "Adulte1Age" integer,
  "Adulte2Age" integer,
  "Adulte1CSP" integer,
  "Adulte2CSP" integer,
  "Adulte1Metier" character varying(255),
  "Adulte2Metier" character varying(255),
  "Adulte1CommuneTravail" character varying(255),
  "Adulte2CommuneTravail" character varying(255),
  "TypeDeMenage" integer,
  "AgeEnfant1" integer,
  "AgeEnfant2" integer,
  "AgeEnfant3" integer,
  "AgeEnfant4" integer,
  "AgeEnfant5" integer,
  "RevenuNetFoyerMensuel" character varying(255),
  "MultiAccedant" boolean,
  "RevenusNetImposableNMoins1" numeric(19,4),
  "Telephone_old" character varying(255),
  "TelPortable_old" character varying(255),
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
  "old_QuinzaineLivraisonPeriode" character varying(255),
  "old_PreviLivraisionDateEnvoiCourrier" timestamp without time zone,
  "old_PreviLivraisionRDVDate" timestamp without time zone,
  "old_PreviLivraisionRDVHeure" timestamp without time zone,
  "old_LivraisonDateEnvoiCourrier" timestamp without time zone,
  "old_LivraisonRDVDate" timestamp without time zone,
  "old_LivraisonRDVHeure" timestamp without time zone,
  "old_LivraisonTrimestrePrevueAuContrat" character varying(10),
  "old_LivraisonTrimestreDecale" character varying(255),
  "old_CDVPromo" text,
  "IDCivilite" integer,
  "Adulte1DateNaissance" timestamp without time zone,
  "Adulte2DateNaissance" timestamp without time zone,
  "InfoPourEntreprise" character varying(255),
  "curIDLot" integer,
  "curDateResa" timestamp without time zone,
  "CommuneOrigine" character varying(255),
  "DateModifAdresse" timestamp without time zone,
  "IDSituationFamille" integer,
  "PensionEtAutresRevenus" numeric(19,4),
  "LoyerActuel" numeric(19,4),
  "DureeFinancementEnMois" integer,
  "Adulte1LieuDeNaissance" character varying(255),
  "Adulte2LieuDeNaissance" character varying(255),
  "IDCivilite2" integer,
  "Patronyme2" character varying(255),
  "Prenom2" character varying(255),
  "NomComplet" character varying(255),
  "curDateAnnulation" timestamp without time zone,
  "DescriptionLotCourant" character varying(255),
  "Patronyme3" character varying(255),
  "Prenom3" character varying(255),
  "IDCivilite3" integer,
  "Email2" character varying(255),
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
  "RS" character varying(255),
  "Commentaires" text,
  "Commune" character varying(255),
  "IDArchitecte" integer
);
DROP TABLE IF EXISTS "tAssocie";
CREATE TABLE "tAssocie" (
  "RS" character varying(255),
  "FormeJuridique" character varying(255),
  "SIREN" character varying(255),
  "Adresse1" character varying(255),
  "Adresse2" character varying(255),
  "CP" character varying(10),
  "Commune" character varying(255),
  "Tel" character varying(255),
  "EstHLM" boolean,
  "ContactNomComplet" character varying(255),
  "ContactFonction" character varying(255),
  "EMail" character varying(255),
  "Commentaire" text,
  "IDAssocie" integer
);
DROP TABLE IF EXISTS "tAssuranceDoMrH";
CREATE TABLE "tAssuranceDoMrH" (
  "NumContrat" character varying(255),
  "TypeContrat" character varying(255),
  "DateSouscription" timestamp without time zone,
  "DateDGD" timestamp without time zone,
  "DateResiliation" timestamp without time zone,
  "AccordCadre" character varying(255),
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
  "NumContrat" character varying(255),
  "TypeContrat" character varying(255),
  "DateSouscription" timestamp without time zone,
  "DateEcheance" timestamp without time zone,
  "DateResiliation" timestamp without time zone,
  "MontantCotisation" numeric(24,6),
  "IDLot" integer,
  "Commentaire" text
);
DROP TABLE IF EXISTS "tBanque";
CREATE TABLE "tBanque" (
  "Libelle" character varying(255),
  "CCNom" character varying(50),
  "CCAdresse" character varying(255),
  "CCTel" character varying(20),
  "CCEMail" character varying(100),
  "PretNom" character varying(50),
  "PretAdresse" character varying(255),
  "PretTel" character varying(20),
  "PretEMail" character varying(100),
  "CCCP" character varying(10),
  "CCCommune" character varying(150),
  "PretCP" character varying(10),
  "PretCommune" character varying(150),
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
  "CAHT_Commentaire" character varying(255),
  "NbLot_VEFA" integer,
  "NbLot_LV_PSLA" integer,
  "NbLot_Autre" integer,
  "NbLot_Commentaire" character varying(255),
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
  "ReintegrationFiscaleComm" character varying(255),
  "DeductionFiscaleCOmm" character varying(255),
  "ReintHF_ResultFiscal" double precision,
  "DeducHF_PerteFiscale" double precision,
  "PourcHFAnnee" double precision,
  "DatePVAG" timestamp without time zone,
  "ResultFisca_SCCV_IS" double precision,
  "ResultFisca_SCCV_NonIS" double precision,
  "ReintHF_PerteComptable" double precision,
  "DeducHF_ResultComptable" double precision,
  "CommentairePourcHF" character varying(255),
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
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tCategorieSubvention-23062026";
CREATE TABLE "tCategorieSubvention-23062026" (
  "IDCategorieSubvention" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tCivilite";
CREATE TABLE "tCivilite" (
  "Libelle" character varying(255),
  "LibelleCourt" character varying(255),
  "Client" character varying(255),
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
  "Denomination" character varying(255),
  "Prenom" character varying(255),
  "Initiales" character varying(4),
  "EMail" character varying(255),
  "Societe" character varying(50),
  "Fonction" character varying(255),
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
  "PromoGesNom" character varying(255),
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
  "MotifAnnulation" character varying(255),
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
  "QuinzaineLivraisonPeriode_old" character varying(255),
  "PreviLivraisionDateEnvoiCourrier_old" timestamp without time zone,
  "PreviLivraisionRDVDate_old" timestamp without time zone,
  "PreviLivraisionRDVHeure_old" timestamp without time zone,
  "LivraisonDateEnvoiCourrier" timestamp without time zone,
  "LivraisonRDVDate" timestamp without time zone,
  "LivraisonRDVHeure" timestamp without time zone,
  "LivraisonTrimestrePrevueAuContrat" character varying(10),
  "LivraisonTrimestreDecale" character varying(255),
  "CDVPromo" text,
  "TMADateEnvoiCourrier" timestamp without time zone,
  "TMAMontantOuvertureDossier" numeric(19,4),
  "TMACommentaire" text,
  "TMADatePaiementSolde" timestamp without time zone,
  "TMAMailingListeDevis" character varying(255),
  "TMAMailingSolde" character varying(255),
  "DateEtatSortieLieux" timestamp without time zone,
  "AnnulationCommentaire" character varying(255),
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
  "TroisMoisAvantLivraisonPeriode" character varying(255),
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
  "CommentairesSouscription" character varying(255),
  "AvecClauseParticuliereComm" integer,
  "IDMotifClauseParticuliereComm" integer,
  "CommentaireClauseParticuliereComm" character varying(255),
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
  "NumCompte" character varying(50),
  "IBAN" character varying(255),
  "BIC" character varying(11),
  "EstCloture" boolean,
  "Commentaires" character varying(255),
  "IDStructureJuridique" integer,
  "IDCompteBanque" integer
);
DROP TABLE IF EXISTS "tCompteBanque_old";
CREATE TABLE "tCompteBanque_old" (
  "IDBanque" integer,
  "IDTypeCompteBanque" integer,
  "IDUtilisationCompte" integer,
  "NumCompte" character varying(50),
  "IBAN" character varying(255),
  "BIC" character varying(11),
  "EstCloture" boolean,
  "Commentaires" character varying(255),
  "IDStructureJuridique" integer,
  "IDCompteBanque" integer
);
DROP TABLE IF EXISTS "tConcept";
CREATE TABLE "tConcept" (
  "Libelle" character varying(255),
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
  "Commentaires" character varying(255),
  "FinSuivi" boolean
);
DROP TABLE IF EXISTS "tDestination";
CREATE TABLE "tDestination" (
  "IDDestination" integer,
  "Libelle" character varying(255),
  "Commentaire" text,
  "LibelleComm" character varying(255)
);
DROP TABLE IF EXISTS "tEnqueteClient";
CREATE TABLE "tEnqueteClient" (
  "Identifiant" character varying(255),
  "N° Lot" character varying(255),
  "Typologie" character varying(255),
  "Etage" character varying(255),
  "surface" character varying(255),
  "Nom Client" character varying(255),
  "Prénom Client" character varying(255),
  "Téléphone" character varying(255),
  "Email Client" character varying(255),
  "Adresse actuelle" character varying(255),
  "CP Actuel" character varying(255),
  "Ville actuelle" character varying(255),
  "Origine" character varying(255),
  "Revenus foyer fiscal" character varying(255),
  "Revenu foyer fiscal par quartile" character varying(255),
  "Année de déclaration" character varying(255),
  "Nombre d'adulte" character varying(255),
  "Nombre d'enfants" character varying(255),
  "Enfant à venir" character varying(255),
  "Plafond de ressources" character varying(255),
  "Prix d'achat" character varying(255),
  "Taux TVA" character varying(255),
  "apport réel à  date hors subvention" character varying(255),
  "Subvention" character varying(255),
  "Date de réservation" character varying(255),
  "Date  signature de contrat de loc acc" character varying(255),
  "Date de transfert de propriété" character varying(255),
  "Adresse programme" character varying(255),
  "CP programme" character varying(255),
  "Ville programme" character varying(255),
  "Nom programme" character varying(255),
  "Type de programme" character varying(255),
  "Co-propriété" character varying(255),
  "Zone ANRU" character varying(255),
  "Type d'acquisition" character varying(255),
  "Primo accedant" character varying(255),
  "Modifications" character varying(255),
  "Réserves DE" character varying(255),
  "Date prévisionnelle livraison" character varying(255),
  "Date réelle livraison" character varying(255),
  "Age chef de famille" character varying(255),
  "Etape" character varying(255),
  "Nom Conseiller commercial" character varying(255),
  "Email Conseiller Commercial" character varying(255),
  "Nom Conseiller Technique" character varying(255),
  "Email Conseiller Technique" character varying(255),
  "EnquêteA" character varying(255),
  "EnquêteB" character varying(255),
  "EnquêteC" character varying(255)
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
  "Libelle" character varying(255)
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
  "NumContrat" character varying(255),
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
  "InfosPretprevi" character varying(255),
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
  "Periodicite" character varying(255),
  "DateVerstPret" timestamp without time zone,
  "PrevMtOC" integer,
  "IDActionAlerte" integer,
  "EstPrlvFraisDossier" boolean,
  "HFCautionOC" boolean,
  "BlocageHonoOCMontant" numeric(19,4),
  "BlocageHonoOCFin" character varying(255),
  "BlocageHonoOCComment" character varying(255),
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
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tGFA";
CREATE TABLE "tGFA" (
  "IDGFA" integer,
  "IDTranche" integer,
  "SurOpe" boolean,
  "EstIntrinseque" boolean,
  "DateValidation" timestamp without time zone,
  "Commentaires" character varying(255),
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
  "CommGFA" character varying(255),
  "BaseInitialeGFA" numeric(19,4),
  "DatePremierPrlevtGFA" timestamp without time zone,
  "ApportPromoteurGFA" numeric(19,4),
  "IDStatutApportPromoteurGFA" integer,
  "PartSocialeComm" character varying(255)
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
  "Evenement" character varying(255),
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
  "Commentaires" character varying(255),
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
  "Commentaires" character varying(255),
  "PourcentageResa" real,
  "PourcentageActe" real
);
DROP TABLE IF EXISTS "tIndextaux";
CREATE TABLE "tIndextaux" (
  "IDIndextaux" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeActionAlerte";
CREATE TABLE "tListeActionAlerte" (
  "IDActionAlerte" integer,
  "Libelle" character varying(50)
);
DROP TABLE IF EXISTS "tListeAvancement";
CREATE TABLE "tListeAvancement" (
  "IDListeAvancement" integer,
  "Domaine" character varying(255),
  "Code" character varying(255),
  "Libelle" character varying(255),
  "LibelleMission" character varying(255),
  "AvecHonoGestion" boolean,
  "AvecAppelFondClient" boolean,
  "AvecEquivLgt" boolean,
  "Ordre" integer,
  "PourcentageStandard" real,
  "PlanningTxt" character varying(255),
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
  "Domaine" character varying(255),
  "Code" character varying(255),
  "Libelle" character varying(255),
  "LibelleMission" character varying(255),
  "AvecHonoGestion" boolean,
  "AvecAppelFondClient" boolean,
  "AvecEquivLgt" boolean,
  "Ordre" integer,
  "PourcentageStandard" real,
  "PlanningTxt" character varying(255),
  "PlanningCouleurFond" integer,
  "PlanningCouleurPolice" integer,
  "PourcentageAvancement" real
);
DROP TABLE IF EXISTS "tListeBudget";
CREATE TABLE "tListeBudget" (
  "IDListeBudget" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeFinPret";
CREATE TABLE "tListeFinPret" (
  "IDFinPret" integer,
  "Libelle" character varying(20)
);
DROP TABLE IF EXISTS "tListeFiscaliteAcquereur";
CREATE TABLE "tListeFiscaliteAcquereur" (
  "IDFiscaliteAcquereur" integer,
  "Libelle" character varying(50),
  "LibelleCourt" character varying(17)
);
DROP TABLE IF EXISTS "tListeModeRepartQuotePart";
CREATE TABLE "tListeModeRepartQuotePart" (
  "IDModeRepartQuotePart" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeNatureAchat";
CREATE TABLE "tListeNatureAchat" (
  "IDNatureAchat" integer,
  "Libelle" character varying(255),
  "LibelleLong" character varying(255),
  "OrdreComm" integer
);
DROP TABLE IF EXISTS "tListeOrganismeAgrement";
CREATE TABLE "tListeOrganismeAgrement" (
  "IDOrganismeAgrement" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeOrganismeGarantieEmprunt";
CREATE TABLE "tListeOrganismeGarantieEmprunt" (
  "IDOrganismeGarantieEmprunt" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListePhaseMontagePSLA";
CREATE TABLE "tListePhaseMontagePSLA" (
  "IDListePhaseMontagePSLA" integer,
  "Libelle" character varying(255),
  "Code" character varying(255)
);
DROP TABLE IF EXISTS "tListePrestataire";
CREATE TABLE "tListePrestataire" (
  "IDPrestataire" integer,
  "Libelle" character varying(255),
  "AfficherMission" boolean,
  "AfficherOperation" boolean,
  "MasquerComm1" boolean,
  "MasquerComm2" boolean
);
DROP TABLE IF EXISTS "tListeSituation";
CREATE TABLE "tListeSituation" (
  "IDSituation" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeStatutPartSociale";
CREATE TABLE "tListeStatutPartSociale" (
  "IDStatutPartSociale" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeTypeAcquereur";
CREATE TABLE "tListeTypeAcquereur" (
  "IDListeTypeAcquereur" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeTypeBien";
CREATE TABLE "tListeTypeBien" (
  "IDTypeDeBien" integer,
  "Libelle" character varying(255),
  "IDFamilleDeBien" integer
);
DROP TABLE IF EXISTS "tListeTypeCompteBanque";
CREATE TABLE "tListeTypeCompteBanque" (
  "IDTypeCompteBanque" integer,
  "Libelle" character varying(50)
);
DROP TABLE IF EXISTS "tListeTypeEvenement";
CREATE TABLE "tListeTypeEvenement" (
  "IDListeTypeEvenement" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tListeTypeFinancement";
CREATE TABLE "tListeTypeFinancement" (
  "IDTypeFinancement" integer,
  "Libelle" character varying(255),
  "Categorie" character varying(255)
);
DROP TABLE IF EXISTS "tListeTypeMission";
CREATE TABLE "tListeTypeMission" (
  "IDTypeMission" integer,
  "Libelle" character varying(255),
  "CoPromotion" boolean
);
DROP TABLE IF EXISTS "tListeTypePropriétaire";
CREATE TABLE "tListeTypePropriétaire" (
  "IDListeTypePropriétaire" integer,
  "Libelle" character varying(255),
  "EstInvestisseur" boolean
);
DROP TABLE IF EXISTS "tListeUtilisationCompte";
CREATE TABLE "tListeUtilisationCompte" (
  "IDUtilisationCompte" integer,
  "Libelle" character varying(20)
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
  "Numlot" character varying(255),
  "LotAssocie" character varying(255),
  "FamilleDeBien" character varying(255),
  "TypeDeBien" character varying(255),
  "Commentaire" character varying(255),
  "SurfHabitable" double precision,
  "SurfTerrasse" double precision,
  "SurfGarage" double precision,
  "SurfCave" double precision,
  "SurfBalcon" double precision,
  "SurfLoggias" double precision,
  "SurfRemise" double precision,
  "SurfJardin" double precision,
  "SurfTerrain" double precision,
  "NumEtage" character varying(255),
  "Exposition" character varying(255),
  "NumParcelle" character varying(255),
  "NumCopropriete" character varying(255),
  "Tantiemes" double precision,
  "PrixOrigine" double precision,
  "PrixDeVenteHT" double precision,
  "PrixDeVenteTTC" double precision,
  "TVA" character varying(255),
  "GrilleStatut" character varying(255),
  "PrixM2" double precision,
  "Grille Acquéreur - code" character varying(255),
  "Grille Acquéreur - nom" character varying(255),
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
  "Grille Commercial" character varying(255),
  "Grille Pct comm" double precision,
  "Grille Mnt Comm" double precision,
  "Notes" character varying(255),
  "MontantHonoCom" numeric(19,4),
  "Commercial" character varying(255),
  "IDCommercial" integer,
  "IDAcquereur" integer,
  "TauxCommResa" real,
  "TauxCommActe" real,
  "CommVendeurAVerserResa" numeric(19,4),
  "CommVendeurAVerserActe" numeric(19,4),
  "Adresse" character varying(255),
  "LocatairePatronyme" character varying(255),
  "LocatairePrenom" character varying(255),
  "LocataireCivilite" character varying(255),
  "LocataireTelephone" character varying(255),
  "LocatairePortable" character varying(255),
  "DateLivraison_old" timestamp without time zone,
  "PDL" character varying(50),
  "PCE" character varying(50),
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
  "Designation" character varying(255),
  "SurfaceUtile" real,
  "DescriptionAcquereurCourant" character varying(255)
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
  "Libelle" character varying(255),
  "CP" character varying(255),
  "Commune" character varying(255),
  "SurRennesMetropole" boolean,
  "ANRU" boolean,
  "Commentaire" text,
  "AnneeDGD" integer,
  "MasquerCommercial" boolean,
  "MasquerComptable" boolean,
  "IndivColl" integer,
  "Adresse" character varying(255),
  "NomZAC" character varying(255),
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
  "ANRUComment" character varying(255),
  "AvecAlerte" boolean,
  "IDSecteurGeographiqueDeveloppement" integer,
  "IDInterlocuteurNotaire_Notaire_Foncier" integer,
  "IDInterlocuteurNotaire_Notaire_Vente" integer,
  "AbreviationPourCodeReserve" character varying(5),
  "IDPersonne_Assistante" integer,
  "IDTypeFoncier" integer,
  "DateValidationEngagement" timestamp without time zone,
  "SynchroniserDatesEntreTranche" boolean,
  "DateAbandon" timestamp without time zone,
  "CommentairesAbandon" character varying(255),
  "PossibiliteInvestisseur" boolean,
  "TauxInvestisseurAutorise" real,
  "CommentaireInvestisseur" character varying(255),
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
  "NumAgrement" character varying(255),
  "CoutTotal" numeric(19,4),
  "MontantPSLA" numeric(19,4),
  "IDBanque" integer,
  "OrganismeGarantieEmprunt" integer,
  "DateDeliberationGarantie" timestamp without time zone,
  "IDTranche" integer,
  "GarantieEmpruntActionDate" timestamp without time zone,
  "old_GarantieEmpruntActionType" character varying(255),
  "Commentaire" text,
  "NbLogtAgrement" integer,
  "DateSignatureGarant" timestamp without time zone,
  "DateInfoAnnuelle" timestamp without time zone,
  "DateInfoFin" timestamp without time zone,
  "Commemtaires" character varying(255),
  "BanqueActionDate" timestamp without time zone,
  "old_BanqueActionType" character varying(255),
  "old_ActionDestinataire" character varying(255),
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
  "NumBureauGarantie" character varying(20),
  "NumConventionGarantie" character varying(20),
  "IDBanqueActionType" integer,
  "IDGarantieEmpruntActionType" integer
);
DROP TABLE IF EXISTS "tParam_old";
CREATE TABLE "tParam_old" (
  "IDParam" integer,
  "Param" character varying(255),
  "ValeurD" timestamp without time zone,
  "ValeurN" integer,
  "ValeurT" character varying(255)
);
DROP TABLE IF EXISTS "tParticipation";
CREATE TABLE "tParticipation" (
  "IDParticipation" integer,
  "IDStructureJuridique" integer,
  "IDAssocie" integer,
  "Pourcentage" double precision,
  "Commmentaires" character varying(255),
  "IDIndexTaux_Remuneration" integer,
  "DateFinRemuneration" timestamp without time zone,
  "IDMotifRemunerationAssocie" integer,
  "ConvTreso" boolean,
  "DateSignatureConv" timestamp without time zone,
  "DateApplication" timestamp without time zone,
  "InfoTauxRemuneration" character varying(255),
  "IDPeriodicite_Versement" integer
);
DROP TABLE IF EXISTS "tPersonne";
CREATE TABLE "tPersonne" (
  "IDPersonne" integer,
  "Patronyme" character varying(255),
  "Prenom" character varying(255),
  "EstPresent" boolean,
  "IDFonction" integer,
  "EMail" character varying(255),
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
  "Label" character varying(255)
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
  "Libelle" character varying(255),
  "NomInterne" character varying(255),
  "ServiceHF" character varying(255),
  "FilterIDOperation" boolean,
  "FilterIDEntreprise" boolean,
  "FilterIDAcquereur" boolean,
  "FilterIDLot" boolean,
  "FilterReserveRestantALever" boolean,
  "NomWinDev" character varying(255)
);
DROP TABLE IF EXISTS "tReserve";
CREATE TABLE "tReserve" (
  "IDReserve" integer,
  "ReserveCode" character varying(20),
  "IDTypeReserve" integer,
  "TravauxEffectues" boolean,
  "Reserve" character varying(255),
  "DateReclamation" timestamp without time zone,
  "DateDIntervention" timestamp without time zone,
  "IDLot" integer,
  "IDEntreprise" integer,
  "IDPiece" integer,
  "AncienNumLot" character varying(10),
  "AncienneEntreprise" character varying(50),
  "AncienneOperation" character varying(50),
  "AncienPiece" character varying(255),
  "AncienType" character varying(255),
  "EnvoyerMail" boolean,
  "EnvoyerMailDate" timestamp without time zone,
  "WindowsUser" character varying(255),
  "EstVerrouille" boolean,
  "IDAirBat" integer
);
DROP TABLE IF EXISTS "tReserveEntreprise";
CREATE TABLE "tReserveEntreprise" (
  "IDReserveEntreprise" integer,
  "RS" character varying(50),
  "Adresse1" character varying(50),
  "Adresse2" character varying(50),
  "CP" character varying(5),
  "Commune" character varying(30),
  "Telephone" character varying(15),
  "Fax" character varying(15),
  "Contact" character varying(20),
  "TelContact" character varying(50),
  "CorpsDEtat" character varying(50),
  "EMail" character varying(255)
);
DROP TABLE IF EXISTS "tReservePiece";
CREATE TABLE "tReservePiece" (
  "IDReservePiece" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tReserveType";
CREATE TABLE "tReserveType" (
  "IDReserveType" integer,
  "Libelle" character varying(60)
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
  "Libelle" character varying(255),
  "Adresse" character varying(255),
  "CP" character varying(255),
  "Commune" character varying(255)
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
  "LienHypertexte" character varying(255)
);
DROP TABLE IF EXISTS "tStructureJuridique";
CREATE TABLE "tStructureJuridique" (
  "IDStructureJuridique" integer,
  "RS" character varying(255),
  "NumTVAIntra" character varying(255),
  "Siret" numeric(19,4),
  "DateDebutActivite" timestamp without time zone,
  "DateImmat" timestamp without time zone,
  "EDI_TVA" boolean,
  "EDI_Liasse" boolean,
  "DateBilanDebutPremierExercice" timestamp without time zone,
  "DateBilanFinPremierExercice" timestamp without time zone,
  "DatePlanningCloture" character varying(255),
  "IDPersonneComptable" integer,
  "Stade" integer,
  "GestionnaireSCCV" character varying(255),
  "HFSGA" boolean,
  "DateLiquidation" timestamp without time zone,
  "old_CentreImpotsSIE" character varying(255),
  "InterlocuteurSIE" character varying(255),
  "IDSIE" integer,
  "IDCivilite" integer,
  "CpteFiscal" boolean,
  "DateModifCloture" character varying(255),
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
  "curAutreNom" character varying(255),
  "curAutreNomPourc" character varying(255)
);
DROP TABLE IF EXISTS "tStructureJuridique_Stade";
CREATE TABLE "tStructureJuridique_Stade" (
  "IDStructureJuridique_Stade" integer,
  "Libelle" character varying(255)
);
DROP TABLE IF EXISTS "tSubvention";
CREATE TABLE "tSubvention" (
  "IDSubvention" integer,
  "IDCategorieSubvention" integer,
  "Organisme_old" character varying(255),
  "NumConvention" character varying(255),
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
  "Organisme_old" character varying(255),
  "NumConvention" character varying(255),
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
  "RefDevis" character varying(30),
  "DateDevis" timestamp without time zone,
  "ObjetDevis" character varying(100),
  "DateSignatureDevis" timestamp without time zone,
  "MontantDevis" numeric(19,4),
  "MontantVersement1" numeric(19,4),
  "Commentaires" character varying(255),
  "IDCommercialisation" integer,
  "MontantVersement2" numeric(19,4)
);
DROP TABLE IF EXISTS "tTranche";
CREATE TABLE "tTranche" (
  "IDTranche" integer,
  "Libelle" character varying(255),
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
  "Adresse" character varying(255),
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
  "StadeCode" character varying(255),
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
  "FraisBudgetCommentaire" character varying(255),
  "FraisActuaDate" timestamp without time zone,
  "FraisActuaCommentaire" character varying(255),
  "FraisConsommeDate" timestamp without time zone,
  "FraisConsommeCommentaire" character varying(255),
  "FraisReelDate" timestamp without time zone,
  "FraisReelCommentaire" character varying(255),
  "CAHTActua" numeric(19,4),
  "CAHTReel" numeric(19,4),
  "TerrainMontantTTC" numeric(19,4),
  "TerrainCompromis_IDSignataire" integer,
  "CAHTPrevPSLA" numeric(19,4),
  "CAHTPrevVEFA" numeric(19,4),
  "CAHTPrevAutre" numeric(19,4),
  "CAHTPrevCommentaire" character varying(255),
  "DontLogtCollBRS" integer,
  "DontLogtIndivBRS" integer,
  "TerrainPourcAcptePrevu" real,
  "TerrainComment" character varying(255),
  "IDOFSNom" integer,
  "TerrainOFSMontantHT" numeric(19,4),
  "TerrainOFSAcptePourcPrevu" real,
  "TerrainOFSAcpteMontantVerse" real,
  "TerrainOFSCompromis_IDSignataire" integer,
  "old_DroitAppuiLogtMntUnitaire" numeric(19,4),
  "old_DroitAppuiLogtComment" character varying(255),
  "old_DroitAppuiSurfaceMntUnitaire" numeric(19,4),
  "old_DroitAppui_IDSurfaceNature" integer,
  "old_DroitAppuiSurfaceNbre" real,
  "old_DroitAppuiSurfaceComment" character varying(255),
  "old_DroitAppuiAutreMnt" numeric(19,4),
  "old_DroitAppuiAutreComment" character varying(255),
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
  "old_TerrainBailOperateurDatePrevi" timestamp without time zone,
  "old_TerrainBailOperateurDateReelle" timestamp without time zone,
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
  "Commentaire" character varying(255),
  "IDCommercialisation" integer,
  "DateCreation" timestamp without time zone
);
DROP TABLE IF EXISTS "tVersementDepotGarantie_old";
CREATE TABLE "tVersementDepotGarantie_old" (
  "IDVersementDepotGarantie" integer,
  "MontantVerse" real,
  "DateRemise" timestamp without time zone,
  "Commentaire" character varying(255),
  "IDCommercialisation" integer
);
