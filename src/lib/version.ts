// Version affichée à l'administrateur dans la barre du haut : quelle image
// tourne, et jusqu'où la base consultée a été migrée.
import { createServerFn } from '@tanstack/react-start'
import { sql } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { requireAdmin } from '#/lib/session.server.ts'
import { tagMigration } from '#/lib/version.helpers.ts'

import journal from '../../drizzle/meta/_journal.json'

export const getVersionFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireAdmin()
    const creeLe = await db
      .execute(
        sql`select max(created_at) as cree_le from drizzle.__drizzle_migrations`,
      )
      // table absente d'une base créée par db:push : pas de numéro, pas d'erreur
      .then(
        (r) => r.rows[0]?.cree_le,
        () => null,
      )
    return {
      // sha du commit, posé dans l'image par scripts/release.ps1
      version: process.env.APP_VERSION ?? 'dev',
      migration: tagMigration(journal.entries, creeLe),
    }
  },
)
