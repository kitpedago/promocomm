import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import Header from '#/components/Header'
import Sidebar from '#/components/Sidebar'
import { getSessionFn } from '#/lib/session.ts'

// Layout sans segment d'URL : tout ce qui est sous _authed/ exige une session
export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (!session?.user) throw redirect({ to: '/login' })
    return { session }
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
