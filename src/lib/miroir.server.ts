// Base miroir aux noms SQL Server (tOperation.IDOperation…), alimentée depuis
// `public`. Mapping : inversion de src/lib/etl/transform.ts (miroir.helpers.ts).
// Structure : miroir.schema.sql, snapshot du schéma `legacy` (import .bak).
//
// Rôles PostgreSQL, sur le serveur de DATABASE_URL :
//   miroir_ecrivain  propriétaire de la base miroir, seul à y écrire (le job)
//   miroir_lecteur   lecture seule, pour les outils externes (Power BI, WinDev…)
// Aucun des deux ne peut se connecter à la base de l'application (CONNECT
// retiré à PUBLIC) : un job buggé ne peut pas la toucher. Les mots de passe
// vivent chiffrés dans app_param (secrets.server.ts).
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { eq } from 'drizzle-orm'
import { Client } from 'pg'

import { dbLocale } from '#/db/index.ts'
import { appParam } from '#/db/schema.ts'
import { copies } from '#/lib/etl/transform.ts'
import { construireInsert, taillePaquet } from '#/lib/importprod.helpers.ts'
import {
  PLANIF_DEFAUT,
  inverser,
  normaliserPlanif,
  prochainPassage,
} from '#/lib/miroir.helpers.ts'
import { decryptSecret, encryptSecret } from '#/lib/secrets.server.ts'

import type { Planif } from '#/lib/miroir.helpers.ts'

const DDL = path.resolve(process.cwd(), 'src/lib/miroir.schema.sql')

export const ROLE_ECRIVAIN = 'miroir_ecrivain'
export const ROLE_LECTEUR = 'miroir_lecteur'

const PARAM_PLANIF = 'MiroirPlanification'
const PARAM_MDP_ECRIVAIN = 'MiroirEcrivainMotDePasse'
const PARAM_MDP_LECTEUR = 'MiroirLecteurMotDePasse'

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

// Passage planifié, création du lecteur, préparation : jamais deux à la fois
// sur le même serveur (GRANT/REASSIGN concurrents → « tuple concurrently updated »)
let verrou: Promise<unknown> = Promise.resolve()
function serialiser<T>(f: () => Promise<T>): Promise<T> {
  const p = verrou.then(f, f)
  verrou = p.catch(() => {})
  return p
}

// Nom de la base miroir ; vide = fonctionnalité désactivée
const nomMiroir = () => process.env.MIROIR_DB
const urlApp = () => process.env.DATABASE_URL
const configure = () => !!nomMiroir() && !!urlApp()

// URL de connexion au miroir pour un rôle (même serveur que l'application)
function urlPour(role: string, motDePasse: string) {
  const u = new URL(urlApp()!)
  u.username = role
  u.password = motDePasse
  u.pathname = '/' + nomMiroir()!
  return u.toString()
}

// alphanumérique : injectable tel quel dans ALTER ROLE (pas de paramètre possible)
const motDePasseAleatoire = () =>
  randomBytes(24).toString('base64url').replace(/[-_]/g, 'x').slice(0, 24)

async function lireParam(param: string) {
  const rows = await dbLocale
    .select({ valeur: appParam.valeur })
    .from(appParam)
    .where(eq(appParam.param, param))
  return rows.at(0)?.valeur ?? ''
}

async function ecrireParam(param: string, valeur: string) {
  await dbLocale
    .insert(appParam)
    .values({ param, valeur })
    .onConflictDoUpdate({ target: appParam.param, set: { valeur } })
}

async function roleExiste(client: Client, role: string) {
  const r = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [
    role,
  ])
  return r.rowCount === 1
}

async function definirRole(admin: Client, role: string, motDePasse: string) {
  if (!(await roleExiste(admin, role)))
    await admin.query(`CREATE ROLE ${role} LOGIN`)
  await admin.query(`ALTER ROLE ${role} WITH LOGIN PASSWORD '${motDePasse}'`)
}

/**
 * Prépare le miroir avec les droits de l'application (DATABASE_URL) : rôle
 * écrivain (mot de passe chiffré dans app_param, créé au besoin), base miroir
 * lui appartenant, base source fermée aux autres rôles. Idempotent ; à jouer
 * avant chaque passage. Renvoie l'URL de connexion de l'écrivain.
 */
