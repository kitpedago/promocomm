import { authClient } from '#/lib/auth-client'

export default function BetterAuthHeader() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--paper)]" />
    )
  }

  if (!session?.user) return null

  return (
    <div className="flex items-center gap-2.5">
      {/* pastille charte : encre + initiales dorées (cf. maquette sidebar) */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)]">
        <span className="text-xs font-bold text-[var(--gold)]">
          {session.user.name.charAt(0).toUpperCase() || 'U'}
        </span>
      </div>
      <span className="hidden text-sm font-semibold sm:block">
        {session.user.name}
      </span>
      <button
        onClick={() => {
          void authClient.signOut().then(() => {
            // rechargement de document, pas une navigation SPA : le
            // QueryClient vit le temps du document et garderait les
            // préférences (clé ['prefs']) du compte qui part — le compte
            // suivant les verrait et, à sa première écriture, les
            // persisterait sous son propre userId.
            window.location.href = '/login'
          })
        }}
        className="h-9 cursor-pointer rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-4 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
      >
        Déconnexion
      </button>
    </div>
  )
}
