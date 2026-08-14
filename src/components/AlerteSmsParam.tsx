// Écran Paramètres « Alerte SMS » (service Administrateur) : configuration de
// l'API OVH SMS, numéros destinataires, portée du déclencheur et URL publique
// (liens des SMS). Un SMS de test valide les identifiants. Repris
// d'isfectuteurs (AlerteSmsParam.tsx), charte Keredes.
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, MessageSquare, Send } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import {
  getAlerteSmsConfigFn,
  saveAlerteSmsConfigFn,
  testAlerteSmsFn,
} from '#/lib/alerte-sms.ts'

import type { SmsPortee } from '#/lib/ovh-sms.helpers.ts'

const PORTEES: Array<{ value: SmsPortee; label: string; hint: string }> = [
  {
    value: 'tous',
    label: 'Tous les bugs',
    hint: "Chaque bug publié (les features n'envoient pas de SMS).",
  },
  {
    value: 'grave',
    label: 'Bugs graves seulement',
    hint: 'Uniquement les bugs de gravité « bloquante » ou « majeure ».',
  },
  {
    value: 'bugfeature',
    label: 'Bugs + features',
    hint: 'Tout ticket publié (bug ou demande de feature).',
  },
]

const labelCls = 'block text-[13px] font-semibold text-[var(--ink)]'

function Carte({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-[10px] border border-[var(--line)] bg-white p-3.5">
      {children}
    </div>
  )
}

