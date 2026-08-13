// Champs de formulaire des modales CRUD (libellé au-dessus, consigne
// « un composant unique par type de contrôle » de docs/plan-implementation.md).
// Extraits du pattern sccv.tsx/bilan.tsx à la 3ᵉ duplication (Déclarations).
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'

export function ChampForm({
  libelle,
  children,
}: {
  libelle: string
  children: React.ReactNode
}) {
  return (
    <Label className="flex flex-col items-stretch gap-1">
      <span className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
        {libelle}
      </span>
      {children}
    </Label>
  )
}

export function ChampNombre({
  libelle,
  value,
  onChange,
  step = '0.01',
  required,
}: {
  libelle: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  step?: string
  required?: boolean
}) {
  return (
    <ChampForm libelle={libelle}>
      <Input
        type="number"
        step={step}
        required={required}
        value={value != null ? String(value) : ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Number(e.target.value))
        }
        className="h-9 text-[13px]"
      />
    </ChampForm>
  )
}

export function ChampTexte({
  libelle,
  value,
  onChange,
  list,
}: {
  libelle: string
  value: string
  onChange: (v: string) => void
  list?: string
}) {
  return (
    <ChampForm libelle={libelle}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={list}
        className="h-9 text-[13px]"
      />
    </ChampForm>
  )
}

export function ChampDate({
  libelle,
  value,
  onChange,
}: {
  libelle: string
  value: string | null | undefined
  onChange: (v: string | null) => void
}) {
  return (
    <ChampForm libelle={libelle}>
      <Input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-9 text-[13px]"
      />
    </ChampForm>
  )
}

export function ChampTexteLong({
  libelle,
  value,
  onChange,
}: {
  libelle: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <ChampForm libelle={libelle}>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-[13px]"
      />
    </ChampForm>
  )
}

export function ChampBascule({
  libelle,
  checked,
  onChange,
}: {
  libelle: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
      <Switch checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      {libelle}
    </Label>
  )
}

const VIDE = '__vide__'

export function ChampSelectId({
  libelle,
  value,
  onChange,
  options,
  videLibelle = '—',
}: {
  libelle: string
  value: number | null | undefined
  onChange: (v: number | null) => void
  options: Array<{ id: number; libelle: string | null }>
  videLibelle?: string
}) {
  return (
    <ChampForm libelle={libelle}>
      <Select
        value={value != null ? String(value) : VIDE}
        onValueChange={(v) => onChange(v === VIDE ? null : Number(v))}
      >
        <SelectTrigger className="h-9 w-full text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VIDE}>{videLibelle}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.libelle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ChampForm>
  )
}

export function ChampSelectTexte({
  libelle,
  value,
  onChange,
  options,
}: {
  libelle: string
  value: string | null | undefined
  onChange: (v: string | null) => void
  options: ReadonlyArray<string>
}) {
  return (
    <ChampForm libelle={libelle}>
      <Select
        value={value ?? VIDE}
        onValueChange={(v) => onChange(v === VIDE ? null : v)}
      >
        <SelectTrigger className="h-9 w-full text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={VIDE}>—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ChampForm>
  )
}

export function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-[var(--line-soft)] pb-1 text-[13px] font-semibold text-[var(--gold-ink)] sm:col-span-2">
      {children}
    </p>
  )
}

export function ErreurMutation({ erreur }: { erreur: unknown }) {
  if (!erreur) return null
  return (
    <p className="mt-3 text-[13px] text-red-700">
      {erreur instanceof Error ? erreur.message : 'Erreur à l’enregistrement.'}
    </p>
  )
}

// Timestamps du serveur : Date (seroval) ou string ISO selon la sérialisation
// — tranché vers 'YYYY-MM-DD' pour les <input type="date">
export function versInputDate(
  v: string | Date | null | undefined,
): string | null {
  if (!v) return null
  const iso = v instanceof Date ? v.toISOString() : v
  return iso.slice(0, 10)
}

// Boutons Nouveau / Modifier / Supprimer d'une table CRUD
export function BoutonsTable({
  selection,
  onNouveau,
  onModifier,
  onSupprimer,
  confirmation,
}: {
  selection: number | null
  onNouveau: () => void
  onModifier: () => void
  onSupprimer: () => void
  confirmation: string
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" onClick={onNouveau}>
        Nouveau
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={selection == null}
        onClick={onModifier}
      >
        Modifier
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={selection == null}
        onClick={() => {
          if (confirm(confirmation)) onSupprimer()
        }}
      >
        Supprimer
      </Button>
    </div>
  )
}
