import { describe, expect, it } from 'vitest'

import {
  dateFr,
  lireMontant,
  lireSaisie,
  precomEnPourcent,
  valeursSuivi,
  voisinVertical,
} from './compta.helpers.ts'

describe('dateFr', () => {
  it('affiche une date ISO en jj/mm/aaaa, rien pour une date absente', () => {
    expect(dateFr('2026-10-15')).toBe('15/10/2026')
    expect(dateFr(null)).toBe('')
  })
})

describe('lireSaisie', () => {
  it('lit une date jj/mm/aaaa, vide = date effacée', () => {
    expect(lireSaisie('15/10/2026', 'date')).toBe('2026-10-15')
    expect(lireSaisie(' 15/10/2026 ', 'date')).toBe('2026-10-15')
    expect(lireSaisie('', 'date')).toBeNull()
  })

  it('accepte la date tapée sans séparateur, ou avec point ou tiret', () => {
    expect(lireSaisie('15102026', 'date')).toBe('2026-10-15')
    expect(lireSaisie('151026', 'date')).toBe('2026-10-15')
    expect(lireSaisie('15.10.2026', 'date')).toBe('2026-10-15')
    expect(lireSaisie('15-10-2026', 'date')).toBe('2026-10-15')
  })

  it('complète jour, mois et année abrégés', () => {
    expect(lireSaisie('5/3/26', 'date')).toBe('2026-03-05')
  })

  it("rejette une date qui n'existe pas ou qui ne se lit pas", () => {
    expect(lireSaisie('31/02/2026', 'date')).toBeUndefined()
    expect(lireSaisie('15/13/2026', 'date')).toBeUndefined()
    expect(lireSaisie('00/10/2026', 'date')).toBeUndefined()
    expect(lireSaisie('15/10', 'date')).toBeUndefined()
    expect(lireSaisie('2026-10-15', 'date')).toBeUndefined()
    expect(lireSaisie('abc', 'date')).toBeUndefined()
  })

  it('accepte le 29 février des années bissextiles seulement', () => {
    expect(lireSaisie('29/02/2028', 'date')).toBe('2028-02-29')
    expect(lireSaisie('29/02/2027', 'date')).toBeUndefined()
  })

  it('rogne un texte, vide = texte effacé', () => {
    expect(lireSaisie('  Banque ', 'texte')).toBe('Banque')
    expect(lireSaisie('   ', 'texte')).toBeNull()
  })

  it('un entier refuse les décimales, un montant les accepte', () => {
    expect(lireSaisie('5', 'entier')).toBe(5)
    expect(lireSaisie('2,5', 'entier')).toBeUndefined()
    expect(lireSaisie('2,5', 'montant')).toBe(2.5)
    expect(lireSaisie('', 'entier')).toBeNull()
  })
})

describe('voisinVertical', () => {
  // grille du Suivi résultat en réduction : 3 colonnes de 100, lignes de 30,
  // coût VEFA fusionné sur 2 lignes, ligne Total sans saisie (y 120 à 150),
  // commentaire sur les 3 colonnes
  const boite = (col: number, haut: number, bas: number, cols = 1) => ({
    left: col * 100,
    right: (col + cols) * 100,
    top: haut,
    bottom: bas,
  })
  const psla = [boite(0, 0, 30), boite(1, 0, 30), boite(2, 0, 30)]
  const vefaReduit = [boite(0, 30, 60), boite(1, 30, 60)]
  const vefaNormal = [boite(0, 60, 90), boite(1, 60, 90)]
  const coutVefa = boite(2, 30, 90)
  const autre = [boite(0, 90, 120), boite(1, 90, 120), boite(2, 90, 120)]
  const commentaire = boite(0, 150, 180, 3)
  const toutes = [
    ...psla,
    ...vefaReduit,
    coutVefa,
    ...vefaNormal,
    ...autre,
    commentaire,
  ]
  const voisin = (courante: (typeof toutes)[number], sens: 'haut' | 'bas') => {
    const autres = toutes.filter((b) => b !== courante)
    return autres[voisinVertical(courante, autres, sens)]
  }

  it('descend et monte dans la même colonne, à la cellule la plus proche', () => {
    expect(voisin(psla[0], 'bas')).toBe(vefaReduit[0])
    expect(voisin(vefaNormal[1], 'haut')).toBe(vefaReduit[1])
  })

  it('traverse la cellule fusionnée du coût VEFA dans les deux sens', () => {
    expect(voisin(psla[2], 'bas')).toBe(coutVefa)
    expect(voisin(coutVefa, 'bas')).toBe(autre[2])
    expect(voisin(autre[2], 'haut')).toBe(coutVefa)
    expect(voisin(coutVefa, 'haut')).toBe(psla[2])
  })

  it('saute la ligne Total, sans saisie', () => {
    expect(voisin(autre[0], 'bas')).toBe(commentaire)
  })

  it('depuis une cellule étendue, rejoint la colonne de son centre', () => {
    expect(voisin(commentaire, 'haut')).toBe(autre[1])
  })

  it('reste en place au bord de la grille', () => {
    expect(voisinVertical(psla[0], toutes.slice(1), 'haut')).toBe(-1)
    expect(voisinVertical(commentaire, toutes.slice(0, -1), 'bas')).toBe(-1)
  })
})

describe('lireMontant', () => {
  it('accepte la virgule, le point et les séparateurs de milliers', () => {
    expect(lireMontant('1 234,56')).toBe(1234.56)
    expect(lireMontant('1234.56')).toBe(1234.56)
    // espaces insécables du format affiché (fmtEuro)
    expect(lireMontant('886 303,00 €')).toBe(886303)
  })

  it('accepte les montants négatifs et le zéro', () => {
    expect(lireMontant('-1')).toBe(-1)
    expect(lireMontant('0')).toBe(0)
  })

  it('une cellule vidée efface le montant', () => {
    expect(lireMontant('')).toBeNull()
    expect(lireMontant('   ')).toBeNull()
  })

  it('rejette une saisie qui ne se lit pas comme un montant', () => {
    expect(lireMontant('abc')).toBeUndefined()
    expect(lireMontant('12,5,3')).toBeUndefined()
    expect(lireMontant('1e3')).toBeUndefined()
  })
})

describe('precomEnPourcent', () => {
  it('ramène en % les fractions du legacy', () => {
    expect(precomEnPourcent(0.4)).toBe(40)
    expect(precomEnPourcent(1)).toBe(100)
  })

  it('laisse les pourcentages et les vides', () => {
    expect(precomEnPourcent(38.86)).toBe(38.86)
    expect(precomEnPourcent(0)).toBe(0)
    expect(precomEnPourcent(null)).toBeNull()
  })
})

describe('valeursSuivi', () => {
  it("n'écrit que les clés présentes dans la fiche", () => {
    expect(
      valeursSuivi({
        id: 7,
        cahtPrevPsla: 0,
        cahtPrevCommentaire: '',
        fraisBudgetDate: '2026-09-29',
        fraisReelDate: null,
      }),
    ).toEqual({
      cahtPrevPsla: 0,
      cahtPrevCommentaire: null,
      fraisBudgetDate: new Date('2026-09-29'),
      fraisReelDate: null,
    })
  })

  it('ignore les colonnes de la tranche étrangères au suivi', () => {
    expect(
      valeursSuivi({ id: 7, libelle: 'X', operationId: 1 } as never),
    ).toEqual({})
  })
})
