// Lecture et miniatures des captures d'écran de tickets (APIs navigateur :
// FileReader / Image / canvas). Hors composants pour préserver le Fast
// Refresh. Plafonds alignés sur le serveur (cf. tickets.helpers.ts).
import { CAPTURES_MAX, CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'

export interface CaptureDraft {
  nom: string
  dataUrl: string
  miniature: string
}

/**
 * Vignette data-URL (~220 px, JPEG) pour le mini-aperçu cliquable — stockée à
 * côté du blob (colonne miniature) pour un affichage instantané sans charger
 * l'image complète. Vide si la génération échoue (repli icône).
 */
async function makeMiniature(dataUrl: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('image illisible'))
      i.src = dataUrl
    })
    const MAX = 220
    const scale = Math.min(1, MAX / Math.max(img.width, img.height, 1))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    // Fond blanc : les PNG transparents restent lisibles une fois en JPEG
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return ''
  }
}

/** Lit des fichiers image (input ou collage) → data URLs, plafonds appliqués. */
export async function readCaptureFiles(
  files: Array<File>,
  existing: number,
): Promise<{ captures: Array<CaptureDraft>; erreur: string | null }> {
  const images = files.filter((f) => f.type.startsWith('image/'))
  const erreurs: Array<string> = []
  if (images.length < files.length)
    erreurs.push('Seules les images sont acceptées.')
  const kept: Array<File> = []
  for (const f of images) {
    if (f.size > CAPTURE_MAX_OCTETS) erreurs.push(`« ${f.name} » dépasse 3 Mo.`)
    else if (existing + kept.length >= CAPTURES_MAX)
      erreurs.push(`${CAPTURES_MAX} captures maximum.`)
    else kept.push(f)
  }
  const captures = await Promise.all(
    kept.map(async (f) => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = () => reject(new Error('Lecture impossible.'))
        r.readAsDataURL(f)
      })
      return {
        nom: f.name || 'capture.png',
        dataUrl,
        miniature: await makeMiniature(dataUrl),
      }
    }),
  )
  return { captures, erreur: erreurs[0] ?? null }
}
