// « Nouveautés » : les features livrées, groupées par date de livraison
// décroissante — rendu changelog, visible de tous les services. Clic sur une
// entrée → détails (badges, description, captures — SANS le fil d'échanges)
// dans une petite carte flottante affichée à la hauteur du ticket cliqué.
// L'Administrateur dispose en plus d'un crayon par entrée qui ouvre la fiche
// complète (TicketEdit, la même que /tickets). Repris d'isfectuteurs.
// Cf. src/lib/tickets.ts (listFeaturesLivreesFn / getTicketFn).
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Image as ImageIcon,
  Loader2,
  Pencil,
  Ticket as TicketIcon,
  X,
} from 'lucide-react'

import { TicketBadge, TicketEdit } from '#/components/TicketEdit'
import {
  getTicketCaptureFn,
  getTicketFn,
  listFeaturesLivreesFn,
} from '#/lib/tickets.ts'
import {
  STATUT_BADGE,
  TICKET_STATUTS,
  TICKET_TYPES,
  TYPE_BADGE,
} from '#/lib/tickets.defs.ts'
import {
  fmtDateLongue,
  fmtTicketDate,
  grouperParDate,
} from '#/lib/tickets.helpers.ts'

export const Route = createFileRoute('/_authed/nouveautes')({
  component: NouveautesPage,
})

/**
 * Contenu de la carte de détails d'une nouveauté : badges, méta, description
 * et captures de la fiche — VOLONTAIREMENT sans le fil d'échanges (page
 * changelog en lecture) ni l'éditeur de qualification (réservé à la fiche).
 */
function FeatureDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['nouveaute', id],
    queryFn: () => getTicketFn({ data: { id } }),
    gcTime: 0,
  })
  const t = q.data

  // Aperçu plein écran d'une capture (chargé à la demande — les blobs ne
  // transitent pas dans la liste)
  const [apercu, setApercu] = useState<{
    nomFichier: string
    description: string
    dataUrl: string
  } | null>(null)
  const [apercuLoading, setApercuLoading] = useState<number | null>(null)
  async function ouvrirCapture(idCapture: number) {
    setApercuLoading(idCapture)
    try {
      const c = await getTicketCaptureFn({ data: { id: idCapture } })
      if (c) setApercu(c)
    } finally {
      setApercuLoading(null)
    }
  }

  // Captures de la fiche (celles jointes à une réponse vivent dans le fil, exclu ici)
  const capturesFiche = t?.captures.filter((c) => c.commentaireId == null) ?? []

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-[14.5px] font-extrabold text-[var(--ink)]">
          <TicketIcon size={16} className="flex-none text-[var(--gold-deep)]" />
          <span className="truncate">
            #{id}
            {t?.titre ? ` — ${t.titre}` : ''}
          </span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="flex-none rounded-lg p-1 text-[var(--ink-soft)] transition hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
        >
          <X size={16} />
        </button>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 py-6 text-[13.5px] text-[var(--ink-soft)]">
          <Loader2 className="animate-spin" size={16} /> Chargement…
        </div>
      ) : !t ? (
        <div className="py-6 text-center text-[13.5px] font-bold text-[var(--danger)]">
          Nouveauté introuvable.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Badges + méta */}
          <div className="flex flex-wrap items-center gap-2">
            <TicketBadge label={TICKET_TYPES[t.type]} cls={TYPE_BADGE[t.type]} />
            <TicketBadge
              label={TICKET_STATUTS[t.statut]}
              cls={STATUT_BADGE[t.statut]}
            />
            {t.archive && (
              <TicketBadge
                label="Archivé"
                cls="bg-[var(--paper)] text-[var(--ink-faded)]"
              />
            )}
            {/* « Livré par l'IA » — le serveur ne renvoie true qu'à l'admin */}
            {t.livreParIa && (
              <span title="Ticket livré par Claude (IA), pas par le dev — info visible du seul Administrateur.">
                <TicketBadge
                  label="Livré par l'IA"
                  cls="bg-violet-100 text-violet-700"
                />
              </span>
            )}
          </div>
          <div className="text-[12px] text-[var(--ink-faded)]">
            {t.pageConcernee && (
              <>
                page <b className="text-[var(--ink)]">{t.pageConcernee}</b> ·{' '}
              </>
            )}
            par <b>{t.creeParNom}</b> le {fmtTicketDate(t.creeLe)}
            {t.dateLivraison && ` · livré le ${fmtTicketDate(t.dateLivraison)}`}
          </div>

          {/* Description */}
          <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ink)]">
            {t.description || (
              <span className="text-[var(--muted)]">Pas de description.</span>
            )}
          </div>

          {/* Captures d'écran (fiche) */}
          {capturesFiche.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                Captures d'écran ({capturesFiche.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {capturesFiche.map((c) => {
                  const label =
                    c.description || c.nomFichier || `capture-${c.id}.png`
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => void ouvrirCapture(c.id)}
                      title={label}
                      className="relative block h-[70px] w-[110px] cursor-zoom-in overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--cream)] transition hover:border-[var(--gold)]"
                    >
                      {c.miniature ? (
                        <img
                          src={c.miniature}
                          alt={label}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[var(--ink-faded)]">
                          <ImageIcon size={20} />
                          <span className="w-full truncate text-[10px]">
                            {label}
                          </span>
                        </span>
                      )}
                      {apercuLoading === c.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <Loader2
                            size={16}
                            className="animate-spin text-[var(--ink)]"
                          />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aperçu plein écran d'une capture (légende = description sinon fichier) */}
      {apercu && (
        <div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-2 bg-[var(--ink)]/60 p-6"
          onClick={() => setApercu(null)}
        >
          <img
            src={apercu.dataUrl}
            alt={apercu.description || apercu.nomFichier}
            className="max-h-[85vh] max-w-full rounded-[10px] bg-white object-contain shadow-2xl"
          />
          {(apercu.description || apercu.nomFichier) && (
            <div className="max-w-full truncate rounded-lg bg-white/90 px-3 py-1 text-[12.5px] font-semibold text-[var(--ink)] shadow">
              {apercu.description || apercu.nomFichier}
            </div>
          )}
        </div>
      )}
    </>
  )
}

