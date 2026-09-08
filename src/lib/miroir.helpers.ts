// Inversion mécanique du mapping legacy → public (src/lib/etl/transform.ts)
// pour alimenter la base miroir aux noms SQL Server. Pur, testable sans base.
import type { Copy } from '#/lib/etl/transform.ts'

export interface ColonneMiroir {
  legacy: string
  // expression SQL lue dans public (déjà aliasée dans `sql`)
  expr: string
}

export interface Inversion {
  table: string
  colonnes: Array<ColonneMiroir>
  sql: string
  // colonnes publiques dont l'expression legacy n'est pas inversible
  ignorees: Array<string>
}

// Réduit une expression du `select` legacy à sa colonne source.
// fk : le public encode « pas de référence » par NULL, le legacy par 0.
export function colonneLegacy(
  expr: string,
): { legacy: string; fk: boolean; bool?: boolean; cast?: string } | null {
  const e = expr.trim()
  let m = /^s\."([^"]+)"$/.exec(e)
  if (m) return { legacy: m[1], fk: false }
  m = /^COALESCE\(s\."([^"]+)", ''\)$/.exec(e)
  if (m) return { legacy: m[1], fk: false }
  // HTML retiré à l'aller (sga.commentaire) : le texte nettoyé repart tel quel
  m =
    /^NULLIF\(TRIM\(regexp_replace\(COALESCE\(s\."([^"]+)", ''\), [^)]*\)\), ''\)$/.exec(
      e,
    )
  if (m) return { legacy: m[1], fk: false }
  // texte complété à l'aller par un libellé de nomenclature (motif_annulation) :
  // le texte repart tel quel dans la colonne texte legacy
  m = /^COALESCE\(NULLIF\(s\."([^"]+)", ''\), \(SELECT [^)]*\)\)$/.exec(e)
  if (m) return { legacy: m[1], fk: false }
  // entier legacy lu en booléen : repart en 0/1
  m = /^\(s\."([^"]+)" <> 0\)$/.exec(e)
  if (m) return { legacy: m[1], fk: false, bool: true }
  // fk castée à l'aller (Siret : bigint → text) : on recaste vers le premier type
  m = /^NULLIF\(s\."([^"]+)", 0\)(?:::(\w+))?(?:::\w+)*$/.exec(e)
  if (m)
    return m[2]
      ? { legacy: m[1], fk: true, cast: m[2] }
      : { legacy: m[1], fk: true }
  m =
    /^\(SELECT s\."([^"]+)" WHERE EXISTS \(SELECT 1 FROM legacy\."[^"]+" r WHERE r\."[^"]+" = s\."\1"\)\)$/.exec(
      e,
    )
  if (m) return { legacy: m[1], fk: true }
  return null
}

// Découpe une liste d'expressions SQL sur les virgules de premier niveau
function expressions(liste: string): Array<string> {
  const out: Array<string> = []
  let prof = 0
  let cur = ''
  let quote = false
  for (const ch of liste) {
    if (ch === "'") quote = !quote
    if (!quote) {
      if (ch === '(') prof++
      else if (ch === ')') prof--
      else if (ch === ',' && prof === 0) {
        out.push(cur)
        cur = ''
        continue
      }
    }
    cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map((s) => s.replace(/\s+/g, ' ').trim())
}

export function inverser(copy: Copy): Inversion {
  const m = /^\s*SELECT\s+([\s\S]+?)\s+FROM legacy\."([^"]+)" s\b/.exec(
    copy.select,
  )
  if (!m) throw new Error(`select non reconnu pour ${copy.target}`)
  const table = m[2]
  const pubs = copy.cols
    .replace(/[()]/g, '')
    .split(',')
    .map((c) => c.trim())
  const exprs = expressions(m[1])
  if (pubs.length !== exprs.length)
    throw new Error(
      `${copy.target} : ${pubs.length} colonnes pour ${exprs.length} expressions`,
    )

  const colonnes: Array<ColonneMiroir> = []
  const ignorees: Array<string> = []
  pubs.forEach((pub, i) => {
    const c = colonneLegacy(exprs[i])
    if (!c) return ignorees.push(pub)
    colonnes.push({
      legacy: c.legacy,
      expr: c.fk
        ? `COALESCE("${pub}"${c.cast ? '::' + c.cast : ''}, 0)`
        : c.bool
          ? `"${pub}"::int`
          : `"${pub}"`,
    })
  })
  const sql = `SELECT ${colonnes.map((c) => `${c.expr} AS "${c.legacy}"`).join(', ')} FROM public."${copy.target}"`
  return { table, colonnes, sql, ignorees }
}

// --- Planification : intervalle borné à des jours et une plage horaire ---

export interface Planif {
  intervalleMin: number // 0 = désactivée
  jours: Array<number> // getDay() : 0 = dimanche … 6 = samedi
  heureDebut: string // 'HH:MM'
  heureFin: string // 'HH:MM', exclue ; '24:00' = fin de journée
}

export const PLANIF_DEFAUT: Planif = {
  intervalleMin: 60,
  jours: [1, 2, 3, 4, 5, 6, 0],
  heureDebut: '00:00',
  heureFin: '24:00',
}

const minutesDe = (hm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm)
  if (!m) return null
  const v = Number(m[1]) * 60 + Number(m[2])
  return v >= 0 && v <= 24 * 60 ? v : null
}
const hm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Valide une planification venue du client (valeurs douteuses → défauts). */
export function normaliserPlanif(
  p: Partial<Planif> | null | undefined,
): Planif {
  const intervalleMin = Math.min(
    7 * 24 * 60,
    Math.max(0, Math.floor(Number(p?.intervalleMin)) || 0),
  )
  const jours = [...new Set((p?.jours ?? []).map(Number))]
    .filter((j) => Number.isInteger(j) && j >= 0 && j <= 6)
    .sort()
  let debut = minutesDe(p?.heureDebut ?? '') ?? 0
  let fin = minutesDe(p?.heureFin ?? '') ?? 24 * 60
  if (debut >= fin) [debut, fin] = [0, 24 * 60]
  return {
    intervalleMin,
    jours: jours.length ? jours : PLANIF_DEFAUT.jours,
    heureDebut: hm(debut),
    heureFin: hm(fin),
  }
}

function dansFenetre(d: Date, p: Planif) {
  const m = d.getHours() * 60 + d.getMinutes()
  return (
    p.jours.includes(d.getDay()) &&
    m >= minutesDe(p.heureDebut)! &&
    m < minutesDe(p.heureFin)!
  )
}

/**
 * Prochain passage strictement après `depuis` : `depuis + intervalle` s'il tombe
 * dans la fenêtre, sinon l'ouverture de la prochaine fenêtre. Heure locale du
 * serveur. null si désactivée ou aucune fenêtre sous 8 jours.
 */
export function prochainPassage(depuis: Date, p: Planif): Date | null {
  if (p.intervalleMin <= 0) return null
  const debut = minutesDe(p.heureDebut)!
  let t = new Date(depuis.getTime() + p.intervalleMin * 60_000)
  t.setSeconds(0, 0)
  for (let i = 0; i < 9; i++) {
    if (dansFenetre(t, p)) return t
    const m = t.getHours() * 60 + t.getMinutes()
    const ouverture = new Date(t)
    ouverture.setHours(0, debut, 0, 0)
    if (!(p.jours.includes(t.getDay()) && m < debut))
      ouverture.setDate(ouverture.getDate() + 1)
    t = ouverture
  }
  return null
}
