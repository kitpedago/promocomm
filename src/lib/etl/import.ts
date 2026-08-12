import { promises as fs } from 'node:fs'
import path from 'node:path'

import { desc, eq, sql as dsql } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { importRuns } from '#/db/schema.ts'
import {
  BAK_DIR_IN_MSSQL,
  SOURCE_DB,
  getMssqlPool,
  openLongRunningPool,
} from './mssql.ts'

import type sql from 'mssql'

// Dossier hôte où déposer les .bak (monté dans promocomm-mssql sous /bak)
const BAK_DIR = path.resolve(process.cwd(), 'data/bak')
// Les tables copiées telles quelles atterrissent dans ce schéma PostgreSQL,
// rechargeable à volonté ; le schéma métier définitif vivra dans "public".
const LEGACY_SCHEMA = 'legacy'

export interface BakFile {
  name: string
  sizeMb: number
  modifiedAt: string
}

export interface EtlStatus {
  bakDir: string
  bakFiles: Array<BakFile>
  mssql: {
    up: boolean
    error: string | null
    sourceDbExists: boolean
    tableCount: number
  }
  runs: Array<typeof importRuns.$inferSelect>
}

export async function getStatus(): Promise<EtlStatus> {
  await fs.mkdir(BAK_DIR, { recursive: true })
  const entries = await fs.readdir(BAK_DIR)
  const bakFiles: Array<BakFile> = []
  for (const name of entries.filter((n) => /\.bak$/i.test(n)).sort()) {
    const st = await fs.stat(path.join(BAK_DIR, name))
    bakFiles.push({
      name,
      sizeMb: Math.round((st.size / 1024 / 1024) * 10) / 10,
      modifiedAt: st.mtime.toISOString(),
    })
  }

  const mssql: EtlStatus['mssql'] = {
    up: false,
    error: null,
    sourceDbExists: false,
    tableCount: 0,
  }
  try {
    const pool = await getMssqlPool()
    const dbs = await pool
      .request()
      .query<{ name: string }>('SELECT name FROM sys.databases')
    mssql.up = true
    mssql.sourceDbExists = dbs.recordset.some((d) => d.name === SOURCE_DB)
    if (mssql.sourceDbExists) {
      const count = await pool
        .request()
        .query<{ n: number }>(
          `SELECT COUNT(*) AS n FROM [${SOURCE_DB}].sys.tables`,
        )
      mssql.tableCount = count.recordset.at(0)?.n ?? 0
    }
  } catch (err) {
    mssql.error = err instanceof Error ? err.message : String(err)
  }

  const runs = await db
    .select()
    .from(importRuns)
    .orderBy(desc(importRuns.id))
    .limit(10)

  return { bakDir: BAK_DIR, bakFiles, mssql, runs }
}

export async function startImport(fileName: string): Promise<number> {
  if (!/^[\w. -]+\.bak$/i.test(fileName) || fileName.includes('..')) {
    throw new Error('Nom de fichier .bak invalide')
  }
  await fs.access(path.join(BAK_DIR, fileName))

  const running = await db
    .select({ id: importRuns.id })
    .from(importRuns)
    .where(eq(importRuns.status, 'running'))
  if (running.length > 0) {
    throw new Error(`Un import est déjà en cours (run #${running[0].id})`)
  }

  const [run] = await db
    .insert(importRuns)
    .values({ status: 'running', step: 'démarrage' })
    .returning({ id: importRuns.id })

  // Pipeline lancé en tâche de fond : la page suit la progression via import_runs
  void runPipeline(run.id, fileName).catch(async (err) => {
    await appendLog(run.id, `ERREUR : ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`)
    await db
      .update(importRuns)
      .set({ status: 'error', finishedAt: new Date() })
      .where(eq(importRuns.id, run.id))
  })

  return run.id
}

async function setStep(runId: number, step: string) {
  await db.update(importRuns).set({ step }).where(eq(importRuns.id, runId))
  await appendLog(runId, `— ${step}`)
}

async function appendLog(runId: number, line: string) {
  await db
    .update(importRuns)
    .set({ log: dsql`${importRuns.log} || ${line + '\n'}` })
    .where(eq(importRuns.id, runId))
}

