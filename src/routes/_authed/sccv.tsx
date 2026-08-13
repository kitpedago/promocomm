// Module SCCV (FEN_TABLE_StructureJuridique + FEN_Fiche_StructureJuridique)
// — phase 4, CRUD complet. Filtres + table principale, détail sous la table
// en 4 onglets (Associés, Opérations, Comptes bancaires, Centre des impôts),
// et les 4 modales d'édition (fiche, participation, compte bancaire, centre
// des impôts).
// Référence : docs/plan-implementation.md (module SCCV).
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import Champ from '#/components/Champ'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
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
import { usePref } from '#/lib/preferences.ts'
import {
  deleteCompteBanqueFn,
  deleteParticipationFn,
  getSccvDetailFn,
  getSccvListeFn,
  getSccvNomenclaturesFn,
  saveCompteBanqueFn,
  saveParticipationFn,
  saveSccvFn,
} from '#/lib/sccv.ts'
import { normaliserSiret, siretInvalide } from '#/lib/sccv.helpers.ts'
import { getService } from '#/lib/services'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

import type { ColumnDef } from '@tanstack/react-table'

interface RechercheSccv {
  sccv?: number
}

export const Route = createFileRoute('/_authed/sccv')({
  validateSearch: (s: Record<string, unknown>): RechercheSccv => ({
    sccv: s.sccv ? Number(s.sccv) : undefined,
  }),
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('sccv')) throw redirect({ to: '/' })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageSccv,
})

type LigneSccv = Awaited<ReturnType<typeof getSccvListeFn>>[number]
type DetailSccv = NonNullable<Awaited<ReturnType<typeof getSccvDetailFn>>>
type FicheSccvBrute = DetailSccv['fiche']
type LigneParticipation = DetailSccv['participations'][number]
type LigneOperationSccv = DetailSccv['operations'][number]
type LigneCompteSccv = DetailSccv['comptes'][number]
type Nomenclatures = Awaited<ReturnType<typeof getSccvNomenclaturesFn>>

// cases à cocher WinDev en lecture → toggles désactivés (pattern operations.tsx)
function Case({ libelle, actif }: { libelle: string; actif?: boolean | null }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-[var(--ink-soft)]">
      <Switch checked={!!actif} disabled className="scale-75" />
      {libelle}
    </label>
  )
}

// --- colonnes génériques (mêmes formatteurs que les autres écrans) ---

const colDate = <T,>(
  id: string,
  header: string,
  size = 120,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => <span className="tabular-nums">{fmtDate(c.getValue())}</span>,
})
const colTexte = <T,>(
  id: string,
  header: string,
  size: number,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => c.getValue() ?? '—',
})
const colEuro = <T,>(
  id: string,
  header: string,
  size = 120,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">
      {fmtEuro(c.getValue())}
    </span>
  ),
})
// coché/décoché tel qu'affiché dans les tables WinDev (✓/—), à distinguer du
// composant Case (toggles désactivés des fiches)
const colCheck = <T,>(
  id: string,
  header: string,
  size = 90,
): ColumnDef<T, any> => ({
  accessorKey: id,
  header,
  size,
  cell: (c) => <span className="block text-center">{c.getValue() ? '✓' : '—'}</span>,
})

// ---------------------------------------------------------------------------
// Table principale
// ---------------------------------------------------------------------------

