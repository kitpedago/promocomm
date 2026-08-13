// Module Acquéreurs (FEN_Table_Acquereur + FEN_Fiche_Acquereur) — CRUD complet.
// Référence : migration_windev/captures_ecrans/Acquéreurs.png (liste : arbre de
// filtre par opération, recherche nom/email/téléphones ≥ 3 car., « lot
// courant » calculé) et Fiche_Acquéreurs_*.png (fiche : 3 onglets Profil
// client / Logement / Financement, conseiller commercial en tête). L'onglet
// Profil client, fouillis en 3 colonnes dans WinDev, est réorganisé en
// sections : Identité, Coordonnées, Foyer, Adultes, Suivi.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Search } from 'lucide-react'

import {
  BoutonsTable,
  ChampBascule,
  ChampDate,
  ChampForm,
  ChampNombre,
  ChampSelectId,
  ChampSelectTexte,
  ChampTexte,
  ChampTexteLong,
  ErreurMutation,
  SousTitre,
  versInputDate,
} from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import Onglets from '#/components/Onglets'
import PanneauOperations from '#/components/PanneauOperations'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  deleteAcquereurFn,
  getAcquereurFicheFn,
  getAcquereurNomenclaturesFn,
  getAcquereursFn,
  saveAcquereurFn,
} from '#/lib/acquereurs.ts'
import {
  calculerAge,
  calculerMenage,
  trancheAgePourAges,
} from '#/lib/acquereurs.helpers.ts'
import { SELECTION_VIDE, usePref } from '#/lib/preferences.ts'
import { enFraction, enPourcent } from '#/lib/sccv.helpers.ts'
import { getService } from '#/lib/services'
import { sansAccents } from '#/lib/utils.ts'

import type { FicheAcquereur, LigneAcquereur } from '#/lib/acquereurs.ts'
import type { Selection } from '#/lib/preferences.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_authed/acquereurs')({
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('acquereurs')) throw redirect({ to: '/' })
    return { lectureSeule: context.session.user.service === 'consultation' }
  },
  component: PageAcquereurs,
})

type FicheBrute = NonNullable<Awaited<ReturnType<typeof getAcquereurFicheFn>>>
type Nomenclatures = Awaited<ReturnType<typeof getAcquereurNomenclaturesFn>>

