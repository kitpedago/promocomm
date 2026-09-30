// Champs de la fiche Tranche, partagés par Paramètres (« Opérations, tranches
// et lots ») et le bouton « Modifier » de l'onglet Terrain d'Opérations.
import type { DescChamp } from '#/components/ModaleFiche'
import type { getOtlOptionsFn } from '#/lib/parametres.otl.ts'

type OptionsOtl = Awaited<ReturnType<typeof getOtlOptionsFn>>

// iso-fenêtre WinDev FEN_Fiche_Tranche (captures Fiche_Tranche_1/2.png) :
// bloc haut toujours visible, puis onglets Détails / Terrains
export const champsTranche = (
  options: OptionsOtl | undefined,
): Array<DescChamp> => [
  { k: 'libelle', l: 'Nom de la tranche', t: 'texte' },
  { k: 'adresse', l: 'Adresse', t: 'texte' },
  { k: 'dureeChantierMois', l: 'Durée chantier (mois)', t: 'entier' },
  { k: 'dateConvention', l: 'Date convention', t: 'date' },
  {
    k: 'dateLivraisonContractuelle',
    l: 'Livraison contractuelle',
    t: 'date',
  },
  { k: 'commentaire', l: 'Commentaires', t: 'long' },
  // après le commentaire (pleine largeur) : chaque saisie reste en face de
  // l'indicateur legacy qu'elle remplace, grisé
  { k: 'anneeFinTabbor', l: 'Année fin Tabbor', t: 'entier' },
  {
    k: 'finTabborAnnuel',
    l: 'Fin Tabbor annuel (stade GPA atteint en N-1)',
    t: 'bool',
    grise: true,
  },
  {
    k: 'dateFinCommercialisation',
    l: 'Date de fin de commercialisation',
    t: 'date',
  },
  {
    k: 'finCommercialisation',
    l: 'Fin commercialisation et livraison N-1 (tranche 100 % actée et livrée en N-1)',
    t: 'bool',
    grise: true,
  },
  { t: 'titre', l: 'Architectes' },
  {
    k: 'architecteMandataireId',
    l: 'Architecte mandataire',
    t: 'select',
    options: options?.architectes ?? [],
  },
  {
    k: 'architecteCotraitantId',
    l: 'Architecte cotraitant',
    t: 'select',
    options: options?.architectes ?? [],
  },
  { t: 'titre', l: 'Appel de fonds dérogatoire' },
  {
    k: 'avecAppelFondClientDerogatoire',
    l: 'Avec appel fonds client dérogatoire',
    t: 'bool',
  },

  { t: 'onglet', l: 'Détails' },
  { t: 'titre', l: 'Nb' },
  { k: 'nbLogtIndiv', l: 'Nb logt indiv.', t: 'entier', zeroSiVide: true },
  { k: 'dontLogtIndivPsla', l: 'Dont logt indiv. PSLA', t: 'entier' },
  { k: 'nbLogtColl', l: 'Nb logt coll.', t: 'entier', zeroSiVide: true },
  { k: 'dontLogtCollPsla', l: 'Dont logt coll. PSLA', t: 'entier' },
  {
    k: 'nbAutresLocaux',
    l: 'Nb autres locaux',
    t: 'entier',
    zeroSiVide: true,
  },
  { k: 'dontLogtIndivBrs', l: 'Dont logt indiv. BRS', t: 'entier' },
  { k: 'nbTerrain', l: 'Nb terrain', t: 'entier', zeroSiVide: true },
  { k: 'dontLogtCollBrs', l: 'Dont logt coll. BRS', t: 'entier' },
  { k: 'nbLvoPrev', l: 'Nb LV prévi.', t: 'entier', zeroSiVide: true },
  { t: 'titre', l: 'Intervalle stade avancement' },
  { k: 'nbEtage', l: 'Nb étages', t: 'entier', zeroSiVide: true },
  {
    k: 'typeBatimentId',
    l: 'Type bâtiment',
    t: 'select',
    options: options?.typesBatiment ?? [],
  },
  { t: 'titre', l: 'Certification & Label' },
  {
    k: 'certificationId',
    l: 'Certification',
    t: 'select',
    options: options?.certifications ?? [],
  },
  { k: 'labelId', l: 'Label', t: 'select', options: options?.labels ?? [] },
  {
    k: 'performanceEnergetiqueId',
    l: 'Performance énergétique',
    t: 'select',
    options: options?.performances ?? [],
  },
  { k: 'estMoeInterne', l: 'Est MOE interne', t: 'bool' },
  {
    k: 'missionMoeInterneId',
    l: 'Mission MOE interne',
    t: 'select',
    options: options?.missionsMoe ?? [],
  },

  { t: 'onglet', l: 'Terrains' },
  { t: 'titre', l: 'Terrain bilan opérateur' },
  { k: 'terrainMontantHt', l: 'Montant HT', t: 'nombre', zeroSiVide: true },
  { k: 'terrainMontantTtc', l: 'Montant TTC', t: 'nombre', zeroSiVide: true },
  { k: 'terrainPourcAcptePrevu', l: 'Acompte prévu', t: 'pourcent' },
  { k: 'terrainAcompte', l: 'Acompte', t: 'nombre' },
  {
    k: 'terrainSignataireId',
    l: 'Signataire compromis',
    t: 'select',
    options: options?.signataires ?? [],
  },
  { k: 'terrainCommentaire', l: 'Commentaire', t: 'long' },
  { t: 'titre', l: "Compromis terrain de l'OFS" },
  { k: 'ofsNomId', l: 'Nom OFS', t: 'select', options: options?.ofs ?? [] },
  {
    k: 'terrainOfsSignataireId',
    l: 'Signataire compromis',
    t: 'select',
    options: options?.signataires ?? [],
  },
  {
    k: 'terrainOfsMontantHt',
    l: 'Montant HT',
    t: 'nombre',
    zeroSiVide: true,
  },
  // fraction en base, comme l'acompte du bilan opérateur
  { k: 'terrainOfsAcptePourcPrevu', l: 'Acompte prévi', t: 'pourcent' },
  {
    k: 'terrainOfsAcpteMontantVerse',
    l: 'Acompte montant versé',
    t: 'nombre',
    zeroSiVide: true,
  },
  { k: 'terrainOfsCommentaire', l: 'Terrain OFS commentaire', t: 'long' },
]
