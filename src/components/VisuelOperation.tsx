// Zone visuel de la fiche Opération (Paramètres OTL) : bandeau image,
// recherche keredes.coop (grille de candidats), téléversement, retrait.
// Miniature régénérée ici quand absente (auto/backfill la laissent vide).
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '#/components/ui/button'
import {
  lireFichierDataUrl,
  makeMiniature,
  reduireCaptureDataUrl,
} from '#/lib/tickets.captures.ts'
import { CAPTURE_MAX_OCTETS } from '#/lib/tickets.helpers.ts'
import {
  choisirVisuelFn,
  getVisuelFn,
  rechercherVisuelsFn,
  retirerVisuelFn,
  saveMiniatureVisuelFn,
  uploadVisuelFn,
} from '#/lib/visuels.ts'

export default function VisuelOperation({
  operationId,
}: {
  operationId: number
}) {
  const queryClient = useQueryClient()
  const [candidats, setCandidats] = useState<Array<string> | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const refFichier = useRef<HTMLInputElement>(null)

  const visuel = useQuery({
    queryKey: ['operation-visuel', operationId],
    queryFn: () => getVisuelFn({ data: { operationId } }),
  })

  const invalider = () => {
    queryClient.invalidateQueries({ queryKey: ['operation-visuel', operationId] })
    queryClient.invalidateQueries({ queryKey: ['operations-comm'] })
    queryClient.invalidateQueries({ queryKey: ['otl-operations'] })
    setCandidats(null)
    setErreur(null)
  }

  // Lazy backfill de la vignette (auto/backfill stockent miniature = '')
  useEffect(() => {
    const v = visuel.data
    if (!v || v.miniature !== '') return
    void makeMiniature(v.dataUrl).then((m) => {
      if (m)
        saveMiniatureVisuelFn({ data: { operationId, miniature: m } }).then(
          () => {
            queryClient.invalidateQueries({ queryKey: ['operations-comm'] })
            queryClient.invalidateQueries({ queryKey: ['otl-operations'] })
          },
          () => {},
        )
    })
  }, [visuel.data, operationId])

  const rechercher = useMutation({
    mutationFn: () => rechercherVisuelsFn({ data: { operationId } }),
    onSuccess: (r) => {
      setCandidats(r.candidats)
      setErreur(r.candidats.length === 0 ? 'Aucun visuel trouvé sur keredes.coop.' : null)
    },
    onError: () => setErreur('Recherche impossible (site injoignable ?).'),
  })
  const choisir = useMutation({
    mutationFn: (url: string) => choisirVisuelFn({ data: { operationId, url } }),
    onSuccess: invalider,
    onError: (e) => setErreur(e instanceof Error ? e.message : 'Échec.'),
  })
  const retirer = useMutation({
    mutationFn: () => retirerVisuelFn({ data: { operationId } }),
    onSuccess: invalider,
  })

  // Contrairement aux captures de tickets, un fichier > 3 Mo n'est pas
  // refusé : il est réduit ici (canvas — possible car fichier local, pas de
  // souci CORS) avant l'envoi.
  const televerser = async (files: Array<File>) => {
    const fichier = files.find((f) => f.type.startsWith('image/'))
    if (!fichier) {
      if (files.length > 0) setErreur('Seules les images sont acceptées.')
      return
    }
    let dataUrl: string
    try {
      dataUrl = await lireFichierDataUrl(fichier)
    } catch {
      setErreur('Lecture impossible.')
      return
    }
    if (fichier.size > CAPTURE_MAX_OCTETS) {
      dataUrl = await reduireCaptureDataUrl(dataUrl)
      if (!dataUrl) {
        setErreur('Image illisible ou irréductible sous 3 Mo.')
        return
      }
    }
    const c = {
      nom: fichier.name || 'visuel.jpg',
      dataUrl,
      miniature: await makeMiniature(dataUrl),
    }
    try {
      await uploadVisuelFn({
        data: { operationId, nom: c.nom, dataUrl: c.dataUrl, miniature: c.miniature },
      })
      invalider()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Échec du téléversement.')
    }
  }

  return (
    <div
      className="mb-4 flex flex-col gap-2"
      tabIndex={0}
      onPaste={(e) => {
        const files = [...e.clipboardData.files]
        if (files.length > 0) void televerser(files)
      }}
    >
      {visuel.data ? (
        <img
          src={visuel.data.dataUrl}
          alt="Visuel de l'opération"
          className="max-h-56 w-full rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--line)] text-[13px] text-[var(--muted)]">
          {visuel.isLoading ? 'Chargement…' : 'Aucun visuel'}
        </div>
      )}
      <div className="flex items-center gap-2">
        {visuel.data && (
          <span className="mr-auto truncate text-[12px] text-[var(--muted)]">
            {visuel.data.source === 'upload' ? 'Téléversé' : 'keredes.coop'}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={rechercher.isPending}
          onClick={() => rechercher.mutate()}
        >
          {rechercher.isPending ? 'Recherche…' : 'Rechercher sur keredes.coop'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => refFichier.current?.click()}
        >
          Téléverser
        </Button>
        {visuel.data && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => retirer.mutate()}
          >
            Retirer
          </Button>
        )}
        <input
          ref={refFichier}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void televerser([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>
      {candidats && candidats.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {candidats.map((url) => (
            <button
              key={url}
              type="button"
              disabled={choisir.isPending}
              onClick={() => choisir.mutate(url)}
              className="cursor-pointer overflow-hidden rounded-lg border border-[var(--line)] hover:border-[var(--ink)]"
              title="Choisir ce visuel"
            >
              <img src={url} alt="" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {erreur && <p className="text-[12px] text-red-700">{erreur}</p>}
    </div>
  )
}