const quotePg = (ident: string) => `"${ident.slice(0, 63).replaceAll('"', '""')}"`
const quoteMs = (ident: string) => `[${ident.replaceAll(']', ']]')}]`
const escapeMsString = (v: string) => v.replaceAll("'", "''")

// Correspondance de types SQL Server → PostgreSQL pour la copie brute
function msTypeToPg(dataType: string, precision?: number, scale?: number): string {
  switch (dataType.toLowerCase()) {
    case 'int':
      return 'integer'
    case 'bigint':
      return 'bigint'
    case 'smallint':
    case 'tinyint':
      return 'smallint'
    case 'bit':
      return 'boolean'
    case 'decimal':
    case 'numeric':
      return precision ? `numeric(${precision},${scale ?? 0})` : 'numeric'
    case 'money':
    case 'smallmoney':
      return 'numeric(19,4)'
    case 'float':
      return 'double precision'
    case 'real':
      return 'real'
    case 'date':
      return 'date'
    case 'time':
      return 'time'
    case 'datetime':
    case 'datetime2':
    case 'smalldatetime':
      return 'timestamp'
    case 'datetimeoffset':
      return 'timestamptz'
    case 'uniqueidentifier':
      return 'uuid'
    case 'binary':
    case 'varbinary':
    case 'image':
    case 'timestamp': // rowversion SQL Server, rien à voir avec une date
      return 'bytea'
    default:
      // char/varchar/nchar/nvarchar/text/ntext/xml/sql_variant…
      return 'text'
  }
}

async function runPipeline(runId: number, fileName: string) {
  const pool = await openLongRunningPool()
  const pg = db.$client
  try {
    // 1. Restauration du .bak dans le SQL Server d'ETL
    await setStep(runId, `restauration de ${fileName} (peut prendre plusieurs minutes)`)
    const disk = `${BAK_DIR_IN_MSSQL}/${fileName}`
    const fileList = await pool
      .request()
      .query<{ LogicalName: string; Type: string }>(
        `RESTORE FILELISTONLY FROM DISK = N'${escapeMsString(disk)}'`,
      )
    const moves = fileList.recordset
      .map(
        (f, i) =>
          `MOVE N'${escapeMsString(f.LogicalName)}' TO N'/var/opt/mssql/data/${SOURCE_DB}_${i}.${f.Type === 'L' ? 'ldf' : 'mdf'}'`,
      )
      .join(', ')
    await pool.request().query(`
      IF DB_ID(N'${SOURCE_DB}') IS NOT NULL
        ALTER DATABASE ${quoteMs(SOURCE_DB)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      RESTORE DATABASE ${quoteMs(SOURCE_DB)}
        FROM DISK = N'${escapeMsString(disk)}'
        WITH REPLACE, RECOVERY, ${moves};
      ALTER DATABASE ${quoteMs(SOURCE_DB)} SET MULTI_USER;
    `)
    await appendLog(runId, `Base ${SOURCE_DB} restaurée.`)

    // 2. Inventaire des tables utilisateur
    await setStep(runId, 'inventaire des tables')
    const tables = (
      await pool.request().query<{
        schemaName: string
        tableName: string
        rowCount: number
      }>(`
        SELECT s.name AS schemaName, t.name AS tableName, SUM(p.rows) AS [rowCount]
        FROM ${quoteMs(SOURCE_DB)}.sys.tables t
        JOIN ${quoteMs(SOURCE_DB)}.sys.schemas s ON s.schema_id = t.schema_id
        JOIN ${quoteMs(SOURCE_DB)}.sys.partitions p
          ON p.object_id = t.object_id AND p.index_id IN (0, 1)
        GROUP BY s.name, t.name
        ORDER BY s.name, t.name
      `)
    ).recordset
    await db
      .update(importRuns)
      .set({ tablesTotal: tables.length })
      .where(eq(importRuns.id, runId))
    await appendLog(runId, `${tables.length} tables trouvées.`)

    // 3. Schéma legacy recréé de zéro à chaque chargement
    await setStep(runId, `recréation du schéma PostgreSQL "${LEGACY_SCHEMA}"`)
    await pg.query(`DROP SCHEMA IF EXISTS ${LEGACY_SCHEMA} CASCADE`)
    await pg.query(`CREATE SCHEMA ${LEGACY_SCHEMA}`)

    // 4. Copie brute table par table
    let done = 0
    for (const t of tables) {
      const pgTableName =
        t.schemaName === 'dbo' ? t.tableName : `${t.schemaName}__${t.tableName}`
      await setStep(
        runId,
        `copie ${t.schemaName}.${t.tableName} (${done + 1}/${tables.length})`,
      )

      const columns = (
        await pool
          .request()
          .input('s', t.schemaName)
          .input('t', t.tableName)
          .query<{
            COLUMN_NAME: string
            DATA_TYPE: string
            NUMERIC_PRECISION: number | null
            NUMERIC_SCALE: number | null
          }>(`
            SELECT COLUMN_NAME, DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE
            FROM ${quoteMs(SOURCE_DB)}.INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @t
            ORDER BY ORDINAL_POSITION
          `)
      ).recordset
      if (columns.length === 0) continue

      const colDefs = columns
        .map(
          (c) =>
            `${quotePg(c.COLUMN_NAME)} ${msTypeToPg(c.DATA_TYPE, c.NUMERIC_PRECISION ?? undefined, c.NUMERIC_SCALE ?? undefined)}`,
        )
        .join(', ')
      const target = `${LEGACY_SCHEMA}.${quotePg(pgTableName)}`
      await pg.query(`CREATE TABLE ${target} (${colDefs})`)

      const copied = await copyTable(pool, pg, t.schemaName, t.tableName, target, columns)
      done += 1
      await db
        .update(importRuns)
        .set({ tablesDone: done })
        .where(eq(importRuns.id, runId))
      await appendLog(
        runId,
        `${t.schemaName}.${t.tableName} → ${copied} lignes`,
      )
    }

    // 5. Transformation vers le schéma métier (public), relançable
    await setStep(runId, 'transformation vers le schéma métier')
    const { runTransform } = await import('./transform.ts')
    await runTransform((line) => appendLog(runId, line))

    await setStep(runId, 'terminé')
    await db
      .update(importRuns)
      .set({ status: 'done', finishedAt: new Date() })
      .where(eq(importRuns.id, runId))
  } finally {
    await pool.close().catch(() => {})
  }
}

