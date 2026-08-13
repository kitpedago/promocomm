// Règles pures du module Honoraires, partagées serveur/client (testées).

// Iso-colonne TotalFacture de REQ_HonoCommHFFacture : somme des quatre
// montants, chaque NULL compté 0
export function totalFacture(f: {
  montantResa: number | null
  montantActe: number | null
  montantCla: number | null
  montantLeveeOption: number | null
}): number {
  return (
    (f.montantResa ?? 0) +
    (f.montantActe ?? 0) +
    (f.montantCla ?? 0) +
    (f.montantLeveeOption ?? 0)
  )
}
