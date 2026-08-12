// Module Acquéreurs (FEN_Table_Acquereur) — phase 1, lecture.
// Référence : migration_windev/captures_ecrans/Acquéreurs.png : arbre de
// filtre par opération à gauche, recherche nom/email/téléphones (≥ 3 car.),
// personnes morales (SCCV) mêlées aux particuliers, « lot courant » calculé.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import DataTable from '#/components/DataTable'
import PanneauOperations from '#/components/PanneauOperations'
import { getAcquereursFn } from '#/lib/acquereurs.ts'
import { getService } from '#/lib/services'
import { sansAccents } from '#/lib/utils.ts'

import type { LigneAcquereur } from '#/lib/acquereurs.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_authed/acquereurs')({
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('acquereurs')) throw redirect({ to: '/' })
  },
  component: PageAcquereurs,
})

const COLONNES: Array<ColumnDef<LigneAcquereur, any>> = [
  {
    accessorKey: 'nomComplet',
    header: 'Nom complet',
    size: 280,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'lotCourant',
    header: 'Lot courant',
    size: 300,
    cell: (c) => c.getValue() ?? '—',
  },
  {
    accessorKey: 'civilite',
    header: 'Civilité',
    size: 150,
    cell: (c) => c.getValue() || '—',
  },
  {
    accessorKey: 'prenoms',
    header: 'Prénom(s)',
    size: 180,
    cell: (c) => c.getValue() || '—',
  },
  { accessorKey: 'email', header: 'Email', size: 220 },
  { accessorKey: 'telephone', header: 'Téléphone 1', size: 120 },
  { accessorKey: 'portable', header: 'Téléphone 2', size: 120 },
  { accessorKey: 'communeActuelle', header: 'Commune actuelle', size: 160 },
]

function PageAcquereurs() {
  // null = toutes les opérations ; re-clic sur l'opération sélectionnée = désélection
  const [opId, setOpId] = useState<number | null>(null)
  const [recherche, setRecherche] = useState('')

  const acquereurs = useQuery({
    queryKey: ['acquereurs'],
    queryFn: () => getAcquereursFn(),
    staleTime: 60_000,
  })

  const filtres = useMemo(() => {
    let liste = acquereurs.data ?? []
    if (opId != null) {
      liste = liste.filter((a) => a.operationIds?.includes(opId))
    }
    const q = sansAccents(recherche.trim())
    if (q.length >= 3) {
      liste = liste.filter((a) =>
        sansAccents(
          `${a.nomComplet ?? ''} ${a.email ?? ''} ${a.email2 ?? ''} ${a.telephone ?? ''} ${a.portable ?? ''}`,
        ).includes(q),
      )
    }
    return liste
  }, [acquereurs.data, opId, recherche])

  return (
    <div className="flex min-h-[calc(100vh-61px)] items-stretch">
      <PanneauOperations
        selectedId={opId}
        onSelect={(id) => setOpId((prev) => (prev === id ? null : id))}
      />

      <div className="min-w-0 flex-1 px-5 py-5 sm:px-7">
        <h1 className="mb-3 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
          Acquéreurs
        </h1>

        <label className="mb-4 flex w-fit max-w-full items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--ink-soft)]">
            Filtrer sur le nom, email, Téléphone 1 et 2
          </span>
          <span className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5">
            <Search className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Au moins 3 carac."
              className="w-44 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
            />
          </span>
        </label>

        <DataTable
          id="acquereurs"
          columns={COLONNES}
          data={filtres}
          unite="acquéreurs"
          getRowId={(a) => String(a.id)}
          defaultHidden={['email', 'telephone', 'portable', 'communeActuelle']}
          emptyText={
            acquereurs.isLoading ? 'Chargement…' : 'Aucun acquéreur trouvé.'
          }
        />
      </div>
    </div>
  )
}
