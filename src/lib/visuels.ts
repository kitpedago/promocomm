// Server functions du visuel d'opération (bandeau fiche Paramètres OTL,
// miniature du volet Opérations). Réseau keredes.coop : visuels.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { asc, eq, notInArray } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { operation } from '#/db/domaine.ts'
import { operationVisuel } from '#/db/schema.ts'
import { requireEcriture, requireSession } from '#/lib/session.server.ts'
import { decodeCapture, sanitizeMiniature } from '#/lib/tickets.helpers.ts'
import {
  chercherCandidats,
  chercherEtStockerVisuel,
  telechargerImage,
} from '#/lib/visuels.server.ts'

// Original en data-URL pour le bandeau de la fiche (chargé à la demande)
export const getVisuelFn = createServerFn({ method: 'GET' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const v = (await db
      .select()
      .from(operationVisuel)
      .where(eq(operationVisuel.operationId, data.operationId))
      .limit(1)).at(0)
    if (!v) return null
    return {
      mime: v.mime,
      source: v.source,
      miniature: v.miniature,
      dataUrl: `data:${v.mime};base64,${v.contenu.toString('base64')}`,
    }
  })

export const rechercherVisuelsFn = createServerFn({ method: 'GET' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireSession()
    const op = (await db
      .select({ libelle: operation.libelle })
      .from(operation)
      .where(eq(operation.id, data.operationId))
      .limit(1)).at(0)
    if (!op) return { candidats: [] as Array<string> }
    return { candidats: await chercherCandidats(op.libelle) }
  })

async function remplacerVisuel(
  operationId: number,
  valeurs: {
    contenu: Buffer
    mime: string
    taille: number
    miniature?: string
    source: string
  },
) {
  await db
    .insert(operationVisuel)
    .values({ operationId, miniature: '', ...valeurs })
    .onConflictDoUpdate({
      target: operationVisuel.operationId,
      set: { miniature: '', ...valeurs },
    })
}

// Choix d'un candidat keredes.coop — le serveur retélécharge (l'URL cliente
// n'est qu'une référence, jamais un contenu) ; miniature régénérée ensuite
// par la fiche (lazy, cf. saveMiniatureVisuelFn)
export const choisirVisuelFn = createServerFn({ method: 'POST' })
  .validator((d: { operationId: number; url: string }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const { contenu, mime, taille } = await telechargerImage(data.url)
    await remplacerVisuel(data.operationId, {
      contenu,
      mime,
      taille,
      source: data.url,
    })
    return { ok: true as const }
  })

export const uploadVisuelFn = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      operationId: number
      nom: string
      dataUrl: string
      miniature?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    await requireEcriture()
    const cap = decodeCapture({
      nom: data.nom,
      dataUrl: data.dataUrl,
      miniature: data.miniature,
    })
    await remplacerVisuel(data.operationId, {
      contenu: Buffer.from(cap.b64, 'base64'),
      mime: cap.mime,
      taille: cap.taille,
      miniature: cap.miniature,
      source: 'upload',
    })
    return { ok: true as const }
  })

export const retirerVisuelFn = createServerFn({ method: 'POST' })
  .validator((d: { operationId: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    await db
      .delete(operationVisuel)
      .where(eq(operationVisuel.operationId, data.operationId))
    return { ok: true as const }
  })

// Lazy backfill de la vignette : la fiche la génère (canvas) à partir de la
// data-URL de l'original quand elle est absente ('')
export const saveMiniatureVisuelFn = createServerFn({ method: 'POST' })
  .validator((d: { operationId: number; miniature: string }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const m = sanitizeMiniature(data.miniature)
    if (m)
      await db
        .update(operationVisuel)
        .set({ miniature: m })
        .where(eq(operationVisuel.operationId, data.operationId))
    return { ok: true as const }
  })

// Backfill par paquets pilotés par le client (pas de requête HTTP de
// plusieurs minutes) : traite `limite` opérations sans visuel, renvoie le
// restant — le client rappelle tant que restants > 0.
export const backfillVisuelsFn = createServerFn({ method: 'POST' })
  .validator((d: { limite: number }) => d)
  .handler(async ({ data }) => {
    await requireEcriture()
    const limite = Math.min(Math.max(1, data.limite), 25)
    const deja = db
      .select({ id: operationVisuel.operationId })
      .from(operationVisuel)
    const sans = await db
      .select({ id: operation.id, libelle: operation.libelle })
      .from(operation)
      .where(notInArray(operation.id, deja))
      .orderBy(asc(operation.id))
    const paquet = sans.slice(0, limite)
    let trouves = 0
    for (const op of paquet) {
      const ok = await chercherEtStockerVisuel(op.id, op.libelle).catch(
        () => false,
      )
      if (ok) trouves++
    }
    return {
      traites: paquet.length,
      trouves,
      restants: sans.length - paquet.length,
    }
  })
