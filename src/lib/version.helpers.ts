// drizzle-kit migrate écrit dans created_at le `when` de l'entrée du journal :
// c'est la seule clé qui relie une ligne de drizzle.__drizzle_migrations à son
// tag. node-postgres rend ce bigint en chaîne.
export function tagMigration(
  journal: ReadonlyArray<{ when: number; tag: string }>,
  creeLe: unknown,
): string | null {
  if (creeLe == null) return null
  return journal.find((e) => e.when === Number(creeLe))?.tag ?? null
}
