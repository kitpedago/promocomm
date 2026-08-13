// Module Paramètres (FEN_Param, phase 9) — CRUD des nomenclatures : liste
// des paramètres à gauche (arbre WinDev aplati), table + modale générique à
// droite (ModaleFiche, descripteurs partagés avec les colonnes).
// Capture : migration_windev/captures_ecrans/Paramètres.png.
// Hors périmètre ici : gestion directe Opérations/Tranches/Lots et import de
// lots (voir docs/plan-implementation.md).
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { BoutonsTable, ErreurMutation } from '#/components/ChampsModale'
import DataTable from '#/components/DataTable'
import ModaleFiche from '#/components/ModaleFiche'
import {
  deleteNomenclatureFn,
  getNomenclatureFn,
  saveNomenclatureFn,
} from '#/lib/parametres.ts'
import {
  deleteLotOtlFn,
  deleteOperationOtlFn,
  deleteTrancheOtlFn,
  getLotsOtlFn,
  getOperationsOtlFn,
  getOtlOptionsFn,
  getTranchesOtlFn,
  saveLotOtlFn,
  saveOperationOtlFn,
  saveTrancheOtlFn,
} from '#/lib/parametres.otl.ts'
import { usePref } from '#/lib/preferences.ts'
import { getService } from '#/lib/services'
import { fmtDate } from '#/lib/utils.ts'

import type { DescChamp, ValeursFiche } from '#/components/ModaleFiche'
import type { SlugNomenclature } from '#/lib/parametres.ts'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/_authed/parametres')({
  beforeLoad: ({ context }) => {
    const service = getService(context.session.user.service)
    if (!service?.modules.includes('parametres')) throw redirect({ to: '/' })
  },
  component: PageParametres,
})

// Un champ « libellé seul » (la majorité des listes)
const LIBELLE: Array<DescChamp> = [{ k: 'libelle', l: 'Libellé', t: 'texte' }]

interface ConfigListe {
  slug: SlugNomenclature
  titre: string
  /** libellé au singulier pour les titres de modale (« la commune ») */
  unite: string
  champs: Array<DescChamp>
  /** slug d'une autre liste fournissant les options d'un champ select */
  selects?: Partial<Record<string, SlugNomenclature>>
}

