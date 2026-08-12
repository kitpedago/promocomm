// Services (rôles) de l'app — transposé du code de démarrage WinDev (PRomoComm.wdp)
// et de FEN_Menu (visibilité des modules par service). Valeurs en dur pour l'instant,
// à passer en table plus tard (elles survivent aux réimports de .bak : la transformation
// ne touche que les tables du domaine). Les mots de passe vivent dans services.server.ts.

export const MODULES = [
  'commercialisation',
  'operations',
  'sav',
  'acquereurs',
  'sccv',
  'parametres',
  'compta',
  'bilan',
  'honoraires',
  'declarations',
] as const
export type Module = (typeof MODULES)[number]

// Libellés des tuiles du tableau de bord WinDev (FEN_Menu) — MODULES suit
// l'ordre des tuiles, le menu latéral le réutilise tel quel
export const MODULE_LABELS: Record<Module, string> = {
  commercialisation: 'Commercialisation',
  operations: 'Opérations',
  sav: 'SAV Promotion',
  acquereurs: 'Acquéreurs',
  sccv: 'SCCV',
  parametres: 'Paramètres',
  compta: 'Compta & Finances',
  bilan: 'Bilan',
  honoraires: 'Honoraires',
  declarations: 'Déclarations',
}

export interface Service {
  slug: string
  label: string
  // faux pour « Consultation » : connexion sans mot de passe (comme l'app WinDev)
  avecMotDePasse: boolean
  modules: ReadonlyArray<Module>
}

const TOUS = ['commercialisation', 'operations', 'acquereurs', 'sccv'] as const

// Ordre du code de démarrage WinDev (= ordre de la liste déroulante)
export const SERVICES: ReadonlyArray<Service> = [
  {
    slug: 'promo',
    label: 'Promotion',
    avecMotDePasse: true,
    modules: [...TOUS, 'sav', 'declarations'],
  },
  {
    slug: 'compta',
    label: 'Comptabilité',
    avecMotDePasse: true,
    modules: [
      ...TOUS,
      'parametres',
      'compta',
      'bilan',
      'honoraires',
      'declarations',
    ],
  },
  {
    slug: 'consultation',
    label: 'Consultation',
    avecMotDePasse: false,
    modules: [...TOUS, 'sav'],
  },
  {
    slug: 'dcial',
    label: 'Direction commercial',
    avecMotDePasse: true,
    modules: [...TOUS, 'parametres'],
  },
  {
    slug: 'admin',
    label: 'Administrateur',
    avecMotDePasse: true,
    modules: [...MODULES],
  },
  {
    slug: 'juridique',
    label: 'Juridique',
    avecMotDePasse: true,
    modules: [...TOUS],
  },
  {
    slug: 'direction-promo',
    label: 'Direction Promotion',
    avecMotDePasse: true,
    modules: [...TOUS, 'sav', 'parametres', 'honoraires', 'declarations'],
  },
]

// Comptes Better Auth techniques : un utilisateur par service
export const serviceEmail = (slug: string) => `${slug}@promocomm.local`

export const getService = (slug: string | null | undefined) =>
  SERVICES.find((s) => s.slug === slug)
