import { Link } from '@tanstack/react-router'

import BetterAuthHeader from '../integrations/better-auth/header-user.tsx'

export default function Header() {
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
          <BetterAuthHeader />
        </div>
      </nav>
    </header>
  )
}
