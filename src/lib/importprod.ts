// Remplacement de la base locale par une copie de la production
// (page /admin/import, service Administrateur uniquement).
//
// Sens unique : PROD_DATABASE_URL est lu, DATABASE_URL est écrasé.
import { createServerFn } from '@tanstack/react-start'

import { copierBase } from '#/lib/importprod.server.ts'
import { requireAdmin } from '#/lib/session.server.ts'

import type { ResultatImportProd } from '#/lib/importprod.server.ts'

export type { ResultatImportProd }

export const importerBddProdFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ResultatImportProd> => {
    await requireAdmin()
    const urlProd = process.env.PROD_DATABASE_URL
    const urlLocale = process.env.DATABASE_URL
    if (!urlProd) throw new Error('PROD_DATABASE_URL non configurée')
    if (!urlLocale) throw new Error('DATABASE_URL non configurée')
    if (urlProd === urlLocale)
      throw new Error(
        'PROD_DATABASE_URL est identique à DATABASE_URL : import refusé',
      )
    return copierBase(urlProd, urlLocale)
  },
)
