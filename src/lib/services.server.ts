// Mots de passe des services — repris tels quels de FEN_Login (app interne, accès
// WireGuard uniquement). JAMAIS importé côté client (module serveur). À passer en
// table plus tard avec le reste de la config des services.
export const SERVICE_PASSWORDS: Record<string, string> = {
  promo: 'KERpromo',
  compta: 'HF109',
  // « Consultation » n'a pas de mot de passe dans l'app d'origine : mot de passe
  // technique utilisé automatiquement par la server function de login.
  consultation: 'consultation-promocomm',
  dcial: 'HFHF',
  admin: 'inset',
  juridique: 'KPIjur',
  'direction-promo': 'dpi',
}
