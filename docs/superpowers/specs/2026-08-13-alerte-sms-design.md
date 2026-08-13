# Alerte SMS OVH (tickets) — design

**Date** : 2026-08-13 · **Statut** : validé · Complément du module Tickets
(cf. 2026-08-13-tickets-nouveautes-design.md), porté d'isfectuteurs
(`server/ovh-sms.ts`, `server/secrets.ts`, `server/alerte-sms.fn.ts`,
`AlerteSmsParam.tsx`, `db/alerte-sms.sql`).

## Fonctionnel

À la création d'un ticket (createTicketFn), un SMS est envoyé aux numéros
configurés via l'API OVH SMS, selon la portée :

- `tous` : chaque bug publié (défaut) ;
- `grave` : bugs « bloquante » ou « majeure » seulement ;
- `bugfeature` : tout ticket (bugs + features).

Message : `PromoComm : Bug [gravité] #id — Service` + titre (≤ 90 c.) + lien
deep-link `<URL publique>/tickets?ticket=<id>`. **Best-effort** : toute erreur
(config absente, OVH KO, réseau) est journalisée et avalée — la création du
ticket n'échoue jamais à cause du SMS.

Écran de configuration : Paramètres → rubrique Système → « Alerte SMS »,
**service Administrateur uniquement** (entrée masquée sinon, server fns
gardées) : interrupteur, portée (radios), destinataires (multi-lignes,
normalisés +33 à l'enregistrement, non-FR ignorés), identifiants OVH
(Application Key/Secret, Consumer Key, service `sms-…`, expéditeur optionnel),
URL publique (défaut `http://10.66.66.1:3020`), bouton « SMS de test » avec
retour crédits/refus OVH.

## Technique

- **`app_param`** (src/db/schema.ts, hors domaine — survit au réimport .bak) :
  clé/valeur `param` (PK) / `valeur`. Clés : `OVH_SMS_Active`,
  `OVH_SMS_ApplicationKey`, `OVH_SMS_ApplicationSecret` (chiffré),
  `OVH_SMS_ConsumerKey` (chiffré), `OVH_SMS_ServiceName`, `OVH_SMS_Expediteur`,
  `OVH_SMS_Destinataires`, `OVH_SMS_Portee`, `URLBasePublique`. Pas de seed :
  upsert à l'écriture, lecture tolérante aux clés absentes.
- **`src/lib/secrets.server.ts`** : AES-256-GCM, clé sha256 dérivée de
  `APP_SECRETS_KEY` (repli `BETTER_AUTH_SECRET`), préfixe `enc:v1:`,
  rétro-compat valeurs en clair, idempotent.
- **`src/lib/ovh-sms.helpers.ts`** (purs, testés) : `normReceiver` (+33…),
  `parseDestinataires` (CSV/lignes, dédup), `normPortee`,
  `ticketDeclencheSms`, `configComplete`, clés/types.
- **`src/lib/ovh-sms.server.ts`** : `readSmsConfig`/`writeSmsParam` (drizzle),
  `envoyerSms` (signature OVH sha1 + timestamp `/auth/time`, inspection du
  corps 2xx : `invalidReceivers`/`totalCreditsRemoved: 0` = échec),
  `notifierTicketSms` (best-effort).
- **`src/lib/alerte-sms.ts`** : server fns `getAlerteSmsConfigFn`,
  `saveAlerteSmsConfigFn`, `testAlerteSmsFn` — `requireAdmin` (déplacé dans
  session.server.ts, réutilisé par tickets.ts).
- **UI** : `src/components/AlerteSmsParam.tsx` (charte, shadcn), branché dans
  parametres.tsx comme entrée à écran dédié (pattern OTL/Droits).
