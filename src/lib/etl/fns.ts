// Server functions de la page d'import — dans un module séparé de la route
// pour que le bundle client ne référence que leurs stubs RPC (mssql/pg/fs
// resteraient sinon dans le graphe client et feraient échouer le build).
import { createServerFn } from '@tanstack/react-start'

import { getStatus, startImport } from '#/lib/etl/import.ts'
import { requireSession } from '#/lib/session.server.ts'

export const getEtlStatusFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    return getStatus()
  },
)

export const startImportFn = createServerFn({ method: 'POST' })
  .validator((data: { file: string }) => data)
  .handler(async ({ data }) => {
    await requireSession()
    return startImport(data.file)
  })
