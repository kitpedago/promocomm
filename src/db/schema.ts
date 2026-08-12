export * from './auth-schema.ts'
export * from './domaine.ts'

import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

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
