import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import Header from '#/components/Header'
import Sidebar from '#/components/Sidebar'
import { getDbModeFn } from '#/lib/dbmode.ts'
import { CLE_PREFS, getPrefsFn } from '#/lib/preferences.ts'
import { getSessionFn } from '#/lib/session.ts'

import type { TsrSerializable } from '@tanstack/router-core'
import type { Prefs } from '#/lib/preferences.ts'

// Layout sans segment d'URL : tout ce qui est sous _authed/ exige une session
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    const session = await getSessionFn()
    if (!session?.user) throw redirect({ to: '/login' })
    // ensureQueryData : une seule requête par session de navigation, et c'est le
    // cache que relit usePref — le beforeLoad des pages enfants et les composants
    // voient toujours la même valeur.
    const prefs = await context.queryClient
      .ensureQueryData({
        queryKey: CLE_PREFS,
        queryFn: () => getPrefsFn(),
        staleTime: Infinity,
      })
      // contenu purement cosmétique, sur le passage de toutes les pages
      // authentifiées : une migration non jouée ne doit pas rendre
      // l'application inaccessible — /admin/import est la page qui répare.
      .catch((): Prefs => ({}))
    // TanStack Router vérifie statiquement que tout ce que beforeLoad renvoie est
    // sérialisable (hydratation SSR). `Prefs` est du JSON arbitraire par
    // conception (cf. preferences.ts) : le type-checker ne peut rien en prouver,
    // même raisonnement que le strict:{output:false} de getPrefsFn — attesté ici
    // via TsrSerializable plutôt que délargi en `any`, pour que context.prefs
    // garde son vrai type chez les consommateurs.
    // Bandeau dev/prod : lecture de cookie, pas de requête base
    const dbMode = await getDbModeFn()
    return { session, dbMode, prefs: prefs as Prefs & TsrSerializable }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  const { session } = Route.useRouteContext()
  return (
    <>
      <Header />
      <div className="flex items-start">
        <Sidebar service={session.user.service} />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </>
  )
}
