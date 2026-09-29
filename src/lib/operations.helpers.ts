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
