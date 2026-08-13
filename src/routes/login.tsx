import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { loginServiceFn } from '#/lib/login-fn.ts'
import { getService, SERVICES } from '#/lib/services.ts'
import { getSessionFn } from '#/lib/session.ts'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (session?.user) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

// Connexion par service, transposée de FEN_Login (WinDev) : liste déroulante
// des services, mot de passe grisé pour ceux qui n'en demandent pas.
function LoginPage() {
  const [slug, setSlug] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const service = getService(slug)
  const sansMotDePasse = service ? !service.avecMotDePasse : false

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!service) {
      setError('Sélectionnez un service')
      return
    }
    const form = new FormData(e.currentTarget)
    setPending(true)
    try {
      await loginServiceFn({
        data: {
          service: service.slug,
          password: String(form.get('password') ?? ''),
        },
      })
      // rechargement de document, pas une navigation SPA (cf. header-user) :
      // repartir d'un QueryClient neuf, sinon les préférences du compte
      // précédent restent en cache et deviennent celles de ce compte-ci.
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="island-shell w-full max-w-sm rounded-xl px-8 py-10">
        <img
          src="/keredes-logo.png"
          alt="Keredes"
          className="mb-6 block h-10 w-auto"
        />
        <p className="island-kicker mb-2">PromoComm</p>
        <h1 className="display-title mb-6 text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
          Connexion
        </h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service">Service</Label>
            <Select value={slug} onValueChange={setSlug}>
              <SelectTrigger id="service" className="w-full">
                <SelectValue placeholder="Sélectionnez un service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled={sansMotDePasse}
              placeholder={
                sansMotDePasse ? 'Aucun mot de passe requis' : undefined
              }
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={pending || !slug}>
            {pending ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
      </div>
    </main>
  )
}
