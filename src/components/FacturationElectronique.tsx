// Onglet Facturation électronique d'Opérations (propre à l'application) :
// fiche en lecture seule de la SCCV de l'opération quand elle est à compta
// extérieure, immatriculée et que KPI y détient plus de 5 %, avec l'adresse
// de facturation électronique (SIREN_suffixe du gestionnaire, saisi dans
// Paramètres > Gestionnaire SCCV).
import { useQuery } from '@tanstack/react-query'

import Champ from '#/components/Champ'
import { SousTitre } from '#/components/ChampsModale'
import { getFacturationFn } from '#/lib/facturation.ts'
import { fmtDate, fmtEuro } from '#/lib/utils.ts'

export default function FacturationElectronique({
  operationId,
}: {
  operationId: number
}) {
  const fiche = useQuery({
    queryKey: ['facturation', operationId],
    queryFn: () => getFacturationFn({ data: { operationId } }),
  })
  const f = fiche.data
  if (!f) {
    return (
      <p className="text-[13px] text-[var(--muted)]">
        {fiche.isLoading
          ? 'Chargement…'
          : 'Hors périmètre : la facturation électronique concerne les SCCV à compta extérieure, immatriculées, où KPI détient plus de 5 %.'}
      </p>
    )
  }
  return (
    <div className="flex max-w-[720px] flex-col gap-3">
      <SousTitre>{f.rs}</SousTitre>
      <Champ libelle="Adresse de facturation électronique">
        <span className="font-mono text-[14px] font-bold tabular-nums">
          {f.adresse || '—'}
        </span>
      </Champ>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
        <Champ libelle="SIREN">{f.siren || '—'}</Champ>
        <Champ libelle="Suffixe">{f.suffixe || '—'}</Champ>
        <Champ libelle="SIRET">{f.siret || '—'}</Champ>
        <Champ libelle="SCCV">{f.sccv || '—'}</Champ>
        <Champ libelle="Compta">{f.compta || '—'}</Champ>
        <Champ libelle="Gestionnaire">{f.gestionnaire || '—'}</Champ>
        <Champ libelle="Logiciel">{f.logiciel || '—'}</Champ>
        <Champ libelle="Immatriculée le">{fmtDate(f.dateImmat)}</Champ>
        <Champ libelle="Liquidée le">{fmtDate(f.dateLiquidation)}</Champ>
        <Champ libelle="Capital">{fmtEuro(f.capital)}</Champ>
        <Champ libelle="Part KPI">
          {(f.partKpi * 100).toLocaleString('fr-FR', {
            maximumFractionDigits: 2,
          })}{' '}
          %
        </Champ>
      </div>
    </div>
  )
}
