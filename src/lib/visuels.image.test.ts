import { randomFillSync } from 'node:crypto'

import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'
import { reduireImage } from '#/lib/visuels.image.ts'

// Bruit aléatoire : incompressible, garantit un PNG source bien au-delà de 3 Mo
async function grosPng(): Promise<Buffer> {
  const largeur = 2400
  const hauteur = 1800
  const pixels = randomFillSync(Buffer.alloc(largeur * hauteur * 3))
  return sharp(pixels, {
    raw: { width: largeur, height: hauteur, channels: 3 },
  })
    .png()
    .toBuffer()
}

describe('reduireImage', () => {
  it('ramène une image > 3 Mo sous le plafond, en JPEG', async () => {
    const source = await grosPng()
    expect(source.byteLength).toBeGreaterThan(CAPTURE_MAX_OCTETS)
    const { contenu, mime } = await reduireImage(source)
    expect(contenu.byteLength).toBeLessThanOrEqual(CAPTURE_MAX_OCTETS)
    expect(mime).toBe('image/jpeg')
    const meta = await sharp(contenu).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBeLessThanOrEqual(1280)
  }, 30_000)

  it('refuse un contenu qui n\'est pas une image', async () => {
    await expect(reduireImage(Buffer.from('pas une image'))).rejects.toThrow()
  })
})
