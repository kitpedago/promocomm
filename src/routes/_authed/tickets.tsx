// Suivi des tickets / features (mini-Mantis repris du SaaS isfectuteurs) —
// liste DataTable + fiche modale. Tous les services connectés : voir, créer
// (bouton « Nouveau ticket » ici et bouton « Signaler » global du Header),
// commenter. Service Administrateur (= le dev) : qualification dans la fiche.
// Deep-link `?ticket=<id>` : ouvre directement la fiche.
// Cf. src/lib/tickets.ts / docs/superpowers/specs/2026-08-13-tickets-nouveautes-design.md.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { EyeOff, Megaphone } from 'lucide-react'

import DataTable from '#/components/DataTable'
import { TicketBadge, TicketEdit } from '#/components/TicketEdit'
import { TicketNouveau } from '#/components/TicketNouveau'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { listTicketsFn } from '#/lib/tickets.ts'
import {
  GRAVITE_BADGE,
  STATUT_BADGE,
  TICKET_GRAVITES,
  TICKET_STATUTS,
  TICKET_TYPES,
  TYPE_BADGE,
} from '#/lib/tickets.defs.ts'
import { fmtTicketDate } from '#/lib/tickets.helpers.ts'

import type { ColumnDef } from '@tanstack/react-table'
import type {
  TicketGravite,
  TicketListItem,
  TicketStatut,
  TicketType,
} from '#/lib/tickets.defs.ts'

export const Route = createFileRoute('/_authed/tickets')({
  // Deep-link `?ticket=<id>` : ouvre directement la fiche du ticket
  validateSearch: (s: Record<string, unknown>): { ticket?: number } => ({
    ticket:
      s.ticket != null && /^\d+$/.test(String(s.ticket))
        ? Number(s.ticket)
        : undefined,
  }),
  component: TicketsPage,
})

const STATUT_OPTIONS = [
  { value: 'ouverts', label: 'Tickets ouverts' },
  { value: 'tous', label: 'Tous les statuts' },
  ...(Object.keys(TICKET_STATUTS) as Array<TicketStatut>).map((s) => ({
    value: s,
    label: TICKET_STATUTS[s],
  })),
  // Pseudo-valeur : les archivés sont masqués de toutes les autres vues
  { value: 'archives', label: 'Archivés' },
]
const TYPE_OPTIONS = [
  { value: 'tous', label: 'Bugs + features' },
  ...(Object.keys(TICKET_TYPES) as Array<TicketType>).map((t) => ({
    value: t,
    label: TICKET_TYPES[t],
  })),
]
const GRAVITE_OPTIONS = [
  { value: 'toutes', label: 'Toutes gravités' },
  ...(Object.keys(TICKET_GRAVITES) as Array<TicketGravite>).map((g) => ({
    value: g,
    label: TICKET_GRAVITES[g],
  })),
]

/** Mini-jauge d'avancement (informatif — cf. fiche pour la valeur). */
function Jauge({ pct }: { pct: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-[6px] w-[54px] overflow-hidden rounded-full bg-[var(--cream-hover)]">
        <span
          className="block h-full rounded-full bg-[var(--gold)]"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </span>
      <span className="text-[11.5px] text-[var(--ink-faded)]">{pct}%</span>
    </span>
  )
}

