import { existsSync, readFileSync } from 'node:fs'
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib'

import { expect, test } from 'vitest'

import { CHAMPS_IMPORT_LOT } from './importlots.helpers.ts'
import { ecrireXlsx, lireXlsx } from './xlsx.ts'

// Archive zip minimale (sans CRC : le lecteur ne le vérifie pas)
function zip(fichiers: Record<string, string>, compresser: boolean) {
  const enc = new TextEncoder()
  const locaux: Array<Uint8Array> = []
  const centraux: Array<Uint8Array> = []
  let position = 0
  for (const [nom, contenu] of Object.entries(fichiers)) {
    const brut = enc.encode(contenu)
    const donnees = compresser ? deflateRawSync(brut) : brut
    const n = enc.encode(nom)
    const local = new Uint8Array(30 + n.length + donnees.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(26, n.length, true)
    local.set(n, 30)
    local.set(donnees, 30 + n.length)
    const central = new Uint8Array(46 + n.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(10, compresser ? 8 : 0, true)
    cv.setUint32(20, donnees.length, true)
    cv.setUint32(24, brut.length, true)
    cv.setUint16(28, n.length, true)
    cv.setUint32(42, position, true)
    central.set(n, 46)
    locaux.push(local)
    centraux.push(central)
    position += local.length
  }
  const fin = new Uint8Array(22)
  const fv = new DataView(fin.buffer)
  fv.setUint32(0, 0x06054b50, true)
  fv.setUint16(10, centraux.length, true)
  fv.setUint32(16, position, true)
  return new Blob([
    ...locaux,
    ...centraux,
    fin,
  ] as Array<BlobPart>).arrayBuffer()
}

const CLASSEUR = {
  'xl/workbook.xml':
    '<workbook><sheets><sheet name="Lots" sheetId="1" r:id="rId7"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':
    '<Relationships><Relationship Id="rId1" Target="styles.xml"/><Relationship Id="rId7" Target="worksheets/lots.xml"/></Relationships>',
  'xl/sharedStrings.xml':
    '<sst><si><t>Numéro de lot</t></si><si><r><t>Prix </t></r><r><t xml:space="preserve">d&apos;origine</t></r></si><si><t>A&amp;B &#233;t&#xE9;</t></si></sst>',
  'xl/worksheets/lots.xml':
    '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
    '<row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3" s="4"/><c r="C3"><v>154502.37</v></c>' +
    '<c r="AB3" t="inlineStr"><is><t>fin</t></is></c></row>' +
    '</sheetData></worksheet>',
}

for (const compresser of [true, false])
  test(`lit la première feuille (${compresser ? 'compressée' : 'stockée'})`, async () => {
    const lignes = await lireXlsx(await zip(CLASSEUR, compresser))
    // C1 : texte enrichi en deux morceaux ; B1 absente du fichier
    expect(lignes[0]).toEqual(['Numéro de lot', null, "Prix d'origine"])
    // ligne 2 absente du fichier : les numéros de ligne Excel sont conservés
    expect(lignes[1]).toEqual([])
    expect(lignes[2].slice(0, 3)).toEqual(['A&B été', null, 154502.37])
    expect(lignes[2][27]).toBe('fin')
    expect(lignes[2]).toHaveLength(28)
  })

test('refuse ce qui n’est pas un classeur', async () => {
  await expect(
    lireXlsx(new TextEncoder().encode('a;b;c\n1;2;3').buffer),
  ).rejects.toThrow(/classeur Excel/)
})

test('écrit un classeur que le lecteur relit', async () => {
  const classeur = await ecrireXlsx([
    ['Nom', 'Prix', 'Date', 'Actif'],
    ['A&B <été>\u0001', 154502.37, new Date('2023-03-01T00:00:00Z'), true],
    [null, '', '035000'],
  ])
  const octets = new Uint8Array(await classeur.arrayBuffer())
  // archive valide pour Excel : CRC de la première entrée ([Content_Types].xml)
  const vue = new DataView(octets.buffer)
  const nom = vue.getUint16(26, true)
  const contenu = inflateRawSync(
    octets.subarray(30 + nom, 30 + nom + vue.getUint32(18, true)),
  )
  expect(vue.getUint32(14, true)).toBe(crc32(contenu))

  expect(await lireXlsx(octets.buffer)).toEqual([
    ['Nom', 'Prix', 'Date', 'Actif'],
    // caractère de contrôle retiré ; 01/03/2023 = numéro de série 44986
    ['A&B <été>', 154502.37, 44986, 'Oui'],
    // cellules vides non écrites ; le code postal reste du texte
    [null, null, '035000'],
  ])
})

// Le fichier fourni par le client fait foi pour la table de correspondance
const REEL = 'migration_windev/ChampImportLot.xlsx'
test.skipIf(!existsSync(REEL))(
  'la correspondance reprend ChampImportLot.xlsx',
  async () => {
    const f = readFileSync(REEL)
    const lignes = await lireXlsx(
      f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength),
    )
    expect(lignes[0].slice(1)).toEqual(['ColonneExcel', 'ChampSQL'])
    const attendu = lignes
      .slice(1)
      .map((l) => [l[1], String(l[2]).toLowerCase()])
      .sort()
    const champSql = (c: string) =>
      // noms legacy : SurfBalcon, PrixDeVenteHT, Numlot, TVA…
      c.replace('prixVente', 'prixDeVente').toLowerCase()
    expect(
      CHAMPS_IMPORT_LOT.map((c) => [c.colonne, champSql(c.champ)]).sort(),
    ).toEqual(attendu)
  },
)
