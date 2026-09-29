// Écran Paramètres « Alerte mail » (service Administrateur) : adresses du
// développeur, relance quotidienne, serveur SMTP et URL publique (liens des
// courriels). Un courriel de test valide la configuration. Charte Keredes.
import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loader2, Send } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import { HEURE_RELANCE } from '#/lib/alerte-mail.helpers.ts'
import {
  getAlerteMailConfigFn,
  saveAlerteMailConfigFn,
  testAlerteMailFn,
} from '#/lib/alerte-mail.ts'

const labelCls = 'block text-[13px] font-semibold text-[var(--ink)]'

function Carte({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-[10px] border border-[var(--line)] bg-white p-3.5">
      {children}
    </div>
  )
}

export function AlerteMailParam() {
  // gcTime 0 : pas de cache entre deux ouvertures de l'écran — l'état local
  // est initialisé UNE fois (flag loaded), un cache périmé montrerait
  // d'anciennes valeurs comme fraîches
  const q = useQuery({
    queryKey: ['alerte-mail-config'],
    queryFn: () => getAlerteMailConfigFn(),
    gcTime: 0,
  })
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  )

  const [active, setActive] = useState(false)
  const [relance, setRelance] = useState(false)
  const [destinataires, setDestinataires] = useState('')
  const [expediteur, setExpediteur] = useState('')
  const [serveur, setServeur] = useState('')
  const [port, setPort] = useState('587')
  const [login, setLogin] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    if (!q.data || loaded) return
    const d = q.data
    setActive(d.active)
    setRelance(d.relance)
    setDestinataires(d.destinataires)
    setExpediteur(d.expediteur)
    setServeur(d.serveur)
    setPort(String(d.port))
    setLogin(d.login)
    setBaseUrl(d.baseUrl)
    setLoaded(true)
  }, [q.data, loaded])

  const saveMut = useMutation({
    mutationFn: () =>
      saveAlerteMailConfigFn({
        data: {
          active,
          relance,
          destinataires,
          expediteur,
          serveur,
          port: Number(port),
          login,
          motDePasse,
          baseUrl,
        },
      }),
    onSuccess: () => {
      setMsg('Enregistré.')
      setMotDePasse('')
      void q.refetch()
    },
    onError: (e) =>
      setMsg(e instanceof Error ? e.message : "Erreur lors de l'enregistrement."),
  })

  const testMut = useMutation({
    mutationFn: () => testAlerteMailFn(),
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
        Envoi d'un <strong>courriel</strong> au développeur{' '}
        <strong>dès qu'un ticket est publié</strong>, et relance quotidienne
        des tickets non livrés. Réglez les interrupteurs, les adresses et le
        serveur SMTP, puis testez.
      </p>

      {/* Interrupteurs + enregistrement */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold text-[var(--ink)]">
          <Switch checked={active} onCheckedChange={setActive} />
          Alertes mail actives
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

      <Carte>
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold text-[var(--ink)]">
          <Switch checked={relance} onCheckedChange={setRelance} />
          Relance quotidienne des tickets non livrés
        </label>
        <p className="text-[12px] text-[var(--ink-faded)]">
          Chaque jour à {HEURE_RELANCE} h, un courriel liste les tickets
          déposés avant le jour même et encore ouverts (ni livrés, fermés,
          rejetés, doublons ou archivés). Rien à relancer : pas de courriel.
        </p>
      </Carte>

      {/* Destinataires */}
      <Carte>
        <label className={labelCls}>Adresses destinataires</label>
        <p className="text-[12px] text-[var(--ink-faded)]">
          Une adresse par ligne (ou séparées par des virgules) — les adresses
          non reconnues sont ignorées à l'enregistrement.
        </p>
        <Textarea
          value={destinataires}
          onChange={(e) => setDestinataires(e.target.value)}
          rows={3}
          placeholder="dev@exemple.fr"
          className="text-[13px]"
        />
      </Carte>

      {/* Serveur SMTP */}
      <Carte>
        <div className="text-[13.5px] font-bold text-[var(--ink)]">
          Serveur SMTP
        </div>
        <p className="text-[12px] text-[var(--ink-faded)]">
          Port 465 : SSL ; autres ports : STARTTLS, exigé dès qu'un identifiant
          est renseigné. Identifiant vide : relais sans authentification. Le
          mot de passe est chiffré au repos.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Serveur</label>
            <Input
              value={serveur}
              onChange={(e) => setServeur(e.target.value)}
              placeholder="smtp.exemple.fr"
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>Port</label>
            <Input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>Identifiant</label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>Mot de passe</label>
            <Input
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder={
                q.data?.motDePasseDefini ? 'Enregistré — vide : inchangé' : ''
              }
              autoComplete="new-password"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>Expéditeur</label>
            <Input
              type="email"
              value={expediteur}
              onChange={(e) => setExpediteur(e.target.value)}
              placeholder="promocomm@exemple.fr"
              autoComplete="off"
              className="h-9 text-[13px]"
            />
          </div>
          <div>
            <label className={labelCls}>URL publique (liens des courriels)</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Vide : URL du serveur (APP_URL)"
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
            Envoyer un courriel de test
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
