// Lecture et écriture minimales d'un classeur .xlsx (archive zip de fichiers
// XML), sans dépendance : première feuille ↔ matrice de cellules. Tourne dans
// le navigateur comme sous Node (DecompressionStream, TextDecoder).
// ponytail: lecture en valeurs brutes seulement — ni dates, ni formats, ni
// zip64, ni feuilles suivantes ; écriture d'une feuille sans mise en forme
// (dates exceptées). Passer à une bibliothèque (SheetJS) si un import ou un
// export en a besoin.

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

// ---------------------------------------------------------------------------
// Écriture : classeur à une feuille (remplace QueryToExcel WinDev)
// ---------------------------------------------------------------------------

const TABLE_CRC = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(octets: Uint8Array) {
  let c = 0xffffffff
  for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

async function compresser(octets: Uint8Array) {
  const flux = new Blob([octets as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(flux).arrayBuffer())
}

async function archiver(fichiers: Record<string, string>) {
  const enc = new TextEncoder()
  const locaux: Array<Uint8Array> = []
  const centraux: Array<Uint8Array> = []
  let position = 0
  for (const [nom, contenu] of Object.entries(fichiers)) {
    const brut = enc.encode(contenu)
    const donnees = await compresser(brut)
    const n = enc.encode(nom)
    // champs communs aux deux en-têtes, à partir de « version requise »
    const commun = new DataView(new ArrayBuffer(26))
    commun.setUint16(0, 20, true)
    commun.setUint16(4, 8, true) // deflate
    commun.setUint16(8, 0x21, true) // date DOS fixe : 1er janvier 1980
    commun.setUint32(10, crc32(brut), true)
    commun.setUint32(14, donnees.length, true)
    commun.setUint32(18, brut.length, true)
    commun.setUint16(22, n.length, true)
    const champs = new Uint8Array(commun.buffer)

    const local = new Uint8Array(30 + n.length + donnees.length)
    new DataView(local.buffer).setUint32(0, 0x04034b50, true)
    local.set(champs, 4)
    local.set(n, 30)
    local.set(donnees, 30 + n.length)

    const central = new Uint8Array(46 + n.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    central.set(champs, 6)
    cv.setUint32(42, position, true)
    central.set(n, 46)

    locaux.push(local)
    centraux.push(central)
    position += local.length
  }
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, centraux.length, true)
  fin.setUint16(10, centraux.length, true)
  fin.setUint32(
    12,
    centraux.reduce((t, c) => t + c.length, 0),
    true,
  )
  fin.setUint32(16, position, true)
  return [...locaux, ...centraux, new Uint8Array(fin.buffer)]
}

const echapper = (s: string) =>
  s
    // caractères de contrôle interdits en XML 1.0 : Excel refuse le classeur
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

// 27 → « AB » (inverse de colonne())
function lettres(i: number) {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function cellule(v: unknown, ref: string) {
  if (v == null || v === '') return ''
  // date : numéro de série Excel (jours depuis le 30/12/1899), lu en UTC comme
  // les timestamps de la base ; style 1 = format date de styles.xml
  if (v instanceof Date)
    return `<c r="${ref}" s="1"><v>${v.getTime() / 86_400_000 + 25_569}</v></c>`
  if (typeof v === 'number')
    return Number.isFinite(v) ? `<c r="${ref}"><v>${v}</v></c>` : ''
  const chaine = typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : String(v)
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${echapper(chaine)}</t></is></c>`
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
const NS = 'http://schemas.openxmlformats.org'
const TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml'

export async function ecrireXlsx(lignes: Array<Array<unknown>>): Promise<Blob> {
  const feuille = lignes
    .map(
      (l, i) =>
        `<row r="${i + 1}">${l.map((v, j) => cellule(v, lettres(j) + (i + 1))).join('')}</row>`,
    )
    .join('')
  return new Blob(
    (await archiver({
      '[Content_Types].xml':
        `${XML}<Types xmlns="${NS}/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        `<Override PartName="/xl/workbook.xml" ContentType="${TYPE}.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${TYPE}.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="${TYPE}.styles+xml"/>` +
        '</Types>',
      '_rels/.rels':
        `${XML}<Relationships xmlns="${NS}/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        '</Relationships>',
      'xl/workbook.xml':
        `${XML}<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships">` +
        '<sheets><sheet name="Feuil1" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':
        `${XML}<Relationships xmlns="${NS}/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
      // style 0 : standard ; style 1 : date courte (format 14)
      'xl/styles.xml':
        `${XML}<styleSheet xmlns="${NS}/spreadsheetml/2006/main">` +
        '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
        '</styleSheet>',
      'xl/worksheets/sheet1.xml': `${XML}<worksheet xmlns="${NS}/spreadsheetml/2006/main"><sheetData>${feuille}</sheetData></worksheet>`,
    })) as Array<BlobPart>,
    { type: `${TYPE}.sheet` },
  )
}
