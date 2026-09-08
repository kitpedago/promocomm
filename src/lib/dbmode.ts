// Server functions de la bascule dev/prod (logique et secret : dbmode.server.ts).
import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'

import {
  COOKIE_MODE,
  modeBaseCourant,
  urlProd,
  valeurSignee,
} from '#/lib/dbmode.server.ts'
import { requireAdmin } from '#/lib/session.server.ts'

import type { ModeBase } from '#/lib/dbmode.server.ts'

export type { ModeBase }

export interface EtatDbMode {
  mode: ModeBase
  // faux en production (PROD_DATABASE_URL non renseignée) : ni bandeau ni bouton
  disponible: boolean
}

export const getDbModeFn = createServerFn({ method: 'GET' }).handler(
  (): EtatDbMode => ({ mode: modeBaseCourant(), disponible: !!urlProd() }),
)

export const setDbModeFn = createServerFn({ method: 'POST' })
  .validator((data: { mode: string }): { mode: ModeBase } => ({
    mode: data.mode === 'prod' ? 'prod' : 'dev',
  }))
  .handler(async ({ data }) => {
    await requireAdmin()
    if (data.mode === 'prod' && !urlProd())
      throw new Error('PROD_DATABASE_URL non configurée')
    setCookie(COOKIE_MODE, valeurSignee(data.mode), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return { mode: data.mode }
  })
