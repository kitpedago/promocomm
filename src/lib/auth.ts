import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { dbLocale } from '#/db/index.ts'

export const auth = betterAuth({
  database: drizzleAdapter(dbLocale, { provider: 'pg' }),
  // Origines acceptées en plus de BETTER_AUTH_URL : TRUSTED_ORIGINS (liste
  // séparée par des virgules, ex. autres noms d'hôte derrière un proxy) ;
  // défaut = dev local (vite --port 3021)
  trustedOrigins: (
    process.env.TRUSTED_ORIGINS || 'http://localhost:3021,http://127.0.0.1:3021'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  emailAndPassword: {
    enabled: true,
    // Pas d'inscription publique : les comptes sont créés par seed (scripts/seed-admin.ts)
    disableSignUp: true,
    // Mots de passe de services hérités de WinDev (courts) — app interne
    minPasswordLength: 3,
  },
  user: {
    additionalFields: {
      // slug du service connecté (src/lib/services.ts)
      service: { type: 'string', required: false, input: false },
    },
  },
  plugins: [tanstackStartCookies()],
})
