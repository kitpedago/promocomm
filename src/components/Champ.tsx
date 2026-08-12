// Couple libellé / valeur des fiches (pattern WinDev : libellé au-dessus,
// valeur en dessous, tiret cadratin quand la donnée manque)
export default function Champ({
  libelle,
  children,
}: {
  libelle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
        {libelle}
      </span>
      <span className="text-[13px] text-[var(--ink)]">{children ?? '—'}</span>
    </div>
  )
}
