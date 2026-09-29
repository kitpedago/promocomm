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
import ChampsCpCommune from '#/components/ChampsCpCommune'
import Onglets from '#/components/Onglets'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { enFraction, enPourcent } from '#/lib/sccv.helpers.ts'

export type DescChamp =
  | {
      k: string
      l: string
      // pourcent : saisi en % (2 décimales), stocké en fraction comme le legacy
      t: 'texte' | 'long' | 'date' | 'nombre' | 'pourcent' | 'entier' | 'bool'
      // nombre/entier jamais vide : 0 à défaut de saisie
      zeroSiVide?: boolean
    }
  | {
      k: string
      l: string
      t: 'select'
      options: Array<{ id: number; libelle: string | null }>
    }
  | { k: string; l: string; t: 'selectTexte'; options: Array<string> }
  // CP (k) et commune (kCommune) liés, cf. ChampsCpCommune
  | { k: string; kCommune: string; l: string; t: 'cpCommune' }
  | { t: 'titre'; l: string }
  // les champs qui suivent se rangent sous cet onglet ; ceux qui précèdent
  // le premier marqueur restent visibles quel que soit l'onglet
  | { t: 'onglet'; l: string }

export type ValeursFiche = Record<string, unknown>

// Valeurs initiales : la ligne existante (dates tronquées en YYYY-MM-DD) ou vide
export function depuisLigne(
  champs: Array<DescChamp>,
  ligne: Record<string, unknown> | null,
): ValeursFiche {
  const v: ValeursFiche = {}
  for (const c of champs) {
    if (c.t === 'titre' || c.t === 'onglet') continue
    const brut = ligne?.[c.k] ?? ('zeroSiVide' in c && c.zeroSiVide ? 0 : null)
    v[c.k] =
      c.t === 'date'
        ? versInputDate(brut as string | Date | null)
        : c.t === 'pourcent'
          ? enPourcent(brut as number | null)
          : brut
    if (c.t === 'cpCommune') v[c.kCommune] = ligne?.[c.kCommune] ?? null
  }
  return v
}

// Valeurs envoyées à l'enregistrement : les % repartent en fraction
export function versFiche(
  champs: Array<DescChamp>,
  valeurs: ValeursFiche,
): ValeursFiche {
  const v = { ...valeurs }
  for (const c of champs)
    if (c.t === 'pourcent') v[c.k] = enFraction(valeurs[c.k] as number | null)
  return v
}

export function decouperOnglets(champs: Array<DescChamp>) {
  const haut: Array<DescChamp> = []
  const onglets: Array<{ l: string; champs: Array<DescChamp> }> = []
  for (const c of champs) {
    if (c.t === 'onglet') onglets.push({ l: c.l, champs: [] })
    else (onglets.at(-1)?.champs ?? haut).push(c)
  }
  return { haut, onglets }
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
  const { haut, onglets } = decouperOnglets(champs)
  const [ongletActif, setOngletActif] = useState(0)
  useEffect(() => {
    if (open) {
      setValeurs(depuisLigne(champs, ligne))
      setOngletActif(0)
    }
  }, [open, ligne])

  const set = (k: string) => (v: unknown) =>
    setValeurs((s) => ({ ...s, [k]: v }))

  const grille = (liste: Array<DescChamp>) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {liste.map((c, i) =>
        c.t === 'titre' || c.t === 'onglet' ? (
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
        ) : c.t === 'cpCommune' ? (
          <ChampsCpCommune
            key={c.k}
            libelleCp={c.l}
            cp={(valeurs[c.k] as string | null) ?? ''}
            commune={(valeurs[c.kCommune] as string | null) ?? ''}
            onChange={(v) =>
              setValeurs((s) => ({
                ...s,
                [c.k]: v.cp || null,
                [c.kCommune]: v.commune || null,
              }))
            }
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
        ) : c.t === 'nombre' || c.t === 'entier' || c.t === 'pourcent' ? (
          <ChampNombre
            key={c.k}
            libelle={c.t === 'pourcent' ? `${c.l} (%)` : c.l}
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
  )

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
            onSubmit(versFiche(champs, valeurs))
          }}
        >
          {grille(haut)}
          {onglets.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <Onglets
                onglets={onglets.map((o) => o.l)}
                actif={onglets[ongletActif].l}
                onChange={(l) =>
                  setOngletActif(onglets.findIndex((o) => o.l === l))
                }
              />
              {grille(onglets[ongletActif].champs)}
            </div>
          )}
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
