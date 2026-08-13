import { expect, test } from 'vitest'

import {
  enFraction,
  enPourcent,
  normaliserSiret,
  siretInvalide,
} from './sccv.helpers.ts'

test('normaliserSiret retire les espaces intérieurs et extérieurs', () => {
  expect(normaliserSiret(' 528 713 290 00013 ')).toBe('52871329000013')
  expect(normaliserSiret('52871329000013')).toBe('52871329000013')
})

test('normaliserSiret : vide ou absent → null', () => {
  expect(normaliserSiret('')).toBeNull()
  expect(normaliserSiret('   ')).toBeNull()
  expect(normaliserSiret(null)).toBeNull()
  expect(normaliserSiret(undefined)).toBeNull()
})

test('siretInvalide : 14 chiffres ou vide = valide', () => {
  expect(siretInvalide('52871329000013')).toBe(false)
  expect(siretInvalide(null)).toBe(false)
  expect(siretInvalide('1234')).toBe(true)
  expect(siretInvalide('5287132900001A')).toBe(true)
})

test('enPourcent : fraction 0–1 → %, arrondi à 2 décimales', () => {
  expect(enPourcent(0.5)).toBe(50)
  expect(enPourcent(0.33333333)).toBe(33.33)
  expect(enPourcent(1)).toBe(100)
  expect(enPourcent(null)).toBeNull()
})

test('enFraction : % → fraction', () => {
  expect(enFraction(50)).toBe(0.5)
  expect(enFraction(null)).toBeNull()
})
