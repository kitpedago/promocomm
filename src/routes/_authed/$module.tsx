import { createFileRoute, redirect } from '@tanstack/react-router'

import { MODULES, MODULE_LABELS, getService } from '#/lib/services'

import type { Module } from '#/lib/services'

// Page placeholder des modules métier : slug validé contre MODULES, accès
// filtré par service comme FEN_Menu (un module hors droits renvoie à l'accueil)
export const Route = createFileRoute('/_authed/$module')({
  beforeLoad: ({ params, context }) => {
    if (!(MODULES as ReadonlyArray<string>).includes(params.module)) {
      throw redirect({ to: '/' })
    }
    const module = params.module as Module
    const service = getService(context.session.user.service)
    if (!service?.modules.includes(module)) throw redirect({ to: '/' })
    return { module }
  },
  component: ModulePage,
})

function ModulePage() {
  const { module } = Route.useRouteContext()
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in rounded-xl px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Module</p>
        <h1 className="display-title mb-5 text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)]">
          {MODULE_LABELS[module]}
        </h1>
        <p className="max-w-2xl text-base text-[var(--sea-ink-soft)]">
          Écran en cours de migration depuis WinDev — voir la référence dans{' '}
          <code className="text-sm">docs/ecrans-windev.md</code>.
        </p>
      </section>
    </main>
  )
}