const COLONNES: Array<ColumnDef<LigneAcquereur, any>> = [
  {
    accessorKey: 'nomComplet',
    header: 'Nom complet',
    size: 280,
    cell: (c) => (
      <span className="font-medium text-[var(--ink)]">
        {c.getValue() ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'lotCourant',
    header: 'Lot courant',
    size: 300,
    cell: (c) => c.getValue() ?? '—',
  },
  {
    accessorKey: 'civilite',
    header: 'Civilité',
    size: 150,
    cell: (c) => c.getValue() || '—',
  },
  {
    accessorKey: 'prenoms',
    header: 'Prénom(s)',
    size: 180,
    cell: (c) => c.getValue() || '—',
  },
  { accessorKey: 'email', header: 'Email', size: 220 },
  { accessorKey: 'telephone', header: 'Téléphone 1', size: 120 },
  { accessorKey: 'portable', header: 'Téléphone 2', size: 120 },
  { accessorKey: 'communeActuelle', header: 'Commune actuelle', size: 160 },
]

// ---------------------------------------------------------------------------
// Modale fiche acquéreur — 3 onglets iso-WinDev
// ---------------------------------------------------------------------------

const ONGLETS_FICHE = ['Profil client', 'Logement', 'Financement'] as const
type OngletFiche = (typeof ONGLETS_FICHE)[number]

// legacy PrimoAccedant : « oui »/« Non »/« -1 »… → Oui/Non pour la combo
function normaliserPrimo(v: string | null | undefined): string | null {
  const bas = (v ?? '').toLowerCase()
  return bas === 'oui' ? 'Oui' : bas === 'non' ? 'Non' : null
}

function versEntree(fiche: FicheBrute | null): FicheAcquereur {
  if (!fiche) return { dateCreation: versInputDate(new Date()) }
  return {
    ...fiche,
    dateModifAdresse: versInputDate(fiche.dateModifAdresse),
    adulte1DateNaissance: versInputDate(fiche.adulte1DateNaissance),
    adulte2DateNaissance: versInputDate(fiche.adulte2DateNaissance),
    dateCreation: versInputDate(fiche.dateCreation),
    primoAccedant: normaliserPrimo(fiche.primoAccedant),
  }
}

// Champ auto-calculé (grisé dans WinDev) : recalculé en direct côté client
// avec les mêmes helpers que le serveur, jamais saisi
function ChampCalcule({
  libelle,
  valeur,
}: {
  libelle: string
  valeur: string | number | null | undefined
}) {
  return (
    <ChampForm libelle={`${libelle} (auto)`}>
      <p className="flex h-9 items-center rounded-md border border-dashed border-[var(--input-border)] bg-[var(--paper)] px-3 text-[13px] text-[var(--ink-soft)]">
        {valeur ?? '—'}
      </p>
    </ChampForm>
  )
}

function ModaleAcquereur({
  fiche,
  open,
  onOpenChange,
  nomenclatures,
}: {
  /** null = création */
  fiche: FicheBrute | null
  open: boolean
  onOpenChange: (o: boolean) => void
  nomenclatures: Nomenclatures | undefined
}) {
  const queryClient = useQueryClient()
  const [onglet, setOnglet] = useState<OngletFiche>('Profil client')
  const [valeurs, setValeurs] = useState<FicheAcquereur>(() =>
    versEntree(fiche),
  )
  const enregistrer = useMutation({
    mutationFn: (d: FicheAcquereur) => saveAcquereurFn({ data: d }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['acquereurs'] })
      void queryClient.invalidateQueries({
        queryKey: ['acquereur-fiche', res.id],
      })
      onOpenChange(false)
    },
  })
  useEffect(() => {
    if (open) {
      setValeurs(versEntree(fiche))
      setOnglet('Profil client')
      enregistrer.reset()
    }
  }, [open, fiche])

  const set =
    <TCle extends keyof FicheAcquereur>(k: TCle) =>
    (v: FicheAcquereur[TCle]) =>
      setValeurs((s) => ({ ...s, [k]: v }))

  // aperçu des champs dérivés, mêmes règles que le serveur
  const derives = useMemo(() => {
    const ref = valeurs.dateCreation
      ? new Date(valeurs.dateCreation)
      : new Date()
    const age1 = calculerAge(
      valeurs.adulte1DateNaissance
        ? new Date(valeurs.adulte1DateNaissance)
        : null,
      ref,
    )
    const age2 = calculerAge(
      valeurs.adulte2DateNaissance
        ? new Date(valeurs.adulte2DateNaissance)
        : null,
      ref,
    )
    const menage = calculerMenage(
      valeurs.nombreAdultes ?? null,
      valeurs.nombreEnfants ?? null,
      valeurs.enfantAVenir ?? null,
    )
    const trancheId = trancheAgePourAges(
      age1,
      age2,
      nomenclatures?.tranchesAge ?? [],
    )
    const libelle = (
      liste: Array<{ id: number; libelle: string }> | undefined,
      id: number | null,
    ) => liste?.find((x) => x.id === id)?.libelle ?? null
    return {
      age1,
      age2,
      trancheAge: libelle(nomenclatures?.tranchesAge, trancheId),
      typeMenage: libelle(nomenclatures?.typesMenage, menage.typeMenageId),
      situationFamiliale: libelle(
        nomenclatures?.situationsFamiliale,
        menage.situationFamilialeId,
      ),
    }
  }, [valeurs, nomenclatures])

  const coAcquereur = (n: '' | '2' | '3') => (
    <>
      <ChampSelectId
        libelle={`Civilité ${n || '1'}`}
        value={valeurs[`civilite${n}Id`]}
        onChange={set(`civilite${n}Id`)}
        options={nomenclatures?.civilites ?? []}
      />
      <ChampTexte
        libelle={`Nom ${n || '1'}${n ? ' (si différent)' : ''}`}
        value={valeurs[`patronyme${n}`] ?? ''}
        onChange={(v) => set(`patronyme${n}`)(v || null)}
      />
      <ChampTexte
        libelle={`Prénom ${n || '1'}`}
        value={valeurs[`prenom${n}`] ?? ''}
        onChange={(v) => set(`prenom${n}`)(v || null)}
      />
    </>
  )

  const adulte = (n: '1' | '2') => (
    <div className="flex flex-col gap-3">
      <p className="text-center text-[12px] font-semibold text-[var(--ink)]">
        Adulte {n}
      </p>
      <ChampDate
        libelle="Date de naissance"
        value={valeurs[`adulte${n}DateNaissance`]}
        onChange={set(`adulte${n}DateNaissance`)}
      />
      <ChampCalcule libelle="Âge" valeur={derives[`age${n}`]} />
      <ChampTexte
        libelle="Lieu de naissance"
        value={valeurs[`adulte${n}LieuNaissance`] ?? ''}
        onChange={(v) => set(`adulte${n}LieuNaissance`)(v || null)}
      />
      <ChampSelectId
        libelle="CSP"
        value={valeurs[`adulte${n}CspId`]}
        onChange={set(`adulte${n}CspId`)}
        options={nomenclatures?.csps ?? []}
      />
      <ChampTexte
        libelle="Métier"
        value={valeurs[`adulte${n}Metier`] ?? ''}
        onChange={(v) => set(`adulte${n}Metier`)(v || null)}
      />
      <ChampTexte
        libelle="Commune de travail"
        value={valeurs[`adulte${n}CommuneTravail`] ?? ''}
        onChange={(v) => set(`adulte${n}CommuneTravail`)(v || null)}
      />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* hauteur fixe : le contenu des onglets varie, la modale ne saute pas ;
          seul le corps de l'onglet défile, pied de modale toujours visible */}
      <DialogContent
        sansDefilement
        className="flex h-[90vh] flex-col sm:max-w-4xl"
      >
        <DialogHeader>
          <DialogTitle>
            {fiche ? 'Modifier l’acquéreur' : 'Nouvel acquéreur'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            enregistrer.mutate(fiche ? { ...valeurs, id: fiche.id } : valeurs)
          }}
        >
          <div className="mb-2 max-w-xs">
            <ChampSelectId
              libelle="Conseiller commercial"
              value={valeurs.conseillerCommercialId}
              onChange={set('conseillerCommercialId')}
              options={nomenclatures?.commerciaux ?? []}
            />
          </div>

          <Onglets
            onglets={ONGLETS_FICHE}
            actif={onglet}
            onChange={setOnglet}
          />

          <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1">
            {onglet === 'Profil client' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <SousTitre>Identité</SousTitre>
                {coAcquereur('')}
                {coAcquereur('2')}
                {coAcquereur('3')}
                <ChampSelectId
                  libelle="Nature juridique"
                  value={valeurs.natureJuridiqueId}
                  onChange={set('natureJuridiqueId')}
                  options={nomenclatures?.naturesJuridiques ?? []}
                />
                <div className="sm:col-span-2">
                  <ChampTexte
                    libelle="Raison sociale"
                    value={valeurs.rs ?? ''}
                    onChange={(v) => set('rs')(v || null)}
                  />
                </div>

                <SousTitre>Coordonnées</SousTitre>
                <div className="sm:col-span-2">
                  <ChampTexte
                    libelle="Adresse actuelle"
                    value={valeurs.adresseActuelle ?? ''}
                    onChange={(v) => set('adresseActuelle')(v || null)}
                  />
                </div>
                <ChampTexte
                  libelle="CP actuel"
                  value={valeurs.cpActuel ?? ''}
                  onChange={(v) => set('cpActuel')(v || null)}
                />
                <ChampTexte
                  libelle="Commune actuelle"
                  value={valeurs.communeActuelle ?? ''}
                  onChange={(v) => set('communeActuelle')(v || null)}
                />
                <ChampTexte
                  libelle="Commune d’origine"
                  value={valeurs.communeOrigine ?? ''}
                  onChange={(v) => set('communeOrigine')(v || null)}
                />
                <ChampDate
                  libelle="Date modif adresse"
                  value={valeurs.dateModifAdresse}
                  onChange={set('dateModifAdresse')}
                />
                <ChampTexte
                  libelle="Téléphone 1"
                  value={valeurs.telephone ?? ''}
                  onChange={(v) => set('telephone')(v || null)}
                />
                <ChampTexte
                  libelle="Téléphone 2"
                  value={valeurs.portable ?? ''}
                  onChange={(v) => set('portable')(v || null)}
                />
                <div />
                <ChampTexte
                  libelle="Email"
                  value={valeurs.email ?? ''}
                  onChange={(v) => set('email')(v || null)}
                />
                <ChampTexte
                  libelle="Email 2"
                  value={valeurs.email2 ?? ''}
                  onChange={(v) => set('email2')(v || null)}
                />

                <SousTitre>Foyer</SousTitre>
                <ChampNombre
                  libelle="Nombre d’adultes"
                  step="1"
                  value={valeurs.nombreAdultes}
                  onChange={set('nombreAdultes')}
                />
                <ChampNombre
                  libelle="Nombre d’enfants"
                  step="1"
                  value={valeurs.nombreEnfants}
                  onChange={set('nombreEnfants')}
                />
                <ChampNombre
                  libelle="Enfant à venir"
                  step="1"
                  value={valeurs.enfantAVenir}
                  onChange={set('enfantAVenir')}
                />
                <ChampSelectId
                  libelle="Situation famille"
                  value={valeurs.situationFamilleId}
                  onChange={set('situationFamilleId')}
                  options={nomenclatures?.situationsFamille ?? []}
                />
                <ChampCalcule
                  libelle="Situation familiale"
                  valeur={derives.situationFamiliale}
                />
                <ChampCalcule
                  libelle="Type de ménage"
                  valeur={derives.typeMenage}
                />
                <ChampCalcule
                  libelle="Tranche d’âge"
                  valeur={derives.trancheAge}
                />
                <div className="grid grid-cols-5 gap-2 sm:col-span-2">
                  {([1, 2, 3, 4, 5] as const).map((i) => (
                    <ChampNombre
                      key={i}
                      libelle={`Âge enf. ${i}`}
                      step="1"
                      value={valeurs[`ageEnfant${i}`]}
                      onChange={set(`ageEnfant${i}`)}
                    />
                  ))}
                </div>

                <SousTitre>Adultes</SousTitre>
                <div className="grid gap-x-6 gap-y-3 sm:col-span-3 sm:grid-cols-2">
                  {adulte('1')}
                  {adulte('2')}
                </div>

                <SousTitre>Suivi</SousTitre>
                <ChampTexte
                  libelle="Étape"
                  value={valeurs.etape ?? ''}
                  onChange={(v) => set('etape')(v || null)}
                />
                {/* les 3 enquêtes sur la même ligne */}
                <div className="sm:col-span-2" />
                <ChampTexte
                  libelle="Enquête A"
                  value={valeurs.enqueteA ?? ''}
                  onChange={(v) => set('enqueteA')(v || null)}
                />
                <ChampTexte
                  libelle="Enquête B"
                  value={valeurs.enqueteB ?? ''}
                  onChange={(v) => set('enqueteB')(v || null)}
                />
                <ChampTexte
                  libelle="Enquête C"
                  value={valeurs.enqueteC ?? ''}
                  onChange={(v) => set('enqueteC')(v || null)}
                />
                <div className="sm:col-span-2">
                  <ChampTexteLong
                    libelle="Infos pour entreprise"
                    value={valeurs.infoPourEntreprise ?? ''}
                    onChange={(v) => set('infoPourEntreprise')(v || null)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <ChampTexteLong
                    libelle="Commentaires"
                    value={valeurs.commentaire ?? ''}
                    onChange={(v) => set('commentaire')(v || null)}
                  />
                </div>
                <ChampDate
                  libelle="Date création"
                  value={valeurs.dateCreation}
                  onChange={set('dateCreation')}
                />
              </div>
            )}

            {onglet === 'Logement' && (
              <div className="grid max-w-md gap-3">
                <ChampSelectId
                  libelle="Type logement actuel"
                  value={valeurs.typeLogementActuelId}
                  onChange={set('typeLogementActuelId')}
                  options={nomenclatures?.typesLogement ?? []}
                />
                <ChampNombre
                  libelle="Loyer actuel"
                  value={valeurs.loyerActuel}
                  onChange={set('loyerActuel')}
                />
                <ChampSelectTexte
                  libelle="Primo-accédant"
                  value={valeurs.primoAccedant}
                  onChange={set('primoAccedant')}
                  options={['Oui', 'Non']}
                />
              </div>
            )}

            {onglet === 'Financement' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <SousTitre>Revenus</SousTitre>
                <ChampNombre
                  libelle="Revenus foyer fiscal"
                  value={valeurs.revenusFoyerFiscal}
                  onChange={set('revenusFoyerFiscal')}
                />
                <ChampNombre
                  libelle="Année déclaration"
                  step="1"
                  value={valeurs.anneeDeclaration}
                  onChange={set('anneeDeclaration')}
                />
                <ChampNombre
                  libelle="Revenus net imp. N-1"
                  value={valeurs.revenusNetImposableNm1}
                  onChange={set('revenusNetImposableNm1')}
                />
                <ChampNombre
                  libelle="Revenu net foyer mensuel"
                  value={valeurs.revenuNetFoyerMensuel}
                  onChange={set('revenuNetFoyerMensuel')}
                />
                <ChampNombre
                  libelle="Pension et autres revenus"
                  value={valeurs.pensionAutresRevenus}
                  onChange={set('pensionAutresRevenus')}
                />
                <ChampSelectId
                  libelle="Plafond ressources"
                  value={valeurs.plafondRessourcesId}
                  onChange={set('plafondRessourcesId')}
                  options={nomenclatures?.plafonds ?? []}
                />

                <SousTitre>Financement</SousTitre>
                <ChampNombre
                  libelle="Apport réel à date hors subvention"
                  value={valeurs.apportReelHorsSubvention}
                  onChange={set('apportReelHorsSubvention')}
                />
                <ChampNombre
                  libelle="Subvention"
                  value={valeurs.subvention}
                  onChange={set('subvention')}
                />
                <ChampNombre
                  libelle="Mensualité du financement"
                  value={valeurs.mensualiteFinancement}
                  onChange={set('mensualiteFinancement')}
                />
                <ChampNombre
                  libelle="Durée financement en mois"
                  step="1"
                  value={valeurs.dureeFinancementMois}
                  onChange={set('dureeFinancementMois')}
                />
                {/* stocké en fraction 0–1 (legacy), affiché en % comme WinDev */}
                <ChampNombre
                  libelle="Taux d’effort (%)"
                  value={enPourcent(valeurs.tauxEffort ?? null)}
                  onChange={(v) => set('tauxEffort')(enFraction(v))}
                />
                <ChampBascule
                  libelle="PTZ ?"
                  checked={!!valeurs.estPtz}
                  onChange={set('estPtz')}
                />
              </div>
            )}
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
// Page
// ---------------------------------------------------------------------------

