// Rafraîchit la base miroir (noms SQL Server) depuis DATABASE_URL.
// Usage : npm run db:miroir            (rafraîchissement)
//         npm run db:miroir -- --ddl   (régénère src/lib/miroir.schema.sql depuis le schéma legacy)
// Pas de passage auto au chargement (src/db/index.ts) : import après le réglage.
process.env.MIROIR_AUTO = '0'
const { genererDdl, preparerMiroir, rafraichirMiroir } =
  await import('#/lib/miroir.server.ts')

const source = process.env.DATABASE_URL
if (!source) throw new Error('DATABASE_URL non configurée')

if (process.argv.includes('--ddl')) {
  console.log(
    `${await genererDdl(source)} tables écrites dans src/lib/miroir.schema.sql`,
  )
} else {
  const r = await rafraichirMiroir(source, await preparerMiroir(), console.log)
  console.log(
    `Terminé : ${r.lignes} lignes, ${r.tables} tables, ${r.echecs.length} échec(s).`,
  )
  for (const e of r.echecs) console.log(`  ${e.table}: ${e.erreur}`)
}
process.exit(0)

export {}
