import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Recherche « Contient » à la WinDev : insensible à la casse et aux accents
export const sansAccents = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Formats d'affichage communs aux écrans (tiret cadratin quand la valeur manque)
export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—'

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
})
export const fmtEuro = (n: number | null | undefined) =>
  n != null ? euro.format(n) : '—'
