// Server functions de la base miroir (logique : miroir.server.ts).
// Page /admin/miroir, service Administrateur uniquement.
import { createServerFn } from '@tanstack/react-start'

import { normaliserPlanif } from '#/lib/miroir.helpers.ts'
import {
  creerLecteur,
  etatMiroir,
  lancerMiroir,
  motDePasseLecteur,
  planifier,
} from '#/lib/miroir.server.ts'
import { requireAdmin } from '#/lib/session.server.ts'

import type { Planif } from '#/lib/miroir.helpers.ts'
import type { EtatMiroir, PassageMiroir } from '#/lib/miroir.server.ts'

export type { EtatMiroir, PassageMiroir, Planif }

export const getMiroirEtatFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<EtatMiroir> => {
    await requireAdmin()
    return etatMiroir()
  },
)

export const lancerMiroirFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<PassageMiroir> => {
    await requireAdmin()
    return lancerMiroir()
  },
)

export const setMiroirPlanifFn = createServerFn({ method: 'POST' })
  .validator((d: Partial<Planif>) => normaliserPlanif(d))
  .handler(async ({ data }) => {
    await requireAdmin()
    await planifier(data)
    return etatMiroir()
  })

/** Crée ou réinitialise l'utilisateur lecteur (mot de passe conservé chiffré). */
export const creerLecteurMiroirFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    await requireAdmin()
    return creerLecteur()
  },
)

/** Relit le mot de passe lecteur enregistré ('' si absent). POST : pas de cache. */
export const getLecteurMdpFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    await requireAdmin()
    return motDePasseLecteur()
  },
)