export function AlerteSmsParam() {
  // gcTime 0 : pas de cache entre deux ouvertures de l'écran — l'état local
  // est initialisé UNE fois (flag loaded), un cache périmé montrerait
  // d'anciennes valeurs comme fraîches
  const q = useQuery({
    queryKey: ['alerte-sms-config'],
    queryFn: () => getAlerteSmsConfigFn(),
    gcTime: 0,
  })
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  )

  const [active, setActive] = useState(false)
  const [applicationKey, setApplicationKey] = useState('')
  const [applicationSecret, setApplicationSecret] = useState('')
  const [consumerKey, setConsumerKey] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [expediteur, setExpediteur] = useState('')
  const [destinataires, setDestinataires] = useState('')
  const [portee, setPortee] = useState<SmsPortee>('tous')
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    if (!q.data || loaded) return
    const d = q.data
    setActive(d.active)
    setApplicationKey(d.applicationKey)
    setApplicationSecret(d.applicationSecret)
    setConsumerKey(d.consumerKey)
    setServiceName(d.serviceName)
    setExpediteur(d.expediteur)
    setDestinataires(d.destinataires)
    setPortee(d.portee)
    setBaseUrl(d.baseUrl)
    setLoaded(true)
  }, [q.data, loaded])

  const saveMut = useMutation({
    mutationFn: () =>
      saveAlerteSmsConfigFn({
        data: {
          active,
          applicationKey,
          applicationSecret,
          consumerKey,
          serviceName,
          expediteur,
          destinataires,
          portee,
          baseUrl,
        },
      }),
    onSuccess: () => {
      setMsg('Enregistré.')
      void q.refetch()
    },
    onError: (e) =>
      setMsg(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  })

  const testMut = useMutation({
    mutationFn: () => testAlerteSmsFn(),
    onSuccess: (r) => setTestMsg({ ok: r.ok, text: r.message }),
    onError: (e) =>
      setTestMsg({
        ok: false,
        text: e instanceof Error ? e.message : 'Échec du test.',
      }),
  })

  if (q.isLoading || !loaded)
    return (
      <div className="flex items-center gap-2 py-6 text-[14px] text-[var(--ink-soft)]">
        <Loader2 className="animate-spin" size={18} /> Chargement…
      </div>
    )

  return (
    <div className="max-w-[680px] space-y-4 overflow-y-auto pb-6">
      <p className="rounded-[10px] border border-[var(--line)] bg-[var(--cream)] px-4 py-2.5 text-[13px] text-[var(--ink-soft)]">
        Envoi d'un <strong>SMS</strong> (API <strong>OVH SMS</strong>) aux
        numéros indiqués <strong>dès qu'un ticket est publié</strong>. Réglez
        l'interrupteur général, la portée, les numéros et les identifiants OVH,
        puis testez.
      </p>

      {/* Interrupteur + enregistrement */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold text-[var(--ink)]">
          <Switch checked={active} onCheckedChange={setActive} />
          Alertes SMS actives
        </label>
        <Button
          type="button"
          size="sm"
          disabled={saveMut.isPending}
          onClick={() => {
            setMsg(null)
            saveMut.mutate()
          }}
        >
          Enregistrer
        </Button>
        {msg && (
          <span className="text-[13px] font-semibold text-[var(--ink-soft)]">
            {msg}
          </span>
        )}
      </div>

      {/* Portée du déclencheur */}
      <Carte>
        <div className="flex items-center gap-2 text-[13.5px] font-bold text-[var(--ink)]">
          <MessageSquare size={15} className="text-[var(--gold-deep)]" />
          Quand envoyer un SMS ?
        </div>
        <div className="space-y-1.5">
          {PORTEES.map((p) => (
            <label
              key={p.value}
              className="flex cursor-pointer items-start gap-2.5 text-[13.5px]"
            >
              <input
                type="radio"
                name="portee-sms"
                checked={portee === p.value}
                onChange={() => setPortee(p.value)}
                className="mt-0.5 accent-[var(--ink)]"
              />
              <span>
                <span className="font-semibold text-[var(--ink)]">{p.label}</span>
                <span className="ml-1.5 text-[var(--ink-faded)]">
                  — {p.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Carte>

      {/* Destinataires */}
      <Carte>
        <label className={labelCls}>Numéros destinataires</label>
        <p className="text-[12px] text-[var(--ink-faded)]">
          Un numéro par ligne (ou séparés par des virgules). Numéros français —
          normalisés à l'enregistrement (les numéros non reconnus sont ignorés).
        </p>
        <Textarea
          value={destinataires}
          onChange={(e) => setDestinataires(e.target.value)}
          rows={3}
          placeholder={'06 12 34 56 78\n06 98 76 54 32'}
          className="text-[13px]"
        />
      </Carte>

      {/* Identifiants OVH */}
      <Carte>
        <div className="text-[13.5px] font-bold text-[var(--ink)]">
          Identifiants API OVH SMS
        </div>
        <p className="text-[12px] text-[var(--ink-faded)]">
          À créer sur{' '}
          <span className="font-mono">https://api.ovh.com/createToken/</span>{' '}
          (droit <span className="font-mono">POST /sms/*</span>). Le secret
          applicatif et la clé consommateur sont chiffrés au repos.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Clé applicative (Application Key)</label>
            <Input
              value={applicationKey}
              onChange={(e) => setApplicationKey(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>Service SMS (ex. sms-xx1234-1)</label>
            <Input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>
              Secret applicatif (Application Secret)
            </label>
            <Input
              type="password"
              value={applicationSecret}
              onChange={(e) => setApplicationSecret(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>Clé consommateur (Consumer Key)</label>
            <Input
              type="password"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>
              Expéditeur{' '}
              <span className="font-normal text-[var(--ink-faded)]">
                (optionnel — sender OVH)
              </span>
            </label>
            <Input
              value={expediteur}
              onChange={(e) => setExpediteur(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>URL publique (liens des SMS)</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://10.66.66.1:3020"
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
        </div>
      </Carte>

      {/* Test */}
      <Carte>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={testMut.isPending}
            onClick={() => {
              setTestMsg(null)
              testMut.mutate()
            }}
          >
            {testMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send />
            )}
            Envoyer un SMS de test
          </Button>
          <span className="text-[12px] text-[var(--ink-faded)]">
            Utilise la configuration <strong>enregistrée</strong> — pensez à
            enregistrer d'abord.
          </span>
        </div>
        {testMsg && (
          <div
            className={`rounded-lg px-3 py-2 text-[12.5px] font-semibold ${
              testMsg.ok
                ? 'bg-[var(--ok-tint)] text-emerald-800'
                : 'bg-[var(--danger-tint)] text-[var(--danger)]'
            }`}
          >
            {testMsg.ok ? '✓ ' : '⚠ '}
            {testMsg.text}
          </div>
        )}
      </Carte>
    </div>
  )
}
