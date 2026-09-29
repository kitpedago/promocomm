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

// Réservé au service Administrateur (= le dev) : qualification des tickets,
// configuration de l'Alerte mail…
export async function requireAdmin() {
  const session = await requireSession()
  if (session.user.service !== 'admin')
    throw new Error('Réservé au service Administrateur')
  return session
}

// Droits fins (table legacy Droit) : la présence d'une restriction — lecture
// seule (1) ou masqué (2) — sur le contrôle WinDev interdit la mutation pour
// le service courant. Aucune ligne = autorisé (admin n'en a aucune).
// `indice` vise un volet d'un contrôle à onglets (ONG_Choix[3]).
export async function estRestreint(
  service: string | null | undefined,
  fenetre: string,
  controle: string,
  indice?: number,
) {
  const restrictions = await db
    .select({ id: droit.id })
    .from(droit)
    .where(
      and(
        eq(droit.fenetre, fenetre),
        eq(droit.controle, controle),
        eq(droit.service, service ?? ''),
        indice != null ? eq(droit.indice, indice) : undefined,
      ),
    )
  return restrictions.length > 0
}

export async function requireDroit(
  fenetre: string,
  controle: string,
  indice?: number,
) {
  const session = await requireEcriture()
  if (await estRestreint(session.user.service, fenetre, controle, indice))
    throw new Error('Droits insuffisants pour cette action')
  return session
}

// Mutations réservées à quelques services (règles codées en dur dans les
// fenêtres WinDev, hors table Droit)
export async function requireServices(services: ReadonlyArray<string>) {
  const session = await requireEcriture()
  if (!services.includes(session.user.service ?? ''))
    throw new Error('Droits insuffisants pour cette action')
  return session
}
