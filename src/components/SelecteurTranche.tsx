// Sélecteur de tranche avec récap (« Coll. : 18 dont PSLA 8… ») — le fil
// conducteur de presque tous les modules WinDev (docs/ecrans-windev.md).
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export interface TrancheRecap {
  id: number
  libelle: string | null
  nbLogtColl: number | null
  dontLogtCollPsla: number | null
  dontLogtCollBrs: number | null
  nbLogtIndiv: number | null
  dontLogtIndivPsla: number | null
  dontLogtIndivBrs: number | null
}

const recap = (t: TrancheRecap) =>
  `Coll. : ${t.nbLogtColl ?? 0} dont PSLA ${t.dontLogtCollPsla ?? 0} dont BRS ${t.dontLogtCollBrs ?? 0}, Indiv. : ${t.nbLogtIndiv ?? 0} dont PSLA ${t.dontLogtIndivPsla ?? 0} dont BRS ${t.dontLogtIndivBrs ?? 0}`

export const libelleTranche = (t: TrancheRecap) =>
  t.libelle ?? `Tranche ${t.id}`

export default function SelecteurTranche({
  tranches,
  value,
  onChange,
}: {
  tranches: Array<TrancheRecap>
  value: number | undefined
  onChange: (id: number) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-medium text-[var(--ink-soft)]">
        Tranches ({tranches.length}). Filtrer sur :
      </span>
      <Select
        value={value != null ? String(value) : ''}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="h-8 max-w-full bg-[var(--card)] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {tranches.map((t) => (
            <SelectItem key={t.id} value={String(t.id)}>
              {libelleTranche(t)} ({recap(t)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
