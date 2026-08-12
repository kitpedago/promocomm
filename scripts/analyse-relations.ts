// Reconstitue les relations implicites de la base WinDev restaurée (promocomm_src) :
// colonnes nommées comme la PK d'une autre table mais sans FK déclarée, validées
// contre les données (taux d'orphelins). Usage : tsx --env-file=.env scripts/analyse-relations.ts
import { SOURCE_DB, getMssqlPool } from '#/lib/etl/mssql.ts'

// Tables héritées à ignorer (copies, archives, purement techniques ou vides de sens)
const JUNK =
  /^(sysdiagrams|REQ_|Structure|Copie |ImportLotPromoGes|DataLots|CommuneEtZonePourImport|NumEtageTemp)|(_old|_copie|_ExportErrors)$/i

const DB = `[${SOURCE_DB}]`
const pool = await getMssqlPool()
const q = async <T,>(sql: string) => (await pool.request().query<T>(sql)).recordset

interface Pk {
  tbl: string
  pk_col: string
  type: string
  rows: number
}
const pks = await q<Pk>(`
  SELECT t.name AS tbl, c.name AS pk_col, ty.name AS type,
         (SELECT SUM(p.rows) FROM ${DB}.sys.partitions p WHERE p.object_id=t.object_id AND p.index_id IN (0,1)) AS rows
  FROM ${DB}.sys.tables t
  JOIN ${DB}.sys.indexes i ON i.object_id=t.object_id AND i.is_primary_key=1
  JOIN ${DB}.sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
  JOIN ${DB}.sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
  JOIN ${DB}.sys.types ty ON ty.user_type_id=c.user_type_id
  WHERE i.is_primary_key=1`)

// pk name (minuscule) → table canonique (on écarte les tables "junk" et vides)
const pkMap = new Map<string, Pk>()
for (const p of pks) {
  if (JUNK.test(p.tbl) || p.type !== 'int') continue
  const key = p.pk_col.toLowerCase()
  const prev = pkMap.get(key)
  if (!prev || (prev.rows === 0 && p.rows > 0)) pkMap.set(key, p)
}

const declared = new Set(
  (
    await q<{ tbl: string; col: string }>(`
      SELECT tp.name AS tbl, cp.name AS col
      FROM ${DB}.sys.foreign_keys fk
      JOIN ${DB}.sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
      JOIN ${DB}.sys.tables tp ON tp.object_id=fk.parent_object_id
      JOIN ${DB}.sys.columns cp ON cp.object_id=fkc.parent_object_id AND cp.column_id=fkc.parent_column_id`)
  ).map((r) => `${r.tbl}.${r.col}`.toLowerCase()),
)

const cols = await q<{ tbl: string; col: string; rows: number }>(`
  SELECT t.name AS tbl, c.name AS col,
         (SELECT SUM(p.rows) FROM ${DB}.sys.partitions p WHERE p.object_id=t.object_id AND p.index_id IN (0,1)) AS rows
  FROM ${DB}.sys.tables t
  JOIN ${DB}.sys.columns c ON c.object_id=t.object_id
  JOIN ${DB}.sys.types ty ON ty.user_type_id=c.user_type_id
  WHERE ty.name IN ('int','bigint','smallint')`)

const quote = (s: string) => `[${s.replaceAll(']', ']]')}]`

interface Candidate {
  from: string
  col: string
  to: string
  toPk: string
  exact: boolean
}
const candidates: Array<Candidate> = []
for (const c of cols) {
  if (JUNK.test(c.tbl) || c.rows === 0) continue
  if (declared.has(`${c.tbl}.${c.col}`.toLowerCase())) continue
  const lc = c.col.toLowerCase()
  // correspondance exacte (IDOperation) ou par suffixe/préfixe (Adulte1CSP, IDIndexTaux_Remuneration)
  let target = pkMap.get(lc)
  let exact = true
  if (target && target.tbl === c.tbl) continue // PK de la table elle-même
  if (!target) {
    exact = false
    const matches = [...pkMap.values()].filter(
      (p) =>
        p.tbl !== c.tbl &&
        p.pk_col.length >= 5 &&
        (lc.startsWith(p.pk_col.toLowerCase()) || lc.endsWith(p.pk_col.toLowerCase().replace(/^id/, ''))),
    )
    if (matches.length !== 1) continue
    target = matches[0]
    // évite le bruit des colonnes trop génériques
    if (!/^id/i.test(c.col) && !lc.includes(target.pk_col.toLowerCase().replace(/^id/, ''))) continue
  }
  candidates.push({ from: c.tbl, col: c.col, to: target.tbl, toPk: target.pk_col, exact })
}

console.log(`${candidates.length} relations candidates à valider…\n`)
console.log('source.colonne -> cible | renseignées | orphelines | verdict')

for (const c of candidates.sort((a, b) => a.from.localeCompare(b.from))) {
  const [r] = await q<{ filled: number; orphans: number }>(`
    SELECT
      (SELECT COUNT(*) FROM ${DB}.dbo.${quote(c.from)} s WHERE s.${quote(c.col)} IS NOT NULL AND s.${quote(c.col)} <> 0) AS filled,
      (SELECT COUNT(*) FROM ${DB}.dbo.${quote(c.from)} s
        WHERE s.${quote(c.col)} IS NOT NULL AND s.${quote(c.col)} <> 0
          AND NOT EXISTS (SELECT 1 FROM ${DB}.dbo.${quote(c.to)} r WHERE r.${quote(c.toPk)} = s.${quote(c.col)})) AS orphans`)
  if (r.filled === 0) continue
  const ratio = r.orphans / r.filled
  const verdict = ratio === 0 ? 'OK' : ratio < 0.02 ? `OK~ (${r.orphans} orphelines)` : `REJET (${Math.round(ratio * 100)}% orphelines)`
  console.log(
    `${c.from}.${c.col} -> ${c.to}.${c.toPk}${c.exact ? '' : ' [heuristique]'} | ${r.filled} | ${r.orphans} | ${verdict}`,
  )
}
process.exit(0)
