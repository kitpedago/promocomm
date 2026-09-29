// Règles pures du module Compta & Finances, partagées serveur/client (testées).
import { enPourcent } from '#/lib/sccv.helpers.ts'

// tGFA.PrecomPourc : le legacy mélange fractions (0,4 — fiches jusqu'en 2023)
// et pourcentages (40 — fiches depuis 2024). L'application parle en %.
// ponytail: seuil à 1 (une précommercialisation ≤ 1 % n'existe pas) ;
// normaliser la colonne en base le jour où le legacy n'est plus réimporté
export function precomEnPourcent(v: number | null): number | null {
  return v != null && v <= 1 ? enPourcent(v) : v
}

// Colonnes de la tranche saisies dans l'accordéon Suivi dépenses & budget
const NOMBRES_SUIVI = [
  'cahtPrevPsla',
  'cahtPrevVefaReduit',
  'cahtPrevVefa',
  'cahtPrevAutre',
  'subvPrevPsla',
  'subvPrevVefaReduit',
  'subvPrevVefaNormal',
  'subvPrevAutre',
  'honoCommPsla',
  'honoCommVefaReduit',
  'honoCommVefaNormal',
  'honoCommAutre',
  'coutPrevPsla',
  'coutPrevVefa',
  'coutPrevAutre',
  'coutReelPsla',
  'coutReelVefa',
  'coutReelAutre',
  'quotePartPsla',
  'quotePartVefaReduit',
  'quotePartVefaNormal',
  'quotePartAutre',
  'modeRepartQuotePartId',
  'nbLvoPrev',
  'nbLvoPrevAnnee',
  'listeBudgetFraisStadeId',
  'typeMissionBudgetArchitecteId',
] as const
const TEXTES_SUIVI = [
  'cahtPrevCommentaire',
  'coutPrevCommentaire',
  'coutReelCommentaire',
  'quotePartCommentaire',
  'fraisBudgetCommentaire',
  'fraisActuaCommentaire',
  'fraisConsommeCommentaire',
  'fraisReelCommentaire',
] as const
const DATES_SUIVI = [
  'fraisBudgetDate',
  'fraisActuaDate',
  'fraisConsommeDate',
  'fraisReelDate',
  'dateContratArchitecte',
] as const

export type FicheSuivi = { id: number } & Partial<
  Record<(typeof NOMBRES_SUIVI)[number], number | null> &
    Record<(typeof TEXTES_SUIVI | typeof DATES_SUIVI)[number], string | null>
>

// Seules les clés présentes dans la fiche sont écrites (une modale par bloc),
// et seulement celles du suivi : le reste de la tranche est hors de portée
export function valeursSuivi(data: FicheSuivi) {
  const v: Record<string, number | string | Date | null> = {}
  for (const k of NOMBRES_SUIVI) if (k in data) v[k] = data[k] ?? null
  for (const k of TEXTES_SUIVI) if (k in data) v[k] = data[k] || null
  for (const k of DATES_SUIVI)
    if (k in data) v[k] = data[k] ? new Date(data[k]) : null
  return v
}
