import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Calculator,
  ChartColumn,
  Database,
  FileText,
  HardHat,
  House,
  Landmark,
  Percent,
  Settings,
  Sparkles,
  Store,
  Ticket,
  Users,
  Wrench,
} from 'lucide-react'

import { MODULES, MODULE_LABELS, getService } from '#/lib/services'
import { getTicketsBadgeFn } from '#/lib/tickets.ts'

import type { LucideIcon } from 'lucide-react'
import type { Module } from '#/lib/services'

const MODULE_ICONS: Record<Module, LucideIcon> = {
  commercialisation: Store,
  operations: HardHat,
  sav: Wrench,
  acquereurs: Users,
  sccv: Landmark,
  parametres: Settings,
  compta: Calculator,
  bilan: ChartColumn,
  honoraires: Percent,
  declarations: FileText,
}

// état actif stylé via data-status="active" posé par <Link>
const itemClass =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--ink-soft)] no-underline transition-colors hover:bg-[var(--cream-hover)] hover:text-[var(--ink)] data-[status=active]:bg-[var(--gold-tint)] data-[status=active]:font-semibold data-[status=active]:text-[var(--ink)]'

// modules déjà migrés : route dédiée ; les autres passent par le placeholder $module
const ROUTES_IMPLEMENTEES = {
  commercialisation: '/commercialisation',
  operations: '/operations',
  acquereurs: '/acquereurs',
  compta: '/compta',
  sccv: '/sccv',
  bilan: '/bilan',
  honoraires: '/honoraires',
  declarations: '/declarations',
  sav: '/sav',
  parametres: '/parametres',
} as const satisfies Partial<Record<Module, string>>

function ModuleLink({ module }: { module: Module }) {
  const Icon = MODULE_ICONS[module]
  const contenu = (
    <>
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
      {MODULE_LABELS[module]}
    </>
  )
  if (module in ROUTES_IMPLEMENTEES) {
    return (
      <Link
        to={ROUTES_IMPLEMENTEES[module]}
        className={itemClass}
      >
        {contenu}
      </Link>
    )
  }
  return (
    <Link to="/$module" params={{ module }} className={itemClass}>
      {contenu}
    </Link>
  )
}

// Menu principal — reprend les tuiles du tableau de bord WinDev (FEN_Menu),
// filtrées selon le service connecté (docs/services-droits.md)
export default function Sidebar({ service }: { service?: string | null }) {
  const modules = getService(service)?.modules ?? []
  // Badge « Tickets » : non-lus (Administrateur) + « réponse attendue » (déposeur)
  const badge = useQuery({
    queryKey: ['tickets-badge'],
    queryFn: () => getTicketsBadgeFn(),
    refetchInterval: 60_000,
  })
  const nbBadge = (badge.data?.nonLus ?? 0) + (badge.data?.aRepondre ?? 0)
  const badgeTitle = [
    badge.data?.nonLus ? `${badge.data.nonLus} non lu(s)` : '',
    badge.data?.aRepondre
      ? `${badge.data.aRepondre} attend(ent) votre réponse`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] w-52 flex-shrink-0 flex-col overflow-y-auto border-r border-[var(--line)] bg-[var(--card)] px-3 py-4 md:flex">
      <nav className="flex flex-col gap-0.5">
        <Link to="/" className={itemClass} activeOptions={{ exact: true }}>
          <House className="h-4 w-4 flex-shrink-0" aria-hidden />
          Accueil
        </Link>
      </nav>

      <p className="island-kicker px-3 pt-6 pb-2">Modules</p>
      <nav className="flex flex-col gap-0.5">
        {MODULES.filter((m) => m !== 'parametres' && modules.includes(m)).map(
          (m) => (
            <ModuleLink key={m} module={m} />
          ),
        )}
      </nav>

      {/* Suivi des tickets + changelog : visibles de tous les services */}
      <p className="island-kicker px-3 pt-6 pb-2">Support</p>
      <nav className="flex flex-col gap-0.5">
        <Link to="/tickets" className={itemClass}>
          <Ticket className="h-4 w-4 flex-shrink-0" aria-hidden />
          Tickets & features
          {nbBadge > 0 && (
            <span
              title={badgeTitle}
              className="ml-auto rounded-full bg-[var(--danger)] px-1.5 py-px text-[10.5px] font-bold text-white"
            >
              {nbBadge}
            </span>
          )}
        </Link>
        <Link to="/nouveautes" className={itemClass}>
          <Sparkles className="h-4 w-4 flex-shrink-0" aria-hidden />
          Nouveautés
        </Link>
      </nav>

      <div className="mt-auto pt-6">
        <p className="island-kicker px-3 pb-2">Administration</p>
        <nav className="flex flex-col gap-0.5">
          {modules.includes('parametres') && <ModuleLink module="parametres" />}
          <Link to="/admin/import" className={itemClass}>
            <Database className="h-4 w-4 flex-shrink-0" aria-hidden />
            Import .bak
          </Link>
        </nav>
      </div>
    </aside>
  )
}
