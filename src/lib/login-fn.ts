// Server function de connexion par service — seul point d'entrée du login.
// Module séparé (comme etl/fns.ts) pour que le client ne reçoive que le stub RPC :
// les mots de passe de services.server.ts ne quittent jamais le serveur.
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { auth } from '#/lib/auth.ts'
import { SERVICE_PASSWORDS } from '#/lib/services.server.ts'
import { getService, serviceEmail } from '#/lib/services.ts'

export const loginServiceFn = createServerFn({ method: 'POST' })
  .validator((data: { service: string; password?: string }) => data)
  .handler(async ({ data }) => {
    const service = getService(data.service)
    if (!service) throw new Error('Sélectionnez un service')

    const password = service.avecMotDePasse
      ? (data.password ?? '')
      : SERVICE_PASSWORDS[service.slug]
    if (service.avecMotDePasse && password === '') {
      throw new Error('Saisissez un mot de passe')
    }

    const { headers } = getRequest()
    try {
      await auth.api.signInEmail({
        body: { email: serviceEmail(service.slug), password },
        headers,
      })
    } catch {
      // même message que FEN_Login
      throw new Error('Mot de passe incorrect')
    }
    return { ok: true }
  })
