// Helpers purs du suivi de tickets (formatage, validation des captures,
// groupement Nouveautés) — testés dans tickets.helpers.test.ts.
import type { FeatureLivree } from '#/lib/tickets.defs.ts'

/* ── Plafonds captures (alignés client/serveur) ── */
export const CAPTURE_MAX_OCTETS = 3 * 1024 * 1024 // 3 Mo décodés
export const CAPTURES_MAX = 5

export interface CapturePayload {
  nom: string
  dataUrl: string
  miniature?: string
}

/* Vignette générée côté client (canvas ~220 px) : data URL image, plafonnée —
   silencieusement vidée si absente/illisible (icône de repli côté UI). */
const MINIATURE_MAX_CHARS = 100_000 // ≈ 75 Ko décodés
export function sanitizeMiniature(m?: string): string {
  return m &&
    m.length <= MINIATURE_MAX_CHARS &&
    /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(m)
    ? m
    : ''
}

/** dataUrl `data:image/…;base64,…` → { mime, b64 } validés (image, ≤ 3 Mo). */
export function decodeCapture(c: CapturePayload): {
  nom: string
  mime: string
  b64: string
  taille: number
  miniature: string
} {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(
    c.dataUrl,
  )
  if (!m) throw new Error('Capture illisible (image attendue).')
  const taille = Math.floor((m[2].length * 3) / 4)
  if (taille > CAPTURE_MAX_OCTETS)
    throw new Error('Capture trop lourde (3 Mo maximum).')
  return {
    nom: c.nom.slice(0, 200),
    mime: m[1],
    b64: m[2],
    taille,
    miniature: sanitizeMiniature(c.miniature),
  }
}

/** « 2026-07-08 14:30 » → « 08/07/2026 14:30 » (dates déjà formatées côté SQL). */
export function fmtTicketDate(s: string | null): string {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}${m[4]}` : s
}

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** « 2026-07-08 » → « 8 juillet 2026 » (en-têtes de groupes des Nouveautés). */
export function fmtDateLongue(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}`
}

/** Groupes par date de livraison (l'ordre SQL — desc — est préservé). */
export function grouperParDate(
  rows: Array<FeatureLivree>,
): Array<{ date: string; items: Array<FeatureLivree> }> {
  const groupes: Array<{ date: string; items: Array<FeatureLivree> }> = []
  for (const r of rows) {
    const g = groupes.at(-1)
    if (g && g.date === r.dateLivraison) g.items.push(r)
    else groupes.push({ date: r.dateLivraison, items: [r] })
  }
  return groupes
}
