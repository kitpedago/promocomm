// Lecture et miniatures des captures d'écran de tickets (APIs navigateur :
// FileReader / Image / canvas). Hors composants pour préserver le Fast
// Refresh. Plafonds alignés sur le serveur (cf. tickets.helpers.ts).
import { CAPTURES_MAX, CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'

export interface CaptureDraft {
  nom: string
  dataUrl: string
  miniature: string
}

async function chargerImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('image illisible'))
    i.src = dataUrl
  })
}

/* Rendu canvas JPEG à une taille maximale (fond blanc : les PNG transparents
   restent lisibles). '' si le canvas est indisponible. */
function versJpeg(img: HTMLImageElement, max: number, qualite: number): string {
  const scale = Math.min(1, max / Math.max(img.width, img.height, 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', qualite)
}

/**
 * Vignette data-URL (~220 px, JPEG) pour le mini-aperçu cliquable — stockée à
 * côté du blob (colonne miniature) pour un affichage instantané sans charger
 * l'image complète. Vide si la génération échoue (repli icône).
 */
export async function makeMiniature(dataUrl: string): Promise<string> {
  try {
    return versJpeg(await chargerImage(dataUrl), 220, 0.72)
  } catch {
    return ''
  }
}

/** Taille décodée (octets) d'une data-URL base64. */
const tailleDataUrl = (u: string) =>
  Math.floor(((u.length - u.indexOf(',') - 1) * 3) / 4)

/** Fichier local → data-URL. */
export async function lireFichierDataUrl(f: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Lecture impossible.'))
    r.readAsDataURL(f)
  })
}

/** Réduit une image locale sous le plafond de 3 Mo : redimensionnement puis
 *  JPEG par paliers de qualité. '' si illisible ou irréductible. */
export async function reduireCaptureDataUrl(dataUrl: string): Promise<string> {
  try {
    const img = await chargerImage(dataUrl)
    for (const { max, qualite } of [
      { max: 1600, qualite: 0.85 },
      { max: 1280, qualite: 0.75 },
      { max: 1024, qualite: 0.6 },
    ]) {
      const reduit = versJpeg(img, max, qualite)
      if (reduit && tailleDataUrl(reduit) <= CAPTURE_MAX_OCTETS) return reduit
    }
    return ''
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
      const dataUrl = await lireFichierDataUrl(f)
      return {
        nom: f.name || 'capture.png',
        dataUrl,
        miniature: await makeMiniature(dataUrl),
      }
    }),
  )
  return { captures, erreur: erreurs[0] ?? null }
}