export async function preparerMiroir(): Promise<string> {
  const nom = nomMiroir()
  const source = urlApp()
  if (!nom || !source) throw new Error('MIROIR_DB non configurée')
  const nomSource = new URL(source).pathname.slice(1)
  if (nom === nomSource)
    throw new Error("MIROIR_DB identique à la base de l'application : refusé")

  let mdp = decryptSecret(await lireParam(PARAM_MDP_ECRIVAIN))
  if (!mdp) {
    mdp = motDePasseAleatoire()
    await ecrireParam(PARAM_MDP_ECRIVAIN, encryptSecret(mdp))
  }

  const admin = new Client({ connectionString: source })
  await admin.connect()
  try {
    await definirRole(admin, ROLE_ECRIVAIN, mdp)
    await admin.query(`REVOKE CONNECT ON DATABASE "${nomSource}" FROM PUBLIC`)
    const r = await admin.query<{ owner: string }>(
      'SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = $1',
      [nom],
    )
    const owner = r.rows.at(0)?.owner
    if (!owner)
      await admin.query(`CREATE DATABASE "${nom}" OWNER ${ROLE_ECRIVAIN}`)
    else if (owner !== ROLE_ECRIVAIN)
      await admin.query(`ALTER DATABASE "${nom}" OWNER TO ${ROLE_ECRIVAIN}`)
  } finally {
    await admin.end().catch(() => {})
  }

  // Tables créées avant l'arrivée du rôle écrivain (ou par un autre rôle) :
  // il ne pourrait pas les vider. Vérifié à chaque passage, presque toujours vide.
  const u = new URL(source)
  u.pathname = '/' + nom
  const c = new Client({ connectionString: u.toString() })
  await c.connect()
  try {
    // REASSIGN OWNED impossible : le rôle de l'application est celui du
    // serveur (« required by the database system »), d'où table par table.
    const autres = await c.query<{ t: string }>(
      `SELECT tablename AS t FROM pg_tables
        WHERE schemaname = 'public' AND tableowner <> $1`,
      [ROLE_ECRIVAIN],
    )
    for (const { t } of autres.rows)
      await c.query(`ALTER TABLE public."${t}" OWNER TO ${ROLE_ECRIVAIN}`)
  } finally {
    await c.end().catch(() => {})
  }
  return urlPour(ROLE_ECRIVAIN, mdp)
}

// À rejouer après chaque DDL : les tables créées entre-temps n'ont pas le SELECT
async function accorderLecture(miroir: Client) {
  if (!(await roleExiste(miroir, ROLE_LECTEUR))) return false
  await miroir.query(`GRANT USAGE ON SCHEMA public TO ${ROLE_LECTEUR}`)
  await miroir.query(
    `GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${ROLE_LECTEUR}`,
  )
  return true
}

/**
 * Crée l'utilisateur lecteur ou réinitialise son mot de passe (conservé
 * chiffré dans app_param, relisible via motDePasseLecteur).
 */
export function creerLecteur() {
  if (etat().enCours)
    throw new Error('Rafraîchissement en cours : réessayer dans un instant')
  return serialiser(creerLecteurSerialise)
}