function colonnes(estAdmin: boolean): Array<ColumnDef<TicketListItem, any>> {
  const cols: Array<ColumnDef<TicketListItem, any>> = [
    {
      accessorKey: 'id',
      header: 'N°',
      size: 70,
      cell: ({ row }) => (
        <span className="font-bold whitespace-nowrap text-[var(--ink)]">
          {estAdmin && row.original.nonLu && (
            <span
              title="Activité non lue"
              className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[var(--danger)] align-middle"
            />
          )}
          #{row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 80,
      cell: ({ row }) => (
        <TicketBadge
          label={TICKET_TYPES[row.original.type]}
          cls={TYPE_BADGE[row.original.type]}
        />
      ),
    },
    {
      accessorKey: 'gravite',
      header: 'Gravité',
      size: 90,
      // Gravité : bugs seulement (sans objet pour une feature)
      cell: ({ row }) =>
        row.original.type === 'bug' ? (
          <TicketBadge
            label={TICKET_GRAVITES[row.original.gravite]}
            cls={GRAVITE_BADGE[row.original.gravite]}
          />
        ) : (
          <span className="text-[var(--muted)]">—</span>
        ),
    },
    {
      accessorKey: 'titre',
      header: 'Titre',
      size: 340,
      cell: ({ row }) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-[var(--ink)]">
            {row.original.titre}
          </span>
          <span className="block truncate text-[11.5px] text-[var(--ink-faded)]">
            {row.original.attenteMaReponse && (
              <span className="mr-1.5 rounded bg-[var(--gold-tint)] px-1.5 py-px text-[10.5px] font-bold text-[var(--gold-ink)]">
                Réponse attendue de vous
              </span>
            )}
            {row.original.pageConcernee || '—'}
            {row.original.nbCommentaires > 0 &&
              ` · ${row.original.nbCommentaires} comm.`}
            {row.original.nbCaptures > 0 &&
              ` · ${row.original.nbCaptures} capture(s)`}
          </span>
        </span>
      ),
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      size: 110,
      cell: ({ row }) => (
        <TicketBadge
          label={
            row.original.statut === 'doublon' && row.original.ticketDoublonId
              ? `Doublon #${row.original.ticketDoublonId}`
              : TICKET_STATUTS[row.original.statut]
          }
          cls={STATUT_BADGE[row.original.statut]}
        />
      ),
    },
    {
      accessorKey: 'avancement',
      header: 'Avancement',
      size: 110,
      cell: ({ row }) => <Jauge pct={row.original.avancement} />,
    },
    { accessorKey: 'creeParNom', header: 'Créé par', size: 130 },
    {
      accessorKey: 'creeLe',
      header: 'Créé le',
      size: 130,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[var(--ink-faded)]">
          {fmtTicketDate(row.original.creeLe)}
        </span>
      ),
    },
    {
      accessorKey: 'dateLivraison',
      header: 'Livré le',
      size: 100,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-[var(--ink-faded)]">
          {fmtTicketDate(row.original.dateLivraison)}
        </span>
      ),
    },
  ]
  if (estAdmin)
    cols.push({
      accessorKey: 'masqueNouveautes',
      header: 'Nouveautés',
      size: 100,
      // « Masqué dans Nouveautés » : features seulement
      cell: ({ row }) =>
        row.original.type === 'feature' && row.original.masqueNouveautes ? (
          <span
            title="Feature masquée de la page Nouveautés"
            className="inline-flex items-center gap-1 rounded-md bg-[var(--cream-hover)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--ink-soft)]"
          >
            <EyeOff size={12} />
            Masqué
          </span>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        ),
    })
  return cols
}

function TicketsPage() {
  const { session } = Route.useRouteContext()
  const estAdmin = session.user.service === 'admin'
  const userEmail = session.user.email.toLowerCase()

  const [statut, setStatut] = useState('ouverts')
  const [type, setType] = useState('tous')
  const [gravite, setGravite] = useState('toutes')
  // Ouverture initiale via deep-link `?ticket=<id>`
  const { ticket: ticketParam } = Route.useSearch()
  const [openId, setOpenId] = useState<number | null>(ticketParam ?? null)
  const [nouveau, setNouveau] = useState(false)

  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['tickets', statut, type, gravite],
    queryFn: () =>
      listTicketsFn({
        data: {
          statut: statut === 'tous' ? '' : statut,
          type: type === 'tous' ? '' : type,
          gravite: gravite === 'toutes' ? '' : gravite,
        },
      }),
  })
  const refreshList = () => {
    void qc.invalidateQueries({ queryKey: ['tickets'] })
    // Badge « Tickets » du menu (Sidebar) : lecture/écriture changent le compte
    void qc.invalidateQueries({ queryKey: ['tickets-badge'] })
  }

  return (
    <div className="px-5 py-5 sm:px-7">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <p className="island-kicker mb-1">Support</p>
          <h1 className="text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
            Tickets & features
          </h1>
        </div>
        <span className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => setNouveau(true)}>
            <Megaphone />
            Nouveau ticket
          </Button>
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select value={statut} onValueChange={setStatut}>
          <SelectTrigger className="h-9 w-[180px] bg-white text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[160px] bg-white text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gravite} onValueChange={setGravite}>
          <SelectTrigger className="h-9 w-[160px] bg-white text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRAVITE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        id="tickets"
        columns={colonnes(estAdmin)}
        data={q.data ?? []}
        unite="tickets"
        getRowId={(r) => String(r.id)}
        selectedRowId={openId != null ? String(openId) : null}
        onRowClick={(r) => setOpenId(r.id)}
        emptyText="Aucun ticket — signalez un bug ou demandez une feature avec le bouton « Nouveau ticket »."
      />
      {(q.data?.length ?? 0) >= 300 && (
        <p className="mt-2 text-[12px] text-[var(--ink-faded)]">
          Affichage limité aux 300 derniers tickets — affinez les filtres.
        </p>
      )}

      {nouveau && (
        <TicketNouveau
          pagePath="/tickets"
          onClose={() => setNouveau(false)}
          onCreated={(id) => {
            refreshList()
            setOpenId(id)
          }}
        />
      )}
      {openId != null && (
        <TicketEdit
          id={openId}
          estAdmin={estAdmin}
          userEmail={userEmail}
          onClose={() => {
            setOpenId(null)
            // Ouvrir la fiche a marqué le ticket lu (getTicketFn) → refléter le
            // point rouge de la liste et le badge du menu à la fermeture
            refreshList()
          }}
          onChanged={refreshList}
          onJumpTo={setOpenId}
        />
      )}
    </div>
  )
}
