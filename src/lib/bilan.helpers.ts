// Règles pures du module Bilan (FEN_TABLE_Bilan), partagées serveur/client.
// Colonnes calculées WinDev reproduites à l'identique — nz() legacy : null → 0
// quand au moins une composante existe, sinon la ligne reste vide (null).

const nz = (v: number | null | undefined) => v ?? 0
const tousNuls = (...v: Array<number | null | undefined>) =>
  v.every((x) => x == null)

// COL_CAHT_Total = somme des 6 composantes CA HT
export function cahtTotal(l: {
  cahtVefa: number | null
  cahtLvPsla: number | null
  cahtLoyers: number | null
  cahtTma: number | null
  cahtTerrain: number | null
  cahtAutres: number | null
}): number | null {
  if (
    tousNuls(
      l.cahtVefa,
      l.cahtLvPsla,
      l.cahtLoyers,
      l.cahtTma,
      l.cahtTerrain,
      l.cahtAutres,
    )
  )
    return null
  return (
    nz(l.cahtVefa) +
    nz(l.cahtLvPsla) +
    nz(l.cahtLoyers) +
    nz(l.cahtTma) +
    nz(l.cahtTerrain) +
    nz(l.cahtAutres)
  )
}

// COL_CalcTotal = Report à nouveau + Compte courant
export function affectationTotal(l: {
  ranSccv: number | null
  cpteCourantSccv: number | null
}): number | null {
  if (tousNuls(l.ranSccv, l.cpteCourantSccv)) return null
  return nz(l.ranSccv) + nz(l.cpteCourantSccv)
}

// COL_CalcResultatFiscalSCCV = Compta + Réintégration − Déduction
export function resultatFiscal(l: {
  resultCptaSccvTotal: number | null
  reintegrationFiscaleSccv: number | null
  deductionFiscaleSccv: number | null
}): number | null {
  if (
    tousNuls(
      l.resultCptaSccvTotal,
      l.reintegrationFiscaleSccv,
      l.deductionFiscaleSccv,
    )
  )
    return null
  return (
    nz(l.resultCptaSccvTotal) +
    nz(l.reintegrationFiscaleSccv) -
    nz(l.deductionFiscaleSccv)
  )
}

// COL_TotalSCCV = Résultat fiscal IS + Non IS
export function totalFiscalSccv(l: {
  resultFiscaSccvIs: number | null
  resultFiscaSccvNonIs: number | null
}): number | null {
  if (tousNuls(l.resultFiscaSccvIs, l.resultFiscaSccvNonIs)) return null
  return nz(l.resultFiscaSccvIs) + nz(l.resultFiscaSccvNonIs)
}

// COL_QuotePartIS / NonIS / Total : résultat fiscal × % KPI de l'année
// (fraction 0–1 ; WinDev ne calcule les QP unitaires que si le % est > 0)
export function quotePart(
  montant: number | null,
  pourcHfAnnee: number | null,
): number | null {
  if (montant == null || pourcHfAnnee == null || pourcHfAnnee <= 0) return null
  return montant * pourcHfAnnee
}

// validation iso-WinDev de la colonne Année
export function anneeInvalide(annee: number | null | undefined): boolean {
  return annee == null || annee <= 2000 || annee >= 2100
}
