// Import des lots d'une tranche depuis la trame Excel (écran « Imports Lots »
// de FEN_Param) : choix du fichier, aperçu, puis import — les lots déjà
// présents dans la tranche sont remplacés après confirmation.
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Upload } from 'lucide-react'

import { ErreurMutation } from '#/components/ChampsModale'
import { Button } from '#/components/ui/button'
import { useConfirmation } from '#/components/ui/confirmation'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { importerLotsFn } from '#/lib/importlots.ts'
import { preparerImportLots } from '#/lib/importlots.helpers.ts'
import { lireXlsx } from '#/lib/xlsx.ts'

import type { ImportPrepare } from '#/lib/importlots.helpers.ts'
import type { Cellule } from '#/lib/xlsx.ts'

const APERCU_LIGNES = 15

export default function ImportLots({
  trancheId,
  tranche,
  nbLotsActuels,
  onDone,
}: {
  trancheId: number
  /** « OPÉRATION | tranche », rappelé dans le titre */
  tranche: string
  nbLotsActuels: number
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [fichier, setFichier] = useState<{
    nom: string
    lignes: Array<Array<Cellule>>
    prepare: ImportPrepare
  } | null>(null)
  const [erreurLecture, setErreurLecture] = useState<unknown>(null)
  const [resultat, setResultat] = useState<string | null>(null)
  const { confirmer, modale } = useConfirmation()

  const importer = useMutation({
    mutationFn: () =>
      importerLotsFn({
        data: {
          trancheId,
          lignes: fichier!.lignes,
          remplacer: nbLotsActuels > 0,
        },
      }),
    onSuccess: (r) => {
      setResultat(`${r.importes} lots importés.`)
      setOpen(false)
      onDone()
    },
  })

  const choisir = async (f: File | undefined) => {
    setFichier(null)
    setErreurLecture(null)
    importer.reset()
    if (!f) return
    try {
      const lignes = await lireXlsx(await f.arrayBuffer())
      setFichier({ nom: f.name, lignes, prepare: preparerImportLots(lignes) })
    } catch (e) {
      setErreurLecture(e)
    }
  }

  const prepare = fichier?.prepare
  const largeur = Math.max(0, ...(fichier?.lignes ?? []).map((l) => l.length))

  return (
    <>
      {resultat && (
        <span className="text-[12px] text-[var(--muted)]">{resultat}</span>
      )}
      {/* même style que Exporter / Affichage (DataTable), sur la même ligne */}
      <button
        onClick={() => {
          setFichier(null)
          setErreurLecture(null)
          setResultat(null)
          importer.reset()
          setOpen(true)
        }}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5 text-[13px] font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden />
        Importer des lots (Excel)
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {modale}
          <DialogHeader>
            <DialogTitle>
              Importer les lots dans la tranche {tranche}
            </DialogTitle>
          </DialogHeader>

          <input
            type="file"
            accept=".xlsx"
            aria-label="Trame Excel des lots"
            onChange={(e) => void choisir(e.target.files?.[0])}
            className="text-[13px] text-[var(--ink)] file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-[var(--input-border)] file:bg-[var(--card)] file:px-3 file:py-1.5 file:text-[13px]"
          />
          <p className="text-[12px] text-[var(--muted)]">
            Classeur .xlsx, entêtes en ligne 1, lecture arrêtée à la ligne «
            TOTAUX ».
          </p>
          <ErreurMutation erreur={erreurLecture} />

          {prepare && (
            <>
              {prepare.erreurs.length > 0 ? (
                <ul className="list-disc pl-5 text-[13px] text-red-700">
                  {prepare.erreurs.slice(0, 20).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  {prepare.erreurs.length > 20 && (
                    <li>… et {prepare.erreurs.length - 20} autre(s).</li>
                  )}
                </ul>
              ) : (
                <p className="text-[13px] font-semibold text-[var(--ink)]">
                  {prepare.lots.length} lots prêts à importer.
                  {nbLotsActuels > 0 &&
                    ` Les ${nbLotsActuels} lots actuels de la tranche seront supprimés puis importés.`}
                </p>
              )}
              <div className="max-h-[40vh] overflow-auto rounded-lg border border-[var(--line)]">
                <table className="border-collapse text-[12px] whitespace-nowrap">
                  <tbody>
                    {fichier.lignes.slice(0, APERCU_LIGNES).map((l, i) => (
                      <tr
                        key={i}
                        className={
                          i === 0
                            ? 'bg-[var(--cream)] font-bold text-[var(--ink-faded)]'
                            : 'border-t border-[var(--line-row)] text-[var(--ink-soft)]'
                        }
                      >
                        <td className="px-2 py-1 text-[var(--muted)] tabular-nums">
                          {i + 1}
                        </td>
                        {Array.from({ length: largeur }, (_, c) => (
                          <td key={c} className="px-2 py-1">
                            {l.at(c) ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fichier.lignes.length > APERCU_LIGNES && (
                <p className="text-[12px] text-[var(--muted)]">
                  Aperçu : {APERCU_LIGNES} premières lignes sur{' '}
                  {fichier.lignes.length}.
                </p>
              )}
            </>
          )}

          <ErreurMutation erreur={importer.error} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={
                !prepare || prepare.erreurs.length > 0 || importer.isPending
              }
              onClick={() =>
                confirmer({
                  message:
                    nbLotsActuels > 0
                      ? `Il y a ${nbLotsActuels} lots dans la tranche actuellement. Ils seront SUPPRIMÉS avant d'être importés. Confirmer ?`
                      : 'Importer ces lots ?',
                  destructif: nbLotsActuels > 0,
                  action: () => importer.mutate(),
                })
              }
            >
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