// L'arbre FEN_Param, aplati (mêmes intitulés)
const LISTES: Array<ConfigListe> = [
  {
    slug: 'plafonds-ressources',
    titre: 'Acquéreur Plafond de ressources',
    unite: 'plafond',
    champs: LIBELLE,
  },
  {
    slug: 'architectes',
    titre: 'Architectes',
    unite: 'architecte',
    champs: [
      { k: 'rs', l: 'Raison sociale', t: 'texte' },
      { k: 'commune', l: 'Commune', t: 'texte' },
      { k: 'commentaire', l: 'Commentaire', t: 'long' },
    ],
  },
  {
    slug: 'associes',
    titre: 'Associés',
    unite: 'associé',
    champs: [
      { k: 'rs', l: 'Raison sociale', t: 'texte' },
      { k: 'formeJuridique', l: 'Forme juridique', t: 'texte' },
      { k: 'siren', l: 'SIREN', t: 'texte' },
      { k: 'estHlm', l: 'Est HLM', t: 'bool' },
      { k: 'adresse1', l: 'Adresse 1', t: 'texte' },
      { k: 'adresse2', l: 'Adresse 2', t: 'texte' },
      { k: 'cp', l: 'CP', t: 'texte' },
      { k: 'commune', l: 'Commune', t: 'texte' },
      { k: 'tel', l: 'Téléphone', t: 'texte' },
      { k: 'email', l: 'Email', t: 'texte' },
      { k: 'contactNomComplet', l: 'Contact', t: 'texte' },
      { k: 'contactFonction', l: 'Fonction du contact', t: 'texte' },
      { k: 'commentaire', l: 'Commentaire', t: 'long' },
    ],
  },
  {
    slug: 'assurances',
    titre: 'Assurances (accords cadres)',
    unite: 'accord cadre',
    champs: [{ k: 'code', l: 'Code', t: 'texte' }],
  },
  {
    slug: 'banques',
    titre: 'Banques',
    unite: 'banque',
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { t: 'titre', l: 'Contact compte courant' },
      { k: 'ccNom', l: 'Nom', t: 'texte' },
      { k: 'ccAdresse', l: 'Adresse', t: 'texte' },
      { k: 'ccCp', l: 'CP', t: 'texte' },
      { k: 'ccCommune', l: 'Commune', t: 'texte' },
      { k: 'ccTel', l: 'Téléphone', t: 'texte' },
      { k: 'ccEmail', l: 'Email', t: 'texte' },
      { t: 'titre', l: 'Contact prêt' },
      { k: 'pretNom', l: 'Nom', t: 'texte' },
      { k: 'pretAdresse', l: 'Adresse', t: 'texte' },
      { k: 'pretCp', l: 'CP', t: 'texte' },
      { k: 'pretCommune', l: 'Commune', t: 'texte' },
      { k: 'pretTel', l: 'Téléphone', t: 'texte' },
      { k: 'pretEmail', l: 'Email', t: 'texte' },
    ],
  },
  {
    slug: 'categories-frais',
    titre: 'Catégories frais',
    unite: 'catégorie',
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { k: 'estPublicite', l: 'Est publicité', t: 'bool' },
      { k: 'ordre', l: 'Ordre', t: 'entier' },
      { k: 'usageFraisId', l: 'Usage', t: 'select', options: [] },
    ],
    selects: { usageFraisId: 'usages-frais' },
  },
  {
    slug: 'certifications',
    titre: 'Certifications',
    unite: 'certification',
    champs: LIBELLE,
  },
  {
    slug: 'civilites',
    titre: 'Civilités',
    unite: 'civilité',
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { k: 'libelleCourt', l: 'Libellé court', t: 'texte' },
    ],
  },
  {
    slug: 'commerciaux',
    titre: 'Commerciaux',
    unite: 'commercial',
    champs: [
      { k: 'denomination', l: 'Dénomination', t: 'texte' },
      { k: 'prenom', l: 'Prénom', t: 'texte' },
      { k: 'initiales', l: 'Initiales', t: 'texte' },
      { k: 'email', l: 'Email', t: 'texte' },
      { k: 'societe', l: 'Société', t: 'texte' },
      { k: 'fonction', l: 'Fonction', t: 'texte' },
    ],
  },
  {
    slug: 'communes',
    titre: 'Communes',
    unite: 'commune',
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { k: 'codeInsee', l: 'Code INSEE', t: 'texte' },
      { k: 'departement', l: 'Département', t: 'texte' },
      { k: 'codePostal', l: 'Code postal', t: 'texte' },
      { k: 'zonageAbcRevise', l: 'Zonage ABC révisé', t: 'texte' },
    ],
  },
  {
    slug: 'destinations',
    titre: 'Destination',
    unite: 'destination',
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { k: 'libelleComm', l: 'Libellé commercial', t: 'texte' },
      { k: 'commentaire', l: 'Commentaire', t: 'long' },
    ],
  },
  {
    slug: 'equipes-personnes',
    titre: 'Equipes personnes',
    unite: 'équipe',
    champs: LIBELLE,
  },
  {
    slug: 'gestionnaires-sccv',
    titre: 'Gestionnaire SCCV',
    unite: 'gestionnaire',
    champs: LIBELLE,
  },
  { slug: 'labels', titre: 'Labels', unite: 'label', champs: LIBELLE },
  {
    slug: 'missions-moe-interne',
    titre: 'Missions MOE Interne',
    unite: 'mission',
    champs: LIBELLE,
  },
  {
    slug: 'motifs-remuneration',
    titre: 'Motif rémunération associés',
    unite: 'motif',
    champs: LIBELLE,
  },
  {
    slug: 'motifs-clauses',
    titre: 'Motifs Clauses particulières Commercialisation',
    unite: 'motif',
    champs: LIBELLE,
  },
  {
    slug: 'moyens-paiement',
    titre: 'Moyens de paiement',
    unite: 'moyen de paiement',
    champs: LIBELLE,
  },
  {
    slug: 'natures-achat',
    titre: 'Nature achat',
    unite: "nature d'achat",
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { k: 'libelleLong', l: 'Libellé long', t: 'texte' },
      { k: 'ordreComm', l: 'Ordre commercial', t: 'entier' },
    ],
  },
  {
    slug: 'partenariats',
    titre: 'Partenariats',
    unite: 'partenariat',
    champs: LIBELLE,
  },
  {
    slug: 'performances-energetiques',
    titre: 'Performance énergétique',
    unite: 'performance',
    champs: LIBELLE,
  },
  {
    slug: 'personnes',
    titre: 'Personnes',
    unite: 'personne',
    champs: [
      { k: 'patronyme', l: 'Patronyme', t: 'texte' },
      { k: 'prenom', l: 'Prénom', t: 'texte' },
      { k: 'estPresent', l: 'Présent(e)', t: 'bool' },
      { k: 'fonctionId', l: 'Fonction (id legacy)', t: 'entier' },
      { k: 'equipePersonneId', l: 'Équipe', t: 'select', options: [] },
      { k: 'email', l: 'Email', t: 'texte' },
    ],
    selects: { equipePersonneId: 'equipes-personnes' },
  },
  {
    slug: 'prestataires',
    titre: 'Prestataires de commercialisation',
    unite: 'prestataire',
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte' },
      { k: 'afficherMission', l: 'Proposé sur les missions', t: 'bool' },
    ],
  },
  {
    slug: 'reserves-types',
    titre: 'Réserves — types',
    unite: 'type',
    champs: LIBELLE,
  },
  {
    slug: 'reserves-pieces',
    titre: 'Réserves — pièces',
    unite: 'pièce',
    champs: LIBELLE,
  },
  {
    slug: 'reserves-entreprises',
    titre: 'Réserves — entreprises',
    unite: 'entreprise',
    champs: [
      { k: 'rs', l: 'Raison sociale', t: 'texte' },
      { k: 'corpsEtat', l: "Corps d'état", t: 'texte' },
      { k: 'adresse1', l: 'Adresse 1', t: 'texte' },
      { k: 'adresse2', l: 'Adresse 2', t: 'texte' },
      { k: 'cp', l: 'CP', t: 'texte' },
      { k: 'commune', l: 'Commune', t: 'texte' },
      { k: 'telephone', l: 'Téléphone', t: 'texte' },
      { k: 'fax', l: 'Fax', t: 'texte' },
      { k: 'contact', l: 'Contact', t: 'texte' },
      { k: 'telContact', l: 'Tél. contact', t: 'texte' },
      { k: 'email', l: 'Email', t: 'texte' },
    ],
  },
  {
    slug: 'secteurs-geographiques',
    titre: 'Secteur Géographique Développement',
    unite: 'secteur',
    champs: LIBELLE,
  },
  {
    slug: 'types-fonciers',
    titre: 'Type foncier',
    unite: 'type foncier',
    champs: LIBELLE,
  },
  {
    slug: 'types-missions',
    titre: 'Types de missions',
    unite: 'type de mission',
    champs: LIBELLE,
  },
  {
    slug: 'usages-frais',
    titre: 'Usages frais',
    unite: 'usage',
    champs: LIBELLE,
  },
]

