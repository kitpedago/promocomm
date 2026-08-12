// Lance l'import d'un .bak et suit la progression jusqu'à la fin — alternative CLI
// à la page /admin/import. Usage : npm run db:import -- PromoComm.bak
import { eq } from 'drizzle-orm'

import { db } from '#/db/index.ts'
import { importRuns } from '#/db/schema.ts'
import { startImport } from '#/lib/etl/import.ts'

const file = process.argv[2]
if (!file) {
  console.error('usage: run-import.ts <fichier.bak>')
  process.exit(1)
}

const runId = await startImport(file)
console.log(`Run #${runId} lancé pour ${file}`)

let lastStep = ''
for (;;) {
  await new Promise((r) => setTimeout(r, 3000))
  const [run] = await db.select().from(importRuns).where(eq(importRuns.id, runId))
  if (!run) throw new Error(`run #${runId} introuvable`)
  const progress = `${run.step} — ${run.tablesDone}/${run.tablesTotal || '?'}`
  if (progress !== lastStep) {
    lastStep = progress
    console.log(`[${run.status}] ${progress}`)
  }
  if (run.status !== 'running') {
    console.log(`--- statut final : ${run.status} ---`)
    console.log(run.log)
    process.exit(run.status === 'done' ? 0 : 1)
  }
}
