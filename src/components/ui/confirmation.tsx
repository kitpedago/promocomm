// Remplace les alert()/confirm() natifs par une petite modale charte
// Keredes (cf. dialog.tsx) : confirmation avec action, ou simple information
import { useState } from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

type Demande = {
  titre?: string
  message: string
  /** action au clic sur Confirmer ; absente = simple message d'information */
  action?: () => void
  /** bouton Confirmer en rouge (suppressions) */
  destructif?: boolean
}

export function useConfirmation() {
  const [demande, setDemande] = useState<Demande | null>(null)
  const fermer = () => setDemande(null)
  const modale = (
    <Dialog open={demande != null} onOpenChange={(o) => !o && fermer()}>
      {demande && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {demande.titre ??
                (demande.action ? 'Confirmation' : 'Information')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] whitespace-pre-line text-[var(--ink)]">
            {demande.message}
          </p>
          <DialogFooter>
            {demande.action ? (
              <>
                <Button size="sm" variant="outline" onClick={fermer}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  variant={demande.destructif ? 'destructive' : 'default'}
                  onClick={() => {
                    demande.action?.()
                    fermer()
                  }}
                >
                  Confirmer
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={fermer}>
                OK
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
  return { confirmer: setDemande, modale }
}
