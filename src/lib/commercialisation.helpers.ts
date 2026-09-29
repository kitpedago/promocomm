// Règles pures de la fiche commercialisation, partagées avec la modale
// (testées). Ports de CalculMontantHT / CalculRemise
// (COL_ProcéduresGlobales.wdg), taux exprimés en % comme dans la modale.

const arrondi2 = (n: number) => Math.round(n * 100) / 100

// ponytail: taux en dur, repris de tListetauxTVA (3 lignes, non reprise par
// l'ETL) — à passer en nomenclature si un taux est ajouté
export const TAUX_TVA = [5.5, 10, 20]

export function calculerMontantHt(
  montantTtc: number | null,
  tauxPourcent: number | null,
): number | null {
  if (montantTtc == null || tauxPourcent == null) return null
  return arrondi2(montantTtc / (1 + tauxPourcent / 100))
}

export function calculerRemise(
  prixGrilleTtc: number | null,
  prixReelTtc: number | null,
): number | null {
  if (prixGrilleTtc == null || prixReelTtc == null) return null
  return arrondi2(prixGrilleTtc - prixReelTtc)
}

// lot.tva est un texte libre dans le legacy (« 5.5 », « 5,5 », « 20 »)
export function tauxDepuisTexte(tva: string | null | undefined): number | null {
  const n = Number((tva ?? '').trim().replace(',', '.').replace('%', ''))
  return (tva ?? '').trim() !== '' && Number.isFinite(n) ? n : null
}