const OTL = 'operations-tranches-lots'

function PageParametres() {
  const [slugStocke, setSlug] = usePref<string>(
    'parametres:liste',
    LISTES[0].slug,
  )
  const config =
    slugStocke === OTL
      ? null
      : (LISTES.find((l) => l.slug === slugStocke) ?? LISTES[0])

  return (
    <div className="flex h-[calc(100vh-61px)] items-stretch">
      <aside className="sticky top-[61px] flex h-[calc(100vh-61px)] w-[264px] flex-shrink-0 flex-col border-r border-[var(--line)] bg-[var(--cream)]">
        <h2 className="px-3 pt-3 pb-2 text-[15px] font-bold text-[var(--ink)]">
          Paramètres
        </h2>
        <p className="island-kicker px-3 pb-1">Listes</p>
        <nav className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--line-soft)]">
          {LISTES.map((l) => (
            <button
              key={l.slug}
              onClick={() => setSlug(l.slug)}
              className={`block w-full cursor-pointer px-3 py-1.5 text-left text-[13px] transition-colors ${
                l.slug === config?.slug
                  ? 'bg-[var(--gold-tint)] font-semibold text-[var(--ink)]'
                  : 'font-medium text-[var(--ink-soft)] hover:bg-[var(--cream-hover)]'
              }`}
            >
              {l.titre}
            </button>
          ))}
          <button
            onClick={() => setSlug(OTL)}
            className={`block w-full cursor-pointer border-t border-[var(--line-soft)] px-3 py-1.5 text-left text-[13px] transition-colors ${
              config == null
                ? 'bg-[var(--gold-tint)] font-semibold text-[var(--ink)]'
                : 'font-medium text-[var(--ink-soft)] hover:bg-[var(--cream-hover)]'
            }`}
          >
            Opérations, tranches et lots
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7">
        <h1 className="mb-4 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
          {config?.titre ?? 'Opérations, Tranches et Lots'}
        </h1>
        {config ? (
          <ListeNomenclature key={config.slug} config={config} />
        ) : (
          <VueOtl />
        )}
      </div>
    </div>
  )
}

