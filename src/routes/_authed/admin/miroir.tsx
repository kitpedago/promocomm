import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '#/components/ui/button'
import {
  creerLecteurMiroirFn,
  getLecteurMdpFn,
  getMiroirEtatFn,
  lancerMiroirFn,
  setMiroirPlanifFn,
} from '#/lib/miroir.ts'

import type { Planif } from '#/lib/miroir.ts'

export const Route = createFileRoute('/_authed/admin/miroir')({
  component: MiroirPage,
})

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR') : '—'
const msg = (e: unknown, defaut: string) =>
  e instanceof Error ? e.message : defaut
const champ =
  'rounded-md border border-[var(--line)] bg-transparent px-2 py-1 text-[var(--sea-ink)]'

// getDay() : lundi = 1 … samedi = 6, dimanche = 0
const JOURS: Array<[number, string]> = [
  [1, 'Lun'],
  [2, 'Mar'],
  [3, 'Mer'],
  [4, 'Jeu'],
  [5, 'Ven'],
  [6, 'Sam'],
  [0, 'Dim'],
]
const libelleJours = (jours: Array<number>) =>
  jours.length === 7
    ? 'tous les jours'
    : JOURS.filter(([j]) => jours.includes(j))
        .map(([, l]) => l.toLowerCase())
        .join(', ')

