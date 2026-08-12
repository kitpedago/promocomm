// Barre d'onglets (pattern WinDev : onglet actif souligné en or)
export default function Onglets<T extends string>({
  onglets,
  actif,
  onChange,
}: {
  onglets: ReadonlyArray<T>
  actif: T
  onChange: (o: T) => void
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-1 border-b-2 border-[var(--line)] px-3 pt-2">
      {onglets.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`-mb-0.5 cursor-pointer border-b-[3px] px-3 py-2 text-[13px] transition-colors ${
            o === actif
              ? 'border-[var(--gold)] font-semibold text-[var(--ink)]'
              : 'border-transparent font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
