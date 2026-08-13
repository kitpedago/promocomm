// Boîte de dialogue modale (charte Keredes) — utilisée par les fiches du
// module SCCV ; à réutiliser pour les futures éditions des autres modules
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'

export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--ink)]/40" />
      <DialogPrimitive.Content
        className={`fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xl ${className || 'max-w-xl'}`}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Fermer"
          className="absolute top-4 right-4 cursor-pointer text-[var(--ink-soft)] hover:text-[var(--ink)]"
        >
          <X size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 border-b-2 border-[var(--gold)] pb-2">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return (
    <DialogPrimitive.Title className="text-[15px] font-semibold text-[var(--ink)]">
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2">{children}</div>
}