const COLONNES_SCCV: Array<ColumnDef<LigneSccv, any>> = [
  {
    accessorKey: 'rs',
    header: 'Nom SCCV',
    size: 220,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colTexte('numTvaIntra', 'N° TVA intra', 150),
  colTexte('siret', 'Siret', 140),
  colCheck('sccvHf', 'HF ?', 70),
  colCheck('sccvHlm', 'HLM ?', 80),
  colDate('dateDebutActivite', 'Début activité'),
  colDate('dateImmat', 'Immatriculation'),
  colDate('dateBilanDebutPremierExercice', 'Début bilan 1ᵉʳ exercice', 170),
  colDate('dateBilanFinPremierExercice', 'Fin bilan 1ᵉʳ exercice', 160),
  colTexte('dateModifCloture', 'Modif clôture', 130),
  colTexte('datePlanningCloture', 'Planning clôture', 140),
  colDate('dateLiquidation', 'Liquidation'),
  colDate('dateLiberationCapital', 'Libération capital', 150),
  colTexte('comptable', 'Comptable', 170),
  colTexte('stade', 'Stade', 150),
  colCheck('hfsga', 'HF SGA ?', 90),
  colEuro('capital', 'Capital', 120),
  colCheck('cpteFiscal', 'Cpte fiscal ?', 110),
  {
    accessorKey: 'nbPart',
    header: 'Nb parts',
    size: 90,
    cell: (c) => (
      <span className="block text-right tabular-nums">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  colEuro('montantPart', 'Montant parts', 130),
  colTexte('gestionnaire', 'Gestionnaire', 160),
]

const DEFAUT_MASQUEES = [
  'dateBilanDebutPremierExercice',
  'dateBilanFinPremierExercice',
  'dateModifCloture',
  'datePlanningCloture',
  'dateLiberationCapital',
]

// --- barre de filtres ---

function SelectFiltre({
  libelle,
  value,
  onChange,
  options,
}: {
  libelle: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  options: Array<{ id: number; libelle: string | null }>
}) {
  return (
    <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
      {libelle}
      <Select
        value={value != null ? String(value) : 'tous'}
        onValueChange={(v) => onChange(v === 'tous' ? undefined : Number(v))}
      >
        <SelectTrigger className="h-8 w-[170px] bg-[var(--card)] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.libelle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

// ---------------------------------------------------------------------------
// Champs de formulaire génériques des modales (libellé au-dessus, pattern
// Champ.tsx transposé en version saisissable)
// ---------------------------------------------------------------------------

const VIDE = '__vide__'

function ChampForm({
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

function ChampSaisie({
  libelle,
  value,
  onChange,
  type = 'text',
  required,
  step,
  aide,
  avertissement,
  list,
}: {
  libelle: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  step?: string
  aide?: string
  avertissement?: string
  list?: string
}) {
  return (
    <ChampForm libelle={libelle}>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={step}
        list={list}
        className="h-9 text-[13px]"
      />
      {aide && <span className="text-[11px] text-[var(--muted)]">{aide}</span>}
      {avertissement && (
        <span className="text-[11px] text-amber-700">{avertissement}</span>
      )}
    </ChampForm>
  )
}

function ChampSelectId({
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

function ChampSelectTexte({
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
      <Select value={value ?? VIDE} onValueChange={(v) => onChange(v === VIDE ? null : v)}>
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

function ChampBascule({
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

function ChampTexteLong({
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
        rows={3}
        className="text-[13px]"
      />
    </ChampForm>
  )
}

// Timestamps du serveur : Date (seroval préserve le type) ou string ISO
// selon le chemin de sérialisation — on tranche vers 'YYYY-MM-DD' pour les
// <input type="date">.
function versInputDate(v: string | Date | null | undefined): string | null {
  if (!v) return null
  const iso = v instanceof Date ? v.toISOString() : v
  return iso.slice(0, 10)
}

function ErreurMutation({ erreur }: { erreur: unknown }) {
  if (!erreur) return null
  return (
    <p className="mt-3 text-[13px] text-red-700">
      {erreur instanceof Error ? erreur.message : 'Erreur à l’enregistrement.'}
    </p>
  )
}

// ---------------------------------------------------------------------------
// Modale « Fiche SCCV » (création + édition — même server function pour le
// volet Centre des impôts, cf. ModaleCentreImpots)
// ---------------------------------------------------------------------------

// Formes d'entrée des mutations d'écriture — dupliquées ici (non exportées
// par sccv.ts) pour typer les états de formulaire des modales.
interface EntreeFicheSccv {
  id?: number
  rs: string
  siret?: string | null
  numTvaIntra?: string | null
  gestionnaireSccvId?: number | null
  partenariatId?: number | null
  dateDebutActivite?: string | null
  dateImmat?: string | null
  dateBilanDebutPremierExercice?: string | null
  dateBilanFinPremierExercice?: string | null
  dateModifCloture?: string | null
  datePlanningCloture?: string | null
  dateLiquidation?: string | null
  personneComptableId?: number | null
  stadeId?: number | null
  hfsga?: boolean | null
  sccvHlm?: boolean | null
  sccvHf?: boolean | null
  capital?: number | null
  nbPart?: number | null
  montantPart?: number | null
  dateLiberationCapital?: string | null
  ediTva?: boolean | null
  ediLiasse?: boolean | null
  cpteFiscal?: boolean | null
  sieId?: number | null
  civiliteId?: number | null
  interlocuteurSie?: string | null
  dateMandatSie?: string | null
}

const FICHE_VIDE: EntreeFicheSccv = {
  rs: '',
  siret: null,
  numTvaIntra: null,
  gestionnaireSccvId: null,
  partenariatId: null,
  dateDebutActivite: null,
  dateImmat: null,
  dateBilanDebutPremierExercice: null,
  dateBilanFinPremierExercice: null,
  dateModifCloture: null,
  datePlanningCloture: null,
  dateLiquidation: null,
  personneComptableId: null,
  stadeId: null,
  hfsga: null,
  sccvHlm: null,
  sccvHf: null,
  capital: null,
  nbPart: null,
  montantPart: null,
  dateLiberationCapital: null,
  ediTva: null,
  ediLiasse: null,
  cpteFiscal: null,
  sieId: null,
  civiliteId: null,
  interlocuteurSie: null,
  dateMandatSie: null,
}

function versEntreeFiche(f: FicheSccvBrute): EntreeFicheSccv {
  return {
    rs: f.rs,
    siret: f.siret,
    numTvaIntra: f.numTvaIntra,
    gestionnaireSccvId: f.gestionnaireSccvId,
    partenariatId: f.partenariatId,
    dateDebutActivite: versInputDate(f.dateDebutActivite),
    dateImmat: versInputDate(f.dateImmat),
    dateBilanDebutPremierExercice: versInputDate(f.dateBilanDebutPremierExercice),
    dateBilanFinPremierExercice: versInputDate(f.dateBilanFinPremierExercice),
    dateModifCloture: f.dateModifCloture,
    datePlanningCloture: f.datePlanningCloture,
    dateLiquidation: versInputDate(f.dateLiquidation),
    personneComptableId: f.personneComptableId,
    stadeId: f.stadeId,
    hfsga: f.hfsga,
    sccvHlm: f.sccvHlm,
    sccvHf: f.sccvHf,
    capital: f.capital,
    nbPart: f.nbPart,
    montantPart: f.montantPart,
    dateLiberationCapital: versInputDate(f.dateLiberationCapital),
    ediTva: f.ediTva,
    ediLiasse: f.ediLiasse,
    cpteFiscal: f.cpteFiscal,
    sieId: f.sieId,
    civiliteId: f.civiliteId,
    interlocuteurSie: f.interlocuteurSie,
    dateMandatSie: versInputDate(f.dateMandatSie),
  }
}

function ModaleFicheSccv({
  fiche,
  open,
  onOpenChange,
  nomenclatures,
  comptableActuelLibelle,
}: {
  /** null = création */
  fiche: FicheSccvBrute | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
  comptableActuelLibelle?: string | null
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const [valeurs, setValeurs] = useState<EntreeFicheSccv>(() =>
    fiche ? versEntreeFiche(fiche) : FICHE_VIDE,
  )
  const enregistrer = useMutation({
    mutationFn: (d: EntreeFicheSccv) => saveSccvFn({ data: d }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['sccv-liste'] })
      void queryClient.invalidateQueries({ queryKey: ['sccv-detail', res.id] })
      if (!fiche) void navigate({ search: { sccv: res.id } })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(fiche ? versEntreeFiche(fiche) : FICHE_VIDE)
      enregistrer.reset()
    }
  }, [open, fiche])

  const set =
    <TCle extends keyof EntreeFicheSccv>(k: TCle) =>
    (v: EntreeFicheSccv[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const siretNettoye = normaliserSiret(valeurs.siret)
  const optionsComptable = [
    ...(nomenclatures?.comptables ?? []),
    ...(fiche?.personneComptableId != null &&
    !(nomenclatures?.comptables ?? []).some((c) => c.id === fiche.personneComptableId)
      ? [
          {
            id: fiche.personneComptableId,
            libelle: `${comptableActuelLibelle ?? '—'} (parti)`,
          },
        ]
      : []),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{fiche ? 'Modifier la SCCV' : 'Nouvelle SCCV'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(fiche ? { ...valeurs, id: fiche.id } : valeurs)
          }}
        >
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <ChampSaisie libelle="Raison sociale" value={valeurs.rs} onChange={set('rs')} required />
              <ChampSaisie
                libelle="SIRET"
                value={valeurs.siret ?? ''}
                onChange={set('siret')}
                aide="Les espaces ne sont pas enregistrés"
                avertissement={
                  siretInvalide(siretNettoye)
                    ? 'SIRET non conforme (14 chiffres attendus).'
                    : undefined
                }
              />
              <ChampSaisie
                libelle="N° TVA intra"
                value={valeurs.numTvaIntra ?? ''}
                onChange={set('numTvaIntra')}
              />
              <ChampSelectId
                libelle="Gestionnaire SCCV"
                value={valeurs.gestionnaireSccvId}
                onChange={set('gestionnaireSccvId')}
                options={nomenclatures?.gestionnaires ?? []}
              />
              <ChampSelectId
                libelle="Partenariat"
                value={valeurs.partenariatId}
                onChange={set('partenariatId')}
                options={nomenclatures?.partenariats ?? []}
              />

              <p className="mt-1 text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                Dates
              </p>
              <div className="grid grid-cols-2 gap-3">
                <ChampSaisie
                  libelle="Début activité"
                  type="date"
                  value={valeurs.dateDebutActivite ?? ''}
                  onChange={set('dateDebutActivite')}
                />
                <ChampSaisie
                  libelle="Immatriculation"
                  type="date"
                  value={valeurs.dateImmat ?? ''}
                  onChange={set('dateImmat')}
                />
                <ChampSaisie
                  libelle="Début bilan 1ᵉʳ exercice"
                  type="date"
                  value={valeurs.dateBilanDebutPremierExercice ?? ''}
                  onChange={set('dateBilanDebutPremierExercice')}
                />
                <ChampSaisie
                  libelle="Fin bilan 1ᵉʳ exercice"
                  type="date"
                  value={valeurs.dateBilanFinPremierExercice ?? ''}
                  onChange={set('dateBilanFinPremierExercice')}
                />
                <ChampSaisie
                  libelle="Modif clôture"
                  value={valeurs.dateModifCloture ?? ''}
                  onChange={set('dateModifCloture')}
                />
                <ChampSaisie
                  libelle="Planning clôture"
                  value={valeurs.datePlanningCloture ?? ''}
                  onChange={set('datePlanningCloture')}
                />
              </div>
              <ChampSaisie
                libelle="Liquidation"
                type="date"
                value={valeurs.dateLiquidation ?? ''}
                onChange={set('dateLiquidation')}
              />

              <ChampSelectId
                libelle="Comptable"
                value={valeurs.personneComptableId}
                onChange={set('personneComptableId')}
                options={optionsComptable}
              />
              <ChampSelectId
                libelle="Stade"
                value={valeurs.stadeId}
                onChange={set('stadeId')}
                options={nomenclatures?.stades ?? []}
              />
              <ChampBascule
                libelle="HF SGA ?"
                checked={!!valeurs.hfsga}
                onChange={set('hfsga')}
              />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-wide text-[var(--ink-faded)] uppercase">
                Capital
              </p>
              <div className="flex gap-5">
                <ChampBascule
                  libelle="SCCV HLM ?"
                  checked={!!valeurs.sccvHlm}
                  onChange={set('sccvHlm')}
                />
                <ChampBascule
                  libelle="SCCV HF ?"
                  checked={!!valeurs.sccvHf}
                  onChange={set('sccvHf')}
                />
              </div>
              <ChampSaisie
                libelle="Capital"
                type="number"
                value={valeurs.capital != null ? String(valeurs.capital) : ''}
                onChange={(v) => set('capital')(v === '' ? null : Number(v))}
              />
              <ChampSaisie
                libelle="Nb parts"
                type="number"
                value={valeurs.nbPart != null ? String(valeurs.nbPart) : ''}
                onChange={(v) => set('nbPart')(v === '' ? null : Number(v))}
              />
              <ChampSaisie
                libelle="Montant parts"
                type="number"
                value={valeurs.montantPart != null ? String(valeurs.montantPart) : ''}
                onChange={(v) => set('montantPart')(v === '' ? null : Number(v))}
              />
              <ChampSaisie
                libelle="Date libération capital"
                type="date"
                value={valeurs.dateLiberationCapital ?? ''}
                onChange={set('dateLiberationCapital')}
              />
            </div>
          </div>

          <ErreurMutation erreur={enregistrer.error} />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PageSccv() {
  const { sccv } = Route.useSearch()
  const { lectureSeule } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()

  const [stadeId, setStadeId] = useState<number | undefined>(undefined)
  const [comptableId, setComptableId] = useState<number | undefined>(undefined)
  const [gestionnaireId, setGestionnaireId] = useState<number | undefined>(
    undefined,
  )
  const [liquidee, setLiquidee] = useState(false)
  const [recherche, setRecherche] = useState('')
  // pas de recherche serveur en dessous de 3 caractères (iso-WinDev)
  const contient =
    recherche.trim().length >= 3 ? recherche.trim() : undefined

  const nomenclatures = useQuery({
    queryKey: ['sccv-nomenclatures'],
    queryFn: () => getSccvNomenclaturesFn(),
    staleTime: 60_000,
  })

  const filtres = { stadeId, comptableId, gestionnaireId, liquidee, contient }
  const liste = useQuery({
    queryKey: ['sccv-liste', filtres],
    queryFn: () => getSccvListeFn({ data: filtres }),
  })

  // Modale « Fiche SCCV » centralisée ici : 'creation', une fiche (édition,
  // depuis le double-clic sur une ligne ou le bouton Modifier du détail) ou
  // null (fermée).
  const [modaleFiche, setModaleFiche] = useState<'creation' | FicheSccvBrute | null>(
    null,
  )
  const ficheEnEdition = modaleFiche && modaleFiche !== 'creation' ? modaleFiche : null

  // Double-clic sur une ligne (détection manuelle : deux clics rapprochés
  // sur le même id — DataTable n'expose qu'onRowClick)
  const dernierClic = useRef<{ id: number; t: number }>({ id: -1, t: 0 })
  const gererClicLigne = (r: LigneSccv) => {
    const maintenant = Date.now()
    const estDoubleClic =
      dernierClic.current.id === r.id && maintenant - dernierClic.current.t < 400
    dernierClic.current = estDoubleClic ? { id: -1, t: 0 } : { id: r.id, t: maintenant }
    void navigate({ search: { sccv: r.id } })
    if (estDoubleClic && !lectureSeule) {
      void queryClient
        .fetchQuery({
          queryKey: ['sccv-detail', r.id],
          queryFn: () => getSccvDetailFn({ data: { sccvId: r.id } }),
        })
        .then((detail) => {
          if (detail) setModaleFiche(detail.fiche)
        })
    }
  }

  return (
    <div className="flex h-[calc(100vh-61px)] flex-col overflow-hidden px-5 py-5 sm:px-7">
      <h1 className="mb-3 shrink-0 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
        SCCV
      </h1>

      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <SelectFiltre
          libelle="Stade"
          value={stadeId}
          onChange={setStadeId}
          options={nomenclatures.data?.stades ?? []}
        />
        <SelectFiltre
          libelle="Comptable"
          value={comptableId}
          onChange={setComptableId}
          options={nomenclatures.data?.comptables ?? []}
        />
        <SelectFiltre
          libelle="Gestionnaire"
          value={gestionnaireId}
          onChange={setGestionnaireId}
          options={nomenclatures.data?.gestionnaires ?? []}
        />

        <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-soft)]">
          <Switch checked={liquidee} onCheckedChange={(v) => setLiquidee(!!v)} />
          Liquidées
        </label>

        <label
          title="Recherche sur le nom SCCV (au moins 3 caractères)"
          className={`flex h-8 items-center gap-1.5 rounded-lg border bg-[var(--card)] px-2.5 ${
            contient
              ? 'border-[var(--gold)] bg-[var(--gold-tint)]'
              : 'border-[var(--input-border)]'
          }`}
        >
          <Search className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Contient… (3 car. min)"
            className="w-48 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
          />
          {recherche && (
            <button
              onClick={() => setRecherche('')}
              className="cursor-pointer text-xs font-bold text-[var(--gold-ink)]"
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          )}
        </label>

        {!lectureSeule && (
          <Button size="sm" className="ml-auto" onClick={() => setModaleFiche('creation')}>
            Nouvelle SCCV
          </Button>
        )}
      </div>

      <DataTable
        id="sccv"
        columns={COLONNES_SCCV}
        data={liste.data ?? []}
        unite="SCCV"
        getRowId={(r) => String(r.id)}
        selectedRowId={sccv != null ? String(sccv) : null}
        onRowClick={gererClicLigne}
        defaultHidden={DEFAUT_MASQUEES}
        emptyText={liste.isLoading ? 'Chargement…' : 'Aucune SCCV trouvée.'}
      />

      {sccv != null && (
        <DetailSccv
          key={sccv}
          sccvId={sccv}
          nomenclatures={nomenclatures.data}
          onModifierFiche={setModaleFiche}
        />
      )}

      <ModaleFicheSccv
        fiche={modaleFiche === 'creation' ? null : modaleFiche}
        open={modaleFiche != null}
        onOpenChange={(o) => {
          if (!o) setModaleFiche(null)
        }}
        nomenclatures={nomenclatures.data}
        comptableActuelLibelle={
          ficheEnEdition
            ? liste.data?.find((r) => r.id === ficheEnEdition.id)?.comptable
            : undefined
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Détail : fiche + 4 onglets (Associés / Opérations / Comptes bancaires /
// Centre des impôts)
// ---------------------------------------------------------------------------

const ONGLETS_SCCV = [
  'Associés',
  'Opérations',
  'Comptes bancaires',
  'Centre des impôts',
] as const
type OngletSccv = (typeof ONGLETS_SCCV)[number]

const COLONNES_PARTICIPATIONS: Array<ColumnDef<LigneParticipation, any>> = [
  colTexte('associe', 'Associé', 220),
  {
    accessorKey: 'pourcentage',
    header: '%',
    size: 90,
    cell: (c) => {
      const v = c.getValue<number | null>()
      return (
        <span className="block text-right tabular-nums">
          {v != null
            ? `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
            : '—'}
        </span>
      )
    },
  },
  colCheck('convTreso', 'Conv. tréso', 100),
  colTexte('motif', 'Motif rémunération', 170),
  colDate('dateSignatureConv', 'Date signature conv.'),
  colDate('dateApplication', 'Date application'),
  colDate('dateFinRemuneration', 'Date fin rémunération'),
  colTexte('indexTaux', 'Index taux', 130),
  colTexte('infoTauxRemuneration', 'Info taux', 150),
  colTexte('periodiciteVersement', 'Périodicité', 110),
  colTexte('commentaires', 'Commentaires', 220),
]

const COLONNES_OPERATIONS_SCCV: Array<ColumnDef<LigneOperationSccv, any>> = [
  colTexte('libelle', 'Nom opération', 220),
  colTexte('cp', 'Code postal', 100),
  colTexte('commune', 'Commune', 150),
  colCheck('surRennesMetropole', 'Sur Rennes Métropole', 150),
  colCheck('anru', 'ANRU', 90),
  {
    accessorKey: 'anneeDgd',
    header: 'Année DGD',
    size: 110,
    cell: (c) => c.getValue() ?? '—',
  },
  colTexte('adresse', 'Adresse', 220),
  colTexte('nomZac', 'Nom ZAC', 150),
]

const COLONNES_COMPTES_SCCV: Array<ColumnDef<LigneCompteSccv, any>> = [
  colTexte('banque', 'Banque', 180),
  colTexte('typeCompte', 'Type de compte', 150),
  colTexte('utilisation', 'Utilisation', 150),
  colTexte('numCompte', 'N° compte', 150),
  colTexte('iban', 'IBAN', 220),
  colTexte('bic', 'BIC', 110),
  colCheck('estCloture', 'Clôturé', 90),
  colTexte('commentaires', 'Commentaires', 220),
]

// ---------------------------------------------------------------------------
// Modale « Participation »
// ---------------------------------------------------------------------------

interface EntreeParticipation {
  id?: number
  structureJuridiqueId: number
  associeId: number | null
  pourcentage: number | null
  convTreso?: boolean | null
  motifRemunerationAssocieId?: number | null
  dateSignatureConv?: string | null
  dateApplication?: string | null
  dateFinRemuneration?: string | null
  indexTauxRemunerationId?: number | null
  infoTauxRemuneration?: string | null
  periodiciteVersement?: string | null
  commentaires?: string | null
}

const PERIODICITES = ['ANNUEL', 'TRIM'] as const

function versEntreeParticipation(
  sccvId: number,
  p: LigneParticipation,
): EntreeParticipation {
  return {
    structureJuridiqueId: sccvId,
    associeId: p.associeId,
    pourcentage: p.pourcentage,
    convTreso: p.convTreso,
    motifRemunerationAssocieId: p.motifRemunerationAssocieId,
    dateSignatureConv: versInputDate(p.dateSignatureConv),
    dateApplication: versInputDate(p.dateApplication),
    dateFinRemuneration: versInputDate(p.dateFinRemuneration),
    indexTauxRemunerationId: p.indexTauxRemunerationId,
    infoTauxRemuneration: p.infoTauxRemuneration,
    periodiciteVersement: p.periodiciteVersement,
    commentaires: p.commentaires,
  }
}

function ModaleParticipation({
  sccvId,
  participation,
  participations,
  open,
  onOpenChange,
  nomenclatures,
}: {
  sccvId: number
  /** null = création */
  participation: LigneParticipation | null
  participations: Array<LigneParticipation>
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const videParticipation: EntreeParticipation = {
    structureJuridiqueId: sccvId,
    associeId: null,
    pourcentage: null,
    convTreso: null,
    motifRemunerationAssocieId: null,
    dateSignatureConv: null,
    dateApplication: null,
    dateFinRemuneration: null,
    indexTauxRemunerationId: null,
    infoTauxRemuneration: null,
    periodiciteVersement: null,
    commentaires: null,
  }
  const [valeurs, setValeurs] = useState<EntreeParticipation>(() =>
    participation ? versEntreeParticipation(sccvId, participation) : videParticipation,
  )
  const enregistrer = useMutation({
    mutationFn: (d: EntreeParticipation) => saveParticipationFn({ data: d }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sccv-detail', sccvId] })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(
        participation ? versEntreeParticipation(sccvId, participation) : videParticipation,
      )
      enregistrer.reset()
    }
  }, [open, participation, sccvId])

  const set =
    <TCle extends keyof EntreeParticipation>(k: TCle) =>
    (v: EntreeParticipation[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const autres = participations.filter((p) => p.id !== participation?.id)
  const total =
    Math.round(
      (autres.reduce((s, p) => s + (p.pourcentage ?? 0), 0) + (valeurs.pourcentage ?? 0)) *
        100,
    ) / 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {participation ? 'Modifier la participation' : 'Nouvelle participation'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(participation ? { ...valeurs, id: participation.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampSelectId
              libelle="Associé"
              value={valeurs.associeId}
              onChange={set('associeId')}
              options={nomenclatures?.associes ?? []}
            />
            <ChampSaisie
              libelle="Pourcentage"
              type="number"
              step="0.01"
              value={valeurs.pourcentage != null ? String(valeurs.pourcentage) : ''}
              onChange={(v) => set('pourcentage')(v === '' ? null : Number(v))}
            />
            <ChampBascule
              libelle="Convention tréso"
              checked={!!valeurs.convTreso}
              onChange={set('convTreso')}
            />
            <ChampSelectId
              libelle="Motif rémunération"
              value={valeurs.motifRemunerationAssocieId}
              onChange={set('motifRemunerationAssocieId')}
              options={nomenclatures?.motifs ?? []}
            />
            <ChampSaisie
              libelle="Date signature conv."
              type="date"
              value={valeurs.dateSignatureConv ?? ''}
              onChange={set('dateSignatureConv')}
            />
            <ChampSaisie
              libelle="Date application"
              type="date"
              value={valeurs.dateApplication ?? ''}
              onChange={set('dateApplication')}
            />
            <ChampSaisie
              libelle="Date fin rémunération"
              type="date"
              value={valeurs.dateFinRemuneration ?? ''}
              onChange={set('dateFinRemuneration')}
            />
            <ChampSelectId
              libelle="Index taux"
              value={valeurs.indexTauxRemunerationId}
              onChange={set('indexTauxRemunerationId')}
              options={nomenclatures?.indexTaux ?? []}
            />
            <ChampSaisie
              libelle="Info taux"
              value={valeurs.infoTauxRemuneration ?? ''}
              onChange={set('infoTauxRemuneration')}
            />
            <ChampSelectTexte
              libelle="Périodicité"
              value={valeurs.periodiciteVersement}
              onChange={set('periodiciteVersement')}
              options={PERIODICITES}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires"
                value={valeurs.commentaires ?? ''}
                onChange={set('commentaires')}
              />
            </div>
          </div>

          <ErreurMutation erreur={enregistrer.error} />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
          {total !== 100 && (
            <p className="mt-2 text-right text-[12px] text-amber-700">
              Total des participations :{' '}
              {total.toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              % (≠ 100 %)
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modale « Compte bancaire »
// ---------------------------------------------------------------------------

interface EntreeCompteBanque {
  id?: number
  structureJuridiqueId: number
  banqueId?: number | null
  typeCompteBanqueId?: number | null
  utilisationCompteId?: number | null
  numCompte?: string | null
  iban?: string | null
  bic?: string | null
  estCloture?: boolean | null
  commentaires?: string | null
}

function ModaleCompteBanque({
  sccvId,
  compte,
  open,
  onOpenChange,
  nomenclatures,
}: {
  sccvId: number
  /** null = création */
  compte: LigneCompteSccv | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const videCompte: EntreeCompteBanque = {
    structureJuridiqueId: sccvId,
    banqueId: null,
    typeCompteBanqueId: null,
    utilisationCompteId: null,
    numCompte: null,
    iban: null,
    bic: null,
    estCloture: null,
    commentaires: null,
  }
  const depuisLigne = (c: LigneCompteSccv): EntreeCompteBanque => ({
    structureJuridiqueId: sccvId,
    banqueId: c.banqueId,
    typeCompteBanqueId: c.typeCompteBanqueId,
    utilisationCompteId: c.utilisationCompteId,
    numCompte: c.numCompte,
    iban: c.iban,
    bic: c.bic,
    estCloture: c.estCloture,
    commentaires: c.commentaires,
  })
  const [valeurs, setValeurs] = useState<EntreeCompteBanque>(() =>
    compte ? depuisLigne(compte) : videCompte,
  )
  const enregistrer = useMutation({
    mutationFn: (d: EntreeCompteBanque) => saveCompteBanqueFn({ data: d }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sccv-detail', sccvId] })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(compte ? depuisLigne(compte) : videCompte)
      enregistrer.reset()
    }
  }, [open, compte, sccvId])

  const set =
    <TCle extends keyof EntreeCompteBanque>(k: TCle) =>
    (v: EntreeCompteBanque[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {compte ? 'Modifier le compte bancaire' : 'Nouveau compte bancaire'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(compte ? { ...valeurs, id: compte.id } : valeurs)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampSelectId
              libelle="Banque"
              value={valeurs.banqueId}
              onChange={set('banqueId')}
              options={nomenclatures?.banques ?? []}
            />
            <ChampSelectId
              libelle="Type de compte"
              value={valeurs.typeCompteBanqueId}
              onChange={set('typeCompteBanqueId')}
              options={nomenclatures?.typesCompte ?? []}
            />
            <ChampSelectId
              libelle="Utilisation"
              value={valeurs.utilisationCompteId}
              onChange={set('utilisationCompteId')}
              options={nomenclatures?.utilisations ?? []}
            />
            <ChampSaisie
              libelle="N° compte"
              value={valeurs.numCompte ?? ''}
              onChange={set('numCompte')}
            />
            <ChampSaisie libelle="IBAN" value={valeurs.iban ?? ''} onChange={set('iban')} />
            <ChampSaisie libelle="BIC" value={valeurs.bic ?? ''} onChange={set('bic')} />
            <ChampBascule
              libelle="Clôturé"
              checked={!!valeurs.estCloture}
              onChange={set('estCloture')}
            />
            <div className="sm:col-span-2">
              <ChampTexteLong
                libelle="Commentaires"
                value={valeurs.commentaires ?? ''}
                onChange={set('commentaires')}
              />
            </div>
          </div>

          <ErreurMutation erreur={enregistrer.error} />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Modale « Centre des impôts » (volet de la même fiche, saveSccvFn avec la
// fiche courante fusionnée)
// ---------------------------------------------------------------------------

function ModaleCentreImpots({
  fiche,
  open,
  onOpenChange,
  nomenclatures,
}: {
  fiche: FicheSccvBrute
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const volet = (f: FicheSccvBrute) => ({
    ediTva: f.ediTva,
    ediLiasse: f.ediLiasse,
    cpteFiscal: f.cpteFiscal,
    sieId: f.sieId,
    civiliteId: f.civiliteId,
    interlocuteurSie: f.interlocuteurSie ?? '',
    dateMandatSie: versInputDate(f.dateMandatSie) ?? '',
  })
  const [valeurs, setValeurs] = useState(() => volet(fiche))
  const enregistrer = useMutation({
    mutationFn: () =>
      saveSccvFn({ data: { ...versEntreeFiche(fiche), ...valeurs, id: fiche.id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sccv-liste'] })
      void queryClient.invalidateQueries({ queryKey: ['sccv-detail', fiche.id] })
      // l'interlocuteur SIE saisi rejoint les suggestions (REQ_InterlocuteurSIE,
      // liste distincte dérivée de la fiche elle-même)
      void queryClient.invalidateQueries({ queryKey: ['sccv-nomenclatures'] })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    // dépendance sur fiche.id (pas fiche) : l'objet fiche change d'identité à
    // chaque refetch (staleTime 0, refetchOnWindowFocus) sans que la modale
    // rouvre — ne pas réinitialiser le formulaire en pleine saisie
    if (open) {
      setValeurs(volet(fiche))
      enregistrer.reset()
    }
  }, [open, fiche.id])

  const set =
    <TCle extends keyof typeof valeurs>(k: TCle) =>
    (v: (typeof valeurs)[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  const datalistId = 'sccv-interlocuteurs-sie'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Centre des impôts</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate()
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-5">
              <ChampBascule libelle="EDI TVA" checked={!!valeurs.ediTva} onChange={set('ediTva')} />
              <ChampBascule
                libelle="EDI Liasse"
                checked={!!valeurs.ediLiasse}
                onChange={set('ediLiasse')}
              />
              <ChampBascule
                libelle="Cpte fiscal"
                checked={!!valeurs.cpteFiscal}
                onChange={set('cpteFiscal')}
              />
            </div>
            <ChampSelectId
              libelle="SIE"
              value={valeurs.sieId}
              onChange={set('sieId')}
              options={nomenclatures?.sies ?? []}
            />
            <ChampSelectId
              libelle="Civilité"
              value={valeurs.civiliteId}
              onChange={set('civiliteId')}
              options={nomenclatures?.civilites ?? []}
            />
            <ChampSaisie
              libelle="Interlocuteur SIE"
              value={valeurs.interlocuteurSie}
              onChange={set('interlocuteurSie')}
              list={datalistId}
            />
            <datalist id={datalistId}>
              {(nomenclatures?.interlocuteursSie ?? [])
                .filter((s): s is string => s != null)
                .map((s) => (
                  <option key={s} value={s} />
                ))}
            </datalist>
            <ChampSaisie
              libelle="Date mandat SIE"
              type="date"
              value={valeurs.dateMandatSie}
              onChange={set('dateMandatSie')}
            />
          </div>

          <ErreurMutation erreur={enregistrer.error} />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={enregistrer.isPending}>
              Valider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DetailSccv({
  sccvId,
  nomenclatures,
  onModifierFiche,
}: {
  sccvId: number
  nomenclatures: Nomenclatures | undefined
  onModifierFiche: (fiche: FicheSccvBrute) => void
}) {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [ongletStocke, setOnglet] = usePref<OngletSccv>(
    'onglet:sccv',
    ONGLETS_SCCV[0],
  )
  // un onglet renommé depuis l'enregistrement ne doit pas laisser la page vide
  const onglet = ONGLETS_SCCV.includes(ongletStocke)
    ? ongletStocke
    : ONGLETS_SCCV[0]
  const detail = useQuery({
    queryKey: ['sccv-detail', sccvId],
    queryFn: () => getSccvDetailFn({ data: { sccvId } }),
  })

  const [participationSelectionnee, setParticipationSelectionnee] = useState<
    number | null
  >(null)
  const [participationModale, setParticipationModale] = useState<
    'creation' | LigneParticipation | null
  >(null)
  const [compteSelectionne, setCompteSelectionne] = useState<number | null>(null)
  const [compteModale, setCompteModale] = useState<'creation' | LigneCompteSccv | null>(
    null,
  )
  const [centreImpotsOuvert, setCentreImpotsOuvert] = useState(false)

  const supprimerParticipation = useMutation({
    mutationFn: (id: number) => deleteParticipationFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sccv-detail', sccvId] })
      setParticipationSelectionnee(null)
    },
  })
  const supprimerCompte = useMutation({
    mutationFn: (id: number) => deleteCompteBanqueFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sccv-detail', sccvId] })
      setCompteSelectionne(null)
    },
  })

  if (detail.isLoading) {
    return (
      <p className="mt-5 shrink-0 text-[13px] text-[var(--muted)]">
        Chargement…
      </p>
    )
  }
  const d = detail.data
  if (!d) {
    return (
      <p className="mt-5 shrink-0 text-[13px] text-[var(--muted)]">
        SCCV introuvable.
      </p>
    )
  }
  const f = d.fiche
  const sie = nomenclatures?.sies.find((s) => s.id === f.sieId)
  const civilite = nomenclatures?.civilites.find((c) => c.id === f.civiliteId)

  return (
    <section className="island-shell mt-5 flex max-h-[52%] min-h-0 shrink-0 flex-col overflow-hidden rounded-xl">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--line-soft)] px-[18px] py-[14px]">
        <h2 className="text-[15.5px] font-bold text-[var(--ink)]">{f.rs}</h2>
        {f.dateLiquidation && (
          <span className="badge-pill bg-[var(--danger-tint)] font-bold text-[var(--danger)]">
            Liquidée le {fmtDate(f.dateLiquidation)}
          </span>
        )}
        {!lectureSeule && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => onModifierFiche(f)}
          >
            Modifier
          </Button>
        )}
      </header>

      <Onglets onglets={ONGLETS_SCCV} actif={onglet} onChange={setOnglet} />

      <div className="min-h-0 flex-1 overflow-auto px-[18px] py-4">
        {onglet === 'Associés' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {!lectureSeule && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => setParticipationModale('creation')}>
                  Nouveau
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={participationSelectionnee == null}
                  onClick={() => {
                    const p = d.participations.find(
                      (x) => x.id === participationSelectionnee,
                    )
                    if (p) setParticipationModale(p)
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={participationSelectionnee == null}
                  onClick={() => {
                    if (
                      participationSelectionnee != null &&
                      confirm('Supprimer cette participation ?')
                    ) {
                      supprimerParticipation.mutate(participationSelectionnee)
                    }
                  }}
                >
                  Supprimer
                </Button>
              </div>
            )}
            <ErreurMutation erreur={supprimerParticipation.error} />
            <DataTable
              id="sccv-participations"
              columns={COLONNES_PARTICIPATIONS}
              data={d.participations}
              unite="associés"
              getRowId={(p) => String(p.id)}
              selectedRowId={
                participationSelectionnee != null ? String(participationSelectionnee) : null
              }
              onRowClick={(p) => setParticipationSelectionnee(p.id)}
              totalFor={['pourcentage']}
              emptyText="Aucun associé."
            />
          </div>
        )}

        {onglet === 'Opérations' && (
          <div className="flex h-full min-h-0 flex-col">
            <DataTable
              id="sccv-operations"
              columns={COLONNES_OPERATIONS_SCCV}
              data={d.operations}
              unite="opérations"
              getRowId={(o) => String(o.id)}
              emptyText="Aucune opération."
            />
          </div>
        )}

        {onglet === 'Comptes bancaires' && (
          <div className="flex h-full min-h-0 flex-col gap-2">
            {!lectureSeule && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => setCompteModale('creation')}>
                  Nouveau
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={compteSelectionne == null}
                  onClick={() => {
                    const c = d.comptes.find((x) => x.id === compteSelectionne)
                    if (c) setCompteModale(c)
                  }}
                >
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={compteSelectionne == null}
                  onClick={() => {
                    if (compteSelectionne != null && confirm('Supprimer ce compte bancaire ?')) {
                      supprimerCompte.mutate(compteSelectionne)
                    }
                  }}
                >
                  Supprimer
                </Button>
              </div>
            )}
            <ErreurMutation erreur={supprimerCompte.error} />
            <DataTable
              id="sccv-comptes"
              columns={COLONNES_COMPTES_SCCV}
              data={d.comptes}
              unite="comptes"
              getRowId={(c) => String(c.id)}
              selectedRowId={compteSelectionne != null ? String(compteSelectionne) : null}
              onRowClick={(c) => setCompteSelectionne(c.id)}
              emptyText="Aucun compte bancaire."
            />
          </div>
        )}

        {onglet === 'Centre des impôts' && (
          <div className="flex flex-col gap-3">
            {!lectureSeule && (
              <div>
                <Button size="sm" onClick={() => setCentreImpotsOuvert(true)}>
                  Modifier
                </Button>
              </div>
            )}
            <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              <Case libelle="EDI TVA" actif={f.ediTva} />
              <Case libelle="EDI Liasse" actif={f.ediLiasse} />
              <Case libelle="Cpte fiscal" actif={f.cpteFiscal} />
              <Champ libelle="SIE">{sie?.libelle}</Champ>
              <Champ libelle="Civilité">{civilite?.libelle}</Champ>
              <Champ libelle="Interlocuteur SIE">{f.interlocuteurSie}</Champ>
              <Champ libelle="Date mandat SIE">{fmtDate(f.dateMandatSie)}</Champ>
            </div>
          </div>
        )}
      </div>

      <ModaleParticipation
        sccvId={sccvId}
        participation={participationModale === 'creation' ? null : participationModale}
        participations={d.participations}
        open={participationModale != null}
        onOpenChange={(o) => {
          if (!o) setParticipationModale(null)
        }}
        nomenclatures={nomenclatures}
      />
      <ModaleCompteBanque
        sccvId={sccvId}
        compte={compteModale === 'creation' ? null : compteModale}
        open={compteModale != null}
        onOpenChange={(o) => {
          if (!o) setCompteModale(null)
        }}
        nomenclatures={nomenclatures}
      />
      <ModaleCentreImpots
        fiche={f}
        open={centreImpotsOuvert}
        onOpenChange={setCentreImpotsOuvert}
        nomenclatures={nomenclatures}
      />
    </section>
  )
}
