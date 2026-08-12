import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { getEtlStatusFn, startImportFn } from '#/lib/etl/fns.ts'

export const Route = createFileRoute('/_authed/admin/import')({
  component: ImportPage,
})

const fmtDate = (d: string | Date | null) =>
  d ? new Date(d).toLocaleString('fr-FR') : '—'

function ImportPage() {
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ['etl-status'],
    queryFn: () => getEtlStatusFn(),
    refetchInterval: (query) =>
      query.state.data?.runs.some((r) => r.status === 'running') ? 2000 : 15000,
  })
  const launch = useMutation({
    mutationFn: (file: string) => startImportFn({ data: { file } }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['etl-status'] }),
  })

  const data = status.data
  const runningRun = data?.runs.find((r) => r.status === 'running')

  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-10 pt-10">
      <section className="island-shell rounded-xl px-6 py-8 sm:px-10">
        <p className="island-kicker mb-2">Interne — phase de développement</p>
        <h1 className="display-title mb-3 text-3xl font-bold tracking-tight text-[var(--sea-ink)]">
          Import des données (.bak)
        </h1>
        <p className="max-w-3xl text-sm text-[var(--sea-ink-soft)]">
          Restaure une sauvegarde SQL Server du client dans le conteneur d'ETL,
          puis recopie toutes les tables telles quelles dans le schéma{' '}
          <code>legacy</code> de PostgreSQL. Relançable à chaque nouveau .bak ;
          le schéma <code>legacy</code> est vidé et rechargé à chaque import.
        </p>
      </section>

      {status.isLoading && (
        <p className="px-2 text-sm text-[var(--sea-ink-soft)]">Chargement…</p>
      )}

      {data && (
        <>
          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              SQL Server d'ETL
            </h2>
            {data.mssql.up ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                ✅ Conteneur joignable.{' '}
                {data.mssql.sourceDbExists
                  ? `Base restaurée présente (${data.mssql.tableCount} tables).`
                  : 'Aucune base restaurée pour le moment.'}
              </p>
            ) : (
              <div className="text-sm text-[var(--sea-ink-soft)]">
                <p className="mb-2">
                  ⚠️ SQL Server injoignable. Démarrer le profil ETL sur le
                  serveur :
                </p>
                <pre className="overflow-x-auto rounded-lg bg-black/80 p-3 text-xs text-neutral-100">
                  docker compose --profile etl up -d
                </pre>
                {data.mssql.error && (
                  <p className="mt-2 text-xs opacity-70">{data.mssql.error}</p>
                )}
              </div>
            )}
          </section>

          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              Fichiers .bak disponibles
            </h2>
            <p className="mb-4 text-xs text-[var(--sea-ink-soft)]">
              Déposer les fichiers dans <code>{data.bakDir}</code> (scp/rsync
              vers le serveur), ils apparaissent ici.
            </p>
            {data.bakFiles.length === 0 ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Aucun fichier .bak pour le moment.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-wide text-[var(--sea-ink-soft)]">
                    <th className="py-2 pr-4">Fichier</th>
                    <th className="py-2 pr-4">Taille</th>
                    <th className="py-2 pr-4">Modifié le</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.bakFiles.map((f) => (
                    <tr key={f.name} className="border-b border-[var(--line)]">
                      <td className="py-2 pr-4 font-medium text-[var(--sea-ink)]">
                        {f.name}
                      </td>
                      <td className="py-2 pr-4">{f.sizeMb} Mo</td>
                      <td className="py-2 pr-4">{fmtDate(f.modifiedAt)}</td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          disabled={
                            !data.mssql.up || !!runningRun || launch.isPending
                          }
                          onClick={() => launch.mutate(f.name)}
                        >
                          Restaurer et importer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {launch.isError && (
              <p className="mt-3 text-sm text-red-600">
                {launch.error instanceof Error
                  ? launch.error.message
                  : 'Erreur au lancement de l’import'}
              </p>
            )}
          </section>

          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              Historique des imports
            </h2>
            {data.runs.length === 0 ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Aucun import lancé pour le moment.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {data.runs.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-[var(--line)] p-4"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="font-semibold text-[var(--sea-ink)]">
                        Run #{r.id}
                      </span>
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-[var(--sea-ink-soft)]">
                        {fmtDate(r.startedAt)}
                        {r.finishedAt ? ` → ${fmtDate(r.finishedAt)}` : ''}
                      </span>
                    </div>
                    {r.status === 'running' && (
                      <div className="my-2">
                        <p className="mb-1 text-xs text-[var(--sea-ink-soft)]">
                          {r.step} — {r.tablesDone}/{r.tablesTotal || '?'}{' '}
                          tables
                        </p>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--gold)] transition-all"
                            style={{
                              width: r.tablesTotal
                                ? `${Math.round((r.tablesDone / r.tablesTotal) * 100)}%`
                                : '4%',
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {r.log && (
                      <details open={r.status === 'running'}>
                        <summary className="cursor-pointer text-xs text-[var(--sea-ink-soft)]">
                          Journal
                        </summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/80 p-3 text-xs leading-relaxed text-neutral-100">
                          {r.log}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running:
      'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  }
  const labels: Record<string, string> = {
    running: 'en cours',
    done: 'terminé',
    error: 'erreur',
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ''}`}
    >
      {labels[status] ?? status}
    </span>
  )
}
