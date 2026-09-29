import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '#/components/ui/button'
import { importerBddProdFn } from '#/lib/importprod.ts'

// L'import des .bak (SQL Server → legacy → public) est désactivé : la base
// vit dans l'application. Ne reste ici que la copie prod → local.
export const Route = createFileRoute('/_authed/admin/import')({
  component: ImportPage,
})

function ImportPage() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-10 pt-10">
      <ImportProdSection />
    </main>
  )
}

/**
 * Remplacement de la base locale par une copie de la production. Réservé au
 * service Administrateur (le serveur revérifie : cette page est atteignable
 * par tous les services).
 */
function ImportProdSection() {
  const importer = useMutation({ mutationFn: () => importerBddProdFn() })
  const r = importer.data

  return (
    <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
      <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
        Copier la base de production ici
      </h2>
      <p className="mb-4 max-w-3xl text-sm text-[var(--sea-ink-soft)]">
        Vide la base locale (schéma <code>public</code>) et y recopie toutes les
        données de <code>PROD_DATABASE_URL</code>. Le schéma <code>legacy</code>{' '}
        n'est pas touché. Les comptes et leurs préférences non plus (
        <code>user</code>, <code>session</code>, <code>account</code>,{' '}
        <code>verification</code>, <code>user_pref</code>) : vous restez
        connecté et les comptes locaux sont conservés.
      </p>
      <Button
        variant="destructive"
        disabled={importer.isPending}
        onClick={() => {
          if (
            window.confirm(
              'Les données locales (hors comptes) seront effacées et remplacées par celles de la production. Continuer ?',
            )
          )
            importer.mutate()
        }}
      >
        {importer.isPending ? 'Copie en cours…' : 'Écraser la base locale'}
      </Button>
      {importer.isError && (
        <p className="mt-3 text-sm text-red-600">
          {importer.error instanceof Error
            ? importer.error.message
            : 'Échec de la copie'}
        </p>
      )}
      {r && (
        <div className="mt-3 text-sm text-[var(--sea-ink-soft)]">
          <p>
            ✅ {r.lignes} lignes copiées sur {r.tables} tables.
          </p>
          {r.echecs.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-600">
              {r.echecs.map((e) => (
                <li key={e.table}>
                  {e.table} : {e.erreur}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
