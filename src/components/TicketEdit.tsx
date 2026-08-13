// Fiche ticket (modale des pages /tickets et /nouveautes) : description,
// captures (aperçu à la demande — les blobs ne transitent jamais dans la
// liste), fil d'échanges déposeur ↔ dev, panneau de qualification (service
// ADMINISTRATEUR = le dev) : statut, doublon « même que #X », avancement,
// date de livraison, titre & description, réattribution du déposeur,
// archivage, masquage Nouveautés, suppression. Repris d'isfectuteurs.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  CornerDownRight,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquare,
  Pencil,
  Ticket as TicketIcon,
  Trash2,
} from 'lucide-react'

import { ChampForm, ErreurMutation } from '#/components/ChampsModale'
import { CaptureDropZone, CaptureThumbs } from '#/components/TicketNouveau'
import { Button } from '#/components/ui/button'
import { useConfirmation } from '#/components/ui/confirmation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { SERVICES, serviceEmail } from '#/lib/services'
import {
  addTicketCapturesFn,
  addTicketCommentaireFn,
  archiverTicketFn,
  deleteTicketCommentaireFn,
  deleteTicketFn,
  getTicketCaptureFn,
  getTicketFn,
  renameTicketCaptureFn,
  setTicketMasqueNouveautesFn,
  updateTicketCommentaireFn,
  updateTicketStatutFn,
} from '#/lib/tickets.ts'
import { readCaptureFiles } from '#/lib/tickets.captures.ts'
import {
  GRAVITE_BADGE,
  STATUT_BADGE,
  TICKET_GRAVITES,
  TICKET_STATUTS,
  TICKET_STATUTS_CLOS,
  TICKET_TYPES,
  TYPE_BADGE,
} from '#/lib/tickets.defs.ts'
import { fmtTicketDate } from '#/lib/tickets.helpers.ts'

import type { CaptureDraft } from '#/lib/tickets.captures.ts'
import type {
  TicketCaptureMeta,
  TicketGravite,
  TicketStatut,
  TicketType,
} from '#/lib/tickets.defs.ts'

export function TicketBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  )
}

/** Date du jour au format AAAA-MM-JJ (locale — pour l'input date). */
function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** Réattribution du déposeur : les comptes services (liste statique). */
const DEPOSANT_OPTIONS = SERVICES.map((s) => ({
  value: serviceEmail(s.slug),
  label: s.label,
}))

/**
 * Tuile de capture : mini-aperçu cliquable (vignette `miniature`, icône de
 * repli) → aperçu plein écran ; légende = description (renommage) sinon nom de
 * fichier, crayon d'édition inline pour l'auteur de la capture ou l'admin.
 */
