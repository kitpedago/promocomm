// Règles pures du module SCCV, partagées serveur/client (testées).

// Transpose le NoSpace(..., sscInside) du legacy : le SIRET est stocké sans
// aucun espace (« Les espaces ne sont pas sauvegardés » sur la fiche WinDev)
export function normaliserSiret(s: string | null | undefined): string | null {
  const nettoye = (s ?? '').replaceAll(/\s+/g, '')
  return nettoye === '' ? null : nettoye
}

// Avertissement non bloquant : le legacy annonce « 14 chiffres » sans le
// vérifier ; des enregistrements existants peuvent être invalides
export function siretInvalide(s: string | null): boolean {
  return s != null && !/^\d{14}$/.test(s)
}

// Le legacy stocke les participations en fraction 0–1, l'UI parle en %
export function enPourcent(fraction: number | null): number | null {
  return fraction == null ? null : Math.round(fraction * 10000) / 100
}

export function enFraction(pourcent: number | null): number | null {
  return pourcent == null ? null : pourcent / 100
}