function ListeNomenclature({ config }: { config: ConfigListe }) {
  const queryClient = useQueryClient()
  const [selection, setSelection] = useState<number | null>(null)
  const [modale, setModale] = useState<'creation' | number | null>(null)

  const lignes = useQuery({
    queryKey: ['nomenclature', config.slug],
    queryFn: () => getNomenclatureFn({ data: { slug: config.slug } }),
  })
  // options des champs select : les listes référencées par la config
  const slugsOptions = Object.values(config.selects ?? {})
  const options0 = useQuery({
    queryKey: ['nomenclature', slugsOptions[0]],
    queryFn: () => getNomenclatureFn({ data: { slug: slugsOptions[0]! } }),
    enabled: slugsOptions.length > 0,
  })

  const champs: Array<DescChamp> = config.champs.map((c) => {
    if (c.t === 'select' && config.selects?.[c.k]) {
      const opts = (options0.data ?? []).map((o) => ({
        id: o.id,
        libelle: String(o.libelle ?? o.rs ?? o.code ?? o.id),
      }))
      return { ...c, options: opts }
    }
    return c
  })

  // colonnes de table dérivées des descripteurs (mêmes libellés)
  const colonnes: Array<ColumnDef<Record<string, unknown>, any>> = champs
    .filter((c) => c.t !== 'titre')
    .map((c) => {
      const cle = (c as { k: string }).k
      if (c.t === 'select') {
        const parId = new Map(
          (
            c as { options: Array<{ id: number; libelle: string | null }> }
          ).options.map((o) => [o.id, o.libelle]),
        )
        return {
          accessorKey: cle,
          header: c.l,
          size: 160,
          cell: (x) => parId.get(x.getValue() as number) ?? '—',
        }
      }
      if (c.t === 'bool')
        return {
          accessorKey: cle,
          header: c.l,
          size: 110,
          cell: (x) => (
            <span className="block text-center">
              {x.getValue() ? '✓' : '—'}
            </span>
          ),
        }
      if (c.t === 'date')
        return {
          accessorKey: cle,
          header: c.l,
          size: 120,
          cell: (x) => (
            <span className="tabular-nums">
              {fmtDate(x.getValue() as string | null)}
            </span>
          ),
        }
      if (c.t === 'nombre' || c.t === 'entier')
        return {
          accessorKey: cle,
          header: c.l,
          size: 110,
          cell: (x) => (
            <span className="block text-right tabular-nums">
              {(x.getValue() as number | null) ?? '—'}
            </span>
          ),
        }
      return {
        accessorKey: cle,
        header: c.l,
        size: c.t === 'long' ? 280 : 180,
        cell: (x) => (x.getValue() as string | null) ?? '—',
      }
    })

  const ligne =
    typeof modale === 'number'
      ? (lignes.data?.find((l) => l.id === modale) ?? null)
      : null
  const invalider = () =>
    void queryClient.invalidateQueries({
      queryKey: ['nomenclature', config.slug],
    })
  const enregistrer = useMutation({
    mutationFn: (v: ValeursFiche) =>
      saveNomenclatureFn({
        data: {
          slug: config.slug,
          id: typeof modale === 'number' ? modale : undefined,
          valeurs: v,
        },
      }),
    onSuccess: () => {
      invalider()
      setModale(null)
    },
  })
  const supprimer = useMutation({
    mutationFn: (id: number) =>
      deleteNomenclatureFn({ data: { slug: config.slug, id } }),
    onSuccess: () => {
      invalider()
      setSelection(null)
    },
  })

  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-[18px] py-4">
        <BoutonsTable
          selection={selection}
          onNouveau={() => {
            enregistrer.reset()
            setModale('creation')
          }}
          onModifier={() => {
            if (selection != null) {
              enregistrer.reset()
              setModale(selection)
            }
          }}
          onSupprimer={() => {
            if (selection != null) supprimer.mutate(selection)
          }}
          confirmation={`Supprimer ${config.unite === 'entreprise' || config.unite === 'équipe' ? 'cette' : 'ce'} ${config.unite} ? (refusé si la valeur est encore utilisée)`}
        />
        <ErreurMutation erreur={supprimer.error} />
        <DataTable
          id={`parametres-${config.slug}`}
          columns={colonnes}
          data={lignes.data ?? []}
          unite="lignes"
          getRowId={(r) => String(r.id)}
          selectedRowId={selection != null ? String(selection) : null}
          onRowClick={(r) => setSelection(r.id as number)}
          emptyText={lignes.isLoading ? 'Chargement…' : 'Aucune ligne.'}
        />
      </div>

      <ModaleFiche
        titre={
          ligne ? `Modifier — ${config.titre}` : `Nouveau — ${config.titre}`
        }
        champs={champs}
        ligne={ligne}
        open={modale != null}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
        onSubmit={(v) => enregistrer.mutate(v)}
        erreur={enregistrer.error}
        enCours={enregistrer.isPending}
        large={champs.length > 10}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// « Opérations, tranches et lots » — gestion directe des trois niveaux
// (l'import Excel de lots WinDev dépend de la table ChampImportLot, absente
// du .bak importé — reporté)
// ---------------------------------------------------------------------------

function NiveauOtl({
  titre,
  lignes,
  colonnes,
  selection,
  setSelection,
  champs,
  contexte,
  saveFn,
  deleteFn,
  invalider,
  confirmation,
  unite,
  tableId,
}: {
  titre: string
  lignes: Array<Record<string, unknown> & { id: number }>
  colonnes: Array<ColumnDef<Record<string, unknown>, any>>
  selection: number | null
  setSelection: (id: number | null) => void
  champs: Array<DescChamp>
  contexte: Record<string, unknown>
  saveFn: (o: { data: any }) => Promise<unknown>
  deleteFn: (o: { data: { id: number } }) => Promise<unknown>
  invalider: () => void
  confirmation: string
  unite: string
  tableId: string
}) {
  const [modale, setModale] = useState<'creation' | number | null>(null)
  const ligne =
    typeof modale === 'number'
      ? (lignes.find((l) => l.id === modale) ?? null)
      : null
  const enregistrer = useMutation({
    mutationFn: (v: ValeursFiche) =>
      saveFn({
        data: {
          ...contexte,
          ...v,
          id: typeof modale === 'number' ? modale : undefined,
        },
      }),
    onSuccess: () => {
      invalider()
      setModale(null)
    },
  })
  const supprimer = useMutation({
    mutationFn: (id: number) => deleteFn({ data: { id } }),
    onSuccess: () => {
      invalider()
      setSelection(null)
    },
  })
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[15px] font-bold text-[var(--ink)]">{titre}</p>
      <BoutonsTable
        selection={selection}
        onNouveau={() => {
          enregistrer.reset()
          setModale('creation')
        }}
        onModifier={() => {
          if (selection != null) {
            enregistrer.reset()
            setModale(selection)
          }
        }}
        onSupprimer={() => {
          if (selection != null) supprimer.mutate(selection)
        }}
        confirmation={confirmation}
      />
      <ErreurMutation erreur={supprimer.error} />
      <DataTable
        id={tableId}
        columns={colonnes}
        data={lignes}
        unite={unite}
        getRowId={(r) => String(r.id)}
        selectedRowId={selection != null ? String(selection) : null}
        onRowClick={(r) => setSelection(r.id as number)}
        emptyText="Aucune ligne."
      />
      <ModaleFiche
        titre={ligne ? `Modifier — ${titre}` : `Nouveau — ${titre}`}
        champs={champs}
        ligne={ligne}
        open={modale != null}
        onOpenChange={(o) => {
          if (!o) setModale(null)
        }}
        onSubmit={(v) => enregistrer.mutate(v)}
        erreur={enregistrer.error}
        enCours={enregistrer.isPending}
        large={champs.length > 10}
      />
    </div>
  )
}