function MiroirPage() {
  const queryClient = useQueryClient()
  const invalider = () =>
    queryClient.invalidateQueries({ queryKey: ['miroir-etat'] })
  const etat = useQuery({
    queryKey: ['miroir-etat'],
    queryFn: () => getMiroirEtatFn(),
    refetchInterval: (q) => (q.state.data?.enCours ? 2000 : 15000),
  })
  const lancer = useMutation({
    mutationFn: () => lancerMiroirFn(),
    onSettled: invalider,
  })
  const planifier = useMutation({
    mutationFn: (p: Planif) => setMiroirPlanifFn({ data: p }),
    onSettled: invalider,
  })
  const lecteur = useMutation({
    mutationFn: () => creerLecteurMiroirFn(),
    onSettled: invalider,
  })
  const revelerMdp = useMutation({ mutationFn: () => getLecteurMdpFn() })
  // mot de passe affiché : celui qui vient d'être généré, sinon celui relu
  const mdpAffiche = lecteur.data?.motDePasse ?? revelerMdp.data
  // null = pas de saisie en cours, on affiche la valeur serveur
  const [saisie, setSaisie] = useState<Planif | null>(null)

  const d = etat.data
  const dernier = d?.dernier
  const p: Planif = saisie ??
    d?.planif ?? {
      intervalleMin: 0,
      jours: [],
      heureDebut: '00:00',
      heureFin: '24:00',
    }
  const modifier = (patch: Partial<Planif>) => setSaisie({ ...p, ...patch })

  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-10 pt-10">
      <section className="island-shell rounded-xl px-6 py-8 sm:px-10">
        <p className="island-kicker mb-2">Administration</p>
        <h1 className="display-title mb-3 text-3xl font-bold tracking-tight text-[var(--sea-ink)]">
          Base miroir (noms SQL Server)
        </h1>
        <p className="max-w-3xl text-sm text-[var(--sea-ink-soft)]">
          Copie en lecture seule des données de l'application dans une base dont
          les tables et colonnes portent les noms de l'ancienne base SQL Server
          (<code>tOperation.IDOperation</code>…), pour les outils externes.
          Vidée et rechargée à chaque passage.
        </p>
      </section>

      {etat.isLoading && (
        <p className="px-2 text-sm text-[var(--sea-ink-soft)]">Chargement…</p>
      )}
      {etat.isError && (
        <p className="px-2 text-sm text-red-600">
          {msg(etat.error, 'Erreur de chargement')}
        </p>
      )}

      {d && !d.configure && (
        <section className="island-shell rounded-xl px-6 py-6 text-sm text-[var(--sea-ink-soft)] sm:px-10">
          ⚠️ <code>MIROIR_DB</code> n'est pas renseignée dans le{' '}
          <code>.env</code> : miroir désactivé.
        </section>
      )}

      {d?.configure && (
        <>
          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              Rafraîchir maintenant
            </h2>
            <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
              Cible : <code>{d.cible}</code> — le job écrit avec son propre
              rôle, sans accès à la base de l'application.
            </p>
            <Button
              disabled={d.enCours || lancer.isPending}
              onClick={() => lancer.mutate()}
            >
              {d.enCours ? 'Rafraîchissement en cours…' : 'Rafraîchir'}
            </Button>
            {lancer.isError && (
              <p className="mt-3 text-sm text-red-600">
                {msg(lancer.error, 'Échec du lancement')}
              </p>
            )}
          </section>

          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              Planification
            </h2>
            <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
              {d.planif.intervalleMin > 0
                ? `Toutes les ${d.planif.intervalleMin} min, ${libelleJours(d.planif.jours)}, de ${d.planif.heureDebut} à ${d.planif.heureFin} — prochain passage ${fmtDate(d.prochain)}.`
                : 'Désactivée : rafraîchissement à la demande seulement.'}
            </p>
            <form
              className="flex flex-col gap-3 text-sm text-[var(--sea-ink-soft)]"
              onSubmit={(e) => {
                e.preventDefault()
                planifier.mutate(p)
                setSaisie(null)
              }}
            >
              <label>
                Intervalle (minutes, 0 = désactivé)
                <input
                  type="number"
                  min={0}
                  max={7 * 24 * 60}
                  value={p.intervalleMin}
                  onChange={(e) =>
                    modifier({ intervalleMin: Number(e.target.value) })
                  }
                  className={champ + ' ml-2 w-24'}
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span>Jours</span>
                {JOURS.map(([j, l]) => (
                  <label key={j} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.jours.includes(j)}
                      onChange={(e) =>
                        modifier({
                          jours: e.target.checked
                            ? [...p.jours, j]
                            : p.jours.filter((x) => x !== j),
                        })
                      }
                    />
                    {l}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label>
                  De
                  <input
                    type="time"
                    value={p.heureDebut}
                    onChange={(e) => modifier({ heureDebut: e.target.value })}
                    className={champ + ' ml-2'}
                  />
                </label>
                <label>
                  à
                  <input
                    type="time"
                    value={p.heureFin === '24:00' ? '23:59' : p.heureFin}
                    onChange={(e) =>
                      modifier({
                        heureFin:
                          e.target.value === '23:59' ? '24:00' : e.target.value,
                      })
                    }
                    className={champ + ' ml-2'}
                  />
                </label>
                <span className="text-xs">(heure du serveur)</span>
              </div>
              <div>
                <Button type="submit" size="sm" disabled={planifier.isPending}>
                  Enregistrer
                </Button>
              </div>
            </form>
            {planifier.isError && (
              <p className="mt-3 text-sm text-red-600">
                {msg(planifier.error, 'Échec de l’enregistrement')}
              </p>
            )}
          </section>

          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              Accès lecteur (outils externes)
            </h2>
            <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">
              Utilisateur PostgreSQL <code>{d.lecteur.role}</code>, lecture
              seule sur le miroir, sans accès à la base de l'application.{' '}
              {d.lecteur.existe === true && 'Créé.'}
              {d.lecteur.existe === false && 'Pas encore créé.'}
            </p>
            <p className="mb-4 text-sm text-[var(--sea-ink-soft)]">
              Connexion : <code>{d.lecteur.url}</code>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={lecteur.isPending || d.enCours}
                onClick={() => {
                  if (
                    d.lecteur.existe !== true ||
                    window.confirm(
                      'Un nouveau mot de passe remplacera l’ancien : les outils déjà configurés devront être mis à jour. Continuer ?',
                    )
                  )
                    lecteur.mutate()
                }}
              >
                {d.lecteur.existe === true
                  ? 'Régénérer le mot de passe'
                  : 'Créer l’utilisateur'}
              </Button>
              {d.lecteur.existe === true && !mdpAffiche && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={revelerMdp.isPending}
                  onClick={() => revelerMdp.mutate()}
                >
                  Afficher le mot de passe
                </Button>
              )}
            </div>
            {(lecteur.isError || revelerMdp.isError) && (
              <p className="mt-3 text-sm text-red-600">
                {msg(lecteur.error ?? revelerMdp.error, 'Échec')}
              </p>
            )}
            {mdpAffiche !== undefined && (
              <div className="mt-3 text-sm text-[var(--sea-ink-soft)]">
                {mdpAffiche ? (
                  <>
                    <p>
                      Mot de passe de <code>{d.lecteur.role}</code> :
                    </p>
                    <pre className="mt-2 select-all rounded-lg bg-black/80 p-3 text-sm text-neutral-100">
                      {mdpAffiche}
                    </pre>
                  </>
                ) : (
                  <p>
                    Aucun mot de passe enregistré (utilisateur créé avant la
                    conservation, ou clé de chiffrement changée) : le régénérer.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="island-shell rounded-xl px-6 py-6 sm:px-10">
            <h2 className="mb-3 text-lg font-semibold text-[var(--sea-ink)]">
              Dernier passage
            </h2>
            {!dernier ? (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Aucun passage depuis le démarrage de l'application.
              </p>
            ) : (
              <div className="text-sm text-[var(--sea-ink-soft)]">
                <p>
                  {fmtDate(dernier.debut)}
                  {dernier.fin ? ` → ${fmtDate(dernier.fin)}` : ' — en cours'}
                </p>
                {dernier.erreur ? (
                  <p className="mt-1 text-red-600">❌ {dernier.erreur}</p>
                ) : dernier.fin ? (
                  <p className="mt-1">
                    ✅ {dernier.lignes} lignes copiées sur {dernier.tables}{' '}
                    tables
                    {dernier.echecs.length > 0 &&
                      `, ${dernier.echecs.length} échec(s)`}
                    .
                  </p>
                ) : null}
                {dernier.echecs.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs text-red-600">
                    {dernier.echecs.map((e) => (
                      <li key={e.table}>
                        {e.table} : {e.erreur}
                      </li>
                    ))}
                  </ul>
                )}
                {dernier.journal && (
                  <details className="mt-2" open={!dernier.fin}>
                    <summary className="cursor-pointer text-xs">
                      Journal
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/80 p-3 text-xs leading-relaxed text-neutral-100">
                      {dernier.journal}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