function PageAcquereurs() {
  const { lectureSeule } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const [selection, setSelection] = usePref<Selection>(
    'selection',
    SELECTION_VIDE,
  )
  // filtre pré-positionné sur l'opération mémorisée (fil conducteur WinDev) ;
  // null = toutes les opérations ; re-clic = désélection, filtre local
  // seulement — la dernière opération reste mémorisée pour les autres pages
  const [opId, setOpId] = useState<number | null>(() =>
    Number.isInteger(selection.op) && selection.op! > 0 ? selection.op! : null,
  )
  const [recherche, setRecherche] = useState('')
  const [acquereurId, setAcquereurId] = useState<number | null>(null)
  const [modale, setModale] = useState<'creation' | FicheBrute | null>(null)

  const acquereurs = useQuery({
    queryKey: ['acquereurs'],
    queryFn: () => getAcquereursFn(),
    staleTime: 60_000,
  })
  const nomenclatures = useQuery({
    queryKey: ['acquereur-nomenclatures'],
    queryFn: () => getAcquereurNomenclaturesFn(),
    staleTime: 300_000,
    enabled: !lectureSeule,
  })
  const supprimer = useMutation({
    mutationFn: (id: number) => deleteAcquereurFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acquereurs'] })
      setAcquereurId(null)
    },
  })

  const ouvrirFiche = (id: number) => {
    void queryClient
      .fetchQuery({
        queryKey: ['acquereur-fiche', id],
        queryFn: () => getAcquereurFicheFn({ data: { id } }),
      })
      .then((fiche) => {
        if (fiche) setModale(fiche)
      })
  }

  // Double-clic = Modifier (double_click : BTN_Modifier dans WinDev) ;
  // détection manuelle, DataTable n'expose qu'onRowClick
  const dernierClic = useRef<{ id: number; t: number }>({ id: -1, t: 0 })
  const gererClicLigne = (r: LigneAcquereur) => {
    const maintenant = Date.now()
    const estDoubleClic =
      dernierClic.current.id === r.id &&
      maintenant - dernierClic.current.t < 400
    dernierClic.current = estDoubleClic
      ? { id: -1, t: 0 }
      : { id: r.id, t: maintenant }
    setAcquereurId(r.id)
    if (estDoubleClic && !lectureSeule) ouvrirFiche(r.id)
  }

  const filtres = useMemo(() => {
    let liste = acquereurs.data ?? []
    if (opId != null) {
      liste = liste.filter((a) => a.operationIds?.includes(opId))
    }
    const q = sansAccents(recherche.trim())
    if (q.length >= 3) {
      liste = liste.filter((a) =>
        sansAccents(
          `${a.nomComplet ?? ''} ${a.email ?? ''} ${a.email2 ?? ''} ${a.telephone ?? ''} ${a.portable ?? ''}`,
        ).includes(q),
      )
    }
    return liste
  }, [acquereurs.data, opId, recherche])

  return (
    <div className="flex min-h-[calc(100vh-61px)] items-stretch">
      <PanneauOperations
        selectedId={opId}
        onSelect={(id) => {
          const deselection = opId === id
          setOpId(deselection ? null : id)
          // pas d'URL d'opération ici : on écrit directement (changement
          // d'opération → la tranche mémorisée ne s'applique plus)
          if (!deselection && selection.op !== id) setSelection({ op: id })
        }}
      />

      <div className="min-w-0 flex-1 px-5 py-5 sm:px-7">
        <h1 className="mb-3 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
          Acquéreurs
        </h1>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex w-fit max-w-full items-center gap-2">
            <span className="text-[13px] font-medium text-[var(--ink-soft)]">
              Filtrer sur le nom, email, Téléphone 1 et 2
            </span>
            <span className="flex h-8 items-center gap-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--card)] px-2.5">
              <Search className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Au moins 3 carac."
                className="w-44 bg-transparent text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
              />
            </span>
          </label>

          {!lectureSeule && (
            <BoutonsTable
              selection={acquereurId}
              onNouveau={() => setModale('creation')}
              onModifier={() => {
                if (acquereurId != null) ouvrirFiche(acquereurId)
              }}
              onSupprimer={() => {
                if (acquereurId != null) supprimer.mutate(acquereurId)
              }}
              confirmation="Supprimer cet acquéreur ? (refusé s'il est dans une commercialisation)"
            />
          )}
        </div>
        <ErreurMutation erreur={supprimer.error} />

        <DataTable
          id="acquereurs"
          columns={COLONNES}
          data={filtres}
          unite="acquéreurs"
          getRowId={(a) => String(a.id)}
          selectedRowId={acquereurId != null ? String(acquereurId) : null}
          onRowClick={gererClicLigne}
          defaultHidden={['email', 'telephone', 'portable', 'communeActuelle']}
          emptyText={
            acquereurs.isLoading ? 'Chargement…' : 'Aucun acquéreur trouvé.'
          }
        />
      </div>

      <ModaleAcquereur
        fiche={modale === 'creation' ? null : modale}
        open={modale != null}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
        nomenclatures={nomenclatures.data}
      />
    </div>
  )
}
