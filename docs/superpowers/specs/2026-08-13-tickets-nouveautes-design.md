# Tickets & features + Nouveautés — design

**Date** : 2026-08-13 · **Statut** : validé (périmètre « cœur complet » + suivi de lecture)

Portage du mini-Mantis intégré du SaaS isfectuteurs (`/opt/isfectuteurs` :
`db/tickets.sql`, `server/tickets.fn.ts`, `routes/tickets.tsx`, `routes/nouveautes.tsx`,
`TicketNouveau.tsx`, `TicketEdit.tsx`) vers promocomm, adapté au login par services.

## Périmètre

- **/tickets** : liste (DataTable maison : tri, filtre, pagination, CSV), filtres
  statut/type/gravité, fiche modale (badges, description, captures avec miniatures,
  fil d'échanges déposeur ↔ dev, qualification admin), création par tout service
  connecté (bug/feature, gravité pour les bugs, captures ≤ 3 Mo × 5, collage Ctrl+V),
  deep-link `?ticket=<id>`.
- **/nouveautes** : changelog des features livrées/fermées groupées par date de
  livraison décroissante, carte de détail flottante à hauteur du clic, crayon
  d'édition (admin).
- Bouton global **« Signaler »** dans le Header (page concernée préremplie).
- **Badges menu** (Sidebar) : « non lus » (admin) + « réponse attendue » (déposeur).
- Suivi de lecture par courriel (`ticket_lecture`), archivage réversible,
  « masquer dans Nouveautés », badge « Livré par l'IA » (posé en SQL direct,
  visible admin seulement), suppression définitive (admin).

**Écarté** (spécifique isfectuteurs) : alertes SMS OVH, imputation contrats/heures,
création en lot / scission, SpellCheck, « se connecter en tant que ».

## Adaptations promocomm

- **Rôles** : tous les services voient, créent, commentent (y compris Consultation —
  le signalement est du feedback, pas une écriture métier ; écart assumé avec
  `requireEcriture`). Le service **Administrateur** = le dev : qualification,
  archivage, suppression, édition/suppression d'échanges, « demande une réponse ».
- **Identité dénormalisée** : courriel du compte service (`<slug>@promocomm.local`)
  + libellé du service (« Comptabilité »…). Réattribution du déposeur = liste
  statique `SERVICES`.
- **Tables Drizzle dans `src/db/schema.ts`** (hors `domaine.ts`) : `ticket`,
  `ticket_commentaire`, `ticket_capture` (blob `bytea` + miniature data-URL ~220 px
  générée client), `ticket_lecture` — elles survivent aux réimports .bak, comme
  `user_pref`.
- Server functions dans `src/lib/tickets.ts` (drizzle), helpers purs testés dans
  `src/lib/tickets.helpers.ts`, référentiels dans `src/lib/tickets.defs.ts`.
- UI charte Keredes (tokens `--ink`/`--gold`/`--line`…, shadcn Dialog/Button/Select,
  badges `.badge-pill`-like).
