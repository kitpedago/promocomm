// Synchronise les comptes Better Auth des services (src/lib/services.ts +
// mots de passe de src/lib/services.server.ts) : création si absent, mot de
// passe realigné à chaque exécution (le code est la source de vérité tant que
// les services ne sont pas en table). Idempotent. Usage : npm run db:seed
import { auth } from '../src/lib/auth.ts'
import { SERVICE_PASSWORDS } from '../src/lib/services.server.ts'
import { SERVICES, serviceEmail } from '../src/lib/services.ts'

const ctx = await auth.$context

for (const service of SERVICES) {
  const email = serviceEmail(service.slug)
  const password = SERVICE_PASSWORDS[service.slug]
  if (!password) {
    console.error(`Pas de mot de passe défini pour ${service.slug} — ignoré`)
    continue
  }
  const hash = await ctx.password.hash(password)

  const existing = await ctx.internalAdapter.findUserByEmail(email)
  if (existing) {
    await ctx.internalAdapter.updatePassword(existing.user.id, hash)
    await ctx.internalAdapter.updateUser(existing.user.id, {
      name: service.label,
      service: service.slug,
    })
    console.log(`↻ ${service.label} (${email}) — mot de passe/infos resynchronisés`)
    continue
  }

  const user = await ctx.internalAdapter.createUser({
    email,
    name: service.label,
    emailVerified: true,
    service: service.slug,
  })
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: hash,
  })
  console.log(`+ ${service.label} (${email}) créé`)
}
process.exit(0)
