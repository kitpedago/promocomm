// Règles pures du module SAV, partagées serveur/client (testées).

// Transpose NextCodeReserve (COL_ProcéduresGlobales) : parmi les codes du lot,
// garder ceux de longueur maximale, prendre le plus grand (tri texte), couper
// au dernier « / » ; si la droite est numérique, incrémenter en 2 chiffres
// minimum. Sinon chaîne vide (l'utilisateur saisit son code).
export function nextCodeReserve(codes: Array<string | null>): string {
  const valides = codes.filter((c): c is string => !!c)
  if (valides.length === 0) return ''
  const maxLen = Math.max(...valides.map((c) => c.length))
  const dernier = valides
    .filter((c) => c.length === maxLen)
    .sort()
    .at(-1)!
  const pos = dernier.lastIndexOf('/')
  if (pos < 0) return ''
  const droite = dernier.slice(pos + 1)
  if (!/^\d+$/.test(droite)) return ''
  return dernier.slice(0, pos + 1) + String(Number(droite) + 1).padStart(2, '0')
}
