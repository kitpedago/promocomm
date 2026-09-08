import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouteContext, useRouterState } from '@tanstack/react-router'
import { Megaphone } from 'lucide-react'

import { TicketNouveau } from '#/components/TicketNouveau'
import { Button } from '#/components/ui/button'
import { setDbModeFn } from '#/lib/dbmode.ts'

import BetterAuthHeader from '../integrations/better-auth/header-user.tsx'

export default function Header() {
  // Signalement d'un ticket (bug/feature) depuis n'importe quelle page —
  // « Page concernée » préremplie avec la route courante
  const [signaler, setSignaler] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const qc = useQueryClient()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--card)] px-5 sm:px-7">
      <BandeauBase />
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <Link to="/" className="flex-shrink-0 no-underline">
          <img
            src="/keredes-logo.png"
            alt="Keredes — PromoComm"
            className="block h-8 w-auto"
          />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSignaler(true)}
            title="Signaler un bug ou demander une feature"
          >
            <Megaphone />
            Signaler
          </Button>
          <BetterAuthHeader />
        </div>
      </nav>

      {signaler && (
        <TicketNouveau
          pagePath={pathname}
          onClose={() => setSignaler(false)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ['tickets'] })
            void qc.invalidateQueries({ queryKey: ['tickets-badge'] })
          }}
        />
      )}
    </header>
  )
}

/**
 * Bandeau « quelle base est consultée » + bascule (dev local ↔ prod VPS).
 * Absent en production : `disponible` est faux quand PROD_DATABASE_URL n'est
 * pas renseignée. Le bouton n'est offert qu'au service Administrateur — le
 * serveur revérifie (setDbModeFn → requireAdmin).
 */
function BandeauBase() {
  const { dbMode, session } = useRouteContext({ from: '/_authed' })
  const [bascule, setBascule] = useState(false)
  if (!dbMode.disponible) return null

  const prod = dbMode.mode === 'prod'
  const cible = prod ? 'dev' : 'prod'

  const basculer = () => {
    if (
      cible === 'prod' &&
      !window.confirm(
        'Basculer sur la base de PRODUCTION (VPS) : toute modification y sera réelle. Continuer ?',
      )
    )
      return
    setBascule(true)
    // Rechargement complet : tous les caches de requêtes portent des données
    // de l'autre base, aucun ne survit à la bascule.
    void setDbModeFn({ data: { mode: cible } })
      .then(() => window.location.reload())
      .catch(() => setBascule(false))
  }

  return (
    <div
      className={`-mx-5 flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-1.5 text-xs font-medium sm:-mx-7 sm:px-7 ${
        prod
          ? 'bg-red-600 text-white'
          : 'bg-[var(--line-soft)] text-[var(--sea-ink-soft)]'
      }`}
    >
      <span>
        {prod
          ? '⚠️ Base de PRODUCTION (VPS) — les écritures sont réelles'
          : 'Base de développement (Docker local)'}
      </span>
      {session.user.service === 'admin' && (
        <button
          type="button"
          disabled={bascule}
          onClick={basculer}
          className="ml-auto rounded-md border border-current px-2 py-0.5 hover:opacity-80 disabled:opacity-50"
        >
          {bascule
            ? 'Bascule…'
            : prod
              ? 'Revenir sur la base de dev'
              : 'Basculer sur la prod'}
        </button>
      )}
    </div>
  )
}
