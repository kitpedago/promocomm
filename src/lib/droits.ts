// Droits fins d'une fenêtre WinDev (table droit), côté écran : le composant
// masque ce que le serveur refusera de toute façon (requireDroit).
import { useQuery } from '@tanstack/react-query'

import { getDroitsFn } from '#/lib/commercialisation.ts'

// `indice` vise un volet d'un contrôle à onglets (ONG_Choix[3])
export function useDroits(fenetre: string) {
  const droits = useQuery({
    queryKey: ['droits', fenetre],
    queryFn: () => getDroitsFn({ data: { fenetre } }),
    staleTime: 300_000,
  })
  // tant que les droits ne sont pas chargés, on restreint (jamais l'inverse)
  return (controle: string, indice?: number) =>
    droits.data?.some(
      (d) => d.controle === controle && (indice == null || d.indice === indice),
    ) ?? true
}