function CaptureTile({
  c,
  canRename,
  loading,
  onOpen,
  onRename,
}: {
  c: TicketCaptureMeta
  canRename: boolean
  loading: boolean
  onOpen: () => void
  onRename: (description: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const label = c.description || c.nomFichier || `capture-${c.id}.png`
  const commit = () => {
    setEditing(false)
    if (val.trim() !== c.description) onRename(val.trim())
  }
  return (
    <div className="w-[110px]">
      <button
        type="button"
        onClick={onOpen}
        title={`${label} — ${(c.taille / 1024).toFixed(0)} Ko${c.auteurNom ? ` · ${c.auteurNom}` : ''}`}
        className="relative block h-[70px] w-full cursor-zoom-in overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--cream)] transition hover:border-[var(--gold)]"
      >
        {c.miniature ? (
          <img src={c.miniature} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[var(--ink-faded)]">
            <ImageIcon size={20} />
            <span className="w-full truncate text-[10px]">{label}</span>
          </span>
        )}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 size={16} className="animate-spin text-[var(--ink)]" />
          </span>
        )}
      </button>
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') setEditing(false)
          }}
          placeholder={c.nomFichier || 'Description…'}
          className="mt-0.5 w-full rounded-md border border-[var(--gold)] bg-white px-1 py-0.5 text-[11px] text-[var(--ink)] outline-none"
        />
      ) : (
        <div className="mt-0.5 flex items-center gap-0.5">
          <span
            className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink-soft)]"
            title={`${label}${c.auteurNom ? ` · ${c.auteurNom}` : ''}`}
          >
            {label}
          </span>
          {canRename && (
            <button
              type="button"
              title="Renommer (description)"
              onClick={() => {
                setVal(c.description)
                setEditing(true)
              }}
              className="flex-none rounded p-0.5 text-[var(--ink-faded)] transition hover:text-[var(--ink)]"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function TicketEdit({
  id,
  estAdmin,
  userEmail,
  onClose,
  onChanged,
  onJumpTo,
}: {
  id: number
  /** Service Administrateur (= le dev) : qualification, archivage, suppression,
   *  édition/suppression d'échanges, « demande une réponse », captures partout. */
  estAdmin: boolean
  /** Courriel du compte service connecté (droits déposeur/auteur). */
  userEmail: string
  onClose: () => void
  /** Notifié après toute mutation (la liste se rafraîchit). */
  onChanged?: () => void
  /** « Même que #X » : ouvre la fiche du ticket d'origine. */
  onJumpTo?: (id: number) => void
}) {
  const qc = useQueryClient()
  const { confirmer, modale } = useConfirmation()
  // gcTime 0 : pas de cache entre deux ouvertures (une fiche rouverte ne doit
  // pas montrer l'état d'avant mutation)
  const q = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicketFn({ data: { id } }),
    gcTime: 0,
  })
  const t = q.data
  const refetch = () => {
    void qc.invalidateQueries({ queryKey: ['ticket', id] })
    onChanged?.()
  }
  const erreurInfo = (titre: string) => (e: unknown) =>
    confirmer({ titre, message: e instanceof Error ? e.message : String(e) })

  /* Qualification (admin) — état local « null = non touché », replié sur la fiche. */
  const [statut, setStatut] = useState<TicketStatut | null>(null)
  const [idDoublon, setIdDoublon] = useState('')
  const [avancement, setAvancement] = useState('')
  const [dateLivraison, setDateLivraison] = useState<string | null>(null)
  const [titre, setTitre] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [typeT, setTypeT] = useState<TicketType | null>(null)
  const [gravite, setGravite] = useState<TicketGravite | null>(null)
  const [page, setPage] = useState<string | null>(null)
  const [creePar, setCreePar] = useState<string | null>(null)
  const statutEff = statut ?? t?.statut ?? 'nouveau'
  const avancementEff = avancement === '' ? String(t?.avancement ?? 0) : avancement
  const idDoublonEff = idDoublon || String(t?.ticketDoublonId ?? '')
  const dateLivraisonEff = dateLivraison ?? t?.dateLivraison ?? ''
  const titreEff = titre ?? t?.titre ?? ''
  const descriptionEff = description ?? t?.description ?? ''
  const typeEff = typeT ?? t?.type ?? 'bug'
  const graviteEff = gravite ?? t?.gravite ?? 'mineure'
  const pageEff = page ?? t?.pageConcernee ?? ''
  const creeParEff = creePar ?? t?.creeParEmail ?? ''
  // Le déposeur actuel peut ne pas être un compte service (ticket créé en SQL
  // direct) : on l'injecte pour qu'il reste affiché
  const deposantOptions =
    creeParEff && !DEPOSANT_OPTIONS.some((o) => o.value === creeParEff)
      ? [
          {
            value: creeParEff,
            label: t?.creeParNom ? `${t.creeParNom} · ${creeParEff}` : creeParEff,
          },
          ...DEPOSANT_OPTIONS,
        ]
      : DEPOSANT_OPTIONS

  const saveMut = useMutation({
    mutationFn: () =>
      updateTicketStatutFn({
        data: {
          id,
          statut: statutEff,
          idDoublon: idDoublonEff ? Number(idDoublonEff) : null,
          avancement: Number(avancementEff) || 0,
          dateLivraison: dateLivraisonEff || null,
          ...(titre !== null && titre.trim() ? { titre: titre.trim() } : {}),
          ...(description !== null && description !== (t?.description ?? '')
            ? { description }
            : {}),
          ...(typeT !== null ? { type: typeT } : {}),
          ...(gravite !== null ? { gravite } : {}),
          ...(page !== null ? { page } : {}),
          ...(creePar !== null && creePar ? { creeParEmail: creePar } : {}),
        },
      }),
    onSuccess: refetch,
    onError: erreurInfo('Mise à jour impossible'),
  })

  /* Fil d'échanges */
  const [commentaire, setCommentaire] = useState('')
  // Coche du dev : « demande une réponse » au déposeur (levée à sa réponse)
  const [demandeReponse, setDemandeReponse] = useState(false)
  const [reponseCaptures, setReponseCaptures] = useState<Array<CaptureDraft>>([])
  async function addReponseFiles(files: Array<File>) {
    const r = await readCaptureFiles(files, reponseCaptures.length)
    if (r.captures.length) setReponseCaptures((c) => [...c, ...r.captures])
    if (r.erreur) confirmer({ titre: 'Capture refusée', message: r.erreur })
  }
  const commentMut = useMutation({
    mutationFn: () =>
      addTicketCommentaireFn({
        data: {
          ticketId: id,
          texte: commentaire,
          demandeReponse,
          captures: reponseCaptures,
        },
      }),
    onSuccess: () => {
      setCommentaire('')
      setDemandeReponse(false)
      setReponseCaptures([])
      refetch()
    },
    onError: erreurInfo('Commentaire refusé'),
  })

  /* Édition en place d'un échange (admin) : id du message édité + texte tampon. */
  const [editId, setEditId] = useState<number | null>(null)
  const [editTexte, setEditTexte] = useState('')
  const editMut = useMutation({
    mutationFn: (v: { id: number; texte: string }) =>
      updateTicketCommentaireFn({ data: v }),
    onSuccess: () => {
      setEditId(null)
      setEditTexte('')
      refetch()
    },
    onError: erreurInfo('Modification impossible'),
  })

  const renameMut = useMutation({
    mutationFn: (v: { id: number; description: string }) =>
      renameTicketCaptureFn({ data: v }),
    onSuccess: refetch,
    onError: erreurInfo('Renommage impossible'),
  })

  const archiveMut = useMutation({
    mutationFn: (archive: boolean) => archiverTicketFn({ data: { id, archive } }),
    onSuccess: refetch,
    onError: erreurInfo('Archivage impossible'),
  })
  const masqueMut = useMutation({
    mutationFn: (masque: boolean) =>
      setTicketMasqueNouveautesFn({ data: { id, masque } }),
    onSuccess: refetch,
    onError: erreurInfo('Modification impossible'),
  })

  function supprimerEchange(idCommentaire: number, auteur: string) {
    confirmer({
      titre: "Supprimer l'échange",
      message: `Supprimer définitivement ce message de ${auteur} (et ses captures jointes) ?`,
      destructif: true,
      action: () => {
        deleteTicketCommentaireFn({ data: { id: idCommentaire } })
          .then(refetch)
          .catch(erreurInfo('Suppression impossible'))
      },
    })
  }

  function supprimer() {
    confirmer({
      titre: 'Supprimer le ticket',
      message: `Supprimer définitivement le ticket #${id}${
        t?.titre ? ` « ${t.titre} »` : ''
      } (commentaires et captures compris) ? Pour le mettre de côté sans le perdre, préférez « Archiver ».`,
      destructif: true,
      action: () => {
        deleteTicketFn({ data: { id } })
          .then(() => {
            onChanged?.()
            onClose()
          })
          .catch(erreurInfo('Suppression impossible'))
      },
    })
  }

  /* Captures : ajout (déposeur tant que non clos, ou admin) + aperçu à la demande. */
  const estClos = !!t && TICKET_STATUTS_CLOS.includes(t.statut)
  const peutAjouterCaptures =
    !!t && (estAdmin || (t.creeParEmail === userEmail && !estClos))
  // Plafond de la zone fiche : ne compte pas les captures jointes aux réponses
  const capturesFiche = t?.captures.filter((c) => c.commentaireId == null) ?? []
  const capturesMut = useMutation({
    mutationFn: (files: Array<File>) =>
      readCaptureFiles(files, capturesFiche.length).then(async (r) => {
        if (r.erreur) throw new Error(r.erreur)
        if (!r.captures.length) throw new Error('Aucune image à joindre.')
        return addTicketCapturesFn({
          data: { ticketId: id, captures: r.captures },
        })
      }),
    onSuccess: refetch,
    onError: erreurInfo('Capture refusée'),
  })
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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <span className="flex min-w-0 items-center gap-2">
              <TicketIcon size={18} className="flex-none text-[var(--gold-deep)]" />
              <span className="truncate">
                Ticket #{id}
                {t?.titre ? ` — ${t.titre}` : ''}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto pr-1">
          {q.isLoading ? (
            <div className="flex items-center gap-2 py-10 text-[14px] text-[var(--ink-soft)]">
              <Loader2 className="animate-spin" size={18} /> Chargement…
            </div>
          ) : !t ? (
            <div className="py-10 text-center text-[14px] font-bold text-[var(--danger)]">
              Ticket introuvable.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Badges + méta */}
              <div className="flex flex-wrap items-center gap-2">
                <TicketBadge label={TICKET_TYPES[t.type]} cls={TYPE_BADGE[t.type]} />
                {/* Gravité : bugs seulement (sans objet pour une feature) */}
                {t.type === 'bug' && (
                  <TicketBadge
                    label={TICKET_GRAVITES[t.gravite]}
                    cls={GRAVITE_BADGE[t.gravite]}
                  />
                )}
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
                {t.attenteReponse && (
                  <TicketBadge
                    label={
                      t.attenteMaReponse
                        ? 'Réponse attendue de vous'
                        : 'Réponse du déposeur attendue'
                    }
                    cls="bg-[var(--gold-tint)] text-[var(--gold-ink)]"
                  />
                )}
                {t.statut === 'doublon' && t.ticketDoublonId && (
                  <button
                    type="button"
                    onClick={() => onJumpTo?.(t.ticketDoublonId!)}
                    title={t.doublonTitre ?? undefined}
                    className="flex items-center gap-1 rounded-md bg-[var(--info-tint)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--ink)] hover:underline"
                  >
                    <CornerDownRight size={12} />
                    même que #{t.ticketDoublonId}
                  </button>
                )}
                <span className="ml-auto text-[12px] text-[var(--ink-faded)]">
                  {t.pageConcernee && (
                    <>
                      page <b className="text-[var(--ink)]">{t.pageConcernee}</b> ·{' '}
                    </>
                  )}
                  par <b>{t.creeParNom}</b> le {fmtTicketDate(t.creeLe)}
                  {t.dateLivraison &&
                    ` · livré le ${fmtTicketDate(t.dateLivraison)}`}
                </span>
              </div>

              {/* Description (lecture) — l'admin l'édite dans la Qualification */}
              {!estAdmin && (
                <div className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ink)]">
                  {t.description || (
                    <span className="text-[var(--muted)]">Pas de description.</span>
                  )}
                </div>
              )}

              {/* Captures de la fiche (celles des réponses vivent dans le fil) */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                  Captures d'écran ({capturesFiche.length})
                </div>
                {capturesFiche.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {capturesFiche.map((c) => (
                      <CaptureTile
                        key={c.id}
                        c={c}
                        canRename={estAdmin || c.auteurEmail === userEmail}
                        loading={apercuLoading === c.id}
                        onOpen={() => void ouvrirCapture(c.id)}
                        onRename={(d) => renameMut.mutate({ id: c.id, description: d })}
                      />
                    ))}
                  </div>
                )}
                {peutAjouterCaptures && (
                  <CaptureDropZone
                    count={capturesFiche.length}
                    onFiles={(files) => capturesMut.mutate(files)}
                  />
                )}
              </div>

              {/* Qualification (Administrateur = le dev) */}
              {estAdmin && (
                <div className="space-y-2.5 rounded-[10px] border border-dashed border-[var(--line-strong)] p-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                    Qualification (dev)
                    <span className="ml-auto flex items-center gap-1.5 normal-case">
                      {/* Masquer du changelog Nouveautés (features livrées) —
                          sans changer le statut ni archiver le ticket */}
                      {t.type === 'feature' && (
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={masqueMut.isPending}
                          onClick={() => masqueMut.mutate(!t.masqueNouveautes)}
                          title={
                            t.masqueNouveautes
                              ? 'Réafficher cette feature dans la page Nouveautés'
                              : 'Retirer cette feature de la page Nouveautés (sans changer son statut)'
                          }
                        >
                          {t.masqueNouveautes ? <Eye /> : <EyeOff />}
                          {t.masqueNouveautes
                            ? 'Afficher (Nouveautés)'
                            : 'Masquer (Nouveautés)'}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={archiveMut.isPending}
                        onClick={() => archiveMut.mutate(!t.archive)}
                        title={
                          t.archive
                            ? 'Réafficher dans les listes'
                            : 'Masquer des listes (réversible)'
                        }
                      >
                        {t.archive ? <ArchiveRestore /> : <Archive />}
                        {t.archive ? 'Désarchiver' : 'Archiver'}
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger-tint)]"
                        onClick={supprimer}
                        title="Suppression définitive"
                      >
                        <Trash2 />
                        Supprimer
                      </Button>
                    </span>
                  </div>
                  <ChampForm
                    libelle={`Titre${t.type === 'feature' ? ' (visible dans Nouveautés)' : ''}`}
                  >
                    <Input
                      value={titreEff}
                      onChange={(e) => setTitre(e.target.value)}
                      className="h-9 text-[13px]"
                    />
                  </ChampForm>
                  <ChampForm
                    libelle={`Description${t.type === 'feature' ? ' (visible dans Nouveautés)' : ''}`}
                  >
                    <Textarea
                      value={descriptionEff}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={10}
                      spellCheck={false}
                      placeholder="Pas de description."
                      className="text-[13px] leading-relaxed"
                    />
                  </ChampForm>
                  {/* Requalification : type / gravité (bug) / page / déposeur */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-[140px]">
                      <ChampForm libelle="Type">
                        <Select
                          value={typeEff}
                          onValueChange={(v) => {
                            const nt = v as TicketType
                            setTypeT(nt)
                            // Une feature n'a pas de gravité (neutralisée serveur)
                            if (nt === 'feature') setGravite(null)
                          }}
                        >
                          <SelectTrigger className="h-9 w-full text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TICKET_TYPES) as Array<TicketType>).map(
                              (v) => (
                                <SelectItem key={v} value={v}>
                                  {TICKET_TYPES[v]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </ChampForm>
                    </div>
                    {typeEff === 'bug' && (
                      <div className="w-[140px]">
                        <ChampForm libelle="Gravité">
                          <Select
                            value={graviteEff}
                            onValueChange={(v) => setGravite(v as TicketGravite)}
                          >
                            <SelectTrigger className="h-9 w-full text-[13px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(TICKET_GRAVITES) as Array<TicketGravite>
                              ).map((v) => (
                                <SelectItem key={v} value={v}>
                                  {TICKET_GRAVITES[v]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </ChampForm>
                      </div>
                    )}
                    <div className="min-w-[180px] flex-1">
                      <ChampForm libelle="Page concernée">
                        <Input
                          value={pageEff}
                          onChange={(e) => setPage(e.target.value)}
                          placeholder="laissez vide si pas de page précise"
                          className="h-9 text-[13px]"
                        />
                      </ChampForm>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <ChampForm libelle="Déposé par">
                        <Select
                          value={creeParEff}
                          onValueChange={(v) => setCreePar(v)}
                        >
                          <SelectTrigger className="h-9 w-full text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {deposantOptions.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </ChampForm>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-[150px]">
                      <ChampForm libelle="Statut">
                        <Select
                          value={statutEff}
                          onValueChange={(v) => {
                            const s = v as TicketStatut
                            setStatut(s)
                            // Passage à « livré » → date de livraison = aujourd'hui
                            // (si non renseignée) ; corrigeable ensuite
                            if (s === 'livre' && !dateLivraisonEff)
                              setDateLivraison(todayISO())
                          }}
                        >
                          <SelectTrigger className="h-9 w-full text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TICKET_STATUTS) as Array<TicketStatut>).map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {TICKET_STATUTS[s]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </ChampForm>
                    </div>
                    {statutEff === 'doublon' && (
                      <div className="w-[110px]">
                        <ChampForm libelle="Même que n°">
                          <Input
                            value={idDoublonEff}
                            onChange={(e) =>
                              setIdDoublon(e.target.value.replace(/\D/g, ''))
                            }
                            placeholder="#"
                            className="h-9 text-[13px]"
                          />
                        </ChampForm>
                      </div>
                    )}
                    <div className="w-[120px]">
                      <ChampForm libelle="Avancement %">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={avancementEff}
                          onChange={(e) => setAvancement(e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </ChampForm>
                    </div>
                    <div className="w-[160px]">
                      <ChampForm libelle="Date de livraison">
                        <Input
                          type="date"
                          value={dateLivraisonEff}
                          onChange={(e) => setDateLivraison(e.target.value)}
                          className="h-9 text-[13px]"
                        />
                      </ChampForm>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="ml-auto"
                      disabled={saveMut.isPending}
                      onClick={() => saveMut.mutate()}
                    >
                      Enregistrer
                    </Button>
                  </div>
                  <ErreurMutation erreur={saveMut.error} />
                </div>
              )}

              {/* Échange questions / réponses (déposeur ↔ dev) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                  <MessageSquare size={13} />
                  Échanges ({t.commentaires.length})
                </div>
                {t.commentaires.map((c) => {
                  // Dev (compte Administrateur) à droite en doré ; les autres à
                  // gauche en bleu, chip « Déposeur »
                  const estDeposeur = !c.estDev
                  const captsReponse = t.captures.filter(
                    (x) => x.commentaireId === c.id,
                  )
                  return (
                    <div
                      key={c.id}
                      className={`max-w-[85%] rounded-[10px] border px-3.5 py-2.5 ${
                        estDeposeur
                          ? 'border-[var(--line)] bg-[var(--info-tint)]/40'
                          : 'ml-auto border-[var(--gold)]/30 bg-[var(--gold-tint)]/40'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[12px] text-[var(--ink-faded)]">
                        <span
                          className={`rounded px-1.5 py-px text-[10.5px] font-bold tracking-wide uppercase ${
                            estDeposeur
                              ? 'bg-[var(--info-tint)] text-[var(--ink)]'
                              : 'bg-[var(--gold-tint)] text-[var(--gold-ink)]'
                          }`}
                        >
                          {estDeposeur ? 'Déposeur' : 'Dev'}
                        </span>
                        <b className="text-[var(--ink)]">{c.auteurNom}</b> —{' '}
                        {fmtTicketDate(c.creeLe)}
                        {estAdmin && (
                          <span className="ml-auto flex items-center gap-0.5">
                            <button
                              type="button"
                              title="Modifier le texte de cet échange"
                              onClick={() => {
                                setEditId(c.id)
                                setEditTexte(c.texte)
                              }}
                              className="rounded p-0.5 text-[var(--ink-faded)] transition hover:bg-[var(--cream-hover)] hover:text-[var(--ink)]"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              title="Supprimer cet échange (et ses captures jointes)"
                              onClick={() => supprimerEchange(c.id, c.auteurNom)}
                              className="rounded p-0.5 text-[var(--ink-faded)] transition hover:bg-[var(--danger-tint)] hover:text-[var(--danger)]"
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>
                        )}
                      </div>
                      {editId === c.id ? (
                        <div className="space-y-1.5">
                          <Textarea
                            value={editTexte}
                            onChange={(e) => setEditTexte(e.target.value)}
                            rows={3}
                            autoFocus
                            className="bg-white text-[13px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="xs"
                              disabled={
                                editMut.isPending ||
                                !editTexte.trim() ||
                                editTexte.trim() === c.texte.trim()
                              }
                              onClick={() =>
                                editMut.mutate({ id: c.id, texte: editTexte.trim() })
                              }
                            >
                              Enregistrer
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setEditId(null)
                                setEditTexte('')
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        c.texte && (
                          <div className="text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ink)]">
                            {c.texte}
                          </div>
                        )
                      )}
                      {captsReponse.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {captsReponse.map((x) => (
                            <CaptureTile
                              key={x.id}
                              c={x}
                              canRename={estAdmin || x.auteurEmail === userEmail}
                              loading={apercuLoading === x.id}
                              onOpen={() => void ouvrirCapture(x.id)}
                              onRename={(d) =>
                                renameMut.mutate({ id: x.id, description: d })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      // Le dev colle une capture directement dans sa réponse
                      onPaste={
                        estAdmin
                          ? (e) => {
                              const files = Array.from(e.clipboardData.files)
                              if (files.length) {
                                e.preventDefault()
                                void addReponseFiles(files)
                              }
                            }
                          : undefined
                      }
                      rows={2}
                      placeholder="Poser une question / répondre…"
                      className="text-[13px]"
                    />
                    {estAdmin && (
                      <>
                        <CaptureThumbs
                          captures={reponseCaptures}
                          onRemove={(i) =>
                            setReponseCaptures((c) => c.filter((_, j) => j !== i))
                          }
                        />
                        <label className="flex w-fit cursor-pointer items-center gap-1.5 text-[12px] text-[var(--ink-faded)] transition hover:text-[var(--ink)]">
                          <ImagePlus size={13} />
                          Joindre une capture à la réponse (ou Ctrl+V dans le texte)
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              void addReponseFiles(Array.from(e.target.files ?? []))
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        (!commentaire.trim() && !reponseCaptures.length) ||
                        commentMut.isPending
                      }
                      onClick={() => commentMut.mutate()}
                    >
                      Envoyer
                    </Button>
                    {estAdmin && t.creeParEmail !== userEmail && (
                      <label
                        className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--ink-soft)]"
                        title="Le déposeur verra un badge « à répondre » jusqu'à sa réponse."
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-[var(--ink)]"
                          checked={demandeReponse}
                          onChange={(e) => setDemandeReponse(e.target.checked)}
                        />
                        Demande une réponse
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aperçu plein écran d'une capture (légende = description sinon fichier) */}
        {apercu && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-[var(--ink)]/60 p-6"
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
      </DialogContent>
      {modale}
    </Dialog>
  )
}
