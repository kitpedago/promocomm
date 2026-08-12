import { getRequest } from '@tanstack/react-start/server'

import { auth } from '#/lib/auth.ts'

// À appeler en tête de chaque server function sensible : les server functions
// sont des endpoints HTTP, le garde du layout _authed ne les couvre pas
export async function requireSession() {
  const { headers } = getRequest()
  const session = await auth.api.getSession({ headers })
  if (!session?.user) throw new Error('Non authentifié')
  return session
}
