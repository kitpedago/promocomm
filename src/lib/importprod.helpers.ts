// Construction des INSERT par paquets pour la copie prod → base locale
// (src/lib/importprod.server.ts). Isolé ici pour être testable sans base.

export interface Colonne {
  nom: string
  // json/jsonb : la valeur relue par `pg` est déjà désérialisée (objet, mais
  // aussi bien chaîne ou nombre). Renvoyée telle quelle, `pg` n'encode que les
  // objets — une chaîne partirait en texte brut et PostgreSQL la refuserait
  // (« invalid input syntax for type json »), un tableau partirait en littéral
  // de tableau SQL. On ré-encode donc nous-mêmes.
  json: boolean
}

// PostgreSQL plafonne à 65535 paramètres par requête : le paquet est
// dimensionné selon la largeur de la table (ex. 120 colonnes → 500 lignes),
// sinon les tables larges échouent.
export function taillePaquet(nbColonnes: number) {
  return Math.max(1, Math.floor(60_000 / Math.max(1, nbColonnes)))
}

export function valeurParam(colonne: Colonne, valeur: unknown) {
  if (!colonne.json || valeur === null || valeur === undefined) return valeur
  return JSON.stringify(valeur)
}

export function construireInsert(
  table: string,
  colonnes: Array<Colonne>,
  lignes: Array<Record<string, unknown>>,
) {
  const liste = colonnes.map((c) => `"${c.nom}"`).join(',')
  const params: Array<unknown> = []
  const tuples = lignes.map((ligne) => {
    const ph = colonnes.map((_, k) => `$${params.length + k + 1}`)
    for (const c of colonnes) params.push(valeurParam(c, ligne[c.nom]))
    return `(${ph.join(',')})`
  })
  return {
    sql: `INSERT INTO public."${table}" (${liste}) VALUES ${tuples.join(',')}`,
    params,
  }
}
