// CP + commune liés : choisir la commune renseigne son CP (COMBO_Commune de
// FEN_Fiche_Operation). Listes déroulantes alimentées par la nomenclature
// Communes (Paramètres) ; la saisie libre reste possible, un tiers des
// adresses d'acquéreurs étant hors de cette liste.
import { useId, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ChampTexte } from '#/components/ChampsModale'
import { getNomenclatureFn } from '#/lib/parametres.ts'
import { sansAccents } from '#/lib/utils.ts'

export default function ChampsCpCommune({
  cp,
  commune,
  onChange,
  libelleCp = 'CP',
  libelleCommune = 'Commune',
}: {
  cp: string
  commune: string
  onChange: (v: { cp: string; commune: string }) => void
  libelleCp?: string
  libelleCommune?: string
}) {
  const id = useId()
  const communes = useQuery({
    queryKey: ['nomenclature', 'communes'],
    queryFn: () => getNomenclatureFn({ data: { slug: 'communes' } }),
    staleTime: 300_000,
  })
  const liste = useMemo(
    () =>
      (communes.data ?? [])
        .map((c) => ({
          libelle: String(c.libelle ?? ''),
          cp: String(c.codePostal ?? ''),
        }))
        .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr')),
    [communes.data],
  )
  const cps = useMemo(
    () => [...new Set(liste.map((c) => c.cp).filter(Boolean))].sort(),
    [liste],
  )
  const duCp = (v: string) => liste.filter((c) => c.cp === v.trim())
  // les communes du CP saisi en tête, les autres restent proposées
  const proposees = [...duCp(cp), ...liste.filter((c) => c.cp !== cp.trim())]

  return (
    <>
      <ChampTexte
        libelle={libelleCp}
        value={cp}
        list={`${id}-cp`}
        onChange={(v) => {
          const candidates = duCp(v)
          onChange({
            cp: v,
            // CP d'une seule commune : elle est renseignée si le champ est vide
            commune:
              !commune && candidates.length === 1
                ? candidates[0].libelle
                : commune,
          })
        }}
      />
      <ChampTexte
        libelle={libelleCommune}
        value={commune}
        list={`${id}-commune`}
        onChange={(v) => {
          const q = sansAccents(v.trim())
          const trouvee = proposees.find((c) => sansAccents(c.libelle) === q)
          // la liste ne porte qu'un CP par commune (RENNES : 35700) : un CP
          // saisi qu'elle ne connaît pas (35000, 35200) n'est pas écrasé
          const cpLibre = cp.trim() !== '' && duCp(cp).length === 0
          onChange({
            commune: trouvee?.libelle ?? v,
            cp: trouvee?.cp && !cpLibre ? trouvee.cp : cp,
          })
        }}
      />
      <datalist id={`${id}-cp`}>
        {cps.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id={`${id}-commune`}>
        {proposees.map((c) => (
          <option key={`${c.libelle}-${c.cp}`} value={c.libelle}>
            {c.cp}
          </option>
        ))}
      </datalist>
    </>
  )
}
