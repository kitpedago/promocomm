// Réduction d'image côté serveur (sharp) : une image au-delà du plafond de
// stockage est redimensionnée puis recompressée en JPEG par paliers, au lieu
// d'être refusée. Testé dans visuels.image.test.ts.
import sharp from 'sharp'

import { CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'

const PALIERS = [
  { largeur: 1280, qualite: 80 },
  { largeur: 1024, qualite: 70 },
  { largeur: 800, qualite: 55 },
] as const

/** Ramène une image sous le plafond (3 Mo). Throw si irréductible. */
export async function reduireImage(
  contenu: Buffer,
): Promise<{ contenu: Buffer; mime: string }> {
  for (const { largeur, qualite } of PALIERS) {
    const reduit = await sharp(contenu)
      // applique l'orientation EXIF avant qu'elle ne soit perdue au réencodage
      .rotate()
      .resize({ width: largeur, withoutEnlargement: true })
      .jpeg({ quality: qualite, mozjpeg: true })
      .toBuffer()
    if (reduit.byteLength <= CAPTURE_MAX_OCTETS)
      return { contenu: reduit, mime: 'image/jpeg' }
  }
  throw new Error('Image irréductible sous 3 Mo.')
}
