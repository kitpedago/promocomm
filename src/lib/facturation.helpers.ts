// Règles pures du module Facturation électronique (testées sans base)

// Associé KPI (associe.id = 1, cf. curPourcKPI dans etl/transform.ts) : seules
// les SCCV où il détient plus de 5 % entrent dans le module
export const ASSOCIE_KPI_ID = 1
export const SEUIL_KPI = 0.05

/** « SCCV LES BLEUETS » → « LES BLEUETS » */
export const sansPrefixeSccv = (rs: string) =>
  rs.replace(/^\s*SCCV\s+/i, '').trim()

/** SIREN = 9 premiers chiffres du SIRET ; vide si le SIRET est absent ou court */
export const siren = (siret: string | null | undefined) => {
  const chiffres = (siret ?? '').replace(/\D/g, '')
  return chiffres.length >= 9 ? chiffres.slice(0, 9) : ''
}

/** Adresse de facturation électronique : SIREN, « _ », suffixe du gestionnaire,
 *  vide si l'un des deux manque */
export const adresseFacturation = (
  siret: string | null | undefined,
  suffixe: string | null | undefined,
) => {
  const s = siren(siret)
  const suf = (suffixe ?? '').trim()
  return s && suf ? `${s}_${suf}` : ''
}

/** Colonne Compta : libellé court du gestionnaire, sinon son libellé */
export const libelleCompta = (
  libelle: string | null | undefined,
  libelleCourt: string | null | undefined,
) => (libelleCourt ?? '').trim() || (libelle ?? '').trim()
