// Règles pures du module Compta & Finances, partagées serveur/client (testées).
import { enPourcent } from '#/lib/sccv.helpers.ts'

// tGFA.PrecomPourc : le legacy mélange fractions (0,4 — fiches jusqu'en 2023)
// et pourcentages (40 — fiches depuis 2024). L'application parle en %.
// ponytail: seuil à 1 (une précommercialisation ≤ 1 % n'existe pas) ;
// normaliser la colonne en base le jour où le legacy n'est plus réimporté
export function precomEnPourcent(v: number | null): number | null {
  return v != null && v <= 1 ? enPourcent(v) : v
}

// Saisie d'une cellule de montant : null = cellule vidée, undefined = saisie
// illisible (rien n'est enregistré). Virgule ou point, milliers espacés.
export function lireMontant(texte: string): number | null | undefined {
  const net = texte.replace(/[\s€]/g, '').replace(',', '.')
  if (net === '') return null
  return /^-?\d+(\.\d+)?$/.test(net) ? Number(net) : undefined
}

// Date ISO (aaaa-mm-jj) affichée jj/mm/aaaa, comme elle se saisit
export const dateFr = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split('-').reverse().join('/') : ''

// Date saisie au clavier : jj/mm/aaaa, séparateur / . ou -, ou d'un bloc
// (jjmmaaaa, jjmmaa). Année sur 2 chiffres = 20aa. Rend la date ISO.
function lireDate(texte: string): string | null | undefined {
  const net = texte.trim()
  if (net === '') return null
  const m =
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/.exec(net) ??
    /^(\d{2})(\d{2})(\d{4}|\d{2})$/.exec(net)
  if (!m) return undefined
  const [jour, mois, an] = [m[1], m[2], m[3]].map(Number)
  const annee = m[3].length === 2 ? 2000 + an : an
  // une date qui n'existe pas (31/02) déborde sur le mois suivant
  const d = new Date(Date.UTC(annee, mois - 1, jour))
  return d.getUTCFullYear() === annee &&
    d.getUTCMonth() === mois - 1 &&
    d.getUTCDate() === jour
    ? d.toISOString().slice(0, 10)
    : undefined
}

// Saisie directe d'un champ du suivi, selon son type — mêmes conventions que
// lireMontant : null = champ vidé, undefined = saisie illisible
export type TypeSaisie = 'montant' | 'entier' | 'texte' | 'date'

export function lireSaisie(
  texte: string,
  type: TypeSaisie,
): number | string | null | undefined {
  if (type === 'texte') return texte.trim() || null
  if (type === 'date') return lireDate(texte)
  const n = lireMontant(texte)
  return type === 'entier' && n != null && !Number.isInteger(n) ? undefined : n
}

// Flèches haut/bas d'une grille de saisie : cellule la plus proche au-dessus
// ou en dessous dont la largeur couvre le centre de la cellule courante.
// Par la géométrie (mêmes champs que DOMRect) : cellules fusionnées et lignes
// sans saisie se règlent seules. Indice dans `autres`, -1 au bord de la grille.
export interface Boite {
  left: number
  right: number
  top: number
  bottom: number
}

export function voisinVertical(
  courante: Boite,
  autres: ReadonlyArray<Boite>,
  sens: 'haut' | 'bas',
): number {
  const centre = (courante.left + courante.right) / 2
  let voisin = -1
  let ecartVoisin = Infinity
  autres.forEach((b, i) => {
    if (centre < b.left || centre > b.right) return
    const ecart =
      sens === 'bas' ? b.top - courante.bottom : courante.top - b.bottom
    // 2 px de tolérance : les bordures fusionnées se chevauchent
    if (ecart >= -2 && ecart < ecartVoisin) {
      voisin = i
      ecartVoisin = ecart
    }
  })
  return voisin
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
