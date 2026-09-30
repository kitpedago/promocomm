// Message bref en haut à droite, pour les enregistrements sans modale (saisie
// en ligne) — même usage que useConfirmation : `{ notifier, toast }`, `toast`
// étant à poser dans le rendu
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Message = { texte: string; erreur?: boolean }

export function useToast() {
  // ponytail: un seul message à la fois (le dernier remplace) ; une pile si
  // plusieurs doivent rester lisibles ensemble
  const [message, setMessage] = useState<Message | null>(null)
  useEffect(() => {
    if (!message) return
    const minuteur = setTimeout(
      () => setMessage(null),
      message.erreur ? 8000 : 3000,
    )
    return () => clearTimeout(minuteur)
  }, [message])
  const toast =
    message &&
    // hors du flux : ni rogné par un conteneur à défilement, ni sous une table
    createPortal(
      <div
        role={message.erreur ? 'alert' : 'status'}
        className={`fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-2.5 text-[13px] font-medium shadow-[0_12px_32px_rgba(20,25,45,0.18)] ${
          message.erreur
            ? 'border-[var(--danger)] bg-[var(--danger-tint)] text-[var(--danger)]'
            : 'border-[var(--line)] bg-[var(--ok-tint)] text-[var(--ink)]'
        }`}
      >
        {message.texte}
      </div>,
      document.body,
    )
  return { notifier: setMessage, toast }
}
