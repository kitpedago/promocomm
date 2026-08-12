import sql from 'mssql'

// Base restaurée depuis le .bak client (SQL Server du profil docker "etl")
export const SOURCE_DB = 'promocomm_src'
// Point de montage de ./data/bak dans le conteneur promocomm-mssql
export const BAK_DIR_IN_MSSQL = '/bak'

// MSSQL_URL est une chaîne ADO.NET (Server=host,port;User Id=..;Password=..)
function parseAdoUrl(url: string): sql.config {
  const parts = new Map<string, string>()
  for (const chunk of url.split(';')) {
    const i = chunk.indexOf('=')
    if (i > 0) parts.set(chunk.slice(0, i).trim().toLowerCase(), chunk.slice(i + 1).trim())
  }
  const [host, port] = (parts.get('server') ?? 'localhost')
    .replace(/^tcp:/i, '')
    .split(',')
  return {
    server: host,
    port: port ? Number(port) : 1433,
    database: parts.get('database') ?? 'master',
    user: parts.get('user id') ?? parts.get('uid'),
    password: parts.get('password') ?? parts.get('pwd'),
    connectionTimeout: 8000,
    options: {
      encrypt: false,
      trustServerCertificate: /^true$/i.test(
        parts.get('trustservercertificate') ?? '',
      ),
      // Les datetime SQL Server sont des heures « murales » : on les garde telles quelles
      useUTC: false,
    },
  }
}

function buildConfig(requestTimeoutMs: number): sql.config {
  const url = process.env.MSSQL_URL
  if (!url) throw new Error('MSSQL_URL non défini (.env)')
  return { ...parseAdoUrl(url), requestTimeout: requestTimeoutMs }
}

let defaultPool: sql.ConnectionPool | null = null

// Pool partagé pour les requêtes courtes (statut, inventaire)
export async function getMssqlPool(): Promise<sql.ConnectionPool> {
  if (defaultPool?.connected) return defaultPool
  if (defaultPool) {
    await defaultPool.close().catch(() => {})
    defaultPool = null
  }
  defaultPool = await new sql.ConnectionPool(buildConfig(30_000)).connect()
  return defaultPool
}

// Pool dédié aux opérations longues (RESTORE, SELECT * complets) — à fermer par l'appelant
export async function openLongRunningPool(): Promise<sql.ConnectionPool> {
  return new sql.ConnectionPool(buildConfig(4 * 3600_000)).connect()
}
