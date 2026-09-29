// Import des lots d'une tranche depuis la trame Excel (FEN_Param,
// BTN_Importer_Lot). Règles pures, partagées entre l'aperçu (navigateur) et
// l'import (serveur), testées.
import { sansAccents } from '#/lib/utils.ts'

import type { Cellule } from '#/lib/xlsx.ts'

// Table ChampImportLot de WinDev (fichier HFSQL local, d'où son absence des
// sauvegardes SQL Server) : entête de colonne Excel → champ du lot.
export const CHAMPS_IMPORT_LOT = [
  { colonne: 'Numéro de lot', champ: 'numLot', type: 'texte' },
  { colonne: 'Famille de bien', champ: 'familleDeBien', type: 'texte' },
  { colonne: 'Type de bien', champ: 'typeDeBien', type: 'texte' },
  { colonne: 'N° étage', champ: 'numEtage', type: 'texte' },
  { colonne: 'Exposition', champ: 'exposition', type: 'texte' },
  { colonne: 'N°parcelle', champ: 'numParcelle', type: 'texte' },
  { colonne: 'Tantièmes', champ: 'tantiemes', type: 'nombre' },
  { colonne: 'Sfc habitable', champ: 'surfHabitable', type: 'nombre' },
  { colonne: 'Surf. utile', champ: 'surfaceUtile', type: 'nombre' },
  { colonne: 'Terrasse', champ: 'surfTerrasse', type: 'nombre' },
  { colonne: 'Balcon', champ: 'surfBalcon', type: 'nombre' },
  { colonne: 'Loggia', champ: 'surfLoggias', type: 'nombre' },
  { colonne: 'Garage', champ: 'surfGarage', type: 'nombre' },
  { colonne: 'Cave/cellier', champ: 'surfCave', type: 'nombre' },
  { colonne: 'Remise', champ: 'surfRemise', type: 'nombre' },
  { colonne: 'Jardin', champ: 'surfJardin', type: 'nombre' },
  { colonne: 'Surf. terrain', champ: 'surfTerrain', type: 'nombre' },
  { colonne: "Prix d'origine", champ: 'prixOrigine', type: 'nombre' },
  { colonne: 'Prix de vente HT', champ: 'prixVenteHt', type: 'nombre' },
  { colonne: 'Tx Vente', champ: 'tva', type: 'taux' },
  { colonne: 'Prix de vente TTC', champ: 'prixVenteTtc', type: 'nombre' },
  { colonne: 'Prix au m²', champ: 'prixM2', type: 'nombre' },
  { colonne: 'Caractéristique', champ: 'commentaire', type: 'texte' },
  { colonne: 'Notes', champ: 'notes', type: 'texte' },
] as const

type Champ = (typeof CHAMPS_IMPORT_LOT)[number]
type ChampTexte = Extract<Champ, { type: 'texte' | 'taux' }>['champ']
type ChampNombre = Extract<Champ, { type: 'nombre' }>['champ']
export type LotImporte = { [K in ChampTexte]: string | null } & {
  [K in ChampNombre]: number | null
}

export interface ImportPrepare {
  lots: Array<LotImporte>
  erreurs: Array<string>
}

// entêtes comparés sans casse, accents ni espaces (« N° parcelle »)
const cle = (v: Cellule) => sansAccents(String(v ?? '')).replace(/\s+/g, '')

// « 1 234,50 € » → 1234.5 ; undefined si ce n'est pas un nombre
function nombre(v: Cellule): number | null | undefined {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  // \s couvre aussi les espaces insécables des milliers
  const net = v.replace(/[\s€]|m²/g, '').replace(',', '.')
  if (net === '') return null
  const n = Number(net)
  return Number.isFinite(n) ? n : undefined
}

const arrondi4 = (n: number) => Math.round(n * 10000) / 10000

const texte = (v: Cellule) => {
  if (v == null) return null
  // 101 et non 101.00000000000001 (flottants d'Excel)
  const s = (typeof v === 'number' ? String(arrondi4(v)) : v).trim()
  return s === '' ? null : s
}

// lot.tva est un texte en % (« 5.5 », « 20 ») ; une cellule au format
// pourcentage arrive en fraction (0,055)
const taux = (v: Cellule) =>
  typeof v === 'number' && v > 0 && v < 1 ? texte(v * 100) : texte(v)

export function preparerImportLots(
  matrice: Array<Array<Cellule>>,
): ImportPrepare {
  const entetes = (matrice.at(0) ?? []).map(cle)
  const position = new Map<Champ, number>()
  for (const c of CHAMPS_IMPORT_LOT) {
    const i = entetes.indexOf(cle(c.colonne))
    if (i >= 0) position.set(c, i)
  }
  if (position.size === 0)
    return {
      lots: [],
      erreurs: [
        'Aucune colonne de lot trouvée en ligne 1 (Numéro de lot, Famille de bien…). Vérifier qu’il s’agit d’une trame de lots.',
      ],
    }
  const manquantes = CHAMPS_IMPORT_LOT.filter((c) => !position.has(c))
  if (manquantes.length > 0)
    return {
      lots: [],
      erreurs: [
        `${manquantes.length} colonne(s) absente(s) de la ligne 1 : ${manquantes
          .map((c) => `« ${c.colonne} »`)
          .join(', ')}.`,
      ],
    }

  const lots: Array<LotImporte> = []
  const erreurs: Array<string> = []
  for (let l = 1; l < matrice.length; l++) {
    const ligne = matrice[l]
    if (cle(ligne.at(0) ?? null) === 'totaux') break
    const lot: Record<string, string | number | null> = {}
    for (const c of CHAMPS_IMPORT_LOT) {
      const v = ligne.at(position.get(c)!) ?? null
      if (c.type === 'nombre') {
        const n = nombre(v)
        if (n === undefined)
          erreurs.push(
            `Ligne ${l + 1}, colonne « ${c.colonne} » : « ${String(v)} » n’est pas un nombre.`,
          )
        lot[c.champ] = n ?? null
      } else lot[c.champ] = c.type === 'taux' ? taux(v) : texte(v)
    }
    // ligne de séparation de la trame : rien dans aucune colonne de lot
    if (Object.values(lot).every((v) => v == null)) continue
    if (lot.numLot == null)
      erreurs.push(`Ligne ${l + 1} : numéro de lot manquant.`)
    lots.push(lot as LotImporte)
  }
  if (lots.length === 0 && erreurs.length === 0)
    erreurs.push('Aucun lot à importer sous la ligne d’entêtes.')
  return { lots, erreurs }
}
