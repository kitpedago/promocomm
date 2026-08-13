import { getRequest } from '@tanstack/react-start/server'
import { and, eq } from 'drizzle-orm'

import { droit } from '#/db/domaine.ts'
import { db } from '#/db/index.ts'
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
// toute l'application ; les droits fins par contrôle passent par requireDroit
export async function requireEcriture() {
  const session = await requireSession()
  if (session.user.service === 'consultation')
    throw new Error('Service Consultation : lecture seule')
  return session
}

// Droits fins (table legacy Droit) : la présence d'une restriction — lecture
// seule (1) ou masqué (2) — sur le contrôle WinDev interdit la mutation pour
// le service courant. Aucune ligne = autorisé (admin n'en a aucune).
export async function requireDroit(fenetre: string, controle: string) {
  const session = await requireEcriture()
  const restrictions = await db
    .select({ id: droit.id })
    .from(droit)
    .where(
      and(
        eq(droit.fenetre, fenetre),
        eq(droit.controle, controle),
        eq(droit.service, session.user.service ?? ''),
      ),
    )
  if (restrictions.length > 0)
    throw new Error('Droits insuffisants pour cette action')
  return session
}
