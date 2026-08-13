// Sérialisation CSV « Excel français » : séparateur « ; », BOM UTF-8,
// dates jj/mm/aaaa, décimales à virgule. Partagée entre l'export générique
// DataTable (client) et les exports serveur (remplace QueryToExcel WinDev).

export const champCsv = (v: unknown): string => {
  if (v == null) return ''
  const brut =
    v instanceof Date
      ? v.toLocaleDateString('fr-FR')
      : typeof v === 'boolean'
        ? v
          ? 'Oui'
          : 'Non'
        : typeof v === 'number'
          ? String(v).replace('.', ',')
          : String(v)
  return /[";\n]/.test(brut) ? `"${brut.replaceAll('"', '""')}"` : brut
}

export const construireCsv = (lignes: Array<Array<unknown>>): string =>
  '\ufeff' + lignes.map((l) => l.map(champCsv).join(';')).join('\r\n')

// Client uniquement (déclenche un téléchargement navigateur)
export const telechargerCsv = (nomFichier: string, csv: string) => {
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = nomFichier
  a.click()
  URL.revokeObjectURL(url)
}
