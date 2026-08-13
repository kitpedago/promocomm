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

function PageParametres() {
  const [slugStocke, setSlug] = usePref<SlugNomenclature>(
    'parametres:liste',
    LISTES[0].slug,
  )
  const config = LISTES.find((l) => l.slug === slugStocke) ?? LISTES[0]

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
                l.slug === config.slug
                  ? 'bg-[var(--gold-tint)] font-semibold text-[var(--ink)]'
                  : 'font-medium text-[var(--ink-soft)] hover:bg-[var(--cream-hover)]'
              }`}
            >
              {l.titre}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 sm:px-7">
        <h1 className="mb-4 text-xl leading-tight font-bold tracking-tight text-[var(--ink)]">
          {config.titre}
        </h1>
        <ListeNomenclature key={config.slug} config={config} />
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
