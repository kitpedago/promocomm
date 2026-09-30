// Règles pures du module Opérations, partagées serveur/client (testées).

// « Synchro. dates » (UpdateStade de FEN_Fiche_StadeAvancement) : dates du
// même stade sur les autres tranches de l'opération après validation — la
// date prévi promo saisie écrase, la date réelle ne remplit que les vides.
export function synchroniserDates<
  TDate,
  TFrere extends { datePreviMajPromo: TDate | null; dateReelle: TDate | null },
>(
  saisie: { datePreviMajPromo: TDate | null; dateReelle: TDate | null },
  freres: Array<TFrere>,
): Array<TFrere> {
  return freres.map((f) => ({
    ...f,
    datePreviMajPromo: saisie.datePreviMajPromo ?? f.datePreviMajPromo,
    dateReelle: f.dateReelle ?? saisie.dateReelle,
  }))
}

// Un stade d'avancement d'une tranche, avec le code et le « Suivi » de sa
// ligne de liste_avancement
export interface StadeTranche {
  id: number
  listeAvancementId: number
  code: string | null
  avecSuivi: boolean | null
  ordre: number | null
  datePreviMajPromo: Date | null
  dateReelle: Date | null
}

// Stade actuel : le dernier réalisé (à date égale, le premier dans l'ordre).
// Stade prochain : le non réalisé dont la date prévi promo suit au plus près
// celle du stade actuel. WinDev visait cette règle, mais passait la date dans
// le mauvais paramètre de requête puis lisait une ligne au hasard.
function stadesCourants(stades: Array<StadeTranche>) {
  const parOrdre = [...stades].sort(
    (a, b) => (a.ordre ?? Infinity) - (b.ordre ?? Infinity) || a.id - b.id,
  )
  const realises = parOrdre.filter((s) => s.dateReelle)
  // -Infinity sans stade réalisé : toute date prévi est alors « après »
  const dernier = Math.max(...realises.map((s) => s.dateReelle!.getTime()))
  const actuel = realises.find((s) => s.dateReelle!.getTime() === dernier)
  // tri stable : à date prévi égale, l'ordre de la liste départage
  const [prochain] = parOrdre
    .filter(
      (s) =>
        !s.dateReelle &&
        s.datePreviMajPromo &&
        s.datePreviMajPromo.getTime() > dernier,
    )
    .sort(
      (a, b) => a.datePreviMajPromo!.getTime() - b.datePreviMajPromo!.getTime(),
    ) as Array<StadeTranche | undefined>
  return [
    actuel?.listeAvancementId ?? null,
    prochain?.listeAvancementId ?? null,
  ]
}

// Caches d'avancement portés par la tranche, que WinDev recalculait par
// trigger à chaque écriture d'un stade (COL_Trigger.wdg, StadeAvancement_update).
// Les clés sont les colonnes de `tranche` à mettre à jour.
export function cachesStades(stades: Array<StadeTranche>) {
  const reelle = (code: string) =>
    stades.find((s) => s.code === code)?.dateReelle ?? null
  // SAV : prévu par WinDev, mais aucun stade ne porte ce code à ce jour
  const [os, liv, sav] = ['OS', 'LIV', 'SAV'].map(reelle)
  const situation = sav
    ? { situationId: 4, situationDepuisLe: sav }
    : os && liv
      ? { situationId: 3, situationDepuisLe: liv }
      : os
        ? { situationId: 2, situationDepuisLe: os }
        : liv
          ? {} // livré sans OS : WinDev laissait la situation en l'état
          : { situationId: 1, situationDepuisLe: null }
  const [actuel, prochain] = stadesCourants(stades)
  const [suiviActuel, suiviProchain] = stadesCourants(
    stades.filter((s) => s.avecSuivi),
  )
  return {
    stadeCom: reelle('COM'),
    ...situation,
    listeAvancementActuelId: actuel,
    listeAvancementProchainId: prochain,
    listeAvancementSuiviActuelId: suiviActuel,
    listeAvancementSuiviProchainId: suiviProchain,
  }
}