async function creerLecteurSerialise() {
  const urlEcrivain = await preparerMiroir()
  const motDePasse = motDePasseAleatoire()

  const admin = new Client({ connectionString: urlApp() })
  await admin.connect()
  try {
    await definirRole(admin, ROLE_LECTEUR, motDePasse)
  } finally {
    await admin.end().catch(() => {})
  }

  // droits accordés par le propriétaire du miroir
  const miroir = new Client({ connectionString: urlEcrivain })
  await miroir.connect()
  try {
    await miroir.query(
      `GRANT CONNECT ON DATABASE "${nomMiroir()}" TO ${ROLE_LECTEUR}`,
    )
    await miroir.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${ROLE_LECTEUR}`,
    )
    await accorderLecture(miroir)
  } finally {
    await miroir.end().catch(() => {})
  }
  await ecrireParam(PARAM_MDP_LECTEUR, encryptSecret(motDePasse))
  etat().lecteurExiste = true
  return { role: ROLE_LECTEUR, motDePasse }
}

/** Mot de passe lecteur enregistré ('' si jamais créé ou indéchiffrable). */
export async function motDePasseLecteur() {
  return decryptSecret(await lireParam(PARAM_MDP_LECTEUR))
}

export interface ResultatMiroir {
  tables: number
  lignes: number
  echecs: Array<{ table: string; erreur: string }>
  // le rôle lecteur existe (ses droits viennent d'être réaccordés)
  lecteur: boolean
}

/** Vide et recharge le miroir (`urlMiroir`, écrivain) depuis `public` de `urlSource`. */
export async function rafraichirMiroir(
  urlSource: string,
  urlMiroir: string,
  log: (ligne: string) => void = () => {},
): Promise<ResultatMiroir> {
  if (urlSource === urlMiroir)
    throw new Error('Source et miroir identiques : rafraîchissement refusé')

  const source = new Client({ connectionString: urlSource })
  await source.connect()
  const miroir = new Client({ connectionString: urlMiroir })
  try {
    await miroir.connect()
  } catch (e) {
    await source.end().catch(() => {})
    throw new Error('Connexion au miroir impossible : ' + message(e))
  }

  try {
    await miroir.query(await readFile(DDL, 'utf8'))
    const lecteur = await accorderLecture(miroir)
    let lignes = 0
    const echecs: ResultatMiroir['echecs'] = []
    for (const c of copies) {
      const inv = inverser(c)
      try {
        const src = await source.query<Record<string, unknown>>(inv.sql)
        await miroir.query(`TRUNCATE public."${inv.table}"`)
        const colonnes = inv.colonnes.map((col) => ({
          nom: col.legacy,
          json: false,
        }))
        const paquet = taillePaquet(colonnes.length)
        for (let i = 0; i < src.rows.length; i += paquet) {
          const { sql, params } = construireInsert(
            inv.table,
            colonnes,
            src.rows.slice(i, i + paquet),
          )
          await miroir.query(sql, params)
        }
        lignes += src.rows.length
        log(`${inv.table}: ${src.rows.length} lignes`)
      } catch (e) {
        echecs.push({ table: inv.table, erreur: message(e).slice(0, 200) })
        log(`${inv.table}: ERREUR ${message(e)}`)
      }
    }
    return { tables: copies.length, lignes, echecs, lecteur }
  } finally {
    await source.end().catch(() => {})
    await miroir.end().catch(() => {})
  }
}

/** Régénère miroir.schema.sql depuis le schéma `legacy` de `url` (après un import .bak). */
export async function genererDdl(url: string): Promise<number> {
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    const { rows } = await client.query<{ t: string; c: string; type: string }>(
      `SELECT table_name AS t, column_name AS c, format_type(a.atttypid, a.atttypmod) AS type
         FROM information_schema.columns i
         JOIN pg_attribute a ON a.attrelid = format('%I.%I', i.table_schema, i.table_name)::regclass
                            AND a.attname = i.column_name
        WHERE i.table_schema = 'legacy'
        ORDER BY table_name, ordinal_position`,
    )
    const tables = new Map<string, Array<string>>()
    for (const r of rows) {
      const cols = tables.get(r.t) ?? []
      cols.push(`"${r.c}" ${r.type}`)
      tables.set(r.t, cols)
    }
    const ddl = [
      `-- Généré par npm run db:miroir -- --ddl depuis le schéma legacy (${new Date().toISOString().slice(0, 10)}). Ne pas éditer.`,
      ...[...tables].map(
        ([t, cols]) =>
          // DROP + CREATE : le schéma legacy évolue à chaque .bak (colonnes,
          // types) et les tables sont de toute façon rechargées entièrement ;
          // le fichier part en une seule requête, donc en une transaction
          `DROP TABLE IF EXISTS "${t}";\nCREATE TABLE "${t}" (\n  ${cols.join(',\n  ')}\n);`,
      ),
    ].join('\n')
    await writeFile(DDL, ddl + '\n')
    return tables.size
  } finally {
    await client.end().catch(() => {})
  }
}

// --- Planification et état (page /admin/miroir) ---
// Un seul état par processus, y compris sous HMR.

export interface PassageMiroir {
  debut: string
  fin: string | null
  lignes: number
  tables: number
  echecs: ResultatMiroir['echecs']
  journal: string
  erreur: string | null
}

export interface EtatMiroir {
  configure: boolean
  // URL du miroir (rôle écrivain, sans mot de passe), pour affichage
  cible: string | null
  planif: Planif
  prochain: string | null
  enCours: boolean
  dernier: PassageMiroir | null
  lecteur: {
    role: string
    // URL de connexion sans mot de passe
    url: string | null
    // null = inconnu tant qu'aucun passage n'a eu lieu
    existe: boolean | null
  }
}

interface Etat {
  timer: ReturnType<typeof setTimeout> | null
  planif: Planif | null // null = pas encore armé
  prochain: Date | null
  enCours: PassageMiroir | null
  dernier: PassageMiroir | null
  lecteurExiste: boolean | null
}
const g = globalThis as { __miroir?: Etat }
const etat = (): Etat =>
  (g.__miroir ??= {
    timer: null,
    planif: null,
    prochain: null,
    enCours: null,
    dernier: null,
    lecteurExiste: null,
  })

/** Lance un rafraîchissement en tâche de fond. Refus si un passage est en cours. */
export function lancerMiroir(): PassageMiroir {
  const e = etat()
  if (e.enCours) throw new Error('Un rafraîchissement est déjà en cours')
  if (!configure()) throw new Error('MIROIR_DB non configurée')
  const passage: PassageMiroir = {
    debut: new Date().toISOString(),
    fin: null,
    lignes: 0,
    tables: 0,
    echecs: [],
    journal: '',
    erreur: null,
  }
  e.enCours = passage
  void preparerMiroir()
    .then((urlEcrivain) =>
      rafraichirMiroir(urlApp()!, urlEcrivain, (l) => {
        passage.journal += l + '\n'
      }),
    )
    .then((r) => {
      Object.assign(passage, r)
      e.lecteurExiste = r.lecteur
    })
    .catch((err) => {
      passage.erreur = message(err)
    })
    .finally(() => {
      passage.fin = new Date().toISOString()
      e.dernier = passage
      e.enCours = null
      console.log(
        `[miroir] ${passage.erreur ?? `${passage.lignes} lignes, ${passage.tables} tables, ${passage.echecs.length} échec(s)`}`,
      )
    })
  return passage
}

export function etatMiroir(): EtatMiroir {
  const e = etat()
  const ok = configure()
  return {
    configure: ok,
    cible: ok ? urlPour(ROLE_ECRIVAIN, '') : null,
    planif:
      e.planif ?? normaliserPlanif({ ...PLANIF_DEFAUT, intervalleMin: 0 }),
    prochain: e.prochain?.toISOString() ?? null,
    enCours: !!e.enCours,
    dernier: e.enCours ?? e.dernier,
    lecteur: {
      role: ROLE_LECTEUR,
      url: ok ? urlPour(ROLE_LECTEUR, '') : null,
      existe: e.lecteurExiste,
    },
  }
}

async function lirePlanif(): Promise<Planif> {
  const v = await lireParam(PARAM_PLANIF)
  if (v) {
    try {
      return normaliserPlanif(JSON.parse(v) as Partial<Planif>)
    } catch {
      /* valeur illisible : défauts */
    }
  }
  return normaliserPlanif({
    ...PLANIF_DEFAUT,
    intervalleMin: Number(process.env.MIROIR_INTERVALLE_MIN) || 60,
  })
}

// setTimeout chaîné vers le prochain passage calculé (fenêtre jours/heures)
function armer(p: Planif, depuis = new Date()) {
  const e = etat()
  if (e.timer) clearTimeout(e.timer)
  e.timer = null
  e.planif = p
  e.prochain = prochainPassage(depuis, p)
  if (!e.prochain) return
  e.timer = setTimeout(
    () => {
      const maintenant = new Date()
      try {
        lancerMiroir()
      } catch (err) {
        console.error('[miroir] ' + message(err))
      }
      armer(p, maintenant)
    },
    Math.max(0, e.prochain.getTime() - depuis.getTime()),
  )
  e.timer.unref()
}

/** Enregistre la planification et réarme la boucle. */
export async function planifier(p: Planif) {
  await ecrireParam(PARAM_PLANIF, JSON.stringify(p))
  armer(p)
}

/** Au démarrage : arme la boucle selon la planification enregistrée et lance un premier passage. */
export async function planifierMiroir() {
  if (!configure() || etat().planif) return
  armer(await lirePlanif())
  if (etat().prochain) lancerMiroir()
}
