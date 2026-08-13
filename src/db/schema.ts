import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

import { user } from './auth-schema.ts'

import type { AnyPgColumn } from 'drizzle-orm/pg-core'

export * from './auth-schema.ts'
export * from './domaine.ts'

// Suivi des chargements .bak → PostgreSQL (page interne /admin/import)
export const importRuns = pgTable('import_runs', {
  id: serial().primaryKey(),
  status: text().notNull().default('running'), // running | done | error
  step: text(), // étape courante affichée dans la page
  log: text().notNull().default(''),
  tablesDone: integer('tables_done').notNull().default(0),
  tablesTotal: integer('tables_total').notNull().default(0),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
})

// Préférences d'interface par utilisateur (largeurs de colonnes, onglet actif,
// opération sélectionnée, état du volet). Volontairement hors domaine.ts : le
// transform reconstruit le schéma métier à chaque réimport .bak, ces lignes
// doivent y survivre. Forme clé/valeur : une écriture ne touche qu'une ligne,
// deux onglets de navigateur ne s'écrasent pas.
// Paramètres d'application clé/valeur (config Alerte SMS OVH, URL publique…).
// Hors domaine.ts : survit aux réimports .bak. Les secrets (…Secret,
// ConsumerKey) sont chiffrés au repos par l'appli (src/lib/secrets.server.ts).
export const appParam = pgTable('app_param', {
  param: text().primaryKey(),
  valeur: text().notNull().default(''),
})

// ── Suivi des tickets / features (mini-Mantis repris du SaaS isfectuteurs) ──
// + changelog « Nouveautés ». Hors domaine.ts : comme user_pref, ces lignes
// survivent aux réimports .bak. Déposeur/auteur dénormalisés (courriel du
// compte service + libellé du service au moment de l'écriture) — pas de FK
// vers user. Valeurs de type/gravite/statut validées par les server fns
// (src/lib/tickets.defs.ts), pas de CHECK en base.
// Cf. docs/superpowers/specs/2026-08-13-tickets-nouveautes-design.md.

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' })

export const ticket = pgTable('ticket', {
  id: serial().primaryKey(),
  type: text().notNull().default('bug'), // bug | feature
  gravite: text().notNull().default('mineure'), // bugs seulement (neutralisée pour les features)
  titre: text().notNull(),
  description: text().notNull().default(''),
  pageConcernee: text('page_concernee').notNull().default(''),
  statut: text().notNull().default('nouveau'),
  // « Même que #X » (statut doublon) — pas de CASCADE : on ne supprime pas de ticket
  ticketDoublonId: integer('ticket_doublon_id').references(
    (): AnyPgColumn => ticket.id,
  ),
  avancement: integer().notNull().default(0), // 0..100
  dateLivraison: date('date_livraison'), // alimente la page Nouveautés
  creeParEmail: text('cree_par_email').notNull().default(''),
  creeParNom: text('cree_par_nom').notNull().default(''),
  creeLe: timestamp('cree_le').defaultNow().notNull(),
  majLe: timestamp('maj_le').defaultNow().notNull(),
  // Archivage (admin) : masqué des listes par défaut, réversible
  archiveLe: timestamp('archive_le'),
  // « Demande une réponse » : posée par le dev, levée quand le déposeur répond
  attenteReponse: boolean('attente_reponse').notNull().default(false),
  // Posé en SQL direct quand c'est Claude (IA) qui livre — visible admin seulement
  livreParIa: boolean('livre_par_ia').notNull().default(false),
  // Feature livrée retirée du changelog Nouveautés sans changer son statut
  masqueNouveautes: boolean('masque_nouveautes').notNull().default(false),
})

export const ticketCommentaire = pgTable(
  'ticket_commentaire',
  {
    id: serial().primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => ticket.id, { onDelete: 'cascade' }),
    auteurEmail: text('auteur_email').notNull().default(''),
    auteurNom: text('auteur_nom').notNull().default(''),
    texte: text().notNull(),
    creeLe: timestamp('cree_le').defaultNow().notNull(),
  },
  (t) => [index('ticket_commentaire_ticket_idx').on(t.ticketId)],
)

export const ticketCapture = pgTable(
  'ticket_capture',
  {
    id: serial().primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => ticket.id, { onDelete: 'cascade' }),
    // Capture jointe à une réponse du fil (NULL = capture de la fiche)
    commentaireId: integer('commentaire_id').references(
      () => ticketCommentaire.id,
      { onDelete: 'cascade' },
    ),
    nomFichier: text('nom_fichier').notNull().default(''),
    mime: text().notNull().default('image/png'),
    taille: integer().notNull().default(0),
    contenu: bytea().notNull(),
    auteurEmail: text('auteur_email').notNull().default(''),
    auteurNom: text('auteur_nom').notNull().default(''),
    // Libellé de renommage, affiché à la place du nom de fichier
    description: text().notNull().default(''),
    // Vignette data-URL (~220 px, générée côté client) — le blob reste chargé à la demande
    miniature: text().notNull().default(''),
    creeLe: timestamp('cree_le').defaultNow().notNull(),
  },
  (t) => [
    index('ticket_capture_ticket_idx').on(t.ticketId),
    index('ticket_capture_commentaire_idx').on(t.commentaireId),
  ],
)

// Suivi de lecture par courriel : badge « non lus » (admin). lu_le posé à
// l'ouverture de la fiche ET après chaque écriture de l'auteur.
export const ticketLecture = pgTable(
  'ticket_lecture',
  {
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => ticket.id, { onDelete: 'cascade' }),
    courriel: text().notNull(),
    luLe: timestamp('lu_le').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.ticketId, t.courriel] })],
)

export const userPref = pgTable(
  'user_pref',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    cle: text().notNull(),
    valeur: jsonb().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.cle] })],
)