// Copie en flux : lecture MSSQL avec pause/reprise, insertions PG par paquets
async function copyTable(
  pool: sql.ConnectionPool,
  pg: (typeof db)['$client'],
  schemaName: string,
  tableName: string,
  target: string,
  columns: Array<{ COLUMN_NAME: string }>,
): Promise<number> {
  const colNames = columns.map((c) => c.COLUMN_NAME)
  const insertCols = colNames.map(quotePg).join(', ')
  // Limite pg : 65 535 paramètres par requête — on garde de la marge
  const batchSize = Math.min(500, Math.max(1, Math.floor(30_000 / colNames.length)))

  async function insertBatch(rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return
    const values: Array<unknown> = []
    const tuples = rows.map((row, r) => {
      const placeholders = colNames.map((c, i) => {
        values.push(row[c] ?? null)
        return `$${r * colNames.length + i + 1}`
      })
      return `(${placeholders.join(',')})`
    })
    await pg.query(
      `INSERT INTO ${target} (${insertCols}) VALUES ${tuples.join(',')}`,
      values,
    )
  }

  return new Promise<number>((resolve, reject) => {
    const request = pool.request()
    request.stream = true
    let batch: Array<Record<string, unknown>> = []
    let total = 0
    let inflight: Promise<void> = Promise.resolve()
    let failed = false

    request.on('row', (row: Record<string, unknown>) => {
      if (failed) return
      batch.push(row)
      total += 1
      if (batch.length >= batchSize) {
        const rows = batch
        batch = []
        request.pause()
        inflight = insertBatch(rows)
          .then(() => request.resume())
          .catch((err) => {
            failed = true
            request.cancel()
            reject(err)
          })
      }
    })
    request.on('error', (err) => {
      if (!failed) {
        failed = true
        reject(err)
      }
    })
    request.on('done', () => {
      void inflight
        .then(() => insertBatch(batch))
        .then(() => {
          if (!failed) resolve(total)
        })
        .catch((err) => {
          if (!failed) reject(err)
        })
    })
    void request.query(
      `SELECT * FROM ${quoteMs(SOURCE_DB)}.${quoteMs(schemaName)}.${quoteMs(tableName)}`,
    )
  })
}
