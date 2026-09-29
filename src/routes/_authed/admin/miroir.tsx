import { createFileRoute, redirect } from '@tanstack/react-router'

// Écran déplacé dans Paramètres › Système ; l'ancienne adresse (citée dans
// les guides de déploiement) y renvoie
export const Route = createFileRoute('/_authed/admin/miroir')({
  beforeLoad: () => {
    throw redirect({ to: '/parametres', search: { liste: 'base-miroir' } })
  },
})
