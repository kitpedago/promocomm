// Copie des données d'une base PostgreSQL vers une autre, schéma `public`
// seulement. Le schéma cible est supposé déjà à jour (migrations drizzle) :
// aucune structure n'est recopiée, donc aucun binaire externe (pg_dump/psql)
// n'est requis — contrairement au mode « base de test » du SaaS ISFEC dont ce
// module est la transposition.
import { Client } from 'pg'

import { construireInsert, taillePaquet } from '#/lib/importprod.helpers.ts'

export interface ResultatImportProd {
  tables: number
  lignes: number
  echecs: Array<{ table: string; erreur: string }>
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Comptes : ni vidés ni recopiés. On reste connecté après la copie, et les
// comptes locaux (npm run db:seed) survivent. `user_pref` suit `user` — les
// préférences de la source pointeraient vers des utilisateurs absents ici
// (lignes orphelines, la FK n'étant pas vérifiée en mode replica).
export const TABLES_EXCLUES = [
  'user',
  'session',
  'account',
  'verification',
  'user_pref',
]

/** Vide `cible` (schéma public) et y recopie les données de `source`. */
export async function copierBase(
  urlSource: string,
  urlCible: string,
): Promise<ResultatImportProd> {
  // Sans ce garde, un .env mal renseigné ferait tronquer la production.
  if (urlSource === urlCible)
    throw new Error('Source et cible identiques : copie refusée')

  const source = new Client({ connectionString: urlSource })
  const cible = new Client({ connectionString: urlCible })
  try {
    await source.connect()
  } catch (e) {
    throw new Error('Connexion à la source impossible : ' + message(e))
  }
  try {
    await cible.connect()
  } catch (e) {
    await source.end().catch(() => {})
    throw new Error('Connexion à la base cible impossible : ' + message(e))
  }

  try {
    // Les tables de référence sont celles de la cible : une table ajoutée en
    // dev et absente de la source est simplement vidée, elle ne fait pas
    // échouer la copie. Le schéma `legacy` (ETL .bak) n'est pas touché.
    const tables = (
      await cible.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema='public' AND table_type='BASE TABLE'
          ORDER BY table_name`,
      )
    ).rows
      .map((r) => r.table_name)
      .filter((t) => !TABLES_EXCLUES.includes(t))
    if (tables.length === 0) throw new Error('Aucune table dans la base cible')

    // replica : les clés étrangères ne contraignent plus l'ordre d'insertion.
    await cible.query('SET session_replication_role = replica')
    await cible.query(
      `TRUNCATE ${tables.map((t) => `public."${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
    )

    let lignes = 0
    // Une table en échec n'interrompt pas les suivantes (sinon, en ordre
    // alphabétique, tout ce qui suit resterait vide) : on collecte.
    const echecs: Array<{ table: string; erreur: string }> = []
    for (const t of tables) {
      try {
        const colonnes = (
          await cible.query<{ column_name: string; data_type: string }>(
            `SELECT column_name, data_type FROM information_schema.columns
              WHERE table_schema='public' AND table_name=$1
                AND is_generated='NEVER'
              ORDER BY ordinal_position`,
            [t],
          )
        ).rows.map((r) => ({
          nom: r.column_name,
          json: r.data_type === 'json' || r.data_type === 'jsonb',
        }))
        if (colonnes.length === 0) continue
        const liste = colonnes.map((c) => `"${c.nom}"`).join(',')
        const src = await source.query<Record<string, unknown>>(
          `SELECT ${liste} FROM public."${t}"`,
        )
        const paquet = taillePaquet(colonnes.length)
        for (let i = 0; i < src.rows.length; i += paquet) {
          const { sql, params } = construireInsert(
            t,
            colonnes,
            src.rows.slice(i, i + paquet),
          )
          await cible.query(sql, params)
        }
        lignes += src.rows.length
      } catch (e) {
        echecs.push({ table: t, erreur: message(e).slice(0, 200) })
      }
    }

    // Les clés primaires `serial` ont été recopiées telles quelles alors que
    // TRUNCATE a remis les séquences à 1 : sans ce recalage, la première
    // insertion applicative viole la clé primaire.
    const sequences = (
      await cible.query<{ t: string; c: string; seq: string | null }>(
        `SELECT table_name AS t, column_name AS c,
                pg_get_serial_sequence(format('%I.%I','public',table_name), column_name) AS seq
           FROM information_schema.columns
          WHERE table_schema='public'`,
      )
    ).rows.filter((r) => r.seq)
    for (const s of sequences) {
      await cible.query(
        `SELECT setval($1, COALESCE((SELECT MAX("${s.c}") FROM public."${s.t}"), 0) + 1, false)`,
        [s.seq],
      )
    }

    await cible.query('SET session_replication_role = default')
    return { tables: tables.length, lignes, echecs }
  } finally {
    await source.end().catch(() => {})
    await cible.end().catch(() => {})
  }
}
