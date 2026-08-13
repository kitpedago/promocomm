import { expect, test } from 'vitest'

import {
  calculerAge,
  calculerMenage,
  construireNomComplet,
  trancheAgePourAges,
} from './acquereurs.helpers.ts'

test('nom complet : un seul acquéreur', () => {
  expect(
    construireNomComplet({
      civ1Court: 'Mme',
      patronyme: 'ABGRALL',
      prenom: 'Marine',
    }),
  ).toBe('Mme ABGRALL Marine')
})

test('nom complet : couple aux patronymes différents', () => {
  expect(
    construireNomComplet({
      civ1Court: 'M.',
      civ2Court: 'Mme',
      patronyme: 'DUPONT',
      prenom: 'Jean',
      patronyme2: 'DURAND',
      prenom2: 'Marie',
    }),
  ).toBe('M. et Mme DUPONT Jean et DURAND Marie')
})

test('nom complet : couple au même patronyme → prénoms regroupés', () => {
  expect(
    construireNomComplet({
      civ1Court: 'M.',
      civ2Court: 'Mme',
      patronyme: 'DUPONT',
      prenom: 'Jean',
      patronyme2: 'DUPONT',
      prenom2: 'Marie',
    }),
  ).toBe('M. et Mme DUPONT Jean et Marie')
})

test('nom complet : 3ᵉ acquéreur avec sa propre civilité et raison sociale', () => {
  expect(
    construireNomComplet({
      civ1Court: 'M.',
      patronyme: 'DUPONT',
      prenom: 'Jean',
      civ3Court: 'Mme',
      patronyme3: 'MARTIN',
      prenom3: 'Anne',
      rs: 'SCI DES LILAS',
    }),
  ).toBe('M. DUPONT Jean, Mme MARTIN Anne SCI DES LILAS')
})

test('nom complet : personne morale sans patronyme → raison sociale seule', () => {
  expect(construireNomComplet({ rs: 'SCCV LES PALOMAS' })).toBe(
    'SCCV LES PALOMAS',
  )
})

test('ménage : personne seule selon le nombre d’enfants (à venir inclus)', () => {
  expect(calculerMenage(1, 0, 0)).toEqual({
    situationFamilialeId: 1,
    typeMenageId: 1,
  })
  expect(calculerMenage(1, 0, 1)).toEqual({
    situationFamilialeId: 1,
    typeMenageId: 2,
  })
  expect(calculerMenage(1, 3, 0)).toEqual({
    situationFamilialeId: 1,
    typeMenageId: 3,
  })
})

test('ménage : couple (iso legacy : ≠ 1 adulte = couple)', () => {
  expect(calculerMenage(2, 0, null)).toEqual({
    situationFamilialeId: 2,
    typeMenageId: 4,
  })
  expect(calculerMenage(2, 1, 0)).toEqual({
    situationFamilialeId: 2,
    typeMenageId: 5,
  })
  expect(calculerMenage(2, 2, 1)).toEqual({
    situationFamilialeId: 2,
    typeMenageId: 6,
  })
  expect(calculerMenage(null, 0, 0).situationFamilialeId).toBe(2)
})

test('âge en années révolues à la date de référence', () => {
  const ref = new Date('2022-07-07')
  expect(calculerAge(new Date('1989-01-27'), ref)).toBe(33)
  expect(calculerAge(new Date('1989-07-08'), ref)).toBe(32) // anniversaire pas encore passé
  expect(calculerAge(new Date('1989-07-07'), ref)).toBe(33) // anniversaire le jour même
  expect(calculerAge(null, ref)).toBeNull()
})

const TRANCHES = [
  { id: 1, borneMax: 25 },
  { id: 2, borneMax: 35 },
  { id: 3, borneMax: 45 },
  { id: 6, borneMax: 100 },
]

test('tranche d’âge : première borne couvrant l’âge moyen', () => {
  expect(trancheAgePourAges(33, null, TRANCHES)).toBe(2)
  expect(trancheAgePourAges(33, 45, TRANCHES)).toBe(3) // moyenne 39
  expect(trancheAgePourAges(24, 0, TRANCHES)).toBe(1) // âge 2 nul ignoré
  expect(trancheAgePourAges(null, null, TRANCHES)).toBe(1) // 0 → première tranche
  expect(trancheAgePourAges(120, null, TRANCHES)).toBeNull()
})
