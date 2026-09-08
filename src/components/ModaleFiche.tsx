// Modale CRUD générique pilotée par descripteurs de champs — pour les
// modules à nombreuses fiches (Compta & Finances, Paramètres). Les modules
// aux fiches singulières gardent leurs modales explicites (ChampsModale).
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import {
  ChampBascule,
  ChampDate,
  ChampNombre,
  ChampSelectId,
  ChampSelectTexte,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
  SousTitre,
  versInputDate,
} from '#/components/ChampsModale'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export type DescChamp =
  | {
      k: string
      l: string
      t: 'texte' | 'long' | 'date' | 'nombre' | 'entier' | 'bool'
    }
  | {
      k: string
      l: string
      t: 'select'
      options: Array<{ id: number; libelle: string | null }>
    }
  | { k: string; l: string; t: 'selectTexte'; options: Array<string> }
  | { t: 'titre'; l: string }

export type ValeursFiche = Record<string, unknown>

// Valeurs initiales : la ligne existante (dates tronquées en YYYY-MM-DD) ou vide
export function depuisLigne(
  champs: Array<DescChamp>,
  ligne: Record<string, unknown> | null,
): ValeursFiche {
  const v: ValeursFiche = {}
  for (const c of champs) {
    if (c.t === 'titre') continue
    const brut = ligne?.[c.k] ?? null
    v[c.k] = c.t === 'date' ? versInputDate(brut as string | Date | null) : brut
  }
  return v
}

export default function ModaleFiche({
  titre,
  champs,
  ligne,
  open,
  onOpenChange,
  onSubmit,
  erreur,
  enCours,
  large,
  enTete,
}: {
  titre: string
  champs: Array<DescChamp>
  /** null = création */
  ligne: Record<string, unknown> | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSubmit: (valeurs: ValeursFiche) => void
  erreur: unknown
  enCours: boolean
  large?: boolean
  enTete?: ReactNode
}) {
  const [valeurs, setValeurs] = useState<ValeursFiche>(() =>
    depuisLigne(champs, ligne),
  )
  useEffect(() => {
    if (open) setValeurs(depuisLigne(champs, ligne))
  }, [open, ligne])

  const set = (k: string) => (v: unknown) =>
    setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${large ? 'max-w-3xl' : 'max-w-2xl'}`}
      >
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
        </DialogHeader>
        {enTete}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {champs.map((c, i) =>
              c.t === 'titre' ? (
                <SousTitre key={`titre-${i}`}>{c.l}</SousTitre>
              ) : c.t === 'select' ? (
                <ChampSelectId
                  key={c.k}
                  libelle={c.l}
                  value={valeurs[c.k] as number | null}
                  onChange={set(c.k)}
                  options={c.options}
                />
              ) : c.t === 'selectTexte' ? (
                <ChampSelectTexte
                  key={c.k}
                  libelle={c.l}
                  value={valeurs[c.k] as string | null}
                  onChange={set(c.k)}
                  options={c.options}
                />
              ) : c.t === 'bool' ? (
                <ChampBascule
                  key={c.k}
                  libelle={c.l}
                  checked={!!valeurs[c.k]}
                  onChange={set(c.k)}
                />
              ) : c.t === 'date' ? (
                <ChampDate
                  key={c.k}
                  libelle={c.l}
                  value={valeurs[c.k] as string | null}
                  onChange={set(c.k)}
                />
              ) : c.t === 'nombre' || c.t === 'entier' ? (
                <ChampNombre
                  key={c.k}
                  libelle={c.l}
                  step={c.t === 'entier' ? '1' : '0.01'}
                  value={valeurs[c.k] as number | null}
                  onChange={set(c.k)}
                />
              ) : c.t === 'long' ? (
                <div key={c.k} className="sm:col-span-2">
                  <ChampTexteLong
                    libelle={c.l}
                    value={(valeurs[c.k] as string | null) ?? ''}
                    onChange={(v) => set(c.k)(v || null)}
                  />
                </div>
              ) : (
                <ChampTexte
                  key={c.k}
                  libelle={c.l}
                  value={(valeurs[c.k] as string | null) ?? ''}
                  onChange={(v) => set(c.k)(v || null)}
                />
              ),
            )}
          </div>
          <ErreurMutation erreur={erreur} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enCours}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
