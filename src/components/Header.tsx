import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { Megaphone } from 'lucide-react'

import { TicketNouveau } from '#/components/TicketNouveau'
import { Button } from '#/components/ui/button'

import BetterAuthHeader from '../integrations/better-auth/header-user.tsx'

export default function Header() {
  // Signalement d'un ticket (bug/feature) depuis n'importe quelle page —
  // « Page concernée » préremplie avec la route courante
  const [signaler, setSignaler] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const qc = useQueryClient()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--card)] px-5 sm:px-7">
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
