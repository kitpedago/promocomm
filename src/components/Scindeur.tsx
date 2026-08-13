// Scindeur vertical : deux volets superposés séparés par une poignée
// déplaçable, proportion mémorisée par utilisateur (usePref). Le parent doit
// borner la hauteur (min-h-0 flex-1) pour que chaque volet scrolle en interne.
import { useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'

import { usePref } from '#/lib/preferences.ts'

const MIN = 0.15
const MAX = 0.85

export default function Scindeur({
  id,
  haut,
  bas,
}: {
  id: string
  haut: ReactNode
  bas: ReactNode
}) {
  const conteneur = useRef<HTMLDivElement>(null)
  const [stockee, setFraction] = usePref<number>(`scindeur:${id}`, 0.5)
  // une valeur corrompue côté serveur ne doit pas casser la mise en page
  const fraction =
    typeof stockee === 'number' && stockee >= MIN && stockee <= MAX
      ? stockee
      : 0.5

  const glisser = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const rect = conteneur.current?.getBoundingClientRect()
    if (!rect || rect.height < 1) return
    setFraction(
      Math.min(MAX, Math.max(MIN, (e.clientY - rect.top) / rect.height)),
    )
  }

  return (
    <div ref={conteneur} className="flex h-full min-h-0 flex-col">
      <div
        style={{ height: `${fraction * 100}%` }}
        className="flex min-h-0 shrink-0 flex-col"
      >
        {haut}
      </div>
      <div
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={glisser}
        className="group flex shrink-0 cursor-row-resize touch-none items-center justify-center py-1.5 select-none"
        title="Glisser pour redimensionner"
      >
        <div className="h-1 w-16 rounded-full bg-[var(--line-strong)] transition-colors group-hover:bg-[var(--gold)] group-active:bg-[var(--gold)]" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{bas}</div>
    </div>
  )
}
