// Modale « Signaler » : création d'un ticket (bug / feature) par n'importe
// quel service connecté — depuis le bouton global du Header (page concernée
// préremplie avec la route courante) ou depuis la page /tickets. Captures :
// collage direct (Ctrl+V) ou choix de fichier (image, ≤ 3 Mo, 5 max — mêmes
// plafonds que le serveur, cf. tickets.helpers.ts). Repris d'isfectuteurs.
import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ImagePlus, Megaphone, X } from 'lucide-react'

import { ChampForm, ErreurMutation } from '#/components/ChampsModale'
import { Button } from '#/components/ui/button'
import { useConfirmation } from '#/components/ui/confirmation'
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { createTicketFn } from '#/lib/tickets.ts'
import { readCaptureFiles } from '#/lib/tickets.captures.ts'
import { TICKET_GRAVITES, TICKET_TYPES } from '#/lib/tickets.defs.ts'
import { CAPTURES_MAX } from '#/lib/tickets.helpers.ts'

import type { CaptureDraft } from '#/lib/tickets.captures.ts'
import type { TicketGravite, TicketType } from '#/lib/tickets.defs.ts'

/** Vignettes des captures en attente / jointes, avec suppression optionnelle. */
export function CaptureThumbs({
  captures,
  onRemove,
}: {
  captures: Array<CaptureDraft>
  onRemove?: (i: number) => void
}) {
  if (!captures.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {captures.map((c, i) => (
        <div
          key={i}
          className="group relative h-[74px] w-[110px] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--cream)]"
        >
          <img
            src={c.dataUrl}
            alt={c.nom}
            title={c.nom}
            className="h-full w-full object-cover"
          />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label="Retirer la capture"
              className="absolute top-1 right-1 rounded-md bg-white/90 p-0.5 text-[var(--ink-soft)] opacity-0 shadow transition group-hover:opacity-100 hover:text-[var(--danger)]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/** Zone d'ajout de captures : collage Ctrl+V + bouton fichier. Réutilisée par la fiche. */
export function CaptureDropZone({
  count,
  onFiles,
}: {
  count: number
  onFiles: (files: Array<File>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      tabIndex={0}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files)
        if (files.length) {
          e.preventDefault()
          onFiles(files)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onFiles(Array.from(e.dataTransfer.files))
      }}
      className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--cream)] px-3 py-2 text-[12.5px] text-[var(--ink-soft)] outline-none focus:border-[var(--gold)]"
    >
      <ImagePlus size={15} className="flex-none text-[var(--ink-faded)]" />
      <span className="min-w-0 flex-1">
        Collez une capture ici (<b>Ctrl+V</b>) ou{' '}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-bold text-[var(--gold-ink)] hover:underline"
        >
          choisissez un fichier
        </button>{' '}
        — image, 3 Mo max, {CAPTURES_MAX - count} restante
        {CAPTURES_MAX - count > 1 ? 's' : ''}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function TicketNouveau({
  pagePath,
  onClose,
  onCreated,
}: {
  /** Route courante (préremplit « Page concernée »). */
  pagePath: string
  onClose: () => void
  onCreated?: (id: number) => void
}) {
  const [type, setType] = useState<TicketType>('bug')
  const [gravite, setGravite] = useState<TicketGravite>('mineure')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [page, setPage] = useState(pagePath)
  const [captures, setCaptures] = useState<Array<CaptureDraft>>([])
  const { confirmer, modale } = useConfirmation()

  async function addFiles(files: Array<File>) {
    const r = await readCaptureFiles(files, captures.length)
    if (r.captures.length) setCaptures((c) => [...c, ...r.captures])
    if (r.erreur) confirmer({ titre: 'Capture refusée', message: r.erreur })
  }

  const createMut = useMutation({
    mutationFn: () =>
      createTicketFn({
        data: { type, gravite, titre, description, page, captures },
      }),
    onSuccess: (r) => {
      onCreated?.(r.id)
      onClose()
    },
  })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <span className="flex items-center gap-2">
              <Megaphone size={18} className="flex-none text-[var(--gold-deep)]" />
              Signaler un bug / demander une feature
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-auto">
          <div className="flex flex-wrap items-end gap-3">
            {/* Type : bug / feature (segmenté) */}
            <ChampForm libelle="Type">
              <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
                {(Object.keys(TICKET_TYPES) as Array<TicketType>).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3.5 py-1.5 text-[13px] font-bold transition ${
                      type === t
                        ? 'bg-[var(--ink)] text-white'
                        : 'bg-white text-[var(--ink-soft)] hover:bg-[var(--cream-hover)]'
                    }`}
                  >
                    {TICKET_TYPES[t]}
                  </button>
                ))}
              </div>
            </ChampForm>
            {/* Gravité : ne s'applique qu'aux bugs (une feature n'en a pas). */}
            {type === 'bug' && (
              <div className="w-[170px]">
                <ChampForm libelle="Gravité">
                  <Select
                    value={gravite}
                    onValueChange={(v) => setGravite(v as TicketGravite)}
                  >
                    <SelectTrigger className="h-9 w-full text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TICKET_GRAVITES) as Array<TicketGravite>).map(
                        (g) => (
                          <SelectItem key={g} value={g}>
                            {TICKET_GRAVITES[g]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </ChampForm>
              </div>
            )}
            <div className="min-w-[180px] flex-1">
              <ChampForm libelle="Page concernée">
                <Input
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="/operations, /sccv…"
                  className="h-9 text-[13px]"
                />
              </ChampForm>
            </div>
          </div>

          <ChampForm libelle="Titre *">
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Résumé en une phrase"
              className="h-9 text-[13px]"
            />
          </ChampForm>

          <ChampForm libelle="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              spellCheck={false}
              placeholder="Ce qui se passe, ce qui était attendu, comment reproduire…"
              className="text-[13px]"
            />
          </ChampForm>

          <div className="space-y-2">
            <div className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
              Captures d'écran
            </div>
            <CaptureDropZone count={captures.length} onFiles={addFiles} />
            <CaptureThumbs
              captures={captures}
              onRemove={(i) => setCaptures((c) => c.filter((_, j) => j !== i))}
            />
          </div>
          <ErreurMutation erreur={createMut.error} />
        </div>

        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!titre.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Créer le ticket
          </Button>
        </DialogFooter>
      </DialogContent>
      {modale}
    </Dialog>
  )
}