const colT = (
  k: string,
  l: string,
  size = 160,
): ColumnDef<Record<string, unknown>, any> => ({
  accessorKey: k,
  header: l,
  size,
  cell: (c) => (c.getValue() as string | null) ?? '—',
})
const colN = (
  k: string,
  l: string,
  size = 100,
): ColumnDef<Record<string, unknown>, any> => ({
  accessorKey: k,
  header: l,
  size,
  cell: (c) => (
    <span className="block text-right tabular-nums">
      {(c.getValue() as number | null) ?? '—'}
    </span>
  ),
})

function VueOtl() {
  const queryClient = useQueryClient()
  const [operationId, setOperationId] = useState<number | null>(null)
  const [trancheId, setTrancheId] = useState<number | null>(null)
  const [lotId, setLotId] = useState<number | null>(null)

  const options = useQuery({
    queryKey: ['otl-options'],
    queryFn: () => getOtlOptionsFn(),
    staleTime: 300_000,
  }).data
  const operations = useQuery({
    queryKey: ['otl-operations'],
    queryFn: () => getOperationsOtlFn(),
  })
  const tranches = useQuery({
    queryKey: ['otl-tranches', operationId],
    queryFn: () => getTranchesOtlFn({ data: { operationId: operationId! } }),
    enabled: operationId != null,
  })
  const lots = useQuery({
    queryKey: ['otl-lots', trancheId],
    queryFn: () => getLotsOtlFn({ data: { trancheId: trancheId! } }),
    enabled: trancheId != null,
  })

  const operationCourante = operations.data?.find((o) => o.id === operationId)
  const trancheCourante = tranches.data?.find((t) => t.id === trancheId)

  const CHAMPS_OPERATION: Array<DescChamp> = [
    { k: 'libelle', l: 'Libellé', t: 'texte' },
    {
      k: 'structureJuridiqueId',
      l: 'Structure juridique',
      t: 'select',
      options: options?.structures ?? [],
    },
    { k: 'adresse', l: 'Adresse', t: 'texte' },
    { k: 'cp', l: 'CP', t: 'texte' },
    { k: 'commune', l: 'Commune', t: 'texte' },
    { k: 'nomZac', l: 'Nom ZAC', t: 'texte' },
    {
      k: 'secteurGeographiqueId',
      l: 'Secteur géographique',
      t: 'select',
      options: options?.secteurs ?? [],
    },
    {
      k: 'abreviationCodeReserve',
      l: 'Abréviation (code réserve)',
      t: 'texte',
    },
    { k: 'surRennesMetropole', l: 'Sur Rennes Métropole', t: 'bool' },
    { k: 'anru', l: 'ANRU', t: 'bool' },
    { k: 'anruCommentaire', l: 'Commentaire ANRU', t: 'texte' },
    { t: 'titre', l: 'Notaires' },
    {
      k: 'notaireVenteId',
      l: 'Notaire vente',
      t: 'select',
      options: options?.notaires ?? [],
    },
    {
      k: 'clercVenteId',
      l: 'Clerc vente',
      t: 'select',
      options: options?.notaires ?? [],
    },
    {
      k: 'notaireFoncierId',
      l: 'Notaire foncier',
      t: 'select',
      options: options?.notaires ?? [],
    },
    {
      k: 'clercFoncierId',
      l: 'Clerc foncier',
      t: 'select',
      options: options?.notaires ?? [],
    },
    { t: 'titre', l: 'Investisseur et cycle de vie' },
    { k: 'possibiliteInvestisseur', l: 'Possibilité investisseur', t: 'bool' },
    {
      k: 'tauxInvestisseurAutorise',
      l: 'Taux investisseur autorisé',
      t: 'nombre',
    },
    { k: 'commentaireInvestisseur', l: 'Commentaire investisseur', t: 'texte' },
    { k: 'dateValidationEngagement', l: 'Validation engagement', t: 'date' },
    { k: 'dateAbandon', l: "Date d'abandon", t: 'date' },
    { k: 'commentairesAbandon', l: 'Commentaires abandon', t: 'texte' },
    { t: 'titre', l: 'Masquages' },
    { k: 'masquerCommercial', l: 'Masquer commercial', t: 'bool' },
    { k: 'masquerComptable', l: 'Masquer comptable', t: 'bool' },
    { k: 'masquerPromo', l: 'Masquer promo', t: 'bool' },
    { k: 'commentaire', l: 'Commentaire', t: 'long' },
  ]

  const CHAMPS_TRANCHE: Array<DescChamp> = [
    { k: 'libelle', l: 'Nom de la tranche', t: 'texte' },
    { k: 'adresse', l: 'Adresse', t: 'texte' },
    { k: 'dateConvention', l: 'Date convention', t: 'date' },
    {
      k: 'dateLivraisonContractuelle',
      l: 'Livraison contractuelle',
      t: 'date',
    },
    { k: 'dureeChantierMois', l: 'Durée chantier (mois)', t: 'entier' },
    { k: 'nbEtage', l: "Nb d'étages", t: 'entier' },
    { t: 'titre', l: 'Logements' },
    { k: 'nbLogtColl', l: 'Nb logts collectifs', t: 'entier' },
    { k: 'dontLogtCollPsla', l: 'dont PSLA (coll.)', t: 'entier' },
    { k: 'dontLogtCollBrs', l: 'dont BRS (coll.)', t: 'entier' },
    { k: 'nbLogtIndiv', l: 'Nb logts individuels', t: 'entier' },
    { k: 'dontLogtIndivPsla', l: 'dont PSLA (indiv.)', t: 'entier' },
    { k: 'dontLogtIndivBrs', l: 'dont BRS (indiv.)', t: 'entier' },
    { k: 'nbAutresLocaux', l: 'Nb autres locaux', t: 'entier' },
    { k: 'nbTerrain', l: 'Nb terrains', t: 'entier' },
    { k: 'nbLvoPrev', l: 'Nb LVO prévues', t: 'entier' },
    { t: 'titre', l: "Maîtrise d'œuvre et qualité" },
    {
      k: 'architecteMandataireId',
      l: 'Architecte mandataire',
      t: 'select',
      options: options?.architectes ?? [],
    },
    {
      k: 'architecteCotraitantId',
      l: 'Architecte cotraitant',
      t: 'select',
      options: options?.architectes ?? [],
    },
    { k: 'estMoeInterne', l: 'MOE interne', t: 'bool' },
    {
      k: 'missionMoeInterneId',
      l: 'Mission MOE interne',
      t: 'select',
      options: options?.missionsMoe ?? [],
    },
    {
      k: 'certificationId',
      l: 'Certification',
      t: 'select',
      options: options?.certifications ?? [],
    },
    { k: 'labelId', l: 'Label', t: 'select', options: options?.labels ?? [] },
    {
      k: 'performanceEnergetiqueId',
      l: 'Performance énergétique',
      t: 'select',
      options: options?.performances ?? [],
    },
    { t: 'titre', l: 'Terrain' },
    { k: 'terrainMontantHt', l: 'Montant HT', t: 'nombre' },
    { k: 'terrainMontantTtc', l: 'Montant TTC', t: 'nombre' },
    { k: 'terrainPourcAcptePrevu', l: '% acompte prévu', t: 'nombre' },
    { k: 'terrainAcompte', l: 'Acompte', t: 'nombre' },
    {
      k: 'terrainSignataireId',
      l: 'Signataire compromis',
      t: 'select',
      options: options?.signataires ?? [],
    },
    { k: 'terrainCommentaire', l: 'Commentaire terrain', t: 'texte' },
    { k: 'ofsNomId', l: 'OFS', t: 'select', options: options?.ofs ?? [] },
    { k: 'terrainOfsMontantHt', l: 'OFS montant HT', t: 'nombre' },
    {
      k: 'terrainOfsSignataireId',
      l: 'Signataire OFS',
      t: 'select',
      options: options?.signataires ?? [],
    },
    { k: 'commentaire', l: 'Commentaire', t: 'long' },
  ]

  const CHAMPS_LOT: Array<DescChamp> = [
    { k: 'numLot', l: 'Numéro de lot', t: 'texte' },
    {
      k: 'destinationId',
      l: 'Destination',
      t: 'select',
      options: options?.destinations ?? [],
    },
    { k: 'familleDeBien', l: 'Famille de bien', t: 'texte' },
    { k: 'typeDeBien', l: 'Type de bien', t: 'texte' },
    { k: 'designation', l: 'Désignation', t: 'texte' },
    { k: 'lotAssocie', l: 'Lot associé', t: 'texte' },
    { k: 'adresse', l: 'Adresse', t: 'texte' },
    { k: 'numEtage', l: 'Num étage', t: 'texte' },
    { k: 'exposition', l: 'Exposition', t: 'texte' },
    { k: 'numParcelle', l: 'Num parcelle', t: 'texte' },
    { k: 'numCopropriete', l: 'Num copropriété', t: 'texte' },
    { k: 'tantiemes', l: 'Tantièmes', t: 'nombre' },
    { k: 'estPartieCommune', l: 'Partie commune', t: 'bool' },
    { t: 'titre', l: 'Surfaces (m²)' },
    { k: 'surfHabitable', l: 'Habitable', t: 'nombre' },
    { k: 'surfaceUtile', l: 'Utile', t: 'nombre' },
    { k: 'surfTerrasse', l: 'Terrasse', t: 'nombre' },
    { k: 'surfGarage', l: 'Garage', t: 'nombre' },
    { k: 'surfCave', l: 'Cave', t: 'nombre' },
    { k: 'surfBalcon', l: 'Balcon', t: 'nombre' },
    { k: 'surfLoggias', l: 'Loggias', t: 'nombre' },
    { k: 'surfRemise', l: 'Remise', t: 'nombre' },
    { k: 'surfJardin', l: 'Jardin', t: 'nombre' },
    { k: 'surfTerrain', l: 'Terrain', t: 'nombre' },
    { t: 'titre', l: 'Prix' },
    { k: 'prixOrigine', l: 'Prix origine', t: 'nombre' },
    { k: 'prixVenteHt', l: 'Prix de vente HT', t: 'nombre' },
    { k: 'prixVenteTtc', l: 'Prix de vente TTC', t: 'nombre' },
    { k: 'tva', l: 'TVA', t: 'nombre' },
    { k: 'prixM2', l: 'Prix au m²', t: 'nombre' },
    { k: 'commentaire', l: 'Commentaire', t: 'long' },
    { k: 'notes', l: 'Notes', t: 'long' },
  ]

  return (
    <section className="island-shell flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-auto px-[18px] py-4">
        <NiveauOtl
          titre="Opérations"
          lignes={
            (operations.data ?? [])
          }
          colonnes={[
            colT('sccv', 'Structure juridique', 220),
            colT('libelle', 'Opération', 220),
            colT('cp', 'CP', 80),
            colT('commune', 'Commune', 150),
          ]}
          selection={operationId}
          setSelection={(id) => {
            setOperationId(id)
            setTrancheId(null)
            setLotId(null)
          }}
          champs={CHAMPS_OPERATION}
          contexte={{}}
          saveFn={saveOperationOtlFn}
          deleteFn={deleteOperationOtlFn}
          invalider={() =>
            void queryClient.invalidateQueries({ queryKey: ['otl-operations'] })
          }
          confirmation="Supprimer cette opération ? (refusé si elle a des tranches)"
          unite="opérations"
          tableId="otl-operations"
        />

        {operationId != null && (
          <NiveauOtl
            titre={`Tranches de ${operationCourante?.libelle ?? ''}`}
            lignes={
              (tranches.data ?? [])
            }
            colonnes={[
              colN('id', 'IDTranche', 90),
              colT('libelle', 'Nom de la tranche', 200),
              colN('nbLogtColl', 'Nb logt coll.', 100),
              colN('nbLogtIndiv', 'Nb logt indiv.', 100),
              colT('adresse', 'Adresse', 220),
            ]}
            selection={trancheId}
            setSelection={(id) => {
              setTrancheId(id)
              setLotId(null)
            }}
            champs={CHAMPS_TRANCHE}
            contexte={{ operationId }}
            saveFn={saveTrancheOtlFn}
            deleteFn={deleteTrancheOtlFn}
            invalider={() =>
              void queryClient.invalidateQueries({
                queryKey: ['otl-tranches', operationId],
              })
            }
            confirmation="Supprimer cette tranche ? (refusé si elle a des lots)"
            unite="tranches"
            tableId="otl-tranches"
          />
        )}

        {trancheId != null && (
          <NiveauOtl
            titre={`Lots de ${trancheCourante?.libelle ?? ''}`}
            lignes={
              (lots.data ?? [])
            }
            colonnes={[
              colT('numLot', 'Num lot', 140),
              colT('familleDeBien', 'Famille de bien', 130),
              colT('typeDeBien', 'Type', 90),
              colN('surfHabitable', 'Surf. hab.', 90),
              colN('prixVenteTtc', 'Prix TTC', 110),
            ]}
            selection={lotId}
            setSelection={setLotId}
            champs={CHAMPS_LOT}
            contexte={{ trancheId }}
            saveFn={saveLotOtlFn}
            deleteFn={deleteLotOtlFn}
            invalider={() =>
              void queryClient.invalidateQueries({
                queryKey: ['otl-lots', trancheId],
              })
            }
            confirmation="Supprimer ce lot ? (refusé s'il est commercialisé ou a des réserves)"
            unite="lots"
            tableId="otl-lots"
          />
        )}
      </div>
    </section>
  )
}