const BOX_W = 460

function NouveautesPage() {
  const { session } = Route.useRouteContext()
  const estAdmin = session.user.service === 'admin'
  const userEmail = session.user.email.toLowerCase()
  // Sélection : id du ticket + `anchor` = haut du ticket cliqué (px) ;
  // `left` = bord droit du ticket (px), relatifs au conteneur → la carte
  // flottante se colle juste à droite de l'entrée, à sa hauteur
  const [sel, setSel] = useState<{
    id: number
    anchor: number
    left: number
  } | null>(null)
  const [boxTop, setBoxTop] = useState(0)
  const [boxLeft, setBoxLeft] = useState(0)
  const paneRef = useRef<HTMLDivElement>(null)
  // Édition d'une nouveauté : fiche complète, réservée à l'admin
  const [editId, setEditId] = useState<number | null>(null)

  const qc = useQueryClient()
  const refreshListe = () => {
    void qc.invalidateQueries({ queryKey: ['features-livrees'] })
    void qc.invalidateQueries({ queryKey: ['nouveaute'] })
  }

  const q = useQuery({
    queryKey: ['features-livrees'],
    queryFn: () => listFeaturesLivreesFn(),
  })
  const groupes = grouperParDate(q.data ?? [])

  // Carte ancrée sur le HAUT du ticket cliqué ; recalée si elle sortirait du
  // conteneur à droite
  useEffect(() => {
    if (!sel) return
    const place = () => {
      const paneW = paneRef.current?.clientWidth ?? 0
      setBoxTop(Math.max(8, sel.anchor))
      setBoxLeft(Math.max(8, Math.min(sel.left, paneW - BOX_W - 8)))
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [sel])

  function onPick(e: React.MouseEvent<HTMLButtonElement>, id: number) {
    if (sel?.id === id) {
      setSel(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const cont = paneRef.current?.getBoundingClientRect()
    const anchor = cont ? rect.top - cont.top : 0
    const left = cont ? rect.right - cont.left + 16 : 0
    setBoxTop(anchor)
    setBoxLeft(left)
    setSel({ id, anchor, left })
  }

  return (
    <div ref={paneRef} className="relative px-5 py-5 sm:px-7">
      <div className="mb-4">
        <p className="island-kicker mb-1">Support</p>
        <h1 className="text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
          Nouveautés
        </h1>
        <p className="text-[13px] text-[var(--muted)]">
          Les features livrées dans l'application, par date de livraison
        </p>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-[14px] text-[var(--ink-soft)]">
          <Loader2 className="animate-spin" size={18} /> Chargement…
        </div>
      ) : groupes.length === 0 ? (
        <div className="island-shell max-w-[860px] rounded-xl px-5 py-10 text-center text-[13.5px] text-[var(--muted)]">
          Aucune feature livrée pour le moment — les demandes marquées « Livré »
          sur la page Tickets & features apparaîtront ici.
        </div>
      ) : (
        <div className="max-w-[560px] space-y-6">
          {groupes.map((g) => (
            <div key={g.date}>
              <div className="mb-2.5 flex items-center gap-2">
                <h2 className="text-[15px] font-extrabold text-[var(--ink)]">
                  {fmtDateLongue(g.date)}
                </h2>
                <span className="text-[12px] text-[var(--ink-faded)]">
                  {g.items.length} feature{g.items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {g.items.map((f) => {
                  const actif = sel?.id === f.id
                  return (
                    <div
                      key={f.id}
                      className={`flex items-start rounded-xl border bg-white transition ${
                        actif
                          ? 'border-[var(--gold)] shadow-[inset_3px_0_0_0_var(--gold)]'
                          : 'border-[var(--line)] hover:border-[var(--gold)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => onPick(e, f.id)}
                        className="block min-w-0 flex-1 px-4 py-3 text-left"
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="text-[12px] font-bold text-[var(--ink-faded)]">
                            #{f.id}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[var(--ink)]">
                            {f.titre}
                          </span>
                          {f.pageConcernee && (
                            <span className="flex-none rounded-md bg-[var(--info-tint)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--ink)]">
                              {f.pageConcernee}
                            </span>
                          )}
                        </span>
                        {f.description && (
                          <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed whitespace-pre-line text-[var(--ink-soft)]">
                            {f.description}
                          </span>
                        )}
                      </button>
                      {estAdmin && (
                        <button
                          type="button"
                          title={`Modifier le ticket #${f.id}`}
                          aria-label={`Modifier le ticket #${f.id}`}
                          onClick={() => setEditId(f.id)}
                          className="my-3 mr-3 flex-none rounded-lg border border-[var(--line)] p-1.5 text-[var(--ink-faded)] transition hover:border-[var(--gold)] hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Carte de détails flottante — affichée à la hauteur du ticket cliqué */}
      {sel && (
        <div
          style={{ top: boxTop, left: boxLeft, width: BOX_W }}
          className="absolute z-20 rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_18px_44px_-14px_rgba(35,43,73,0.45)]"
        >
          <FeatureDetail id={sel.id} onClose={() => setSel(null)} />
        </div>
      )}

      {/* Fiche complète (admin) : même éditeur que /tickets */}
      {editId != null && (
        <TicketEdit
          id={editId}
          estAdmin={estAdmin}
          userEmail={userEmail}
          onClose={() => {
            setEditId(null)
            refreshListe()
          }}
          onChanged={refreshListe}
          onJumpTo={setEditId}
        />
      )}
    </div>
  )
}
