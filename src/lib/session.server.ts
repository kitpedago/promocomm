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

// Garde des mutations : le service Consultation est en lecture seule sur
// toute l'application (les autres services écrivent ; droits fins par
// contrôle — table legacy Droit — reportés à une phase ultérieure)
export async function requireEcriture() {
  const session = await requireSession()
  if (session.user.service === 'consultation')
    throw new Error('Service Consultation : lecture seule')
  return session
}
