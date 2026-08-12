import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { auth } from '#/lib/auth.ts'

// Session courante, lisible depuis les beforeLoad (SSR et navigation client)
export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { headers } = getRequest()
    return auth.api.getSession({ headers })
  },
)

// requireSession (garde des server functions) vit dans session.server.ts :
// une fonction serveur ordinaire ici garderait auth/getRequest dans le
// bundle client et ferait échouer le build (import-protection).
