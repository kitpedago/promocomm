// Lecture minimale d'un classeur .xlsx (archive zip de fichiers XML), sans
// dépendance : première feuille → matrice de cellules. Tourne dans le
// navigateur comme sous Node (DecompressionStream, TextDecoder).
// ponytail: valeurs brutes seulement — ni dates, ni formats, ni zip64, ni
// feuilles suivantes. Passer à une bibliothèque (SheetJS) si un import en a
// besoin.

export type Cellule = string | number | null

const TAILLE_MAX = 20 * 1024 * 1024

interface Entree {
  methode: number
  tailleCompressee: number
  taille: number
  debut: number
}

// Répertoire central du zip : nom de fichier → emplacement des données
function entrees(octets: Uint8Array): Map<string, Entree> {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength)
  // fin de répertoire central : signature cherchée depuis la fin (le
  // commentaire d'archive, de taille variable, la suit)
  let fin = octets.length - 22
  while (fin >= 0 && vue.getUint32(fin, true) !== 0x06054b50) fin--
  if (fin < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx)")
  const nb = vue.getUint16(fin + 10, true)
  let p = vue.getUint32(fin + 16, true)
  const noms = new TextDecoder()
  const out = new Map<string, Entree>()
  for (let i = 0; i < nb; i++) {
    if (p + 46 > octets.length || vue.getUint32(p, true) !== 0x02014b50)
      throw new Error('Classeur Excel illisible (archive endommagée)')
    const tailleNom = vue.getUint16(p + 28, true)
    const enTete = vue.getUint32(p + 42, true)
    out.set(noms.decode(octets.subarray(p + 46, p + 46 + tailleNom)), {
      methode: vue.getUint16(p + 10, true),
      tailleCompressee: vue.getUint32(p + 20, true),
      taille: vue.getUint32(p + 24, true),
      // les données suivent l'en-tête local, dont nom et extra sont variables
      debut:
        enTete +
        30 +
        vue.getUint16(enTete + 26, true) +
        vue.getUint16(enTete + 28, true),
    })
    p +=
      46 + tailleNom + vue.getUint16(p + 30, true) + vue.getUint16(p + 32, true)
  }
  return out
}

async function texte(octets: Uint8Array, e: Entree | undefined) {
  if (!e) return null
  if (e.taille > TAILLE_MAX) throw new Error('Classeur Excel trop volumineux')
  const donnees = octets.subarray(e.debut, e.debut + e.tailleCompressee)
  if (e.methode === 0) return new TextDecoder().decode(donnees)
  if (e.methode !== 8)
    throw new Error('Classeur Excel illisible (compression non gérée)')
  const flux = new Blob([donnees as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(flux).text()
}

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}
const decoder = (s: string) =>
  s
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (tout, e: string) =>
      e[0] === '#'
        ? String.fromCodePoint(
            e[1].toLowerCase() === 'x'
              ? parseInt(e.slice(2), 16)
              : Number(e.slice(1)),
          )
        : (ENTITES[e] ?? tout),
    )
    // retour chariot échappé par Excel dans les cellules multilignes
    .replaceAll('_x000D_', '')

const attribut = (balise: string, nom: string) =>
  new RegExp(`\\s${nom}="([^"]*)"`).exec(balise)?.[1]

// texte d'un <si> ou <is> : ses morceaux <t> mis bout à bout (texte enrichi)
const morceaux = (xml: string) =>
  decoder(
    [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((m) => m[1])
      .join(''),
  )

// « AB12 » → 27 (index de colonne, base 0)
function colonne(ref: string) {
  let n = 0
  for (const c of ref.toUpperCase()) {
    if (c < 'A' || c > 'Z') break
    n = n * 26 + c.charCodeAt(0) - 64
  }
  return n - 1
}

export async function lireXlsx(
  fichier: ArrayBuffer,
): Promise<Array<Array<Cellule>>> {
  if (fichier.byteLength > TAILLE_MAX)
    throw new Error('Classeur Excel trop volumineux')
  const octets = new Uint8Array(fichier)
  const zip = entrees(octets)

  // première feuille du classeur, par sa relation (elle ne s'appelle pas
  // toujours sheet1.xml)
  const classeur = (await texte(octets, zip.get('xl/workbook.xml'))) ?? ''
  const idFeuille = attribut(/<sheet\b[^>]*>/.exec(classeur)?.[0] ?? '', 'r:id')
  const relations =
    (await texte(octets, zip.get('xl/_rels/workbook.xml.rels'))) ?? ''
  const cible = [...relations.matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((r) => attribut(r, 'Id') === idFeuille)
  const chemin = (attribut(cible ?? '', 'Target') ?? 'worksheets/sheet1.xml')
    .replace(/^\/?xl\//, '')
    .replace(/^\//, '')
  const feuille = await texte(octets, zip.get(`xl/${chemin}`))
  if (feuille == null) throw new Error('Classeur Excel sans feuille lisible')

  const partagees = [
    ...((await texte(octets, zip.get('xl/sharedStrings.xml'))) ?? '').matchAll(
      /<si>([\s\S]*?)<\/si>/g,
    ),
  ].map((m) => morceaux(m[1]))

  const lignes: Array<Array<Cellule>> = []
  for (const l of feuille.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const numero = Number(attribut(l[1], 'r')) || lignes.length + 1
    // les lignes vides ne sont pas écrites : on garde les numéros Excel
    while (lignes.length < numero) lignes.push([])
    const ligne = lignes[numero - 1]
    // 2ᵉ groupe : « /> » (cellule sans contenu) ou le contenu jusqu'à </c>
    for (const c of l[2].matchAll(/<c\b([^>]*?)(\/>|>[\s\S]*?<\/c>)/g)) {
      const i = colonne(attribut(c[1], 'r') ?? '')
      if (i < 0) continue
      const type = attribut(c[1], 't')
      const brut = /<v>([\s\S]*?)<\/v>/.exec(c[2])?.[1]
      let valeur: Cellule = null
      if (type === 'inlineStr') valeur = morceaux(c[2])
      else if (brut == null || type === 'e') valeur = null
      else if (type === 's') valeur = partagees[Number(brut)] ?? null
      else if (type === 'str' || type === 'd') valeur = decoder(brut)
      else valeur = Number(brut)
      while (ligne.length < i) ligne.push(null)
      ligne[i] = valeur === '' ? null : valeur
    }
  }
  return lignes
}
