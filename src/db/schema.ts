export * from './auth-schema.ts'
export * from './domaine.ts'

import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

import { user } from './auth-schema.ts'

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
