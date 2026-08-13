// Règles pures de la fiche Acquéreur, partagées serveur/client (testées).
// Ports des procédures WinDev : trigger Acquereur_update (COL_Trigger.wdg)
// pour le nom complet, Update_ChampMenage et Update_Age (FEN_Fiche_Acquereur).

export interface NomsFiche {
  civ1Court?: string | null
  civ2Court?: string | null
  civ3Court?: string | null
  patronyme?: string | null
  prenom?: string | null
  patronyme2?: string | null
  prenom2?: string | null
  patronyme3?: string | null
  prenom3?: string | null
  rs?: string | null
}

// « M. et Mme DUPONT Jean et Marie, M. DURAND Paul RS » — le legacy affichait
// la civilité 1 devant le patronyme 3 (copier-coller), corrigé en civilité 3
export function construireNomComplet(f: NomsFiche): string {
  const pat = f.patronyme ?? ''
  const pat2 = f.patronyme2 ?? ''
  let s = ''
  if (f.civ1Court) s += f.civ1Court
  if (f.civ1Court && f.civ2Court) s += ' et '
  if (f.civ2Court) s += f.civ2Court
  if (f.civ1Court || f.civ2Court) s += ' '
  if (pat !== pat2) {
    s += `${pat} ${f.prenom ?? ''}`
    if (pat2) s += ` et ${pat2} ${f.prenom2 ?? ''}`
  } else if (f.prenom2) {
    s += `${pat} ${f.prenom ?? ''} et ${f.prenom2}`
  } else {
    s += `${pat} ${f.prenom ?? ''}`
  }
  if (f.patronyme3) {
    s += ', '
    if (f.civ3Court) s += f.civ3Court
    s += ` ${f.patronyme3} ${f.prenom3 ?? ''}`
  }
  if (f.rs) s += ` ${f.rs}`
  return s.replaceAll(/\s+/g, ' ').trim()
}

// IDs des nomenclatures type_menage (1–6) et situation_familiale (1–2),
// alignés sur les énumérations WinDev (iso : 0 adulte compte comme couple)
export function calculerMenage(
  nombreAdultes: number | null,
  nombreEnfants: number | null,
  enfantAVenir: number | null,
): { situationFamilialeId: number; typeMenageId: number } {
  const enfants = (nombreEnfants ?? 0) + (enfantAVenir ?? 0)
  const seule = nombreAdultes === 1
  const rang = enfants === 0 ? 0 : enfants === 1 ? 1 : 2
  return {
    situationFamilialeId: seule ? 1 : 2,
    typeMenageId: (seule ? 1 : 4) + rang,
  }
}

// Âge en années révolues à la date de création de la fiche (référence WinDev)
export function calculerAge(
  naissance: Date | null | undefined,
  reference: Date,
): number | null {
  if (!naissance) return null
  let age = reference.getFullYear() - naissance.getFullYear()
  const anniversairePasse =
    reference.getMonth() > naissance.getMonth() ||
    (reference.getMonth() === naissance.getMonth() &&
      reference.getDate() >= naissance.getDate())
  if (!anniversairePasse) age -= 1
  return Math.max(age, 0)
}

// Première tranche (triée par borne) couvrant l'âge moyen des deux adultes.
// Le legacy calculait l'âge de l'adulte 2 depuis la naissance de l'adulte 1
// (copier-coller), corrigé ici.
export function trancheAgePourAges(
  age1: number | null,
  age2: number | null,
  tranches: Array<{ id: number; borneMax: number | null }>,
): number | null {
  const a1 = age1 ?? 0
  const moyen = age2 && age2 > 0 ? Math.round((a1 + age2) / 2) : a1
  const triees = [...tranches].sort(
    (a, b) => (a.borneMax ?? 0) - (b.borneMax ?? 0),
  )
  return triees.find((t) => (t.borneMax ?? 0) >= moyen)?.id ?? null
}
